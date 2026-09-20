import { useEffect, useState, useMemo } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import {
  Search, Filter, RefreshCw, Download, Phone, MapPin,
  Sprout, Calendar, Clock, AlertCircle, CheckCircle2,
  Eye, FileSpreadsheet, MessageSquare, User, Tag
} from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'Not Seen', label: '👁️ Not Seen', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.08)', border: '#60a5fa' },
  { value: 'Pending', label: '⏳ Pending', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)', border: '#f59e0b' },
  { value: 'Priority', label: '🚨 Priority', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.12)', border: '#f43f5e' },
  { value: 'Issue Solved', label: '✅ Issue Solved', color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', border: '#10b981' },
]

export default function AdminEnquiries() {
  const [enquiries, setEnquiries] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters & Search
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('date_desc') // date_desc, date_asc, location, crop, type
  const [statusFilter, setStatusFilter] = useState('all')
  const [timeRange, setTimeRange] = useState('overall') // overall, day, week, month
  const [cropFilter, setCropFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedEnquiry, setSelectedEnquiry] = useState(null)

  const fetchEnquiries = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/enquiries')
      if (data.success) {
        setEnquiries(data.data || [])
      }
    } catch (err) {
      console.error('Error loading enquiries:', err)
      toast.error('Failed to load farmer enquiries')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEnquiries()
  }, [])

  // Update enquiry status
  const handleStatusChange = async (id, newStatus) => {
    try {
      const { data } = await axios.put(`/api/enquiries/${id}`, { status: newStatus })
      if (data.success) {
        toast.success(`Enquiry status updated to "${newStatus}"`)
        setEnquiries(prev => prev.map(e => e.id === id ? { ...e, status: newStatus } : e))
        if (selectedEnquiry && selectedEnquiry.id === id) {
          setSelectedEnquiry(prev => ({ ...prev, status: newStatus }))
        }
      }
    } catch (err) {
      console.error('Error updating status:', err)
      toast.error('Could not update status')
    }
  }

  // Extract unique crops and types for filter dropdowns
  const uniqueCrops = useMemo(() => {
    const set = new Set()
    enquiries.forEach(e => { if (e.crop) set.add(e.crop.trim()) })
    return Array.from(set).sort()
  }, [enquiries])

  const uniqueTypes = useMemo(() => {
    const set = new Set()
    enquiries.forEach(e => { if (e.type) set.add(e.type.trim()) })
    return Array.from(set).sort()
  }, [enquiries])

  // Filter and sort enquiries logic
  const filteredAndSorted = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000
    const monthStart = todayStart - 30 * 24 * 60 * 60 * 1000

    let list = enquiries.filter(e => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase()
        const match =
          (e.name && e.name.toLowerCase().includes(q)) ||
          (e.phone && e.phone.includes(q)) ||
          (e.location && e.location.toLowerCase().includes(q)) ||
          (e.crop && e.crop.toLowerCase().includes(q)) ||
          (e.message && e.message.toLowerCase().includes(q)) ||
          (e.type && e.type.toLowerCase().includes(q))
        if (!match) return false
      }

      // Status
      if (statusFilter !== 'all') {
        const currentStatus = (e.status || 'Not Seen').toLowerCase().trim()
        if (currentStatus !== statusFilter.toLowerCase().trim()) return false
      }

      // Time Range
      const createdTime = new Date(e.createdAt || Date.now()).getTime()
      if (timeRange === 'day' && createdTime < todayStart) return false
      if (timeRange === 'week' && createdTime < weekStart) return false
      if (timeRange === 'month' && createdTime < monthStart) return false

      // Crop
      if (cropFilter !== 'all' && (e.crop || '').trim() !== cropFilter) return false

      // Type
      if (typeFilter !== 'all' && (e.type || '').trim() !== typeFilter) return false

      return true
    })

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      }
      if (sortBy === 'date_asc') {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
      }
      if (sortBy === 'location') {
        return (a.location || '').localeCompare(b.location || '')
      }
      if (sortBy === 'crop') {
        return (a.crop || '').localeCompare(b.crop || '')
      }
      if (sortBy === 'type') {
        return (a.type || '').localeCompare(b.type || '')
      }
      return 0
    })

    return list
  }, [enquiries, search, sortBy, statusFilter, timeRange, cropFilter, typeFilter])

  // Summary Counts
  const counts = useMemo(() => {
    let notSeen = 0, pending = 0, priority = 0, solved = 0
    enquiries.forEach(e => {
      const s = (e.status || 'Not Seen').toLowerCase().trim()
      if (s === 'not seen' || s === 'new' || !e.status) notSeen++
      else if (s === 'pending') pending++
      else if (s === 'priority') priority++
      else if (s === 'issue solved' || s === 'solved' || s === 'resolved') solved++
    })
    return { total: enquiries.length, notSeen, pending, priority, solved }
  }, [enquiries])

  // Export as Excel (.csv with UTF-8 BOM)
  const exportToExcel = () => {
    if (!filteredAndSorted.length) {
      toast.error('No enquiries available to export')
      return
    }

    const headers = ['#', 'Enquiry ID', 'Farmer Name', 'Mobile Phone', 'Location', 'Crop', 'Enquiry Type', 'Status', 'Date & Time', 'Message']
    const rows = filteredAndSorted.map((e, idx) => [
      idx + 1,
      `"${e.id || ''}"`,
      `"${(e.name || '').replace(/"/g, '""')}"`,
      `"${e.phone || ''}"`,
      `"${(e.location || '').replace(/"/g, '""')}"`,
      `"${(e.crop || '').replace(/"/g, '""')}"`,
      `"${(e.type || '').replace(/"/g, '""')}"`,
      `"${e.status || 'Not Seen'}"`,
      `"${new Date(e.createdAt).toLocaleString('en-IN')}"`,
      `"${(e.message || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
    ])

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Farmer_Enquiries_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(`Exported ${filteredAndSorted.length} enquiries to Excel format! 📊`)
  }

  // Get status styling
  const getStatusConfig = (rawStatus) => {
    const s = (rawStatus || 'Not Seen').toLowerCase().trim()
    if (s === 'issue solved' || s === 'solved' || s === 'resolved') {
      return STATUS_OPTIONS.find(o => o.value === 'Issue Solved')
    }
    if (s === 'priority') {
      return STATUS_OPTIONS.find(o => o.value === 'Priority')
    }
    if (s === 'pending') {
      return STATUS_OPTIONS.find(o => o.value === 'Pending')
    }
    return STATUS_OPTIONS.find(o => o.value === 'Not Seen')
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            📝 Farmer Enquiries
          </h1>
          <p>Real-time farmer crop queries, disease advice requests, and status resolution center</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline" onClick={fetchEnquiries} title="Refresh enquiries list">
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={exportToExcel} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileSpreadsheet size={16} /> Export to Excel
          </button>
        </div>
      </div>

      {/* SUMMARY STATS CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '22px' }}>
        <div className="card" style={{ padding: '16px 18px', borderLeft: '4px solid #3b82f6', background: 'rgba(59, 130, 246, 0.05)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Enquiries</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>{counts.total}</div>
        </div>
        <div className="card" style={{ padding: '16px 18px', borderLeft: '4px solid #60a5fa', background: 'rgba(96, 165, 250, 0.08)' }}>
          <div style={{ fontSize: '0.8rem', color: '#60a5fa', fontWeight: 600 }}>👁️ Not Seen</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#60a5fa', marginTop: '4px' }}>{counts.notSeen}</div>
        </div>
        <div className="card" style={{ padding: '16px 18px', borderLeft: '4px solid #f59e0b', background: 'rgba(245, 158, 11, 0.08)' }}>
          <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 600 }}>⏳ Pending</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>{counts.pending}</div>
        </div>
        <div className="card" style={{ padding: '16px 18px', borderLeft: '4px solid #f43f5e', background: 'rgba(244, 63, 94, 0.12)' }}>
          <div style={{ fontSize: '0.8rem', color: '#f43f5e', fontWeight: 600 }}>🚨 Priority</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f43f5e', marginTop: '4px' }}>{counts.priority}</div>
        </div>
        <div className="card" style={{ padding: '16px 18px', borderLeft: '4px solid #10b981', background: 'rgba(16, 185, 129, 0.08)' }}>
          <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>✅ Issue Solved</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>{counts.solved}</div>
        </div>
      </div>

      {/* FILTER & SORT BAR */}
      <div className="filter-bar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '20px' }}>
        {/* Search */}
        <div className="search-box" style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            style={{ width: '100%', paddingLeft: '38px' }}
            placeholder="Search farmer name, phone, village, crop, message..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Sort By Dropdown */}
        <select
          className="filter-select"
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          title="Sort Enquiries"
          style={{ minWidth: '160px' }}
        >
          <option value="date_desc">Sort: Date (Newest First)</option>
          <option value="date_asc">Sort: Date (Oldest First)</option>
          <option value="location">Sort: Location (A-Z)</option>
          <option value="crop">Sort: Crop (A-Z)</option>
          <option value="type">Sort: Type (A-Z)</option>
        </select>

        {/* Status Filter Dropdown */}
        <select
          className="filter-select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          title="Filter by Status"
          style={{ minWidth: '160px', borderColor: statusFilter !== 'all' ? 'var(--brand-400)' : undefined }}
        >
          <option value="all">Status: All Options</option>
          <option value="Not Seen">👁️ Not Seen</option>
          <option value="Pending">⏳ Pending</option>
          <option value="Priority">🚨 Priority</option>
          <option value="Issue Solved">✅ Issue Solved</option>
        </select>

        {/* Time Range Filter Dropdown */}
        <select
          className="filter-select"
          value={timeRange}
          onChange={e => setTimeRange(e.target.value)}
          title="Filter by Time Period"
          style={{ minWidth: '150px', borderColor: timeRange !== 'overall' ? 'var(--brand-400)' : undefined }}
        >
          <option value="overall">Time: Overall (All)</option>
          <option value="day">Time: Today (Day)</option>
          <option value="week">Time: This Week</option>
          <option value="month">Time: This Month</option>
        </select>

        {/* Crop Filter Dropdown */}
        <select
          className="filter-select"
          value={cropFilter}
          onChange={e => setCropFilter(e.target.value)}
          title="Filter by Crop"
          style={{ minWidth: '140px' }}
        >
          <option value="all">Crop: All Crops</option>
          {uniqueCrops.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Type Filter Dropdown */}
        <select
          className="filter-select"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          title="Filter by Type"
          style={{ minWidth: '150px' }}
        >
          <option value="all">Type: All Types</option>
          {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* TABLE CARD */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: '50px' }}>#</th>
                <th>Farmer Name</th>
                <th>Phone</th>
                <th>Location</th>
                <th>Crop</th>
                <th>Type</th>
                <th>Message</th>
                <th>Date &amp; Time</th>
                <th style={{ width: '170px' }}>Status Option</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSorted.map((e, i) => {
                const config = getStatusConfig(e.status)
                return (
                  <tr
                    key={e.id || i}
                    style={{
                      background: config.bg,
                      borderLeft: `4px solid ${config.border}`,
                      transition: 'background 0.2s ease'
                    }}
                  >
                    <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td style={{ fontWeight: 700, color: '#fff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>👤 {e.name}</span>
                      </div>
                    </td>
                    <td>
                      <a
                        href={`https://wa.me/91${(e.phone || '').replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="badge badge-green"
                        style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        title="Click to WhatsApp farmer"
                      >
                        📱 {e.phone}
                      </a>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        📍 {e.location || '—'}
                      </span>
                    </td>
                    <td>
                      {e.crop ? (
                        <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                          🌾 {e.crop}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-blue">
                        {e.type || 'General'}
                      </span>
                    </td>
                    <td
                      style={{ maxWidth: 300, whiteSpace: 'pre-wrap', fontSize: '0.88rem', cursor: 'pointer' }}
                      onClick={() => setSelectedEnquiry(e)}
                      title="Click to view full message details"
                    >
                      {e.message || '—'}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {new Date(e.createdAt || Date.now()).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td>
                      <select
                        value={config.value}
                        onChange={evt => handleStatusChange(e.id, evt.target.value)}
                        style={{
                          background: 'rgba(0,0,0,0.4)',
                          color: config.color,
                          borderColor: config.border,
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          width: '100%'
                        }}
                      >
                        {STATUS_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value} style={{ background: '#0d1f17', color: opt.color }}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                )
              })}

              {filteredAndSorted.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                    {loading ? 'Loading enquiries...' : 'No farmer enquiries match the selected filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ENQUIRY DETAILS MODAL */}
      {selectedEnquiry && (
        <div className="modal-overlay active" onClick={() => setSelectedEnquiry(null)} style={{ background: 'rgba(0,0,0,0.7)', zIndex: 999 }}>
          <div className="modal-card animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                📝 Farmer Enquiry Details
              </h2>
              <button className="btn btn-ghost" onClick={() => setSelectedEnquiry(null)} style={{ fontSize: '1.2rem' }}>&times;</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Farmer Name</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>{selectedEnquiry.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Location</div>
                  <div style={{ fontWeight: 600, color: '#fff' }}>📍 {selectedEnquiry.location}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mobile Number</div>
                  <div style={{ fontWeight: 600, color: '#34d399', marginTop: '2px' }}>📱 {selectedEnquiry.phone}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target Crop</div>
                  <div style={{ fontWeight: 600, color: '#fff', marginTop: '2px' }}>🌾 {selectedEnquiry.crop || 'Not specified'}</div>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Query Message</div>
                <div style={{ fontSize: '0.95rem', color: '#fff', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {selectedEnquiry.message || 'No message content provided.'}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Update Status</div>
                  <select
                    value={getStatusConfig(selectedEnquiry.status).value}
                    onChange={evt => handleStatusChange(selectedEnquiry.id, evt.target.value)}
                    style={{ marginTop: '4px', padding: '6px 12px', borderRadius: '6px', background: '#0d1f17', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
                  >
                    {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <a
                    href={`https://wa.me/91${(selectedEnquiry.phone || '').replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary"
                    style={{ textDecoration: 'none', background: '#25D366', borderColor: '#25D366' }}
                  >
                    💬 Chat on WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
