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
    <div style={{ paddingBottom: '40px', minWidth: 0 }}>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              All Shops Overview & Analytics
            </h1>
            <span style={{
              fontSize: '0.72rem',
              padding: '3px 10px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#2563eb',
              borderRadius: '20px',
              fontWeight: 700,
              letterSpacing: '0.5px'
            }}>
              ENTERPRISE METRICS
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '4px 0 0' }}>
            Consolidated real-time billing performance, GST tax collections, and financial ledgers across all retail outlets.
          </p>
        </div>

        {/* Global Export & Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={fetchData}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 15px',
              background: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.15s'
            }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={exportFullExcelReport}
            disabled={exporting || loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: exporting ? 'not-allowed' : 'pointer',
              boxShadow: '0 3px 10px rgba(16, 185, 129, 0.3)',
              transition: 'all 0.2s'
            }}
          >
            <FileSpreadsheet size={17} />
            {exporting ? 'Generating Excel...' : 'Export Complete Excel'}
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '16px 20px',
        marginBottom: '24px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Store Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Store size={18} color="#2563eb" />
          <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>Store Outlet:</span>
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            style={{
              background: '#ffffff',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              padding: '7px 12px',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 500,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Shops & Outlets ({availableStores.length})</option>
            {availableStores.map(st => (
              <option key={st.id} value={st.id}>
                {st.name} ({st.code || 'N/A'}) - {st.location || 'HQ'}
              </option>
            ))}
          </select>
        </div>

        {/* Date Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Calendar size={17} color="#7c3aed" />
          <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>Period:</span>
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
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: dateRangePreset === p.id ? '#2563eb' : '#f1f5f9',
                color: dateRangePreset === p.id ? '#ffffff' : '#475569',
                boxShadow: dateRangePreset === p.id ? '0 2px 6px rgba(37,99,235,0.25)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              {p.label}
            </button>
          ))}

          {/* Custom Date Pickers */}
          {dateRangePreset === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={{
                  background: '#ffffff',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  padding: '5px 8px',
                  borderRadius: '6px',
                  fontSize: '0.82rem'
                }}
              />
              <span style={{ color: '#64748b', fontSize: '0.8rem' }}>to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                style={{
                  background: '#ffffff',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  padding: '5px 8px',
                  borderRadius: '6px',
                  fontSize: '0.82rem'
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Card 1: Gross Sales */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          borderLeft: '4px solid #4f46e5'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Gross Sales
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IndianRupee size={18} color="#4f46e5" />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            {fmtRs(kpis.totalGrossSales)}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
            Across {kpis.totalActiveStores || 0} active store locations
          </div>
        </div>

        {/* Card 2: Total Bills */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          borderLeft: '4px solid #059669'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Bills Issued
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Receipt size={18} color="#059669" />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            {fmtNum(kpis.totalInvoiceCount)}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
            Numbered <code style={{ color: '#059669', fontWeight: 700 }}>SAM &lt;CODE&gt; &lt;NO&gt;</code>
          </div>
        </div>

        {/* Card 3: GST Collected */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          borderLeft: '4px solid #7c3aed'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              GST Tax Collected
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Coins size={18} color="#7c3aed" />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            {fmtRs(kpis.totalGstCollected)}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
            CGST + SGST / IGST tax component
          </div>
        </div>

        {/* Card 4: Average Bill Size */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          borderLeft: '4px solid #0284c7'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Average Bill Value (AOV)
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={18} color="#0284c7" />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            {fmtRs(kpis.avgBillValue)}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
            Mean revenue per customer bill
          </div>
        </div>

        {/* Card 5: Top Store */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          borderLeft: '4px solid #d97706'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Top Store Outlier
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={18} color="#d97706" />
            </div>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {kpis.topStore?.name || 'No Data'}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#b45309', marginTop: '4px', fontWeight: 700 }}>
            {kpis.topStore ? `${fmtRs(kpis.topStore.grossSales)} (${kpis.topStore.code})` : '—'}
          </div>
        </div>
      </div>

      {/* Payment Mix Distribution Section */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '20px 24px',
        marginBottom: '24px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
      }}>
        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Wallet size={19} color="#2563eb" />
          Enterprise Payment Collection Breakdown
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
          {[
            { label: 'Cash at Counter', amount: kpis.paymentMix?.cash || 0, icon: <Coins size={16} color="#059669" />, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
            { label: 'UPI / QR Payments', amount: kpis.paymentMix?.upi || 0, icon: <Smartphone size={16} color="#2563eb" />, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
            { label: 'Farmer Credit Book', amount: kpis.paymentMix?.credit || 0, icon: <CreditCard size={16} color="#d97706" />, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
            { label: 'Bank / NEFT Transfer', amount: kpis.paymentMix?.bankTransfer || 0, icon: <Building2 size={16} color="#7c3aed" />, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
          ].map(m => {
            const pct = kpis.totalGrossSales > 0 ? Math.round((m.amount / kpis.totalGrossSales) * 100) : 0
            return (
              <div key={m.label} style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', border: `1px solid ${m.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {m.icon}
                    </div>
                    <span>{m.label}</span>
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: m.color }}>{pct}%</span>
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                  {fmtRs(m.amount)}
                </div>
                <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '3px', marginTop: '10px', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: m.color, borderRadius: '3px' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Store Breakdown Table */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '22px',
        marginBottom: '24px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
      }}>
        {/* Table Header Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Store size={20} color="#2563eb" />
              Store Performance Ledger ({filteredStores.length} Stores)
            </div>
            <p style={{ color: '#64748b', fontSize: '0.84rem', margin: '3px 0 0 0' }}>
              Store-by-store sales revenue, GST collections, payment methods, and operational status.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search store name, code, lead..."
                value={storeSearchQuery}
                onChange={(e) => setStoreSearchQuery(e.target.value)}
                style={{
                  background: '#f8fafc',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  padding: '8px 12px 8px 34px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  outline: 'none',
                  width: '260px'
                }}
              />
            </div>
          </div>
        </div>

        {/* Responsive Table */}
        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Store Details</th>
                <th style={{ padding: '12px 16px', cursor: 'pointer', fontWeight: 700 }} onClick={() => handleSort('code')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Code <ArrowUpDown size={13} />
                  </div>
                </th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Location</th>
                <th style={{ padding: '12px 16px', cursor: 'pointer', fontWeight: 700 }} onClick={() => handleSort('staffCount')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Staff <ArrowUpDown size={13} />
                  </div>
                </th>
                <th style={{ padding: '12px 16px', cursor: 'pointer', fontWeight: 700 }} onClick={() => handleSort('totalBills')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Bills <ArrowUpDown size={13} />
                  </div>
                </th>
                <th style={{ padding: '12px 16px', cursor: 'pointer', fontWeight: 700 }} onClick={() => handleSort('grossSales')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Gross Sales <ArrowUpDown size={13} />
                  </div>
                </th>
                <th style={{ padding: '12px 16px', cursor: 'pointer', fontWeight: 700 }} onClick={() => handleSort('totalGst')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    GST Tax <ArrowUpDown size={13} />
                  </div>
                </th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Cash</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>UPI</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Credit</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredStores.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    No store data found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredStores.map(st => (
                  <tr key={st.id} style={{ borderBottom: '1px solid #f1f5f9', background: '#ffffff', transition: 'background 0.1s' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{st.name}</div>
                      <div style={{ fontSize: '0.76rem', color: '#64748b' }}>Lead: {st.adminName}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: '6px',
                        fontFamily: 'monospace',
                        color: '#1d4ed8',
                        fontSize: '0.82rem',
                        fontWeight: 700
                      }}>
                        {st.code}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#334155' }}>
                      {st.location || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#334155', fontWeight: 600 }}>
                      {st.staffCount}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>
                      {fmtNum(st.totalBills)}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 800, color: '#059669' }}>
                      {fmtRs(st.grossSales)}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#7c3aed', fontWeight: 600 }}>
                      {fmtRs(st.totalGst)}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#475569' }}>
                      {fmtRs(st.cash)}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#475569' }}>
                      {fmtRs(st.upi)}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#d97706', fontWeight: 600 }}>
                      {fmtRs(st.credit)}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: st.status === 'active' ? '#dcfce7' : '#fee2e2',
                        color: st.status === 'active' ? '#15803d' : '#b91c1c'
                      }}>
                        {st.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two Column Section: Top Products & Invoices Registry */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* Top Selling Products */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '22px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={19} color="#7c3aed" />
            Top Selling Products Network-Wide
          </div>

          <div style={{ overflowY: 'auto', maxHeight: '350px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.76rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700 }}>Product</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700 }}>Units Sold</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700 }}>Revenue (₹)</th>
                </tr>
              </thead>
              <tbody>
                {(data?.topProducts || []).length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>No product data recorded yet.</td>
                  </tr>
                ) : (
                  (data?.topProducts || []).map((p, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: '#ffffff' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.75rem', width: '22px', height: '22px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontWeight: 700 }}>
                            {idx + 1}
                          </span>
                          <span>{p.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', color: '#334155', fontWeight: 600 }}>
                        {fmtNum(p.unitsSold)}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                        {fmtRs(p.revenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invoice Summary with Excel Export */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '22px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Receipt size={19} color="#059669" />
              Recent SAM Invoices ({filteredInvoices.length})
            </div>
            <button
              onClick={exportInvoicesExcel}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                background: '#ecfdf5',
                color: '#059669',
                border: '1px solid #a7f3d0',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <Download size={14} />
              Export Invoices XLSX
            </button>
          </div>

          {/* Quick Invoice Search */}
          <div style={{ marginBottom: '12px' }}>
            <input
              type="text"
              placeholder="Search SAM invoice number, customer..."
              value={invoiceSearchQuery}
              onChange={(e) => setInvoiceSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: '#f8fafc',
                color: '#0f172a',
                border: '1px solid #cbd5e1',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ overflowY: 'auto', maxHeight: '310px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.76rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>Invoice No</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>Store</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>Customer</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>Total (₹)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>Mode</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.slice(0, 20).map((inv, idx) => (
                  <tr key={inv.id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: '#ffffff' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        color: '#0369a1',
                        background: '#f0f9ff',
                        padding: '3px 7px',
                        borderRadius: '6px',
                        border: '1px solid #bae6fd',
                        fontSize: '0.78rem'
                      }}>
                        {inv.invoiceNo}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#334155', fontWeight: 600 }}>
                      {inv.storeCode || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#64748b' }}>
                      {inv.customerName || 'Walk-in'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                      {fmtRs(inv.grandTotal)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontWeight: 600,
                        background: inv.paymentMode?.toLowerCase().includes('credit') ? '#fffbeb' : '#f1f5f9',
                        color: inv.paymentMode?.toLowerCase().includes('credit') ? '#b45309' : '#475569',
                        border: inv.paymentMode?.toLowerCase().includes('credit') ? '1px solid #fde68a' : '1px solid #e2e8f0'
                      }}>
                        {inv.paymentMode || 'Cash'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
