import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import CropActionsCard from '../../farmer/components/CropActionsCard'
import FarmerLayout from '../../farmer/components/FarmerLayout'
import FarmSummaryCard from '../../farmer/components/FarmSummaryCard'
import OrdersCard from '../../farmer/components/OrdersCard'
import WeatherCard from '../../farmer/components/WeatherCard'
import { farmerCache } from '../../farmer/data/farmerCache.js'
import { useCropRecommendations } from '../../farmer/hooks/useCropRecommendations.js'
import { useFarmerOrders } from '../../farmer/hooks/useFarmerOrders.js'
import { useFarmerProfile } from '../../farmer/hooks/useFarmerProfile.js'
import { useFarmerT } from '../../farmer/hooks/useFarmerT.js'
import { useFarmerWeather } from '../../farmer/hooks/useFarmerWeather.js'
import { useNow } from '../../farmer/hooks/useNow.js'
import { selectAttentionItems, selectRecentOrders } from '../../farmer/lib/dashboardModel.js'
import { buildFarmerContext } from '../../farmer/lib/farmerContext.js'
import { combineViews, resourceView } from '../../farmer/lib/freshness.js'
import { RESOURCE_POLICY } from '../../farmer/lib/priorityConfig.js'
import { toMs, weatherRisk } from '../../farmer/lib/weatherView.js'
import { cropDisplayName } from '../../shared/cropRegistry.js'
import '../../farmer/farmer.css'

function viewOf(resource, policy, isEmpty, now, { fetchedAt = resource.fetchedAt, sourceStale = false } = {}) {
  return resourceView({
    hasData: resource.hasData,
    isEmpty,
    loading: resource.loading,
    error: resource.error,
    fetchedAt,
    now,
    staleAfterMs: policy.staleAfterMs,
    online: resource.online,
    sourceStale,
  })
}

const oldest = times => {
  const known = times.filter(time => typeof time === 'number')
  return known.length ? Math.min(...known) : null
}

export default function FarmerDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { t, lang } = useFarmerT()
  const now = useNow()
  const userId = user?.id ? String(user.id) : null

  // Anything saved for another account on this device is removed on arrival.
  useEffect(() => {
    if (userId) farmerCache.clear({ keepUserId: userId })
  }, [userId])

  useEffect(() => {
    const previous = document.title
    document.title = `${t('app.title')} · ${t('app.brand')}`
    return () => { document.title = previous }
  }, [t])

  const profile = useFarmerProfile(userId)
  // Until /api/profile answers, the signed-in user record (already confirmed by /api/auth/me) stands in.
  const context = useMemo(() => buildFarmerContext(profile.data || user), [profile.data, user])
  const orders = useFarmerOrders(userId, now)
  const products = useCropRecommendations(userId, context, now)
  const weather = useFarmerWeather(userId, now)

  const weatherData = weather.data
  const weatherOk = weatherData?.status === 'ok'
  // "Updated …" for weather means when the forecast was made, not when we asked our server.
  const weatherFetchedAt = weatherOk ? toMs(weatherData.fetchedAt) : weather.fetchedAt

  const rankingContext = useMemo(
    () => ({ ...context, now, weather: { risk: weatherRisk(weatherData) } }),
    [context, now, weatherData],
  )
  const attentionItems = useMemo(
    () => selectAttentionItems([...orders.items, weather.item].filter(Boolean), rankingContext, { alwaysInclude: item => item.source === 'weather' }),
    [orders.items, weather.item, rankingContext],
  )
  const recentOrders = useMemo(() => selectRecentOrders(orders.items), [orders.items])

  const ordersView = viewOf(orders, RESOURCE_POLICY.orders, recentOrders.length === 0, now)
  const weatherView = viewOf(weather, RESOURCE_POLICY.weather, !weatherOk, now, { fetchedAt: weatherFetchedAt, sourceStale: weatherData?.stale === true })
  const productsView = viewOf(products, RESOURCE_POLICY.products, products.recommendations.status !== 'ok', now)

  // All the farmer's crops by name, primary first ("நெல், பருத்தி").
  const cropName = context.crops.map(crop => cropDisplayName(crop, lang)).filter(Boolean).join(', ')
  const firstName = context.name ? context.name.split(/\s+/)[0] : null

  // Going to "/" first unmounts this guarded route, so clearing the session
  // leads to the storefront home rather than its sign-in form.
  const signOut = () => {
    navigate('/', { replace: true })
    logout(false)
  }

  return (
    <FarmerLayout onSignOut={signOut}>
      <header className="fd-page-header">
        <h1>{firstName ? t('greeting.named', { name: firstName }) : t('greeting.anonymous')}</h1>
        <p>{t('greeting.subtitle')}</p>
      </header>

      <div className="fd-grid">
        <CropActionsCard
          className="fd-area-actions"
          cropName={cropName}
          now={now}
          attention={{
            items: attentionItems,
            view: combineViews([ordersView, weatherView], { isEmpty: attentionItems.length === 0 }),
            fetchedAt: oldest([orders.hasData ? orders.fetchedAt : null, weather.hasData ? weatherFetchedAt : null]),
            retry: () => { orders.retry(); weather.retry() },
            retrying: orders.loading || weather.loading,
          }}
          recommendations={{
            value: products.recommendations,
            view: productsView,
            fetchedAt: products.fetchedAt,
            retry: products.retry,
            retrying: products.loading,
          }}
        />
        <WeatherCard
          className="fd-area-weather"
          view={weatherView}
          weather={weatherData}
          fetchedAt={weatherFetchedAt}
          resource={weather}
          now={now}
        />
        <OrdersCard
          className="fd-area-orders"
          view={ordersView}
          orders={recentOrders}
          resource={orders}
          now={now}
        />
        <FarmSummaryCard
          className="fd-area-farm"
          view={viewOf(profile, RESOURCE_POLICY.profile, false, now)}
          context={context}
          cropName={cropName}
          resource={profile}
          now={now}
        />
      </div>
    </FarmerLayout>
  )
}
