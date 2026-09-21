import { memo } from 'react'
import { cmsText, useCms } from '../../context/CmsContext'
import { telHref } from '../../shared/phoneLink'

// A round "Call us" button on every store page, bottom right, above the AI
// chat bubble where the page has one. The number is the CMS contact phone,
// the same one the phone Menu's call link uses. It hides while the basket,
// checkout, sign-in or any other sheet is open (body.overlay-open), and under
// the phone Menu and the welcome poster, so it never sits over a total or a
// Pay button. On desktop the number shows beside it on hover or focus.
// Styles: storefront.css, "Floating call button".
export default memo(function CallFab() {
  const { cms } = useCms()
  const phone = cmsText(cms, 'phone', '1800-425-9999')
  const href = telHref(phone)
  if (!href) return null
  return (
    <a id="callFab" className="call-fab" href={href} aria-label={`Call us: ${phone}`}>
      <i className="fa-solid fa-phone" aria-hidden="true"></i>
      <span className="call-fab-label" aria-hidden="true"><span>Call us</span> <strong className="notranslate">{phone}</strong></span>
    </a>
  )
})
