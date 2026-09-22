import { Fragment, memo, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../../context/AuthContext'
import { STAFF_HOME } from '../../hooks/checkoutRules'
import { ResendAnnouncer, resendLabel, useResendCountdown } from '../../shared/useResendCountdown'
import { ACRE_LIMITS, ALL_CROPS, acreInput, stepAcres, CROP_CHOICES, DEFAULT_PROFILE_FIELDS, MAX_CROPS, cropList, normalizeProfileFields, profileValueOf, toggleCrop, validateProfileValues } from '../../shared/profileFieldRules'
import { useStore } from '../StoreContext'
import { showToast } from '../toast'
import { otpFromText } from '../../shared/otpCode'
import { readGuestContact } from '../guestContact'
import Modal from './Modal'
import VoiceButton from './VoiceButton'

// One sheet with three views: phone (the mobile number), otp (the WhatsApp
// code) and details (who they are and where they farm). There is no password
// and no choice to make: the same code signs in a number we know and, for one
// we do not, opens the details form that creates the account. Signed-in
// visitors see their profile card instead (AccountCard). Styles:
// storefront.css, 7f (sign-in) and 7f-2 (the profile card). What sign-up and
// Edit profile ask comes from Admin → Profile Form Builder
// (src/shared/profileFieldRules.js); the mobile number is never asked twice.

// What the details form starts with. The mobile number is not here: it is
// already verified, and is shown rather than asked.
// regCrop starts empty: the farmer picks their own crops (CropPicker).
const REGISTER_DEFAULTS = { regName: '', regEmail: '', regCrop: '', regAcreage: '3', regVillage: '', regDistrict: '', regState: '' }
// Details input ids for built-in fields; fields an admin adds get regField-<id>.
const REG_IDS = { name: 'regName', email: 'regEmail', crop: 'regCrop', acreage: 'regAcreage', village: 'regVillage', district: 'regDistrict', state: 'regState' }
const regIdFor = id => REG_IDS[id] || `regField-${id}`
// Asked by the sheet itself; everything else comes from the builder.
const ASKED_ELSEWHERE = ['name', 'phone']
const INITIAL_FIELDS = { authPhone: '', storefrontOtpInput: '', ...REGISTER_DEFAULTS }
// Fields that keep only digits, with their length.
const DIGITS_ONLY = { authPhone: 10, storefrontOtpInput: 6 }
const TITLE_IDS = { phone: 'authPhoneTitle', otp: 'authOtpTitle', details: 'authDetailsTitle' }
// Three labels share a phone's width, so they are kept to one word where a
// word will do: "Mobile number" wrapped onto two lines in English and in Tamil.
const AUTH_STEPS = ['Mobile', 'WhatsApp code', 'Your details']

// 9876501234 -> "+91 98765 01234", grouped the way the number is read out.
function formatMobile(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  return digits.length === 10 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : `+91 ${digits}`
}

const without = (object, keys) => {
  if (!keys.some(key => key in object)) return object
  const next = { ...object }
  keys.forEach(key => delete next[key])
  return next
}

async function postJson(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  return { res, data }
}

const Spinner = ({ label }) => <><i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> {label}</>

function FieldHint({ id, hint }) {
  if (!hint) return null
  return <small id={`${id}Hint`} className={hint.kind === 'error' ? 'sb-field-error' : 'sb-field-ok'}>{hint.message}</small>
}

// A code field is one real input (so WhatsApp/SMS autofill and paste work)
// drawn as six boxes; the lit box is where the next digit goes.
function OtpCells({ value, focused }) {
  const digits = value.replace(/\D/g, '').slice(0, 6)
  return (
    <div className="auth-otp-cells notranslate" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => {
        const className = [digits[index] && 'is-filled', focused && index === Math.min(digits.length, 5) && 'is-active'].filter(Boolean).join(' ')
        return <span key={index} className={className || undefined}>{digits[index] || ''}</span>
      })}
    </div>
  )
}

// Crops as a row of chips, up to MAX_CROPS. The value stays one string
// ("Paddy / Rice, Cotton"), the way it is saved. onToggle gets the crop tapped
// and toggles it on the latest value, so two quick taps both count. `id` goes on the first chip so
// an error can focus the question. Crops saved that the shop's list no longer
// has are still shown, picked, so saving never drops one silently.
function CropPicker({ id, title, options, value, onToggle, error }) {
  const picked = cropList(value)
  const isPicked = crop => picked.some(item => item.toLowerCase() === crop.toLowerCase())
  const offered = [...picked.filter(crop => !options.some(option => option.toLowerCase() === crop.toLowerCase())), ...options]
  const full = picked.filter(crop => crop !== ALL_CROPS).length >= MAX_CROPS
  const [bumped, setBumped] = useState(false)
  const labelId = `${id}Label`
  const noteId = `${id}Note`
  const pick = crop => {
    if (full && !isPicked(crop) && crop !== ALL_CROPS) {
      setBumped(true)
      return
    }
    setBumped(false)
    onToggle(crop)
  }
  return (
    <div className="auth-field">
      <div className="auth-label" id={labelId}>
        <span>{title}</span>
        <span className="auth-crop-count notranslate" aria-hidden="true">{picked.length}/{MAX_CROPS}</span>
      </div>
      <p id={noteId} className={['auth-crop-note', bumped && 'is-bumped'].filter(Boolean).join(' ')} aria-live="polite">
        {bumped ? `You can pick up to ${MAX_CROPS}. Remove one to add another.` : `Tap every crop you grow, up to ${MAX_CROPS}.`}
      </p>
      <div className={['auth-crop-chips', error && 'is-invalid'].filter(Boolean).join(' ')} role="group" aria-labelledby={labelId} aria-describedby={[noteId, error && `${id}Hint`].filter(Boolean).join(' ')}>
        {offered.map((crop, index) => {
          const on = isPicked(crop)
          const blocked = full && !on && crop !== ALL_CROPS
          return (
            <button
              type="button"
              key={crop}
              id={index === 0 ? id : undefined}
              className={['auth-crop-chip', on && 'is-on', blocked && 'is-blocked'].filter(Boolean).join(' ')}
              aria-pressed={on}
              aria-disabled={blocked || undefined}
              onClick={() => pick(crop)}
            >
              <i className={`fa-solid ${on ? 'fa-check' : 'fa-plus'}`} aria-hidden="true"></i>
              <span>{crop}</span>
            </button>
          )
        })}
      </div>
      <FieldHint id={id} hint={error && { kind: 'error', message: error }} />
    </div>
  )
}

