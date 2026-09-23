/**
 * One-off: clears every test/demo record accumulated on live while the site
 * was being built and tested, so the store can start with a clean slate -
 * real orders, real revenue, real customers from zero.
 *
 * Every document this removes was inspected and confirmed test/seed data
 * before this script was written (see the chat transcript this shipped
 * with): orders that are all "Pending"/test names, invoices reading
 * "Walk-in Customer" or literal keyboard-mash ("asdsadsad"), Alagu's demo
 * coupons/referrals, a store and admin named "...Test" created minutes
 * earlier, farmer accounts confirmed by the site owner to all be test
 * signups, and the original seed staff (Sathya Admin, Muthuvel K., ...)
 * superseded by the real Admin/Billing/Employee/Delivery 1-3 accounts.
 *
 * NOT touched: the real staff accounts (Admin/Billing/Employee/Delivery
 * 1-3), the Super Admin account, every product, and site settings/CMS.
 *
 *   node server/scripts/reset-live-test-data.mjs --db=sathyambio          (dry run)
 *   node server/scripts/reset-live-test-data.mjs --db=sathyambio --yes    (applies it)
 *
 * A full backup of every document this deletes is written to
 * port-notes/live-reset-backup-<timestamp>.json before anything is removed.
 * Run from `server/` (or with MONGODB_URI set yourself) so it reaches the
 * database that string names - here, the live one.
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

const args = process.argv.slice(2);
const flag = name => (args.find(a => a.startsWith(`--${name}=`)) || '').split('=').slice(1).join('=');
const APPLY = args.includes('--yes');
const expectDb = flag('db');
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('MONGODB_URI is not set.');
  process.exit(1);
}
if (!expectDb) {
  console.error('Pass --db=<name> naming the database you expect to change (a safety check, not a filter).');
  process.exit(1);
}

// Seed/QA staff accounts superseded by the real Admin/Billing/Employee/
// Delivery 1-3 accounts created 2026-09-21, plus "Ram", the admin created
// minutes earlier for the store-scoping test store. Every farmer account is
// removed by role instead - the site owner confirmed all 22 are test
// signups, none are a real customer to preserve.
const SEED_OR_TEST_USER_IDS = [
  'USR-1002', // Sathya Admin (original seed)
  'USR-1003', // Muthuvel K. (original seed)
  'USR-1004', // Karthik Raja (original seed)
  'USR-1005', // Billing Operator #04 (original seed)
  'USR-MTX80TUA4MBT', // QA Admin (browser test - delete after)
  'USR-MTX80U0V1QL6', // QA Delivery (browser test - delete after)
  'USR-MTZCRLPFXGPO', // Test Admin
  'USR-MUCZE8C8IFQ3', // Ram - admin of the "...Test" store
];

// Every document in these collections is test/seed data - the whole
// collection is cleared. See the transcript for how each was confirmed.
const CLEAR_WHOLE_COLLECTION = [
  'orders', 'invoices', 'coupons', 'couponusages', 'referrals', 'stores',
  'advisorybroadcasts', 'advisorysubscribers', 'farmerenquiries', 'tickets',
  'inventoryitems', 'stafftasks', 'chatrecords', 'carts', 'activitylogs',
  'visitorlocations', 'ephemerals',
];

await mongoose.connect(uri, { bufferCommands: false });
const db = mongoose.connection;
console.log(`database: ${db.name}`);
if (db.name !== expectDb) {
  console.error(`ABORT: expected the database ${expectDb}, connected to ${db.name}. Nothing read or written.`);
  await mongoose.disconnect();
  process.exit(1);
}

const col = name => db.db.collection(name);
const backup = {};
let totalDocs = 0;

for (const name of CLEAR_WHOLE_COLLECTION) {
  const docs = await col(name).find({}).toArray();
  backup[name] = docs;
  totalDocs += docs.length;
  console.log(`${docs.length.toString().padStart(4)}  ${name}`);
}

const userFilter = { $or: [{ role: 'farmer' }, { _id: { $in: SEED_OR_TEST_USER_IDS } }] };
const usersToRemove = await col('users').find(userFilter).toArray();
backup.users = usersToRemove;
totalDocs += usersToRemove.length;
console.log(`${usersToRemove.length.toString().padStart(4)}  users (farmers + seed/QA staff)`);

const keptUsers = await col('users').countDocuments({ role: { $ne: 'farmer' }, _id: { $nin: SEED_OR_TEST_USER_IDS } });
console.log(`\n${totalDocs} documents would be removed. ${keptUsers} users, every product, and settings are kept untouched.`);

if (!APPLY) {
  console.log('\nDry run only - nothing written. Pass --yes to apply.');
  await mongoose.disconnect();
  process.exit(0);
}

fs.mkdirSync(path.join(process.cwd(), '..', 'port-notes'), { recursive: true });
const backupPath = path.join(process.cwd(), '..', 'port-notes', `live-reset-backup-${Date.now()}.json`);
fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
console.log(`\nBackup written: ${backupPath} (${(fs.statSync(backupPath).size / 1024).toFixed(0)} KB)`);

let removed = 0;
for (const name of CLEAR_WHOLE_COLLECTION) {
  const r = await col(name).deleteMany({});
  removed += r.deletedCount;
}
const userResult = await col('users').deleteMany(userFilter);
removed += userResult.deletedCount;

console.log(`\nDone: ${removed} documents removed. ${keptUsers} users, every product, and settings were left as they were.`);
await mongoose.disconnect();
