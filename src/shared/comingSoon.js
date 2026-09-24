// A product the client has listed but not priced yet (price 0 or missing) is
// shown as "Price coming soon": no price, no pack chips, no Add to cart. The
// server refuses to sell it anyway (server.js priceCart).
export const hasPrice = product => Number(product?.price) > 0