// The form the admin built. Asked again each time the sheet opens, so a change
// in the builder shows without a reload; the built-in form fills in meanwhile.
const BUILT_IN_FORM = normalizeProfileFields(DEFAULT_PROFILE_FIELDS)
let lastProfileForm = BUILT_IN_FORM
function useProfileForm(open) {
  const [form, setForm] = useState(lastProfileForm)
  useEffect(() => {
    if (!open) return undefined
    let live = true
    axios.get('/api/profile-fields')
      .then(({ data }) => {
        if (!live || !Array.isArray(data?.data)) return
        lastProfileForm = normalizeProfileFields(data.data)
        setForm(lastProfileForm)
      })
      .catch(() => {})
    return () => { live = false }
  }, [open])
  return form
}

const FIELD_ICONS = { name: 'fa-user', email: 'fa-envelope', village: 'fa-location-dot', district: 'fa-map-location-dot', state: 'fa-map' }
const TYPE_ICONS = { text: 'fa-pen', email: 'fa-envelope', tel: 'fa-phone', number: 'fa-hashtag', date: 'fa-calendar-days', textarea: 'fa-align-left', select: 'fa-list' }
const AUTOCOMPLETE = { name: 'name', email: 'email', village: 'address-level2', state: 'address-level1' }
// Voice typing (VoiceButton) per question: places in English, numbers as
// digits, other text in the site's language. Emails, dates and lists have none.
const voiceModeFor = field => {
  if (['village', 'district'].includes(field.id)) return 'latin'
  if (field.type === 'tel' || field.type === 'number') return 'digits'
  if (field.type === 'text' || field.type === 'textarea') return 'text'
  return null
}

// One question from the builder, drawn like the rest of the sheet. `control`
// carries id, value, onChange, classes and aria wiring.
function ProfileFieldInput({ field, control, hint, help, enterKeyHint = 'next' }) {
  const { type } = field
  const shared = { ...control, autoComplete: AUTOCOMPLETE[field.id] || 'off' }
  let input
  if (type === 'select') {
    input = (
      <select {...shared}>
        <option value="">Choose...</option>
        {field.options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    )
  } else if (type === 'textarea') {
    input = <textarea rows={3} maxLength={500} {...shared} />
  } else {
    const inputMode = { number: 'decimal', tel: 'numeric' }[type]
    const maxLength = { tel: 10, number: 12, email: 120 }[type] || 80
    input = <input type={type === 'number' ? 'text' : type} inputMode={inputMode} maxLength={maxLength} autoCapitalize={field.id === 'name' ? 'words' : undefined} enterKeyHint={enterKeyHint} {...shared} />
  }
  const voiceMode = voiceModeFor(field)
  const controlClass = ['auth-control', type === 'select' && 'auth-control--select', type === 'textarea' && 'auth-control--textarea', voiceMode && 'has-voice'].filter(Boolean).join(' ')
  return (
    <div className="auth-field">
      <label className="auth-label" htmlFor={control.id}>{field.title}{!field.required && <> <span className="auth-optional">Optional</span></>}</label>
      <div className={controlClass}>
        {input}
        <i className={`fa-solid ${FIELD_ICONS[field.id] || TYPE_ICONS[type]} auth-control-icon`} aria-hidden="true"></i>
        {type === 'select' && <i className="fa-solid fa-chevron-down auth-select-chevron" aria-hidden="true"></i>}
        {voiceMode && <VoiceButton htmlFor={control.id} mode={voiceMode} />}
      </div>
      {help}
      {hint}
    </div>
  )
}

function ResendRow({ textId, buttonId, left, sending, sendingLabel, onResend }) {
  const waiting = left === null || left > 0
  let label = resendLabel(left)
  if (sending && sendingLabel) label = sendingLabel
  return (
    <p className="auth-resend">
      <span id={textId}>{waiting ? 'Code sent on WhatsApp.' : "Didn't get it?"}</span>
      <button type="button" id={buttonId} className="auth-link" onClick={onResend} disabled={sending || waiting}>{label}</button>
    </p>
  )
}

// The store brand, as in the header. Not a link, so it takes no Tab stop.
function AuthBrand({ t }) {
  return (
    <div className="auth-brand">
      {/* Emblem and wordmark share a line, as they do on the header; the
          slogan is centred under both, not tucked beside the emblem. */}
      <span className="auth-brand-line">
        <span className="auth-brand-icon has-brand-mark" aria-hidden="true"><img className="brand-mark" src="/assets/brand/logo-mark.png" alt="" width="512" height="512" /></span>
        <span className="auth-brand-text has-brand-wordmark"><img className="brand-wordmark" src="/assets/brand/logo-wordmark.png" alt="Sathyam Agro Mart" width="1200" height="254" /></span>
      </span>
      <span className="auth-brand-sub" data-i18n="logo_sub">{t('logo_sub')}</span>
    </div>
  )
}

// ---- signed in: the profile card ----
// What customers can change about themselves (PUT /api/profile): the fields
// the admin left editable in the Profile Form Builder, never the mobile number
// or role; staff have no crop or farm size. The server checks the same rules.
const FARM_KEYS = ['crop', 'acreage']
const PROFILE_INPUT = { name: 'acctName', email: 'acctEmail', crop: 'acctCrop', acreage: 'acctAcreage', village: 'acctVillage', district: 'acctDistrict', state: 'acctState' }
const acctIdFor = id => PROFILE_INPUT[id] || `acctField-${id}`
// Already on the card in their own rows.
const CARD_KEYS = ['name', 'phone', 'crop', 'acreage', 'village', 'district']

const cropOf = user => user.crop || user.primaryCrop || ''
// The crop choices to show: the shop's own list, served with the form.
// CropPicker keeps any saved crop the list no longer has.
const cropOptionsFor = field => (field?.options?.length ? field.options : CROP_CHOICES)
const profileOf = (user, fields) => Object.fromEntries(fields.map(field => {
  const value = profileValueOf(user, field)
  if (field.id === 'crop') return [field.id, String(value)]
  // A farm size of 0 means it was never given.
  if (field.id === 'acreage') return [field.id, Number(value) > 0 ? String(value) : '']
  return [field.id, String(value)]
}))

// The first letter as it is read: "மு" or "सु", not the bare consonant
// charAt(0) cuts from a Tamil or Hindi name.
function initialOf(name) {
  const text = String(name || '').trim()
  if (!text) return ''
  const first = typeof Intl !== 'undefined' && Intl.Segmenter
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)[Symbol.iterator]().next().value?.segment
    : Array.from(text)[0]
  return (first || '').toUpperCase()
}

