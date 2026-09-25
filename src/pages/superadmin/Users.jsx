import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'sonner'
import PasswordChecklist from '../../components/PasswordChecklist'
import PasswordError, { passwordBoxStyle, passwordErrorFrom } from '../../components/PasswordError'
import { isPasswordValid } from '../../utils/passwordRules'
import { Users, Plus, Search, Filter, ShieldCheck, MapPin, UserCheck, Key, Edit2, Trash2, CheckCircle, XCircle, ArrowRight, X } from 'lucide-react'

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
  const [passwordError, setPasswordError] = useState('')

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
    setPasswordError('')
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
    setPasswordError('')
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
    // Password problems go under the password box, not in a pop-up.
    if (!editingUser && !formData.password) {
      setPasswordError('Please enter a password for this account.')
      document.getElementById('personnelPassword')?.focus()
      return
    }
    if (formData.password && !isPasswordValid(formData.password, { role: formData.role, phone: formData.phone })) {
      setPasswordError('This password does not meet the rules listed under it.')
      document.getElementById('personnelPassword')?.focus()
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
      const onPassword = passwordErrorFrom(err)
      if (onPassword) {
        setPasswordError(onPassword)
        document.getElementById('personnelPassword')?.focus()
      } else toast.error(err.response?.data?.message || 'Failed to save personnel')
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

  // Role colours (presentation only).
  const roleTone = (role) => ({
    superadmin: 'sa-tone-violet',
    admin: 'sa-tone-rose',
    billing: 'sa-tone-teal',
    delivery: 'sa-tone-amber',
    employee: 'sa-tone-blue',
  }[role] || 'sa-tone-slate')

  return (
    <div className="sa-page">
      {/* Header bar */}
      <div className="sa-page-head">
        <div>
          <div className="sa-eyebrow"><Users size={14} /> Access & Hierarchy</div>
          <h1 className="sa-title">Personnel & Multi-Store Hierarchy</h1>
          <p className="sa-subtitle">
            Create and supervise Admins, Billing staff, Delivery agents, and ERP Employees. Each person is scoped to a Store Location and reports to that store's Admin.
          </p>
        </div>
        <div className="sa-actions">
          <button onClick={handleOpenAdd} className="sa-btn sa-btn--primary">
            <Plus size={18} /> Add New Personnel
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="sa-toolbar">
        <label className="sa-search">
          <Search size={18} />
          <input
            type="text"
            className="sa-input"
            placeholder="Search by name, phone, email, or store location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        {/* Role Filter */}
        <label className="sa-inline-label">
          Role
          <select className="sa-select" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
            <option value="all">All Roles</option>
            <option value="admin">Store Admins</option>
            <option value="billing">Billing Staff</option>
            <option value="delivery">Delivery Agents</option>
            <option value="employee">Employees</option>
            <option value="superadmin">Super Admin</option>
          </select>
        </label>

        {/* Store Filter */}
        <label className="sa-inline-label">
          Store
          <select className="sa-select" value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)}>
            <option value="all">All Store Locations</option>
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.location})</option>
            ))}
          </select>
        </label>
      </div>

      {/* Users Table */}
      <section className="sa-card" style={{ overflow: 'hidden' }}>
        <div className="sa-card-head">
          <div>
            <h2 className="sa-card-title">Team directory</h2>
            <div className="sa-card-sub">{filteredUsers.length} of {users.length} people</div>
          </div>
        </div>
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Personnel</th>
                <th>Role</th>
                <th>Store Location</th>
                <th>Hierarchy (Reports To)</th>
                <th>Portal Permissions</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id}>
                  {/* Name & Contact */}
                  <td>
                    <div className="sa-cell-person">
                      <div className={`sa-avatar ${roleTone(u.role)}`}>{u.name ? u.name[0] : 'U'}</div>
                      <div>
                        <div className="sa-cell-title">{u.name}</div>
                        <div className="sa-cell-sub">{u.phone || u.email || 'No contact'}</div>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td>
                    <span className={`sa-badge sa-badge--caps ${roleTone(u.role)}`}>{u.role}</span>
                  </td>

                  {/* Store Location */}
                  <td>
                    {u.storeName ? (
                      <div>
                        <div className="sa-cell-title" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <MapPin size={13} /> {u.storeName}
                        </div>
                        <div className="sa-cell-sub" style={{ paddingLeft: '18px' }}>{u.storeLocation || 'Tamil Nadu'}</div>
                      </div>
                    ) : (
                      <span className="sa-italic">
                        {u.role === 'superadmin' ? 'Global (All Stores)' : 'Unassigned'}
                      </span>
                    )}
                  </td>

                  {/* Hierarchy (Reports To) */}
                  <td>
                    {u.role === 'superadmin' ? (
                      <span className="sa-badge sa-tone-violet">Root Authority</span>
                    ) : u.role === 'admin' ? (
                      <span className="sa-badge sa-tone-blue">Reports to Super Admin</span>
                    ) : u.assignedAdminName ? (
                      <span className="sa-cell-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <UserCheck size={14} color="#0b7a4b" /> {u.assignedAdminName}
                      </span>
                    ) : (
                      <span className="sa-italic">Store Head</span>
                    )}
                  </td>

                  {/* Portal Permissions */}
                  <td>
                    {u.role === 'superadmin' ? (
                      <span className="sa-badge sa-tone-violet">All Modules (Root)</span>
                    ) : (
                      <Link to={`/superadmin/permissions?userId=${u.id}`} className="sa-btn sa-btn--ghost sa-btn--sm">
                        <ShieldCheck size={13} />
                        {u.permissions?.length ? `${u.permissions.length} modules visible` : 'Default visibility'}
                        <ArrowRight size={12} />
                      </Link>
                    )}
                  </td>

                  {/* Status */}
                  <td>
                    <span className={`sa-badge ${(u.status || 'active') === 'active' ? 'sa-tone-green' : 'sa-tone-rose'}`}>
                      <span className="sa-dot"></span>
                      {(u.status || 'active') === 'active' ? 'Active' : 'Disabled'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button onClick={() => handleOpenEdit(u)} title="Edit User" className="sa-icon-btn">
                        <Edit2 size={15} />
                      </button>
                      <Link to={`/superadmin/permissions?userId=${u.id}`} title="Configure Visible Features" className="sa-icon-btn">
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
          <div className="sa-empty">
            <div className="sa-empty-icon"><Users size={26} /></div>
            <div className="sa-empty-title">No personnel found matching criteria.</div>
            <div className="sa-empty-text">Try another role, store or search term.</div>
          </div>
        )}
      </section>

      {/* Add / Edit Personnel Modal */}
      {isModalOpen && (
        <div className="sa-modal-overlay">
          <div className="sa-modal" role="dialog" aria-modal="true">
            <div className="sa-modal-head">
              <div>
                <div className="sa-eyebrow">{editingUser ? 'Update account' : 'New account'}</div>
                <h2 className="sa-card-title">{editingUser ? 'Edit Personnel' : 'Add New Personnel'}</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="sa-icon-btn" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="sa-modal-form">
              <div className="sa-modal-body">
                <div className="sa-form-grid">
                  {/* Role Selection */}
                  <div className="sa-field sa-span-2">
                    <label className="sa-label">Assign Role *</label>
                    <select
                      className="sa-select"
                      style={{ width: '100%' }}
                      disabled={editingUser?.role === 'superadmin'}
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    >
                      <option value="admin">Store Admin (Location Manager)</option>
                      <option value="billing">Billing Staff (POS Counter)</option>
                      <option value="delivery">Delivery Personnel</option>
                      <option value="employee">ERP Employee (Operations)</option>
                    </select>
                  </div>

                  {/* Full Name */}
                  <div className="sa-field sa-span-2">
                    <label className="sa-label">Full Name *</label>
                    <input
                      type="text"
                      required
                      className="sa-input"
                      placeholder="e.g. Ramesh Kumar"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  {/* Mobile & Email */}
                  <div className="sa-field">
                    <label className="sa-label">Mobile Number *</label>
                    <input
                      type="text"
                      required
                      className="sa-input"
                      placeholder="10-digit mobile"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="sa-field">
                    <label className="sa-label">Email Address</label>
                    <input
                      type="email"
                      className="sa-input"
                      placeholder="name@sathyambio.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  {/* Password */}
                  <div className="sa-field sa-span-2">
                    <label htmlFor="personnelPassword" className="sa-label">
                      {editingUser ? 'New Password (leave empty to keep current)' : 'Login Password *'}
                    </label>
                    <input
                      id="personnelPassword"
                      type="password"
                      className="sa-input"
                      autoComplete="new-password"
                      placeholder={editingUser ? 'Enter new password or leave blank' : 'Enter account password'}
                      value={formData.password}
                      onChange={(e) => { setFormData({ ...formData, password: e.target.value }); setPasswordError('') }}
                      aria-invalid={passwordError ? 'true' : undefined}
                      aria-describedby={passwordError ? 'personnelPassword-error' : undefined}
                      style={passwordBoxStyle({}, passwordError)}
                    />
                    <PasswordError id="personnelPassword" message={passwordError} />
                    {(formData.password || !editingUser) && <PasswordChecklist password={formData.password} role={formData.role} phone={formData.phone} />}
                  </div>

                  {/* Store Location Assignment */}
                  <div className="sa-span-2 sa-form-panel">
                    <div className="sa-field">
                      <label className="sa-label">Represented Store Location *</label>
                      <select
                        className="sa-select"
                        style={{ width: '100%' }}
                        value={formData.storeId}
                        onChange={(e) => handleStoreChange(e.target.value)}
                      >
                        <option value="">-- Select Store Branch --</option>
                        {stores.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.location})</option>
                        ))}
                      </select>
                    </div>

                    {/* Hierarchy: Belongs to specific store admin */}
                    {formData.role !== 'admin' && formData.role !== 'superadmin' && (
                      <div className="sa-field">
                        <label className="sa-label">Reporting Admin (Belongs to Location Head)</label>
                        <select
                          className="sa-select"
                          style={{ width: '100%' }}
                          value={formData.assignedAdminId}
                          onChange={(e) => handleAdminChange(e.target.value)}
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
                  <div className="sa-field">
                    <label className="sa-label">Department / Tag</label>
                    <input
                      type="text"
                      className="sa-input"
                      placeholder="e.g. Counter Sales, Dispatch, Agronomy"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    />
                  </div>
                  <div className="sa-field">
                    <label className="sa-label">Account Status</label>
                    <select
                      className="sa-select"
                      style={{ width: '100%' }}
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Disabled</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="sa-modal-foot">
                <button type="button" onClick={() => setIsModalOpen(false)} className="sa-btn sa-btn--ghost">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="sa-btn sa-btn--primary">
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
