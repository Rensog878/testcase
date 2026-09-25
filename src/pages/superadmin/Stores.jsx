import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import { Store, Plus, Search, MapPin, Phone, Mail, UserCheck, Users, Edit2, Trash2, CheckCircle, XCircle, X } from 'lucide-react'

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
    <div className="sa-page">
      {/* Header bar */}
      <div className="sa-page-head">
        <div>
          <div className="sa-eyebrow"><Store size={14} /> Branch Network</div>
          <h1 className="sa-title">Store Locations & Regional Hubs</h1>
          <p className="sa-subtitle">
            Manage brick-and-mortar stores, assign regional head administrators, and view branch personnel counts.
          </p>
        </div>
        <div className="sa-actions">
          <button onClick={handleOpenAdd} className="sa-btn sa-btn--primary">
            <Plus size={18} /> Add Store Location
          </button>
        </div>
      </div>

      {/* Search and filter bar */}
      <div className="sa-toolbar">
        <label className="sa-search">
          <Search size={18} />
          <input
            type="text"
            className="sa-input"
            placeholder="Search by store name, location, code, or administrator..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <span className="sa-badge sa-tone-green">{filteredStores.length} of {stores.length} stores</span>
      </div>

      {/* Store Grid */}
      {filteredStores.length > 0 && (
        <div className="sa-store-grid">
          {filteredStores.map(store => (
            <article key={store.id} className="sa-card sa-store-card">
              <div className="sa-store-top">
                <div className="sa-store-icon"><Store size={20} /></div>
                <div className="sa-store-heading">
                  <div className="sa-store-tags">
                    <span className="sa-code">{store.code}</span>
                    <span className={`sa-badge ${store.status === 'active' ? 'sa-tone-green' : 'sa-tone-rose'}`}>
                      <span className="sa-dot"></span>
                      {store.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <h3 className="sa-store-name">{store.name}</h3>
                  <div className="sa-store-loc"><MapPin size={14} /> {store.location}</div>
                </div>
                <div className="sa-store-tools">
                  <button onClick={() => handleOpenEdit(store)} title="Edit Store" className="sa-icon-btn">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(store)} title="Delete Store" className="sa-icon-btn sa-icon-btn--danger">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Address & Contact */}
              {store.address && <p className="sa-store-address">{store.address}</p>}

              {(store.phone || store.email) && (
                <div className="sa-store-contact">
                  {store.phone && <span><Phone size={14} /> {store.phone}</span>}
                  {store.email && <span><Mail size={14} /> {store.email}</span>}
                </div>
              )}

              {/* Assigned Head Admin */}
              <div className="sa-store-admin">
                <div className="sa-avatar sa-tone-blue">{store.adminName ? store.adminName[0] : '?'}</div>
                <div className="sa-row-main">
                  <div className="sa-hint">Assigned Store Admin</div>
                  <div className="sa-cell-title">{store.adminName || 'No Admin Assigned'}</div>
                  {store.adminId && <div className="sa-cell-sub">ID: {store.adminId}</div>}
                </div>
              </div>

              {/* Staff distribution footer */}
              <div className="sa-store-foot">
                <div className="sa-store-count"><Users size={15} /> <strong>{store.staffCount || 0}</strong> Personnel</div>
                <div className="sa-store-mix">
                  <span title="Admins" className="sa-badge sa-tone-blue">A {store.adminCount || 0}</span>
                  <span title="Billing" className="sa-badge sa-tone-green">B {store.billingCount || 0}</span>
                  <span title="Delivery" className="sa-badge sa-tone-amber">D {store.deliveryCount || 0}</span>
                  <span title="Employee" className="sa-badge sa-tone-violet">E {store.employeeCount || 0}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {filteredStores.length === 0 && !loading && (
        <div className="sa-card">
          <div className="sa-empty">
            <div className="sa-empty-icon"><Store size={28} /></div>
            <div className="sa-empty-title">No stores match your search</div>
            <div className="sa-empty-text">Try clearing your search query or add a new store location.</div>
            <button onClick={handleOpenAdd} className="sa-btn sa-btn--primary sa-btn--sm"><Plus size={16} /> Add Store Location</button>
          </div>
        </div>
      )}

      {/* Add / Edit Store Modal */}
      {isModalOpen && (
        <div className="sa-modal-overlay">
          <div className="sa-modal" role="dialog" aria-modal="true">
            <div className="sa-modal-head">
              <div>
                <div className="sa-eyebrow">{editingStore ? 'Update branch' : 'New branch'}</div>
                <h2 className="sa-card-title">{editingStore ? 'Edit Store Location' : 'Add New Store Location'}</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="sa-icon-btn" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="sa-modal-form">
              <div className="sa-modal-body">
                <div className="sa-form-grid">
                  <div className="sa-field">
                    <label className="sa-label">Store Name *</label>
                    <input
                      type="text"
                      required
                      className="sa-input"
                      placeholder="e.g. Madurai Regional Hub"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="sa-field">
                    <label className="sa-label">Store Code</label>
                    <input
                      type="text"
                      className="sa-input"
                      placeholder="e.g. MDU-01"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    />
                  </div>

                  <div className="sa-field sa-span-2">
                    <label className="sa-label">City / Location *</label>
                    <input
                      type="text"
                      required
                      className="sa-input"
                      placeholder="e.g. Madurai, Coimbatore, Tiruppur"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>

                  <div className="sa-field sa-span-2">
                    <label className="sa-label">Full Physical Address</label>
                    <textarea
                      rows={2}
                      className="sa-textarea"
                      placeholder="Street address, landmarks, pincode..."
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>

                  <div className="sa-field">
                    <label className="sa-label">Contact Phone</label>
                    <input
                      type="text"
                      className="sa-input"
                      placeholder="e.g. 0452-2500100"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="sa-field">
                    <label className="sa-label">Contact Email</label>
                    <input
                      type="email"
                      className="sa-input"
                      placeholder="store@sathyambio.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div className="sa-field">
                    <label className="sa-label">Assign Head Admin</label>
                    <select
                      className="sa-select"
                      style={{ width: '100%' }}
                      value={formData.adminId}
                      onChange={(e) => setFormData({ ...formData, adminId: e.target.value })}
                    >
                      <option value="">-- No Admin Assigned --</option>
                      {admins.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.phone || a.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sa-field">
                    <label className="sa-label">Branch Status</label>
                    <select
                      className="sa-select"
                      style={{ width: '100%' }}
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="sa-modal-foot">
                <button type="button" onClick={() => setIsModalOpen(false)} className="sa-btn sa-btn--ghost">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="sa-btn sa-btn--primary">
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
