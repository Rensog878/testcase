import { test } from 'node:test';
import assert from 'node:assert/strict';

import { backupFor, MIGRATION_NAME, planCropsMigration, planRollback } from '../cropsMigrationPlan.js';

const USERS = [
  { _id: 'USR-1', role: 'farmer', crop: 'Paddy / Rice' },
  { _id: 'USR-2', role: 'farmer', crop: 'All Crops' },
  { _id: 'USR-3', role: 'farmer', crop: 'Cotton', crops: ['Cotton', 'Tomato'] },
  { _id: 'USR-4', role: 'farmer', crop: 'Tomato', crops: ['Wheat', 'Tomato'] },
  { _id: 'USR-5', role: 'admin', crop: 'All Crops' },
  { _id: 'USR-6', role: 'delivery', crop: 'N/A' },
  { _id: 'USR-7', crop: 'Sugarcane' },
  { _id: 'USR-8', role: 'farmer', crop: 'N/A' },
  { _id: 'USR-9', role: 'farmer' },
];

test('farmers get crops from crop; staff, and accounts already right, are left alone', () => {
  const plan = planCropsMigration(USERS);
  assert.deepEqual([plan.scanned, plan.farmers, plan.notFarmers, plan.alreadyDone], [9, 7, 2, 1]);
  assert.deepEqual(plan.changes, [
    { id: 'USR-1', hadCrops: false, previousCrops: null, crops: ['Paddy / Rice'] },
    { id: 'USR-2', hadCrops: false, previousCrops: null, crops: ['All Crops'] },
    { id: 'USR-4', hadCrops: true, previousCrops: ['Wheat', 'Tomato'], crops: ['Tomato', 'Wheat'] },
    { id: 'USR-7', hadCrops: false, previousCrops: null, crops: ['Sugarcane'] },
    { id: 'USR-8', hadCrops: false, previousCrops: null, crops: [] },
    { id: 'USR-9', hadCrops: false, previousCrops: null, crops: [] },
  ]);
  assert.deepEqual(plan.cropValues[0], ['(none)', 1]);
});

test('the plan never changes crop and is a no-op when run twice', () => {
  const plan = planCropsMigration(USERS);
  assert.ok(plan.changes.every(change => !('crop' in change)));
  const afterFirstRun = USERS.map(user => {
    const change = plan.changes.find(c => c.id === user._id);
    return change ? { ...user, crops: change.crops } : user;
  });
  assert.equal(planCropsMigration(afterFirstRun).changes.length, 0);
});

test('rollback restores only accounts untouched since the migration', () => {
  const plan = planCropsMigration(USERS);
  const backup = backupFor(plan, { database: 'test', createdAt: '2026-09-13T00:00:00.000Z' });
  assert.equal(backup.migration, MIGRATION_NAME);

  const now = USERS.map(user => {
    const change = plan.changes.find(c => c.id === user._id);
    return change ? { ...user, crops: change.crops } : user;
  });
  // A farmer edited their crops after the migration; another account was deleted.
  now.find(user => user._id === 'USR-1').crops = ['Paddy / Rice', 'Cotton'];
  const current = now.filter(user => user._id !== 'USR-7');

  const rollback = planRollback(backup, current);
  assert.deepEqual(rollback.changedSince, ['USR-1']);
  assert.deepEqual(rollback.missing, ['USR-7']);
  assert.deepEqual(rollback.restores.find(r => r.id === 'USR-4'), { id: 'USR-4', expected: ['Tomato', 'Wheat'], unset: false, crops: ['Wheat', 'Tomato'] });
  assert.deepEqual(rollback.restores.find(r => r.id === 'USR-2'), { id: 'USR-2', expected: ['All Crops'], unset: true, crops: null });
});

test('rollback refuses a file that is not a backup of this migration', () => {
  assert.throws(() => planRollback({ migration: 'other', entries: [] }, []), /not a crops-array migration backup/);
  assert.throws(() => planRollback(null, []), /not a crops-array migration backup/);
});
