import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth, ROLE_HOME } from '../context/AuthContext'
import { toast } from 'sonner'
import PasswordError, { passwordBoxStyle } from '../components/PasswordError'
import { Check, Eye, EyeOff, Factory, LockKeyhole, LogIn, ReceiptText, ShieldCheck, Smartphone, Truck } from 'lucide-react'

// Staff sign-in (/login, and /admin when signed out). Farmers sign in on the
// storefront, so there is no Farmer role here.
const ROLES = [
  { key: 'superadmin', label: 'Super Admin', icon: LockKeyhole },
  { key: 'admin',    label: 'Admin',    icon: ShieldCheck },
  { key: 'employee', label: 'Employee', icon: Factory },
  { key: 'delivery', label: 'Delivery', icon: Truck },
  { key: 'billing',  label: 'Billing',  icon: ReceiptText },
]

const withArticle = label => `${/^[AEIOU]/i.test(label) ? 'an' : 'a'} ${label}`

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, logout } = useAuth()
  const [selectedRole, setSelectedRole] = useState('admin')
  const [mobile, setMobile]             = useState(() => location.state?.identifier || '')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  // Why the last sign-in failed, shown under the password box.
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    if (location.state?.message) {
      toast.error(location.state.message, { duration: 5000 })
    }
  }, [location.state])

  const roleInfo = ROLES.find(r => r.key === selectedRole)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!mobile) { toast.error('Please enter your mobile number or email'); return }
    if (!password) { setPasswordError('Please enter your password.'); document.getElementById('loginPassword')?.focus(); return }
    setPasswordError('')
    setLoading(true)
    try {
      const user = await login(mobile.trim(), password)
      // Right password, wrong role: do not leave that account signed in.
      if (user.role !== selectedRole) {
        logout(false)
        setPasswordError(`This is not ${withArticle(roleInfo?.label || selectedRole)} account.`)
        return
      }
      toast.success(`Welcome back, ${user.name}!`)
      navigate(ROLE_HOME[user.role] || '/', { replace: true })
    } catch (err) {
      setPasswordError(err?.message || err?.response?.data?.message || 'Invalid credentials')
      document.getElementById('loginPassword')?.focus()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page login-solo">
      <div className="login-solo-orb login-solo-orb-a" aria-hidden="true" />
      <div className="login-solo-orb login-solo-orb-b" aria-hidden="true" />
      {/* Login Form — centered, no side panel */}
      <div className="login-left">
        <div className="login-card animate-slide-up">
          {/* The logo. No language control: the staff portals are English only. */}
          <div className="login-brand-row">
            <div className="login-logo" style={{ marginBottom: 0 }}>
              <div className="login-logo-icon has-brand-mark"><img className="brand-mark" src="/assets/brand/logo-mark.png" alt="" width="512" height="512" /></div>
              <div className="login-logo-text">
                <div className="brand has-brand-wordmark"><img className="brand-wordmark" src="/assets/brand/logo-wordmark.png" alt="Sathyam Agro Mart" width="1200" height="254" /></div>
                <div className="tagline">Agricultural ERP &amp; E-Commerce Platform</div>
              </div>
            </div>
          </div>

          <span className="login-eyebrow">Staff &amp; Admin Portal</span>
          <h2 className="login-title">Welcome back</h2>
          <p className="login-subtitle" id="loginRoleLabel">Select your role, then sign in</p>

          {/* Role Selector */}
          <div className="role-selector" role="radiogroup" aria-labelledby="loginRoleLabel">
            {ROLES.map(r => {
              const active = selectedRole === r.key
              return (
                <button
                  key={r.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`role-chip ${active ? 'active' : ''}`}
                  onClick={() => { setSelectedRole(r.key); setPasswordError('') }}
                >
                  <span className="role-emoji" aria-hidden="true"><r.icon size={22} strokeWidth={2} /></span>
                  <span className="role-label">{r.label}</span>
                  {active && <span className="role-check" aria-hidden="true"><Check size={12} strokeWidth={3} /></span>}
                </button>
              )
            })}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="loginMobile">Mobile Number or Email</label>
              <div className="input-group">
                <span className="input-icon"><Smartphone size={16} strokeWidth={2} aria-hidden="true" /></span>
                {/* Some staff accounts have only an email, so both are accepted
                    (the server looks either up). Digits stay a 10-digit number. */}
                <input
                  id="loginMobile"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="form-input"
                  placeholder="Mobile number or email"
                  value={mobile}
                  onChange={e => {
                    const v = e.target.value
                    setMobile(/^[\d\s+-]*$/.test(v) ? v.replace(/\D/g, '').slice(0, 10) : v.trim().slice(0, 120)); setPasswordError('')
                  }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="loginPassword">Password</label>
              <div className="input-group">
                <span className="input-icon"><LockKeyhole size={16} strokeWidth={2} aria-hidden="true" /></span>
                <input
                  id="loginPassword"
                  type={showPass ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setPasswordError('') }}
                  autoComplete="current-password"
                  aria-invalid={passwordError ? 'true' : undefined}
                  aria-describedby={passwordError ? 'loginPassword-error' : undefined}
                  style={passwordBoxStyle(undefined, passwordError)}
                />
                <button type="button" className="input-icon input-icon-right" aria-label={showPass ? 'Hide password' : 'Show password'} onClick={() => setShowPass(!showPass)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <PasswordError id="loginPassword" message={passwordError} />
              <div className="forgot-link-row">
                <Link to="/forgot-password" state={{ phone: /^[6-9]\d{9}$/.test(mobile) ? mobile : '', backTo: '/admin' }} className="forgot-text-btn">
                  Forgot password?
                </Link>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: '8px' }}>
              {loading ? <><div className="spinner" /> Signing in...</> : <><LogIn size={18} /> {`Sign In as ${roleInfo?.label}`}</>}
            </button>
          </form>

          <p className="login-store-note">
            Farmer? <Link to="/#login">Sign in on the store</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
