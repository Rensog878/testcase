import { useFarmerT } from '../hooks/useFarmerT.js'
import StatusBadge from './StatusBadge'
import { nextWindowText, reasonText } from './weatherText.js'

// Words and actions for each kind that can appear in "Needs your attention".
// A new source that produces critical or warning items adds its kinds here.
function describe(item, text, now) {
  const { t, rupees, day } = text
  const p = item.payload
  const track = { href: '/order-status.html', label: t('order.track'), hidden: ` ${p.orderId}` }

  switch (item.kind) {
    case 'order.out_for_delivery':
      return {
        title: t('order.out_for_delivery.title', { orderId: p.orderId }),
        lines: [
          p.cashDue ? t('order.out_for_delivery.cash', { amount: rupees(p.cashDue) }) : t('order.out_for_delivery.paid'),
          p.otp ? t('order.otp', { otp: p.otp }) : null,
        ],
        actions: [track],
      }
    case 'order.delayed':
      return {
        title: t('order.delayed.title', { orderId: p.orderId }),
        lines: [t('order.delayed.detail', { date: day(p.expectedAt) })],
        actions: [track, { href: '/storefront.html#tickets', label: t('order.contactSupport') }],
      }
    case 'order.dispatched_cash_due':
      return {
        title: t('order.dispatched_cash_due.title', { orderId: p.orderId }),
        lines: [
          t('order.dispatched_cash_due.detail', { amount: rupees(p.cashDue) }),
          p.expectedAt ? t('order.expected', { date: day(p.expectedAt) }) : null,
        ],
        actions: [track],
      }
    case 'weather.spray_avoid':
    case 'weather.spray_caution':
    case 'weather.spray_safe':
      return {
        badge: t(`spray.${p.verdict}`),
        lines: [
          p.reasons.length ? reasonText(p.reasons[0], text) : t('spray.safeDetail', { hours: p.checkedHours }),
          p.verdict === 'safe' ? null : nextWindowText(p, now, text),
        ],
        actions: [{ href: '#fd-weather-title', label: t('weather.seeDetails') }],
      }
    default:
      return null
  }
}

export default function AttentionList({ items, now }) {
  const text = useFarmerT()

  return (
    <ul className="fd-list" id="fd-attention-list">
      {items.map(({ item }) => {
        const described = describe(item, text, now)
        if (!described) return null
        return (
          <li key={item.id} className={`fd-list-item fd-list-item--${item.severity}`}>
            <StatusBadge severity={item.severity} label={described.badge} />
            {described.title && <p className="fd-item-title">{described.title}</p>}
            {described.lines.filter(Boolean).map(line => (
              <p key={line} className="fd-item-text">{line}</p>
            ))}
            <div className="fd-actions">
              {described.actions.map(action => (
                <a key={action.href + action.label} className="fd-button fd-button--secondary" href={action.href}>
                  {action.label}
                  {action.hidden && <span className="fd-sr-only">{action.hidden}</span>}
                </a>
              ))}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
