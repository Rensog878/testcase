import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth, ROLE_HOME } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { toast } from 'sonner'
import { celebrateSignIn } from '../storefront/welcome'
import { Check, Eye, EyeOff, LogIn } from 'lucide-react'

// Staff sign-in (/login, and /admin when signed out). Farmers sign in on the
// storefront, so there is no Farmer role here.
const ROLES = [
  { key: 'admin',    label: 'Admin',    emoji: '🛡️' },
  { key: 'employee', label: 'Employee', emoji: '🏭' },
  { key: 'delivery', label: 'Delivery', emoji: '🚚' },
  { key: 'billing',  label: 'Billing',  emoji: '🧾' },
]

const withArticle = label => `${/^[AEIOU]/i.test(label) ? 'an' : 'a'} ${label}`

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, logout } = useAuth()
  const { t } = useLanguage()
  const [selectedRole, setSelectedRole] = useState('admin')
  const [mobile, setMobile]             = useState(() => location.state?.identifier || '')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    if (location.state?.message) {
      toast.error(location.state.message, { duration: 5000 })
    }
  }, [location.state])

  const roleInfo = ROLES.find(r => r.key === selectedRole)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!mobile || !password) { toast.error('Please fill in all fields'); return }
    setLoading(true)
    try {
      const user = await login(mobile.trim(), password)
      // A farmer account belongs on the storefront, where it is now signed in.
      if (user.role === 'farmer') {
        toast.success(`Welcome back, ${user.name}! Farmers shop and sign in on the store. 🌿`)
        celebrateSignIn(user)
        navigate('/', { replace: true })
        return
      }
      // Right password, wrong role: do not leave that account signed in.
      if (user.role !== selectedRole) {
        logout(false)
        toast.error(`This is not ${withArticle(roleInfo?.label || selectedRole)} account.`)
        return
      }
      toast.success(`Welcome back, ${user.name}! 🌿`)
      navigate(ROLE_HOME[user.role] || '/', { replace: true })
    } catch (err) {
      toast.error(err?.message || err?.response?.data?.message || 'Invalid credentials')
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
          {/* Logo & Lang Switcher */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div className="login-logo" style={{ marginBottom: 0 }}>
              <div className="login-logo-icon">🌿</div>
              <div className="login-logo-text">
                <div className="brand">{t('brand')}</div>
                <div className="tagline">{t('tagline')}</div>
              </div>
            </div>
            <LanguageSwitcher />
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
                  onClick={() => setSelectedRole(r.key)}
                >
                  <span className="role-emoji" aria-hidden="true">{r.emoji}</span>
                  <span className="role-label">{r.label}</span>
                  {active && <span className="role-check" aria-hidden="true"><Check size={12} strokeWidth={3} /></span>}
                </button>
              )
            })}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="loginMobile">Mobile Number</label>
              <div className="input-group">
                <span className="input-icon">📱</span>
                <input
                  id="loginMobile"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="username"
                  className="form-input"
                  placeholder="Enter your mobile number"
                  value={mobile}
                  onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  maxLength="10"
                  pattern="[0-9]{10}"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="loginPassword">Password</label>
              <div className="input-group">
                <span className="input-icon">🔒</span>
                <input
                  id="loginPassword"
                  type={showPass ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button type="button" className="input-icon input-icon-right" aria-label={showPass ? 'Hide password' : 'Show password'} onClick={() => setShowPass(!showPass)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="forgot-link-row">
                <Link to="/forgot-password" state={{ phone: /^[6-9]\d{9}$/.test(mobile) ? mobile : '', backTo: '/admin' }} className="forgot-text-btn">
                  Forgot password?
                </Link>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: '8px' }}>
              {loading ? <><div className="spinner" /> Signing in...</> : <><LogIn size={18} /> Sign In as {roleInfo?.label}</>}
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
