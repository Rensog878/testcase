import axios from 'axios'
import { farmerCacheKey } from '../data/resourceCache.js'
import { RESOURCE_POLICY } from '../lib/priorityConfig.js'
import { useResource } from './useResource.js'

// Only what the dashboard shows is saved on the device.
function pickProfile(user) {
  if (!user) return null
  const { id, name, crop, primaryCrop, crops, acreage, village, district, state } = user
  return { id, name, crop: crop ?? primaryCrop, crops, acreage, village, district, state }
}

const fetchProfile = () => axios.get('/api/profile').then(({ data }) => pickProfile(data.data))

export function useFarmerProfile(userId) {
  return useResource({
    key: userId ? farmerCacheKey(userId, 'profile') : null,
    fetcher: fetchProfile,
    maxAgeMs: RESOURCE_POLICY.profile.maxAgeMs,
  })
}
