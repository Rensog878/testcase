import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'sonner'
import { Users, Plus, Search, Filter, ShieldCheck, MapPin, UserCheck, Key, Edit2, Trash2, CheckCircle, XCircle, ArrowRight } from 'lucide-react'

export default function PersonnelManagement() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialRole = searchParams.get('role') || 'all'

  const [users, setUsers] = useState([])
  const [stores, setStores] = useState([])
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRole, setSelectedRole] = useState(initialRole)
  const [selectedStore, setSelectedStore] = useState('all')
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [saving, setSaving] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    role: 'admin',
    storeId: '',
    storeName: '',
    storeLocation: '',
    assignedAdminId: '',
    assignedAdminName: '',
    department: '',
    status: 'active'
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [usersRes, storesRes] = await Promise.all([
        axios.get('/api/superadmin/users'),
        axios.get('/api/superadmin/stores')
      ])
      if (usersRes.data?.success) {
        const staffUsers = (usersRes.data.data || []).filter(u => u.role !== 'farmer')
        setUsers(staffUsers)
        setAdmins(staffUsers.filter(u => u.role === 'admin'))
      }
      if (storesRes.data?.success) setStores(storesRes.data.data || [])
    } catch (err) {
      toast.error('Failed to load personnel: ' + (err.response?.data?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAdd = () => {
    setEditingUser(null)
    const defaultStore = stores[0]
    setFormData({
      name: '',
      phone: '',
      email: '',
      password: '',
      role: 'admin',
      storeId: defaultStore ? defaultStore.id : '',
      storeName: defaultStore ? defaultStore.name : '',
      storeLocation: defaultStore ? defaultStore.location : '',
      assignedAdminId: defaultStore?.adminId || '',
      assignedAdminName: defaultStore?.adminName || '',
      department: '',
      status: 'active'
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (u) => {
    setEditingUser(u)
    setFormData({
      name: u.name || '',
      phone: u.phone || '',
      email: u.email || '',
      password: '', // leave empty to preserve
      role: u.role || 'employee',
      storeId: u.storeId || '',
      storeName: u.storeName || '',
      storeLocation: u.storeLocation || '',
      assignedAdminId: u.assignedAdminId || '',
      assignedAdminName: u.assignedAdminName || '',
      department: u.department || '',
      status: u.status || 'active'
    })
    setIsModalOpen(true)
  }

  const handleStoreChange = (storeId) => {
    const found = stores.find(s => s.id === storeId)
    if (found) {
      setFormData(prev => ({
        ...prev,
        storeId: found.id,
        storeName: found.name,
        storeLocation: found.location,
        assignedAdminId: found.adminId || prev.assignedAdminId,
        assignedAdminName: found.adminName || prev.assignedAdminName
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        storeId: '',
        storeName: '',
        storeLocation: '',
        assignedAdminId: '',
        assignedAdminName: ''
      }))
    }
  }

  const handleAdminChange = (adminId) => {
    const found = admins.find(a => a.id === adminId)
    setFormData(prev => ({
      ...prev,
      assignedAdminId: adminId,
      assignedAdminName: found ? found.name : ''
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!formData.name) {
      toast.error('Please enter personnel name.')
      return
    }
    if (!editingUser && !formData.password) {
      toast.error('Please enter initial password.')
      return
    }

    setSaving(true)
    try {
      const payload = { ...formData }
      if (editingUser && !payload.password) delete payload.password

      if (editingUser) {
        const res = await axios.put(`/api/superadmin/users/${editingUser.id}`, payload)
        if (res.data?.success) {
          toast.success(`Personnel "${formData.name}" updated successfully`)
        }
      } else {
        const res = await axios.post('/api/superadmin/users', payload)
        if (res.data?.success) {
          toast.success(`New ${formData.role} "${formData.name}" created successfully`)
        }
      }
      setIsModalOpen(false)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save personnel')
    } finally {
      setSaving(false)
    }
  }

  const filteredUsers = users.filter(u => {
    if (selectedRole !== 'all' && u.role !== selectedRole) return false
    if (selectedStore !== 'all' && u.storeId !== selectedStore) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        u.name?.toLowerCase().includes(q) ||
        u.phone?.includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.storeName?.toLowerCase().includes(q) ||
        u.storeLocation?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'superadmin':
        return { background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff' }
      case 'admin':
        return { background: '#fee2e2', color: '#dc2626' }
      case 'billing':
        return { background: '#ccfbf1', color: '#0f766e' }
      case 'delivery':
        return { background: '#ffedd5', color: '#c2410c' }
      case 'employee':
        return { background: '#f3e8ff', color: '#7e22ce' }
      default:
        return { background: '#f1f5f9', color: '#475569' }
    }
  }

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* Header bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Personnel & Multi-Store Hierarchy
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '4px 0 0' }}>
            Create and supervise Admins, Billing staff, Delivery agents, and ERP Employees. Each person is scoped to a Store Location and reports to that store's Admin.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#2563eb',
            color: '#ffffff',
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '0.9rem',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
          }}
        >
          <Plus size={18} /> Add New Personnel
        </button>
      </div>

      {/* Filter Toolbar */}
      <div style={{
        background: '#ffffff',
        padding: '16px 20px',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        marginBottom: '24px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
          <Search size={18} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search by name, phone, email, or store location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              width: '100%',
              fontSize: '0.92rem',
              background: 'transparent'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Role Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Role:</span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                background: '#f8fafc',
                color: '#1e293b',
                fontWeight: 500
              }}
            >
              <option value="all">All Roles</option>
              <option value="admin">Store Admins</option>
              <option value="billing">Billing Staff</option>
              <option value="delivery">Delivery Agents</option>
              <option value="employee">Employees</option>
              <option value="superadmin">Super Admin</option>
            </select>
          </div>

          {/* Store Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Store:</span>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                background: '#f8fafc',
                color: '#1e293b',
                fontWeight: 500
              }}
            >
              <option value="all">All Store Locations</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.location})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '14px 20px' }}>Personnel</th>
                <th style={{ padding: '14px 20px' }}>Role</th>
                <th style={{ padding: '14px 20px' }}>Store Location</th>
                <th style={{ padding: '14px 20px' }}>Hierarchy (Reports To)</th>
                <th style={{ padding: '14px 20px' }}>Portal Permissions</th>
                <th style={{ padding: '14px 20px' }}>Status</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr
                  key={u.id}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    transition: 'background 0.15s ease'
                  }}
                >
                  {/* Name & Contact */}
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: '#e0e7ff',
                        color: '#3730a3',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        flexShrink: 0
                      }}>
                        {u.name ? u.name[0] : 'U'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#1e293b' }}>{u.name}</div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                          {u.phone || u.email || 'No contact'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '0.74rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                      ...getRoleBadgeStyle(u.role)
                    }}>
                      {u.role}
                    </span>
                  </td>

                  {/* Store Location */}
                  <td style={{ padding: '14px 20px' }}>
                    {u.storeName ? (
                      <div>
                        <div style={{ fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={13} color="#2563eb" /> {u.storeName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', paddingLeft: '17px' }}>
                          {u.storeLocation || 'Tamil Nadu'}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.82rem' }}>
                        {u.role === 'superadmin' ? 'Global (All Stores)' : 'Unassigned'}
                      </span>
                    )}
                  </td>

                  {/* Hierarchy (Reports To) */}
                  <td style={{ padding: '14px 20px' }}>
                    {u.role === 'superadmin' ? (
                      <span style={{ fontSize: '0.78rem', color: '#8b5cf6', fontWeight: 600 }}>Root Authority</span>
                    ) : u.role === 'admin' ? (
                      <span style={{ fontSize: '0.78rem', color: '#3b82f6', fontWeight: 600 }}>Reports to Super Admin</span>
                    ) : u.assignedAdminName ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <UserCheck size={14} color="#10b981" />
                        <span style={{ fontWeight: 600, color: '#334155' }}>{u.assignedAdminName}</span>
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>Store Head</span>
                    )}
                  </td>

                  {/* Portal Permissions */}
                  <td style={{ padding: '14px 20px' }}>
                    {u.role === 'superadmin' ? (
                      <span style={{ fontSize: '0.75rem', background: '#e0e7ff', color: '#4338ca', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                        All Modules (Root)
                      </span>
                    ) : (
                      <Link
                        to={`/superadmin/permissions?userId=${u.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          textDecoration: 'none',
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          background: '#f8fafc',
                          color: '#2563eb',
                          border: '1px solid #cbd5e1',
                          padding: '4px 10px',
                          borderRadius: '6px'
                        }}
                      >
                        <ShieldCheck size={13} />
                        {u.permissions?.length ? `${u.permissions.length} modules visible` : 'Default visibility'}
                        <ArrowRight size={12} />
                      </Link>
                    )}
                  </td>

                  {/* Status */}
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: (u.status || 'active') === 'active' ? '#ecfdf5' : '#fef2f2',
                      color: (u.status || 'active') === 'active' ? '#059669' : '#dc2626'
                    }}>
                      {(u.status || 'active') === 'active' ? 'Active' : 'Disabled'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                      <button
                        onClick={() => handleOpenEdit(u)}
                        title="Edit User"
                        style={{ background: '#f1f5f9', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', color: '#334155' }}
                      >
                        <Edit2 size={15} />
                      </button>
                      <Link
                        to={`/superadmin/permissions?userId=${u.id}`}
                        title="Configure Visible Features"
                        style={{ background: '#eff6ff', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', color: '#2563eb', display: 'flex', alignItems: 'center' }}
                      >
                        <ShieldCheck size={15} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8' }}>
            No personnel found matching criteria.
          </div>
        )}
      </div>

      {/* Add / Edit Personnel Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            overflow: 'hidden',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                {editingUser ? 'Edit Personnel' : 'Add New Personnel'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Role Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Assign Role *
                </label>
                <select
                  disabled={editingUser?.role === 'superadmin'}
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', background: '#ffffff', fontWeight: 600 }}
                >
                  <option value="admin">Store Admin (Location Manager)</option>
                  <option value="billing">Billing Staff (POS Counter)</option>
                  <option value="delivery">Delivery Personnel</option>
                  <option value="employee">ERP Employee (Operations)</option>
                </select>
              </div>

              {/* Full Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              {/* Mobile & Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Mobile Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="10-digit mobile"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="name@sathyambio.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  {editingUser ? 'New Password (leave empty to keep current)' : 'Login Password *'}
                </label>
                <input
                  type="password"
                  placeholder={editingUser ? 'Enter new password or leave blank' : 'Enter account password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              {/* Store Location Assignment */}
              <div style={{
                background: '#f8fafc',
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                    Represented Store Location *
                  </label>
                  <select
                    value={formData.storeId}
                    onChange={(e) => handleStoreChange(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', background: '#ffffff' }}
                  >
                    <option value="">-- Select Store Branch --</option>
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.location})</option>
                    ))}
                  </select>
                </div>

                {/* Hierarchy: Belongs to specific store admin */}
                {formData.role !== 'admin' && formData.role !== 'superadmin' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                      Reporting Admin (Belongs to Location Head)
                    </label>
                    <select
                      value={formData.assignedAdminId}
                      onChange={(e) => handleAdminChange(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', background: '#ffffff' }}
                    >
                      <option value="">-- Select Location Admin --</option>
                      {admins.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.storeName || a.storeLocation || 'Store Head'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Department & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Department / Tag
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Counter Sales, Dispatch, Agronomy"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Account Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', background: '#ffffff' }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Disabled</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '10px 18px', background: '#f1f5f9', color: '#475569', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '10px 22px',
                    background: '#2563eb',
                    color: '#ffffff',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {saving ? 'Saving...' : (editingUser ? 'Update Personnel' : 'Create Personnel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
