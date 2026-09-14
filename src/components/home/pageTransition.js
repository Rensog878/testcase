// The page change running as a view transition on phones (TransitionLink),
// so a popup that opens on arrival can wait for it to finish. While a
// transition runs, the header and bottom bar are drawn above everything and
// the page cross-fades with a lightening blend: a dark overlay fading in
// underneath flashed light, then dark as the header and bar dropped back
// under it.
let current = null

export function startPageTransition(update) {
  const transition = document.startViewTransition(update)
  current = transition
  const clear = () => {
    if (current === transition) current = null
  }
  transition.finished.then(clear, clear)
  // A transition the browser skips still changes the page; only the
  // animation is lost, so that is not an error.
  transition.ready.catch(() => {})
  return transition
}

// Resolves once the current page transition has finished, or straight away
// when none is running.
export function afterPageTransition() {
  return current ? current.finished.catch(() => {}) : Promise.resolve()
}
