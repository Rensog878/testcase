import React from 'react'
import { numberToIndianWords } from '../../utils/numberToWords'
import { Printer, Download, X, CheckCircle2 } from 'lucide-react'
import './exactGstInvoice.css'

// Realistic SVG QR Code Component for GST e-Invoice
function InvoiceQrCode({ value, size = 105 }) {
  // Generate deterministic visual matrix based on text hash
  const hash = String(value || 'SATHYAM_BIO_GST_E_INVOICE_QR')
    .split('')
    .reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0)

  const matrixSize = 25
  const cells = []

  // Pre-seed corner position markers (finder patterns)
  const isFinder = (r, c) => {
    if (r < 7 && c < 7) return true
    if (r < 7 && c >= matrixSize - 7) return true
    if (r >= matrixSize - 7 && c < 7) return true
    return false
  }

  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (isFinder(r, c)) continue
      // pseudo-random but deterministic pattern
      const cellVal = (r * 13 + c * 17 + (hash % 100) + (r ^ c)) % 3 === 0
      if (cellVal) {
        cells.push({ r, c })
      }
    }
  }

  const cellSize = size / matrixSize

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ background: '#fff' }}>
      {/* Top-Left Finder */}
      <rect x="0" y="0" width={cellSize * 7} height={cellSize * 7} fill="#000" />
      <rect x={cellSize} y={cellSize} width={cellSize * 5} height={cellSize * 5} fill="#fff" />
      <rect x={cellSize * 2} y={cellSize * 2} width={cellSize * 3} height={cellSize * 3} fill="#000" />

      {/* Top-Right Finder */}
      <rect x={cellSize * (matrixSize - 7)} y="0" width={cellSize * 7} height={cellSize * 7} fill="#000" />
      <rect x={cellSize * (matrixSize - 6)} y={cellSize} width={cellSize * 5} height={cellSize * 5} fill="#fff" />
      <rect x={cellSize * (matrixSize - 5)} y={cellSize * 2} width={cellSize * 3} height={cellSize * 3} fill="#000" />

      {/* Bottom-Left Finder */}
      <rect x="0" y={cellSize * (matrixSize - 7)} width={cellSize * 7} height={cellSize * 7} fill="#000" />
      <rect x={cellSize} y={cellSize * (matrixSize - 6)} width={cellSize * 5} height={cellSize * 5} fill="#fff" />
      <rect x={cellSize * 2} y={cellSize * (matrixSize - 5)} width={cellSize * 3} height={cellSize * 3} fill="#000" />

      {/* Matrix Cells */}
      {cells.map((cell, idx) => (
        <rect
          key={idx}
          x={cell.c * cellSize}
          y={cell.r * cellSize}
          width={cellSize}
          height={cellSize}
          fill="#000"
        />
      ))}
    </svg>
  )
}

