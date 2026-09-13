import { useMemo } from 'react'
import axios from 'axios'
import { farmerCacheKey } from '../data/resourceCache.js'
import { normalizeWeather } from '../lib/normalizers/weatherItem.js'
import { RESOURCE_POLICY } from '../lib/priorityConfig.js'
import { useResource } from './useResource.js'

// Forecast and spraying advice for the farmer's village (server/weather/service.js).
const fetchWeather = () => axios.get('/api/farmer/weather').then(({ data }) => data.data)

export function useFarmerWeather(userId, now) {
  const resource = useResource({
    key: userId ? farmerCacheKey(userId, 'weather') : null,
    fetcher: fetchWeather,
    maxAgeMs: RESOURCE_POLICY.weather.maxAgeMs,
  })
  const item = useMemo(() => normalizeWeather(resource.data, { now }), [resource.data, now])
  return { ...resource, item }
}
