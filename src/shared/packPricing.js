// A product's price and MRP for one pack size, for every store page that
// shows or adds a pack (home catalogue, /products, the product page). The
// server charges with the same rule: unitPriceFor() in server/server.js.
//
// A pack with its own price (packagePrices / packPrices) uses it. Otherwise
// the base price is scaled by pack size: "1 kg" costs twice "500 g".

// "500 g" -> 500, "1 kg" -> 1000, "1.5 L" -> 1500; anything else counts as 1.
export function packUnits(pack) {
  const match = String(pack || '').toLowerCase().match(/([\d.]+)\s*(kg|g|litre|liter|l|ml)/)
  if (!match) return 1
  const value = Number(match[1])
  return ['kg', 'litre', 'liter', 'l'].includes(match[2]) ? value * 1000 : value
}

// basePack: the pack the product's own `price` is for (its selectedPack, else
// its first pack size).
export function packPrice(product, pack, basePack) {
  const explicit = product.packagePrices?.[pack] || product.packPrices?.[pack]
  if (explicit !== undefined) return Number(explicit)
  if (basePack && pack && packUnits(basePack) > 0) {
    return Math.round(Number(product.price || 0) * (packUnits(pack) / packUnits(basePack)))
  }
  return Number(product.price || 0)
}

// The pack's MRP: its own, else the product's MRP scaled like its price.
export function packMrp(product, pack, price) {
  const explicit = product.packageMrps?.[pack] || product.packMrps?.[pack]
  if (explicit !== undefined) return Number(explicit)
  const basePrice = Number(product.price || 1)
  const baseMrp = Number(product.originalPrice || product.mrp || product.price)
  return baseMrp ? Math.round(baseMrp * (price / basePrice)) : price
}
