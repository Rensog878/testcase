import { useLayoutEffect } from 'react'
import StoreTicker from './StoreTicker'
import StoreHeader from './StoreHeader'

// Phones: the ticker and the header row, drawn once above every store page
// (App.jsx) so they stay in place while the pages change beneath them.
// Their heights are published as CSS variables for what sits below:
//   --sb-head-h    the header row, which stays pinned while the page scrolls;
//   --sb-chrome-h  ticker + header row, where a full-screen page starts.
// Both are 0 on wider screens, where these are hidden.
export default function StoreTopChrome() {
  useLayoutEffect(() => {
    const root = document.documentElement
    const ticker = document.querySelector('.sb-chrome-ticker')
    const head = document.querySelector('.sb-store-head')
    const update = () => {
      const headHeight = head?.offsetHeight || 0
      root.style.setProperty('--sb-head-h', `${headHeight}px`)
      root.style.setProperty('--sb-chrome-h', `${headHeight + (ticker?.offsetHeight || 0)}px`)
    }
    update()
    const observer = new ResizeObserver(update)
    ;[ticker, head].forEach(el => el && observer.observe(el))
    return () => {
      observer.disconnect()
      root.style.removeProperty('--sb-head-h')
      root.style.removeProperty('--sb-chrome-h')
    }
  }, [])

  return (
    <>
      <StoreTicker />
      <StoreHeader />
    </>
  )
}
