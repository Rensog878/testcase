import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import * as XLSX from 'xlsx'
import {
  TrendingUp,
  Store,
  Receipt,
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  Search,
  IndianRupee,
  ArrowUpDown,
  Building2,
  CreditCard,
  Smartphone,
  Wallet,
  Coins,
  Package,
  CheckCircle2,
  Users,
  MapPin,
  FileText
} from 'lucide-react'

// Formatting helpers
const fmtRs = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
const fmtNum = (n) => Number(n || 0).toLocaleString('en-IN')

export default function ShopAnalytics() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [stores, setStores] = useState([])

  // Filters
  const [selectedStore, setSelectedStore] = useState('all')
  const [dateRangePreset, setDateRangePreset] = useState('all') // today, 7days, 30days, thisMonth, all, custom
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  // UI Table states
  const [storeSearchQuery, setStoreSearchQuery] = useState('')
  const [sortField, setSortField] = useState('grossSales')
  const [sortAsc, setSortAsc] = useState(false)
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('')
  const [exporting, setExporting] = useState(false)

  // Compute effective date range
  const { effectiveFrom, effectiveTo } = useMemo(() => {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const todayStr = `${yyyy}-${mm}-${dd}`

    if (dateRangePreset === 'today') {
      return { effectiveFrom: todayStr, effectiveTo: todayStr }
    } else if (dateRangePreset === '7days') {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      return { effectiveFrom: d.toISOString().slice(0, 10), effectiveTo: todayStr }
    } else if (dateRangePreset === '30days') {
      const d = new Date()
      d.setDate(d.getDate() - 30)
      return { effectiveFrom: d.toISOString().slice(0, 10), effectiveTo: todayStr }
    } else if (dateRangePreset === 'thisMonth') {
      return { effectiveFrom: `${yyyy}-${mm}-01`, effectiveTo: todayStr }
    } else if (dateRangePreset === 'custom') {
      return { effectiveFrom: customFrom, effectiveTo: customTo }
    }
    return { effectiveFrom: '', effectiveTo: '' }
  }, [dateRangePreset, customFrom, customTo])

  // Fetch data
  const fetchData = async () => {
    setLoading(true)
    try {
      const params = {}
      if (selectedStore !== 'all') params.storeId = selectedStore
      if (effectiveFrom) params.from = effectiveFrom
      if (effectiveTo) params.to = effectiveTo

      const [analyticsRes, invoicesRes, storesRes] = await Promise.all([
        axios.get('/api/superadmin/analytics', { params }),
        axios.get('/api/superadmin/all-invoices', { params }),
        axios.get('/api/superadmin/stores')
      ])

      if (analyticsRes.data?.success) {
        setData(analyticsRes.data.data)
      }
      if (invoicesRes.data?.success) {
        setInvoices(invoicesRes.data.data || [])
      }
      if (storesRes.data?.success) {
        const storeList = storesRes.data.data || storesRes.data.stores || []
        if (storeList.length > 0) {
          setStores(storeList)
        } else if (analyticsRes.data?.data?.storeBreakdown?.length) {
          setStores(analyticsRes.data.data.storeBreakdown)
        }
      } else if (analyticsRes.data?.data?.storeBreakdown?.length) {
        setStores(analyticsRes.data.data.storeBreakdown)
      }
    } catch (err) {
      console.error('Failed to load shop analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedStore, effectiveFrom, effectiveTo])

  // Filtered & sorted store list
  const filteredStores = useMemo(() => {
    if (!data?.storeBreakdown) return []
    let list = [...data.storeBreakdown]

    if (storeSearchQuery.trim()) {
      const q = storeSearchQuery.toLowerCase()
      list = list.filter(
        s =>
          (s.name || '').toLowerCase().includes(q) ||
          (s.code || '').toLowerCase().includes(q) ||
          (s.location || '').toLowerCase().includes(q) ||
          (s.adminName || '').toLowerCase().includes(q)
      )
    }

    list.sort((a, b) => {
      let aVal = a[sortField] ?? 0
      let bVal = b[sortField] ?? 0
      if (typeof aVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return sortAsc ? aVal - bVal : bVal - aVal
    })

    return list
  }, [data?.storeBreakdown, storeSearchQuery, sortField, sortAsc])

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    if (!invoices) return []
    if (!invoiceSearchQuery.trim()) return invoices
    const q = invoiceSearchQuery.toLowerCase()
    return invoices.filter(
      inv =>
        (inv.invoiceNo || '').toLowerCase().includes(q) ||
        (inv.customerName || '').toLowerCase().includes(q) ||
        (inv.storeCode || '').toLowerCase().includes(q) ||
        (inv.paymentMode || '').toLowerCase().includes(q)
    )
  }, [invoices, invoiceSearchQuery])

  // Toggle sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  // ================= EXCEL EXPORT HANDLERS =================

  const exportFullExcelReport = () => {
    try {
      setExporting(true)
      const wb = XLSX.utils.book_new()
      const timestamp = new Date().toISOString().slice(0, 10)

      // Sheet 1: Executive KPI Overview
      const kpis = data?.kpis || {}
      const overviewData = [
        ['SATHYAM BIO - ENTERPRISE SHOPS OVERVIEW & ANALYTICS REPORT'],
        ['Generated At:', new Date().toLocaleString('en-IN')],
        ['Filtered Store:', selectedStore === 'all' ? 'All Stores' : stores.find(s => s.id === selectedStore)?.name || selectedStore],
        ['Date Range:', effectiveFrom ? `${effectiveFrom} to ${effectiveTo || 'Today'}` : 'All Time'],
        [],
        ['Metric', 'Value'],
        ['Total Gross Sales', kpis.totalGrossSales || 0],
        ['Total GST Collected', kpis.totalGstCollected || 0],
        ['Total Invoices Issued', kpis.totalInvoiceCount || 0],
        ['Average Invoice Value (AOV)', kpis.avgBillValue || 0],
        ['Active Store Locations', kpis.totalActiveStores || 0],
        ['Total Network Stores', kpis.totalStores || 0],
        ['Top Performing Store', kpis.topStore ? `${kpis.topStore.name} (${kpis.topStore.code}) - ${fmtRs(kpis.topStore.grossSales)}` : 'N/A'],
        [],
        ['Payment Method Breakdown', 'Total Amount (₹)'],
        ['Cash', kpis.paymentMix?.cash || 0],
        ['UPI / Digital', kpis.paymentMix?.upi || 0],
        ['Credit Account', kpis.paymentMix?.credit || 0],
        ['Bank Transfer', kpis.paymentMix?.bankTransfer || 0],
      ]
      const wsOverview = XLSX.utils.aoa_to_sheet(overviewData)
      wsOverview['!cols'] = [{ wch: 30 }, { wch: 35 }]
      XLSX.utils.book_append_sheet(wb, wsOverview, 'Executive Overview')

      // Sheet 2: Store Breakdown
      const storeRows = (data?.storeBreakdown || []).map(s => ({
        'Store Code': s.code || '',
        'Store Name': s.name || '',
        'Location / District': s.location || '',
        'Admin In-Charge': s.adminName || '—',
        'Staff Count': s.staffCount || 0,
        'Total Bills Generated': s.totalBills || 0,
        'Gross Revenue (₹)': s.grossSales || 0,
        'GST Collected (₹)': s.totalGst || 0,
        'Cash Collections (₹)': s.cash || 0,
        'UPI Collections (₹)': s.upi || 0,
        'Credit Sales (₹)': s.credit || 0,
        'Bank Transfer (₹)': s.bankTransfer || 0,
        'Operating Status': (s.status || 'active').toUpperCase(),
      }))
      const wsStores = XLSX.utils.json_to_sheet(storeRows)
      wsStores['!cols'] = [
        { wch: 14 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 12 },
        { wch: 20 }, { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 18 },
        { wch: 16 }, { wch: 18 }, { wch: 15 }
      ]
      XLSX.utils.book_append_sheet(wb, wsStores, 'Store Performance')

      // Sheet 3: Itemized Invoices (with SAM prefix)
      const invoiceRows = invoices.map(inv => ({
        'Invoice Number': inv.invoiceNo || '',
        'Date & Time': inv.date ? new Date(inv.date).toLocaleString('en-IN') : '',
        'Store Code': inv.storeCode || '',
        'Store Name': inv.storeName || '',
        'Customer Name': inv.customerName || 'Walk-in Customer',
        'Customer Phone': inv.customerPhone || '',
        'Payment Mode': inv.paymentMode || 'Cash',
        'Payment Status': inv.status || 'PAID',
        'Item Count': (inv.items || []).length,
        'Taxable Value (₹)': inv.taxableAmount || 0,
        'CGST (₹)': inv.cgst || 0,
        'SGST (₹)': inv.sgst || 0,
        'IGST (₹)': inv.igst || 0,
        'Total GST (₹)': inv.totalGst || 0,
        'Round Off (₹)': inv.roundOff || 0,
        'Grand Total (₹)': inv.grandTotal || 0,
        'Cashier': inv.cashier || '',
      }))
      const wsInvoices = XLSX.utils.json_to_sheet(invoiceRows)
      wsInvoices['!cols'] = [
        { wch: 22 }, { wch: 20 }, { wch: 14 }, { wch: 22 }, { wch: 22 },
        { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 16 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 },
        { wch: 16 }, { wch: 18 }
      ]
      XLSX.utils.book_append_sheet(wb, wsInvoices, 'All Invoices (SAM)')

      // Sheet 4: Top Products Sold
      const productRows = (data?.topProducts || []).map((p, idx) => ({
        'Rank': idx + 1,
        'Product Name': p.name,
        'Units Sold': p.unitsSold,
        'Gross Revenue (₹)': p.revenue,
      }))
      const wsProducts = XLSX.utils.json_to_sheet(productRows)
      wsProducts['!cols'] = [{ wch: 8 }, { wch: 35 }, { wch: 15 }, { wch: 20 }]
      XLSX.utils.book_append_sheet(wb, wsProducts, 'Top Products Sold')

      // Save file
      const fileName = `SathyamBio_Shops_Analytics_${timestamp}.xlsx`
      XLSX.writeFile(wb, fileName)
    } catch (err) {
      console.error('Error generating Excel file:', err)
      alert('Failed to generate Excel report. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const exportInvoicesExcel = () => {
    try {
      const wb = XLSX.utils.book_new()
      const timestamp = new Date().toISOString().slice(0, 10)
      const invoiceRows = filteredInvoices.map(inv => ({
        'Invoice Number': inv.invoiceNo || '',
        'Date': inv.date ? new Date(inv.date).toLocaleDateString('en-IN') : '',
        'Time': inv.date ? new Date(inv.date).toLocaleTimeString('en-IN') : '',
        'Store Code': inv.storeCode || '',
        'Store Name': inv.storeName || '',
        'Customer Name': inv.customerName || 'Walk-in Customer',
        'Customer Phone': inv.customerPhone || '',
        'Payment Method': inv.paymentMode || 'Cash',
        'Status': inv.status || 'PAID',
        'Taxable Amount (₹)': inv.taxableAmount || 0,
        'Total GST (₹)': inv.totalGst || 0,
        'Invoice Grand Total (₹)': inv.grandTotal || 0,
        'Billed By': inv.cashier || '',
      }))
      const ws = XLSX.utils.json_to_sheet(invoiceRows)
      XLSX.utils.book_append_sheet(wb, ws, 'Invoices Ledger')
      XLSX.writeFile(wb, `SathyamBio_Invoices_${timestamp}.xlsx`)
    } catch (err) {
      console.error('Error exporting invoices:', err)
    }
  }

  const kpis = data?.kpis || {}

  const availableStores = useMemo(() => {
    if (stores && stores.length > 0) return stores
    if (data?.storeBreakdown && data.storeBreakdown.length > 0) return data.storeBreakdown
    return []
  }, [stores, data?.storeBreakdown])

  return (
    <div className="sa-page" style={{ minWidth: 0 }}>
      {/* Page Header */}
      <div className="sa-page-head">
        <div>
          <div className="sa-eyebrow"><TrendingUp size={14} /> Enterprise Metrics</div>
          <h1 className="sa-title">All Shops Overview & Analytics</h1>
          <p className="sa-subtitle">
            Consolidated real-time billing performance, GST tax collections, and financial ledgers across all retail outlets.
          </p>
        </div>

        {/* Global Export & Action Buttons */}
        <div className="sa-actions">
          <button onClick={fetchData} disabled={loading} className="sa-btn sa-btn--ghost">
            <RefreshCw size={15} className={loading ? 'sa-spin' : ''} />
            Refresh
          </button>

          <button onClick={exportFullExcelReport} disabled={exporting || loading} className="sa-btn sa-btn--primary">
            <FileSpreadsheet size={17} />
            {exporting ? 'Generating Excel...' : 'Export Complete Excel'}
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="sa-toolbar sa-an-toolbar">
        {/* Store Selector */}
        <label className="sa-inline-label">
          <Store size={16} /> Store Outlet
          <select className="sa-select" value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)}>
            <option value="all">All Shops & Outlets ({availableStores.length})</option>
            {availableStores.map(st => (
              <option key={st.id} value={st.id}>
                {st.name} ({st.code || 'N/A'}) - {st.location || 'HQ'}
              </option>
            ))}
          </select>
        </label>

        {/* Date Presets */}
        <div className="sa-an-period">
          <span className="sa-inline-label"><Calendar size={16} /> Period</span>
          <div className="sa-seg">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: '7days', label: 'Last 7 Days' },
              { id: '30days', label: 'Last 30 Days' },
              { id: 'thisMonth', label: 'This Month' },
              { id: 'custom', label: 'Custom' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setDateRangePreset(p.id)}
                className={`sa-seg-btn${dateRangePreset === p.id ? ' is-active' : ''}`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          {dateRangePreset === 'custom' && (
            <div className="sa-an-dates">
              <input type="date" className="sa-input" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              <span className="sa-muted">to</span>
              <input type="date" className="sa-input" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="sa-stats sa-an-kpis">
        {/* Card 1: Gross Sales */}
        <div className="sa-stat sa-tone-green">
          <div className="sa-stat-top">
            <div className="sa-stat-icon"><IndianRupee size={20} /></div>
          </div>
          <div>
            <div className="sa-stat-label">Total Gross Sales</div>
            <div className="sa-stat-value">{fmtRs(kpis.totalGrossSales)}</div>
            <div className="sa-stat-sub">Across {kpis.totalActiveStores || 0} active store locations</div>
          </div>
        </div>

        {/* Card 2: Total Bills */}
        <div className="sa-stat sa-tone-teal">
          <div className="sa-stat-top">
            <div className="sa-stat-icon"><Receipt size={20} /></div>
          </div>
          <div>
            <div className="sa-stat-label">Total Bills Issued</div>
            <div className="sa-stat-value">{fmtNum(kpis.totalInvoiceCount)}</div>
            <div className="sa-stat-sub">Numbered <span className="sa-code">SAM &lt;CODE&gt; &lt;NO&gt;</span></div>
          </div>
        </div>

        {/* Card 3: GST Collected */}
        <div className="sa-stat sa-tone-violet">
          <div className="sa-stat-top">
            <div className="sa-stat-icon"><Coins size={20} /></div>
          </div>
          <div>
            <div className="sa-stat-label">GST Tax Collected</div>
            <div className="sa-stat-value">{fmtRs(kpis.totalGstCollected)}</div>
            <div className="sa-stat-sub">CGST + SGST / IGST tax component</div>
          </div>
        </div>

        {/* Card 4: Average Bill Size */}
        <div className="sa-stat sa-tone-blue">
          <div className="sa-stat-top">
            <div className="sa-stat-icon"><TrendingUp size={20} /></div>
          </div>
          <div>
            <div className="sa-stat-label">Average Bill Value (AOV)</div>
            <div className="sa-stat-value">{fmtRs(kpis.avgBillValue)}</div>
            <div className="sa-stat-sub">Mean revenue per customer bill</div>
          </div>
        </div>

        {/* Card 5: Top Store */}
        <div className="sa-stat sa-tone-amber">
          <div className="sa-stat-top">
            <div className="sa-stat-icon"><Building2 size={20} /></div>
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="sa-stat-label">Top Store Outlier</div>
            <div className="sa-stat-value sa-stat-value--sm sa-an-ellipsis">{kpis.topStore?.name || 'No Data'}</div>
            <div className="sa-stat-sub" style={{ color: 'var(--sa-amber)' }}>
              {kpis.topStore ? `${fmtRs(kpis.topStore.grossSales)} (${kpis.topStore.code})` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Mix Distribution Section */}
      <section className="sa-card">
        <div className="sa-card-head">
          <h2 className="sa-card-title"><Wallet size={19} /> Enterprise Payment Collection Breakdown</h2>
        </div>
        <div className="sa-card-body">
          <div className="sa-an-mix">
            {[
              { label: 'Cash at Counter', amount: kpis.paymentMix?.cash || 0, icon: <Coins size={16} />, tone: 'sa-tone-green' },
              { label: 'UPI / QR Payments', amount: kpis.paymentMix?.upi || 0, icon: <Smartphone size={16} />, tone: 'sa-tone-blue' },
              { label: 'Farmer Credit Book', amount: kpis.paymentMix?.credit || 0, icon: <CreditCard size={16} />, tone: 'sa-tone-amber' },
              { label: 'Bank / NEFT Transfer', amount: kpis.paymentMix?.bankTransfer || 0, icon: <Building2 size={16} />, tone: 'sa-tone-violet' },
            ].map(m => {
              const pct = kpis.totalGrossSales > 0 ? Math.round((m.amount / kpis.totalGrossSales) * 100) : 0
              return (
                <div key={m.label} className={`sa-an-mix-item ${m.tone}`}>
                  <div className="sa-an-mix-top">
                    <span className="sa-an-mix-label">
                      <span className="sa-feed-icon" style={{ width: '30px', height: '30px', borderRadius: '9px' }}>{m.icon}</span>
                      {m.label}
                    </span>
                    <span className="sa-an-mix-pct">{pct}%</span>
                  </div>
                  <div className="sa-an-mix-value">{fmtRs(m.amount)}</div>
                  <div className="sa-progress"><span style={{ width: `${pct}%` }}></span></div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Store Breakdown Table */}
      <section className="sa-card" style={{ overflow: 'hidden' }}>
        {/* Table Header Controls */}
        <div className="sa-card-head">
          <div>
            <h2 className="sa-card-title"><Store size={19} /> Store Performance Ledger ({filteredStores.length} Stores)</h2>
            <div className="sa-card-sub">Store-by-store sales revenue, GST collections, payment methods, and operational status.</div>
          </div>
          <label className="sa-search" style={{ flex: '0 1 280px' }}>
            <Search size={15} />
            <input
              type="text"
              className="sa-input"
              placeholder="Search store name, code, lead..."
              value={storeSearchQuery}
              onChange={(e) => setStoreSearchQuery(e.target.value)}
            />
          </label>
        </div>

        {/* Responsive Table */}
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Store Details</th>
                <th className="is-sortable" onClick={() => handleSort('code')}>
                  <span className="sa-th-sort">Code <ArrowUpDown size={12} /></span>
                </th>
                <th>Location</th>
                <th className="is-sortable" onClick={() => handleSort('staffCount')}>
                  <span className="sa-th-sort">Staff <ArrowUpDown size={12} /></span>
                </th>
                <th className="is-sortable" onClick={() => handleSort('totalBills')}>
                  <span className="sa-th-sort">Bills <ArrowUpDown size={12} /></span>
                </th>
                <th className="is-sortable" onClick={() => handleSort('grossSales')}>
                  <span className="sa-th-sort">Gross Sales <ArrowUpDown size={12} /></span>
                </th>
                <th className="is-sortable" onClick={() => handleSort('totalGst')}>
                  <span className="sa-th-sort">GST Tax <ArrowUpDown size={12} /></span>
                </th>
                <th>Cash</th>
                <th>UPI</th>
                <th>Credit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredStores.length === 0 ? (
                <tr>
                  <td colSpan="11">
                    <div className="sa-empty" style={{ padding: '32px 16px' }}>
                      <div className="sa-empty-icon"><Store size={24} /></div>
                      <div className="sa-empty-text">No store data found matching the selected filters.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStores.map(st => (
                  <tr key={st.id}>
                    <td>
                      <div className="sa-cell-title">{st.name}</div>
                      <div className="sa-cell-sub">Lead: {st.adminName}</div>
                    </td>
                    <td><span className="sa-code">{st.code}</span></td>
                    <td>{st.location || '—'}</td>
                    <td className="is-strong">{st.staffCount}</td>
                    <td className="is-strong">{fmtNum(st.totalBills)}</td>
                    <td className="is-strong" style={{ color: 'var(--sa-accent)' }}>{fmtRs(st.grossSales)}</td>
                    <td style={{ color: 'var(--sa-violet)', fontWeight: 600 }}>{fmtRs(st.totalGst)}</td>
                    <td>{fmtRs(st.cash)}</td>
                    <td>{fmtRs(st.upi)}</td>
                    <td style={{ color: 'var(--sa-amber)', fontWeight: 600 }}>{fmtRs(st.credit)}</td>
                    <td>
                      <span className={`sa-badge ${st.status === 'active' ? 'sa-tone-green' : 'sa-tone-rose'}`}>
                        <span className="sa-dot"></span>
                        {st.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Two Column Section: Top Products & Invoices Registry */}
      <div className="sa-grid-2">
        {/* Top Selling Products */}
        <section className="sa-card" style={{ overflow: 'hidden' }}>
          <div className="sa-card-head">
            <h2 className="sa-card-title"><Package size={19} /> Top Selling Products Network-Wide</h2>
          </div>

          <div className="sa-table-wrap" style={{ maxHeight: '380px', overflowY: 'auto' }}>
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th style={{ textAlign: 'center' }}>Units Sold</th>
                  <th className="is-num">Revenue (₹)</th>
                </tr>
              </thead>
              <tbody>
                {(data?.topProducts || []).length === 0 ? (
                  <tr>
                    <td colSpan="3"><div className="sa-empty" style={{ padding: '24px' }}><div className="sa-empty-text">No product data recorded yet.</div></div></td>
                  </tr>
                ) : (
                  (data?.topProducts || []).map((p, idx) => (
                    <tr key={idx}>
                      <td>
                        <div className="sa-cell-person">
                          <span className={`sa-an-rank${idx < 3 ? ' is-top' : ''}`}>{idx + 1}</span>
                          <span className="sa-cell-title">{p.name}</span>
                        </div>
                      </td>
                      <td className="is-strong" style={{ textAlign: 'center' }}>{fmtNum(p.unitsSold)}</td>
                      <td className="is-num is-strong" style={{ color: 'var(--sa-accent)' }}>{fmtRs(p.revenue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Invoice Summary with Excel Export */}
        <section className="sa-card" style={{ overflow: 'hidden' }}>
          <div className="sa-card-head">
            <h2 className="sa-card-title"><Receipt size={19} /> Recent SAM Invoices ({filteredInvoices.length})</h2>
            <button onClick={exportInvoicesExcel} className="sa-btn sa-btn--ghost sa-btn--sm">
              <Download size={14} />
              Export Invoices XLSX
            </button>
          </div>

          {/* Quick Invoice Search */}
          <div style={{ padding: '14px 24px 0' }}>
            <label className="sa-search">
              <Search size={15} />
              <input
                type="text"
                className="sa-input"
                placeholder="Search SAM invoice number, customer..."
                value={invoiceSearchQuery}
                onChange={(e) => setInvoiceSearchQuery(e.target.value)}
              />
            </label>
          </div>

          <div className="sa-table-wrap" style={{ maxHeight: '330px', overflowY: 'auto', marginTop: '12px' }}>
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Store</th>
                  <th>Customer</th>
                  <th className="is-num">Total (₹)</th>
                  <th style={{ textAlign: 'center' }}>Mode</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.slice(0, 20).map((inv, idx) => (
                  <tr key={inv.id || idx}>
                    <td><span className="sa-code">{inv.invoiceNo}</span></td>
                    <td className="is-strong">{inv.storeCode || '—'}</td>
                    <td className="sa-muted">{inv.customerName || 'Walk-in'}</td>
                    <td className="is-num is-strong" style={{ color: 'var(--sa-accent)' }}>{fmtRs(inv.grandTotal)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`sa-badge ${inv.paymentMode?.toLowerCase().includes('credit') ? 'sa-tone-amber' : 'sa-tone-slate'}`}>
                        {inv.paymentMode || 'Cash'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
