import { Package } from 'lucide-react'
import { useFarmerT } from '../hooks/useFarmerT.js'
import SourceCard from './SourceCard'
import StatusBadge from './StatusBadge'

export default function OrdersCard({ className, view, orders, resource, now }) {
  const { t, tCount, rupees, day } = useFarmerT()

  return (
    <SourceCard
      id="fd-orders"
      className={className}
      title={t('orders.title')}
      icon={Package}
      view={view}
      fetchedAt={resource.fetchedAt}
      now={now}
      onRetry={resource.retry}
      retrying={resource.loading}
      errorMessage={t('orders.error')}
      empty={
        <div className="fd-state">
          <p>{t('orders.empty')}</p>
          <a className="fd-button" href="/storefront.html#catalog">{t('orders.emptyAction')}</a>
        </div>
      }
    >
      <ul className="fd-list">
        {orders.map(item => {
          const p = item.payload
          const statusKey = item.kind === 'order.delayed' ? 'delayed' : p.status
          const label = statusKey === 'unknown' ? t('orderStatus.unknown', { status: p.rawStatus }) : t(`orderStatus.${statusKey}`)
          const first = p.items[0]
          const meta = [
            p.orderId,
            p.total !== null ? t('orders.total', { amount: rupees(p.total) }) : null,
            p.createdAt !== null ? t('orders.placedOn', { date: day(p.createdAt) }) : null,
          ].filter(Boolean)

          return (
            <li key={item.id} className="fd-list-item">
              <StatusBadge severity={item.severity} label={label} />
              <p className="fd-item-title">
                {first ? `${first.name || t('orders.itemFallback')} × ${first.qty}` : t('orders.itemFallback')}
              </p>
              {p.items.length > 1 && <p className="fd-item-text">{tCount('orders.moreItems', p.items.length - 1)}</p>}
              <p className="fd-item-meta">{meta.join(' · ')}</p>
            </li>
          )
        })}
      </ul>
      <div className="fd-actions">
        <a className="fd-button fd-button--secondary" href="/order-status.html">{t('orders.viewAll')}</a>
      </div>
    </SourceCard>
  )
}
