import ComingSoon from '../../components/ComingSoon'

// Invoice history depends on the billing counter, Phase 2 work — not part
// of this presentation build. Real implementation kept below, commented
// out, to restore later.

/*
import { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'sonner'

export default function InvoiceHistory() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('/api/billing/invoices')
      .then(({ data }) => {
        if (data.success) setInvoices(data.data || [])
      })
      .catch(() => toast.error('Could not load invoice history'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div><h1>🗂️ Invoice history</h1><p>Review invoices created from the billing counter.</p></div>
      </div>
      <div className="card">
        <div className="card-header">
          <div className="card-title">Generated invoices ({invoices.length})</div>
          <span className="badge badge-teal">GST records</span>
        </div>
        {loading ? <div className="empty-state" style={{ padding: '40px' }}><p>Loading invoice history...</p></div> : invoices.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px' }}><div style={{ fontSize: '2rem' }}>🧾</div><p>No invoices have been created yet.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Payment</th><th>Items</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>{invoices.map(invoice => (
                <tr key={invoice.id}>
                  <td style={{ fontWeight: 700 }}>{invoice.id}</td>
                  <td>{new Date(invoice.date).toLocaleString('en-IN')}</td>
                  <td>{invoice.customerName}<br /><small style={{ color: 'var(--text-muted)' }}>{invoice.customerPhone || 'Walk-in customer'}</small></td>
                  <td>{invoice.paymentMode}</td>
                  <td>{invoice.items?.length || 0}</td>
                  <td style={{ color: 'var(--brand-400)', fontWeight: 700 }}>₹{Number(invoice.grandTotal || 0).toLocaleString()}</td>
                  <td><span className="badge badge-teal">{invoice.status || 'PAID'}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
*/

export default function InvoiceHistory() {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div><h1>🗂️ Invoice history</h1></div>
      </div>
      <div className="card">
        <ComingSoon title="Invoice history — coming soon" message="Generated GST invoices will be listed here in the next phase." />
      </div>
    </div>
  )
}
