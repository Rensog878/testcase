import { useEffect, useRef } from 'react'

// A downward swipe dismisses a bottom card or sheet, like a native bottom
// sheet. getScroller(card) names the element that keeps its own scrolling
// until it is back at the top (the card itself by default).
export default function useSwipeToDismiss(ref, onDismiss, getScroller) {
  const dismiss = useRef(onDismiss)
  dismiss.current = onDismiss
  const scrollerOf = useRef(getScroller)
  scrollerOf.current = getScroller

  useEffect(() => {
    const card = ref.current
    if (!card) return undefined
    let startX = 0
    let startY = 0
    let dy = 0
    let tracking = false
    let decided = false
    let resetTimer = null

    const resetDrag = () => {
      card.style.removeProperty('transform')
      card.style.removeProperty('transition')
      card.style.removeProperty('opacity')
    }

    const onStart = event => {
      if (event.touches.length !== 1 || event.target.closest('select, input, textarea')) return
      const scroller = scrollerOf.current ? scrollerOf.current(card) : card
      if (scroller && scroller.contains(event.target) && scroller.scrollTop > 0) return
      startX = event.touches[0].clientX
      startY = event.touches[0].clientY
      dy = 0
      tracking = true
      decided = false
    }

    const onMove = event => {
      if (!tracking) return
      const moveX = event.touches[0].clientX - startX
      const moveY = event.touches[0].clientY - startY
      if (!decided) {
        if (Math.abs(moveX) < 6 && Math.abs(moveY) < 6) return
        decided = true
        // Sideways is a chip row scrolling; upward is not a dismiss.
        if (Math.abs(moveX) > Math.abs(moveY) || moveY < 0) {
          tracking = false
          return
        }
      }
      dy = Math.max(0, moveY)
      // Stylesheets position these with !important, so the drag must too.
      card.style.setProperty('transition', 'none', 'important')
      card.style.setProperty('transform', `translateY(${dy}px)`, 'important')
      card.style.setProperty('opacity', String(Math.max(0.4, 1 - dy / 320)))
    }

    const onEnd = () => {
      if (!tracking) return
      tracking = false
      if (dy > 70) {
        dismiss.current()
        resetTimer = setTimeout(resetDrag, 350)
      } else {
        resetDrag()
      }
    }

    card.addEventListener('touchstart', onStart, { passive: true })
    card.addEventListener('touchmove', onMove, { passive: true })
    card.addEventListener('touchend', onEnd)
    card.addEventListener('touchcancel', onEnd)
    return () => {
      clearTimeout(resetTimer)
      card.removeEventListener('touchstart', onStart)
      card.removeEventListener('touchmove', onMove)
      card.removeEventListener('touchend', onEnd)
      card.removeEventListener('touchcancel', onEnd)
    }
  }, [ref])
}
