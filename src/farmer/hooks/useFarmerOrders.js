import { useMemo } from 'react'
import axios from 'axios'
import { farmerCacheKey } from '../data/resourceCache.js'
import { normalizeOrders } from '../lib/normalizers/orderItem.js'
import { RESOURCE_POLICY } from '../lib/priorityConfig.js'
import { useResource } from './useResource.js'

function pickOrder(order) {
  const { id, items, total, paymentStatus, deliveryStatus, status, expectedDeliveryDate, createdAt, updatedAt, deliveredAt, otp } = order
  return {
    id,
    items: Array.isArray(items) ? items.map(item => ({ name: item?.name, qty: item?.qty })) : [],
    total,
    paymentStatus,
    deliveryStatus,
    status,
    expectedDeliveryDate,
    createdAt,
    updatedAt,
    deliveredAt,
    otp,
  }
}

// GET /api/orders returns only the signed-in farmer's own orders.
const fetchOrders = () =>
  axios.get('/api/orders').then(({ data }) => (Array.isArray(data.data) ? data.data.map(pickOrder) : []))

/** The farmer's orders, plus the same orders as DashboardItems. */
export function useFarmerOrders(userId, now) {
  const resource = useResource({
    key: userId ? farmerCacheKey(userId, 'orders') : null,
    fetcher: fetchOrders,
    maxAgeMs: RESOURCE_POLICY.orders.maxAgeMs,
  })
  const items = useMemo(
    () => normalizeOrders(resource.data, { now, fetchedAt: resource.fetchedAt }),
    [resource.data, resource.fetchedAt, now],
  )
  return { ...resource, items }
}
