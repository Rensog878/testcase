// Read-only backup: every collection of the MONGODB_URI database to one
// Extended-JSON file per collection. Nothing is written to the database.
//   node server/scripts/backup-db.mjs <output folder>
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..', '.env') });
const out = process.argv[2];
if (!out) throw new Error('Usage: node server/scripts/backup-db.mjs <output folder>');
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');

fs.mkdirSync(out, { recursive: true });
await mongoose.connect(process.env.MONGODB_URI);
const dbh = mongoose.connection.db;
const { EJSON } = mongoose.mongo.BSON;
const summary = {};
for (const { name } of await dbh.listCollections({}, { nameOnly: true }).toArray()) {
  const docs = await dbh.collection(name).find({}).toArray();
  fs.writeFileSync(path.join(out, `${name}.json`), EJSON.stringify(docs, null, 1, { relaxed: false }));
  summary[name] = docs.length;
}
fs.writeFileSync(path.join(out, '_summary.json'), JSON.stringify({ database: dbh.databaseName, at: new Date().toISOString(), counts: summary }, null, 2));
console.log(`database ${dbh.databaseName}:`, summary);
await mongoose.disconnect();
