import { useMemo } from 'react'
import axios from 'axios'
import { farmerCacheKey } from '../data/resourceCache.js'
import { selectCropRecommendations } from '../lib/dashboardModel.js'
import { RESOURCE_POLICY } from '../lib/priorityConfig.js'
import { useResource } from './useResource.js'

// Product records can carry photos as data URLs; the dashboard saves only the
// fields it ranks and shows, so the device copy stays small.
function pickProduct(product) {
  const { id, _id, name, category, crops, diseases, dosage, stock, price, targetUserId, packSizes, selectedPack, image } = product
  return {
    id: id ?? _id, name, category, crops, diseases, dosage, stock, price, targetUserId, packSizes, selectedPack,
    image: typeof image === 'string' && !image.startsWith('data:') ? image : '',
  }
}

const fetchProducts = userId => () =>
  axios
    .get('/api/products', { params: { userId } })
    .then(({ data }) => (Array.isArray(data.data) ? data.data.map(pickProduct) : []))

/** Up to three in-stock products for the farmer's crop, ranked by the priority engine. */
export function useCropRecommendations(userId, context, now) {
  const resource = useResource({
    key: userId ? farmerCacheKey(userId, 'products') : null,
    fetcher: fetchProducts(userId),
    maxAgeMs: RESOURCE_POLICY.products.maxAgeMs,
  })
  const recommendations = useMemo(
    () => selectCropRecommendations(resource.data, context, { now, fetchedAt: resource.fetchedAt, limit: 3 }),
    [resource.data, resource.fetchedAt, context, now],
  )
  return { ...resource, recommendations }
}
