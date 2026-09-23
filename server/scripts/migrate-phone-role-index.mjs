/**
 * Replaces the users collection's unique index on `phone` alone with a
 * compound unique index on `(phone, role)`, so a phone number can hold one
 * staff account and one separate farmer account instead of at most one
 * account overall (server/db.js's userSchema, and server.js's auth routes,
 * already assume this compound index - this script is what makes the live
 * database match that code).
 *
 * Safe by construction: dropping the old index only removes a constraint, it
 * touches no documents, and creating the new one can only fail (harmlessly)
 * if a duplicate (phone, role) pair already exists - which the old unique-
 * phone index made impossible.
 *
 * A partial index, not sparse: sparse on a COMPOUND index only skips a
 * document missing EVERY indexed field, so two phone-less admins would still
 * collide on { phone: null, role: "admin" } (both have role, neither has
 * phone). The partial filter excludes any document missing phone, full stop.
 *
 *   node server/scripts/migrate-phone-role-index.mjs --db=sathyambio --yes
 *
 * Run from the folder whose .env holds the connection string you mean: from
 * `server/` for the live database, or with MONGODB_URI set yourself.
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const args = process.argv.slice(2);
const flag = name => (args.find(a => a.startsWith(`--${name}=`)) || '').split('=').slice(1).join('=');
const APPLY = args.includes('--yes');
const expectDb = flag('db');
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('MONGODB_URI is not set. Point it at the database you mean to change.');
  process.exit(1);
}

await mongoose.connect(uri, { bufferCommands: false });
const db = mongoose.connection;
console.log(`database: ${db.name}`);
if (expectDb && db.name !== expectDb) {
  console.error(`ABORT: expected the database ${expectDb}, connected to ${db.name}. Nothing changed.`);
  await mongoose.disconnect();
  process.exit(1);
}
if (APPLY && !expectDb) {
  console.error('ABORT: applying needs --db=<name> naming the database you expect.');
  await mongoose.disconnect();
  process.exit(1);
}

const users = db.collection('users');
const existing = await users.indexes();
console.log('current indexes:', existing.map(i => `${i.name} ${JSON.stringify(i.key)}`).join(', '));

const oldPhoneIndex = existing.find(i => i.key && Object.keys(i.key).length === 1 && i.key.phone === 1 && i.unique);
const newIndexPresent = existing.some(i => i.name === 'phone_role_unique');

// The API builds phone_role_unique by itself on start (Mongoose autoIndex) but
// never drops the old index, so "new index present" alone does not mean done.
if (newIndexPresent && !oldPhoneIndex) {
  console.log('\nphone_role_unique present and no old phone-only index - nothing to do.');
  await mongoose.disconnect();
  process.exit(0);
}

console.log(oldPhoneIndex
  ? `\nwould drop old unique index "${oldPhoneIndex.name}" on { phone: 1 }`
  : '\nno old single-field unique index on phone found (nothing to drop)');
if (!newIndexPresent) console.log('would create partial unique index "phone_role_unique" on { phone: 1, role: 1 }, documents with a phone only');

if (!APPLY) {
  console.log('\ndry run - nothing changed. Add --db=<name> --yes to apply.');
  await mongoose.disconnect();
  process.exit(0);
}

if (oldPhoneIndex) {
  await users.dropIndex(oldPhoneIndex.name);
  console.log(`dropped ${oldPhoneIndex.name}.`);
}

if (!newIndexPresent) {
  await users.createIndex(
    { phone: 1, role: 1 },
    { unique: true, name: 'phone_role_unique', partialFilterExpression: { phone: { $exists: true } } }
  );
  console.log('created phone_role_unique on { phone: 1, role: 1 } (documents with a phone only).');
}

await mongoose.disconnect();
console.log('Done.');
