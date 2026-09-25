import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'sonner'
import { ShieldCheck, User, Store, CheckSquare, Square, RefreshCw, Save, CheckCircle2, Lock, Eye, EyeOff, MapPin, Search, Phone } from 'lucide-react'

export default function FeaturePermissions() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialUserId = searchParams.get('userId')

  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [modulesConfig, setModulesConfig] = useState({})
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchUser, setSearchUser] = useState('')

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    setLoading(true)
    try {
      const [usersRes, configRes] = await Promise.all([
        axios.get('/api/superadmin/users'),
        axios.get('/api/superadmin/modules-config')
      ])

      const staff = (usersRes.data?.data || []).filter(u => u.role !== 'farmer' && u.role !== 'superadmin')
      setUsers(staff)
      if (configRes.data?.success) setModulesConfig(configRes.data.data)

      // Select user from URL or first available
      let targetUser = null
      if (initialUserId) {
        targetUser = staff.find(u => u.id === initialUserId)
      }
      if (!targetUser && staff.length > 0) {
        targetUser = staff[0]
      }

      if (targetUser) {
        selectUser(targetUser, configRes.data?.data)
      }
    } catch (err) {
      toast.error('Failed to load permissions configuration: ' + (err.response?.data?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  const selectUser = (user, config = modulesConfig) => {
    setSelectedUser(user)
    setSearchParams({ userId: user.id })

    // If permissions array exists on user, load it; otherwise default to all available modules for their role
    if (Array.isArray(user.permissions) && user.permissions.length > 0) {
      setPermissions(user.permissions)
    } else {
      const roleModules = (config[user.role] || []).map(m => m.key)
      setPermissions(roleModules)
    }
  }

  const togglePermission = (key) => {
    setPermissions(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const handleSelectAll = () => {
    const allKeys = currentRoleModules.map(m => m.key)
    setPermissions(allKeys)
  }

  const handleDeselectAll = () => {
    setPermissions([])
  }

  const handleResetDefaults = () => {
    if (!selectedUser) return
    const defaults = (modulesConfig[selectedUser.role] || []).map(m => m.key)
    setPermissions(defaults)
    toast.info(`Reset to default visibility modules for ${selectedUser.role}`)
  }

  const handleSave = async () => {
    if (!selectedUser) return
    setSaving(true)
    try {
      const res = await axios.put(`/api/superadmin/users/${selectedUser.id}/permissions`, {
        permissions
      })
      if (res.data?.success) {
        toast.success(`Permissions updated for ${selectedUser.name}! ${permissions.length} modules visible.`)
        // Update local user state
        setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, permissions } : u))
        setSelectedUser(prev => ({ ...prev, permissions }))
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update permissions')
    } finally {
      setSaving(false)
    }
  }

  // Active module list based on selected user's role
  const currentRoleModules = selectedUser ? (modulesConfig[selectedUser.role] || []) : []

  // Group modules by category
  const categories = {}
  currentRoleModules.forEach(m => {
    const cat = m.category || 'General'
    if (!categories[cat]) categories[cat] = []
    categories[cat].push(m)
  })

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.role?.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.storeName?.toLowerCase().includes(searchUser.toLowerCase())
  )

  return (
    <div className="sa-page">
      {/* Header */}
      <div className="sa-page-head">
        <div>
          <div className="sa-eyebrow"><ShieldCheck size={14} /> Access Control</div>
          <h1 className="sa-title">Portal Feature Visibility Control</h1>
          <p className="sa-subtitle">
            Assign exactly which portal features, management tabs, and modules are visible to each personnel account.
            Changes take effect immediately on their next page navigation.
          </p>
        </div>
      </div>

      {/* Main Split Interface */}
      <div className="sa-perm-layout">
        {/* User Selection Sidebar */}
        <aside className="sa-card sa-perm-people">
          <div className="sa-perm-people-head">
            <div className="sa-card-title">Select Personnel</div>
            <span className="sa-badge">{filteredUsers.length}</span>
          </div>
          <label className="sa-search">
            <Search size={16} />
            <input
              type="text"
              className="sa-input"
              placeholder="Search by name, role, store..."
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
            />
          </label>

          <div className="sa-perm-list">
            {filteredUsers.map(u => {
              const isSelected = selectedUser?.id === u.id
              return (
                <button
                  key={u.id}
                  onClick={() => selectUser(u)}
                  className={`sa-perm-person${isSelected ? ' is-selected' : ''}`}
                >
                  <div className="sa-avatar">{u.name ? u.name[0] : 'U'}</div>
                  <div className="sa-row-main">
                    <div className="sa-perm-person-name">{u.name}</div>
                    <div className="sa-perm-person-meta">
                      <span className="sa-perm-person-role">{u.role}</span>
                      <span>·</span>
                      <span className="sa-perm-person-store">{u.storeLocation || u.storeName || 'Global'}</span>
                    </div>
                  </div>
                </button>
              )
            })}
            {filteredUsers.length === 0 && (
              <div className="sa-empty" style={{ padding: '24px 8px' }}>
                <div className="sa-empty-text">No personnel found.</div>
              </div>
            )}
          </div>
        </aside>

        {/* Permissions Configuration Workspace */}
        {selectedUser ? (
          <section className="sa-card sa-perm-work">
            {/* Selected User Banner */}
            <div className="sa-perm-banner">
              <div className="sa-perm-who">
                <div className="sa-avatar sa-avatar--lg sa-perm-avatar">{selectedUser.name[0]}</div>
                <div>
                  <div className="sa-perm-name-row">
                    <h2 className="sa-perm-name">{selectedUser.name}</h2>
                    <span className="sa-perm-role">{selectedUser.role}</span>
                  </div>
                  <div className="sa-perm-meta">
                    <span><Phone size={13} /> {selectedUser.phone || 'No phone'}</span>
                    <span><MapPin size={13} /> {selectedUser.storeName ? `${selectedUser.storeName} (${selectedUser.storeLocation})` : 'Global Store'}</span>
                  </div>
                </div>
              </div>

              <div className="sa-perm-count">
                <div className="sa-perm-count-label">Active Modules</div>
                <div className="sa-perm-count-value">
                  {permissions.length} <span>/ {currentRoleModules.length}</span>
                </div>
                <div className="sa-progress sa-perm-progress">
                  <span style={{ width: `${currentRoleModules.length ? Math.round((permissions.length / currentRoleModules.length) * 100) : 0}%` }}></span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="sa-perm-actions">
              <div className="sa-actions">
                <button onClick={handleSelectAll} className="sa-btn sa-btn--ghost sa-btn--sm">
                  <CheckSquare size={14} /> Enable All
                </button>
                <button onClick={handleDeselectAll} className="sa-btn sa-btn--ghost sa-btn--sm">
                  <Square size={14} /> Disable All
                </button>
                <button onClick={handleResetDefaults} className="sa-btn sa-btn--ghost sa-btn--sm">
                  <RefreshCw size={14} /> Reset Defaults
                </button>
              </div>

              <button onClick={handleSave} disabled={saving} className="sa-btn sa-btn--primary">
                <Save size={16} /> {saving ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>

            {/* Modules Matrix by Category */}
            <div className="sa-perm-groups">
              {Object.entries(categories).map(([catName, mods]) => (
                <div key={catName}>
                  <div className="sa-perm-cat">
                    {catName}
                    <span>{mods.filter(m => permissions.includes(m.key)).length}/{mods.length}</span>
                  </div>
                  <div className="sa-perm-grid">
                    {mods.map(mod => {
                      const isEnabled = permissions.includes(mod.key)
                      return (
                        <div
                          key={mod.key}
                          onClick={() => togglePermission(mod.key)}
                          className={`sa-perm-mod${isEnabled ? ' is-on' : ''}`}
                        >
                          <div className="sa-perm-mod-icon">
                            {isEnabled ? <Eye size={16} /> : <EyeOff size={16} />}
                          </div>
                          <div className="sa-row-main">
                            <div className="sa-perm-mod-title">{mod.label}</div>
                            <div className="sa-perm-mod-desc">{mod.desc}</div>
                          </div>
                          <input
                            type="checkbox"
                            className="sa-switch"
                            checked={isEnabled}
                            onChange={() => {}} // handled by div click
                            aria-label={mod.label}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="sa-card">
            <div className="sa-empty">
              <div className="sa-empty-icon"><ShieldCheck size={28} /></div>
              <div className="sa-empty-title">Select a personnel member</div>
              <div className="sa-empty-text">Choose a user from the left panel to configure their portal visibility.</div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
