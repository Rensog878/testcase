// Cart lines in the shape the storefront (public/js/app.js) and the cart page
// (public/checkout.html) already store in PUT /api/cart. The server prices
// every order itself from the product id, pack and quantity.

/** A cart line for a product recommendation's payload. */
export function cartLineFor(payload) {
  return {
    id: payload.productId,
    _id: payload.productId,
    name: payload.name,
    price: payload.price,
    category: payload.category || '',
    image: payload.image || '',
    selectedPack: payload.pack || '',
    qty: 1,
  };
}

/** Adds one of `line` to the items: same product and pack raises the quantity, as checkout.html does. */
export function addLine(items, line) {
  const list = (Array.isArray(items) ? items : []).map(item => ({ ...item }));
  const existing = list.find(item => (item.id || item._id) === line.id && (item.selectedPack || '') === line.selectedPack);
  if (existing) existing.qty = (Number(existing.qty) || 1) + 1;
  else list.push({ ...line });
  return list;
}
