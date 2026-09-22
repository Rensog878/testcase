import { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import { Printer, Eye, Search, RefreshCw, Filter, History, ReceiptText } from 'lucide-react'
import ExactGstInvoice from '../../components/billing/ExactGstInvoice'

export default function InvoiceHistory() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('ALL')
  const [selectedInvoice, setSelectedInvoice] = useState(null)

  const authHeader = () => {
    const user = JSON.parse(localStorage.getItem('sathya_user') || '{}')
    const token = user.token || localStorage.getItem('sathya_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const loadInvoices = () => {
    setLoading(true)
    axios.get('/api/billing/invoices', { headers: authHeader() })
      .then(({ data }) => {
        if (data.success) setInvoices(data.data || [])
      })
      .catch(() => toast.error('Could not load invoice history'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadInvoices()
  }, [])

  const filteredInvoices = invoices.filter(inv => {
    const term = search.toLowerCase()
    const matchesSearch =
      (inv.invoiceNo || '').toLowerCase().includes(term) ||
      (inv.id || '').toLowerCase().includes(term) ||
      (inv.customerName || '').toLowerCase().includes(term) ||
      (inv.customerPhone || '').toLowerCase().includes(term)

    const matchesPayment = paymentFilter === 'ALL' ||
      (inv.paymentMode || '').toLowerCase() === paymentFilter.toLowerCase()

    return matchesSearch && matchesPayment
  })

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 40 }}>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><History size={24} /> Invoice &amp; Credit Note History</h1>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Review, inspect, and reprint official Sathyam Bio GST e-Invoices
          </p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={loadInvoices} disabled={loading}>
          <RefreshCw size={14} style={{ marginRight: 5 }} /> Refresh Records
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
            <input
              className="form-input"
              style={{ paddingLeft: 36 }}
              placeholder="Search by Invoice No, Customer Name, Phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={15} color="var(--text-muted)" />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Payment Mode:</span>
            <select
              className="form-select"
              value={paymentFilter}
              onChange={e => setPaymentFilter(e.target.value)}
              style={{ width: 170, fontSize: '0.82rem' }}
            >
              <option value="ALL">All Modes</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Credit Purchase">Credit Purchase</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Generated Bills ({filteredInvoices.length})</div>
          <span className="badge badge-teal">GST Records</span>
        </div>

        {loading ? (
          <div className="empty-state" style={{ padding: '40px' }}>
            <p>Loading invoice records...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px' }}>
            <ReceiptText size={32} />
            <p>No invoices matching your search.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Doc Type &amp; No.</th>
                  <th>Date</th>
                  <th>Customer / Buyer</th>
                  <th>Payment Mode</th>
                  <th>Items</th>
                  <th>GST Tax</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map(invoice => (
                  <tr key={invoice.id || invoice._id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--brand-400)', fontSize: '0.85rem' }}>
                        {invoice.invoiceNo || invoice.id}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {invoice.documentType || 'TAX INVOICE'}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {new Date(invoice.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{invoice.customerName || 'Walk-in Customer'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {invoice.customerPhone || invoice.buyerDetails?.phone || '—'}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${
                        invoice.paymentMode === 'Credit Purchase' ? 'badge-purple' :
                        invoice.paymentMode === 'UPI' ? 'badge-blue' :
                        invoice.paymentMode === 'Bank Transfer' ? 'badge-teal' : 'badge-green'
                      }`} style={{ fontSize: '0.72rem' }}>
                        {invoice.paymentMode || 'Cash'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {invoice.items?.length || 0} item{(invoice.items?.length || 0) !== 1 ? 's' : ''}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#a78bfa' }}>
                      ₹{Number(invoice.totalGst || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ color: '#34d399', fontWeight: 700, fontSize: '0.9rem' }}>
                      ₹{Number(invoice.grandTotal || 0).toLocaleString('en-IN')}
                    </td>
                    <td>
                      <span className={`badge ${invoice.status === 'CREDIT' ? 'badge-yellow' : 'badge-teal'}`} style={{ fontSize: '0.7rem' }}>
                        {invoice.status || 'PAID'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', fontSize: '0.75rem' }}
                        onClick={() => setSelectedInvoice(invoice)}
                      >
                        <Printer size={13} /> View / Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Popup for Exact Invoice */}
      {selectedInvoice && (
        <ExactGstInvoice
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onPrint={() => window.print()}
        />
      )}
    </div>
  )
}
