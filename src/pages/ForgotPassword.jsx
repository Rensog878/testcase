import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'sonner'
import PasswordError, { passwordBoxStyle, passwordErrorFrom } from '../components/PasswordError'
import { ArrowLeft, Eye, EyeOff, KeyRound } from 'lucide-react'
import { ROLE_HOME } from '../context/AuthContext'
import { passwordChecks, isPasswordValid } from '../utils/passwordRules'
import { ResendAnnouncer, resendLabel, useResendCountdown } from '../shared/useResendCountdown'

// Two steps: request a WhatsApp code for the registered number, then enter the
// code with a new password. The server signs the user in (and signs every
// other device out) when the reset succeeds.
export default function ForgotPassword() {
  const location = useLocation()
  const [step, setStep] = useState('phone')
  const [phone, setPhone] = useState(() => location.state?.phone || '')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  // Shown under the new-password and confirm boxes rather than as pop-ups.
  const [passwordError, setPasswordError] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const resend = useResendCountdown()

  const sendCode = async () => {
    if (!/^[6-9]\d{9}$/.test(phone)) {
      toast.error('Enter your 10-digit registered mobile number.')
      return
    }
    setLoading(true)
    try {
      const { data } = await axios.post('/api/auth/forgot-password/send-otp', { phone })
      toast.success(data.message, { duration: 6000 })
      setStep('reset')
      resend.start(data.resendAfter)
    } catch (err) {
      const data = err.response?.data || {}
      // A code was sent moments ago: go straight to entering it.
      if (err.response?.status === 429) {
        setStep('reset')
        resend.start(data.retryAfter, { sent: false })
      }
      toast.error(data.message || 'Could not send the reset code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async () => {
    if (!/^\d{6}$/.test(otp)) { toast.error('Enter the 6-digit code from WhatsApp.'); return }
    if (!isPasswordValid(password, { phone })) {
      setPasswordError(password ? 'Your new password does not meet all the rules.' : 'Please enter a new password.')
      document.getElementById('fp-pass')?.focus()
      return
    }
    if (password !== confirm) {
      setConfirmError(confirm ? 'Passwords do not match.' : 'Please type the new password again.')
      document.getElementById('fp-confirm')?.focus()
      return
    }
    setLoading(true)
    try {
      const { data } = await axios.post('/api/auth/forgot-password/reset', { phone, otp, password })
      localStorage.setItem('sathya_token', data.token)
      localStorage.setItem('sathya_user', JSON.stringify(data.user))
      toast.success(data.message)
      // A full load lets the auth provider pick up the new session.
      window.location.assign(ROLE_HOME[data.user?.role] || '/')
    } catch (err) {
      const onPassword = passwordErrorFrom(err)
      if (onPassword) { setPasswordError(onPassword); document.getElementById('fp-pass')?.focus(); return }
      toast.error(err.response?.data?.message || 'Could not reset your password. Please try again.')
      if (/expired|request a new code/i.test(err.response?.data?.message || '')) setOtp('')
    } finally {
      setLoading(false)
    }
  }

  const changeNumber = () => {
    setStep('phone')
    setOtp('')
    setPassword('')
    setConfirm('')
    resend.clear()
  }

  const checks = passwordChecks(password, { phone })

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-card animate-slide-up">
          <Link to={location.state?.backTo || '/#login'} className="forgot-back-link"><ArrowLeft size={16} /> Back to sign in</Link>

          <div className="forgot-hero" aria-hidden="true"><KeyRound size={26} /></div>
          <h2 className="login-title">Reset your password</h2>
          <p className="login-subtitle">
            {step === 'phone'
              ? "Enter your registered mobile number. We'll send a 6-digit code to its WhatsApp."
              : `Enter the code sent to WhatsApp on +91 ${phone}, then choose a new password.`}
          </p>

          <ResendAnnouncer announcement={resend.announcement} />

          {step === 'phone' ? (
            <form onSubmit={e => { e.preventDefault(); sendCode() }} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="fp-phone">Registered mobile number</label>
                <div className="input-group">
                  <span className="input-icon">📱</span>
                  <input
                    id="fp-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    className="form-input"
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                {loading ? <><div className="spinner" /> Sending code...</> : 'Send reset code on WhatsApp'}
              </button>
            </form>
          ) : (
            <form onSubmit={e => { e.preventDefault(); resetPassword() }} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="fp-otp">6-digit code</label>
                <input
                  id="fp-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="form-input forgot-otp-input"
                  placeholder="••••••"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
                <div className="forgot-resend-row">
                  <span>Didn't get it?</span>
                  <button type="button" className="forgot-text-btn" disabled={resend.waiting || loading} onClick={sendCode}>
                    {resendLabel(resend.secondsLeft)}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="fp-pass">New password</label>
                <div className="input-group">
                  <span className="input-icon">🔒</span>
                  <input
                    id="fp-pass"
                    type={showPass ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="form-input"
                    placeholder="8+ characters: letters & numbers"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setPasswordError('') }}
                    aria-invalid={passwordError ? 'true' : undefined}
                    aria-describedby={passwordError ? 'fp-pass-error' : undefined}
                    style={passwordBoxStyle(undefined, passwordError)}
                  />
                  <button
                    type="button"
                    className="input-icon input-icon-right"
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPass(show => !show)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <PasswordError id="fp-pass" message={passwordError} />
                {password && (
                  <ul className="forgot-rules" aria-live="polite">
                    {checks.map(check => (
                      <li key={check.label} className={check.ok ? 'ok' : ''}>{check.ok ? '✓' : '○'} {check.label}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="fp-confirm">Confirm new password</label>
                <input
                  id="fp-confirm"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="form-input"
                  placeholder="Type it again"
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); setConfirmError('') }}
                  aria-invalid={confirmError ? 'true' : undefined}
                  aria-describedby={confirmError ? 'fp-confirm-error' : undefined}
                  style={passwordBoxStyle(undefined, confirmError)}
                />
                <PasswordError id="fp-confirm" message={confirmError} />
              </div>

              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                {loading ? <><div className="spinner" /> Resetting...</> : 'Reset password & sign in'}
              </button>
              <button type="button" className="forgot-text-btn forgot-change" onClick={changeNumber}>
                Use a different number
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
