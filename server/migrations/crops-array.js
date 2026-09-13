#!/usr/bin/env node
/**
 * Multi-crop migration: gives every farmer account a `crops` list built from
 * its single `crop` field (crops[0] === crop). `crop` itself is never changed.
 *
 * The site does not depend on this having run: accounts without `crops` are
 * read as a one-crop list (src/shared/farmerCrops.js). Running it makes the
 * data explicit so admin search, exports and future queries see one shape.
 *
 * Run from the repository root (reads MONGODB_URI from server/.env):
 *   node server/migrations/crops-array.js                    dry run: counts only, writes nothing
 *   node server/migrations/crops-array.js --apply            writes a backup, then the changes
 *   node server/migrations/crops-array.js --rollback FILE    dry run of restoring from a backup
 *   node server/migrations/crops-array.js --rollback FILE --apply
 * Options:
 *   --backup-dir DIR   where backups go (default server/migrations/backups, which git ignores)
 *
 * Rollback notes
 * - Rolling back the code alone is safe: older code never reads `crops`, and
 *   `crop` was not touched.
 * - --rollback puts `crops` back exactly as the backup recorded (removing the
 *   field where it did not exist) and skips accounts whose crops changed after
 *   the migration, so later edits by farmers or admins are not lost.
 * - A backup holds account ids and crop names only.
 * - Each write matches the account's crops as they were when planned, so
 *   running it while the site is live cannot overwrite a concurrent edit.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { normalizeFarmerCrops } from '../../src/shared/farmerCrops.js';
import { backupFor, planCropsMigration, planRollback } from './cropsMigrationPlan.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BATCH_SIZE = 500;

function parseArgs(argv) {
  const args = { apply: false, rollback: null, backupDir: path.join(HERE, 'backups'), help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--apply') args.apply = true;
    else if (arg === '--rollback') {
      args.rollback = argv[i + 1];
      i += 1;
      if (!args.rollback) throw new Error('--rollback needs the path of a backup file.');
    } else if (arg === '--backup-dir') {
      if (!argv[i + 1]) throw new Error('--backup-dir needs a directory.');
      args.backupDir = path.resolve(argv[i + 1]);
      i += 1;
    } else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  return args;
}

// Host and database name only; credentials are never printed.
const describeDatabase = uri => uri.split('@').pop().split('?')[0];

async function migrate(collection, docs, args) {
  const plan = planCropsMigration(docs);
  console.log(`Accounts scanned: ${plan.scanned}`);
  console.log(`  farmer accounts: ${plan.farmers}`);
  console.log(`  staff accounts left alone: ${plan.notFarmers}`);
  console.log(`  already have the right crops list: ${plan.alreadyDone}`);
  console.log(`  would get a crops list: ${plan.changes.length}`);
  console.log('Primary crop values on farmer accounts (count, stored crop -> crops that will be written):');
  for (const [value, count] of plan.cropValues) {
    const crops = normalizeFarmerCrops(value === '(none)' ? '' : value).crops;
    console.log(`  ${String(count).padStart(6)}  ${JSON.stringify(value)} -> ${JSON.stringify(crops)}`);
  }

  if (!args.apply) {
    console.log('\nDry run: nothing was written. Run again with --apply to make these changes.');
    return;
  }
  if (!plan.changes.length) {
    console.log('\nNothing to change.');
    return;
  }

  fs.mkdirSync(args.backupDir, { recursive: true });
  const createdAt = new Date().toISOString();
  const file = path.join(args.backupDir, `crops-array-${createdAt.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(backupFor(plan, { database: collection.dbName, createdAt }), null, 2));
  console.log(`\nBackup written: ${file}`);

  let modified = 0;
  let skipped = 0;
  for (let i = 0; i < plan.changes.length; i += BATCH_SIZE) {
    const batch = plan.changes.slice(i, i + BATCH_SIZE);
    const result = await collection.bulkWrite(
      batch.map(change => ({
        updateOne: {
          filter: { _id: change.id, crops: change.hadCrops ? change.previousCrops : { $exists: false } },
          update: { $set: { crops: change.crops } },
        },
      })),
      { ordered: false },
    );
    modified += result.modifiedCount;
    skipped += batch.length - result.matchedCount;
  }
  console.log(`Updated ${modified} account(s). ${skipped} changed while this ran and were left alone.`);
  console.log(`To undo: node server/migrations/crops-array.js --rollback "${file}" --apply`);
}

async function rollback(collection, docs, args) {
  const backup = JSON.parse(fs.readFileSync(args.rollback, 'utf8'));
  const plan = planRollback(backup, docs);
  console.log(`Backup: ${args.rollback} (created ${backup.createdAt} on database ${backup.database})`);
  console.log(`  accounts to restore: ${plan.restores.length}`);
  console.log(`  crops changed since the migration (left alone): ${plan.changedSince.length}`);
  console.log(`  accounts no longer present: ${plan.missing.length}`);

  if (!args.apply) {
    console.log('\nDry run: nothing was written. Add --apply to restore.');
    return;
  }

  let restored = 0;
  for (let i = 0; i < plan.restores.length; i += BATCH_SIZE) {
    const batch = plan.restores.slice(i, i + BATCH_SIZE);
    const result = await collection.bulkWrite(
      batch.map(entry => ({
        updateOne: {
          filter: { _id: entry.id, crops: entry.expected },
          update: entry.unset ? { $unset: { crops: '' } } : { $set: { crops: entry.crops } },
        },
      })),
      { ordered: false },
    );
    restored += result.modifiedCount;
  }
  console.log(`Restored ${restored} account(s).`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0]);
    return;
  }

  dotenv.config({ path: path.join(HERE, '..', '.env') });
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set (expected in server/.env).');

  console.log(`Database: ${describeDatabase(uri)}`);
  console.log(args.apply ? 'Mode: APPLY - changes will be written\n' : 'Mode: dry run - nothing will be written\n');

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  try {
    const collection = mongoose.connection.db.collection('users');
    const docs = await collection.find({}, { projection: { role: 1, crop: 1, crops: 1 } }).toArray();
    if (args.rollback) await rollback(collection, docs, args);
    else await migrate(collection, docs, args);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(error => {
  console.error(`Migration failed: ${error.message}`);
  process.exitCode = 1;
});
