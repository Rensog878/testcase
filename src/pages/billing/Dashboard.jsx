import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import axios from 'axios'
import {
  Tag,
  Check,
  Percent,
  FileText,
  Truck,
  CreditCard,
  User,
  Package,
  Printer,
  Eye,
  RefreshCw,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  Building
  , Banknote, Smartphone, Landmark, Search as SearchIcon, AlertTriangle, ReceiptText, WalletCards
} from 'lucide-react'
import ExactGstInvoice from '../../components/billing/ExactGstInvoice'
import { numberToIndianWords } from '../../utils/numberToWords'

export default function BillingDashboard() {
  // Catalog & Inventory
  const [catalog, setCatalog] = useState([])
  const [selectedProduct, setSelectedProduct] = useState('')
  const [productSearch, setProductSearch] = useState('')

  // Item Addition Form
  const [itemQty, setItemQty] = useState(1)
  const [itemRate, setItemRate] = useState('')
  const [itemUnit, setItemUnit] = useState('Nos')
  const [itemBatch, setItemBatch] = useState('Primary Batch')
  const [itemHsn, setItemHsn] = useState('31010099')
  const [itemGstRate, setItemGstRate] = useState(18)
  const [itemDiscPercent, setItemDiscPercent] = useState(0)

  // Current Bill Items
  const [items, setItems] = useState([])

  // Document Details
  const [documentType, setDocumentType] = useState('TAX INVOICE')
  const [invoiceNo, setInvoiceNo] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0])
  const [ackNo, setAckNo] = useState('')
  const [ackDate, setAckDate] = useState(() => {
    return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
  })
  const [irn, setIrn] = useState('')

  // Buyer (Bill To) Details
  const [buyerName, setBuyerName] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [buyerAddress, setBuyerAddress] = useState('')
  const [buyerCityState, setBuyerCityState] = useState('')
  const [buyerPincode, setBuyerPincode] = useState('')
  const [buyerGstin, setBuyerGstin] = useState('')
  const [buyerState, setBuyerState] = useState('Tamil Nadu')
  const [buyerStateCode, setBuyerStateCode] = useState('33')
  const [placeOfSupply, setPlaceOfSupply] = useState('Tamil Nadu')
  const [contactName, setContactName] = useState('')

  // Consignee (Ship To) Details
  const [sameAsBuyer, setSameAsBuyer] = useState(false)
  const [consigneeName, setConsigneeName] = useState('')
  const [consigneeSubName, setConsigneeSubName] = useState('')
  const [consigneeAddress, setConsigneeAddress] = useState('')
  const [consigneeCityState, setConsigneeCityState] = useState('')
  const [consigneePhone, setConsigneePhone] = useState('')
  const [consigneePincode, setConsigneePincode] = useState('')
  const [consigneeGstin, setConsigneeGstin] = useState('')

  // Despatch & Transport Details
  const [showTransportSection, setShowTransportSection] = useState(true)
  const [buyersOrderNo, setBuyersOrderNo] = useState('')
  const [orderDate, setOrderDate] = useState('')
  const [despatchDocNo, setDespatchDocNo] = useState('')
  const [deliveryNoteDate, setDeliveryNoteDate] = useState('')
  const [despatchedThrough, setDespatchedThrough] = useState('')
  const [destination, setDestination] = useState('')
  const [billOfLading, setBillOfLading] = useState('')
  const [motorVehicleNo, setMotorVehicleNo] = useState('')
  const [termsOfDelivery, setTermsOfDelivery] = useState('Door Delivery')

  // Payment Mode & References
  // Options: Cash, UPI, Card, Bank Transfer, Credit Purchase
  const [paymentMode, setPaymentMode] = useState('Cash')
  const [paymentTerms, setPaymentTerms] = useState('Immediate')
  const [buyerRef, setBuyerRef] = useState('')
  const [otherReferences, setOtherReferences] = useState('')

  // Coupon & Global Discount
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState(0)
  const [couponCodeInput, setCouponCodeInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [couponDiscountAmount, setCouponDiscountAmount] = useState(0)
  const [validatingCoupon, setValidatingCoupon] = useState(false)

  // Invoice Preview & History
  const [activeInvoiceForView, setActiveInvoiceForView] = useState(null)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [todayStats, setTodayStats] = useState({ sales: 0, transactions: 0, gst: 0 })
  const [invoiceHistory, setInvoiceHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const authHeader = () => {
    const user = JSON.parse(localStorage.getItem('sathya_user') || '{}')
    const token = user.token || localStorage.getItem('sathya_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // Load Products & Invoices
  useEffect(() => {
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
              hsnCode: product.hsnCode || product.hsn || '31010099',
              gstRate,
              cgstRate,
              sgstRate,
              igstRate,
              price: Number(product.price) || 0,
              unit: product.unit || 'Nos'
            }
          })
          setCatalog(products)
          if (products[0]) {
            selectProduct(products[0])
          }
        }
      })
      .catch(() => toast.error('Could not load products for billing'))

    // Fetch the next SAM-formatted invoice number from server
    fetchNextInvoiceNo()

    loadTodayStats()
    loadInvoiceHistory()
  }, [])

  // Fetch next SAM invoice number from server
  const fetchNextInvoiceNo = async () => {
    try {
      const { data } = await axios.get('/api/billing/next-invoice-no')
      if (data.success && data.invoiceNo) {
        setInvoiceNo(data.invoiceNo)
      }
    } catch {
      // Fallback: generate a client-side SAM number if server call fails
      const user = JSON.parse(localStorage.getItem('sathya_user') || '{}')
      const code = user.storeCode || 'GEN'
      setInvoiceNo(`SAM ${code} ${Date.now().toString().slice(-4)}`)
    }
  }

  // When documentType changes, keep the SAM number intact (just update doc type label)
  const handleDocTypeChange = (type) => {
    setDocumentType(type)
    // SAM invoice number stays the same regardless of doc type
  }

  const selectProduct = (p) => {
    setSelectedProduct(p.id)
    setItemRate(p.price)
    setItemHsn(p.hsnCode || '31010099')
    setItemGstRate(p.gstRate || 18)
    setItemUnit(p.unit || 'Nos')
  }

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
      // ignore
    }
  }

  const loadInvoiceHistory = async () => {
    setHistoryLoading(true)
    try {
      const { data } = await axios.get('/api/billing/invoices', { headers: authHeader() })
      if (data.success) setInvoiceHistory((data.data || []).slice(0, 30))
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleProductDropdownChange = (e) => {
    const prodId = e.target.value
    const found = catalog.find(p => p.id === prodId)
    if (found) {
      selectProduct(found)
    }
  }

  // Add Item to Bill
  const addItem = () => {
    const product = catalog.find(p => p.id === selectedProduct)
    const name = product ? product.name : (productSearch?.trim() || 'Custom Product')

    if (!selectedProduct && !productSearch?.trim()) {
      toast.error('Please select a product or enter a custom product name')
      return
    }

    const parsedRate = parseFloat(itemRate)
    const rate = Number.isFinite(parsedRate) ? parsedRate : (product ? product.price : 0)

    if (!Number.isFinite(rate) || rate <= 0) {
      toast.error('Enter a valid Rate (must be greater than 0)')
      return
    }

    const qty = Math.max(1, Number(itemQty) || 1)
    const discPercent = Math.max(0, Number(itemDiscPercent) || 0)
    const lineAmount = (qty * rate) * (1 - discPercent / 100)
    const gstRate = Number(itemGstRate) || 18
    const cgstRate = +(gstRate / 2).toFixed(2)
    const sgstRate = +(gstRate / 2).toFixed(2)

    const newItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name,
      batch: itemBatch || 'Primary Batch',
      hsnCode: itemHsn || '31010099',
      qty,
      unit: itemUnit || 'Nos',
      rate,
      price: rate,
      per: itemUnit || 'Nos',
      discPercent,
      amount: lineAmount,
      lineTotal: lineAmount,
      gstRate,
      cgstRate,
      sgstRate,
      lineCgst: +(lineAmount * (cgstRate / 100)).toFixed(2),
      lineSgst: +(lineAmount * (sgstRate / 100)).toFixed(2)
    }

    setItems(prev => [...prev, newItem])
    toast.success(`✅ Added "${name}" to bill`)

    // Reset for next entry
    setItemQty(1)
    setItemDiscPercent(0)
    setProductSearch('')
  }

  const removeItem = (id) => setItems(items.filter(i => i.id !== id))

  const updateItemQty = (id, newQty) => {
    if (newQty < 1) return
    setItems(items.map(i => {
      if (i.id === id) {
        const lineAmount = (newQty * i.rate) * (1 - (i.discPercent || 0) / 100)
        return {
          ...i,
          qty: newQty,
          amount: lineAmount,
          lineTotal: lineAmount,
          lineCgst: +(lineAmount * (i.cgstRate / 100)).toFixed(2),
          lineSgst: +(lineAmount * (i.sgstRate / 100)).toFixed(2)
        }
      }
      return i
    }))
  }

  // Calculations
  const itemsSubtotal = items.reduce((s, i) => s + i.amount, 0)
  const manualDiscAmt = Math.round(itemsSubtotal * (globalDiscountPercent / 100))
  const totalDiscount = manualDiscAmt + couponDiscountAmount
  const taxableSubtotal = Math.max(0, itemsSubtotal - totalDiscount)

  // Calculate taxes
  let totalCgst = 0
  let totalSgst = 0
  items.forEach(i => {
    const ratio = itemsSubtotal > 0 ? i.amount / itemsSubtotal : 0
    const lineTaxable = Math.max(0, i.amount - totalDiscount * ratio)
    totalCgst += lineTaxable * (i.cgstRate / 100)
    totalSgst += lineTaxable * (i.sgstRate / 100)
  })

  totalCgst = +(totalCgst.toFixed(2))
  totalSgst = +(totalSgst.toFixed(2))
  const totalGst = +(totalCgst + totalSgst).toFixed(2)

  const rawGrandTotal = taxableSubtotal + totalGst
  const roundedGrandTotal = Math.round(rawGrandTotal)
  const roundOff = +(roundedGrandTotal - rawGrandTotal).toFixed(2)

  const grandTotalWords = numberToIndianWords(roundedGrandTotal)
  const taxWords = numberToIndianWords(totalGst)

  // Coupon Handlers
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
        cartTotal: itemsSubtotal,
        userPhone: buyerPhone
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

  // Construct current invoice object
  const constructCurrentInvoicePayload = () => {
    const finalBuyer = {
      name: buyerName || 'Walk-in Customer',
      phone: buyerPhone || '',
      line1: buyerAddress || '',
      cityState: buyerCityState || 'Madurai-625016, Tamil Nadu',
      pincode: buyerPincode || '625016',
      gstin: buyerGstin || '',
      stateName: buyerState || 'Tamil Nadu',
      stateCode: buyerStateCode || '33',
      placeOfSupply: placeOfSupply || 'Tamil Nadu',
      contactName: contactName || buyerName
    }

    const finalConsignee = sameAsBuyer ? finalBuyer : {
      name: consigneeName || buyerName,
      subName: consigneeSubName || '',
      line1: consigneeAddress || buyerAddress,
      cityState: consigneeCityState || buyerCityState,
      phone: consigneePhone || buyerPhone,
      pincode: consigneePincode || buyerPincode,
      gstin: consigneeGstin || buyerGstin,
      stateName: buyerState || 'Tamil Nadu',
      stateCode: buyerStateCode || '33'
    }

    const finalDespatch = {
      buyersOrderNo,
      orderDate,
      despatchDocNo,
      deliveryNoteDate,
      despatchedThrough,
      destination
    }

    const finalTransport = {
      billOfLading,
      motorVehicleNo,
      termsOfDelivery
    }

    return {
      documentType,
      invoiceNo,
      date: invoiceDate,
      ackNo,
      ackDate,
      irn,
      customerName: buyerName,
      customerPhone: buyerPhone,
      buyerDetails: finalBuyer,
      consigneeDetails: finalConsignee,
      despatchDetails: finalDespatch,
      transportDetails: finalTransport,
      paymentMode,
      paymentTerms: paymentMode === 'Credit Purchase' ? (paymentTerms || '30 Days Credit') : paymentTerms,
      buyerRef,
      otherReferences,
      items,
      subtotal: itemsSubtotal,
      discountAmount: totalDiscount,
      couponCode: appliedCoupon?.code || '',
      roundOff,
      grandTotal: roundedGrandTotal,
      amountInWords: grandTotalWords,
      taxAmountInWords: taxWords
    }
  }

  // Preview Bill without saving yet
  const handlePreviewCurrentBill = () => {
    if (items.length === 0) {
      toast.error('Please add at least one item to preview the bill')
      return
    }
    const currentInv = constructCurrentInvoicePayload()
    setActiveInvoiceForView(currentInv)
    setIsInvoiceModalOpen(true)
  }

  // Create & Print GST Invoice
  const handleSaveAndPrintInvoice = async () => {
    if (items.length === 0) {
      toast.error('Please add at least one item before generating the bill')
      return
    }

    const payload = constructCurrentInvoicePayload()

    try {
      const { data } = await axios.post('/api/billing/invoice', payload, { headers: authHeader() })
      if (!data.success) throw new Error(data.message || 'Could not create invoice')

      // Record coupon usage
      if (appliedCoupon) {
        axios.post('/api/coupons/use', {
          couponId: appliedCoupon._id || appliedCoupon.id,
          code: appliedCoupon.code,
          customerPhone: buyerPhone || 'Walk-in Customer',
          customerName: buyerName || 'Walk-in Customer',
          orderId: data.invoice.id,
          discountAmount: couponDiscountAmount,
          orderTotal: roundedGrandTotal
        }, { headers: authHeader() }).catch(() => {})
      }

      toast.success('GST Invoice generated successfully! 🧾')
      setActiveInvoiceForView(data.invoice)
      setIsInvoiceModalOpen(true)
      loadTodayStats()
      loadInvoiceHistory()
      // Fetch the next SAM invoice number for the next bill
      fetchNextInvoiceNo()
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Could not create invoice')
    }
  }

  const clearCurrentBill = () => {
    setItems([])
    setGlobalDiscountPercent(0)
    setAppliedCoupon(null)
    setCouponDiscountAmount(0)
    setCouponCodeInput('')
    setBuyerRef('')
    setOtherReferences('')
    toast.info('Bill cleared')
  }

  const filteredCatalog = catalog.filter(product =>
    `${product.name} ${product.category || ''} ${product.id} ${product.hsnCode || ''}`.toLowerCase().includes(productSearch.toLowerCase())
  )

  const paymentOptions = [
    { id: 'Cash', label: 'Cash', icon: <Banknote size={18} /> },
    { id: 'UPI', label: 'UPI', icon: <Smartphone size={18} /> },
    { id: 'Card', label: 'Card', icon: <CreditCard size={18} /> },
    { id: 'Bank Transfer', label: 'Bank Transfer', icon: <Landmark size={18} /> },
    { id: 'Credit Purchase', label: 'Credit Purchase', icon: <WalletCards size={18} /> }
  ]

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 40 }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ReceiptText size={24} /> Sathyam Bio POS Billing &amp; e-Invoice Engine
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Official GSTIN: <strong>33BAAPS3641C1Z6</strong> · State: Tamil Nadu (33) · Vadipatti Unit 1
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline btn-sm" onClick={handlePreviewCurrentBill} disabled={items.length === 0}>
            <Eye size={15} style={{ marginRight: 5 }} /> Preview Bill
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleSaveAndPrintInvoice} disabled={items.length === 0}>
            <Printer size={15} style={{ marginRight: 5 }} /> Print e-Invoice
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card green">
          <div className="stat-value" style={{ fontSize: '1.4rem', color: '#34d399' }}>
            ₹{todayStats.sales.toLocaleString('en-IN')}
          </div>
          <div className="stat-label">Today&apos;s Sales</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-value" style={{ fontSize: '1.4rem', color: '#60a5fa' }}>
            {todayStats.transactions}
          </div>
          <div className="stat-label">Invoices Today</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-value" style={{ fontSize: '1.4rem', color: '#a78bfa' }}>
            ₹{todayStats.gst.toLocaleString('en-IN')}
          </div>
          <div className="stat-label">GST Tax Collected</div>
        </div>
      </div>

      {/* Main Grid: Left Inputs & Bill Table / Right Checkout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 24, alignItems: 'start' }}>
        {/* LEFT COLUMN: Input Panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* SECTION 1: Document Meta & Invoice Type */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem' }}>
                <FileText size={18} color="#60a5fa" /> Document &amp; e-Invoice Details
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['TAX INVOICE', 'CREDIT NOTE', 'BILL OF SUPPLY'].map(type => (
                  <button
                    key={type}
                    type="button"
                    className={`btn btn-sm ${documentType === type ? 'btn-primary' : 'btn-outline'}`}
                    style={{ fontSize: '0.72rem', padding: '3px 10px' }}
                    onClick={() => handleDocTypeChange(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>
                  {documentType === 'CREDIT NOTE' ? 'Credit Note No.' : 'Invoice No.'}
                </label>
                <input
                  className="form-input"
                  value={invoiceNo}
                  onChange={e => setInvoiceNo(e.target.value)}
                  style={{ fontWeight: 700, fontFamily: 'monospace' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Dated</label>
                <input
                  type="date"
                  className="form-input"
                  value={invoiceDate}
                  onChange={e => setInvoiceDate(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Ack No.</label>
                <input
                  className="form-input"
                  value={ackNo}
                  onChange={e => setAckNo(e.target.value)}
                  placeholder="Only for e-invoices"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Ack Date</label>
                <input
                  className="form-input"
                  value={ackDate}
                  onChange={e => setAckDate(e.target.value)}
                  placeholder="07 Aug 26"
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 12, marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                e-Invoice IRN (Invoice Reference Number)
              </label>
              <input
                className="form-input"
                value={irn}
                onChange={e => setIrn(e.target.value)}
                style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}
              />
            </div>
          </div>

          {/* SECTION 2: Buyer & Consignee Details */}
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem' }}>
                <User size={18} color="#34d399" /> Buyer (Bill To) &amp; Consignee (Ship To)
              </div>
            </div>

            {/* Buyer Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Buyer / Business Name *</label>
                <input
                  className="form-input"
                  value={buyerName}
                  onChange={e => setBuyerName(e.target.value)}
                  placeholder="Walk-in Customer"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Phone Number</label>
                <input
                  className="form-input"
                  value={buyerPhone}
                  onChange={e => setBuyerPhone(e.target.value)}
                  placeholder="9876543210"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Buyer GSTIN / UIN</label>
                <input
                  className="form-input"
                  value={buyerGstin}
                  onChange={e => setBuyerGstin(e.target.value.toUpperCase())}
                  placeholder="e.g. 33ABCDE1234F1Z5"
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Billing Address</label>
                <input
                  className="form-input"
                  value={buyerAddress}
                  onChange={e => setBuyerAddress(e.target.value)}
                  placeholder="No12, Ghouse Enclave, 70ft Road, Ellis Nagar"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>City / District &amp; State</label>
                <input
                  className="form-input"
                  value={buyerCityState}
                  onChange={e => setBuyerCityState(e.target.value)}
                  placeholder="Madurai-625016, Tamil Nadu"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Pincode &amp; State Code</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    className="form-input"
                    value={buyerPincode}
                    onChange={e => setBuyerPincode(e.target.value)}
                    placeholder="625016"
                    style={{ width: '60%' }}
                  />
                  <input
                    className="form-input"
                    value={buyerStateCode}
                    onChange={e => setBuyerStateCode(e.target.value)}
                    placeholder="33"
                    style={{ width: '40%' }}
                  />
                </div>
              </div>
            </div>

            {/* Consignee Toggle */}
            <div style={{
              marginTop: 16,
              paddingTop: 12,
              borderTop: '1px solid var(--surface-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={sameAsBuyer}
                  onChange={e => setSameAsBuyer(e.target.checked)}
                  style={{ accentColor: 'var(--brand-500)', width: 16, height: 16 }}
                />
                <span style={{ fontWeight: 600 }}>Consignee (Ship To) is same as Buyer</span>
              </label>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {sameAsBuyer ? 'Shipping address matched with billing' : 'Custom shipping address enabled'}
              </span>
            </div>

            {/* Consignee Fields (shown if not same as buyer) */}
            {!sameAsBuyer && (
              <div style={{
                marginTop: 12,
                padding: 12,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--surface-border)',
                borderRadius: 8,
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12
              }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>Consignee Name</label>
                  <input
                    className="form-input"
                    value={consigneeName}
                    onChange={e => setConsigneeName(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>Branch / Unit</label>
                  <input
                    className="form-input"
                    value={consigneeSubName}
                    onChange={e => setConsigneeSubName(e.target.value)}
                    placeholder="Mettupalayam_Retail"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>Consignee GSTIN</label>
                  <input
                    className="form-input"
                    value={consigneeGstin}
                    onChange={e => setConsigneeGstin(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>Ship To Address</label>
                  <input
                    className="form-input"
                    value={consigneeAddress}
                    onChange={e => setConsigneeAddress(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>City &amp; State</label>
                  <input
                    className="form-input"
                    value={consigneeCityState}
                    onChange={e => setConsigneeCityState(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>Pincode &amp; Phone</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      className="form-input"
                      value={consigneePincode}
                      onChange={e => setConsigneePincode(e.target.value)}
                      placeholder="641104"
                      style={{ width: '45%' }}
                    />
                    <input
                      className="form-input"
                      value={consigneePhone}
                      onChange={e => setConsigneePhone(e.target.value)}
                      placeholder="e.g. 98765 43210"
                      style={{ width: '55%' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: Despatch & Transport Details (Collapsible) */}
          <div className="card">
            <div
              className="card-header"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setShowTransportSection(!showTransportSection)}
            >
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem' }}>
                <Truck size={18} color="#f59e0b" /> Despatch &amp; Transport Details
              </div>
              <button className="btn btn-ghost btn-sm" type="button">
                {showTransportSection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

            {showTransportSection && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Motor Vehicle No.</label>
                  <input
                    className="form-input"
                    value={motorVehicleNo}
                    onChange={e => setMotorVehicleNo(e.target.value.toUpperCase())}
                    placeholder="TN58DW0090"
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Despatched Through</label>
                  <input
                    className="form-input"
                    value={despatchedThrough}
                    onChange={e => setDespatchedThrough(e.target.value)}
                    placeholder="Eicher / VRL Logistics"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Destination</label>
                  <input
                    className="form-input"
                    value={destination}
                    onChange={e => setDestination(e.target.value)}
                    placeholder="Mettupalayam"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Bill of Lading / LR No.</label>
                  <input
                    className="form-input"
                    value={billOfLading}
                    onChange={e => setBillOfLading(e.target.value)}
                    placeholder="LR-77889"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Buyers Order No.</label>
                  <input
                    className="form-input"
                    value={buyersOrderNo}
                    onChange={e => setBuyersOrderNo(e.target.value)}
                    placeholder="PO-2026/09"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Order Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={orderDate}
                    onChange={e => setOrderDate(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Despatch Doc No.</label>
                  <input
                    className="form-input"
                    value={despatchDocNo}
                    onChange={e => setDespatchDocNo(e.target.value)}
                    placeholder="DSP-4412"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Terms of Delivery</label>
                  <input
                    className="form-input"
                    value={termsOfDelivery}
                    onChange={e => setTermsOfDelivery(e.target.value)}
                    placeholder="Door Delivery"
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 4: Add Item to Bill */}
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem' }}>
                <Package size={18} color="#ec4899" /> Add Goods &amp; Services
              </div>
            </div>

            {/* Row 1: Product Search + Select */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: 10, marginBottom: 10 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 5 }}><SearchIcon size={13} /> Search Product</label>
                <input
                  className="form-input"
                  value={productSearch}
                  onChange={e => {
                    setProductSearch(e.target.value)
                    setSelectedProduct('')
                  }}
                  placeholder="Type product name, HSN, category..."
                  style={{ fontSize: '0.85rem' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Select Product / Search</label>
                <select
                  className="form-select"
                  value={selectedProduct}
                  onChange={e => {
                    setProductSearch('')
                    handleProductDropdownChange(e)
                  }}
                >
                  <option value="">-- Select a product --</option>
                  {filteredCatalog.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ₹{p.price} [HSN: {p.hsnCode}]
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected product info banner */}
            {selectedProduct && (() => {
              const sp = catalog.find(p => p.id === selectedProduct)
              return sp ? (
                <div style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  background: 'rgba(52,211,153,0.08)',
                  border: '1px solid rgba(52,211,153,0.3)',
                  fontSize: '0.8rem',
                  color: '#34d399',
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}>
                  <span style={{ fontWeight: 700 }}>✓ {sp.name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>|</span>
                  <span>₹{sp.price} / {sp.unit || 'Nos'}</span>
                  <span style={{ color: 'var(--text-muted)' }}>|</span>
                  <span>HSN: {sp.hsnCode}</span>
                  <span style={{ color: 'var(--text-muted)' }}>|</span>
                  <span>GST: {sp.gstRate}%</span>
                </div>
              ) : null
            })()}

            {/* Custom product name (shown when no product selected from catalog) */}
            {!selectedProduct && (
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 5 }}><AlertTriangle size={13} /> No product selected — Enter custom product name</label>
                <input
                  className="form-input"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="Custom product / service name"
                  style={{ borderColor: 'rgba(245,158,11,0.4)', fontSize: '0.88rem' }}
                />
              </div>
            )}

            {/* Row 2: Batch, HSN, Qty, Rate, Unit, Add button */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px 90px 80px auto', gap: 10, alignItems: 'flex-end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Batch Name</label>
                <input
                  className="form-input"
                  value={itemBatch}
                  onChange={e => setItemBatch(e.target.value)}
                  placeholder="Primary Batch"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>HSN/SAC</label>
                <input
                  className="form-input"
                  value={itemHsn}
                  onChange={e => setItemHsn(e.target.value)}
                  placeholder="31010099"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Qty</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={itemQty}
                  onChange={e => setItemQty(Math.max(1, Number(e.target.value)))}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Rate (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input"
                  value={itemRate}
                  onChange={e => setItemRate(e.target.value)}
                  style={!itemRate ? { borderColor: 'rgba(248,113,113,0.5)' } : {}}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Unit</label>
                <select className="form-select" value={itemUnit} onChange={e => setItemUnit(e.target.value)}>
                  <option>Nos</option>
                  <option>Kg</option>
                  <option>Ltr</option>
                  <option>Box</option>
                  <option>Bags</option>
                </select>
              </div>

              <button
                className="btn btn-primary"
                onClick={addItem}
                disabled={!itemRate && itemRate !== 0}
                style={{ display: 'flex', alignItems: 'center', gap: 4, height: 40 }}
              >
                <Plus size={16} /> Add
              </button>
            </div>
          </div>

          {/* SECTION 5: Current Bill Items Table */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title" style={{ fontSize: '0.95rem' }}>
                Bill Items ({items.length})
              </div>
              {items.length > 0 && (
                <button className="btn btn-outline btn-sm" onClick={clearCurrentBill} style={{ color: '#f87171' }}>
                  Clear Bill
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="empty-state" style={{ padding: '36px' }}>
                <ReceiptText size={32} />
                <p>No products added yet. Use the selector above to add items to this bill.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '4%' }}>#</th>
                      <th>Description of Goods</th>
                      <th>HSN/SAC</th>
                      <th>Rate</th>
                      <th>Qty</th>
                      <th>GST</th>
                      <th>Amount</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((i, idx) => (
                      <tr key={i.id}>
                        <td>{idx + 1}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{i.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Batch: {i.batch} · per {i.unit}
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-gray" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            {i.hsnCode}
                          </span>
                        </td>
                        <td>₹{Number(i.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ padding: '2px 7px', minWidth: 24 }}
                              onClick={() => updateItemQty(i.id, i.qty - 1)}
                            >−</button>
                            <span style={{ fontWeight: 600, minWidth: 24, textAlign: 'center' }}>{i.qty}</span>
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ padding: '2px 7px', minWidth: 24 }}
                              onClick={() => updateItemQty(i.id, i.qty + 1)}
                            >+</button>
                          </div>
                        </td>
                        <td style={{ fontSize: '0.75rem' }}>
                          <span className="badge badge-blue">{i.gstRate}%</span>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--brand-400)' }}>
                          ₹{i.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: '#f87171', padding: '4px 6px' }}
                            onClick={() => removeItem(i.id)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION 6: Recent Invoices & Reprint History */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem' }}>
                <Clock size={18} color="#a78bfa" /> Recent Invoices History
              </div>
              <button className="btn btn-outline btn-sm" onClick={loadInvoiceHistory} disabled={historyLoading}>
                <RefreshCw size={14} style={{ marginRight: 4 }} /> Refresh
              </button>
            </div>

            {historyLoading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading records…</div>
            ) : invoiceHistory.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px' }}>No invoices created yet.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Invoice No.</th>
                      <th>Date</th>
                      <th>Buyer</th>
                      <th>Payment Mode</th>
                      <th>Tax</th>
                      <th>Grand Total</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceHistory.slice(0, 10).map(inv => (
                      <tr key={inv.id || inv._id}>
                        <td style={{ fontWeight: 700, color: 'var(--brand-400)', fontSize: '0.82rem' }}>
                          {inv.invoiceNo || inv.id}
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {new Date(inv.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{inv.customerName || 'Walk-in'}</td>
                        <td>
                          <span
                            className={`badge ${
                              inv.paymentMode === 'Credit Purchase' ? 'badge-purple' :
                              inv.paymentMode === 'UPI' ? 'badge-blue' :
                              inv.paymentMode === 'Bank Transfer' ? 'badge-teal' : 'badge-green'
                            }`}
                            style={{ fontSize: '0.72rem' }}
                          >
                            {inv.paymentMode || 'Cash'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: '#a78bfa' }}>
                          ₹{Number(inv.totalGst || 0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ fontWeight: 700, color: '#34d399' }}>
                          ₹{Number(inv.grandTotal || 0).toLocaleString('en-IN')}
                        </td>
                        <td>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}
                            onClick={() => {
                              setActiveInvoiceForView(inv)
                              setIsInvoiceModalOpen(true)
                            }}
                          >
                            <Printer size={13} /> View &amp; Print
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Payment Mode & Checkout Panel */}
        <div style={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Payment Mode Selector */}
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem' }}>
                <CreditCard size={16} color="#34d399" /> Mode / Terms of Payment
              </div>
            </div>

            {/* Payment Mode Grid Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 14 }}>
              {paymentOptions.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setPaymentMode(opt.id)
                    if (opt.id === 'Credit Purchase' && !paymentTerms) {
                      setPaymentTerms('30 Days Credit')
                    }
                  }}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 8,
                    border: paymentMode === opt.id ? '2px solid var(--brand-500)' : '1px solid var(--surface-border)',
                    background: paymentMode === opt.id ? 'var(--brand-900)' : 'var(--surface-card)',
                    color: paymentMode === opt.id ? '#fff' : 'var(--text-secondary)',
                    fontWeight: paymentMode === opt.id ? 700 : 500,
                    fontSize: '0.8rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>

            {/* If Credit Purchase is selected, show credit terms */}
            {paymentMode === 'Credit Purchase' && (
              <div style={{
                padding: 10,
                borderRadius: 8,
                background: 'rgba(167, 139, 250, 0.1)',
                border: '1px solid #a78bfa',
                marginBottom: 12
              }}>
                <label className="form-label" style={{ fontSize: '0.78rem', color: '#c4b5fd' }}>
                  Credit Terms / Due Duration
                </label>
                <select
                  className="form-select"
                  value={paymentTerms}
                  onChange={e => setPaymentTerms(e.target.value)}
                  style={{ fontSize: '0.82rem' }}
                >
                  <option>15 Days Net Credit</option>
                  <option>30 Days Credit</option>
                  <option>45 Days Credit</option>
                  <option>60 Days Credit</option>
                  <option>Custom Credit Agreement</option>
                </select>
              </div>
            )}

            {/* Buyer Reference & Other References */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Buyer&apos;s Ref</label>
                <input
                  className="form-input"
                  value={buyerRef}
                  onChange={e => setBuyerRef(e.target.value)}
                  placeholder="Ref No."
                  style={{ fontSize: '0.8rem' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Other Ref(s)</label>
                <input
                  className="form-input"
                  value={otherReferences}
                  onChange={e => setOtherReferences(e.target.value)}
                  placeholder="Other notes"
                  style={{ fontSize: '0.8rem' }}
                />
              </div>
            </div>
          </div>

          {/* Checkout & Bill Summary */}
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}><Banknote size={16} /> Bill Summary</div>
            </div>

            {/* Coupon Code Section */}
            <div className="form-group" style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
                <Tag size={13} color="#a78bfa" /> Apply Coupon Code
              </label>
              {appliedCoupon ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(167, 139, 250, 0.15)', border: '1px solid #a78bfa', padding: '6px 10px', borderRadius: '6px' }}>
                  <div>
                    <strong style={{ color: '#a78bfa', fontSize: '0.85rem' }}>{appliedCoupon.code}</strong>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Saved ₹{couponDiscountAmount.toLocaleString('en-IN')}</div>
                  </div>
                  <button className="btn btn-ghost" style={{ padding: '2px 6px', fontSize: '0.72rem', color: '#f87171' }} onClick={removeCoupon}>Remove</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    className="form-input"
                    placeholder="Enter CODE"
                    value={couponCodeInput}
                    onChange={e => setCouponCodeInput(e.target.value.toUpperCase())}
                    style={{ fontSize: '0.82rem', textTransform: 'uppercase' }}
                  />
                  <button className="btn btn-outline" onClick={applyCoupon} disabled={validatingCoupon} style={{ padding: '0 10px', fontSize: '0.78rem' }}>
                    {validatingCoupon ? '…' : 'Apply'}
                  </button>
                </div>
              )}
            </div>

            {/* Manual Discount */}
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Discount (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                className="form-input"
                value={globalDiscountPercent}
                onChange={e => setGlobalDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                style={{ fontSize: '0.85rem' }}
              />
            </div>

            {/* Calculations Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: '0.84rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Subtotal ({items.length} items)</span>
                <span>₹{itemsSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              {manualDiscAmt > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f87171' }}>
                  <span>Discount ({globalDiscountPercent}%)</span>
                  <span>-₹{manualDiscAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              {couponDiscountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a78bfa' }}>
                  <span>Coupon ({appliedCoupon?.code})</span>
                  <span>-₹{couponDiscountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Taxable Amount</span>
                <span>₹{taxableSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#60a5fa', fontSize: '0.8rem' }}>
                <span>CGST (Central Tax)</span>
                <span>+₹{totalCgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#60a5fa', fontSize: '0.8rem' }}>
                <span>SGST (State Tax)</span>
                <span>+₹{totalSgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              {roundOff !== 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  <span>Round Off</span>
                  <span>{roundOff > 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`}</span>
                </div>
              )}

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 800,
                fontSize: '1.25rem',
                color: 'var(--text-primary)',
                borderTop: '1px solid var(--surface-border-subtle)',
                paddingTop: 10,
                marginTop: 4
              }}>
                <span>Grand Total</span>
                <span style={{ color: '#34d399' }}>
                  ₹{roundedGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>
                {grandTotalWords}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
              <button
                className="btn btn-primary btn-full btn-lg"
                onClick={handleSaveAndPrintInvoice}
                disabled={items.length === 0}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Printer size={18} /> Generate &amp; Print Bill
              </button>

              <button
                className="btn btn-outline btn-full"
                onClick={handlePreviewCurrentBill}
                disabled={items.length === 0}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Eye size={16} /> Preview Exact Template
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Exact GST Invoice Popup / Print View */}
      {isInvoiceModalOpen && activeInvoiceForView && (
        <ExactGstInvoice
          invoice={activeInvoiceForView}
          onClose={() => setIsInvoiceModalOpen(false)}
        />
      )}
    </div>
  )
}
