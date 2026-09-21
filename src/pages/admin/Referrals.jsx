import { useEffect, useState, useMemo } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import {
  Gift, Users, Award, Plus, Edit2, Search, RefreshCw,
  FileSpreadsheet, ArrowRightLeft, ShieldCheck, UserCheck, PlusCircle
} from 'lucide-react'

export default function AdminReferrals() {
  const [referrals, setReferrals] = useState([])
  const [ledgers, setLedgers] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState('referrals') // 'referrals' | 'points' | 'ledgers'
  const [search, setSearch] = useState('')

  // Assign points modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [assignForm, setAssignForm] = useState({
    userId: '',
    points: 100,
    description: 'Referral reward points credited by administrator'
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/admin/referrals')
      if (data.success && data.data) {
        setReferrals(data.data.referrals || [])
        setLedgers(data.data.ledgers || [])
        setUsers(data.data.users || [])
      }
    } catch (err) {
      console.error('Error loading referral data:', err)
      toast.error('Failed to load referral data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const openAssignModal = (user = null) => {
    setAssignForm({
      userId: user?.id || (users[0]?.id || ''),
      points: 100,
      description: user ? `Referral reward bonus for ${user.name}` : 'Admin assigned reward points'
    })
    setAssignModalOpen(true)
  }

  const handleAssignPoints = async (e) => {
    e.preventDefault()
    if (!assignForm.userId || !assignForm.points) {
      toast.error('Please select customer and points amount')
      return
    }

    try {
      const { data } = await axios.post('/api/admin/referrals/assign-points', assignForm)
      if (data.success) {
        toast.success(data.message || 'Reward points updated successfully!')
        fetchData()
        setAssignModalOpen(false)
      }
    } catch (err) {
      console.error('Assign points error:', err)
      toast.error(err.response?.data?.message || 'Failed to assign points')
    }
  }

  // Filtered lists
  const filteredReferrals = useMemo(() => {
    if (!search.trim()) return referrals
    const q = search.toLowerCase()
    return referrals.filter(r =>
      (r.referrerName && r.referrerName.toLowerCase().includes(q)) ||
      (r.referrerPhone && r.referrerPhone.includes(q)) ||
      (r.referredName && r.referredName.toLowerCase().includes(q)) ||
      (r.referredPhone && r.referredPhone.includes(q))
    )
  }, [referrals, search])

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users
    const q = search.toLowerCase()
    return users.filter(u =>
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q)) ||
      (u.crop && u.crop.toLowerCase().includes(q))
    )
  }, [users, search])

  const filteredLedgers = useMemo(() => {
    if (!search.trim()) return ledgers
    const q = search.toLowerCase()
    return ledgers.filter(l =>
      (l.userName && l.userName.toLowerCase().includes(q)) ||
      (l.description && l.description.toLowerCase().includes(q))
    )
  }, [ledgers, search])

  const totalPointsDistributed = useMemo(() => {
    return users.reduce((sum, u) => sum + Number(u.points || 0), 0)
  }, [users])

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            🎁 Customer Referrals &amp; Reward Points
          </h1>
          <p>Monitor farmer-to-farmer referrals, assign reward points, and track points balances</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline" onClick={fetchData} title="Refresh referral data">
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => openAssignModal()} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <PlusCircle size={16} /> Assign / Edit Points
          </button>
        </div>
      </div>

      {/* SUMMARY STATS CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '22px' }}>
        <div className="card" style={{ padding: '16px 18px', borderLeft: '4px solid #8b5cf6', background: 'rgba(139, 92, 246, 0.08)' }}>
          <div style={{ fontSize: '0.8rem', color: '#c084fc', fontWeight: 600 }}>Total Farmer Referrals</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
            {referrals.length} Referrals
          </div>
        </div>
        <div className="card" style={{ padding: '16px 18px', borderLeft: '4px solid #10b981', background: 'rgba(16, 185, 129, 0.08)' }}>
          <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>Active Customer Accounts</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
            {users.length} Farmers
          </div>
        </div>
        <div className="card" style={{ padding: '16px 18px', borderLeft: '4px solid #f59e0b', background: 'rgba(245, 158, 11, 0.08)' }}>
          <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 600 }}>Total Reward Points Balance</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
            🌟 {totalPointsDistributed.toLocaleString()} Pts
          </div>
        </div>
      </div>

      {/* TABS & SEARCH */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '10px' }}>
          <button
            className={`btn ${activeTab === 'referrals' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('referrals')}
            style={{ fontSize: '0.88rem', padding: '8px 16px' }}
          >
            👥 Referral Network ({referrals.length})
          </button>
          <button
            className={`btn ${activeTab === 'points' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('points')}
            style={{ fontSize: '0.88rem', padding: '8px 16px' }}
          >
            🌟 Customer Points Balances ({users.length})
          </button>
          <button
            className={`btn ${activeTab === 'ledgers' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('ledgers')}
            style={{ fontSize: '0.88rem', padding: '8px 16px' }}
          >
            📜 Points Audit Log ({ledgers.length})
          </button>
        </div>

        <div className="search-box" style={{ minWidth: '240px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            style={{ width: '100%', paddingLeft: '38px' }}
            placeholder="Search farmer name, phone, crop..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* TAB 1: REFERRAL NETWORK */}
      {activeTab === 'referrals' && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>Referrer Farmer</th>
                  <th>Referrer Mobile</th>
                  <th>Referred New Farmer</th>
                  <th>Referred Mobile</th>
                  <th>Points Awarded</th>
                  <th>Status</th>
                  <th>Referral Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredReferrals.map((r, idx) => (
                  <tr key={r.id || idx}>
                    <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>👤 {r.referrerName}</td>
                    <td>
                      <span className="badge badge-green">📱 {r.referrerPhone}</span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#60a5fa' }}>🌾 {r.referredName}</td>
                    <td>
                      <span className="badge badge-blue">📱 {r.referredPhone}</span>
                    </td>
                    <td style={{ fontWeight: 800, color: '#f59e0b' }}>+ {r.pointsAwarded || 100} Pts</td>
                    <td><span className="badge badge-green">✅ {r.status || 'Completed'}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(r.createdAt || Date.now()).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </td>
                  </tr>
                ))}

                {filteredReferrals.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                      {loading ? 'Loading referral records...' : 'No referral network records match search.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CUSTOMER POINTS BALANCES & MANUAL ASSIGNMENT */}
      {activeTab === 'points' && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>Customer Name</th>
                  <th>Mobile Phone</th>
                  <th>Crop</th>
                  <th>Points Balance</th>
                  <th style={{ width: '150px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, idx) => (
                  <tr key={u.id || idx}>
                    <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>👤 {u.name || 'Farmer'}</td>
                    <td><span className="badge badge-green">📱 {u.phone}</span></td>
                    <td><span className="badge badge-blue">🌾 {u.crop || 'Paddy'}</span></td>
                    <td>
                      <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(245,158,11,0.3)' }}>
                        🌟 {Number(u.points || 0).toLocaleString()} Pts
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '4px 10px' }} onClick={() => openAssignModal(u)}>
                        <PlusCircle size={14} /> Adjust Points
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                      {loading ? 'Loading customer points...' : 'No customer accounts match search.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOG */}
      {activeTab === 'ledgers' && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>Customer</th>
                  <th>Points Change</th>
                  <th>Description</th>
                  <th>Transaction Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredLedgers.map((l, idx) => (
                  <tr key={l.id || idx}>
                    <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>👤 {l.userName}</td>
                    <td style={{ fontWeight: 800, color: l.points >= 0 ? '#34d399' : '#f87171' }}>
                      {l.points >= 0 ? `+${l.points}` : l.points} Pts
                    </td>
                    <td>{l.description}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(l.createdAt || Date.now()).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}

                {filteredLedgers.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                      {loading ? 'Loading points audit log...' : 'No points audit transactions available.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ASSIGN / ADJUST POINTS MODAL */}
      {assignModalOpen && (
        <div className="modal-overlay active" onClick={() => setAssignModalOpen(false)} style={{ background: 'rgba(0,0,0,0.7)', zIndex: 999 }}>
          <div className="modal-card animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>
                🌟 Assign / Adjust Reward Points
              </h2>
              <button className="btn btn-ghost" onClick={() => setAssignModalOpen(false)} style={{ fontSize: '1.2rem' }}>&times;</button>
            </div>

            <form onSubmit={handleAssignPoints} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="pform-field">
                <label>Select Customer Account *</label>
                <select
                  value={assignForm.userId}
                  onChange={e => setAssignForm({ ...assignForm, userId: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px' }}
                >
                  <option value="">Select customer...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      👤 {u.name || 'Farmer'} ({u.phone}) — Current: {u.points || 0} Pts
                    </option>
                  ))}
                </select>
              </div>

              <div className="pform-field">
                <label>Points to Add (+) or Deduct (-) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 100 or -50"
                  value={assignForm.points}
                  onChange={e => setAssignForm({ ...assignForm, points: Number(e.target.value) })}
                />
              </div>

              <div className="pform-field">
                <label>Reason / Note for Ledger</label>
                <input
                  type="text"
                  placeholder="e.g. Referral bonus for recommending new farmer"
                  value={assignForm.description}
                  onChange={e => setAssignForm({ ...assignForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <button type="button" className="btn btn-outline" onClick={() => setAssignModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Reward Points</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
