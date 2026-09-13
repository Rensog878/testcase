import { Link } from 'react-router-dom'
import { ListChecks, Star, Wheat } from 'lucide-react'
import { useFarmerT } from '../hooks/useFarmerT.js'
import AddToCartButton from './AddToCartButton'
import AttentionList from './AttentionList'
import SourceCard from './SourceCard'
import StatusBadge from './StatusBadge'

function amountText({ value, unit }, { t, number }) {
  return `${number(value, 2)} ${t(`unit.${unit}`)}`
}

function ProductAction({ ranked }) {
  const text = useFarmerT()
  const { t, tCount, rupees } = text
  const { item, breakdown, dose } = ranked
  const p = item.payload
  const targeted = breakdown.targeted.value === 1
  const general = breakdown.cropMatch.reason === 'general'

  return (
    <li className="fd-list-item">
      <h4 className="fd-item-title">{p.name}</h4>
      {(targeted || general) && (
        <div className="fd-tags">
          {targeted && <span className="fd-tag"><Star size={16} aria-hidden="true" />{t('crop.selectedForYou')}</span>}
          {general && <span className="fd-tag">{t('crop.forAllCrops')}</span>}
        </div>
      )}
      {p.targets.length > 0 && <p className="fd-item-text">{t('crop.targets', { list: p.targets.join(', ') })}</p>}
      {p.dosageText && (
        <div className="fd-dose">
          <p>{t('crop.dosage', { dosage: p.dosageText })}</p>
          {dose && (
            <p className="fd-dose-total">
              {t('crop.doseForFarm', {
                acres: tCount('farm.acres', dose.acres),
                amount: dose.total.min.value === dose.total.max.value && dose.total.min.unit === dose.total.max.unit
                  ? amountText(dose.total.min, text)
                  : `${amountText(dose.total.min, text)} – ${amountText(dose.total.max, text)}`,
              })}
            </p>
          )}
          <p className="fd-item-meta">{t('crop.labelCheck')}</p>
        </div>
      )}
      {p.pack && p.price !== null && <p className="fd-item-meta">{t('crop.pack', { pack: p.pack, price: rupees(p.price) })}</p>}
      <div className="fd-actions">
        <AddToCartButton payload={p} />
        <Link className="fd-button fd-button--secondary" to={`/product/${encodeURIComponent(p.productId)}`}>
          {t('crop.viewProduct')}
          <span className="fd-sr-only">: {p.name}</span>
        </Link>
      </div>
    </li>
  )
}

/**
 * Widget 2: what the farmer should do. Orders that need them and the spraying
 * advice, ranked by the priority engine, then products for their crop.
 */
export default function CropActionsCard({ className, attention, recommendations, cropName, now }) {
  const { t } = useFarmerT()

  const productsEmpty = recommendations.value.status === 'no_crop' ? (
    <div className="fd-state">
      <p>{t('crop.noCrop')}</p>
      <a className="fd-button" href="/storefront.html#cropSection">{t('crop.noCropAction')}</a>
    </div>
  ) : (
    <div className="fd-state">
      <p>{t('crop.noneForCrop', { crop: cropName })}</p>
      <a className="fd-button" href="/storefront.html#catalog">{t('crop.noneAction')}</a>
    </div>
  )

  return (
    <section className={`fd-card ${className}`} aria-labelledby="fd-actions-title">
      <h2 id="fd-actions-title" className="fd-card-title fd-card-title--standalone">
        <ListChecks size={22} aria-hidden="true" />
        <span>{t('actions.title')}</span>
      </h2>

      <SourceCard
        as="div"
        level={3}
        id="fd-attention"
        title={t('actions.attention')}
        view={attention.view}
        fetchedAt={attention.fetchedAt}
        now={now}
        onRetry={attention.retry}
        retrying={attention.retrying}
        errorMessage={t('attention.error')}
        empty={
          <div className="fd-state">
            <StatusBadge severity="ok" />
            <p>{t('attention.none')}</p>
          </div>
        }
      >
        <AttentionList items={attention.items} now={now} />
      </SourceCard>

      <SourceCard
        as="div"
        level={3}
        id="fd-crop"
        title={cropName && recommendations.value.status !== 'no_crop' ? t('actions.productsFor', { crop: cropName }) : t('actions.products')}
        icon={Wheat}
        view={recommendations.view}
        fetchedAt={recommendations.fetchedAt}
        now={now}
        onRetry={recommendations.retry}
        retrying={recommendations.retrying}
        errorMessage={t('crop.error')}
        empty={productsEmpty}
      >
        <ul className="fd-list">
          {recommendations.value.items.map(ranked => <ProductAction key={ranked.item.id} ranked={ranked} />)}
        </ul>
      </SourceCard>
    </section>
  )
}
