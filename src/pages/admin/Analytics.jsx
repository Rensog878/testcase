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
function exportCSV(orders, period, channelMode) {
  if (!orders || orders.length === 0) { alert('No data to export for this period.'); return }
  const headers = ['Channel','Order/Invoice ID','Date','Customer','Phone','District / Counter','State','Items','Total (₹)','Payment Status','Payment Method','Fulfillment Status']
  const rows = orders.map(o => [
    o.channel === 'offline' ? 'POS Counter' : 'Online Store',
    o.id,
    new Date(o.date).toLocaleString('en-IN'),
    o.customer,
    o.phone,
    o.district,
    o.state,
    '"' + String(o.items || '').replace(/"/g,'""') + '"',
    o.total,
    o.paymentStatus,
    o.paymentMethod || 'Online',
    o.deliveryStatus,
  ])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `sathyabio-analytics-${channelMode || 'all'}-${period}.csv`
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

const CHANNEL_MODES = [
  { key: 'both',    label: '🔄 Both (Online & Offline)', badge: 'Omnichannel View', desc: 'Unified Web Orders + Billing Counter POS' },
  { key: 'online',  label: '🌐 Online Only',             badge: 'Customer Web Store', desc: 'Orders placed on website & delivered' },
  { key: 'offline', label: '🏬 Offline Only',            badge: 'Billing Counter POS', desc: 'In-store counter invoices & walk-in sales' },
]

export default function AdminAnalytics() {
  const [channel,    setChannel]    = useState('both') // 'both', 'online', 'offline'
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
      const params = {
        ...(period === 'custom'
          ? { from: new Date(fromDate).toISOString(), to: new Date(toDate + 'T23:59:59').toISOString() }
          : { period }),
        channel
      }
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
  }, [period, fromDate, toDate, channel])

  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])

  const kpi      = data?.kpi      || {}
  const trend    = data?.trend    || {}
  const topProds = data?.topProducts || []
  const regions  = data?.regions  || []
  const mix      = data?.deliveryMix || []
  const orders   = data?.orders   || []

  const filteredOrders = orders.filter(o =>
    !searchTerm ||
    [o.id, o.customer, o.phone, o.district, o.state, o.deliveryStatus, o.paymentMethod, o.channel]
      .some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const periodLabel = PERIOD_OPTS.find(p => p.key === period)?.label || 'This Month'
  const activeChannelMode = CHANNEL_MODES.find(m => m.key === channel)

  let kpiCards = []
  if (channel === 'both') {
    kpiCards = [
      { label: 'Omnichannel Revenue',  value: fmtRs(kpi.totalRevenue),   delta: `₹${fmt(kpi.onlineRevenue || 0)} web + ₹${fmt(kpi.offlineRevenue || 0)} counter`, color: '#34d399', icon: '₹' },
      { label: 'Total Transactions',   value: fmt(kpi.totalOrders),       delta: `${kpi.onlineOrders || 0} web orders, ${kpi.offlineOrders || 0} counter bills`,    color: '#60a5fa', icon: '📦' },
      { label: 'Unique Customers',     value: fmt(kpi.uniqueCustomers),   delta: 'Across online store & billing counter',                                            color: '#a78bfa', icon: '👥' },
      { label: 'Online Return/Cancel', value: `${kpi.returnRate || 0}%`,  delta: `${kpi.cancelled || 0} cancelled web orders`,                                      color: '#f5c86b', icon: '↩' },
    ]
  } else if (channel === 'online') {
    kpiCards = [
      { label: 'Online Web Revenue',   value: fmtRs(kpi.totalRevenue),   delta: `${kpi.paidOrders || 0} paid customer orders`,   color: '#34d399', icon: '₹' },
      { label: 'Online Orders Placed', value: fmt(kpi.totalOrders),       delta: `${kpi.paidOrders || 0} paid, ${kpi.cancelled || 0} cancelled`, color: '#60a5fa', icon: '🌐' },
      { label: 'Unique Web Buyers',    value: fmt(kpi.uniqueCustomers),   delta: 'Distinct website farmers & clients',             color: '#a78bfa', icon: '👥' },
      { label: 'Web Return/Cancel',    value: `${kpi.returnRate || 0}%`,  delta: `${kpi.cancelled || 0} cancelled online orders`,  color: '#f5c86b', icon: '↩' },
    ]
  } else {
    kpiCards = [
      { label: 'POS Counter Revenue',  value: fmtRs(kpi.totalRevenue),   delta: 'In-store collection (Cash, UPI, Card)',          color: '#34d399', icon: '₹' },
      { label: 'Counter Bills Done',   value: fmt(kpi.totalOrders),       delta: `${kpi.paidOrders || 0} paid GST counter invoices`, color: '#fbbf24', icon: '🧾' },
      { label: 'Walk-in Buyers',       value: fmt(kpi.uniqueCustomers),   delta: 'Counter billed farmers & retail accounts',       color: '#a78bfa', icon: '👥' },
      { label: 'Counter Fulfillment',  value: '100%',                     delta: 'Instant on-counter handover',                    color: '#60a5fa', icon: '🏬' },
    ]
  }

  return (
    <div className="animate-fade-in bi-page">

      {/* ── Header ── */}
      <div className="bi-header">
        <div className="bi-header-left">
          <div className="eyebrow">📊 Omnichannel Sales Analytics</div>
          <h1>Performance Dashboard</h1>
          <p>{activeChannelMode?.badge} · {periodLabel} · Revenue, Channel Demand &amp; Regional Performance</p>
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
            <button className="btn btn-outline" onClick={() => exportCSV(orders, periodLabel, channel)}>
              ⬇ Export Excel
            </button>
            <button className="btn btn-outline" onClick={fetchAnalytics} disabled={loading}>
              {loading ? '…' : '↺ Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* ── 3-Mode Channel Switcher (Online, Offline, Both) ── */}
      <div className="bi-channel-selector" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '12px',
        marginBottom: '24px'
      }}>
        {CHANNEL_MODES.map(m => {
          const isActive = channel === m.key
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => setChannel(m.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderRadius: '12px',
                background: isActive ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)' : 'var(--dark-800)',
                border: isActive ? '2px solid #22c55e' : '1px solid var(--dark-700)',
                cursor: 'pointer',
                textAlign: 'left',
                color: 'inherit',
                transition: 'all 0.2s ease',
                boxShadow: isActive ? '0 4px 14px rgba(34, 197, 94, 0.15)' : 'none'
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isActive ? '#4ade80' : 'var(--text-primary)', marginBottom: '3px' }}>
                  {m.label}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {m.desc}
                </div>
              </div>
              <span className={`badge ${isActive ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: '0.7rem' }}>
                {m.badge}
              </span>
            </button>
          )
        })}
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

          {/* ── Omnichannel Split Card when Both is selected ── */}
          {channel === 'both' && data?.channelBreakdown && (
            <div className="card" style={{ marginBottom: '20px', padding: '18px 24px', background: 'var(--dark-800)', borderRadius: '12px', border: '1px solid var(--dark-700)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🔄 Omnichannel Split (Online Web Store vs In-Store Counter)
                </div>
                <span className="badge badge-green">Combined View</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div style={{ padding: '12px 16px', background: 'rgba(96, 165, 250, 0.08)', borderRadius: '10px', border: '1px solid rgba(96, 165, 250, 0.25)' }}>
                  <div style={{ fontSize: '0.78rem', color: '#60a5fa', fontWeight: 600 }}>🌐 Online Customer Web Store</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff', margin: '4px 0' }}>{fmtRs(data.channelBreakdown.online?.revenue || 0)}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{fmt(data.channelBreakdown.online?.count || 0)} customer orders</div>
                </div>
                <div style={{ padding: '12px 16px', background: 'rgba(251, 191, 36, 0.08)', borderRadius: '10px', border: '1px solid rgba(251, 191, 36, 0.25)' }}>
                  <div style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: 600 }}>🏬 In-Store POS Billing Counter</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff', margin: '4px 0' }}>{fmtRs(data.channelBreakdown.offline?.revenue || 0)}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{fmt(data.channelBreakdown.offline?.count || 0)} counter invoices</div>
                </div>
              </div>
            </div>
          )}

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
                  <button className="btn btn-outline" onClick={() => exportCSV(orders, periodLabel, channel)}>
                    ⬇ Export Excel
                  </button>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Channel</th>
                      <th>Order/Bill ID</th>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Phone</th>
                      <th>Location / Counter</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Payment</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 && (
                      <tr><td colSpan={11} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                        No transactions found for this period and channel
                      </td></tr>
                    )}
                    {filteredOrders.map((o, i) => (
                      <tr key={o.id}>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{i + 1}</td>
                        <td>
                          {o.channel === 'offline' ? (
                            <span className="badge badge-yellow" style={{ fontSize: '0.7rem' }}>🏬 POS Bill</span>
                          ) : (
                            <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>🌐 Online</span>
                          )}
                        </td>
                        <td><strong style={{ color: 'var(--brand-400)' }}>{o.id}</strong></td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                          {new Date(o.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ fontWeight: 600 }}>{o.customer}</td>
                        <td style={{ fontSize: '0.8rem' }}>{o.phone || '—'}</td>
                        <td style={{ fontSize: '0.8rem' }}>{o.channel === 'offline' ? 'Billing Counter' : (o.district || o.state || 'Web Store')}</td>
                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem' }} title={o.items}>{o.items || '—'}</td>
                        <td style={{ fontWeight: 700, color: 'var(--brand-400)' }}>{fmtRs(o.total)}</td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span className={`badge badge-${o.paymentStatus === 'Paid' ? 'green' : 'yellow'}`} style={{ fontSize: '0.7rem' }}>
                              {o.paymentStatus}
                            </span>
                            {o.paymentMethod && (
                              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                {o.paymentMethod}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="badge" style={{
                            background: (STATUS_COLORS[o.deliveryStatus] || '#888') + '22',
                            color:      STATUS_COLORS[o.deliveryStatus] || '#aaa',
                            border:    `1px solid ${STATUS_COLORS[o.deliveryStatus] || '#444'}`,
                            fontSize:   '0.72rem'
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

