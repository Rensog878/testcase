/**
 * Renames the brand inside the database: "Sathyam Bio" -> "Sathyam Agro Mart".
 *
 *   node server/scripts/rebrand-brand-name.mjs                        (dry run)
 *   node server/scripts/rebrand-brand-name.mjs --db=sathyambio --yes  (applies)
 *
 * Run it from the folder whose .env holds the connection string you mean: from
 * `server/` for the live database, or with MONGODB_URI set yourself. Applying
 * requires --db=<name>, and the script stops if the database it connected to
 * is called something else.
 *
 * It rewrites every string field in the catalogue and in the content an admin
 * has typed - product names and descriptions, CMS copy, testimonials - and the
 * product names copied into open baskets and wishlists, so nothing on screen
 * still carries the old brand.
 *
 * ORDERS AND INVOICES ARE LEFT ALONE, on purpose. They record what a customer
 * actually bought under the name it was sold as; a receipt that quietly
 * changes later is worse than one that shows an old brand.
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const OLD = 'Sathyam Bio';
const NEW = 'Sathyam Agro Mart';
const COLLECTIONS = ['products', 'settings', 'carts', 'wishlistitems', 'ephemerals', 'blogs', 'videos'];
const NEVER = ['orders', 'invoices'];

const args = process.argv.slice(2);
const APPLY = args.includes('--yes');
const expectDb = (args.find(a => a.startsWith('--db=')) || '').split('=')[1] || '';
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set. Point it at the database you mean to rename.');
  process.exit(1);
}

await mongoose.connect(uri, { bufferCommands: false });
const db = mongoose.connection;
console.log(`database: ${db.name}`);
if (expectDb && db.name !== expectDb) {
  console.error(`ABORT: expected the database ${expectDb}, connected to ${db.name}. Nothing written.`);
  await mongoose.disconnect();
  process.exit(1);
}
if (APPLY && !expectDb) {
  console.error('ABORT: applying needs --db=<name> naming the database you expect.');
  await mongoose.disconnect();
  process.exit(1);
}

// Rewrites strings anywhere in a document, however deeply nested, and reports
// whether anything changed.
function rename(value) {
  if (typeof value === 'string') {
    const next = value.split(OLD).join(NEW);
    return [next, next !== value];
  }
  if (Array.isArray(value)) {
    let touched = false;
    const next = value.map(v => { const [n, t] = rename(v); touched = touched || t; return n; });
    return [next, touched];
  }
  if (value && typeof value === 'object' && !(value instanceof Date) && !(value._bsontype)) {
    let touched = false;
    const next = {};
    for (const [k, v] of Object.entries(value)) { const [n, t] = rename(v); next[k] = n; touched = touched || t; }
    return [next, touched];
  }
  return [value, false];
}

const existing = (await db.db.listCollections().toArray()).map(c => c.name);
let totalDocs = 0;
for (const name of COLLECTIONS) {
  if (!existing.includes(name)) continue;
  const col = db.collection(name);
  const docs = await col.find({}).toArray();
  const writes = [];
  for (const doc of docs) {
    const { _id, ...rest } = doc;
    const [next, touched] = rename(rest);
    if (touched) writes.push({ updateOne: { filter: { _id }, update: { $set: next } } });
  }
  if (!writes.length) continue;
  totalDocs += writes.length;
  console.log(`${name.padEnd(16)} ${writes.length} document(s)`);
  if (APPLY) await col.bulkWrite(writes);
}

for (const name of NEVER) {
  if (!existing.includes(name)) continue;
  const n = await db.collection(name).countDocuments({ $text: undefined, 'items.name': { $regex: OLD } }).catch(() => 0);
  if (n) console.log(`${name.padEnd(16)} ${n} document(s) left unchanged on purpose (a receipt keeps the name it was sold under)`);
}

console.log(totalDocs === 0
  ? '\nnothing carries the old brand.'
  : APPLY ? `\nrewrote ${totalDocs} document(s).` : '\ndry run - nothing written. Add --db=<name> --yes to apply.');
await mongoose.disconnect();
