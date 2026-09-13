import { MapPin } from 'lucide-react'
import { useFarmerT } from '../hooks/useFarmerT.js'
import SourceCard from './SourceCard'

// The profile API has no editing screen yet, so changes go through support.
export default function FarmSummaryCard({ className, view, context, cropName, resource, now }) {
  const { t, tCount } = useFarmerT()
  const notAdded = t('farm.notAdded')
  const place = [context.location.village, context.location.district, context.location.state].filter(Boolean).join(', ')

  return (
    <SourceCard
      id="fd-farm"
      className={className}
      title={t('farm.title')}
      icon={MapPin}
      view={view}
      fetchedAt={resource.fetchedAt}
      now={now}
      onRetry={resource.retry}
      retrying={resource.loading}
      errorMessage={t('farm.error')}
    >
      <dl className="fd-facts">
        <div>
          <dt>{t('farm.crop')}</dt>
          <dd>{cropName || notAdded}</dd>
        </div>
        <div>
          <dt>{t('farm.area')}</dt>
          <dd>{context.acreage ? tCount('farm.acres', context.acreage) : notAdded}</dd>
        </div>
        <div>
          <dt>{t('farm.location')}</dt>
          <dd>{place || notAdded}</dd>
        </div>
      </dl>
      <p className="fd-hint">{t('farm.changeHint')}</p>
      <div className="fd-actions">
        <a className="fd-button fd-button--secondary" href="/storefront.html#tickets">{t('order.contactSupport')}</a>
      </div>
    </SourceCard>
  )
}
