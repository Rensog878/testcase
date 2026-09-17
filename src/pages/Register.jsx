import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { toast } from 'sonner'
import PasswordChecklist from '../components/PasswordChecklist'
import { isPasswordValid, passwordPlaceholder } from '../utils/passwordRules'
import { ResendAnnouncer, resendLabel, useResendCountdown } from '../shared/useResendCountdown'
import { CROP_CHOICES, DEFAULT_PROFILE_FIELDS, normalizeProfileFields, validateProfileValues } from '../shared/profileFieldRules'

// Name, mobile number and password are always asked; the other questions come
// from Admin → Profile Form Builder, in its order.
const ACCOUNT_FIELD_IDS = ['name', 'phone']

export default function Register() {
  const navigate = useNavigate()
  const { register, sendRegistrationOtp, verifyRegistrationOtp } = useAuth()
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState('form') // 'form' | 'otp'
  const [otp, setOtp] = useState('')
  const resend = useResendCountdown()
  const [form, setForm] = useState({ name: '', phone: '', password: '', confirmPassword: '' })
  const [profileForm, setProfileForm] = useState(() => normalizeProfileFields(DEFAULT_PROFILE_FIELDS))
  const [answers, setAnswers] = useState({ crop: 'Paddy / Rice', acreage: '3' })
  const [answerErrors, setAnswerErrors] = useState({})

  useEffect(() => {
    axios.get('/api/profile-fields')
      .then(({ data }) => { if (Array.isArray(data?.data)) setProfileForm(normalizeProfileFields(data.data)) })
      .catch(() => {})
  }, [])

  const questions = profileForm.filter(field => !ACCOUNT_FIELD_IDS.includes(field.id))
  const titleOf = id => profileForm.find(field => field.id === id)?.title

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const setAnswer = field => e => {
    const value = field.type === 'tel' ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value
    setAnswers(current => ({ ...current, [field.id]: value }))
    setAnswerErrors(current => {
      if (!current[field.id]) return current
      const next = { ...current }
      delete next[field.id]
      return next
    })
  }

  // The builder's answers, checked as the server will check them.
  const checkAnswers = () => {
    const { values, errors } = validateProfileValues(profileForm, answers, { only: questions.map(field => field.id) })
    setAnswerErrors(errors)
    return { values, firstError: Object.values(errors)[0] }
  }

  // Phone accepts digits only, filtered as the user types.
  const setPhone = e => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
    setForm(f => ({ ...f, phone: digits }))
  }

  // Live, per-field messages shown under each input.
  const phoneError = () => {
    if (!form.phone) return ''
    // Flag a bad first digit immediately, before the length check.
    if (!/^[6-9]/.test(form.phone)) return 'An Indian mobile number must start with 6, 7, 8 or 9.'
    if (form.phone.length < 10) return `Enter all 10 digits (${form.phone.length}/10).`
    return ''
  }
  const confirmError = () => {
    if (!form.confirmPassword) return ''
    return form.password !== form.confirmPassword ? 'Passwords do not match.' : ''
  }
  const nameError = () => {
    if (!form.name.trim()) return ''
    return (form.name.match(/\p{L}/gu) || []).length < 2 ? 'Please enter your name, not a number.' : ''
  }

  const FieldError = ({ message }) => message
    ? <small style={{ display: 'block', marginTop: 4, color: '#dc2626', fontSize: '0.76rem', fontWeight: 600 }}>{message}</small>
    : null

  const handleSendOtp = async (e) => {
    e.preventDefault()
    if (!isPasswordValid(form.password, { phone: form.phone.trim() })) { toast.error('Your password does not meet all the rules listed under it'); return }
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return }
    if (!/^\d{10}$/.test(form.phone.trim())) { toast.error('Enter a valid 10-digit WhatsApp number'); return }
    const { firstError } = checkAnswers()
    if (firstError) { toast.error(firstError); return }

    setLoading(true)
    try {
      const data = await sendRegistrationOtp(form.name, form.phone.trim())
      toast.success('OTP sent to your WhatsApp number')
      setStage('otp')
      resend.start(data?.resendAfter)
    } catch (err) {
      // Already has an account — send them to sign in with the number carried over.
      if (err?.response?.data?.alreadyRegistered) {
        toast.info('This number is already registered. Please sign in.')
        navigate('/#login')
        return
      }
      // A code went out moments ago, or the hourly limit is reached: on to the
      // code, counting down the wait the server gives.
      if (err?.response?.status === 429) {
        setStage('otp')
        resend.start(err.response.data?.retryAfter, { sent: false })
      }
      toast.error(err?.response?.data?.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (resend.waiting) return
    setLoading(true)
    try {
      const data = await sendRegistrationOtp(form.name, form.phone.trim())
      toast.success('New OTP sent')
      resend.start(data?.resendAfter)
    } catch (err) {
      // Asked too soon: count down what the server says is left.
      if (err?.response?.status === 429) resend.start(err.response.data?.retryAfter, { sent: false })
      toast.error(err?.response?.data?.message || 'Failed to resend OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault()
    if (!/^\d{6}$/.test(otp.trim())) { toast.error('Enter the 6-digit OTP'); return }

    setLoading(true)
    try {
      await verifyRegistrationOtp(form.phone.trim(), otp.trim())
      await register({ ...checkAnswers().values, name: form.name, phone: form.phone.trim(), password: form.password, role: 'farmer' })
      toast.success('Registration successful! Welcome to Sathyam Bio 🌿')
      navigate('/', { replace: true })
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const changeNumber = () => {
    resend.clear()
    setOtp('')
    setStage('form')
  }

  return (
    <div className="login-page" style={{ justifyContent: 'center', alignItems: 'flex-start', padding: '40px 20px', minHeight: '100vh' }}>
      <div className="login-card animate-slide-up" style={{ maxWidth: '560px' }}>
        <div className="login-logo">
          <div className="login-logo-icon">🌱</div>
          <div className="login-logo-text">
            <div className="brand">Join Sathyam Bio</div>
            <div className="tagline">Farmer Self-Registration</div>
          </div>
        </div>

        <ResendAnnouncer announcement={resend.announcement} />

        {stage === 'form' ? (
          <>
            <h2 className="login-title">Create your account</h2>
            <p className="login-subtitle">Register to access our product store, crop advisory, and order tracking</p>

            <form onSubmit={handleSendOtp}>
              <div className="form-grid-2col">
                <div className="form-group">
                  <label className="form-label">{titleOf('name')} *</label>
                  <input className="form-input" placeholder="Your name" value={form.name} onChange={set('name')} required />
                  <FieldError message={nameError()} />
                </div>
                <div className="form-group">
                  <label className="form-label">WhatsApp / Phone *</label>
                  <input
                    className="form-input"
                    placeholder="10-digit number"
                    value={form.phone}
                    onChange={setPhone}
                    required
                    maxLength={10}
                    inputMode="numeric"
                  />
                  <FieldError message={phoneError()} />
                </div>
              </div>

              <div className="form-grid-2col">
                {questions.map(field => (
                  <div className="form-group" key={field.id} style={field.type === 'textarea' ? { gridColumn: '1 / -1' } : undefined}>
                    <label className="form-label" htmlFor={`register-${field.id}`}>{field.title}{field.required ? ' *' : ''}</label>
                    <AnswerInput field={field} value={answers[field.id] ?? ''} onChange={setAnswer(field)} />
                    <FieldError message={answerErrors[field.id]} />
                  </div>
                ))}
              </div>


              <div className="form-grid-2col">
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input className="form-input" type="password" placeholder={passwordPlaceholder('farmer')} value={form.password} onChange={set('password')} required autoComplete="new-password" />
                  <PasswordChecklist password={form.password} phone={form.phone} />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm Password *</label>
                  <input className="form-input" type="password" placeholder="Repeat password" value={form.confirmPassword} onChange={set('confirmPassword')} required />
                  <FieldError message={confirmError()} />
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: '8px' }}>
                {loading ? <><div className="spinner" /> Sending OTP...</> : '🌿 Continue & Verify WhatsApp'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="login-title">Verify your WhatsApp number</h2>
            <p className="login-subtitle">We sent a 6-digit OTP to <strong>+91 {form.phone}</strong></p>

            <form onSubmit={handleVerifyAndRegister}>
              <div className="form-group">
                <label className="form-label">Enter OTP *</label>
                <input
                  className="form-input"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6-digit OTP"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  style={{ letterSpacing: '6px', textAlign: 'center', fontSize: '20px' }}
                />
              </div>

              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: '8px' }}>
                {loading ? <><div className="spinner" /> Verifying...</> : '🔐 Verify & Create Account'}
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-full"
                disabled={resend.waiting || loading}
                onClick={handleResendOtp}
                style={{ marginTop: '10px' }}
              >
                {resendLabel(resend.secondsLeft)}
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-full"
                onClick={changeNumber}
                style={{ marginTop: '10px' }}
              >
                ← Change Mobile Number
              </button>
            </form>
          </>
        )}

        <div className="divider"><span>Already registered?</span></div>
        <Link to="/#login"><button className="btn btn-secondary btn-full">← Back to Login</button></Link>
      </div>
    </div>
  )
}

// One builder question in this page's form styles.
function AnswerInput({ field, value, onChange }) {
  const common = { id: `register-${field.id}`, value, onChange, 'aria-required': field.required || undefined }
  if (field.type === 'select') {
    const choices = field.id === 'crop' ? CROP_CHOICES : field.options
    return (
      <select className="form-select" {...common}>
        {field.id !== 'crop' && <option value="">Choose...</option>}
        {choices.map(choice => <option key={choice} value={choice}>{choice}</option>)}
      </select>
    )
  }
  if (field.type === 'textarea') return <textarea className="form-input" rows={3} maxLength={500} {...common} />
  if (field.type === 'number') return <input className="form-input" inputMode={field.id === 'acreage' ? 'numeric' : 'decimal'} maxLength={12} {...common} />
  if (field.type === 'tel') return <input className="form-input" type="tel" inputMode="numeric" maxLength={10} {...common} />
  return <input className="form-input" type={field.type} maxLength={field.type === 'email' ? 120 : 80} {...common} />
}
