// The Profile Form Builder's rules (src/shared/profileFieldRules.js), used by
// sign-up, Edit profile, the admin pages and the server.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ALL_CROPS, CROP_CHOICES, DEFAULT_PROFILE_FIELDS, acreInput, stepAcres, cropList, joinCrops, normalizeProfileFields, toggleCrop, profileValueOf, splitProfileValues, validateProfileValues,
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

test('a farmer picks every crop they grow, kept as one comma-separated value', () => {
  assert.deepEqual(cropList(' Cotton ,  paddy / rice,cotton,, '), ['Cotton', 'paddy / rice'])
  assert.deepEqual(cropList(['Wheat', 'Wheat', '']), ['Wheat'])
  assert.deepEqual(cropList(null), [])
  assert.equal(joinCrops(['Wheat', 'Cotton']), 'Wheat, Cotton')

  let value = ''
  for (const crop of ['Wheat', 'Cotton', 'Tomato', 'Potato', 'Grapes / Fruits', 'Sugarcane', 'Corn / Maize']) value = toggleCrop(value, crop)
  assert.equal(cropList(value).length, 7, 'no limit: a seventh crop is added')
  assert.equal(toggleCrop(value, 'cotton'), 'Wheat, Tomato, Potato, Grapes / Fruits, Sugarcane, Corn / Maize')
})

test('"All Crops" stands alone', () => {
  assert.equal(toggleCrop('Wheat, Cotton', ALL_CROPS), ALL_CROPS)
  assert.equal(toggleCrop(ALL_CROPS, 'Wheat'), 'Wheat')
  assert.equal(toggleCrop(ALL_CROPS, ALL_CROPS), '')
})

test('crop answers are checked and cleaned on every screen and the server', () => {
  const form = normalizeProfileFields(DEFAULT_PROFILE_FIELDS)
  const check = crop => validateProfileValues(form, { crop }, { only: ['crop'] })
  assert.deepEqual(check(['Cotton', ' Wheat ']).values, { crop: 'Cotton, Wheat' })
  assert.deepEqual(check('Cotton,Wheat,Cotton').values, { crop: 'Cotton, Wheat' })
  assert.deepEqual(check('a,b,c,d,e,f,g,h,i,j').values, { crop: 'a, b, c, d, e, f, g, h, i, j' }, 'ten crops are fine')
  assert.equal(check(Array.from({ length: 101 }, (_, i) => `c${i}`)).errors.crop, 'Too many crops chosen.', 'only a crafted request is refused')
  assert.deepEqual(check('').values, { crop: '' })
  const required = form.map(field => (field.id === 'crop' ? { ...field, required: true } : field))
  assert.equal(validateProfileValues(required, { crop: '' }, { only: ['crop'] }).errors.crop, 'Please choose at least one crop.')
  // Six long names are longer than a plain text answer may be; none is cut.
  const six = ['Paddy / Rice', 'Citrus / Fruits', 'Grapes / Fruits', 'Corn / Maize', 'Sugarcane', 'Potato']
  assert.equal(check(six).values.crop, six.join(', '))
})

test('forms saved when one crop could be picked are relabelled', () => {
  const form = normalizeProfileFields([{ id: 'crop', title: 'Primary crop', type: 'select' }])
  assert.equal(form.find(field => field.id === 'crop').title, 'Your crops')
  const custom = normalizeProfileFields([{ id: 'crop', title: 'Crops grown', type: 'select' }])
  assert.equal(custom.find(field => field.id === 'crop').title, 'Crops grown')
})

test('farm size can be part of an acre, to two decimal places', () => {
  const form = normalizeProfileFields(DEFAULT_PROFILE_FIELDS)
  const check = acreage => validateProfileValues(form, { acreage }, { only: ['acreage'] })
  assert.deepEqual(check('2.5').values, { acreage: 2.5 })
  assert.deepEqual(check('0.75').values, { acreage: 0.75 })
  assert.deepEqual(check('12').values, { acreage: 12 })
  for (const bad of ['0', '0.05', '2.555', '10000', '1.2.3', '.']) assert.ok(check(bad).errors.acreage, bad)

  assert.equal(acreInput('2,5'), '2.5')
  assert.equal(acreInput('12a.3456'), '12.34')
  assert.equal(acreInput('123456'), '1234')
  assert.equal(acreInput('1.2.3'), '1.23')
  assert.equal(stepAcres('3', 1), '3.15')
  assert.equal(stepAcres('3.15', 1), '3.3')
  assert.equal(stepAcres('3', -1), '2.85')
  assert.equal(stepAcres('2.5', 1), '2.65')
  assert.equal(stepAcres('0.2', -1), '0.1', 'never below the 0.1 acre minimum')
  assert.equal(stepAcres('9999', 1), '9999')
  let v = '0.1'
  for (let i = 0; i < 20; i++) v = stepAcres(v, 1)
  assert.equal(v, '3.1', 'twenty taps from 0.1 add exactly 3 acres, no float drift')
})

test('sign-up offers the crops the server sends (the admin product-form list), not only the built-in ones', () => {
  const [crop] = normalizeProfileFields([{ id: 'crop', title: 'Your crops', options: ['Paddy / Rice', 'Coconut', ' Arecanut ', 'coconut', 'All Crops'] }]).filter(field => field.id === 'crop');
  assert.deepEqual(crop.options, ['Paddy / Rice', 'Coconut', 'Arecanut', 'All Crops']);
  const [fallback] = normalizeProfileFields([{ id: 'crop', title: 'Your crops' }]).filter(field => field.id === 'crop');
  assert.deepEqual(fallback.options, CROP_CHOICES, 'the built-in list until the server list arrives');
});
