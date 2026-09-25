import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import { Activity, RefreshCw, Search, Filter, MapPin, Eye, Clock, Download, Calendar, CheckCircle, AlertTriangle, Info, X } from 'lucide-react'

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

  // Action badge colour (presentation only).
  const actionTone = (action = '') => {
    if (action.includes('DELETE')) return 'sa-tone-rose'
    if (action.includes('CREATE') || action.includes('LOGIN')) return 'sa-tone-green'
    if (action.includes('PERMISSION')) return 'sa-tone-violet'
    return 'sa-tone-blue'
  }

  return (
    <div className="sa-page">
      {/* Header bar */}
      <div className="sa-page-head">
        <div>
          <div className="sa-eyebrow"><Activity size={14} /> Audit & Surveillance</div>
          <h1 className="sa-title">
            Surveillance Work Log & Activity Monitor
            <span className="sa-badge sa-tone-green">{total} Total Events</span>
          </h1>
          <p className="sa-subtitle">
            Real-time surveillance monitoring of all actions, settings changes, option toggles, invoices, and operations across every store branch.
          </p>
        </div>

        <div className="sa-actions">
          {/* Live Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`sa-btn sa-btn--ghost sa-live-toggle${autoRefresh ? ' is-on' : ''}`}
          >
            <span className="sa-live-toggle-dot" />
            {autoRefresh ? 'Live Monitoring Active' : 'Live Paused'}
          </button>

          {/* Manual Refresh */}
          <button onClick={() => fetchLogs()} disabled={loading} className="sa-btn sa-btn--ghost">
            <RefreshCw size={14} className={loading ? 'sa-spin' : ''} /> Refresh
          </button>

          {/* Export CSV */}
          <button onClick={exportCSV} className="sa-btn sa-btn--primary">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="sa-toolbar sa-log-toolbar">
        <form onSubmit={handleSearchSubmit} className="sa-log-search">
          <label className="sa-search">
            <Search size={16} />
            <input
              type="text"
              className="sa-input"
              placeholder="Search in log descriptions, user names, entity IDs, or store names..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </label>
          <button type="submit" className="sa-btn sa-btn--dark">
            <Filter size={14} /> Filter
          </button>
        </form>

        {/* Multi-criteria Dropdowns */}
        <div className="sa-log-filters">
          {/* Store Location */}
          <label className="sa-inline-label">
            Store
            <select
              className="sa-select"
              value={filters.storeId}
              onChange={(e) => setFilters({ ...filters, storeId: e.target.value, page: 1 })}
            >
              <option value="all">All Stores</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.location})</option>
              ))}
            </select>
          </label>

          {/* Role */}
          <label className="sa-inline-label">
            Role
            <select
              className="sa-select"
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value, page: 1 })}
            >
              <option value="all">All Roles</option>
              <option value="admin">Store Admin</option>
              <option value="billing">Billing</option>
              <option value="delivery">Delivery</option>
              <option value="employee">Employee</option>
              <option value="superadmin">Super Admin</option>
            </select>
          </label>

          {/* Module */}
          <label className="sa-inline-label">
            Module
            <select
              className="sa-select"
              value={filters.module}
              onChange={(e) => setFilters({ ...filters, module: e.target.value, page: 1 })}
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
          </label>

          {/* Action */}
          <label className="sa-inline-label">
            Action
            <select
              className="sa-select"
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value, page: 1 })}
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
          </label>
        </div>
      </div>

      {/* Work Log Activity Table */}
      <section className="sa-card" style={{ overflow: 'hidden' }}>
        <div className="sa-table-wrap">
          <table className="sa-table sa-log-table">
            <thead>
              <tr>
                <th style={{ width: '150px' }}>Timestamp</th>
                <th>User / Role</th>
                <th>Store Branch</th>
                <th>Action & Module</th>
                <th>Monitored Event Description</th>
                <th style={{ textAlign: 'right' }}>Audit Diff</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  {/* Timestamp */}
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div className="sa-cell-title">{new Date(log.timestamp).toLocaleDateString()}</div>
                    <div className="sa-cell-sub"><Clock size={11} /> {new Date(log.timestamp).toLocaleTimeString()}</div>
                  </td>

                  {/* User & Role */}
                  <td>
                    <div className="sa-cell-title">{log.userName}</div>
                    <div className="sa-log-user-meta">
                      <span className="sa-badge sa-badge--caps">{log.userRole}</span>
                      <span className="sa-cell-sub">ID: {log.userId}</span>
                    </div>
                  </td>

                  {/* Store Location */}
                  <td>
                    {log.storeName ? (
                      <span className="sa-cell-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <MapPin size={13} /> {log.storeName}
                      </span>
                    ) : (
                      <span className="sa-italic">HQ / Global</span>
                    )}
                  </td>

                  {/* Action & Module */}
                  <td>
                    <span className={`sa-badge ${actionTone(log.action)}`}>{log.action}</span>
                    <div className="sa-cell-sub" style={{ fontWeight: 700 }}>{log.module}</div>
                  </td>

                  {/* Description */}
                  <td className="sa-log-desc">
                    <div>{log.description}</div>
                    {log.entityId && (
                      <div className="sa-cell-sub">Entity: <span className="sa-code">{log.entityId}</span></div>
                    )}
                  </td>

                  {/* Inspect Diff Button */}
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => setSelectedLog(log)} className="sa-btn sa-btn--ghost sa-btn--sm">
                      <Eye size={13} /> Inspect Diff
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {logs.length === 0 && !loading && (
          <div className="sa-empty">
            <div className="sa-empty-icon"><Activity size={26} /></div>
            <div className="sa-empty-title">No audit events found</div>
            <div className="sa-empty-text">Change your filters or perform actions to see surveillance logs here.</div>
          </div>
        )}
      </section>

      {/* Inspect Diff Modal */}
      {selectedLog && (
        <div className="sa-modal-overlay">
          <div className="sa-modal sa-modal--wide" role="dialog" aria-modal="true">
            <div className="sa-modal-head">
              <div>
                <div className="sa-eyebrow">Event Audit Surveillance Inspector</div>
                <h2 className="sa-card-title">
                  <span className={`sa-badge ${actionTone(selectedLog.action)}`}>{selectedLog.action}</span>
                  {selectedLog.module}
                </h2>
              </div>
              <button onClick={() => setSelectedLog(null)} className="sa-icon-btn" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="sa-modal-body sa-log-inspect">
              {/* Event Metadata */}
              <div className="sa-log-meta-grid">
                <div><span className="sa-hint">Actor</span><strong>{selectedLog.userName} ({selectedLog.userRole})</strong></div>
                <div><span className="sa-hint">Store</span><strong>{selectedLog.storeName || 'HQ / Global'}</strong></div>
                <div><span className="sa-hint">Timestamp</span><strong>{new Date(selectedLog.timestamp).toLocaleString()}</strong></div>
                <div><span className="sa-hint">Client IP</span><strong>{selectedLog.ip || '127.0.0.1'}</strong></div>
              </div>

              <div className="sa-field">
                <span className="sa-label">Description</span>
                <p className="sa-store-address">{selectedLog.description}</p>
              </div>

              {/* Exact Option / Diff Details */}
              <div className="sa-field">
                <span className="sa-label">Exact Modified Options & Changed Values</span>
                <pre className="sa-pre" style={{ maxHeight: '300px' }}>
                  {JSON.stringify(selectedLog.details || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="sa-modal-foot">
              <button onClick={() => setSelectedLog(null)} className="sa-btn sa-btn--primary">
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
