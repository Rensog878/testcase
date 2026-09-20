import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import axios from 'axios'
import { Tag, Check, Percent } from 'lucide-react'

export default function BillingDashboard() {
  const [items, setItems] = useState([])
  const [catalog, setCatalog] = useState([])
  const [selected, setSelected] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [qty, setQty] = useState(1)
  const [discountPercent, setDiscountPercent] = useState(0)
  const [couponCodeInput, setCouponCodeInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [couponDiscountAmount, setCouponDiscountAmount] = useState(0)
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [paymentMode, setPaymentMode] = useState('Cash')
  const [invoiceVisible, setInvoiceVisible] = useState(false)
  const [invoice, setInvoice] = useState(null)
  const [todayStats, setTodayStats] = useState({ sales: 0, transactions: 0, gst: 0 })
  const [invoiceHistory, setInvoiceHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const authHeader = () => {
    const user = JSON.parse(localStorage.getItem('sathya_user') || '{}')
    const token = user.token || localStorage.getItem('sathya_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  useEffect(() => {
    // Load all products (including offline-only)
    axios.get('/api/products')
      .then(({ data }) => {
        if (data.success) {
          const products = (data.data || []).map(product => {
            const gstRate = Number(product.gstRate ?? product.gst) || 18
            const cgstRate = Number(product.cgstRate) || +(gstRate / 2).toFixed(2)
            const sgstRate = Number(product.sgstRate) || +(gstRate / 2).toFixed(2)
            const igstRate = Number(product.igstRate) || gstRate
            return {
              ...product,
              hsnCode: product.hsnCode || product.hsn || '380899',
              gstRate,
              cgstRate,
              sgstRate,
              igstRate,
              price: Number(product.price) || 0
            }
          })
          setCatalog(products)
          setSelected(products[0]?.id || '')
        }
      })
      .catch(() => toast.error('Could not load products for billing'))

    // Load today's stats from invoice history
    loadTodayStats()
    loadInvoiceHistory()
  }, [])

  const loadTodayStats = async () => {
    try {
      const { data } = await axios.get('/api/billing/invoices', { headers: authHeader() })
      if (data.success) {
        const today = new Date().toDateString()
        const todayInvoices = (data.data || []).filter(inv =>
          new Date(inv.date).toDateString() === today
        )
        const sales = todayInvoices.reduce((s, inv) => s + (Number(inv.grandTotal) || 0), 0)
        const gst = todayInvoices.reduce((s, inv) => s + (Number(inv.totalGst) || 0), 0)
        setTodayStats({ sales, transactions: todayInvoices.length, gst })
      }
    } catch {
      // Not critical
    }
  }

  const loadInvoiceHistory = async () => {
    setHistoryLoading(true)
    try {
      const { data } = await axios.get('/api/billing/invoices', { headers: authHeader() })
      if (data.success) setInvoiceHistory((data.data || []).slice(0, 20))
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false)
    }
  }

  const addItem = () => {
    const product = catalog.find(p => p.id === selected)
    if (!product) { toast.error('Select a product first'); return }
    const existing = items.find(i => i.id === selected)
    if (existing) setItems(items.map(i => i.id === selected ? { ...i, qty: i.qty + qty } : i))
    else setItems([...items, { ...product, qty }])
    toast.success(`${product.name} added`)
  }

  const filteredCatalog = catalog.filter(product =>
    `${product.name} ${product.category || ''} ${product.id} ${product.hsnCode || ''}`.toLowerCase().includes(productSearch.toLowerCase())
  )

  const removeItem = (id) => setItems(items.filter(i => i.id !== id))
  const updateQty = (id, newQty) => {
    if (newQty < 1) return
    setItems(items.map(i => i.id === id ? { ...i, qty: newQty } : i))
  }

  // Calculation Logic
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
  const manualDiscAmt = Math.round(subtotal * (discountPercent / 100))
  const totalDiscount = manualDiscAmt + couponDiscountAmount
  const taxable = Math.max(0, subtotal - totalDiscount)

  // Weighted/aggregated GST tax calculations
  let cgstTotal = 0
  let sgstTotal = 0
  let igstTotal = 0

  items.forEach(i => {
    const lineTotal = i.price * i.qty
    const lineRatio = subtotal > 0 ? lineTotal / subtotal : 0
    const lineTaxable = Math.max(0, lineTotal - totalDiscount * lineRatio)
    cgstTotal += lineTaxable * (i.cgstRate / 100)
    sgstTotal += lineTaxable * (i.sgstRate / 100)
    igstTotal += lineTaxable * (i.igstRate / 100)
  })

  cgstTotal = Math.round(cgstTotal)
  sgstTotal = Math.round(sgstTotal)
  igstTotal = Math.round(igstTotal)
  const grandTotal = taxable + cgstTotal + sgstTotal

  const applyCoupon = async () => {
    if (!couponCodeInput.trim()) {
      toast.error('Enter a coupon code')
      return
    }
    setValidatingCoupon(true)
    try {
      // The endpoint reads `cartTotal` and answers { success, data: {...} }.
      // This sent `cartSubtotal` and read `data.coupon`/`data.discountAmount`,
      // so the counter's coupon box always priced the basket at 0 and applied
      // nothing - it never once worked.
      const { data } = await axios.post('/api/coupons/validate', {
        code: couponCodeInput.trim(),
        cartTotal: subtotal,
        userPhone: customerPhone
      })

      if (data.success && data.data) {
        setAppliedCoupon(data.data)
        setCouponDiscountAmount(data.data.discount || 0)
        toast.success(`Coupon '${data.data.code}' applied! Saved ₹${data.data.discount}`)
      } else {
        toast.error(data.message || 'Invalid coupon code')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not validate coupon')
    } finally {
      setValidatingCoupon(false)
    }
  }

  const removeCoupon = () => {
    setAppliedCoupon(null)
    setCouponDiscountAmount(0)
    setCouponCodeInput('')
    toast.info('Coupon removed')
  }

  const printInvoice = async () => {
    if (items.length === 0) { toast.error('Add items first'); return }
    try {
      const { data } = await axios.post('/api/billing/invoice', {
        customerName,
        customerPhone,
        discountAmount: totalDiscount,
        couponCode: appliedCoupon?.code || '',
        paymentMode,
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          hsnCode: item.hsnCode,
          price: item.price,
          qty: item.qty,
          gstRate: item.gstRate,
          cgstRate: item.cgstRate,
          sgstRate: item.sgstRate,
          igstRate: item.igstRate
        }))
      }, { headers: authHeader() })

      if (!data.success) throw new Error(data.message || 'Could not create invoice')

      // Record coupon usage in DB if applied
      if (appliedCoupon) {
        axios.post('/api/coupons/use', {
          couponId: appliedCoupon._id || appliedCoupon.id,
          code: appliedCoupon.code,
          customerPhone: customerPhone || 'Walk-in Customer',
          customerName: customerName || 'Walk-in Customer',
          orderId: data.invoice.id,
          discountAmount: couponDiscountAmount,
          orderTotal: grandTotal
        }, { headers: authHeader() }).catch(() => {})
      }

      setInvoice(data.invoice)
      toast.success('GST Invoice created successfully! 🧾')
      loadTodayStats()
      loadInvoiceHistory()
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Could not create invoice')
      return
    }
    setInvoiceVisible(true)
    setTimeout(() => window.print(), 300)
  }

  const clearBill = () => {
    setItems([])
    setCustomerName('')
    setCustomerPhone('')
    setDiscountPercent(0)
    setCouponCodeInput('')
    setAppliedCoupon(null)
    setCouponDiscountAmount(0)
    setPaymentMode('Cash')
    setInvoiceVisible(false)
    setInvoice(null)
  }

  const KPI = [
    { label: "Today's Sales", value: `₹${todayStats.sales.toLocaleString('en-IN')}`, icon: '₹', color: '#34d399' },
    { label: 'Transactions Today', value: String(todayStats.transactions), icon: '🧾', color: '#60a5fa' },
    { label: 'GST Collected Today', value: `₹${todayStats.gst.toLocaleString('en-IN')}`, icon: '📊', color: '#a78bfa' },
  ]

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1>🧾 POS Billing Counter & GST Tax Engine</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>GSTIN: 33AABCS1234F1Z8 · Tamil Nadu (State Code: 33)</p>
        </div>
      </div>

      {/* Today's KPI Stats */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        {KPI.map(item => (
          <div key={item.label} className="stat-card green">
            <div className="stat-value" style={{ fontSize: '1.5rem', color: item.color }}>{item.value}</div>
            <div className="stat-label">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="pos-billing-layout billing-workspace">
        {/* Left: Item selection + bill */}
        <div>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header"><div className="card-title">Add Item to Bill</div></div>
            <div className="pos-add-item-row">
              <div className="form-group billing-product-search" style={{ marginBottom: 0 }}>
                <label className="form-label">Search Product</label>
                <input
                  className="form-input"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="Search by name, HSN or category"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Product</label>
                <select className="form-select" value={selected} onChange={e => setSelected(e.target.value)}>
                  {filteredCatalog.length === 0
                    ? <option value="">No products match</option>
                    : filteredCatalog.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} — ₹{p.price} [HSN: {p.hsnCode} | GST: {p.gstRate}%]
                        {p.visibility === 'offline' ? ' (Counter Only)' : ''}
                      </option>
                    ))
                  }
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Qty</label>
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  value={qty}
                  onChange={e => setQty(Math.max(1, Number(e.target.value)))}
                  style={{ width: 80 }}
                />
              </div>
              <button className="btn btn-primary" onClick={addItem}>+ Add</button>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Bill Items ({items.length})</div>
              {items.length > 0 && (
                <button className="btn btn-outline btn-sm" onClick={clearBill}>Clear Bill</button>
              )}
            </div>
            {items.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px' }}>
                <div style={{ fontSize: '2rem' }}>🧾</div>
                <p>Add products to start billing</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>HSN Code</th>
                      <th>GST Rate</th>
                      <th>CGST / SGST</th>
                      <th>Unit Rate</th>
                      <th>Qty</th>
                      <th>Total Amount</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(i => (
                      <tr key={i.id}>
                        <td style={{ fontWeight: 600 }}>{i.name}</td>
                        <td>
                          <span className="badge badge-gray" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            {i.hsnCode}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>
                            {i.gstRate}% GST
                          </span>
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {i.cgstRate}% + {i.sgstRate}%
                        </td>
                        <td>₹{i.price.toLocaleString('en-IN')}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ padding: '2px 8px', minWidth: 28 }}
                              onClick={() => updateQty(i.id, i.qty - 1)}
                            >−</button>
                            <span style={{ minWidth: 24, textAlign: 'center' }}>{i.qty}</span>
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ padding: '2px 8px', minWidth: 28 }}
                              onClick={() => updateQty(i.id, i.qty + 1)}
                            >+</button>
                          </div>
                        </td>
                        <td style={{ color: 'var(--brand-400)', fontWeight: 700 }}>
                          ₹{(i.price * i.qty).toLocaleString('en-IN')}
                        </td>
                        <td>
                          <button className="btn btn-danger btn-sm" onClick={() => removeItem(i.id)}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Invoice History */}
          <div className="card" style={{ marginTop: '20px' }}>
            <div className="card-header">
              <div className="card-title">Recent Invoices</div>
              <button className="btn btn-outline btn-sm" onClick={loadInvoiceHistory}>↺ Refresh</button>
            </div>
            {historyLoading ? (
              <div style={{ padding: '16px', color: 'var(--text-muted)', textAlign: 'center' }}>Loading…</div>
            ) : invoiceHistory.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px' }}>
                <p>No invoices generated yet</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Invoice ID</th>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Coupon / Discount</th>
                      <th>GST Tax</th>
                      <th>Payment</th>
                      <th>Grand Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceHistory.map(inv => (
                      <tr key={inv.id || inv._id}>
                        <td style={{ fontWeight: 600, color: 'var(--brand-400)', fontSize: '0.82rem' }}>{inv.id || inv._id}</td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {new Date(inv.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{inv.customerName || 'Walk-in'}</td>
                        <td style={{ fontSize: '0.8rem' }}>
                          {inv.couponCode ? (
                            <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>🏷️ {inv.couponCode} (-₹{inv.discountAmount})</span>
                          ) : inv.discountAmount > 0 ? (
                            <span>-₹{inv.discountAmount}</span>
                          ) : '—'}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: '#a78bfa' }}>₹{Number(inv.totalGst || 0).toLocaleString('en-IN')}</td>
                        <td><span className="badge badge-green" style={{ fontSize: '0.72rem' }}>{inv.paymentMode || 'Cash'}</span></td>
                        <td style={{ fontWeight: 700, color: '#34d399' }}>₹{Number(inv.grandTotal || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: Bill summary & Coupon Code application */}
        <div style={{ position: 'sticky', top: '80px' }}>
          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="card-header"><div className="card-title">💰 Bill Summary & Checkout</div></div>

            <div className="form-group">
              <label className="form-label">Customer Name</label>
              <input
                className="form-input"
                placeholder="Walk-in Customer"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Customer Phone (for Coupons/Receipts)</label>
              <input
                className="form-input"
                placeholder="Mobile number"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
              />
            </div>

            {/* Coupon Code Section */}
            <div className="form-group" style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--dark-700)' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Tag size={14} color="#a78bfa" /> Apply Admin Coupon Code
              </label>
              {appliedCoupon ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(167, 139, 250, 0.15)', border: '1px solid #a78bfa', padding: '8px 12px', borderRadius: '6px' }}>
                  <div>
                    <strong style={{ color: '#a78bfa', fontSize: '0.85rem' }}>{appliedCoupon.code}</strong>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Saved ₹{couponDiscountAmount.toLocaleString('en-IN')}</div>
                  </div>
                  <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: '0.75rem', color: '#f87171' }} onClick={removeCoupon}>Remove</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    className="form-input"
                    placeholder="Enter COUPON"
                    value={couponCodeInput}
                    onChange={e => setCouponCodeInput(e.target.value.toUpperCase())}
                    style={{ fontSize: '0.85rem', textTransform: 'uppercase' }}
                  />
                  <button className="btn btn-outline" onClick={applyCoupon} disabled={validatingCoupon} style={{ padding: '0 12px', fontSize: '0.8rem' }}>
                    {validatingCoupon ? 'Validating...' : 'Apply'}
                  </button>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Manual Discount (%)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                max="100"
                value={discountPercent}
                onChange={e => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Payment Mode</label>
              <select className="form-select" value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                <option>Cash</option>
                <option>UPI</option>
                <option>Card</option>
                <option>Bank Transfer</option>
              </select>
            </div>

            {/* Bill Calculations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem', marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Items Subtotal</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>

              {manualDiscAmt > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f87171' }}>
                  <span>Manual Discount ({discountPercent}%)</span>
                  <span>-₹{manualDiscAmt.toLocaleString('en-IN')}</span>
                </div>
              )}

              {couponDiscountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a78bfa' }}>
                  <span>Coupon Discount ({appliedCoupon?.code})</span>
                  <span>-₹{couponDiscountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Taxable Amount</span>
                <span>₹{taxable.toLocaleString('en-IN')}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#60a5fa', fontSize: '0.82rem' }}>
                <span>CGST (Central Tax)</span>
                <span>+₹{cgstTotal.toLocaleString('en-IN')}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#60a5fa', fontSize: '0.82rem' }}>
                <span>SGST (State Tax)</span>
                <span>+₹{sgstTotal.toLocaleString('en-IN')}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#93c5fd', fontSize: '0.78rem', fontStyle: 'italic' }}>
                <span>IGST Equivalent (Integrated Tax)</span>
                <span>₹{igstTotal.toLocaleString('en-IN')}</span>
              </div>

              <div style={{
                display: 'flex', justifyContent: 'space-between', fontWeight: 800,
                fontSize: '1.25rem', color: 'var(--text-primary)',
                borderTop: '1px solid var(--surface-border-subtle)', paddingTop: '10px', marginTop: '4px'
              }}>
                <span>Grand Total</span>
                <span style={{ color: '#34d399' }}>₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <button
            className="btn btn-primary btn-full btn-lg"
            onClick={printInvoice}
            disabled={items.length === 0}
            style={{ marginBottom: '10px' }}
          >
            🖨️ Create &amp; Print GST Invoice
          </button>
          {items.length > 0 && (
            <button className="btn btn-outline btn-full" onClick={clearBill}>
              🗑 Clear Bill
            </button>
          )}
        </div>
      </div>

      {/* GST Invoice Print View */}
      {invoiceVisible && invoice && (
        <div id="gst-invoice" className="print-invoice">
          <div className="invoice-brand">SATHYAM <span>BIO</span></div>
          <h1>GST TAX INVOICE</h1>
          <div className="invoice-meta">
            <span>Invoice #: {invoice.id}</span>
            <span>Date: {new Date(invoice.date).toLocaleString('en-IN')}</span>
          </div>
          <div className="invoice-customer">
            <strong>Bill to:</strong><br />
            {invoice.customerName || 'Walk-in Customer'}<br />
            {invoice.customerPhone || ''}
          </div>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>HSN</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>CGST</th>
                <th>SGST</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map(item => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.hsnCode}</td>
                  <td>{item.qty}</td>
                  <td>₹{Number(item.price).toLocaleString('en-IN')}</td>
                  <td>{item.cgstRate}%</td>
                  <td>{item.sgstRate}%</td>
                  <td>₹{(Number(item.price) * Number(item.qty)).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="invoice-total">
            <span>Subtotal: ₹{invoice.subtotal?.toLocaleString('en-IN')}</span>
            {invoice.discountAmount > 0 && <span>Discount / Coupon: -₹{invoice.discountAmount?.toLocaleString('en-IN')}</span>}
            <span>CGST: ₹{invoice.cgst?.toLocaleString('en-IN')}</span>
            <span>SGST: ₹{invoice.sgst?.toLocaleString('en-IN')}</span>
            <span>Total GST: ₹{invoice.totalGst?.toLocaleString('en-IN')}</span>
            <strong>Grand Total: ₹{invoice.grandTotal?.toLocaleString('en-IN')}</strong>
          </div>
          <p>Payment mode: {invoice.paymentMode} · Cashier: {invoice.cashier}</p>
          <button
            className="btn btn-outline btn-sm"
            style={{ marginTop: '16px', display: 'block' }}
            onClick={() => { setInvoiceVisible(false); clearBill() }}
          >
            ✓ Done – Start New Bill
          </button>
        </div>
      )}
    </div>
  )
}
