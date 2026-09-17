import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'

// ─── Colour palette ────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  Pending:           '#f5c86b',
  Confirmed:         '#5e63ff',
  Dispatched:        '#a78bfa',
  'Out for Delivery': '#60a5fa',
  Delivered:         '#34d399',
  Cancelled:         '#ef6d6d',
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n) { return Number(n || 0).toLocaleString('en-IN') }
function fmtRs(n) { return '₹' + fmt(n) }
function dateLabel(iso) { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) }

/** Export data as an Excel-compatible CSV file */
function exportCSV(orders, period) {
  if (!orders || orders.length === 0) { alert('No data to export for this period.'); return }
  const headers = ['Order ID','Date','Customer','Phone','District','State','Items','Total (₹)','Payment','Delivery Status']
  const rows = orders.map(o => [
    o.id,
    new Date(o.date).toLocaleString('en-IN'),
    o.customer,
    o.phone,
    o.district,
    o.state,
    '"' + o.items.replace(/"/g,'""') + '"',
    o.total,
    o.paymentStatus,
    o.deliveryStatus,
  ])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `sathyabio-analytics-${period}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Tiny bar chart ────────────────────────────────────────────────────────────
function BarChart({ trend }) {
  const entries = Object.entries(trend || {})
  if (!entries.length) return <div className="chart-empty">No revenue data for this period</div>

  const values  = entries.map(([, v]) => v)
  const maxVal  = Math.max(...values, 1)
  const showLabel = entries.length <= 14

  return (
    <div className="bi-chart-wrap">
      <div className="bi-bar-area">
        {entries.map(([label, val], i) => {
          const pct = Math.max((val / maxVal) * 100, val > 0 ? 4 : 0)
          const isLast = i === entries.length - 1
          return (
            <div key={label} className="bi-bar-col" title={`${label}: ${fmtRs(val)}`}>
              <div className="bi-bar-value">{val > 0 ? fmtRs(val) : ''}</div>
              <div className="bi-bar" style={{ height: `${pct}%` }} data-last={String(isLast)} />
              {showLabel && <div className="bi-bar-label">{dateLabel(label)}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Donut chart ───────────────────────────────────────────────────────────────
function DonutChart({ mix, total }) {
  if (!mix || mix.length === 0) return <div className="chart-empty">No data</div>

  const statusOrder = ['Delivered','Confirmed','Dispatched','Out for Delivery','Pending','Cancelled']
  const sorted = [...mix].sort((a, b) => statusOrder.indexOf(a.name) - statusOrder.indexOf(b.name))

  let cumulative = 0
  const segments = sorted.map(item => {
    const pct   = (item.value / Math.max(total, 1)) * 100
    const start = cumulative
    cumulative += pct
    return { ...item, pct, start }
  })

  const gradient = segments.map(s =>
    `${STATUS_COLORS[s.name] || '#888'} ${s.start.toFixed(1)}% ${(s.start + s.pct).toFixed(1)}%`
  ).join(', ')

  return (
    <div className="bi-donut-wrap">
      <div className="bi-donut" style={{ background: `conic-gradient(${gradient})` }}>
        <div className="bi-donut-center">
          <strong>{fmt(total)}</strong>
          <span>orders</span>
        </div>
      </div>
      <div className="bi-donut-legend">
        {segments.map(s => (
          <div key={s.name} className="bi-legend-row">
            <span className="bi-legend-dot" style={{ background: STATUS_COLORS[s.name] || '#888' }} />
            <span className="bi-legend-name">{s.name}</span>
            <strong>{s.value}</strong>
            <span className="bi-legend-pct">{s.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
const PERIOD_OPTS = [
  { key: 'day',    label: 'Today' },
  { key: 'week',   label: 'This Week' },
  { key: 'month',  label: 'This Month' },
  { key: 'custom', label: 'Custom Range' },
]

export default function AdminAnalytics() {
  const [period,     setPeriod]     = useState('month')
  const [fromDate,   setFromDate]   = useState('')
  const [toDate,     setToDate]     = useState('')
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [showActual, setShowActual] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const abortRef = useRef(null)

  const fetchAnalytics = useCallback(async () => {
    if (period === 'custom' && (!fromDate || !toDate)) return
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    setLoading(true)
    setError('')
    try {
      const params = period === 'custom'
        ? { from: new Date(fromDate).toISOString(), to: new Date(toDate + 'T23:59:59').toISOString() }
        : { period }
      const { data: res } = await axios.get('/api/admin/analytics', {
        params,
        signal: abortRef.current.signal,
      })
      setData(res.data)
    } catch (err) {
      if (err.name !== 'CanceledError') setError('Failed to load analytics. ' + (err.response?.data?.message || ''))
    } finally {
      setLoading(false)
    }
  }, [period, fromDate, toDate])

  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])

  const kpi      = data?.kpi      || {}
  const trend    = data?.trend    || {}
  const topProds = data?.topProducts || []
  const regions  = data?.regions  || []
  const mix      = data?.deliveryMix || []
  const orders   = data?.orders   || []

  const filteredOrders = orders.filter(o =>
    !searchTerm ||
    [o.id, o.customer, o.phone, o.district, o.state, o.deliveryStatus]
      .some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const periodLabel = PERIOD_OPTS.find(p => p.key === period)?.label || 'This Month'

  const kpiCards = [
    { label: 'Total Revenue',    value: fmtRs(kpi.totalRevenue),   delta: `${kpi.paidOrders || 0} paid orders`,  color: '#34d399', icon: '₹' },
    { label: 'Total Orders',     value: fmt(kpi.totalOrders),       delta: `${kpi.paidOrders || 0} paid, ${kpi.cancelled || 0} cancelled`, color: '#60a5fa', icon: '📦' },
    { label: 'Unique Customers', value: fmt(kpi.uniqueCustomers),   delta: 'Distinct buyers',   color: '#a78bfa', icon: '👥' },
    { label: 'Return / Cancel',  value: `${kpi.returnRate || 0}%`,  delta: `${kpi.cancelled || 0} cancelled orders`, color: '#f5c86b', icon: '↩' },
  ]

  return (
    <div className="animate-fade-in bi-page">

      {/* ── Header ── */}
      <div className="bi-header">
        <div className="bi-header-left">
          <div className="eyebrow">📊 Power BI Analytics</div>
          <h1>Performance Dashboard</h1>
          <p>{periodLabel} · Revenue, Demand &amp; Regional Sales</p>
        </div>
        <div className="bi-header-right">
          <div className="bi-period-bar">
            {PERIOD_OPTS.map(opt => (
              <button
                key={opt.key}
                className={`bi-period-btn ${period === opt.key ? 'active' : ''}`}
                onClick={() => setPeriod(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="bi-date-range">
              <input type="date" className="bi-date-input" value={fromDate}
                onChange={e => setFromDate(e.target.value)} />
              <span>to</span>
              <input type="date" className="bi-date-input" value={toDate}
                onChange={e => setToDate(e.target.value)} />
              <button className="btn btn-primary" onClick={fetchAnalytics} disabled={!fromDate || !toDate}>
                Apply
              </button>
            </div>
          )}

          <div className="bi-action-bar">
            <button
              className={`btn ${showActual ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setShowActual(v => !v)}
            >
              {showActual ? '📊 Charts' : '📋 Actual Data'}
            </button>
            <button className="btn btn-outline" onClick={() => exportCSV(orders, periodLabel)}>
              ⬇ Export Excel
            </button>
            <button className="btn btn-outline" onClick={fetchAnalytics} disabled={loading}>
              {loading ? '…' : '↺ Refresh'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="bi-error">{error}</div>}

      {loading && !data && (
        <div className="bi-loading">
          <div className="bi-spinner" />
          Loading analytics…
        </div>
      )}

      {(!loading || data) && (
        <>
          {/* ── KPI cards ── */}
          <div className="bi-kpi-grid">
            {kpiCards.map(card => (
              <div key={card.label} className="bi-kpi-card">
                <div className="bi-kpi-icon" style={{ color: card.color }}>{card.icon}</div>
                <div className="bi-kpi-value" style={{ color: card.color }}>{card.value}</div>
                <div className="bi-kpi-label">{card.label}</div>
                <div className="bi-kpi-delta">{card.delta}</div>
              </div>
            ))}
          </div>

          {/* ── Chart mode ── */}
          {!showActual && (
            <>
              {/* Revenue trend */}
              <div className="card bi-card-full">
                <div className="card-header">
                  <div className="card-title">📈 Revenue Trend</div>
                  <span className="badge badge-green">
                    {Object.keys(trend).length} days
                  </span>
                </div>
                <BarChart trend={trend} />
              </div>

              {/* Middle row */}
              <div className="bi-two-col">
                {/* Top Products */}
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">🏆 Top Products</div>
                    <span className="badge badge-blue">{topProds.length} products</span>
                  </div>
                  {topProds.length === 0
                    ? <div className="chart-empty">No product data</div>
                    : (
                      <div className="bi-product-list">
                        {topProds.map((p, i) => {
                          const maxRev = topProds[0]?.revenue || 1
                          const pct    = ((p.revenue / maxRev) * 100).toFixed(0)
                          return (
                            <div key={p.name} className="bi-product-row">
                              <span className="bi-rank">{i + 1}</span>
                              <div className="bi-product-info">
                                <span className="bi-product-name">{p.name}</span>
                                <div className="bi-product-bar-wrap">
                                  <div className="bi-product-bar" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                              <div className="bi-product-stats">
                                <span>{fmt(p.sold)} units</span>
                                <strong>{fmtRs(p.revenue)}</strong>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  }
                </div>

                {/* Delivery status donut */}
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">🎯 Order Status Mix</div>
                  </div>
                  <DonutChart mix={mix} total={kpi.totalOrders || 0} />
                </div>
              </div>

              {/* Regional breakdown */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">🗺 Regional Sales</div>
                  <span className="badge badge-yellow">{`Top ${regions.length} districts`}</span>
                </div>
                {regions.length === 0
                  ? <div className="chart-empty">No regional data — orders may be missing a district field</div>
                  : (
                    <div className="bi-region-grid">
                      {regions.map((r, i) => (
                        <div key={r.region} className="bi-region-card" style={{
                          borderTop: `3px solid ${i === 0 ? '#34d399' : i === 1 ? '#60a5fa' : '#a78bfa'}`
                        }}>
                          <div className="bi-region-rank">#{i + 1}</div>
                          <div className="bi-region-name">{r.region}</div>
                          <div className="bi-region-rev">{fmtRs(r.revenue)}</div>
                          <div className="bi-region-sub">{fmt(r.orders)} orders</div>
                          <div className="mini-progress" style={{ marginTop: 8 }}>
                            <span style={{ width: `${r.share}%`, background: i === 0 ? '#34d399' : '#60a5fa' }} />
                          </div>
                          <div className="bi-region-share">{r.share}%</div>
                        </div>
                      ))}
                    </div>
                  )
                }
              </div>
            </>
          )}

          {/* ── Actual data mode ── */}
          {showActual && (
            <div className="card">
              <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
                <div className="card-title">📋 Actual Orders — {periodLabel}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    className="filter-select"
                    placeholder="Search orders…"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ width: 220, padding: '6px 12px', borderRadius: 8 }}
                  />
                  <span className="badge badge-blue">{filteredOrders.length} rows</span>
                  <button className="btn btn-outline" onClick={() => exportCSV(orders, periodLabel)}>
                    ⬇ Export Excel
                  </button>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th><th>Order ID</th><th>Date</th><th>Customer</th>
                      <th>Phone</th><th>District</th><th>State</th><th>Items</th>
                      <th>Total</th><th>Payment</th><th>Delivery</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 && (
                      <tr><td colSpan={11} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                        No orders found for this period
                      </td></tr>
                    )}
                    {filteredOrders.map((o, i) => (
                      <tr key={o.id}>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{i + 1}</td>
                        <td><strong style={{ color: 'var(--brand-400)' }}>{o.id}</strong></td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                          {new Date(o.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ fontWeight: 600 }}>{o.customer}</td>
                        <td style={{ fontSize: '0.8rem' }}>{o.phone}</td>
                        <td>{o.district}</td>
                        <td>{o.state}</td>
                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem' }} title={o.items}>{o.items}</td>
                        <td style={{ fontWeight: 700, color: 'var(--brand-400)' }}>{fmtRs(o.total)}</td>
                        <td>
                          <span className={`badge badge-${o.paymentStatus === 'Paid' ? 'green' : 'yellow'}`}>
                            {o.paymentStatus}
                          </span>
                        </td>
                        <td>
                          <span className="badge" style={{
                            background: (STATUS_COLORS[o.deliveryStatus] || '#888') + '22',
                            color:      STATUS_COLORS[o.deliveryStatus] || '#aaa',
                            border:    `1px solid ${STATUS_COLORS[o.deliveryStatus] || '#444'}`,
                          }}>
                            {o.deliveryStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

