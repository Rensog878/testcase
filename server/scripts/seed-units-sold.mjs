/**
 * Gives every product a starting `unitsSold`, so the trending rows have
 * something to rank by before the shop has taken enough real orders.
 *
 *   node server/scripts/seed-units-sold.mjs --yes            (dry run without --yes)
 *   node server/scripts/seed-units-sold.mjs --yes --all      (also re-rolls products that already have a count)
 *   node server/scripts/seed-units-sold.mjs --yes --max=500  (default 400)
 *
 * The numbers are invented. Real sales are counted from here on by
 * db.reserveStock, which raises unitsSold in the same atomic update that takes
 * the stock, so anything seeded here is only a starting point.
 *
 * Safety: it writes to whatever MONGODB_URI points at and prints that database's
 * name first. Without --yes it changes nothing and only shows what it would do.
 * By default it skips products that already carry a count, so running it twice
 * does not inflate anyone's numbers.
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const args = process.argv.slice(2);
const has = flag => args.includes(flag);
const value = (name, fallback) => {
  const hit = args.find(a => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split('=')[1]) : fallback;
};

const APPLY = has('--yes');
const ALL = has('--all');
const MAX = Math.max(1, value('max', 400));
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('MONGODB_URI is not set. Point it at the database you mean to seed.');
  process.exit(1);
}

// A long tail: most products sell a little, a few sell a lot - so the trending
// row has a clear top rather than 78 products within ten units of each other.
const roll = () => {
  const skewed = Math.pow(Math.random(), 2.2);
  return Math.max(1, Math.round(skewed * MAX));
};

await mongoose.connect(uri, { bufferCommands: false });
const db = mongoose.connection;
console.log(`database: ${db.name}`);

const products = db.collection('products');
const filter = ALL ? {} : { $or: [{ unitsSold: { $exists: false } }, { unitsSold: 0 }, { unitsSold: null }] };
const targets = await products.find(filter, { projection: { _id: 1, name: 1, unitsSold: 1 } }).toArray();

console.log(`${targets.length} product(s) ${ALL ? 'to re-roll' : 'without a count'} of ${await products.countDocuments()} total`);
if (!targets.length) {
  await mongoose.disconnect();
  process.exit(0);
}

const writes = targets.map(product => ({
  updateOne: { filter: { _id: product._id }, update: { $set: { unitsSold: roll() } } },
}));

for (const write of writes.slice(0, 5)) {
  const name = targets.find(t => t._id === write.updateOne.filter._id)?.name || write.updateOne.filter._id;
  console.log(`  ${name}: ${write.updateOne.update.$set.unitsSold}`);
}
if (writes.length > 5) console.log(`  ... and ${writes.length - 5} more`);

if (!APPLY) {
  console.log('\ndry run - nothing written. Add --yes to apply.');
} else {
  const result = await products.bulkWrite(writes);
  console.log(`\nupdated ${result.modifiedCount} product(s).`);
}

await mongoose.disconnect();
