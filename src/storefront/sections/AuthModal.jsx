import { memo, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { passwordChecks } from '../../utils/passwordRules'
import { useStore } from '../StoreContext'
import { showToast } from '../toast'
import Modal from './Modal'

// One sheet with four views: login, register (step 1 details, step 2 farm),
// otp (step 3, the WhatsApp code) and forgot (password reset). Signed-in
// visitors see their account instead. Fields are checked as they are typed and
// each problem shows under its field.

const ACRE_LIMITS = { min: 1, max: 9999 }
const CROP_OPTIONS = [
  ['Paddy / Rice', 'Paddy / Rice'],
  ['Cotton', 'Cotton'],
  ['Tomato', 'Tomato'],
  ['Wheat', 'Wheat'],
  ['Sugarcane', 'Sugarcane'],
  ['Corn / Maize', 'Corn / Maize'],
  ['Grapes', 'Grapes / Fruits'],
  ['All Crops', 'All Crops'],
]
const REGISTER_DEFAULTS = { regName: '', regPhone: '', regPassword: '', regCrop: 'Paddy / Rice', regAcreage: '3', regVillage: '', storefrontOtpInput: '' }
const FORGOT_DEFAULTS = { forgotPhone: '', forgotOtp: '', forgotNewPassword: '', forgotConfirmPassword: '' }
const INITIAL_FIELDS = { loginIdentifier: '', loginPassword: '', ...REGISTER_DEFAULTS, ...FORGOT_DEFAULTS }
// Fields that keep only digits, with their length.
const DIGITS_ONLY = { regPhone: 10, storefrontOtpInput: 6, regAcreage: 4, forgotPhone: 10, forgotOtp: 6 }
const TITLE_IDS = { login: 'authLoginTitle', otp: 'authOtpTitle', forgot: 'authForgotTitle' }

const titleIdFor = (view, step) => (view === 'register' ? (step === 1 ? 'authRegisterTitle' : 'authFarmTitle') : TITLE_IDS[view])

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

// A resend countdown: null before any code is sent, then the seconds left
// (0 = the code can be sent again).
function useCountdown() {
  const [left, setLeft] = useState(null)
  const timer = useRef(null)
  const stop = () => clearInterval(timer.current)
  const start = seconds => {
    stop()
    let remaining = Math.max(0, Math.ceil(Number(seconds) || 0))
    setLeft(remaining)
    if (!remaining) return
    timer.current = setInterval(() => {
      remaining -= 1
      setLeft(remaining)
      if (remaining <= 0) stop()
    }, 1000)
  }
  useEffect(() => stop, [])
  return [left, start, stop]
}

const Spinner = ({ label }) => <><i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> {label}</>

function FieldHint({ id, hint }) {
  if (!hint) return null
  return <small id={`${id}Hint`} className={hint.kind === 'error' ? 'sb-field-error' : 'sb-field-ok'}>{hint.message}</small>
}

// The password rules under the field, each ticked off as it is met. The tick
// or ring is drawn by CSS; "Done" / "Not yet" are read out by screen readers.
function PasswordRules({ checks }) {
  if (!checks) return null
  return (
    <ul className="sb-password-rules" aria-live="polite">
      {checks.map(check => (
        <li key={check.label} className={check.ok ? 'ok' : undefined}>
          <span className="auth-sr">{check.ok ? 'Done: ' : 'Not yet: '}</span>{check.label}
        </li>
      ))}
    </ul>
  )
}

// Pressing the button keeps focus in the field, so the phone keyboard stays open.
function PasswordToggle({ id, shown, onToggle }) {
  return (
    <button type="button" className="auth-icon-btn" data-password-toggle={id} aria-pressed={Boolean(shown)} onPointerDown={event => event.preventDefault()} onClick={onToggle}>
      <i className={`fa-solid ${shown ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true"></i><span className="auth-sr">Show password</span>
    </button>
  )
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

function ResendRow({ textId, buttonId, left, sending, sendingLabel, onResend }) {
  const waiting = left === null || left > 0
  let label = left > 0 ? `Resend in ${left}s` : 'Resend code'
  if (sending && sendingLabel) label = sendingLabel
  return (
    <p className="auth-resend">
      <span id={textId}>{waiting ? 'Code sent on WhatsApp.' : "Didn't get it?"}</span>
      <button type="button" id={buttonId} className="auth-link" onClick={onResend} disabled={sending || waiting}>{label}</button>
    </p>
  )
}

export default memo(function AuthModal({ state, user, notice, loginRequest }) {
  const { afterSignIn, signOut } = useStore()
  const { login, setSession } = useAuth()

  const [view, setView] = useState('login')
  const [registerStep, setRegisterStep] = useState(1)
  const [fields, setFields] = useState(INITIAL_FIELDS)
  const [status, setStatus] = useState({}) // field id -> 'invalid' | 'valid'
  const [hints, setHints] = useState({}) // field id -> { kind, message }
  const [rules, setRules] = useState({}) // field id -> password checks shown
  const [shown, setShown] = useState({}) // password fields shown as text
  const [focusedOtp, setFocusedOtp] = useState('')
  const [busy, setBusy] = useState('')
  const [otpPhone, setOtpPhone] = useState('')
  const [forgotStep, setForgotStep] = useState('phone')
  const [forgotPhone, setForgotPhoneState] = useState('') // the number the reset code went to
  const [signupLeft, startSignupCountdown, stopSignupCountdown] = useCountdown()
  const [forgotLeft, startForgotCountdown, stopForgotCountdown] = useCountdown()

  const fieldsRef = useRef(fields)
  const rulesRef = useRef(rules)
  rulesRef.current = rules
  const forgotPhoneRef = useRef(forgotPhone)
  const pending = useRef(null) // the sign-up waiting for its WhatsApp code
  const verifying = useRef(false)
  const focusNext = useRef(null)
  const shellKey = useRef('login:1')

  // ---- field state ----
  const setField = (id, value) => {
    fieldsRef.current = { ...fieldsRef.current, [id]: value }
    setFields(fieldsRef.current)
  }
  const setFieldsTo = values => {
    fieldsRef.current = { ...fieldsRef.current, ...values }
    setFields(fieldsRef.current)
  }
  const setForgotPhone = phone => {
    forgotPhoneRef.current = phone
    setForgotPhoneState(phone)
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
  // focusTitle moves focus to the new heading: screen readers announce the
  // new step, and the phone keyboard left open by the previous step closes.
  const showView = (nextView, { step, focus, focusTitle = false, select = false } = {}) => {
    if (step) setRegisterStep(step)
    setView(nextView)
    if (focus) focusNext.current = { id: focus, select }
    else if (focusTitle) focusNext.current = { id: titleIdFor(nextView, step ?? registerStep), preventScroll: true }
  }
  const switchAuthTab = tab => {
    if (tab === 'login') showView('login')
    // A code has already been sent: carry on where the farmer left off.
    else showView(pending.current ? 'otp' : 'register')
  }
  const goToRegisterStep = (step, focus) => showView('register', { step, focus, focusTitle: !focus })
  const authBack = () => {
    if (view === 'forgot') switchAuthTab('login')
    // The code stays valid: coming forward again with the same number does not send another.
    else if (view === 'otp') goToRegisterStep(2)
    else goToRegisterStep(1)
  }

  // Asked to show Sign In (basket, checkout or a #login link).
  useEffect(() => {
    if (loginRequest) setView('login')
  }, [loginRequest])

  useEffect(() => {
    const key = `${view}:${registerStep}`
    if (shellKey.current === key) return
    shellKey.current = key
    document.querySelector('#authModal .modal-card')?.scrollTo({ top: 0 })
  }, [view, registerStep])

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
    if (!value) { clearField('regPhone'); return false }
    // A bad first digit is wrong from the very first keystroke - say so straight away.
    if (!/^[6-9]/.test(value)) { setFieldError('regPhone', 'An Indian mobile number must start with 6, 7, 8 or 9.'); return false }
    if (value.length < 10) { setFieldError('regPhone', `Enter all 10 digits (${value.length}/10).`); return false }
    setFieldValid('regPhone', 'Looks good.')
    return true
  }

  const validateName = value => {
    const v = value.trim()
    if (!v) { clearField('regName'); return false }
    if (v.replace(/[^A-Za-zÀ-ɏ]/g, '').length < 2) { setFieldError('regName', 'Please enter your name, not a number.'); return false }
    setFieldValid('regName')
    return true
  }

  const showPasswordRules = (id, password, phone) => {
    const checks = passwordChecks(password, { phone })
    setRules(current => ({ ...current, [id]: checks }))
    return checks.every(check => check.ok)
  }

  const validatePassword = (password, phone) => {
    const ok = showPasswordRules('regPassword', password, phone)
    clearField('regPassword')
    if (ok) setStatus(current => ({ ...current, regPassword: 'valid' }))
    return ok
  }

  // Sign-in accepts a mobile number or an email, so only the shape is checked.
  const validateLoginIdentifier = value => {
    const v = value.trim()
    if (!v) { clearField('loginIdentifier'); return }
    const isPhone = /^\d+$/.test(v)
    if (isPhone && v.length !== 10) setFieldError('loginIdentifier', `Mobile number needs 10 digits (${v.length}/10).`)
    else if (isPhone && !/^[6-9]/.test(v)) setFieldError('loginIdentifier', 'Number must start with 6, 7, 8 or 9.')
    else if (!isPhone && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) setFieldError('loginIdentifier', 'Enter a valid mobile number or email address.')
    else setFieldValid('loginIdentifier')
  }

  // Live checklist under the new password (farmer rules; the server applies
  // the stricter staff rules and explains them if they are not met).
  const validateResetPassword = password => {
    const ok = showPasswordRules('forgotNewPassword', password, forgotPhoneRef.current)
    setStatus(current => {
      if (ok) return { ...current, forgotNewPassword: 'valid' }
      return current.forgotNewPassword === 'valid' ? without(current, ['forgotNewPassword']) : current
    })
    return ok
  }

  // Clears "Passwords do not match" as soon as the two fields agree.
  const syncResetConfirm = (password, confirm) => {
    if (confirm && confirm === password) clearField('forgotConfirmPassword')
  }

  const onInput = id => event => {
    let value = event.target.value
    if (DIGITS_ONLY[id]) value = value.replace(/\D/g, '').slice(0, DIGITS_ONLY[id])
    setField(id, value)
    const f = fieldsRef.current
    switch (id) {
      case 'regPhone':
        validatePhone(value)
        // "Not your mobile number" depends on the number, so refresh the rules.
        if (rulesRef.current.regPassword) validatePassword(f.regPassword, value)
        break
      case 'regPassword':
        validatePassword(value, f.regPhone)
        break
      case 'regName':
        validateName(value)
        break
      case 'loginIdentifier':
        validateLoginIdentifier(value)
        break
      case 'loginPassword':
        // "Enter your password." goes away as soon as something is typed.
        if (value) clearField(id)
        break
      case 'storefrontOtpInput':
        // A complete sign-up code is checked straight away.
        if (value.length === 6) verifyOtp(value)
        else clearField(id)
        break
      case 'forgotOtp':
        // A complete reset code moves on to the new password.
        if (value.length === 6 && !f.forgotNewPassword) document.getElementById('forgotNewPassword')?.focus()
        break
      case 'forgotNewPassword':
        validateResetPassword(value)
        syncResetConfirm(value, f.forgotConfirmPassword)
        break
      case 'forgotConfirmPassword':
        syncResetConfirm(f.forgotNewPassword, value)
        break
      default:
    }
  }

  const inputProps = (id, { className = 'auth-input', describedBy } = {}) => ({
    id,
    className: [className, status[id] === 'invalid' && 'sb-input-invalid', status[id] === 'valid' && 'sb-input-valid'].filter(Boolean).join(' '),
    value: fields[id],
    onChange: onInput(id),
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

  const togglePassword = id => setShown(current => ({ ...current, [id]: !current[id] }))

  // ---- sign in ----
  const submitLogin = async event => {
    event.preventDefault()
    const identifier = fieldsRef.current.loginIdentifier.trim()
    const password = fieldsRef.current.loginPassword
    let bad = null
    if (!identifier) { setFieldError('loginIdentifier', 'Enter your mobile number or email.'); bad = bad || 'loginIdentifier' }
    if (!password) { setFieldError('loginPassword', 'Enter your password.'); bad = bad || 'loginPassword' }
    if (bad) {
      document.getElementById(bad)?.focus()
      return
    }

    setBusy('login')
    try {
      const signedIn = await login(identifier, password)
      // The password does not stay in the sheet for the next person on this phone.
      setField('loginPassword', '')
      setShown(current => ({ ...current, loginPassword: false }))
      await afterSignIn(signedIn)
    } catch (err) {
      showToast(err?.message || 'Login failed. Please check your credentials.', 'error')
    } finally {
      setBusy('')
    }
  }

  // ---- new farmer: step 1 details, step 2 farm (sends the code) ----
  // Checks the step 1 fields and shows each problem under its field. Returns
  // the first field that needs fixing, or null when all three are fine.
  const firstInvalidAccountField = () => {
    const f = fieldsRef.current
    let firstBad = null
    if (!f.regName.trim()) { setFieldError('regName', 'Please enter your name.'); firstBad = firstBad || 'regName' }
    else if (!validateName(f.regName)) firstBad = firstBad || 'regName'

    if (!f.regPhone.trim()) { setFieldError('regPhone', 'Mobile number is required.'); firstBad = firstBad || 'regPhone' }
    else if (!validatePhone(f.regPhone)) firstBad = firstBad || 'regPhone'

    if (!f.regPassword) { setFieldError('regPassword', 'Please create a password.'); firstBad = firstBad || 'regPassword' }
    else if (!validatePassword(f.regPassword, f.regPhone)) {
      setFieldError('regPassword', 'Your password does not meet all the rules above.')
      firstBad = firstBad || 'regPassword'
    }
    return firstBad
  }

  const startSignupTimer = seconds => {
    // The wait is decided by the server; 30s only if it didn't say.
    const said = seconds !== undefined && seconds !== null && Number.isFinite(Number(seconds))
    startSignupCountdown(said ? Number(seconds) : 30)
  }

  const clearOtp = id => {
    setField(id, '')
    clearField(id)
  }

  const showOtpForm = (phone, resendAfter) => {
    setOtpPhone(formatMobile(phone))
    clearOtp('storefrontOtpInput')
    showView('otp', { focus: 'storefrontOtpInput' })
    startSignupTimer(resendAfter)
  }

  // Empties the sign-up form once the account exists, so the next person on
  // this phone does not find the details - or the password - filled in.
  const resetRegisterForm = () => {
    setFieldsTo(REGISTER_DEFAULTS)
    clearFields(Object.keys(REGISTER_DEFAULTS))
    setRules(current => without(current, ['regPassword']))
    setShown(current => ({ ...current, regPassword: false }))
    setRegisterStep(1)
  }

  // Step 1 only moves on to step 2; step 2 sends the WhatsApp code.
  const submitRegister = async event => {
    event.preventDefault()
    const invalid = firstInvalidAccountField()
    if (invalid) {
      goToRegisterStep(1, invalid)
      return
    }
    if (registerStep === 1) {
      goToRegisterStep(2)
      return
    }

    const f = fieldsRef.current
    const name = f.regName.trim()
    const phone = f.regPhone.trim()
    const details = {
      name,
      phone,
      password: f.regPassword,
      crop: f.regCrop,
      acreage: Number(f.regAcreage) || 1,
      village: f.regVillage.trim() || 'Coimbatore',
    }

    // Back from the code screen with the same number: the code already sent
    // still works, so no second message.
    if (pending.current?.phone === phone) {
      pending.current = details
      showView('otp', { focus: 'storefrontOtpInput' })
      return
    }

    setBusy('register')
    try {
      const { res, data } = await postJson('/api/auth/send-otp', { name, phone })
      if (!res.ok || !data.success) {
        // The number already has an account: straight to Sign In with the
        // number filled in, rather than leaving them stuck on an error.
        if (data.alreadyRegistered) {
          setRegisterStep(1)
          setFieldsTo({ loginIdentifier: phone, loginPassword: '' })
          showView('login', { step: 1, focus: 'loginPassword' })
          showToast('This number is already registered. Please sign in with your password.', 'info', 6000)
          return
        }
        showToast(data.message || 'Failed to send OTP. Please check your mobile number.', 'error')
        return
      }
      pending.current = details
      showOtpForm(phone, data.resendAfter)
    } catch (err) {
      console.error('Send OTP error:', err)
      showToast('Could not reach the OTP server. Please try again.', 'error')
    } finally {
      setBusy('')
    }
  }

  // ---- new farmer step 3: verify the code and create the account ----
  const verifyOtp = async (codeValue = fieldsRef.current.storefrontOtpInput) => {
    if (!pending.current) {
      showToast('Registration session expired. Please register again.', 'warning')
      return
    }
    // A full code arriving while one is being checked (autofill, then a tap) is not sent twice.
    if (verifying.current) return

    const otp = String(codeValue || '').replace(/\D/g, '')
    const details = pending.current
    if (otp.length !== 6) {
      setFieldError('storefrontOtpInput', 'Enter the 6-digit code from WhatsApp.')
      document.getElementById('storefrontOtpInput')?.focus()
      return
    }
    clearField('storefrontOtpInput')

    verifying.current = true
    setBusy('verify')
    try {
      const verified = await postJson('/api/auth/verify-otp', { phone: details.phone, otp })
      if (!verified.res.ok || !verified.data.success) {
        setFieldError('storefrontOtpInput', verified.data.message || 'That code did not work. Check WhatsApp and try again.')
        document.getElementById('storefrontOtpInput')?.focus()
        return
      }

      const registered = await postJson('/api/auth/register', {
        name: details.name,
        phone: details.phone,
        password: details.password,
        crop: details.crop,
        acreage: details.acreage,
        village: details.village,
        role: 'farmer',
      })
      if (!registered.res.ok || !registered.data.success) {
        showToast(registered.data.message || 'Registration failed after OTP verification.', 'error')
        return
      }

      stopSignupCountdown()
      pending.current = null
      resetRegisterForm()
      // The farmer signs in with the new password; there is no automatic sign-in.
      setField('loginIdentifier', details.phone)
      showView('login', { focus: 'loginPassword' })
      showToast('Registration successful! Please sign in with your mobile number and password.', 'success', 6000)
    } catch (err) {
      console.error('OTP verification error:', err)
      showToast('Could not reach the server. Please try again.', 'error')
    } finally {
      verifying.current = false
      setBusy('')
    }
  }

  const resendOtp = async () => {
    if (!pending.current) {
      showToast('Registration session expired. Please register again.', 'warning')
      return
    }
    const { name, phone } = pending.current
    stopSignupCountdown()
    setBusy('resend')
    try {
      const { res, data } = await postJson('/api/auth/send-otp', { name, phone })
      if (!res.ok || !data.success) {
        showToast(data.message || 'Failed to resend OTP.', 'error')
        // Asked too soon: wait out what the server says; otherwise allow a retry now.
        startSignupTimer(data.retryAfter || 0)
        return
      }
      showToast('A new code has been sent to your WhatsApp.', 'success')
      clearOtp('storefrontOtpInput')
      focusNext.current = { id: 'storefrontOtpInput' }
      startSignupTimer(data.resendAfter)
    } catch (err) {
      console.error('Resend OTP error:', err)
      showToast('Could not reach the OTP server.', 'error')
      startSignupTimer(0)
    } finally {
      setBusy('')
    }
  }

  const changeNumber = () => {
    stopSignupCountdown()
    pending.current = null
    clearOtp('storefrontOtpInput')
    showView('register', { step: 1, focus: 'regPhone', select: true })
  }

  // ---- forgot password: WhatsApp code to the registered number ----
  const resetForgotForm = () => {
    setForgotPhone('')
    stopForgotCountdown()
    setFieldsTo(FORGOT_DEFAULTS)
    clearFields(Object.keys(FORGOT_DEFAULTS))
    setRules(current => without(current, ['forgotNewPassword']))
    setShown(current => ({ ...current, forgotNewPassword: false, forgotConfirmPassword: false }))
  }

  const openForgotPassword = () => {
    // Carry over a mobile number already typed into the sign-in form.
    const typed = fieldsRef.current.loginIdentifier.replace(/\D/g, '')
    if (!fieldsRef.current.forgotPhone && /^[6-9]\d{9}$/.test(typed)) setField('forgotPhone', typed)
    const codeSent = Boolean(forgotPhoneRef.current)
    setForgotStep(codeSent ? 'reset' : 'phone')
    showView('forgot', { focus: codeSent ? 'forgotOtp' : 'forgotPhone' })
  }

  const forgotChangeNumber = () => {
    resetForgotForm()
    setForgotStep('phone')
    focusNext.current = { id: 'forgotPhone' }
  }

  const sendForgotCode = async (isResend = false) => {
    const phone = isResend ? forgotPhoneRef.current : fieldsRef.current.forgotPhone.replace(/\D/g, '')
    if (!/^[6-9]\d{9}$/.test(phone)) {
      if (!isResend) {
        setFieldError('forgotPhone', 'Enter your 10-digit registered mobile number.')
        document.getElementById('forgotPhone')?.focus()
      }
      return
    }
    if (!isResend) clearField('forgotPhone')

    setBusy(isResend ? 'forgotResend' : 'forgotSend')
    try {
      const { res, data } = await postJson('/api/auth/forgot-password/send-otp', { phone })
      // A code was sent moments ago: go straight to entering it.
      if (res.status === 429 && data.retryAfter) {
        setForgotPhone(phone)
        setForgotStep('reset')
        startForgotCountdown(data.retryAfter)
        showToast(data.message, 'warning')
        return
      }
      if (!res.ok || !data.success) {
        showToast(data.message || 'Could not send the reset code. Please try again.', 'error')
        return
      }
      setForgotPhone(phone)
      setForgotStep('reset')
      startForgotCountdown(data.resendAfter || 30)
      showToast(data.message || 'Reset code sent on WhatsApp.', 'success', 6000)
      focusNext.current = { id: 'forgotOtp' }
    } catch {
      showToast('Could not reach the server. Please check your connection.', 'error')
    } finally {
      setBusy('')
    }
  }

  // Step 2: code + new password. The reset signs the user in (and signs every
  // other device out).
  const submitForgot = async event => {
    event.preventDefault()
    if (forgotStep !== 'reset') {
      sendForgotCode(false)
      return
    }

    const f = fieldsRef.current
    const otp = f.forgotOtp.replace(/\D/g, '')
    let bad = null
    if (otp.length !== 6) { setFieldError('forgotOtp', 'Enter the 6-digit code from WhatsApp.'); bad = bad || 'forgotOtp' }
    else clearField('forgotOtp')
    if (!validateResetPassword(f.forgotNewPassword)) {
      setFieldError('forgotNewPassword', 'Your new password does not meet all the rules above.')
      bad = bad || 'forgotNewPassword'
    }
    if (!f.forgotConfirmPassword || f.forgotConfirmPassword !== f.forgotNewPassword) {
      setFieldError('forgotConfirmPassword', 'Passwords do not match.')
      bad = bad || 'forgotConfirmPassword'
    } else clearField('forgotConfirmPassword')
    if (bad) {
      document.getElementById(bad)?.focus()
      return
    }

    setBusy('forgotReset')
    try {
      const { res, data } = await postJson('/api/auth/forgot-password/reset', { phone: forgotPhoneRef.current, otp, password: f.forgotNewPassword })
      if (!res.ok || !data.success) {
        showToast(data.message || 'Could not reset your password. Please try again.', 'error', 6000)
        if (/expired|request a new code/i.test(data.message || '')) clearOtp('forgotOtp')
        return
      }
      setSession(data.token, data.user)
      resetForgotForm()
      switchAuthTab('login')
      showToast(data.message || 'Your password has been reset. You are now signed in.', 'success', 5000)
      await afterSignIn(data.user)
    } catch {
      showToast('Could not reach the server. Please check your connection.', 'error')
    } finally {
      setBusy('')
    }
  }

  // ---- render ----
  const tabbed = view === 'login' || (view === 'register' && registerStep === 1)
  const titleId = titleIdFor(view, registerStep)
  const stepNow = view === 'otp' ? 3 : registerStep
  const acreage = parseInt(fields.regAcreage, 10) || 0

  const stepAcreage = delta => {
    const next = acreage + delta
    setField('regAcreage', String(Math.min(ACRE_LIMITS.max, Math.max(ACRE_LIMITS.min, next))))
  }

  const onTabKey = event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const next = document.getElementById(event.currentTarget.id === 'authTabLogin' ? 'authTabRegister' : 'authTabLogin')
    next?.click()
    next?.focus()
  }

  const role = user?.role || 'farmer'
  const crop = user ? user.crop || user.primaryCrop || 'All Crops' : ''

  return (
    <Modal id="authModal" state={state} cardClassName="modal-card auth-card" cardProps={{ role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId }}>
      <div id="authLoggedOutView" className="auth-shell" data-view={view} data-step={registerStep} style={{ display: user ? 'none' : 'block' }}>
        <div className="auth-topbar">
          <div id="authTabsBar" className="auth-tabs" role="tablist" data-active={view === 'login' ? 'login' : 'register'} hidden={!tabbed}>
            <button type="button" id="authTabLogin" className="auth-tab" role="tab" aria-selected={view === 'login'} aria-controls="storefrontLoginForm" tabIndex={view === 'login' ? 0 : -1} onClick={() => switchAuthTab('login')} onKeyDown={onTabKey}>Sign In</button>
            <button type="button" id="authTabRegister" className="auth-tab" role="tab" aria-selected={view !== 'login'} aria-controls="storefrontRegisterForm" tabIndex={view !== 'login' ? 0 : -1} onClick={() => switchAuthTab('register')} onKeyDown={onTabKey}>New Farmer</button>
          </div>
          <button type="button" id="authBackBtn" className="auth-back" onClick={authBack} hidden={tabbed}>
            <i className="fa-solid fa-arrow-left" aria-hidden="true"></i>
            <span id="authBackText">{view === 'forgot' ? 'Back to sign in' : 'Back'}</span>
          </button>
        </div>

        {/* Shown when signing in is needed to continue */}
        <div id="authNoticeBanner" className="auth-notice" role="status" style={{ display: notice ? 'flex' : 'none' }}>
          <span className="auth-notice-icon" aria-hidden="true"><i className="fa-solid fa-lock"></i></span>
          <span id="authNoticeBannerText">{notice}</span>
        </div>

        <ol id="authSteps" className="auth-steps" hidden={view !== 'register' && view !== 'otp'}>
          {['Details', 'Farm', 'Verify'].map((label, index) => (
            <li key={label} className={index + 1 < stepNow ? 'is-done' : undefined} aria-current={index + 1 === stepNow ? 'step' : undefined}>
              <span className="auth-steps-bar" aria-hidden="true"></span><span className="auth-steps-label">{label}</span>
            </li>
          ))}
        </ol>

        {/* SIGN IN */}
        <form id="storefrontLoginForm" className="auth-form" role="tabpanel" aria-labelledby="authTabLogin" onSubmit={submitLogin} noValidate hidden={view !== 'login'}>
          <header className="auth-head">
            <h2 id="authLoginTitle" className="auth-title" tabIndex={-1}>Welcome to Sathya Bio</h2>
            <p className="auth-sub">Sign in to access personalized crop protection &amp; exclusive farm deals.</p>
          </header>

          <div className="auth-field">
            <label className="auth-label" htmlFor="loginIdentifier">Mobile number or email</label>
            <div className="auth-control">
              <input type="text" autoComplete="username" autoCapitalize="none" spellCheck="false" enterKeyHint="next" placeholder="e.g. 9876543210" {...inputProps('loginIdentifier')} />
              <i className="fa-solid fa-mobile-screen-button auth-control-icon" aria-hidden="true"></i>
            </div>
            <FieldHint id="loginIdentifier" hint={hints.loginIdentifier} />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="loginPassword">Password</label>
            <div className="auth-control auth-control--action">
              <input type={shown.loginPassword ? 'text' : 'password'} autoComplete="current-password" enterKeyHint="go" {...inputProps('loginPassword')} />
              <i className="fa-solid fa-lock auth-control-icon" aria-hidden="true"></i>
              <PasswordToggle id="loginPassword" shown={shown.loginPassword} onToggle={() => togglePassword('loginPassword')} />
            </div>
            <FieldHint id="loginPassword" hint={hints.loginPassword} />
          </div>
          <div className="auth-forgot-row">
            <button type="button" className="auth-link" id="forgotPasswordLink" onClick={openForgotPassword}>Forgot password?</button>
          </div>

          <div className="auth-actions">
            <button type="submit" className="auth-cta" id="loginSubmitBtn" disabled={busy === 'login'}>
              {busy === 'login' ? <Spinner label="Signing in..." /> : <>Sign In <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></>}
            </button>
          </div>
        </form>

        {/* NEW FARMER: step 1 details, step 2 farm. Step 3 is the code form below. */}
        <form id="storefrontRegisterForm" className="auth-form" role="tabpanel" aria-labelledby="authTabRegister" onSubmit={submitRegister} noValidate hidden={view !== 'register'}>
          <div className="auth-step" id="regStepAccount" hidden={registerStep !== 1}>
            <header className="auth-head">
              <h2 id="authRegisterTitle" className="auth-title" tabIndex={-1}>Create your farmer account</h2>
              <p className="auth-sub">Join 15,000+ farmers for customized pesticides &amp; advisories.</p>
            </header>

            <div className="auth-field">
              <label className="auth-label" htmlFor="regName">Full name</label>
              <div className="auth-control">
                <input type="text" autoComplete="name" autoCapitalize="words" enterKeyHint="next" placeholder="e.g. Murugan Selvam" {...inputProps('regName')} />
                <i className="fa-solid fa-user auth-control-icon" aria-hidden="true"></i>
              </div>
              <FieldHint id="regName" hint={hints.regName} />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="regPhone">Mobile number</label>
              <div className="auth-control auth-control--prefix">
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  autoComplete="tel-national"
                  enterKeyHint="next"
                  placeholder="9876543210"
                  {...inputProps('regPhone', { describedBy: 'regPhoneHelp' })}
                  onBlur={() => { if (!fieldsRef.current.regPhone) setFieldError('regPhone', 'Mobile number is required.') }}
                />
                <span className="auth-prefix" aria-hidden="true">+91</span>
              </div>
              <p className="auth-help" id="regPhoneHelp">We'll send a code on WhatsApp to verify it.</p>
              <FieldHint id="regPhone" hint={hints.regPhone} />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="regPassword">Create a password</label>
              <div className="auth-control auth-control--action">
                <input
                  type={shown.regPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  enterKeyHint="next"
                  {...inputProps('regPassword')}
                  onFocus={() => showPasswordRules('regPassword', fieldsRef.current.regPassword, fieldsRef.current.regPhone)}
                />
                <i className="fa-solid fa-lock auth-control-icon" aria-hidden="true"></i>
                <PasswordToggle id="regPassword" shown={shown.regPassword} onToggle={() => togglePassword('regPassword')} />
              </div>
              <PasswordRules checks={rules.regPassword} />
              <FieldHint id="regPassword" hint={hints.regPassword} />
            </div>

            <div className="auth-actions">
              <button type="submit" className="auth-cta" id="regContinueBtn">Continue <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></button>
            </div>
          </div>

          <div className="auth-step" id="regStepFarm" hidden={registerStep !== 2}>
            <header className="auth-head">
              <h2 id="authFarmTitle" className="auth-title" tabIndex={-1}>About your farm</h2>
              <p className="auth-sub">We show products and advice for these crops first.</p>
            </header>

            <div className="auth-field">
              <label className="auth-label" htmlFor="regCrop">Main crop</label>
              <div className="auth-control auth-control--select">
                <select id="regCrop" className="auth-input" value={fields.regCrop} onChange={event => setField('regCrop', event.target.value)}>
                  {CROP_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <i className="fa-solid fa-seedling auth-control-icon" aria-hidden="true"></i>
                <i className="fa-solid fa-chevron-down auth-select-chevron" aria-hidden="true"></i>
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="regAcreage">Farm size</label>
              <div className="auth-stepper">
                <button type="button" className="auth-stepper-btn" data-acre-step="-1" aria-controls="regAcreage" aria-disabled={acreage <= ACRE_LIMITS.min} onClick={() => { if (acreage > ACRE_LIMITS.min) stepAcreage(-1) }}>
                  <i className="fa-solid fa-minus" aria-hidden="true"></i><span className="auth-sr">Fewer acres</span>
                </button>
                <div className="auth-control auth-control--suffix">
                  <input type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" aria-describedby="regAcreageUnit" {...inputProps('regAcreage')} />
                  <span className="auth-suffix" id="regAcreageUnit">acres</span>
                </div>
                <button type="button" className="auth-stepper-btn" data-acre-step="1" aria-controls="regAcreage" aria-disabled={acreage >= ACRE_LIMITS.max} onClick={() => { if (acreage < ACRE_LIMITS.max) stepAcreage(1) }}>
                  <i className="fa-solid fa-plus" aria-hidden="true"></i><span className="auth-sr">More acres</span>
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="regVillage">Village or town <span className="auth-optional">Optional</span></label>
              <div className="auth-control">
                <input type="text" autoComplete="address-level2" enterKeyHint="send" placeholder="e.g. Thiruvaiyaru, Thanjavur" {...inputProps('regVillage', { describedBy: 'regVillageHelp' })} />
                <i className="fa-solid fa-location-dot auth-control-icon" aria-hidden="true"></i>
              </div>
              <p className="auth-help" id="regVillageHelp">Used for local weather and spraying advice.</p>
            </div>

            <div className="auth-actions">
              <button type="submit" className="auth-cta" id="regSubmitBtn" disabled={busy === 'register'}>
                {busy === 'register' ? <Spinner label="Sending code..." /> : <><i className="fa-brands fa-whatsapp" aria-hidden="true"></i> Send code on WhatsApp</>}
              </button>
            </div>
          </div>
        </form>

        {/* NEW FARMER step 3: the WhatsApp code */}
        <form id="storefrontOtpContainer" className="auth-form" onSubmit={event => { event.preventDefault(); verifyOtp() }} noValidate hidden={view !== 'otp'}>
          <header className="auth-head">
            <span className="auth-badge" aria-hidden="true"><i className="fa-brands fa-whatsapp"></i></span>
            <h2 id="authOtpTitle" className="auth-title" tabIndex={-1}>Verify your number</h2>
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
          </div>

          <ResendRow textId="storefrontOtpTimer" buttonId="storefrontOtpResendBtn" left={signupLeft} sending={busy === 'resend'} sendingLabel="Sending..." onResend={resendOtp} />

          <div className="auth-actions">
            <button type="submit" className="auth-cta" id="storefrontOtpVerifyBtn" disabled={busy === 'verify'}>
              {busy === 'verify' ? <Spinner label="Verifying..." /> : <><i className="fa-solid fa-circle-check" aria-hidden="true"></i> Verify &amp; create account</>}
            </button>
          </div>
        </form>

        {/* FORGOT PASSWORD: mobile number, then the WhatsApp code and a new password */}
        <form id="storefrontForgotForm" className="auth-form" onSubmit={submitForgot} noValidate hidden={view !== 'forgot'}>
          <header className="auth-head">
            <span className="auth-badge" aria-hidden="true"><i className="fa-solid fa-key"></i></span>
            <h2 id="authForgotTitle" className="auth-title" tabIndex={-1}>Reset your password</h2>
            <p className="auth-sub" id="forgotIntro">
              {forgotStep === 'phone' ? "Enter your registered mobile number. We'll send a 6-digit code to its WhatsApp." : 'We sent a 6-digit code on WhatsApp to'}
            </p>
          </header>

          <div className="auth-step" id="forgotStepPhone" hidden={forgotStep !== 'phone'}>
            <div className="auth-field">
              <label className="auth-label" htmlFor="forgotPhone">Registered mobile number</label>
              <div className="auth-control auth-control--prefix">
                <input type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} enterKeyHint="send" placeholder="9876543210" {...inputProps('forgotPhone')} />
                <span className="auth-prefix" aria-hidden="true">+91</span>
              </div>
              <FieldHint id="forgotPhone" hint={hints.forgotPhone} />
            </div>
            <div className="auth-actions">
              <button type="submit" className="auth-cta" id="forgotSendBtn" disabled={busy === 'forgotSend'}>
                {busy === 'forgotSend' ? <Spinner label="Sending code..." /> : <><i className="fa-brands fa-whatsapp" aria-hidden="true"></i> Send reset code</>}
              </button>
            </div>
          </div>

          <div className="auth-step" id="forgotStepReset" hidden={forgotStep !== 'reset'}>
            <div className="auth-number">
              <strong id="forgotPhoneShown" className="notranslate">{forgotPhone ? formatMobile(forgotPhone) : ''}</strong>
              <button type="button" className="auth-link" onClick={forgotChangeNumber}>Change</button>
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="forgotOtp">6-digit code</label>
              <div className="auth-otp">
                <input type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="one-time-code" maxLength={6} enterKeyHint="next" {...otpProps('forgotOtp')} />
                <OtpCells value={fields.forgotOtp} focused={focusedOtp === 'forgotOtp'} />
              </div>
              <FieldHint id="forgotOtp" hint={hints.forgotOtp} />
            </div>
            <ResendRow textId="forgotResendText" buttonId="forgotResendBtn" left={forgotLeft} sending={busy === 'forgotResend'} onResend={() => sendForgotCode(true)} />

            <div className="auth-field">
              <label className="auth-label" htmlFor="forgotNewPassword">New password</label>
              <div className="auth-control auth-control--action">
                <input type={shown.forgotNewPassword ? 'text' : 'password'} autoComplete="new-password" enterKeyHint="next" {...inputProps('forgotNewPassword')} />
                <i className="fa-solid fa-lock auth-control-icon" aria-hidden="true"></i>
                <PasswordToggle id="forgotNewPassword" shown={shown.forgotNewPassword} onToggle={() => togglePassword('forgotNewPassword')} />
              </div>
              <PasswordRules checks={rules.forgotNewPassword} />
              <FieldHint id="forgotNewPassword" hint={hints.forgotNewPassword} />
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="forgotConfirmPassword">Confirm new password</label>
              <div className="auth-control auth-control--action">
                <input type={shown.forgotConfirmPassword ? 'text' : 'password'} autoComplete="new-password" enterKeyHint="go" placeholder="Type it again" {...inputProps('forgotConfirmPassword')} />
                <i className="fa-solid fa-lock auth-control-icon" aria-hidden="true"></i>
                <PasswordToggle id="forgotConfirmPassword" shown={shown.forgotConfirmPassword} onToggle={() => togglePassword('forgotConfirmPassword')} />
              </div>
              <FieldHint id="forgotConfirmPassword" hint={hints.forgotConfirmPassword} />
            </div>

            <div className="auth-actions">
              <button type="submit" className="auth-cta" id="forgotResetBtn" disabled={busy === 'forgotReset'}>
                {busy === 'forgotReset' ? <Spinner label="Resetting..." /> : <><i className="fa-solid fa-lock" aria-hidden="true"></i> Reset password &amp; sign in</>}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* SIGNED IN: the account */}
      {user && (
        <div id="authLoggedInView" className="auth-account" style={{ display: 'block', textAlign: 'center' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#ecfdf5', color: 'var(--primary)', fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', border: '2px solid #34d399' }}>
            <span id="loggedInUserInitial">{(user.name || 'U').charAt(0).toUpperCase()}</span>
          </div>
          <h3 id="loggedInUserName" style={{ color: 'var(--primary-dark)', marginBottom: '2px' }}>{user.name}</h3>
          <span id="loggedInUserRoleBadge" style={{ display: 'inline-block', background: '#ecfdf5', color: 'var(--primary)', padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 700, border: '1px solid #34d399', marginBottom: '14px' }}>
            {role === 'farmer' ? `🌾 ${crop} Farmer` : `🛡️ ${role.toUpperCase()} Staff`}
          </span>

          <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', textAlign: 'left', fontSize: '0.82rem', marginBottom: '16px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div><strong>Mobile:</strong> <span id="loggedInUserPhone">{user.phone || user.mobile || 'Verified Customer'}</span></div>
            <div><strong>Crop &amp; Acreage:</strong> <span id="loggedInUserCrop">{`${crop} (${user.acreage || user.landAcres || 1} Acres)`}</span></div>
            <div><strong>Location:</strong> <span id="loggedInUserLocation">{`${user.village || 'Farm'}, ${user.district || 'Tamil Nadu'}`}</span></div>
            <div><strong>Catalog Personalization:</strong> <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Active 🎯</span></div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {role === 'admin' && (
              <a id="adminPortalLink" href="/admin" className="btn btn-primary" style={{ display: 'inline-flex', justifyContent: 'center', padding: '10px', textDecoration: 'none' }}>
                <i className="fa-solid fa-gauge-high"></i> Open Admin Panel
              </a>
            )}
            <button className="btn btn-outline" onClick={signOut} style={{ justifyContent: 'center', padding: '10px', color: '#ef4444', borderColor: '#fca5a5' }}>
              <i className="fa-solid fa-right-from-bracket"></i> Sign Out
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
})
