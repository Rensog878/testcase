import { useState, useSyncExternalStore } from 'react'

// A footer link group that folds into a tap-to-open row on phones (768px and
// narrower). Shared by the storefront footer (classes footer-col, -title) and
// the store pages' footer (public-footer-col, -title); each page's CSS draws
// the row, chevron and `.open` state. The children carry the body class.
// Wider screens show every group open, so there the title is a plain heading.

const PHONE = '(max-width: 768px)'

const watchPhone = onChange => {
  const query = window.matchMedia(PHONE)
  query.addEventListener?.('change', onChange)
  return () => query.removeEventListener?.('change', onChange)
}

const isPhone = () => window.matchMedia(PHONE).matches

export default function FooterColumn({ base = 'footer-col', title, titleStyle, i18nKey, children }) {
  const [open, setOpen] = useState(false)
  const phone = useSyncExternalStore(watchPhone, isPhone, () => false)
  const toggle = () => setOpen(current => !current)
  const buttonProps = phone && {
    role: 'button',
    tabIndex: 0,
    'aria-expanded': open,
    onClick: toggle,
    onKeyDown: event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        toggle()
      }
    },
  }
  return (
    <div className={`${base}${open ? ' open' : ''}`}>
      <h4 className={`${base}-title`} style={titleStyle} data-i18n={i18nKey} {...buttonProps}>
        {title}
      </h4>
      {children}
    </div>
  )
}
