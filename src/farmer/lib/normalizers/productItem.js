// Products from GET /api/products -> recommendation DashboardItems.

import { resolveCropList } from '../../../shared/cropRegistry.js';
import { createDashboardItem } from '../dashboardItem.js';

const textList = value =>
  (Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [])
    .map(entry => String(entry).trim())
    .filter(Boolean);

export function normalizeProduct(product, { fetchedAt = null } = {}) {
  const rawId = product?.id ?? product?._id;
  if (!rawId) return null;

  const id = String(rawId);
  const stock = Number(product.stock);
  const price = Number(product.price);
  const packSizes = textList(product.packSizes);
  const target = product.targetUserId && product.targetUserId !== 'all' ? String(product.targetUserId) : null;

  return createDashboardItem({
    id: `product:${id}`,
    source: 'product',
    kind: 'product.recommendation',
    severity: 'info',
    // db.createProduct stores ['All Crops'] when no crops were given.
    cropIds: resolveCropList(product.crops),
    targetUserId: target,
    fetchedAt,
    payload: {
      productId: id,
      name: typeof product.name === 'string' ? product.name.trim() : id,
      category: typeof product.category === 'string' ? product.category : null,
      targets: textList(product.diseases),
      dosageText: typeof product.dosage === 'string' && product.dosage.trim() ? product.dosage.trim() : null,
      price: Number.isFinite(price) ? price : null,
      // The pack the product's price is for (the server prices other packs from it).
      pack: (typeof product.selectedPack === 'string' && product.selectedPack) || packSizes[0] || null,
      // Uploaded photos can be large data URLs; those are not copied into the cart.
      image: typeof product.image === 'string' && !product.image.startsWith('data:') ? product.image : '',
      // Products saved without a stock figure are still sold on the storefront.
      inStock: Number.isFinite(stock) ? stock > 0 : true,
    },
  });
}

export function normalizeProducts(products, options) {
  return (Array.isArray(products) ? products : []).map(product => normalizeProduct(product, options)).filter(Boolean);
}
