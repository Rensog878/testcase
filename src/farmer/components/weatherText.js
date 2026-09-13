// Words for spraying advice and forecast values. `text` is what useFarmerT() returns.

import { middayOf, relativeDay, toMs } from '../lib/weatherView.js'

export const temperatureText = (value, { number }) => (typeof value === 'number' ? `${number(value, 0)}°C` : '')

export const speedText = (value, { t, number }) => t('measure.kph', { value: number(value, 0) })

/** "70% chance" when the forecast has a probability, otherwise "1.2 mm". */
export function rainText({ probabilityPct, mm }, { t, number }) {
  if (typeof probabilityPct === 'number') return t('rain.chance', { pct: Math.round(probabilityPct) })
  if (typeof mm === 'number') return t('rain.amount', { mm: number(mm, 1) })
  return ''
}

export function reasonText(reason, text) {
  const { t, time, number } = text
  switch (reason.code) {
    case 'rain_expected':
    case 'rain_possible':
      return t(`reason.${reason.code}`, {
        time: time(toMs(reason.at)),
        amount: rainText({ probabilityPct: reason.probabilityPct, mm: reason.value }, text),
      })
    case 'wind_strong':
    case 'wind_moderate':
    case 'wind_calm':
    case 'gusts_strong':
      return t(`reason.${reason.code}`, { speed: speedText(reason.value, text) })
    case 'too_hot':
    case 'hot':
      return t(`reason.${reason.code}`, { temp: temperatureText(reason.value, text) })
    case 'dry_air':
      return t('reason.dry_air', { humidity: `${number(reason.value, 0)}%` })
    case 'no_forecast':
      return t('reason.no_forecast', { hours: reason.value })
    default:
      return t(`reason.${reason.code}`)
  }
}

/** "Today", "Tomorrow" or the weekday for a time or 'YYYY-MM-DD' date. */
export function dayName(value, now, { t, weekday }) {
  const relative = relativeDay(value, now)
  if (relative) return t(`day.${relative}`)
  return weekday(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? middayOf(value) : toMs(value))
}

export function nextWindowText(spray, now, text) {
  const { t, time } = text
  if (!spray.nextSafeWindow) return t('spray.noWindow', { hours: spray.searchedHours })
  const start = toMs(spray.nextSafeWindow.start)
  return t('spray.nextWindow', { day: dayName(start, now, text), start: time(start), end: time(toMs(spray.nextSafeWindow.end)) })
}
