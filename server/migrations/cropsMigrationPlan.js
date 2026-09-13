// What server/migrations/crops-array.js will change, worked out without
// touching the database so it can be tested and shown in a dry run.

import { normalizeFarmerCrops } from '../../src/shared/farmerCrops.js';

export const MIGRATION_NAME = 'crops-array';

const sameList = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, i) => value === b[i]);

/**
 * users: [{ _id, role, crop, crops }] as stored.
 * Farmer accounts (and accounts with no role) get `crops` = their crops with
 * the primary first. `crop` is never changed. Staff accounts are left alone.
 */
export function planCropsMigration(users) {
  const changes = [];
  const cropValues = new Map();
  let farmers = 0;
  let notFarmers = 0;
  let alreadyDone = 0;

  for (const user of users) {
    if (user.role && user.role !== 'farmer') {
      notFarmers += 1;
      continue;
    }
    farmers += 1;
    const value = typeof user.crop === 'string' ? user.crop : '(none)';
    cropValues.set(value, (cropValues.get(value) || 0) + 1);

    const { crops } = normalizeFarmerCrops(typeof user.crop === 'string' ? user.crop : '', Array.isArray(user.crops) ? user.crops : []);
    if (sameList(user.crops, crops)) {
      alreadyDone += 1;
      continue;
    }
    changes.push({
      id: user._id,
      hadCrops: Object.prototype.hasOwnProperty.call(user, 'crops'),
      previousCrops: user.crops === undefined ? null : user.crops,
      crops,
    });
  }

  return {
    scanned: users.length,
    farmers,
    notFarmers,
    alreadyDone,
    changes,
    cropValues: [...cropValues.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))),
  };
}

/** The backup written before --apply: enough to put every changed account back. */
export function backupFor(plan, { database, createdAt }) {
  return {
    migration: MIGRATION_NAME,
    database,
    createdAt,
    entries: plan.changes.map(({ id, hadCrops, previousCrops, crops }) => ({ id, hadCrops, previousCrops, migratedCrops: crops })),
  };
}

/**
 * Restores from a backup, only for accounts whose crops are still exactly what
 * the migration wrote; anything edited since is reported and left alone.
 */
export function planRollback(backup, currentUsers) {
  if (backup?.migration !== MIGRATION_NAME || !Array.isArray(backup.entries)) {
    throw new Error('This file is not a crops-array migration backup.');
  }
  const current = new Map(currentUsers.map(user => [String(user._id), user]));
  const restores = [];
  const changedSince = [];
  const missing = [];

  for (const entry of backup.entries) {
    const user = current.get(String(entry.id));
    if (!user) {
      missing.push(entry.id);
    } else if (!sameList(user.crops, entry.migratedCrops)) {
      changedSince.push(entry.id);
    } else {
      restores.push({ id: entry.id, expected: entry.migratedCrops, unset: !entry.hadCrops, crops: entry.hadCrops ? entry.previousCrops : null });
    }
  }

  return { restores, changedSince, missing };
}
