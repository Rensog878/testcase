import { useMemo, useRef, useState } from 'react'

// Popups that slide in without a stutter on phones: the storefront's own
// (photo scanner, welcome poster) and the ones every store page shares
// (sign-in, checkout - hooks/useCheckout.js). A popup's state is undefined
// (closed), 'opening' (painted, about to slide in) or 'open'.
export default function useModalStates() {
  const [modals, setModals] = useState({})
  const modalsRef = useRef(modals)

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
    // the layer - the stutter on phones.
    //
    // Nothing is painted on touch-down any more ("pre-warming"): iOS Safari
    // watches for content that becomes visible while a finger is down, takes it
    // for a hover menu and drops the click, so the profile and basket icons
    // needed two taps on iPhone.
    const openModal = id => {
      if (modalsRef.current[id]) return
      setModal(id, 'opening')
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (modalsRef.current[id] === 'opening') setModal(id, 'open')
      }))
    }

    const closeModal = id => {
      if (modalsRef.current[id]) setModal(id, undefined)
    }

    return { openModal, closeModal, modalsRef }
  }, [])

  return [modals, actions]
}
