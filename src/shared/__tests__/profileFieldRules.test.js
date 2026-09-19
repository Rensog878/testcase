// The Profile Form Builder's rules (src/shared/profileFieldRules.js), used by
// sign-up, Edit profile, the admin pages and the server.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_PROFILE_FIELDS, normalizeProfileFields, profileValueOf, splitProfileValues, validateProfileValues,
} from '../profileFieldRules.js'

test('name and mobile number are always in the form, with their rules', () => {
  const form = normalizeProfileFields([{ id: 'phone', title: 'Mobile', type: 'text', required: false, editable: true }])
  assert.deepEqual(form.map(field => field.id), ['name', 'phone'])
  const phone = form.find(field => field.id === 'phone')
  assert.equal(phone.type, 'tel')
  assert.equal(phone.required, true)
  assert.equal(phone.editable, false)
  assert.equal(form.find(field => field.id === 'name').required, true)
})

test('built-in fields keep their input type; unknown types become text', () => {
  const form = normalizeProfileFields([
    ...DEFAULT_PROFILE_FIELDS,
    { id: 'acreage', title: 'Dupe', type: 'text' },
    { id: 'custom', title: 'Soil', type: 'weird' },
  ])
  assert.equal(form.find(field => field.id === 'crop').type, 'select')
  assert.equal(form.find(field => field.id === 'acreage').type, 'number')
  assert.equal(form.find(field => field.id === 'custom').type, 'text')
  assert.equal(new Set(form.map(field => field.id)).size, form.length, 'ids stay unique')
})

test('untitled fields are dropped, reserved ids renamed, empty dropdowns become text', () => {
  const form = normalizeProfileFields([
    { id: 'x', title: '   ' },
    { id: 'password', title: 'Sneaky' },
    { id: 'irrigation', title: 'Irrigation', type: 'select', options: [] },
    { id: 'soil', title: 'Soil', type: 'select', options: ['Red', ' Red ', 'Black', ''] },
  ])
  assert.ok(!form.some(field => field.id === 'password' || field.id === 'x'))
  assert.equal(form.find(field => field.id === 'irrigation').type, 'text')
  assert.deepEqual(form.find(field => field.id === 'soil').options, ['Red', 'Black'])
})

const form = normalizeProfileFields([
  ...DEFAULT_PROFILE_FIELDS,
  { id: 'soil', title: 'Soil type', type: 'select', required: true, options: ['Red', 'Black'] },
  { id: 'sowing', title: 'Sowing date', type: 'date' },
  { id: 'alt', title: 'Other number', type: 'tel' },
])

test('required answers, types and choices are checked', () => {
  const { errors } = validateProfileValues(form, { email: 'nope', acreage: '0', soil: 'Blue', sowing: '2026-02-30', alt: '12345' })
  assert.equal(errors.name, 'Full name is required.')
  assert.match(errors.email, /valid email/)
  assert.match(errors.acreage, /1 to 9999/)
  assert.match(errors.soil, /from the list/)
  assert.match(errors.sowing, /valid date/)
  assert.match(errors.alt, /10-digit/)
  assert.equal(validateProfileValues(form, {}).errors.soil, 'Soil type is required.')
})

test('good answers come back cleaned, and an optional one may be left blank', () => {
  const { values, errors } = validateProfileValues(form, {
    name: '  முருகன்   செல்வம் ', email: '', acreage: '5', soil: 'Red', sowing: '2026-06-01', village: ' Thiruvaiyaru ',
  }, { only: ['name', 'email', 'acreage', 'soil', 'sowing', 'village'] })
  assert.deepEqual(errors, {})
  assert.deepEqual(values, { name: 'முருகன் செல்வம்', email: '', acreage: 5, soil: 'Red', sowing: '2026-06-01', village: 'Thiruvaiyaru' })
})

test('a village is required: it is what a delivery is routed by', () => {
  const { errors } = validateProfileValues(form, { name: 'Murugan', village: '' }, { only: ['name', 'village'] })
  assert.equal(errors.village, 'Village / town is required.')
})

test('partial checks leave fields that were not sent alone', () => {
  const { values, errors } = validateProfileValues(form, { village: 'Thiruvaiyaru' }, { partial: true })
  assert.deepEqual(errors, {})
  assert.deepEqual(values, { village: 'Thiruvaiyaru' })
})

test('a name must have letters', () => {
  assert.match(validateProfileValues(form, { name: '12345' }, { only: ['name'] }).errors.name, /not a number/)
})

test('answers split into account columns and profile; values are read back the same way', () => {
  const { core, profile } = splitProfileValues({ name: 'A', crop: 'Cotton', soil: 'Red' })
  assert.deepEqual(core, { name: 'A', crop: 'Cotton' })
  assert.deepEqual(profile, { soil: 'Red' })
  const user = { name: 'A', primaryCrop: 'Cotton', profile: { soil: 'Red' } }
  assert.equal(profileValueOf(user, { id: 'crop' }), 'Cotton')
  assert.equal(profileValueOf(user, { id: 'soil' }), 'Red')
  assert.equal(profileValueOf(user, { id: 'missing' }), '')
})
