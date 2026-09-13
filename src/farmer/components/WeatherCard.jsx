import { useState } from 'react'
import { ChevronDown, CircleCheck, CloudSun, Info, MapPin, TriangleAlert } from 'lucide-react'
import { useFarmerT } from '../hooks/useFarmerT.js'
import { forecastSlots } from '../lib/weatherView.js'
import ConditionIcon from './ConditionIcon'
import SourceCard from './SourceCard'
import { dayName, nextWindowText, rainText, reasonText, speedText, temperatureText } from './weatherText.js'

// Same icon and colour as the advice's badge in "Needs your attention"
// (lib/normalizers/weatherItem.js: avoid = warning, caution = info, safe = ok).
const VERDICT_STYLE = {
  safe: { icon: CircleCheck, tone: 'ok' },
  caution: { icon: Info, tone: 'info' },
  avoid: { icon: TriangleAlert, tone: 'warning' },
}

function SprayVerdict({ spray, now }) {
  const text = useFarmerT()
  const { t } = text
  const { icon: Icon, tone } = VERDICT_STYLE[spray.verdict] || VERDICT_STYLE.caution

  return (
    <div className={`fd-verdict fd-verdict--${tone}`}>
      <p className="fd-verdict-title">
        <Icon size={28} aria-hidden="true" />
        <span>{t(`spray.${spray.verdict}`)}</span>
      </p>
      {spray.reasons.length ? (
        <ul className="fd-reasons">
          {spray.reasons.map(reason => <li key={reason.code}>{reasonText(reason, text)}</li>)}
        </ul>
      ) : (
        <p>{t('spray.safeDetail', { hours: spray.checkedHours })}</p>
      )}
      {spray.verdict !== 'safe' && <p className="fd-verdict-strong">{nextWindowText(spray, now, text)}</p>}
      <p className="fd-verdict-note">{t('spray.guidance')}</p>
    </div>
  )
}

function CurrentConditions({ current }) {
  const text = useFarmerT()
  const { t } = text
  if (!current) return null
  const rain = rainText({ probabilityPct: current.rainProbabilityPct, mm: current.precipitationMm }, text)

  return (
    <div className="fd-now">
      <div className="fd-now-main">
        <ConditionIcon condition={current.condition} size={40} />
        <p className="fd-now-temp">{temperatureText(current.temperatureC, text)}</p>
        <div>
          <p className="fd-item-title">{t(`condition.${current.condition}`)}</p>
          {typeof current.apparentTemperatureC === 'number' && (
            <p className="fd-item-meta">{t('weather.feelsLike', { temp: temperatureText(current.apparentTemperatureC, text) })}</p>
          )}
        </div>
      </div>
      <dl className="fd-facts fd-facts--row">
        {typeof current.humidityPct === 'number' && (
          <div><dt>{t('weather.humidity')}</dt><dd>{`${Math.round(current.humidityPct)}%`}</dd></div>
        )}
        {typeof current.windKph === 'number' && (
          <div><dt>{t('weather.wind')}</dt><dd>{speedText(current.windKph, text)}</dd></div>
        )}
        {rain && (
          <div><dt>{t('weather.rain')}</dt><dd>{t('weather.rainNextHour', { amount: rain })}</dd></div>
        )}
      </dl>
    </div>
  )
}

function Forecast({ hourly, daily, now }) {
  const text = useFarmerT()
  const { t, time } = text
  // Open on desktop where there is room; on phones the advice stays on the first screen.
  const [open, setOpen] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1024px)').matches)

  return (
    <details className="fd-details" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
      <summary>
        <span>{t('weather.showForecast')}</span>
        <ChevronDown size={20} aria-hidden="true" />
      </summary>
      <div className="fd-details-body">
        <h3 className="fd-subsection-title">{t('weather.next24')}</h3>
        <ul className="fd-slots">
          {forecastSlots(hourly).map(hour => (
            <li key={hour.time} className="fd-slot">
              <span className="fd-slot-time">{time(hour.time)}</span>
              <ConditionIcon condition={hour.condition} size={22} />
              <span className="fd-sr-only">{t(`condition.${hour.condition}`)}</span>
              <span className="fd-slot-temp">{temperatureText(hour.temperatureC, text)}</span>
              <span>{rainText({ probabilityPct: hour.rainProbabilityPct, mm: hour.precipitationMm }, text)}</span>
            </li>
          ))}
        </ul>
        <h3 className="fd-subsection-title">{t('weather.next3days')}</h3>
        <ul className="fd-days">
          {daily.map(day => (
            <li key={day.date} className="fd-day">
              <span className="fd-day-name">{dayName(day.date, now, text)}</span>
              <span className="fd-day-temps">{temperatureText(day.minC, text)} / {temperatureText(day.maxC, text)}</span>
              <span className="fd-day-condition">
                <ConditionIcon condition={day.condition} size={20} />
                <span>{t(`condition.${day.condition}`)}</span>
                <span>· {rainText({ probabilityPct: day.rainProbabilityPct, mm: day.precipitationMm }, text)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  )
}

/** Widget 1: weather at the farm and whether it is safe to spray. */
export default function WeatherCard({ className, view, weather, fetchedAt, resource, now }) {
  const { t } = useFarmerT()

  const empty = (
    <div className="fd-state">
      <p>{weather?.status === 'location_not_found' ? t('weather.locationNotFound', { place: weather.place }) : t('weather.locationMissing')}</p>
      <a className="fd-button fd-button--secondary" href="/storefront.html#tickets">{t('order.contactSupport')}</a>
    </div>
  )

  return (
    <SourceCard
      id="fd-weather"
      className={className}
      title={t('weather.title')}
      icon={CloudSun}
      view={view}
      fetchedAt={fetchedAt}
      now={now}
      onRetry={resource.retry}
      retrying={resource.loading}
      errorMessage={t('weather.error')}
      empty={empty}
    >
      {weather?.status === 'ok' && (
        <>
          <p className="fd-place">
            <MapPin size={20} aria-hidden="true" />
            <span>
              {weather.location.precision === 'village'
                ? t('weather.near', { place: weather.location.label })
                : t('weather.district', { place: weather.location.district || weather.location.label })}
            </span>
          </p>
          <SprayVerdict spray={weather.spray} now={now} />
          <CurrentConditions current={weather.current} />
          <Forecast hourly={weather.hourly} daily={weather.daily} now={now} />
          <p className="fd-hint">{t('weather.notYourFarm')}</p>
          <p className="fd-credits">
            {[['weather.creditsWeather', weather.source.credits[0]], ['weather.creditsMap', weather.source.credits[1]]]
              .filter(([, credit]) => credit)
              .map(([label, credit]) => (
                <span key={label}>
                  {t(label)}{' '}
                  <a href={credit.url} target="_blank" rel="noopener noreferrer">{credit.name}</a>
                  {credit.licence ? ` (${credit.licence})` : ''}
                </span>
              ))}
          </p>
        </>
      )}
    </SourceCard>
  )
}
