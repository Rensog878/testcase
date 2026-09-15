import { useMemo, useRef, useState } from 'react'

// Popups that slide in without a stutter on phones: the storefront's own
// (photo scanner, welcome poster) and the ones every store page shares
// (sign-in, checkout - hooks/useCheckout.js). A popup's state is undefined
// (closed), 'opening' (painted, about to slide in) or 'open'.
export default function useModalStates() {
  const [modals, setModals] = useState({})
  const modalsRef = useRef(modals)
  const prewarmRef = useRef({})

  const actions = useMemo(() => {
    const setModal = (id, value) => {
      const next = { ...modalsRef.current }
      if (value) next[id] = value
      else delete next[id]
      modalsRef.current = next
      setModals(next)
    }

    // The overlay is painted (still transparent) at least one frame before the
    // card slides, so the first frame of the animation is not spent creating
    // the layer - the stutter on phones. A popup warmed on touch-down slides on
    // the next frame: the tap's own task already renders the link it followed
    // (/#account), and starting the slide in it too made one long task (traced:
    // ~270ms on a 4x slower CPU) instead of two short ones.
    const openModal = id => {
      const current = modalsRef.current[id]
      const warm = prewarmRef.current[id]
      if (current === 'open' || (current === 'opening' && !warm)) return
      if (warm) clearTimeout(warm.timer)
      delete prewarmRef.current[id]
      const start = () => {
        if (modalsRef.current[id] === 'opening') setModal(id, 'open')
      }
      // Warmed, it is already 'opening'; setting it again only re-renders the page.
      if (current !== 'opening') setModal(id, 'opening')
      if (warm && performance.now() - warm.at > 20) requestAnimationFrame(start)
      else requestAnimationFrame(() => requestAnimationFrame(start))
    }

    // Touch-down on anything that opens a popup starts its warm-up; not tapped
    // after all (a scroll), it cools down.
    const prewarmModal = id => {
      if (modalsRef.current[id]) return
      prewarmRef.current[id] = {
        at: performance.now(),
        timer: setTimeout(() => {
          if (!prewarmRef.current[id]) return
          delete prewarmRef.current[id]
          setModal(id, undefined)
        }, 800),
      }
      setModal(id, 'opening')
    }

    const closeModal = id => {
      const warm = prewarmRef.current[id]
      if (warm) clearTimeout(warm.timer)
      delete prewarmRef.current[id]
      if (modalsRef.current[id]) setModal(id, undefined)
    }

    return { openModal, prewarmModal, closeModal, modalsRef }
  }, [])

  return [modals, actions]
}