// A detail as a label over its value, so a long translated label never
// squeezes the value beside it on a narrow phone.
function ProfileRow({ icon, label, id, value, keepAsTyped = false }) {
  const className = ['acct-value', !value && 'is-empty', value && keepAsTyped && 'notranslate'].filter(Boolean).join(' ')
  return (
    <li className="acct-row">
      <span className="acct-icon" aria-hidden="true"><i className={`fa-solid ${icon}`}></i></span>
      <span className="acct-label">{label}</span>
      <span id={id} className={className}>{value || 'Not added'}</span>
    </li>
  )
}

// The profile (initial, name, mobile, crop and acreage, village and district,
// the staff portal, Sign Out) and its edit form. Order Status is not here: it
// has its own button (Menu → Track Order, the header's Track link).
function AccountCard({ t, user, view, onView, profileForm }) {
  const { signOut, leaveSignInFor } = useStore()
  const { setSession } = useAuth()
  const [form, setForm] = useState(() => profileOf(user, profileForm))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const focusNext = useRef(null)

  const portal = STAFF_HOME[user.role]
  const crops = cropList(cropOf(user))
  if (!crops.length) crops.push(ALL_CROPS)
  // Each crop its own text node, so the page translator can translate it.
  const cropNames = crops.map((name, index) => <Fragment key={name}>{index ? ', ' : null}<span>{name}</span></Fragment>)
  const acres = user.acreage || user.landAcres
  const place = [user.village, user.district].filter(Boolean).join(', ')
  const phone = user.phone || user.mobile
  const initial = initialOf(user.name)
  const editableFields = profileForm.filter(field => field.editable && field.id !== 'phone' && !(portal && FARM_KEYS.includes(field.id)))
  // An account made from a mobile number alone, still untouched: the name is
  // the placeholder the server gives and nothing about the farm is filled in.
  // Read off the account rather than remembered from the sign-in, so the nudge
  // survives a reload and goes the moment they answer it.
  const needsProfile = !portal && !place && !user.email && (!user.name || user.name === 'Farmer') && editableFields.length > 0
  // Answers the card has no row of its own for: email, state, the admin's questions.
  const extraRows = profileForm.filter(field => !CARD_KEYS.includes(field.id) && !(field.id === 'email' && !phone))

  useEffect(() => {
    const id = focusNext.current
    if (!id) return
    focusNext.current = null
    document.getElementById(id)?.focus({ preventScroll: true })
  })

  useEffect(() => {
    document.querySelector('#authModal .modal-card')?.scrollTo({ top: 0 })
  }, [view])

  const startEdit = () => {
    setForm(profileOf(user, profileForm))
    setErrors({})
    focusNext.current = 'authEditTitle'
    onView('edit')
  }

  const backToProfile = () => {
    focusNext.current = 'authAccountTitle'
    onView('profile')
  }

  // A plain click stays in the app; Ctrl/⌘-click still opens a new tab.
  const openPortal = event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    leaveSignInFor(portal)
  }

  const setField = (key, value) => {
    const digits = { tel: 10 }[profileForm.find(field => field.id === key)?.type]
    const clean = key === 'acreage' ? acreInput(value) : digits ? value.replace(/\D/g, '').slice(0, digits) : value
    setForm(current => ({ ...current, [key]: clean }))
    setErrors(current => without(current, [key]))
  }

  const toggleMyCrop = crop => {
    setForm(current => ({ ...current, crop: toggleCrop(current.crop, crop) }))
    setErrors(current => without(current, ['crop']))
  }

  const saveProfile = async event => {
    event.preventDefault()
    if (saving) return
    const { values: changes, errors: problems } = validateProfileValues(profileForm, form, { only: editableFields.map(field => field.id) })
    setErrors(problems)
    const bad = editableFields.find(field => problems[field.id])
    if (bad) {
      document.getElementById(acctIdFor(bad.id))?.focus()
      return
    }

    setSaving(true)
    try {
      const { data } = await axios.put('/api/profile', changes)
      if (!data?.success || !data.data) throw new Error(data?.message)
      const token = localStorage.getItem('sathya_token')
      if (token) setSession(token, { ...user, ...data.data })
      showToast('Profile saved.', 'success')
      backToProfile()
    } catch (err) {
      showToast(err?.response?.data?.message || 'Could not save your profile. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const inputProps = (key, describedBy) => {
    const id = acctIdFor(key)
    return {
      id,
      className: ['auth-input', errors[key] && 'sb-input-invalid'].filter(Boolean).join(' '),
      value: form[key] ?? '',
      onChange: event => setField(key, event.target.value),
      'aria-invalid': errors[key] ? 'true' : undefined,
      'aria-describedby': [describedBy, errors[key] && `${id}Hint`].filter(Boolean).join(' ') || undefined,
    }
  }
  const hint = key => <FieldHint id={acctIdFor(key)} hint={errors[key] && { kind: 'error', message: errors[key] }} />

  const editField = (field, index) => {
    const last = index === editableFields.length - 1
    if (field.id === 'crop') {
      return <CropPicker key={field.id} id="acctCrop" title={field.title} options={cropOptionsFor(field)} value={form.crop} onToggle={toggleMyCrop} error={errors.crop} />
    }
    if (field.id === 'acreage') {
      return (
        <div className="auth-field" key={field.id}>
          <label className="auth-label" htmlFor="acctAcreage">{field.title}</label>
          <div className="auth-control auth-control--suffix">
            <input type="text" inputMode="decimal" autoComplete="off" enterKeyHint={last ? 'done' : 'next'} {...inputProps('acreage', 'acctAcreageUnit')} />
            <span className="auth-suffix" id="acctAcreageUnit">acres</span>
          </div>
          {hint('acreage')}
        </div>
      )
    }
    return <ProfileFieldInput key={field.id} field={field} control={inputProps(field.id)} hint={hint(field.id)} enterKeyHint={last ? 'done' : 'next'} />
  }

  if (view === 'edit') {
    return (
      <div id="authLoggedInView" className="auth-account" data-view="edit">
        <AuthBrand t={t} />
        <div className="auth-topbar">
          <button type="button" id="accountBackBtn" className="auth-back" onClick={backToProfile}>
            <i className="fa-solid fa-arrow-left" aria-hidden="true"></i>
            <span>Back</span>
          </button>
        </div>

        <form id="accountEditForm" className="auth-form" onSubmit={saveProfile} noValidate>
          <header className="auth-head">
            <h2 id="authEditTitle" className="auth-title" tabIndex={-1}>Edit profile</h2>
            <p className="auth-sub">Your mobile number cannot be changed.</p>
          </header>

          {editableFields.map(editField)}

          <div className="auth-actions">
            <button type="submit" className="auth-cta" id="accountSaveBtn" disabled={saving}>
              {saving ? <Spinner label="Saving..." /> : <><i className="fa-solid fa-check" aria-hidden="true"></i> Save changes</>}
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div id="authLoggedInView" className="auth-account" data-view="profile">
      <AuthBrand t={t} />
      <section className="acct-view" aria-labelledby="authAccountTitle">
        {/* The account was made from a mobile number alone and nothing has been
            filled in yet. Point at the one thing worth doing rather than
            showing a wall of "Not added". */}
        {needsProfile && (
          <div className="acct-welcome" role="status">
            <span className="acct-welcome-icon" aria-hidden="true"><i className="fa-solid fa-seedling"></i></span>
            <div className="acct-welcome-words">
              <strong>Finish setting up your account</strong>
              <span>Add your name and village so we can tailor crop advice and deliveries to your farm.</span>
            </div>
            <button type="button" className="acct-welcome-btn" onClick={startEdit}>
              <i className="fa-solid fa-pen" aria-hidden="true"></i> Complete profile
            </button>
          </div>
        )}
        <header className="acct-head">
          <span id="loggedInUserInitial" className="acct-avatar notranslate" aria-hidden="true">
            {initial || <i className="fa-solid fa-user"></i>}
          </span>
          <div className="acct-id">
            <h2 id="authAccountTitle" className="auth-title acct-name" tabIndex={-1}>
              <span id="loggedInUserName" className={user.name ? 'notranslate' : undefined}>{user.name || 'Farmer'}</span>
            </h2>
            <span id="loggedInUserRoleBadge" className="acct-role">
              <i className={`fa-solid ${portal ? 'fa-shield-halved' : 'fa-wheat-awn'}`} aria-hidden="true"></i>
              <span>{portal ? `${user.role.toUpperCase()} Staff` : <>{`${crops[0]} Farmer`}{crops.length > 1 ? ` +${crops.length - 1}` : null}</>}</span>
            </span>
          </div>
        </header>

        <ul className="acct-details">
          {phone || !user.email
            ? <ProfileRow icon="fa-mobile-screen-button" label="Mobile" id="loggedInUserPhone" value={phone && formatMobile(phone)} keepAsTyped />
            : <ProfileRow icon="fa-envelope" label="Email" id="loggedInUserEmail" value={user.email} keepAsTyped />}
          {!portal && <ProfileRow icon="fa-seedling" label="Crop & Acreage" id="loggedInUserCrop" value={<>{cropNames}{acres ? ` (${acres} Acres)` : null}</>} />}
          <ProfileRow icon="fa-location-dot" label="Location" id="loggedInUserLocation" value={place} />
          {extraRows.map(field => {
            const value = String(profileValueOf(user, field) ?? '')
            // Staff are not asked the farmer questions: only answers they have show.
            if (portal && !value) return null
            return <ProfileRow key={field.id} icon={FIELD_ICONS[field.id] || TYPE_ICONS[field.type]} label={field.title} id={`loggedInUserField-${field.id}`} value={value} keepAsTyped />
          })}
        </ul>

        <div className="acct-actions">
          {portal && (
            <a id={user.role === 'admin' ? 'adminPortalLink' : 'staffPortalLink'} href={portal} className="auth-cta" onClick={openPortal}>
              <i className={`fa-solid ${user.role === 'admin' ? 'fa-gauge-high' : 'fa-briefcase'}`} aria-hidden="true"></i> {user.role === 'admin' ? 'Open Admin Panel' : 'Open my portal'}
            </a>
          )}
          {editableFields.length > 0 && (
            <button type="button" id="accountEditBtn" className="acct-btn" onClick={startEdit}>
              <i className="fa-solid fa-pen" aria-hidden="true"></i> Edit profile
            </button>
          )}
          <button type="button" id="accountSignOutBtn" className="acct-btn acct-btn--signout" onClick={signOut}>
            <i className="fa-solid fa-right-from-bracket" aria-hidden="true"></i> Sign Out
          </button>
        </div>
      </section>
    </div>
  )
}

export default memo(function AuthModal({ t, state, user, notice, loginRequest }) {
  const { afterSignIn } = useStore()
  const { verifyAuthOtp, register } = useAuth()

  const [view, setView] = useState('phone')
  const [fields, setFields] = useState(INITIAL_FIELDS)
  const [status, setStatus] = useState({}) // field id -> 'invalid' | 'valid'
  const [hints, setHints] = useState({}) // field id -> { kind, message }
  const [focusedOtp, setFocusedOtp] = useState('')
  const [busy, setBusy] = useState('')
  const [otpPhone, setOtpPhone] = useState('')
  const [accountView, setAccountView] = useState('profile') // signed in: 'profile' | 'edit'
  const signupResend = useResendCountdown()
  const profileForm = useProfileForm(Boolean(state))
  // The builder's questions other than the two the sheet asks itself.
  const farmFields = profileForm.filter(field => !ASKED_ELSEWHERE.includes(field.id))
  const titleOf = id => profileForm.find(field => field.id === id)?.title

  const fieldsRef = useRef(fields)
  const sentTo = useRef('') // the number the code on screen went to
  const verifiedPhone = useRef('') // proved by a correct code, awaiting its details
  const verifying = useRef(false)
  const focusNext = useRef(null)
  const shellKey = useRef('phone')

  // ---- field state ----
  const setField = (id, value) => {
    fieldsRef.current = { ...fieldsRef.current, [id]: value }
    setFields(fieldsRef.current)
  }
  const setFieldsTo = values => {
    fieldsRef.current = { ...fieldsRef.current, ...values }
    setFields(fieldsRef.current)
  }
  const setFieldError = (id, message) => {
    setStatus(current => ({ ...current, [id]: 'invalid' }))
    setHints(current => ({ ...current, [id]: { kind: 'error', message } }))
  }
  // A success message replaces an error already shown; otherwise the hint goes.
  const setFieldValid = (id, message = '') => {
    setStatus(current => ({ ...current, [id]: 'valid' }))
    setHints(current => {
      if (!current[id]) return current
      return message ? { ...current, [id]: { kind: 'ok', message } } : without(current, [id])
    })
  }
  const clearField = id => {
    setStatus(current => without(current, [id]))
    setHints(current => without(current, [id]))
  }
  const clearFields = ids => {
    setStatus(current => without(current, ids))
    setHints(current => without(current, ids))
  }

  // ---- views ----
  // focusTitle moves focus to the new heading: screen readers announce the new
  // step, and the phone keyboard left open by the previous step closes.
  const showView = (nextView, { focus, focusTitle = false, select = false } = {}) => {
    setView(nextView)
    if (focus) focusNext.current = { id: focus, select }
    else if (focusTitle) focusNext.current = { id: TITLE_IDS[nextView], preventScroll: true }
  }

  // Asked to show sign-in (basket, checkout or a #login link). A code already on
  // its way is not thrown away: that screen is where they left off.
  useEffect(() => {
    if (loginRequest) setView(sentTo.current ? 'otp' : 'phone')
  }, [loginRequest])

  // The profile card opens on the profile, not on an edit left half-done.
  const cardOpen = Boolean(state)
  // Signing in, the number from the "Stay connected" card is filled in.
  useEffect(() => {
    if (!cardOpen || user) return
    const guest = readGuestContact()
    if (guest && !fieldsRef.current.authPhone) {
      setField('authPhone', guest.phone)
      validatePhone(guest.phone)
    }
  }, [cardOpen, user])

  useEffect(() => {
    if (cardOpen) setAccountView('profile')
  }, [cardOpen])

  useEffect(() => {
    if (shellKey.current === view) return
    shellKey.current = view
    document.querySelector('#authModal .modal-card')?.scrollTo({ top: 0 })
  }, [view])

  useEffect(() => {
    const next = focusNext.current
    if (!next) return
    focusNext.current = null
    const el = document.getElementById(next.id)
    el?.focus({ preventScroll: Boolean(next.preventScroll) })
    if (next.select) el?.select()
  })

  // ---- live checks ----
  // Returns true when the field currently holds a valid value.
  const validatePhone = value => {
    if (!value) { clearField('authPhone'); return false }
    // A bad first digit is wrong from the very first keystroke - say so straight away.
    if (!/^[6-9]/.test(value)) { setFieldError('authPhone', 'An Indian mobile number must start with 6, 7, 8 or 9.'); return false }
    if (value.length < 10) { setFieldError('authPhone', `Enter all 10 digits (${value.length}/10).`); return false }
    setFieldValid('authPhone', 'Looks good.')
    return true
  }

  const validateName = value => {
    const v = value.trim()
    if (!v) { clearField('regName'); return false }
    // Letters in any script, as the server checks: names are typed in Tamil and Hindi too.
    if ((v.match(/\p{L}/gu) || []).length < 2) { setFieldError('regName', 'Please enter your name, not a number.'); return false }
    setFieldValid('regName')
    return true
  }

  const onInput = (id, digits = DIGITS_ONLY[id]) => event => {
    let value = event.target.value
    if (digits) value = value.replace(/\D/g, '').slice(0, digits)
    else if (id === 'regAcreage') value = acreInput(value)
    setField(id, value)
    if (id === 'authPhone') validatePhone(value)
    else if (id === 'storefrontOtpInput') {
      // A complete code is checked straight away, so autofill needs no tap.
      if (value.length === 6) verifyOtp(value)
      else clearField(id)
    }
    else if (id === 'regName') validateName(value)
    // Any other answer: a problem shown on submit goes once it is changed.
    else if (id.startsWith('reg')) clearField(id)
  }

  const inputProps = (id, { className = 'auth-input', describedBy, digits } = {}) => ({
    id,
    className: [className, status[id] === 'invalid' && 'sb-input-invalid', status[id] === 'valid' && 'sb-input-valid'].filter(Boolean).join(' '),
    value: fields[id] ?? '',
    onChange: onInput(id, digits),
    'aria-invalid': status[id] === 'invalid' ? 'true' : undefined,
    'aria-describedby': [describedBy, hints[id] && `${id}Hint`].filter(Boolean).join(' ') || undefined,
  })

  const otpProps = id => {
    const caretToEnd = event => {
      const input = event.currentTarget
      requestAnimationFrame(() => input.setSelectionRange(input.value.length, input.value.length))
    }
    return {
      ...inputProps(id, { className: 'auth-otp-input' }),
      onFocus: event => { setFocusedOtp(id); caretToEnd(event) },
      onBlur: () => setFocusedOtp(''),
      onClick: caretToEnd,
    }
  }

  const clearOtp = () => {
    setField('storefrontOtpInput', '')
    clearField('storefrontOtpInput')
  }

  const goToOtp = phone => {
    sentTo.current = phone
    setOtpPhone(formatMobile(phone))
    clearOtp()
    showView('otp', { focus: 'storefrontOtpInput' })
  }

  // ---- step 1: the mobile number ----
  const sendCode = async event => {
    event.preventDefault()
    const phone = fieldsRef.current.authPhone.trim()
    if (!phone) {
      setFieldError('authPhone', 'Please enter your mobile number.')
      document.getElementById('authPhone')?.focus()
      return
    }
    if (!validatePhone(phone)) {
      document.getElementById('authPhone')?.focus()
      return
    }

    // Back from the code screen with the same number: the code already sent
    // still works, so no second paid message goes out.
    if (sentTo.current === phone) {
      showView('otp', { focus: 'storefrontOtpInput' })
      return
    }

    setBusy('send')
    try {
      const { res, data } = await postJson('/api/auth/send-otp', { phone, purpose: 'auth' })
      // A code went out moments ago, or the hourly limit is reached: on to the
      // code screen, counting down the wait the server gives.
      if (res.status === 429) {
        goToOtp(phone)
        signupResend.start(data.retryAfter, { sent: false })
        showToast(data.message || 'Please wait before requesting another code.', 'warning')
        return
      }
      if (!res.ok || !data.success) {
        setFieldError('authPhone', data.message || 'Could not send the code. Please check your mobile number.')
        document.getElementById('authPhone')?.focus()
        return
      }
      goToOtp(phone)
      signupResend.start(data.resendAfter)
    } catch (err) {
      console.error('Send OTP error:', err)
      showToast('Could not reach the OTP server. Please try again.', 'error')
    } finally {
      setBusy('')
    }
  }

  // ---- step 2: the code, which is the whole of signing in ----
  // "Paste code": the code copied in WhatsApp, read from the clipboard, fills
  // the boxes and is checked at once. Browsers that cannot read the clipboard
  // (some in-app browsers) never see the button; long-press paste still works.
  const canPaste = typeof navigator !== 'undefined' && typeof navigator.clipboard?.readText === 'function'
  const pasteOtp = async () => {
    let text = ''
    try {
      text = await navigator.clipboard.readText()
    } catch {
      setFieldError('storefrontOtpInput', 'Could not read the copied code. Please type it in.')
      document.getElementById('storefrontOtpInput')?.focus()
      return
    }
    const code = otpFromText(text)
    if (!code) {
      setFieldError('storefrontOtpInput', 'No code found. Copy the code in WhatsApp, then tap again.')
      return
    }
    setField('storefrontOtpInput', code)
    clearField('storefrontOtpInput')
    verifyOtp(code)
  }

  const verifyOtp = async (codeValue = fieldsRef.current.storefrontOtpInput) => {
    const phone = sentTo.current
    if (!phone) {
      showToast('That code has expired. Please enter your mobile number again.', 'warning')
      showView('phone', { focus: 'authPhone' })
      return
    }
    // A full code arriving while one is being checked (autofill, then a tap) is not sent twice.
    if (verifying.current) return

    const otp = String(codeValue || '').replace(/\D/g, '')
    if (otp.length !== 6) {
      setFieldError('storefrontOtpInput', 'Enter the 6-digit code from WhatsApp.')
      document.getElementById('storefrontOtpInput')?.focus()
      return
    }
    clearField('storefrontOtpInput')

    verifying.current = true
    setBusy('verify')
    try {
      const data = await verifyAuthOtp(phone, otp)

      signupResend.clear()
      sentTo.current = ''
      clearOtp()

      // A number we have not seen: the code proved it, now the shop needs to
      // know who they are and where they farm before an account can exist.
      if (data.isNewUser) {
        verifiedPhone.current = phone
        // Their name from the "Stay connected" card, when it is this same number.
        const guest = readGuestContact()
        if (guest?.name && guest.phone === phone && !fieldsRef.current.regName.trim()) {
          setField('regName', guest.name)
          validateName(guest.name)
        }
        showView('details', { focus: 'regName' })
        return
      }

      setField('authPhone', '')
      clearField('authPhone')
      setView('phone')
      showToast(`Welcome back, ${data.user?.name || 'Farmer'}!`, 'success')
      await afterSignIn(data.user, { celebrate: false })
    } catch (err) {
      const answer = err?.response?.data
      const message = answer?.message || 'Could not reach the server. Please try again.'
      // A staff number is never signed in by a code: send them to the staff door
      // rather than marking their code wrong.
      if (answer?.staffAccount) {
        showToast(message, 'info', 7000)
        return
      }
      setFieldError('storefrontOtpInput', message)
      document.getElementById('storefrontOtpInput')?.focus()
    } finally {
      verifying.current = false
      setBusy('')
    }
  }

  const resendOtp = async () => {
    const phone = sentTo.current
    if (!phone) {
      showToast('That code has expired. Please enter your mobile number again.', 'warning')
      showView('phone', { focus: 'authPhone' })
      return
    }
    setBusy('resend')
    try {
      const { res, data } = await postJson('/api/auth/send-otp', { phone, purpose: 'auth' })
      if (!res.ok || !data.success) {
        showToast(data.message || 'Failed to resend the code.', 'error')
        // Asked too soon: wait out what the server says. Any other failure sent
        // nothing, so the button stays ready for a retry.
        if (res.status === 429) signupResend.start(data.retryAfter, { sent: false })
        return
      }
      showToast('A new code has been sent to your WhatsApp.', 'success')
      clearOtp()
      focusNext.current = { id: 'storefrontOtpInput' }
      signupResend.start(data.resendAfter)
    } catch (err) {
      console.error('Resend OTP error:', err)
      showToast('Could not reach the OTP server.', 'error')
    } finally {
      setBusy('')
    }
  }

  // ---- step 3: who they are and where they farm ----
  // Checks the answers against the admin's form. Returns the first input that
  // needs fixing (or null) and the cleaned answers to send.
  const checkDetails = () => {
    const f = fieldsRef.current
    const answers = Object.fromEntries(farmFields.map(field => [field.id, f[regIdFor(field.id)]]))
    const { values, errors } = validateProfileValues(profileForm, answers, { only: farmFields.map(field => field.id) })
    let firstBad = null
    farmFields.forEach(field => {
      const id = regIdFor(field.id)
      if (errors[field.id]) {
        setFieldError(id, errors[field.id])
        firstBad = firstBad || id
      } else clearField(id)
    })
    return { firstBad, values }
  }

  const submitDetails = async event => {
    event.preventDefault()
    const phone = verifiedPhone.current
    if (!phone) {
      showToast('That code has expired. Please enter your mobile number again.', 'warning')
      showView('phone', { focus: 'authPhone' })
      return
    }

    const f = fieldsRef.current
    const name = f.regName.trim()
    if (!name) {
      setFieldError('regName', 'Please enter your name.')
      document.getElementById('regName')?.focus()
      return
    }
    if (!validateName(name)) {
      document.getElementById('regName')?.focus()
      return
    }
    const details = checkDetails()
    if (details.firstBad) {
      document.getElementById(details.firstBad)?.focus()
      return
    }

    setBusy('register')
    try {
      const created = await register({ ...details.values, name, phone })

      verifiedPhone.current = ''
      setFieldsTo({ ...REGISTER_DEFAULTS, authPhone: '' })
      clearFields(['authPhone', ...Object.keys(REGISTER_DEFAULTS), ...Object.keys(f).filter(id => id.startsWith('regField-'))])
      setView('phone')

      // The full welcome, played by afterSignIn unless they are mid-checkout.
      await afterSignIn(created, { celebrate: true })
    } catch (err) {
      const answer = err?.response?.data
      // The number was taken, or the code expired while the form was open.
      if (answer?.requiresOtp || answer?.alreadyRegistered) {
        verifiedPhone.current = ''
        showToast(answer.message, 'warning', 6000)
        showView('phone', { focus: 'authPhone', select: true })
        return
      }
      // The admin changed the form meanwhile: show what needs an answer.
      const fieldErrors = answer?.fieldErrors || {}
      const firstId = Object.keys(fieldErrors)[0]
      if (firstId) {
        Object.entries(fieldErrors).forEach(([id, message]) => setFieldError(regIdFor(id), message))
        document.getElementById(regIdFor(firstId))?.focus()
        return
      }
      showToast(answer?.message || 'Could not create your account. Please try again.', 'error')
    } finally {
      setBusy('')
    }
  }

  const changeNumber = () => {
    signupResend.clear()
    sentTo.current = ''
    verifiedPhone.current = ''
    clearOtp()
    showView('phone', { focus: 'authPhone', select: true })
  }

  const acreage = Number(fields.regAcreage) || 0
  const stepAcreage = delta => {
    setField('regAcreage', stepAcres(acreage, delta))
    clearField('regAcreage')
  }

  // One question on the details form. Crop and farm size keep their own controls.
  const farmField = (field, index) => {
    const id = regIdFor(field.id)
    const hint = <FieldHint id={id} hint={hints[id]} />
    if (field.id === 'crop') {
      const pickCrop = crop => {
        setField('regCrop', toggleCrop(fieldsRef.current.regCrop, crop))
        clearField('regCrop')
      }
      return <CropPicker key={field.id} id="regCrop" title={field.title} options={cropOptionsFor(field)} value={fields.regCrop} onToggle={pickCrop} error={hints.regCrop?.kind === 'error' && hints.regCrop.message} />
    }
    if (field.id === 'acreage') {
      return (
        <div className="auth-field" key={field.id}>
          <label className="auth-label" htmlFor="regAcreage">{field.title}</label>
          <div className="auth-stepper">
            <button type="button" className="auth-stepper-btn" data-acre-step="-1" aria-controls="regAcreage" aria-disabled={acreage <= ACRE_LIMITS.min} onClick={() => { if (acreage > ACRE_LIMITS.min) stepAcreage(-1) }}>
              <i className="fa-solid fa-minus" aria-hidden="true"></i><span className="auth-sr">Fewer acres</span>
            </button>
            <div className="auth-control auth-control--suffix">
              <input type="text" inputMode="decimal" autoComplete="off" {...inputProps('regAcreage', { describedBy: 'regAcreageUnit' })} />
              <span className="auth-suffix" id="regAcreageUnit">acres</span>
            </div>
            <button type="button" className="auth-stepper-btn" data-acre-step="1" aria-controls="regAcreage" aria-disabled={acreage >= ACRE_LIMITS.max} onClick={() => { if (acreage < ACRE_LIMITS.max) stepAcreage(1) }}>
              <i className="fa-solid fa-plus" aria-hidden="true"></i><span className="auth-sr">More acres</span>
            </button>
          </div>
          {hint}
        </div>
      )
    }
    const village = field.id === 'village'
    const control = {
      ...inputProps(id, { describedBy: village ? 'regVillageHelp' : undefined, digits: field.type === 'tel' ? 10 : undefined }),
      placeholder: village ? 'e.g. Thiruvaiyaru, Thanjavur' : undefined,
    }
    const help = village && <p className="auth-help" id="regVillageHelp">Used for local weather and spraying advice.</p>
    return <ProfileFieldInput key={field.id} field={field} control={control} help={help} hint={hint} enterKeyHint={index === farmFields.length - 1 ? 'go' : 'next'} />
  }

  let labelledBy = TITLE_IDS[view]
  if (user) labelledBy = accountView === 'edit' ? 'authEditTitle' : 'authAccountTitle'
  const stepNow = { phone: 1, otp: 2, details: 3 }[view] || 1

  return (
    <Modal id="authModal" state={state} cardClassName="modal-card auth-card" cardProps={{ role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': labelledBy }}>
      <div id="authLoggedOutView" className="auth-shell" data-view={view} style={{ display: user ? 'none' : 'block' }}>
        {/* Outside the forms, so they are in the page before anything is said. */}
        <ResendAnnouncer announcement={signupResend.announcement} />
        <AuthBrand t={t} />

        {view === 'otp' && (
          <div className="auth-topbar">
            <button type="button" id="authBackBtn" className="auth-back" onClick={changeNumber}>
              <i className="fa-solid fa-arrow-left" aria-hidden="true"></i>
              <span id="authBackText">Back</span>
            </button>
          </div>
        )}

        {/* Shown when signing in is needed to continue */}
        <div id="authNoticeBanner" className="auth-notice" role="status" style={{ display: notice ? 'flex' : 'none' }}>
          <span className="auth-notice-icon" aria-hidden="true"><i className="fa-solid fa-lock"></i></span>
          <span id="authNoticeBannerText">{notice}</span>
        </div>

        <ol id="authSteps" className="auth-steps">
          {AUTH_STEPS.map((label, index) => (
            <li key={label} className={index + 1 < stepNow ? 'is-done' : undefined} aria-current={index + 1 === stepNow ? 'step' : undefined}>
              <span className="auth-steps-bar" aria-hidden="true"></span><span className="auth-steps-label">{label}</span>
            </li>
          ))}
        </ol>

        {/* STEP 1: the mobile number. The same screen signs in and signs up. */}
        <form id="storefrontLoginForm" className="auth-form" onSubmit={sendCode} noValidate hidden={view !== 'phone'}>
          <header className="auth-head">
            <h2 id="authPhoneTitle" className="auth-title" tabIndex={-1}>Welcome to Sathyam Agro Mart</h2>
            <p className="auth-sub">Enter your WhatsApp number and we will send you a 6-digit code.</p>
          </header>

          <div className="auth-field">
            <label className="auth-label" htmlFor="authPhone">Mobile number</label>
            <div className="auth-control auth-control--prefix has-voice">
              <input type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} enterKeyHint="send" placeholder="9876543210" {...inputProps('authPhone')} />
              <span className="auth-prefix" aria-hidden="true">+91</span>
              <VoiceButton htmlFor="authPhone" mode="digits" />
            </div>
            <FieldHint id="authPhone" hint={hints.authPhone} />
          </div>

          <div className="auth-actions">
            <button type="submit" className="auth-cta" id="loginSubmitBtn" disabled={busy === 'send'}>
              {busy === 'send' ? <Spinner label="Sending code..." /> : <><i className="fa-brands fa-whatsapp" aria-hidden="true"></i> Send code on WhatsApp</>}
            </button>
            <p className="auth-foot">New here? The same code creates your account.</p>
          </div>
        </form>

        {/* STEP 2: the WhatsApp code. Getting it right is the sign-in. */}
        <form id="storefrontOtpContainer" className="auth-form" onSubmit={event => { event.preventDefault(); verifyOtp() }} noValidate hidden={view !== 'otp'}>
          <header className="auth-head">
            <span className="auth-badge" aria-hidden="true"><i className="fa-brands fa-whatsapp"></i></span>
            <h2 id="authOtpTitle" className="auth-title" tabIndex={-1}>Enter your code</h2>
            <p className="auth-sub">We sent a 6-digit code on WhatsApp to</p>
          </header>

          <div className="auth-number">
            <strong id="storefrontOtpPhone" className="notranslate">{otpPhone}</strong>
            <button type="button" className="auth-link" onClick={changeNumber}>Change</button>
          </div>

          <div className="auth-field">
            <label className="auth-sr" htmlFor="storefrontOtpInput">6-digit code</label>
            <div className="auth-otp">
              <input type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="one-time-code" maxLength={6} enterKeyHint="done" {...otpProps('storefrontOtpInput')} />
              <OtpCells value={fields.storefrontOtpInput} focused={focusedOtp === 'storefrontOtpInput'} />
            </div>
            <FieldHint id="storefrontOtpInput" hint={hints.storefrontOtpInput} />
            {canPaste && (
              <div className="auth-paste">
                <button type="button" id="storefrontOtpPasteBtn" className="auth-paste-btn" onClick={pasteOtp} disabled={busy === 'verify'} aria-describedby="storefrontOtpPasteNote">
                  <i className="fa-regular fa-paste" aria-hidden="true"></i> Paste code
                </button>
                <small id="storefrontOtpPasteNote" className="auth-paste-note">Copied it in WhatsApp? Tap to fill it in.</small>
              </div>
            )}
          </div>

          <ResendRow textId="storefrontOtpTimer" buttonId="storefrontOtpResendBtn" left={signupResend.secondsLeft} sending={busy === 'resend'} sendingLabel="Sending..." onResend={resendOtp} />

          <div className="auth-actions">
            <button type="submit" className="auth-cta" id="storefrontOtpVerifyBtn" disabled={busy === 'verify'}>
              {busy === 'verify' ? <Spinner label="Signing you in..." /> : <><i className="fa-solid fa-circle-check" aria-hidden="true"></i> Verify &amp; continue</>}
            </button>
          </div>
        </form>

        {/* STEP 3: who they are and where they farm. Only a number that has
            just answered its code reaches this, and the account is made here. */}
        <form id="storefrontRegisterForm" className="auth-form" onSubmit={submitDetails} noValidate hidden={view !== 'details'}>
          <header className="auth-head">
            <h2 id="authDetailsTitle" className="auth-title" tabIndex={-1}>Almost there</h2>
            <p className="auth-sub">Tell us who you are and where you farm, so we can deliver to the right place and send advice for your crops.</p>
          </header>

          {/* The number is proved; it is shown, never asked again. */}
          <div className="auth-number auth-number--done">
            <span className="auth-number-check" aria-hidden="true"><i className="fa-solid fa-circle-check"></i></span>
            <strong className="notranslate">{otpPhone}</strong>
            <button type="button" className="auth-link" onClick={changeNumber}>Change</button>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="regName">{titleOf('name') || 'Your name'}</label>
            <div className="auth-control has-voice">
              <input type="text" autoComplete="name" autoCapitalize="words" enterKeyHint={farmFields.length ? 'next' : 'go'} placeholder="e.g. Murugan Selvam" {...inputProps('regName')} />
              <i className="fa-solid fa-user auth-control-icon" aria-hidden="true"></i>
              <VoiceButton htmlFor="regName" />
            </div>
            <FieldHint id="regName" hint={hints.regName} />
          </div>

          {farmFields.map(farmField)}

          <div className="auth-actions">
            <button type="submit" className="auth-cta" id="regSubmitBtn" disabled={busy === 'register'}>
              {busy === 'register' ? <Spinner label="Creating your account..." /> : <><i className="fa-solid fa-circle-check" aria-hidden="true"></i> Create my account</>}
            </button>
          </div>
        </form>
      </div>

      {/* SIGNED IN: the profile card */}
      {user && <AccountCard t={t} user={user} view={accountView} onView={setAccountView} profileForm={profileForm} />}
    </Modal>
  )
})