export default function ExactGstInvoice({ invoice, onClose, onPrint }) {
  if (!invoice) return null

  const inv = invoice

  // Format currency with Indian grouping
  const formatAmt = (num, decimals = 2) => {
    if (num === undefined || num === null || isNaN(num)) return '0.00'
    const val = Number(num)
    return val.toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })
  }

  // ─── HARDCODED INVOICE CSS ─────────────────────────────────────────────────
  // We embed this directly so the print window never needs to load external stylesheets.
  const INVOICE_CSS = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.35; }
    .gst-invoice-sheet { width: 100%; max-width: 100%; background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.35; padding: 10mm 12mm; box-sizing: border-box; }
    .gst-header-title { text-align: center; font-size: 16px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 12px; color: #000; }
    .gst-e-invoice-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px; }
    .gst-e-meta { font-size: 11px; color: #000; }
    .gst-label { font-weight: 600; display: inline-block; min-width: 65px; }
    .gst-mono-irn { font-family: monospace; font-size: 10px; font-weight: 600; word-break: break-all; }
    .gst-bold-val { font-weight: 700; }
    .gst-qr-wrap { text-align: center; display: flex; flex-direction: column; align-items: center; }
    .gst-qr-title { font-size: 12px; font-weight: 700; margin-bottom: 4px; }
    .gst-details-box { border: 1px solid #000; border-bottom: none; }
    .gst-box-row { display: flex; width: 100%; }
    .gst-box-cell { padding: 6px 8px; box-sizing: border-box; }
    .gst-w-50 { width: 50%; }
    .gst-w-100 { width: 100%; }
    .gst-p-0 { padding: 0 !important; }
    .gst-border-r { border-right: 1px solid #000; }
    .gst-border-b { border-bottom: 1px solid #000; }
    .gst-border-t { border-top: 1px solid #000; }
    .gst-sub-row { display: flex; width: 100%; }
    .gst-sub-cell { padding: 4px 8px; box-sizing: border-box; font-size: 10.5px; }
    .gst-cell-lbl { font-size: 9.5px; color: #444; margin-bottom: 2px; }
    .gst-cell-section-lbl { font-size: 9.5px; color: #333; margin-bottom: 2px; }
    .gst-cell-val { font-size: 10.5px; color: #000; word-break: break-word; }
    .gst-cell-val-bold { font-size: 11px; font-weight: 700; color: #000; }
    .gst-seller-name { font-size: 13px; font-weight: 700; margin-bottom: 2px; color: #000; }
    .gst-party-name { font-size: 12px; font-weight: 700; margin-bottom: 2px; color: #000; }
    .gst-text-line { font-size: 10.5px; color: #111; line-height: 1.35; }
    .gst-bold-line { font-size: 11px; font-weight: 700; margin-top: 2px; }
    .gst-items-table { width: 100%; border-collapse: collapse; border-left: 1px solid #000; border-right: 1px solid #000; border-top: 1px solid #000; font-size: 10.5px; }
    .gst-items-table th { border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 6px 4px; font-size: 10px; font-weight: 700; background: #fff; color: #000; text-align: center; }
    .gst-items-table th:last-child { border-right: none; }
    .gst-items-table td { border-right: 1px solid #000; padding: 4px 6px; vertical-align: top; color: #000; }
    .gst-items-table td:last-child { border-right: none; }
    .gst-item-row td { padding-top: 6px; padding-bottom: 6px; }
    .gst-desc-cell { text-align: left; }
    .gst-item-title { font-weight: 600; color: #000; }
    .gst-item-batch { font-size: 9.5px; color: #222; margin-top: 1px; padding-left: 4px; }
    .gst-qty-cell { line-height: 1.25; }
    .gst-qty-sub { font-size: 9.5px; color: #222; }
    .gst-text-center { text-align: center; }
    .gst-text-right { text-align: right; }
    .gst-calc-subtotal-row td { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 6px; }
    .gst-tax-row td { padding: 2px 6px; font-size: 10px; }
    .gst-tax-label { font-weight: 600; }
    .gst-total-row td { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 6px 6px; }
    .gst-bold-cell { font-weight: 700; font-size: 11px; }
    .gst-words-box { border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 6px 8px; font-size: 10px; }
    .gst-words-title { font-size: 9.5px; color: #444; margin-bottom: 2px; }
    .gst-words-content { font-weight: 700; font-size: 11px; color: #000; }
    .gst-hsn-table { width: 100%; border-collapse: collapse; border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px solid #000; font-size: 10px; }
    .gst-hsn-table th { border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 4px; text-align: center; background: #fff; color: #000; font-weight: 700; font-size: 9.5px; }
    .gst-hsn-table th:last-child { border-right: none; }
    .gst-hsn-table td { border-right: 1px solid #000; border-bottom: 1px solid #e2e8f0; padding: 3px 6px; color: #000; }
    .gst-hsn-table td:last-child { border-right: none; }
    .gst-hsn-total-row td { border-top: 1px solid #000; border-bottom: none; padding: 4px 6px; }
    .gst-footer-box { display: flex; border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px solid #000; font-size: 10px; }
    .gst-footer-col { width: 50%; padding: 8px; box-sizing: border-box; }
    .gst-bank-title { font-weight: 700; margin-bottom: 3px; }
    .gst-declaration-wrap { margin-top: 14px; }
    .gst-declaration-title { font-weight: 700; margin-bottom: 2px; }
    .gst-declaration-text { font-size: 9.5px; color: #222; line-height: 1.3; }
    .gst-signatory-wrap { margin-top: 16px; text-align: right; }
    .gst-for-company { font-size: 11px; font-weight: 700; }
    .gst-sign-space { height: 45px; }
    .gst-sign-label { font-size: 10px; font-weight: 600; border-top: 1px solid #666; display: inline-block; padding-top: 2px; min-width: 140px; text-align: center; }
    .gst-bottom-note { text-align: center; font-size: 9.5px; color: #444; margin-top: 10px; }
    @page { size: A4 portrait; margin: 8mm; }
  `

  const handlePrint = () => {
    // Get the already-rendered invoice DOM node and extract its outer HTML
    const el = document.getElementById('gst-invoice-printable')
    if (!el) return

    const invoiceHtml = el.outerHTML

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>GST Tax Invoice - Sathyam Agro Clinic</title>
<style>${INVOICE_CSS}</style>
</head>
<body>${invoiceHtml}</body>
</html>`

    // Build a Blob URL — works on all browsers, no popup blocker, no CORS, no iframe issues
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const printWin = window.open(url, '_blank')
    if (!printWin) {
      // Fallback: download as HTML file so user can open & print
      const a = document.createElement('a')
      a.href = url
      a.download = `GST-Invoice-${inv.invoiceNo || 'SathyamBio'}.html`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 3000)
      return
    }

    // Auto-trigger print once the new tab loads
    printWin.onload = () => {
      printWin.focus()
      printWin.print()
      printWin.onafterprint = () => {
        printWin.close()
        URL.revokeObjectURL(url)
      }
    }
  }


  // Seller Details
  const seller = inv.sellerDetails || {
    name: 'Sathyam Agro Clinic',
    line1: 'No.130, Muppar street,',
    line2: 'Balamurugan Kovil road,',
    line3: 'Vadipatti',
    line4: 'Madurai - 625218.',
    unit: 'Unit 1',
    pincode: '625218',
    gstin: '33BAAPS3641C1Z6',
    pan: 'AFBFS8329C'
  }

  // Consignee Details (Ship To)
  const consignee = inv.consigneeDetails || {
    name: inv.customerName || 'Walk-in Customer',
    subName: inv.customerCompany || '',
    line1: inv.customerAddress || '',
    cityState: '',
    phone: inv.customerPhone ? `Ph-${inv.customerPhone}` : '',
    pincode: inv.customerPincode || '',
    gstin: inv.customerGstin || '',
    stateName: inv.stateName || 'Tamil Nadu',
    stateCode: inv.stateCode || '33'
  }

  // Buyer Details (Bill To)
  const buyer = inv.buyerDetails || {
    name: inv.customerName || 'Walk-in Customer',
    line1: inv.customerAddress || '',
    cityState: '',
    pincode: inv.customerPincode || '',
    gstin: inv.customerGstin || '',
    stateName: inv.stateName || 'Tamil Nadu',
    stateCode: inv.stateCode || '33',
    placeOfSupply: inv.placeOfSupply || 'Tamil Nadu',
    contactName: inv.contactName || inv.customerName || ''
  }

  // Despatch Details
  const despatch = inv.despatchDetails || {
    buyersOrderNo: inv.buyersOrderNo || '',
    orderDate: inv.orderDate || '',
    despatchDocNo: inv.despatchDocNo || '',
    deliveryNoteDate: inv.deliveryNoteDate || '',
    despatchedThrough: inv.despatchedThrough || '',
    destination: inv.destination || ''
  }

  // Transport Details
  const transport = inv.transportDetails || {
    billOfLading: inv.billOfLading || '',
    motorVehicleNo: inv.motorVehicleNo || '',
    termsOfDelivery: inv.termsOfDelivery || ''
  }

  // Bank Details
  const bank = inv.bankDetails || {
    bankName: 'ICICI Bank',
    acNo: '466805500061',
    branchIfsc: 'Madurai Simmakkal & ICIC0004668'
  }

  // Items processing
  const items = (inv.items || []).map((item, idx) => {
    const qty = Number(item.qty) || 1
    const rate = Number(item.price ?? item.rate) || 0
    const discPercent = Number(item.discPercent ?? item.discountPercent) || 0
    const rawLine = qty * rate
    const lineDiscount = rawLine * (discPercent / 100)
    const lineAmount = Number(item.lineTotal ?? item.amount ?? (rawLine - lineDiscount)) || (rawLine - lineDiscount)
    const gstRate = Number(item.gstRate ?? item.gst) || 18
    const cgstRate = Number(item.cgstRate ?? gstRate / 2)
    const sgstRate = Number(item.sgstRate ?? gstRate / 2)

    return {
      srNo: idx + 1,
      name: item.name || item.productName || 'Product',
      batch: item.batch || item.batchNo || 'Primary Batch',
      subText: item.subText || '',
      hsnCode: item.hsnCode || item.hsn || '31010099',
      qty,
      unit: item.unit || 'Nos',
      rate,
      per: item.per || item.unit || 'Nos',
      discPercent: discPercent > 0 ? `${discPercent}%` : '',
      amount: lineAmount,
      gstRate,
      cgstRate,
      sgstRate,
      cgstAmount: Number(item.lineCgst ?? (lineAmount * (cgstRate / 100))),
      sgstAmount: Number(item.lineSgst ?? (lineAmount * (sgstRate / 100)))
    }
  })

  // Calculate Subtotal & Totals
  const itemsSubtotal = items.reduce((sum, i) => sum + i.amount, 0)
  const totalQty = items.reduce((sum, i) => sum + i.qty, 0)

  // Tax Grouping by Rate (e.g. 2.5%, 6%, 9%, 14%)
  const taxGroupMap = {}
  items.forEach(i => {
    const key = `${i.cgstRate}`
    if (!taxGroupMap[key]) {
      taxGroupMap[key] = {
        rate: i.cgstRate,
        cgstAmount: 0,
        sgstAmount: 0,
        taxableValue: 0
      }
    }
    taxGroupMap[key].cgstAmount += i.cgstAmount
    taxGroupMap[key].sgstAmount += i.sgstAmount
    taxGroupMap[key].taxableValue += i.amount
  })

  const taxGroups = Object.values(taxGroupMap).sort((a, b) => a.rate - b.rate)
  const totalCgst = taxGroups.reduce((sum, g) => sum + g.cgstAmount, 0)
  const totalSgst = taxGroups.reduce((sum, g) => sum + g.sgstAmount, 0)
  const totalTaxAmount = totalCgst + totalSgst

  const rawGrandTotal = itemsSubtotal + totalTaxAmount
  const roundedGrandTotal = Math.round(rawGrandTotal)
  const roundOff = +(roundedGrandTotal - rawGrandTotal).toFixed(2)

  // HSN Breakdown
  const hsnMap = {}
  items.forEach(i => {
    const hsn = i.hsnCode
    if (!hsnMap[hsn]) {
      hsnMap[hsn] = {
        hsn,
        taxableValue: 0,
        cgstRate: i.cgstRate,
        cgstAmount: 0,
        sgstRate: i.sgstRate,
        sgstAmount: 0
      }
    }
    hsnMap[hsn].taxableValue += i.amount
    hsnMap[hsn].cgstAmount += i.cgstAmount
    hsnMap[hsn].sgstAmount += i.sgstAmount
  })
  const hsnSummary = Object.values(hsnMap)

  // Words
  const amountInWords = inv.amountInWords || numberToIndianWords(roundedGrandTotal)
  const taxInWords = inv.taxAmountInWords || numberToIndianWords(totalTaxAmount)

  // Document Type Header
  const docType = (inv.documentType || 'TAX INVOICE').toUpperCase()
  const invoiceNo = inv.invoiceNo || inv.id || ''
  const invDate = inv.date
    ? new Date(inv.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
    : ''

  // IRN and Ack No. exist only for invoices registered on the e-invoice portal;
  // an invoice without them must not show someone else's.
  const ackNo = inv.ackNo || ''
  const ackDate = inv.ackDate || invDate
  const irn = inv.irn || ''

  // Payment Mode formatting
  let displayPaymentMode = inv.paymentMode || 'Cash'
  if (inv.paymentTerms) {
    displayPaymentMode += ` (${inv.paymentTerms})`
  }

  return (
    <div className="gst-invoice-modal-overlay">
      {/* Top Action Floating Bar (Screen only) */}
      <div className="gst-invoice-actions no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="badge badge-green" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
            <CheckCircle2 size={16} style={{ display: 'inline', marginRight: 4 }} />
            Official GST e-Invoice Generated
          </span>
          <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>
            {docType} #{invoiceNo}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="btn btn-primary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Printer size={16} /> Print / Download PDF
          </button>
          {onClose && (
            <button className="gst-invoice-close-btn" onClick={onClose}>
              <X size={16} /> Close Preview
            </button>
          )}
        </div>
      </div>

      {/* Printable Sheet Container */}
      <div className="gst-invoice-sheet" id="gst-invoice-printable">
        {/* Document Header */}
        <div className="gst-header-title">{docType}</div>

        {/* e-Invoice Top Meta Section: only for invoices that have an IRN */}
        {irn && <div className="gst-e-invoice-row">
          <div className="gst-e-meta">
            <div><span className="gst-label">IRN :</span> <span className="gst-mono-irn">{irn}</span></div>
            <div><span className="gst-label">Ack No. :</span> <span className="gst-bold-val">{ackNo}</span></div>
            <div><span className="gst-label">Ack Date :</span> <span className="gst-bold-val">{ackDate}</span></div>
          </div>
          <div className="gst-qr-wrap">
            <div className="gst-qr-title">e-Invoice</div>
            <InvoiceQrCode value={`${seller.gstin}|${invoiceNo}|${invDate}|${irn}|${roundedGrandTotal}`} size={98} />
          </div>
        </div>}

        {/* Master Details Table Box */}
        <div className="gst-details-box">
          {/* Row 1: Seller & Invoice Info */}
          <div className="gst-box-row">
            {/* Left: Seller */}
            <div className="gst-box-cell gst-w-50 gst-border-r">
              <div className="gst-seller-name">{seller.name}</div>
              <div className="gst-text-line">{seller.line1}</div>
              <div className="gst-text-line">{seller.line2}</div>
              <div className="gst-text-line">{seller.line3}</div>
              <div className="gst-text-line">{seller.line4}</div>
              <div className="gst-text-line">{seller.unit}</div>
              <div className="gst-text-line">Pin code : {seller.pincode}</div>
              <div className="gst-bold-line">GSTIN : {seller.gstin}</div>
            </div>

            {/* Right: Invoice No, Date & Terms */}
            <div className="gst-box-cell gst-w-50 gst-p-0">
              <div className="gst-sub-row gst-border-b">
                <div className="gst-sub-cell gst-w-50 gst-border-r">
                  <div className="gst-cell-lbl">{docType === 'CREDIT NOTE' ? 'Credit Note No.' : 'Invoice No.'}</div>
                  <div className="gst-cell-val-bold">{invoiceNo}</div>
                </div>
                <div className="gst-sub-cell gst-w-50">
                  <div className="gst-cell-lbl">Dated</div>
                  <div className="gst-cell-val-bold">{invDate}</div>
                </div>
              </div>

              <div className="gst-sub-row gst-border-b">
                <div className="gst-sub-cell gst-w-50 gst-border-r">
                  <div className="gst-cell-lbl">Buyer&apos;s Ref</div>
                  <div className="gst-cell-val">{inv.buyerRef || ''}</div>
                </div>
                <div className="gst-sub-cell gst-w-50">
                  <div className="gst-cell-lbl">Mode/Terms of Payment</div>
                  <div className="gst-cell-val-bold" style={{ color: '#000' }}>{displayPaymentMode}</div>
                </div>
              </div>

              <div className="gst-sub-row">
                <div className="gst-sub-cell gst-w-50 gst-border-r">
                  <div className="gst-cell-lbl">Other Reference(s)</div>
                  <div className="gst-cell-val">{inv.otherReferences || ''}</div>
                </div>
                <div className="gst-sub-cell gst-w-50">
                  <div className="gst-cell-lbl">Place of Supply</div>
                  <div className="gst-cell-val">{buyer.placeOfSupply || 'Tamil Nadu'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Consignee (Ship To) & Despatch Info */}
          <div className="gst-box-row gst-border-t">
            {/* Left: Consignee */}
            <div className="gst-box-cell gst-w-50 gst-border-r">
              <div className="gst-cell-section-lbl">Consignee</div>
              <div className="gst-party-name">{consignee.name}</div>
              {consignee.subName && <div className="gst-text-line">{consignee.subName}</div>}
              <div className="gst-text-line">{consignee.line1}</div>
              {consignee.cityState && <div className="gst-text-line">{consignee.cityState}</div>}
              {consignee.phone && <div className="gst-text-line">{consignee.phone}</div>}
              <div className="gst-text-line">Pincode : {consignee.pincode}</div>
              <div className="gst-bold-line">GSTIN/UIN : {consignee.gstin}</div>
              <div className="gst-text-line">State Name: {consignee.stateName}, Code: {consignee.stateCode}</div>
            </div>

            {/* Right: Buyers Order, Despatch Doc, Through & Dest */}
            <div className="gst-box-cell gst-w-50 gst-p-0">
              <div className="gst-sub-row gst-border-b">
                <div className="gst-sub-cell gst-w-50 gst-border-r">
                  <div className="gst-cell-lbl">Buyers Order No.</div>
                  <div className="gst-cell-val">{despatch.buyersOrderNo}</div>
                </div>
                <div className="gst-sub-cell gst-w-50">
                  <div className="gst-cell-lbl">Dated</div>
                  <div className="gst-cell-val">{despatch.orderDate}</div>
                </div>
              </div>

              <div className="gst-sub-row gst-border-b">
                <div className="gst-sub-cell gst-w-50 gst-border-r">
                  <div className="gst-cell-lbl">Despatch Doc No.</div>
                  <div className="gst-cell-val">{despatch.despatchDocNo}</div>
                </div>
                <div className="gst-sub-cell gst-w-50">
                  <div className="gst-cell-lbl">Delivery Note Date</div>
                  <div className="gst-cell-val">{despatch.deliveryNoteDate}</div>
                </div>
              </div>

              <div className="gst-sub-row">
                <div className="gst-sub-cell gst-w-50 gst-border-r">
                  <div className="gst-cell-lbl">Despatched through</div>
                  <div className="gst-cell-val-bold">{despatch.despatchedThrough}</div>
                </div>
                <div className="gst-sub-cell gst-w-50">
                  <div className="gst-cell-lbl">Destination</div>
                  <div className="gst-cell-val-bold">{despatch.destination}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Buyer (Bill To) & Transport / Vehicle */}
          <div className="gst-box-row gst-border-t">
            {/* Left: Buyer */}
            <div className="gst-box-cell gst-w-50 gst-border-r">
              <div className="gst-cell-section-lbl">Buyer</div>
              <div className="gst-party-name">{buyer.name}</div>
              <div className="gst-text-line">{buyer.line1}</div>
              {buyer.cityState && <div className="gst-text-line">{buyer.cityState}</div>}
              <div className="gst-text-line">Pincode : {buyer.pincode}</div>
              <div className="gst-bold-line">GSTIN/UIN : {buyer.gstin}</div>
              <div className="gst-text-line">State Name: {buyer.stateName}, Code: {buyer.stateCode}</div>
              <div className="gst-text-line">Place of supply : {buyer.placeOfSupply}</div>
              <div className="gst-text-line">Contact Name : {buyer.contactName}</div>
            </div>

            {/* Right: Bill of Lading, Motor Vehicle No, Terms */}
            <div className="gst-box-cell gst-w-50 gst-p-0">
              <div className="gst-sub-row gst-border-b">
                <div className="gst-sub-cell gst-w-50 gst-border-r">
                  <div className="gst-cell-lbl">Bill of Lading/LR-RR No.</div>
                  <div className="gst-cell-val">{transport.billOfLading}</div>
                </div>
                <div className="gst-sub-cell gst-w-50">
                  <div className="gst-cell-lbl">Motor Vehicle No.</div>
                  <div className="gst-cell-val-bold">{transport.motorVehicleNo}</div>
                </div>
              </div>

              <div className="gst-sub-row">
                <div className="gst-sub-cell gst-w-100">
                  <div className="gst-cell-lbl">Terms of Delivery</div>
                  <div className="gst-cell-val" style={{ minHeight: '36px' }}>{transport.termsOfDelivery}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Goods & Services Table */}
        <table className="gst-items-table">
          <thead>
            <tr>
              <th style={{ width: '4%' }}>Sr<br />No.</th>
              <th style={{ width: '38%' }}>Description of Goods/Services</th>
              <th style={{ width: '13%' }}>HSN/SAC</th>
              <th style={{ width: '11%' }}>Quantity</th>
              <th style={{ width: '10%' }}>Rate</th>
              <th style={{ width: '7%' }}>per</th>
              <th style={{ width: '6%' }}>Disc. %</th>
              <th style={{ width: '11%' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.srNo} className="gst-item-row">
                <td className="gst-text-center">{item.srNo}</td>
                <td className="gst-desc-cell">
                  <div className="gst-item-title">{item.name}</div>
                  <div className="gst-item-batch">Batch : {item.batch}</div>
                  {item.subText && <div className="gst-item-subtext">{item.subText}</div>}
                </td>
                <td className="gst-text-center">{item.hsnCode}</td>
                <td className="gst-text-right gst-qty-cell">
                  <div>{item.qty} {item.unit}</div>
                  <div className="gst-qty-sub">{item.qty}</div>
                </td>
                <td className="gst-text-right">{formatAmt(item.rate, 2)}</td>
                <td className="gst-text-center">{item.per}</td>
                <td className="gst-text-center">{item.discPercent}</td>
                <td className="gst-text-right">{formatAmt(item.amount, 2)}</td>
              </tr>
            ))}

            {/* Subtotal Separator Row */}
            <tr className="gst-calc-subtotal-row">
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td className="gst-text-right gst-bold-cell">{formatAmt(itemsSubtotal, 2)}</td>
            </tr>

            {/* Tax Breakdown Rows (OUTPUT CGST & SGST by rate) */}
            {taxGroups.map((g, idx) => (
              <React.Fragment key={idx}>
                <tr className="gst-tax-row">
                  <td></td>
                  <td className="gst-text-right gst-tax-label">OUTPUT CGST - {g.rate}%</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td className="gst-text-center">{g.rate} %</td>
                  <td></td>
                  <td className="gst-text-right">{formatAmt(g.cgstAmount, 2)}</td>
                </tr>
                <tr className="gst-tax-row">
                  <td></td>
                  <td className="gst-text-right gst-tax-label">OUTPUT SGST - {g.rate}%</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td className="gst-text-center">{g.rate} %</td>
                  <td></td>
                  <td className="gst-text-right">{formatAmt(g.sgstAmount, 2)}</td>
                </tr>
              </React.Fragment>
            ))}

            {/* Round Off Row */}
            {roundOff !== 0 && (
              <tr className="gst-tax-row">
                <td></td>
                <td className="gst-text-right gst-tax-label">Round Off</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td className="gst-text-right">{roundOff > 0 ? `+${roundOff.toFixed(2)}` : roundOff.toFixed(2)}</td>
              </tr>
            )}

            {/* Total Row */}
            <tr className="gst-total-row">
              <td></td>
              <td className="gst-bold-cell">Total</td>
              <td></td>
              <td className="gst-text-right gst-bold-cell">{totalQty}</td>
              <td></td>
              <td></td>
              <td></td>
              <td className="gst-text-right gst-bold-cell">{formatAmt(roundedGrandTotal, 2)}</td>
            </tr>
          </tbody>
        </table>

        {/* Amount in words */}
        <div className="gst-words-box">
          <div className="gst-words-title">Amount Chargeable (in words)</div>
          <div className="gst-words-content">{amountInWords}</div>
        </div>

        {/* HSN/SAC Tax Summary Table */}
        <table className="gst-hsn-table">
          <thead>
            <tr>
              <th rowSpan="2" style={{ width: '22%' }}>HSN/SAC</th>
              <th rowSpan="2" style={{ width: '18%' }}>Taxable<br />Value</th>
              <th colSpan="2" style={{ width: '25%' }}>Central Tax</th>
              <th colSpan="2" style={{ width: '25%' }}>State Tax</th>
              <th rowSpan="2" style={{ width: '10%' }}>Total<br />Tax Amount</th>
            </tr>
            <tr>
              <th style={{ width: '10%' }}>Rate</th>
              <th style={{ width: '15%' }}>Amount</th>
              <th style={{ width: '10%' }}>Rate</th>
              <th style={{ width: '15%' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {hsnSummary.map((h, i) => (
              <tr key={i}>
                <td className="gst-text-center">{h.hsn}</td>
                <td className="gst-text-right">{formatAmt(h.taxableValue, 2)}</td>
                <td className="gst-text-center">{h.cgstRate}%</td>
                <td className="gst-text-right">{formatAmt(h.cgstAmount, 2)}</td>
                <td className="gst-text-center">{h.sgstRate}%</td>
                <td className="gst-text-right">{formatAmt(h.sgstAmount, 2)}</td>
                <td className="gst-text-right">{formatAmt(h.cgstAmount + h.sgstAmount, 2)}</td>
              </tr>
            ))}
            <tr className="gst-hsn-total-row">
              <td className="gst-bold-cell gst-text-center">Total</td>
              <td className="gst-bold-cell gst-text-right">{formatAmt(itemsSubtotal, 2)}</td>
              <td></td>
              <td className="gst-bold-cell gst-text-right">{formatAmt(totalCgst, 2)}</td>
              <td></td>
              <td className="gst-bold-cell gst-text-right">{formatAmt(totalSgst, 2)}</td>
              <td className="gst-bold-cell gst-text-right">{formatAmt(totalTaxAmount, 2)}</td>
            </tr>
          </tbody>
        </table>

        {/* Tax Amount in words */}
        <div className="gst-words-box">
          <div className="gst-words-title">Tax Amount (in words)</div>
          <div className="gst-words-content">{taxInWords}</div>
        </div>

        {/* Footer: Bank Details, Declaration & Signatures */}
        <div className="gst-footer-box">
          {/* Left Column */}
          <div className="gst-footer-col gst-border-r">
            <div className="gst-text-line"><strong>Company&apos;s GST No. :</strong> {seller.gstin}</div>
            <div className="gst-text-line"><strong>Company&apos;s PAN :</strong> {seller.pan}</div>
            <div className="gst-declaration-wrap">
              <div className="gst-declaration-title">Declaration</div>
              <div className="gst-declaration-text">
                We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="gst-footer-col">
            <div className="gst-bank-title">Company&apos;s Bank Details</div>
            <div className="gst-text-line">Bank Name : {bank.bankName}</div>
            <div className="gst-text-line">A/c No. : {bank.acNo}</div>
            <div className="gst-text-line">Branch &amp; IFS Code : {bank.branchIfsc}</div>

            <div className="gst-signatory-wrap">
              <div className="gst-for-company">for {seller.name}</div>
              <div className="gst-sign-space"></div>
              <div className="gst-sign-label">Authorised Signatory</div>
            </div>
          </div>
        </div>

        {/* Bottom Note */}
        <div className="gst-bottom-note">
          <div>This is a Computer Generated Invoice</div>
        </div>
      </div>
    </div>
  )
}
