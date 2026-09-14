import { useRef } from 'react'
import { useStore } from '../StoreContext'
import useSwipeToDismiss from '../useSwipeToDismiss'

// A storefront popup. state is undefined (closed), 'opening' (painted, about
// to slide in) or 'open'. Clicking outside the card, the close button or a
// downward swipe closes it; Escape is handled by the page.
export default function Modal({ id, state, cardClassName = 'modal-card', cardProps, closeProps, getSwipeScroller, children }) {
  const { closeModal } = useStore()
  const cardRef = useRef(null)
  useSwipeToDismiss(cardRef, () => closeModal(id), getSwipeScroller)

  const className = ['modal-overlay', state === 'opening' && 'is-opening', state === 'open' && 'active'].filter(Boolean).join(' ')
  return (
    <div className={className} id={id} onClick={event => { if (event.target === event.currentTarget) closeModal(id) }}>
      <div ref={cardRef} className={cardClassName} {...cardProps}>
        {/* On phones the "×" text is hidden and drawn as an icon, so the button is named. */}
        <button className="modal-close" aria-label="Close" onClick={() => closeModal(id)} {...closeProps}>&times;</button>
        {children}
      </div>
    </div>
  )
}
