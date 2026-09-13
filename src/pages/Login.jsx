import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth, ROLE_HOME } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { toast } from 'sonner'
import { Eye, EyeOff, Leaf, LogIn } from 'lucide-react'

const ROLES = [
  { key: 'farmer',   label: 'Farmer',   emoji: '👨‍🌾' },
  { key: 'admin',    label: 'Admin',    emoji: '🛡️' },
  { key: 'employee', label: 'Employee', emoji: '🏭' },
  { key: 'delivery', label: 'Delivery', emoji: '🚚' },
  { key: 'billing',  label: 'Billing',  emoji: '🧾' },
]

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const { t } = useLanguage()
  const [selectedRole, setSelectedRole] = useState('farmer')
  // Carried over when Register redirects an already-registered number here.
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

  const handleRoleSelect = (role) => {
    setSelectedRole(role)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!mobile || !password) { toast.error('Please fill in all fields'); return }
    setLoading(true)
    try {
      const user = await login(mobile.trim(), password)
      if (user.role !== selectedRole) {
        toast.error(`This account is not a ${roleInfo?.label || selectedRole} account.`)
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
    <div className="login-page">
      {/* LEFT — Login Form */}
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


          <h2 className="login-title">Welcome back</h2>
          <p className="login-subtitle">Select your role, then sign in</p>

          {/* Role Selector */}
          <div className="role-selector">
            {ROLES.map(r => (
              <button
                key={r.key}
                className={`role-chip ${selectedRole === r.key ? 'active' : ''}`}
                onClick={() => handleRoleSelect(r.key)}
                type="button"
              >
                <span className="role-emoji">{r.emoji}</span>
                {r.label}
              </button>
            ))}
          </div>


          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Mobile Number</label>
              <div className="input-group">
                <span className="input-icon">📱</span>
                <input
                  type="tel"
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
              <label className="form-label">Password</label>
              <div className="input-group">
                <span className="input-icon">🔒</span>
                <input
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

          <div className="divider"><span>New farmer?</span></div>

          <Link to="/register">
            <button className="btn btn-secondary btn-full">
              🌱 Register as Farmer
            </button>
          </Link>
        </div>
      </div>

      {/* RIGHT — Visual Panel */}
      <div className="login-right">
        <div style={{ textAlign: 'center', padding: '40px', zIndex: 1 }}>
          <div style={{ fontSize: '5rem', marginBottom: '24px', filter: 'drop-shadow(0 0 30px rgba(34,197,94,0.5))' }}>🌿</div>
          <h2 style={{ fontFamily: 'Poppins', fontSize: '2rem', color: '#4ade80', marginBottom: '12px' }}>Sathya Bio</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '340px', margin: '0 auto 32px', lineHeight: '1.7' }}>
            India's most comprehensive Agricultural E-Commerce, ERP & Crop Advisory Platform
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', maxWidth: '340px', margin: '0 auto' }}>
            {[
              { icon: '🛒', label: 'E-Commerce Store' },
              { icon: '🏭', label: 'ERP System' },
              { icon: '🚚', label: 'Delivery Tracking' },
              { icon: '🧾', label: 'GST Billing & POS' },
              { icon: '🎫', label: 'Field Ticketing' },
              { icon: '💬', label: 'Live Chat' },
              { icon: '📊', label: 'Analytics' },
              { icon: '🌾', label: 'Crop Advisory' },
            ].map(f => (
              <div key={f.label} style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 'var(--radius-lg)', padding: '14px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 600 }}>
                <span style={{ fontSize: '1.3rem' }}>{f.icon}</span>
                {f.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
