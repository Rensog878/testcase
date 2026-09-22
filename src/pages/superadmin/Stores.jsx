import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import { Store, Plus, Search, MapPin, Phone, Mail, UserCheck, Users, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react'

export default function StoresManagement() {
  const [stores, setStores] = useState([])
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStore, setEditingStore] = useState(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    location: '',
    address: '',
    phone: '',
    email: '',
    adminId: '',
    status: 'active'
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [storesRes, usersRes] = await Promise.all([
        axios.get('/api/superadmin/stores'),
        axios.get('/api/superadmin/users?role=admin')
      ])
      if (storesRes.data?.success) setStores(storesRes.data.data || [])
      if (usersRes.data?.success) setAdmins(usersRes.data.data || [])
    } catch (err) {
      toast.error('Failed to load stores: ' + (err.response?.data?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAdd = () => {
    setEditingStore(null)
    setFormData({
      name: '',
      code: '',
      location: '',
      address: '',
      phone: '',
      email: '',
      adminId: '',
      status: 'active'
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (store) => {
    setEditingStore(store)
    setFormData({
      name: store.name || '',
      code: store.code || '',
      location: store.location || '',
      address: store.address || '',
      phone: store.phone || '',
      email: store.email || '',
      adminId: store.adminId || '',
      status: store.status || 'active'
    })
    setIsModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!formData.name || !formData.location) {
      toast.error('Please enter store name and location.')
      return
    }

    setSaving(true)
    try {
      const selectedAdmin = admins.find(a => a.id === formData.adminId)
      const payload = {
        ...formData,
        adminName: selectedAdmin ? selectedAdmin.name : ''
      }

      if (editingStore) {
        const res = await axios.put(`/api/superadmin/stores/${editingStore.id}`, payload)
        if (res.data?.success) {
          toast.success(`Store "${payload.name}" updated successfully`)
        }
      } else {
        const res = await axios.post('/api/superadmin/stores', payload)
        if (res.data?.success) {
          toast.success(`Store "${payload.name}" created successfully`)
        }
      }
      setIsModalOpen(false)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save store')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (store) => {
    if (!window.confirm(`Are you sure you want to delete store "${store.name}"? This action cannot be undone.`)) {
      return
    }
    try {
      const res = await axios.delete(`/api/superadmin/stores/${store.id}`)
      if (res.data?.success) {
        toast.success(`Store "${store.name}" deleted`)
        fetchData()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete store')
    }
  }

  const filteredStores = stores.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.location?.toLowerCase().includes(search.toLowerCase()) ||
    s.code?.toLowerCase().includes(search.toLowerCase()) ||
    s.adminName?.toLowerCase().includes(search.toLowerCase())
  )

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
            Store Locations & Regional Hubs
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '4px 0 0' }}>
            Manage brick-and-mortar stores, assign regional head administrators, and view branch personnel counts.
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
          <Plus size={18} /> Add Store Location
        </button>
      </div>

      {/* Search and filter bar */}
      <div style={{
        background: '#ffffff',
        padding: '16px 20px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <Search size={18} color="#94a3b8" />
        <input
          type="text"
          placeholder="Search by store name, location, code, or administrator..."
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

      {/* Store Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
        gap: '20px'
      }}>
        {filteredStores.map(store => (
          <div
            key={store.id}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative'
            }}
          >
            <div>
              {/* Store title & status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '6px' }}>
                      {store.code}
                    </span>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: store.status === 'active' ? '#ecfdf5' : '#fef2f2',
                      color: store.status === 'active' ? '#059669' : '#dc2626'
                    }}>
                      {store.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', margin: '8px 0 2px' }}>
                    {store.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b', fontSize: '0.82rem' }}>
                    <MapPin size={14} color="#64748b" /> {store.location}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => handleOpenEdit(store)}
                    title="Edit Store"
                    style={{ background: '#f1f5f9', border: 'none', padding: '7px', borderRadius: '8px', cursor: 'pointer', color: '#334155' }}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(store)}
                    title="Delete Store"
                    style={{ background: '#fef2f2', border: 'none', padding: '7px', borderRadius: '8px', cursor: 'pointer', color: '#dc2626' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Address & Contact */}
              {store.address && (
                <p style={{ fontSize: '0.82rem', color: '#475569', margin: '8px 0 12px', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', lineHeight: 1.4 }}>
                  {store.address}
                </p>
              )}

              <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                {store.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={14} /> {store.phone}
                  </div>
                )}
                {store.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail size={14} /> {store.email}
                  </div>
                )}
              </div>

              {/* Assigned Head Admin */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #edf2f7',
                borderRadius: '10px',
                padding: '12px',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}>
                  Assigned Store Admin
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#dbeafe', color: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.78rem' }}>
                    {store.adminName ? store.adminName[0] : '?'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1e293b' }}>
                      {store.adminName || 'No Admin Assigned'}
                    </div>
                    {store.adminId && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>ID: {store.adminId}</div>}
                  </div>
                </div>
              </div>
            </div>

            {/* Staff distribution footer */}
            <div style={{
              borderTop: '1px solid #f1f5f9',
              paddingTop: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.78rem',
              color: '#475569'
            }}>
              <div>
                <strong>{store.staffCount || 0}</strong> Personnel
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span title="Admins" style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                  A: {store.adminCount || 0}
                </span>
                <span title="Billing" style={{ background: '#f0fdf4', color: '#15803d', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                  B: {store.billingCount || 0}
                </span>
                <span title="Delivery" style={{ background: '#fff7ed', color: '#c2410c', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                  D: {store.deliveryCount || 0}
                </span>
                <span title="Employee" style={{ background: '#f5f3ff', color: '#6d28d9', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                  E: {store.employeeCount || 0}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredStores.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <Store size={44} color="#94a3b8" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.2rem', color: '#1e293b', fontWeight: 700 }}>No stores match your search</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Try clearing your search query or add a new store location.</p>
        </div>
      )}

      {/* Add / Edit Store Modal */}
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
            maxWidth: '540px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                {editingStore ? 'Edit Store Location' : 'Add New Store Location'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Store Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Madurai Regional Hub"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Store Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MDU-01"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  City / Location *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Madurai, Coimbatore, Tiruppur"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Full Physical Address
                </label>
                <textarea
                  rows={2}
                  placeholder="Street address, landmarks, pincode..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 0452-2500100"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Contact Email
                  </label>
                  <input
                    type="email"
                    placeholder="store@sathyambio.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Assign Head Admin
                  </label>
                  <select
                    value={formData.adminId}
                    onChange={(e) => setFormData({ ...formData, adminId: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', background: '#ffffff' }}
                  >
                    <option value="">-- No Admin Assigned --</option>
                    {admins.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.phone || a.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Branch Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', background: '#ffffff' }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
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
                  {saving ? 'Saving...' : (editingStore ? 'Update Store' : 'Create Store')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
