import { Clock, RefreshCw, TriangleAlert, WifiOff } from 'lucide-react'
import { describeAge } from '../lib/freshness.js'
import { useFarmerT } from '../hooks/useFarmerT.js'
import Skeleton from './Skeleton'

function RetryButton({ onRetry, retrying }) {
  const { t } = useFarmerT()
  return (
    <button type="button" className="fd-button fd-button--secondary" onClick={onRetry} disabled={retrying}>
      <RefreshCw size={18} aria-hidden="true" />
      {retrying ? t('state.retrying') : t('state.retry')}
    </button>
  )
}

/**
 * One dashboard section with the four data states handled the same way everywhere.
 * view comes from resourceView() or combineViews() in lib/freshness.js.
 * A card is a <section> with an h2; a part of a card is a <div> with an h3.
 */
export default function SourceCard({ id, className = '', as = 'section', level = 2, title, icon: Icon, view, fetchedAt, now, onRetry, retrying, errorMessage, empty, children }) {
  const { t, tCount } = useFarmerT()
  const Wrapper = as
  const Heading = `h${level}`
  const headingId = `${id}-title`
  const showingData = view.state === 'ready' || view.state === 'empty'
  const age = showingData ? describeAge(fetchedAt, now) : null

  return (
    <Wrapper
      className={`${as === 'section' ? 'fd-card' : 'fd-subsection'} ${className}`}
      aria-labelledby={as === 'section' ? headingId : undefined}
      aria-busy={view.state === 'loading'}
    >
      <div className="fd-card-header">
        <Heading id={headingId} className={level === 2 ? 'fd-card-title' : 'fd-subsection-title'}>
          {Icon && <Icon size={level === 2 ? 22 : 20} aria-hidden="true" />}
          <span>{title}</span>
        </Heading>
        {age && (
          <p className="fd-freshness">
            <Clock size={16} aria-hidden="true" />
            {age.unit === 'now' ? t('age.now') : tCount(`age.${age.unit}`, age.count)}
          </p>
        )}
      </div>

      {showingData && view.stale && (
        <div className="fd-notice">
          <span className="fd-notice-text">
            {view.reason === 'offline' ? <WifiOff size={18} aria-hidden="true" /> : <TriangleAlert size={18} aria-hidden="true" />}
            {t(`state.${view.reason}`)}
          </span>
          {view.reason !== 'offline' && <RetryButton onRetry={onRetry} retrying={retrying} />}
        </div>
      )}

      {view.state === 'loading' && (
        <>
          <Skeleton />
          <p className="fd-sr-only">{t('state.loading')}</p>
        </>
      )}

      {view.state === 'error' && (
        <div className="fd-state">
          <p>{errorMessage}</p>
          <RetryButton onRetry={onRetry} retrying={retrying} />
        </div>
      )}

      {view.state === 'empty' && empty}
      {view.state === 'ready' && children}
    </Wrapper>
  )
}
