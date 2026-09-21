import { useEffect, useState, useMemo } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import {
  Ticket, Plus, Edit2, Trash2, CheckCircle2, XCircle, Search,
  RefreshCw, FileSpreadsheet, Percent, IndianRupee, ShieldAlert,
  Users, Award, Calendar, DollarSign
} from 'lucide-react'

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([])
  const [usages, setUsages] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('coupons') // 'coupons' | 'usages'
  const [search, setSearch] = useState('')

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    code: '',
    type: 'percentage',
    value: 10,
    minOrder: 500,
    maxDiscount: 300,
    usageType: 'multiple', // 'first_time' | 'one_time' | 'multiple'
    active: true
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [resCoupons, resUsages] = await Promise.all([
        axios.get('/api/admin/coupons'),
        axios.get('/api/admin/coupon-usages')
      ])
      if (resCoupons.data.success) setCoupons(resCoupons.data.data || [])
      if (resUsages.data.success) setUsages(resUsages.data.data || [])
    } catch (err) {
      console.error('Error loading coupon data:', err)
      toast.error('Failed to load coupons')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const openAddModal = () => {
    setEditingId(null)
    setForm({
      code: '',
      type: 'percentage',
      value: 10,
      minOrder: 500,
      maxDiscount: 300,
      usageType: 'multiple',
      active: true
    })
    setModalOpen(true)
  }

  const openEditModal = (coupon) => {
    setEditingId(coupon.id)
    setForm({
      code: coupon.code,
      type: coupon.type || 'percentage',
      value: coupon.value || 0,
      minOrder: coupon.minOrder || 0,
      maxDiscount: coupon.maxDiscount || 0,
      usageType: coupon.usageType || 'multiple',
      active: coupon.active !== false
    })
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.code.trim() || form.value === '') {
      toast.error('Please enter coupon code and discount value')
      return
    }

    try {
      if (editingId) {
        const { data } = await axios.put(`/api/admin/coupons/${editingId}`, form)
        if (data.success) {
          toast.success(data.message || 'Coupon updated successfully!')
          fetchData()
          setModalOpen(false)
        }
      } else {
        const { data } = await axios.post('/api/admin/coupons', form)
        if (data.success) {
          toast.success(data.message || 'New coupon created!')
          fetchData()
          setModalOpen(false)
        }
      }
    } catch (err) {
      console.error('Save coupon error:', err)
      toast.error(err.response?.data?.message || 'Error saving coupon')
    }
  }

  const handleDelete = async (id, code) => {
    if (!window.confirm(`Are you sure you want to delete coupon "${code}"?`)) return
    try {
      const { data } = await axios.delete(`/api/admin/coupons/${id}`)
      if (data.success) {
        toast.success(`Coupon "${code}" deleted`)
        fetchData()
      }
    } catch (err) {
      toast.error('Failed to delete coupon')
    }
  }

  const toggleActive = async (coupon) => {
    try {
      const nextActive = !coupon.active
      const { data } = await axios.put(`/api/admin/coupons/${coupon.id}`, { active: nextActive })
      if (data.success) {
        toast.success(`Coupon "${coupon.code}" is now ${nextActive ? 'Active' : 'Disabled'}`)
        setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, active: nextActive } : c))
      }
    } catch (err) {
      toast.error('Could not toggle coupon status')
    }
  }

  // Filtered lists
  const filteredCoupons = useMemo(() => {
    if (!search.trim()) return coupons
    const q = search.toLowerCase()
    return coupons.filter(c => c.code.toLowerCase().includes(q))
  }, [coupons, search])

  const filteredUsages = useMemo(() => {
    if (!search.trim()) return usages
    const q = search.toLowerCase()
    return usages.filter(u =>
      (u.couponCode && u.couponCode.toLowerCase().includes(q)) ||
      (u.userName && u.userName.toLowerCase().includes(q)) ||
      (u.userPhone && u.userPhone.includes(q)) ||
      (u.orderId && u.orderId.toLowerCase().includes(q))
    )
  }, [usages, search])

  // Total metrics
  const totalDiscountGiven = useMemo(() => {
    return usages.reduce((sum, u) => sum + Number(u.discountAmount || 0), 0)
  }, [usages])

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            🎟️ Coupons &amp; Credit Monitoring
          </h1>
          <p>Create promotional discount codes and monitor customer credit redemptions</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline" onClick={fetchData} title="Refresh data">
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={openAddModal} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> Create New Coupon
          </button>
        </div>
      </div>

      {/* SUMMARY STATS CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '22px' }}>
        <div className="card" style={{ padding: '16px 18px', borderLeft: '4px solid #3b82f6', background: 'rgba(59, 130, 246, 0.05)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active Coupons</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
            {coupons.filter(c => c.active).length} / {coupons.length}
          </div>
        </div>
        <div className="card" style={{ padding: '16px 18px', borderLeft: '4px solid #10b981', background: 'rgba(16, 185, 129, 0.08)' }}>
          <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>Total Redemptions</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
            {usages.length} Times
          </div>
        </div>
        <div className="card" style={{ padding: '16px 18px', borderLeft: '4px solid #f59e0b', background: 'rgba(245, 158, 11, 0.08)' }}>
          <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 600 }}>Total Credit Discounts Granted</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
            ₹{totalDiscountGiven.toLocaleString()}
          </div>
        </div>
      </div>

      {/* TABS & SEARCH */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '10px' }}>
          <button
            className={`btn ${activeTab === 'coupons' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('coupons')}
            style={{ fontSize: '0.88rem', padding: '8px 16px' }}
          >
            🎟️ Coupon Codes ({coupons.length})
          </button>
          <button
            className={`btn ${activeTab === 'usages' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('usages')}
            style={{ fontSize: '0.88rem', padding: '8px 16px' }}
          >
            👥 Credit Monitor ({usages.length})
          </button>
        </div>

        <div className="search-box" style={{ minWidth: '240px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            style={{ width: '100%', paddingLeft: '38px' }}
            placeholder={activeTab === 'coupons' ? 'Search coupon code...' : 'Search farmer name, phone, coupon, order...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* TAB 1: COUPONS LIST */}
      {activeTab === 'coupons' && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>Coupon Code</th>
                  <th>Discount Offer</th>
                  <th>Usage Option</th>
                  <th>Min Order Total</th>
                  <th>Redemptions</th>
                  <th>Status</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCoupons.map((c, idx) => (
                  <tr key={c.id || idx}>
                    <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td>
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', letterSpacing: '0.5px', background: 'var(--surface-subtle, #f1f5f9)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(15, 23, 42, 0.12)' }}>
                        🎟️ {c.code}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: '#34d399' }}>
                        {c.type === 'percentage' ? `${c.value}% OFF` : `₹${c.value} FLAT OFF`}
                      </strong>
                      {c.type === 'percentage' && c.maxDiscount > 0 && (
                        <small style={{ display: 'block', color: 'var(--text-muted)' }}>Up to ₹{c.maxDiscount}</small>
                      )}
                    </td>
                    <td>
                      {c.usageType === 'first_time' && <span className="badge badge-blue">⚡ First Order Only</span>}
                      {c.usageType === 'one_time' && <span className="badge badge-green">🔒 One-Time Use</span>}
                      {c.usageType === 'multiple' && <span className="badge" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc' }}>🔄 Multiple Uses</span>}
                    </td>
                    <td>₹{c.minOrder ? c.minOrder.toLocaleString() : '0 (No Min)'}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.usageCount || 0} times</span>
                    </td>
                    <td>
                      <button
                        className={`badge ${c.active ? 'badge-green' : 'badge-red'}`}
                        style={{ cursor: 'pointer', border: 'none' }}
                        onClick={() => toggleActive(c)}
                        title="Click to toggle status"
                      >
                        {c.active ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={() => openEditModal(c)} title="Edit Coupon">
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-outline" style={{ padding: '4px 8px', color: '#ef4444' }} onClick={() => handleDelete(c.id, c.code)} title="Delete Coupon">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredCoupons.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                      {loading ? 'Loading coupons...' : 'No coupon codes match search.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CREDIT USAGE MONITORING */}
      {activeTab === 'usages' && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>Coupon Code</th>
                  <th>Customer Name</th>
                  <th>Mobile Phone</th>
                  <th>Order ID</th>
                  <th>Credit Discount (₹)</th>
                  <th>Redeemed Date &amp; Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsages.map((u, idx) => (
                  <tr key={u.id || idx}>
                    <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#60a5fa' }}>🎟️ {u.couponCode}</span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>👤 {u.userName || 'Customer'}</td>
                    <td>
                      <a href={`https://wa.me/91${(u.userPhone || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="badge badge-green" style={{ textDecoration: 'none' }}>
                        📱 {u.userPhone || '—'}
                      </a>
                    </td>
                    <td><span className="badge badge-blue">📦 {u.orderId || 'Direct/POS'}</span></td>
                    <td style={{ fontWeight: 800, color: '#34d399' }}>+ ₹{Number(u.discountAmount || 0).toLocaleString()}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(u.usedAt || Date.now()).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}

                {filteredUsages.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                      {loading ? 'Loading coupon credit redemptions...' : 'No credit usage logs match search.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="modal-overlay active" onClick={() => setModalOpen(false)} style={{ background: 'rgba(0,0,0,0.7)', zIndex: 999 }}>
          <div className="modal-card animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>
                {editingId ? '✏️ Edit Coupon Code' : '🎟️ Create New Coupon Code'}
              </h2>
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)} style={{ fontSize: '1.2rem' }}>&times;</button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="pform-field">
                <label>Coupon Code * <em>(uppercase without spaces)</em></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SATHYA10, HARVEST200"
                  value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                />
              </div>

              <div className="pform-grid-2">
                <div className="pform-field">
                  <label>Discount Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>

                <div className="pform-field">
                  <label>Discount Value *</label>
                  <input
                    type="number"
                    required
                    placeholder={form.type === 'percentage' ? '10' : '150'}
                    value={form.value}
                    onChange={e => setForm({ ...form, value: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="pform-grid-2">
                <div className="pform-field">
                  <label>Minimum Order Total (₹)</label>
                  <input
                    type="number"
                    placeholder="400"
                    value={form.minOrder}
                    onChange={e => setForm({ ...form, minOrder: Number(e.target.value) })}
                  />
                </div>

                <div className="pform-field">
                  <label>Max Discount Limit (₹)</label>
                  <input
                    type="number"
                    placeholder="300"
                    value={form.maxDiscount}
                    onChange={e => setForm({ ...form, maxDiscount: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="pform-field">
                <label>Usage Options / Restrictions *</label>
                <select value={form.usageType} onChange={e => setForm({ ...form, usageType: e.target.value })}>
                  <option value="multiple">🔄 Multiple Uses (Any Customer)</option>
                  <option value="first_time">⚡ First Time Order Only (New Farmers)</option>
                  <option value="one_time">🔒 One Time Use Per Customer</option>
                </select>
              </div>

              <div className="pform-field" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                <input
                  type="checkbox"
                  id="couponActiveCheck"
                  checked={form.active}
                  onChange={e => setForm({ ...form, active: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="couponActiveCheck" style={{ margin: 0, cursor: 'pointer', fontWeight: 600 }}>
                  Enable &amp; Activate Coupon Code
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Update Coupon' : 'Save & Activate Coupon'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
