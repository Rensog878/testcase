import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogOut } from 'lucide-react'

export default function Sidebar({ items, roleName, roleEmoji, isOpen, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    const role = user?.role
    logout()
    navigate(role === 'admin' ? '/admin' : '/#login')
  }

  return (
    <>
      {/* Mobile overlay */}
      <div className={`sidebar-overlay ${isOpen ? 'show' : ''}`} onClick={onClose} />

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon has-brand-mark"><img className="brand-mark" src="/assets/brand/logo-mark.png" alt="" width="512" height="512" /></div>
          <div className="sidebar-logo-text">
            <div className="brand-name">Sathyam Agro Mart</div>
            <div className="brand-tagline">AgriTech Platform</div>
          </div>
        </div>

        {/* Role Badge */}
        <div className="sidebar-role-badge">
          <span className="role-icon">{roleEmoji}</span>
          <div>
            <div className="role-name">{roleName} Portal</div>
            <div className="role-email">{user?.name}</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {items.map((section, si) => (
            <div key={si}>
              {section.title && <div className="sidebar-section-title">{section.title}</div>}
              {section.links.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={() => window.innerWidth < 768 && onClose()}
                >
                  <span className="nav-icon">{link.icon}</span>
                  {link.label}
                  {link.badge && <span className="nav-badge">{link.badge}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button className="sidebar-logout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}
