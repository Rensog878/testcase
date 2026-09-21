/**
 * Creates a staff account, or sets the password on one that exists.
 *
 *   STAFF_PASSWORD='...' node server/scripts/set-staff-password.mjs \
 *     --phone=9123456789 --role=admin --name="Sathyam Admin" --db=sathyambio --yes
 *
 * Run it from the folder whose .env holds the connection string you mean: from
 * `server/` for the live database, or with MONGODB_URI set yourself.
 *
 * The password comes from the STAFF_PASSWORD environment variable rather than
 * a command-line flag, because flags are recorded in shell history and are
 * visible to anyone who can list processes on the machine.
 *
 * It is checked against the same rules the sign-in form uses (server/
 * security.js): staff need at least 10 characters, a letter, a number, a
 * symbol, and nothing on the common-password list. A weak password is
 * refused here rather than written straight into the database behind the
 * policy's back - a live admin account is orders, customer phone numbers,
 * pricing and WhatsApp sends.
 *
 * Applying requires --db=<name>, and the script stops if the database it
 * actually connected to is called something else.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { hashPassword, passwordProblems, weakPasswordMessage } from '../security.js';

const args = process.argv.slice(2);
const flag = name => (args.find(a => a.startsWith(`--${name}=`)) || '').split('=').slice(1).join('=');
const APPLY = args.includes('--yes');
const phone = flag('phone');
const role = flag('role') || 'admin';
const name = flag('name') || 'Staff';
const expectDb = flag('db');
const password = process.env.STAFF_PASSWORD || '';
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('MONGODB_URI is not set. Point it at the database you mean to change.');
  process.exit(1);
}
if (!/^\d{10}$/.test(phone)) {
  console.error('Give the account as --phone=<10 digits>.');
  process.exit(1);
}
if (!['admin', 'employee', 'delivery', 'billing'].includes(role)) {
  console.error('--role must be admin, employee, delivery or billing.');
  process.exit(1);
}
if (!password) {
  console.error('Set STAFF_PASSWORD in the environment (not as a flag - flags end up in shell history).');
  process.exit(1);
}

const problems = passwordProblems(password, { role, phone });
if (problems.length) {
  console.error(`REFUSED: ${weakPasswordMessage(problems)}`);
  console.error('This is the same rule the sign-in form applies. Writing a weaker one straight into the database would put a live admin panel behind a password the app itself would not accept.');
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

const users = db.collection('users');
const existing = await users.findOne({ $or: [{ phone }, { mobile: phone }] });
console.log(existing
  ? `account ${phone} exists: ${existing.name} (${existing.role}) - its password would be replaced`
  : `account ${phone} does not exist - it would be created as ${role}`);

if (!APPLY) {
  console.log('\ndry run - nothing written. Add --db=<name> --yes to apply.');
  await mongoose.disconnect();
  process.exit(0);
}

const hashed = await hashPassword(password);
if (existing) {
  await users.updateOne({ _id: existing._id }, { $set: { password: hashed, role, status: 'active' } });
  console.log(`password set for ${phone} (${role}).`);
} else {
  const id = `USR-${Date.now().toString(36).toUpperCase()}`;
  await users.insertOne({
    _id: id, id, phone, mobile: phone, name, role, status: 'active',
    password: hashed, createdAt: new Date().toISOString(),
  });
  console.log(`created ${phone} as ${role} (${id}).`);
}

await mongoose.disconnect();
