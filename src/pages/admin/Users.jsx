import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import {
  Users as UsersIcon, UserPlus, Search, Key, Shield, Sprout,
  Edit2, Trash2, CheckCircle2, XCircle, RefreshCw, Eye, EyeOff, MapPin, Phone, Mail
} from 'lucide-react'
import PasswordChecklist from '../../components/PasswordChecklist'
import { generateStrongPassword, isPasswordValid, passwordPlaceholder } from '../../utils/passwordRules'

const ROLES = [
  { key: 'all', label: 'All Roles' },
  { key: 'farmer', label: 'Farmers (Customers)' },
  { key: 'employee', label: 'Employees' },
  { key: 'delivery', label: 'Delivery Agents' },
  { key: 'billing', label: 'Billing Staff' },
  { key: 'admin', label: 'Admins' },
]

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [sortBy, setSortBy] = useState('recent')

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [viewOnly, setViewOnly] = useState(false)
  const [profileFields, setProfileFields] = useState([])
  const [showPassword, setShowPassword] = useState(false)

  // Create form state
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    role: 'farmer',
    crop: 'Paddy / Rice',
    acreage: 3,
    village: '',
    district: 'Coimbatore',
    state: 'Tamil Nadu',
    department: 'Field Advisory'
  })

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    role: 'farmer',
    crop: '',
    acreage: 0,
    village: '',
    district: '',
    state: '',
    department: '',
    status: 'active'
  })

  useEffect(() => {
    fetchUsers()
    axios.get('/api/profile-fields').then(({ data }) => setProfileFields(data.data || [])).catch(() => {})
  }, [roleFilter, sortBy])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/admin/users', {
        params: { role: roleFilter, sortBy, search }
      })
      if (data.success) {
        setUsers(data.data)
      }
    } catch (err) {
      console.error('Error fetching users:', err)
      toast.error('Failed to load users from database')
    } finally {
      setLoading(false)
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    fetchUsers()
  }

  const openCreateModal = () => {
    setForm({
      name: '',
      phone: '',
      email: '',
      password: generateStrongPassword(),
      role: 'farmer',
      crop: 'Paddy / Rice',
      acreage: 3,
      village: 'Coimbatore',
      district: 'Coimbatore',
      state: 'Tamil Nadu',
      department: 'Customer Care'
    })
    setShowPassword(true)
    setCreateModalOpen(true)
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || (!form.phone && !form.email) || !form.password) {
      toast.error('Please provide name, phone/email, and password')
      return
    }
    if (!isPasswordValid(form.password, { role: form.role, phone: form.phone })) {
      toast.error('Password does not meet the rules listed under it')
      return
    }

    try {
      const { data } = await axios.post('/api/admin/users', form)
      if (data.success) {
        toast.success(`User credentials created for ${data.user.name}! 🔐`)
        setCreateModalOpen(false)
        fetchUsers()
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Error creating user credentials'
      toast.error(msg)
    }
  }

  const openEditModal = (user) => {
    setSelectedUser(user)
    setViewOnly(user.role === 'farmer')
    setEditForm({
      name: user.name || '',
      phone: user.phone || '',
      email: user.email || '',
      password: '',
      role: user.role || 'farmer',
      crop: user.crop || '',
      acreage: user.acreage || 0,
      village: user.village || '',
      district: user.district || '',
      state: user.state || '',
      department: user.department || '',
      status: user.status || 'active'
    })
    setShowPassword(false)
    setEditModalOpen(true)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (viewOnly) return
    try {
      const updates = { ...editForm }
      if (!updates.password) {
        delete updates.password // keep existing password if blank
      } else if (!isPasswordValid(updates.password, { role: updates.role, phone: updates.phone })) {
        toast.error('New password does not meet the rules listed under it')
        return
      }

      const { data } = await axios.put(`/api/admin/users/${selectedUser.id}`, updates)
      if (data.success) {
        toast.success('User credentials and record updated! ✨')
        setEditModalOpen(false)
        fetchUsers()
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Error updating user'
      toast.error(msg)
    }
  }

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove user "${name}"? Any assigned products will revert to general catalog.`)) {
      return
    }

    try {
      const { data } = await axios.delete(`/api/admin/users/${id}`)
      if (data.success) {
        toast.success(`User ${name} removed`)
        fetchUsers()
      }
    } catch (err) {
      toast.error('Failed to delete user')
    }
  }

  const farmersCount = users.filter(u => u.role === 'farmer').length
  const staffCount = users.filter(u => u.role !== 'farmer').length
  const activeCount = users.filter(u => u.status === 'active').length

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="badge badge-red"><Shield size={12} style={{ display: 'inline', marginRight: '4px' }} />Admin</span>
      case 'farmer':
        return <span className="badge badge-green"><Sprout size={12} style={{ display: 'inline', marginRight: '4px' }} />Farmer (Customer)</span>
      case 'employee':
        return <span className="badge badge-blue">Employee</span>
      case 'delivery':
        return <span className="badge badge-yellow">Delivery Agent</span>
      case 'billing':
        return <span className="badge badge-purple">Billing Staff</span>
      default:
        return <span className="badge">{role}</span>
    }
  }

  return (
    <div className="animate-fade-in admin-users-page" style={{ paddingBottom: '40px' }}>
      {/* Header */}
      <div className="page-header users-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UsersIcon size={26} color="var(--brand-400)" />
            Users & Credentials Master
          </h1>
          <p>Full database record of customers, farmers & staff. Create login credentials and manage permissions.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserPlus size={16} /> Create Login Credentials
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', margin: '20px 0' }}>
        <div className="stat-card" style={{ background: 'var(--dark-800)', padding: '20px', borderRadius: '12px', border: '1px solid var(--dark-700)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Database Users</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginTop: '6px' }}>{users.length}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--brand-400)', marginTop: '4px' }}>Across all system portals</div>
        </div>

        <div className="stat-card" style={{ background: 'var(--dark-800)', padding: '20px', borderRadius: '12px', border: '1px solid var(--dark-700)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Registered Farmers</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--brand-400)', marginTop: '6px' }}>{farmersCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>E-Commerce buyers & advisory</div>
        </div>

        <div className="stat-card" style={{ background: 'var(--dark-800)', padding: '20px', borderRadius: '12px', border: '1px solid var(--dark-700)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Staff & Logistics</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#60a5fa', marginTop: '6px' }}>{staffCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>QC, Delivery & Billing</div>
        </div>

        <div className="stat-card" style={{ background: 'var(--dark-800)', padding: '20px', borderRadius: '12px', border: '1px solid var(--dark-700)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Active Accounts</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#4ade80', marginTop: '6px' }}>{activeCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Can log into Sathya Bio</div>
        </div>
      </div>

      {/* Filter & Live Search Bar */}
      <div className="filter-bar users-filter-bar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '20px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flex: 1, minWidth: '280px' }}>
          <div className="search-box" style={{ width: '100%', position: 'relative' }}>
            <Search size={16} className="search-icon" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              style={{ width: '100%', paddingLeft: '38px' }}
              placeholder="Search by name, phone, crop, or village..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </form>

        <select
          className="filter-select"
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
        >
          {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>

        <select
          className="filter-select"
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
        >
          <option value="recent">Sort: Most Recent</option>
          <option value="name">Sort: User Name (A-Z)</option>
        </select>

        <button className="btn btn-outline" onClick={fetchUsers} title="Refresh records">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Users Database Table Record */}
      <div className="card users-table-card" style={{ background: 'var(--dark-800)', borderRadius: '12px', border: '1px solid var(--dark-700)', overflow: 'hidden' }}>
        <div className="table-wrap users-table-wrap">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--dark-700)' }}>
                <th style={{ padding: '14px 16px' }}>User Details</th>
                <th style={{ padding: '14px 16px' }}>Contact & Login</th>
                <th style={{ padding: '14px 16px' }}>System Role</th>
                <th style={{ padding: '14px 16px' }}>Farm / Department</th>
                <th style={{ padding: '14px 16px' }}>Target Products</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
                <th style={{ padding: '14px 16px' }}>Created</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Loading database records...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No users matching criteria in database. Click "Create Login Credentials" to add one!
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--dark-700)' }}>
                    {/* User Name & ID */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          background: u.role === 'farmer' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(96, 165, 250, 0.15)',
                          color: u.role === 'farmer' ? '#4ade80' : '#60a5fa',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                        }}>
                          {u.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{u.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{u.id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Contact & Phone */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        <Phone size={13} color="var(--brand-400)" />
                        <strong>{u.phone || '—'}</strong>
                      </div>
                      {u.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          <Mail size={12} />
                          {u.email}
                        </div>
                      )}
                    </td>

                    {/* Role */}
                    <td style={{ padding: '14px 16px' }}>
                      {getRoleBadge(u.role)}
                    </td>

                    {/* Farm Details */}
                    <td style={{ padding: '14px 16px', fontSize: '0.82rem' }}>
                      {u.role === 'farmer' ? (
                        <div>
                          <div style={{ color: 'var(--brand-400)', fontWeight: 600 }}>🌾 {u.crop || 'General Crop'}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            {u.acreage ? `${u.acreage} Acres • ` : ''}{u.village || u.district}
                          </div>
                        </div>
                      ) : (
                        <div style={{ color: 'var(--text-secondary)' }}>
                          {u.department || 'Operations Team'}
                        </div>
                      )}
                    </td>

                    {/* Target Products */}
                    <td style={{ padding: '14px 16px' }}>
                      {u.targetProductCount > 0 ? (
                        <span className="badge badge-purple" style={{ cursor: 'pointer' }} title="Products personalized for this user">
                          🎯 {u.targetProductCount} Assigned
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>0 assigned</span>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge ${u.status === 'active' ? 'badge-green' : 'badge-red'}`}>
                        {u.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Created */}
                    <td style={{ padding: '14px 16px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <div>{new Date(u.createdAt).toLocaleDateString('en-IN')}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>by {u.createdBy || 'system'}</div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '6px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => openEditModal(u)}
                          title="Edit user credentials or permissions"
                        >
                          {u.role === 'farmer' ? <><Eye size={13} /> View</> : <><Edit2 size={13} /> Edit</>}
                        </button>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '6px 10px', fontSize: '0.75rem', color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.3)' }}
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          title="Delete user"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE LOGIN CREDENTIALS MODAL */}
      {createModalOpen && (
        <div className="modal-backdrop admin-user-modal" data-view-only={viewOnly} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
        }}>
          <div className="modal-content" style={{
            background: 'var(--dark-800)', border: '1px solid var(--dark-700)',
            borderRadius: '16px', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={20} color="var(--brand-400)" />
                Create New Login Credentials
              </h2>
              <button onClick={() => setCreateModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Create an account with login credentials for Sathya Bio. The user can immediately log in on <code>sathyambio.com</code> or staff portals.
            </p>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Full Name *</label>
                <input
                  required
                  placeholder="e.g. Rameshwar Patel"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--dark-900)', border: '1px solid var(--dark-700)', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Mobile Number *</label>
                  <input
                    required
                    placeholder="e.g. 9876543210"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--dark-900)', border: '1px solid var(--dark-700)', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. farmer@farm.in"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--dark-900)', border: '1px solid var(--dark-700)', color: '#fff' }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Login Password *</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={() => { setForm({ ...form, password: generateStrongPassword() }); setShowPassword(true) }}
                      style={{ background: 'transparent', border: 'none', color: 'var(--brand-400)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <RefreshCw size={12} /> Generate
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--brand-400)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      {showPassword ? <EyeOff size={12} /> : <Eye size={12} />} {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  placeholder={passwordPlaceholder(form.role)}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  autoComplete="new-password"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--dark-900)', border: '1px solid var(--dark-700)', color: '#fff', letterSpacing: showPassword ? 'normal' : '2px' }}
                />
                <PasswordChecklist password={form.password} role={form.role} phone={form.phone} />
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>Copy this password before saving: it cannot be viewed again afterwards.</div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>User System Role</label>
                <select
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--dark-900)', border: '1px solid var(--dark-700)', color: '#fff' }}
                >
                  <option value="farmer">Farmer (Customer E-Commerce & Advisory)</option>
                  <option value="employee">Employee / Agronomist Staff</option>
                  <option value="delivery">Delivery Agent (Field Dispatch)</option>
                  <option value="billing">Billing Operator (POS GST Invoice)</option>
                  <option value="admin">System Administrator</option>
                </select>
              </div>

              {form.role === 'farmer' ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Primary Crop</label>
                      <select
                        value={form.crop}
                        onChange={e => setForm({ ...form, crop: e.target.value })}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--dark-900)', border: '1px solid var(--dark-700)', color: '#fff' }}
                      >
                        <option value="Paddy / Rice">Paddy / Rice</option>
                        <option value="Cotton">Cotton</option>
                        <option value="Tomato">Tomato / Vegetables</option>
                        <option value="Wheat">Wheat</option>
                        <option value="Sugarcane">Sugarcane</option>
                        <option value="Corn / Maize">Corn / Maize</option>
                        <option value="Grapes / Fruits">Grapes / Fruits</option>
                        <option value="All Crops">All Crops (General)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Land Size (Acres)</label>
                      <input
                        type="number"
                        min="1"
                        value={form.acreage}
                        onChange={e => setForm({ ...form, acreage: e.target.value })}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--dark-900)', border: '1px solid var(--dark-700)', color: '#fff' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Village / Town</label>
                      <input
                        placeholder="e.g. Karur"
                        value={form.village}
                        onChange={e => setForm({ ...form, village: e.target.value })}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--dark-900)', border: '1px solid var(--dark-700)', color: '#fff' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>District</label>
                      <input
                        placeholder="e.g. Coimbatore"
                        value={form.district}
                        onChange={e => setForm({ ...form, district: e.target.value })}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--dark-900)', border: '1px solid var(--dark-700)', color: '#fff' }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Department / Specialty</label>
                  <input
                    placeholder="e.g. Quality Control, Dispatch Hub 1, Agronomy Specialist"
                    value={form.department}
                    onChange={e => setForm({ ...form, department: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--dark-900)', border: '1px solid var(--dark-700)', color: '#fff' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setCreateModalOpen(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  Save & Issue Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER CREDENTIALS MODAL */}
      {editModalOpen && selectedUser && (
        <div className="modal-backdrop admin-user-modal" data-view-only={viewOnly} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
        }}>
          <div className="modal-content" style={{
            background: 'var(--dark-800)', border: '1px solid var(--dark-700)',
            borderRadius: '16px', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={18} color="var(--brand-400)" />
                  {viewOnly ? 'Customer Profile' : `Update User: ${selectedUser.name}`}
              </h2>
              <button onClick={() => setEditModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            {viewOnly && <div className="admin-customer-profile-summary">
              {profileFields.map(field => <div key={field.id}><span>{field.title}</span><strong>{selectedUser.profile?.[field.id] ?? selectedUser[field.id] ?? 'Not provided'}</strong></div>)}
            </div>}

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Full Name</label>
                <input
                  required
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--dark-900)', border: '1px solid var(--dark-700)', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Mobile Phone</label>
                  <input
                    value={editForm.phone}
                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--dark-900)', border: '1px solid var(--dark-700)', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Email</label>
                  <input
                    value={editForm.email}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--dark-900)', border: '1px solid var(--dark-700)', color: '#fff' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Reset Login Password (leave empty to keep current)
                </label>
                <input
                  type="text"
                  placeholder={`New password (${passwordPlaceholder(editForm.role)})`}
                  value={editForm.password}
                  onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                  autoComplete="new-password"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--dark-900)', border: '1px solid var(--dark-700)', color: '#fff' }}
                />
                {editForm.password && <PasswordChecklist password={editForm.password} role={editForm.role} phone={editForm.phone} />}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Role</label>
                  <select
                    value={editForm.role}
                    onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--dark-900)', border: '1px solid var(--dark-700)', color: '#fff' }}
                  >
                    <option value="farmer">Farmer</option>
                    <option value="employee">Employee</option>
                    <option value="delivery">Delivery</option>
                    <option value="billing">Billing</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Account Status</label>
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--dark-900)', border: '1px solid var(--dark-700)', color: '#fff' }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive / Suspended</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setEditModalOpen(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                {!viewOnly && <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  Save Changes
                </button>}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
