import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { toast } from 'sonner'
import PasswordChecklist from '../components/PasswordChecklist'
import { isPasswordValid, passwordPlaceholder } from '../utils/passwordRules'

export default function Register() {
  const navigate = useNavigate()
  const { register, sendRegistrationOtp, verifyRegistrationOtp } = useAuth()
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState('form') // 'form' | 'otp'
  const [otp, setOtp] = useState('')
  const [resendSeconds, setResendSeconds] = useState(30)
  const timerRef = useRef(null)
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '',
    crop: 'Paddy / Rice', acreage: 3, village: '', district: '', state: 'Tamil Nadu'
  })

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

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
    return form.name.replace(/[^A-Za-zÀ-ɏ]/g, '').length < 2 ? 'Please enter your name, not a number.' : ''
  }

  const FieldError = ({ message }) => message
    ? <small style={{ display: 'block', marginTop: 4, color: '#dc2626', fontSize: '0.76rem', fontWeight: 600 }}>{message}</small>
    : null

  useEffect(() => {
    return () => clearInterval(timerRef.current)
  }, [])

  // The wait comes from the server and varies per request.
  const startResendTimer = (seconds) => {
    clearInterval(timerRef.current)
    setResendSeconds(Number(seconds) > 0 ? Math.ceil(Number(seconds)) : 30)
    timerRef.current = setInterval(() => {
      setResendSeconds(s => {
        if (s <= 1) {
          clearInterval(timerRef.current)
          return 0
        }
        return s - 1
      })
    }, 1000)
  }

  const handleSendOtp = async (e) => {
    e.preventDefault()
    if (!isPasswordValid(form.password, { phone: form.phone.trim() })) { toast.error('Your password does not meet all the rules listed under it'); return }
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return }
    if (!/^\d{10}$/.test(form.phone.trim())) { toast.error('Enter a valid 10-digit WhatsApp number'); return }

    setLoading(true)
    try {
      const data = await sendRegistrationOtp(form.name, form.phone.trim())
      toast.success('OTP sent to your WhatsApp number')
      setStage('otp')
      startResendTimer(data?.resendAfter)
    } catch (err) {
      // Already has an account — send them to sign in with the number carried over.
      if (err?.response?.data?.alreadyRegistered) {
        toast.info('This number is already registered. Please sign in.')
        navigate('/#login')
        return
      }
      toast.error(err?.response?.data?.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendSeconds > 0) return
    setLoading(true)
    try {
      const data = await sendRegistrationOtp(form.name, form.phone.trim())
      toast.success('New OTP sent')
      startResendTimer(data?.resendAfter)
    } catch (err) {
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
      await register({ ...form, role: 'farmer' })
      toast.success('Registration successful! Welcome to Sathya Bio 🌿')
      navigate('/', { replace: true })
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const changeNumber = () => {
    clearInterval(timerRef.current)
    setOtp('')
    setStage('form')
  }

  return (
    <div className="login-page" style={{ justifyContent: 'center', alignItems: 'flex-start', padding: '40px 20px', minHeight: '100vh' }}>
      <div className="login-card animate-slide-up" style={{ maxWidth: '560px' }}>
        <div className="login-logo">
          <div className="login-logo-icon">🌱</div>
          <div className="login-logo-text">
            <div className="brand">Join Sathya Bio</div>
            <div className="tagline">Farmer Self-Registration</div>
          </div>
        </div>

        {stage === 'form' ? (
          <>
            <h2 className="login-title">Create your account</h2>
            <p className="login-subtitle">Register to access our product store, crop advisory, and order tracking</p>

            <form onSubmit={handleSendOtp}>
              <div className="form-grid-2col">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
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

              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input className="form-input" type="email" placeholder="your@email.com" value={form.email} onChange={set('email')} required />
              </div>

              <div className="form-grid-2col">
                <div className="form-group">
                  <label className="form-label">Village / Town</label>
                  <input className="form-input" placeholder="Village name" value={form.village} onChange={set('village')} />
                </div>
                <div className="form-group">
                  <label className="form-label">District</label>
                  <input className="form-input" placeholder="District" value={form.district} onChange={set('district')} />
                </div>
              </div>

              <div className="form-grid-2col">
                <div className="form-group">
                  <label className="form-label">Primary Crop *</label>
                  <select className="form-select" value={form.crop} onChange={set('crop')}>
                    {['Paddy / Rice', 'Cotton', 'Tomato', 'Wheat', 'Sugarcane', 'Corn / Maize', 'Citrus / Fruits', 'Grapes / Fruits', 'Potato', 'All Crops'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Farm Size (Acres)</label>
                  <input className="form-input" type="number" placeholder="e.g. 5" value={form.acreage} onChange={set('acreage')} min="0.5" step="0.5" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">State</label>
                <select className="form-select" value={form.state} onChange={set('state')}>
                  {['Tamil Nadu','Karnataka','Andhra Pradesh','Telangana','Kerala','Maharashtra','Gujarat','Punjab','Haryana','Rajasthan','Uttar Pradesh','Madhya Pradesh','Bihar','West Bengal','Odisha'].map(s => <option key={s}>{s}</option>)}
                </select>
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
                disabled={resendSeconds > 0 || loading}
                onClick={handleResendOtp}
                style={{ marginTop: '10px' }}
              >
                {resendSeconds > 0 ? `Resend OTP in ${String(Math.floor(resendSeconds / 60)).padStart(2, '0')}:${String(resendSeconds % 60).padStart(2, '0')}` : '🔄 Resend OTP'}
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
