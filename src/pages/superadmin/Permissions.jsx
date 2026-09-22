import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'sonner'
import { ShieldCheck, User, Store, CheckSquare, Square, RefreshCw, Save, CheckCircle2, Lock, Eye, EyeOff, MapPin } from 'lucide-react'

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
    <div style={{ paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          Portal Feature Visibility Control
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '4px 0 0' }}>
          Assign exactly which portal features, management tabs, and modules are visible to each personnel account.
          Changes take effect immediately on their next page navigation.
        </p>
      </div>

      {/* Main Split Interface */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* User Selection Sidebar */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e293b', marginBottom: '12px' }}>
            Select Personnel
          </div>
          <input
            type="text"
            placeholder="Search by name, role, store..."
            value={searchUser}
            onChange={(e) => setSearchUser(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              marginBottom: '12px',
              outline: 'none'
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '560px', overflowY: 'auto' }}>
            {filteredUsers.map(u => {
              const isSelected = selectedUser?.id === u.id
              return (
                <button
                  key={u.id}
                  onClick={() => selectUser(u)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    background: isSelected ? '#eff6ff' : '#f8fafc',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: isSelected ? '#2563eb' : '#e2e8f0',
                    color: isSelected ? '#fff' : '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    flexShrink: 0
                  }}>
                    {u.name ? u.name[0] : 'U'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {u.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ textTransform: 'capitalize', fontWeight: 600, color: '#2563eb' }}>{u.role}</span>
                      <span>·</span>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {u.storeLocation || u.storeName || 'Global'}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
            {filteredUsers.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.82rem' }}>
                No personnel found.
              </div>
            )}
          </div>
        </div>

        {/* Permissions Configuration Workspace */}
        {selectedUser ? (
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            {/* Selected User Banner */}
            <div style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              borderRadius: '12px',
              padding: '20px',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: '#3b82f6',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  fontWeight: 800
                }}>
                  {selectedUser.name[0]}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                      {selectedUser.name}
                    </h2>
                    <span style={{
                      fontSize: '0.72rem',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: 'rgba(255,255,255,0.2)',
                      textTransform: 'uppercase',
                      fontWeight: 700
                    }}>
                      {selectedUser.role}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '4px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span>📱 {selectedUser.phone || 'No phone'}</span>
                    <span>·</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={13} /> {selectedUser.storeName ? `${selectedUser.storeName} (${selectedUser.storeLocation})` : 'Global Store'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Active Modules</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#60a5fa' }}>
                  {permissions.length} <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>/ {currentRoleModules.length}</span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleSelectAll}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', color: '#334155' }}
                >
                  Enable All
                </button>
                <button
                  onClick={handleDeselectAll}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', color: '#334155' }}
                >
                  Disable All
                </button>
                <button
                  onClick={handleResetDefaults}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <RefreshCw size={12} /> Reset Defaults
                </button>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#2563eb',
                  color: '#ffffff',
                  padding: '10px 24px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
                }}
              >
                <Save size={16} /> {saving ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>

            {/* Modules Matrix by Category */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {Object.entries(categories).map(([catName, mods]) => (
                <div key={catName}>
                  <div style={{
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontWeight: 800,
                    color: '#64748b',
                    marginBottom: '10px'
                  }}>
                    {catName}
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '12px'
                  }}>
                    {mods.map(mod => {
                      const isEnabled = permissions.includes(mod.key)
                      return (
                        <div
                          key={mod.key}
                          onClick={() => togglePermission(mod.key)}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            padding: '14px',
                            borderRadius: '10px',
                            border: isEnabled ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                            background: isEnabled ? '#eff6ff' : '#f8fafc',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={() => {}} // handled by div click
                            style={{ marginTop: '3px', cursor: 'pointer', width: '16px', height: '16px', accentColor: '#2563eb' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: isEnabled ? '#1e3a8a' : '#334155' }}>
                              {mod.label}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px', lineHeight: 1.3 }}>
                              {mod.desc}
                            </div>
                          </div>
                          {isEnabled ? (
                            <Eye size={16} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
                          ) : (
                            <EyeOff size={16} color="#94a3b8" style={{ flexShrink: 0, marginTop: '2px' }} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <ShieldCheck size={48} color="#94a3b8" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '1.2rem', color: '#1e293b' }}>Select a personnel member</h3>
            <p style={{ color: '#64748b' }}>Choose a user from the left panel to configure their portal visibility.</p>
          </div>
        )}
      </div>
    </div>
  )
}
