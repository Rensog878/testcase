import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import { Activity, RefreshCw, Search, Filter, MapPin, Eye, Clock, Download, Calendar, CheckCircle, AlertTriangle, Info } from 'lucide-react'

export default function WorkLogAudit() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [stores, setStores] = useState([])
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [selectedLog, setSelectedLog] = useState(null)

  // Filters
  const [filters, setFilters] = useState({
    storeId: 'all',
    role: 'all',
    module: 'all',
    action: 'all',
    search: '',
    page: 1,
    limit: 50
  })

  useEffect(() => {
    fetchStores()
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [filters.storeId, filters.role, filters.module, filters.action, filters.page])

  // Auto-refresh interval every 12 seconds if autoRefresh is active
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      fetchLogs(true)
    }, 12000)
    return () => clearInterval(interval)
  }, [autoRefresh, filters])

  const fetchStores = async () => {
    try {
      const res = await axios.get('/api/superadmin/stores')
      if (res.data?.success) setStores(res.data.data || [])
    } catch (e) {
      console.error('Failed to load stores for logs:', e)
    }
  }

  const fetchLogs = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.storeId !== 'all') params.append('storeId', filters.storeId)
      if (filters.role !== 'all') params.append('role', filters.role)
      if (filters.module !== 'all') params.append('module', filters.module)
      if (filters.action !== 'all') params.append('action', filters.action)
      if (filters.search) params.append('search', filters.search)
      params.append('page', filters.page)
      params.append('limit', filters.limit)

      const res = await axios.get(`/api/superadmin/work-logs?${params.toString()}`)
      if (res.data?.success) {
        setLogs(res.data.logs || [])
        setTotal(res.data.total || 0)
      }
    } catch (err) {
      if (!silent) toast.error('Failed to fetch activity logs: ' + (err.response?.data?.message || err.message))
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setFilters(prev => ({ ...prev, page: 1 }))
    fetchLogs()
  }

  const exportCSV = () => {
    if (!logs.length) {
      toast.info('No logs available to export.')
      return
    }
    const headers = ['Timestamp', 'User', 'Role', 'Store', 'Module', 'Action', 'Description', 'IP']
    const rows = logs.map(l => [
      `"${new Date(l.timestamp).toISOString()}"`,
      `"${l.userName || ''}"`,
      `"${l.userRole || ''}"`,
      `"${l.storeName || ''}"`,
      `"${l.module || ''}"`,
      `"${l.action || ''}"`,
      `"${(l.description || '').replace(/"/g, '""')}"`,
      `"${l.ip || ''}"`
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `sathyam_work_logs_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Work log export downloaded!')
  }

  const getActionColor = (action = '') => {
    if (action.includes('DELETE')) return { bg: '#fee2e2', color: '#b91c1c' }
    if (action.includes('CREATE') || action.includes('LOGIN')) return { bg: '#dcfce7', color: '#15803d' }
    if (action.includes('PERMISSION')) return { bg: '#f3e8ff', color: '#7e22ce' }
    return { bg: '#e0e7ff', color: '#3730a3' }
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Surveillance Work Log & Activity Monitor
            </h1>
            <span style={{ background: '#ecfdf5', color: '#059669', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>
              {total} Total Events
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '4px 0 0' }}>
            Real-time surveillance monitoring of all actions, settings changes, option toggles, invoices, and operations across every store branch.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Live Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: autoRefresh ? '#f0fdf4' : '#f8fafc',
              color: autoRefresh ? '#166534' : '#64748b',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: autoRefresh ? '#22c55e' : '#94a3b8',
              boxShadow: autoRefresh ? '0 0 6px #22c55e' : 'none'
            }} />
            {autoRefresh ? 'Live Monitoring Active' : 'Live Paused'}
          </button>

          {/* Manual Refresh */}
          <button
            onClick={() => fetchLogs()}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>

          {/* Export CSV */}
          <button
            onClick={exportCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              background: '#2563eb',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{
        background: '#ffffff',
        padding: '16px 20px',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        marginBottom: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flex: 1,
            background: '#f8fafc',
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1'
          }}>
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search in log descriptions, user names, entity IDs, or store names..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '0.88rem' }}
            />
          </div>
          <button
            type="submit"
            style={{ padding: '8px 18px', background: '#334155', color: '#fff', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
          >
            Filter
          </button>
        </form>

        {/* Multi-criteria Dropdowns */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Store Location */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Store:</span>
            <select
              value={filters.storeId}
              onChange={(e) => setFilters({ ...filters, storeId: e.target.value, page: 1 })}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#ffffff' }}
            >
              <option value="all">All Stores</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.location})</option>
              ))}
            </select>
          </div>

          {/* Role */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Role:</span>
            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value, page: 1 })}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#ffffff' }}
            >
              <option value="all">All Roles</option>
              <option value="admin">Store Admin</option>
              <option value="billing">Billing</option>
              <option value="delivery">Delivery</option>
              <option value="employee">Employee</option>
              <option value="superadmin">Super Admin</option>
            </select>
          </div>

          {/* Module */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Module:</span>
            <select
              value={filters.module}
              onChange={(e) => setFilters({ ...filters, module: e.target.value, page: 1 })}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#ffffff' }}
            >
              <option value="all">All Modules</option>
              <option value="PRODUCTS">Products Master</option>
              <option value="CMS">Live CMS Editor</option>
              <option value="SETTINGS">Profile / Settings</option>
              <option value="BILLING">Billing / Invoicing</option>
              <option value="ORDERS">Orders</option>
              <option value="USERS">Personnel & Hierarchy</option>
              <option value="PERMISSIONS">Feature Permissions</option>
              <option value="STORES">Store Locations</option>
              <option value="AUTH">Sign-ins & Auth</option>
            </select>
          </div>

          {/* Action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Action:</span>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value, page: 1 })}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#ffffff' }}
            >
              <option value="all">All Actions</option>
              <option value="CREATE_PRODUCT">Create Product</option>
              <option value="UPDATE_PRODUCT">Update Product</option>
              <option value="UPDATE_CMS">Update CMS</option>
              <option value="UPDATE_PROFILE_FIELDS">Change Profile Options</option>
              <option value="CREATE_INVOICE">Generate Bill</option>
              <option value="CREATE_STORE">Create Store</option>
              <option value="CREATE_USER">Create User</option>
              <option value="PERMISSION_CHANGE">Permission Change</option>
              <option value="USER_LOGIN">User Login</option>
            </select>
          </div>
        </div>
      </div>

      {/* Work Log Activity Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '14px 18px', width: '170px' }}>Timestamp</th>
                <th style={{ padding: '14px 18px' }}>User / Role</th>
                <th style={{ padding: '14px 18px' }}>Store Branch</th>
                <th style={{ padding: '14px 18px' }}>Action & Module</th>
                <th style={{ padding: '14px 18px' }}>Monitored Event Description</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>Audit Diff</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => {
                const badge = getActionColor(log.action)
                return (
                  <tr
                    key={log.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background 0.1s ease'
                    }}
                  >
                    {/* Timestamp */}
                    <td style={{ padding: '12px 18px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.82rem' }}>
                        {new Date(log.timestamp).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                    </td>

                    {/* User & Role */}
                    <td style={{ padding: '12px 18px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>{log.userName}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#475569' }}>
                          {log.userRole}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>ID: {log.userId}</span>
                      </div>
                    </td>

                    {/* Store Location */}
                    <td style={{ padding: '12px 18px', verticalAlign: 'top' }}>
                      {log.storeName ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#334155', fontWeight: 600, fontSize: '0.82rem' }}>
                          <MapPin size={13} color="#2563eb" /> {log.storeName}
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>HQ / Global</span>
                      )}
                    </td>

                    {/* Action & Module */}
                    <td style={{ padding: '12px 18px', verticalAlign: 'top' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        letterSpacing: '0.3px',
                        background: badge.bg,
                        color: badge.color
                      }}>
                        {log.action}
                      </span>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px', fontWeight: 600 }}>
                        {log.module}
                      </div>
                    </td>

                    {/* Description */}
                    <td style={{ padding: '12px 18px', verticalAlign: 'top', color: '#334155', lineHeight: 1.4 }}>
                      <div style={{ fontWeight: 500 }}>{log.description}</div>
                      {log.entityId && (
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                          Entity: <code>{log.entityId}</code>
                        </div>
                      )}
                    </td>

                    {/* Inspect Diff Button */}
                    <td style={{ padding: '12px 18px', verticalAlign: 'top', textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedLog(log)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '5px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: '#f8fafc',
                          color: '#2563eb',
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <Eye size={13} /> Inspect Diff
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {logs.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <Activity size={40} style={{ marginBottom: '10px' }} />
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#475569' }}>No audit events found</div>
            <div style={{ fontSize: '0.85rem' }}>Change your filters or perform actions to see surveillance logs here.</div>
          </div>
        )}
      </div>

      {/* Inspect Diff Modal */}
      {selectedLog && (
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
            maxWidth: '650px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              background: '#0f172a',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                  Event Audit Surveillance Inspector
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                  {selectedLog.action} · {selectedLog.module}
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Event Metadata */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.82rem' }}>
                <div><strong>Actor:</strong> {selectedLog.userName} ({selectedLog.userRole})</div>
                <div><strong>Store:</strong> {selectedLog.storeName || 'HQ / Global'}</div>
                <div><strong>Timestamp:</strong> {new Date(selectedLog.timestamp).toLocaleString()}</div>
                <div><strong>Client IP:</strong> {selectedLog.ip || '127.0.0.1'}</div>
              </div>

              <div>
                <strong style={{ fontSize: '0.88rem', color: '#1e293b' }}>Description:</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#475569', background: '#f1f5f9', padding: '10px 12px', borderRadius: '8px' }}>
                  {selectedLog.description}
                </p>
              </div>

              {/* Exact Option / Diff Details */}
              <div>
                <strong style={{ fontSize: '0.88rem', color: '#1e293b' }}>
                  Exact Modified Options & Changed Values:
                </strong>
                <pre style={{
                  marginTop: '8px',
                  background: '#0f172a',
                  color: '#38bdf8',
                  padding: '16px',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  overflowX: 'auto',
                  maxHeight: '260px',
                  fontFamily: 'monospace'
                }}>
                  {JSON.stringify(selectedLog.details || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div style={{ padding: '14px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
              <button
                onClick={() => setSelectedLog(null)}
                style={{ padding: '8px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
