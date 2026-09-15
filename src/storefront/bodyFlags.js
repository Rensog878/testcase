// Body classes set by more than one part of the app: overlay-open (pauses the
// ticker, brings the bottom bar back) is set by the storefront's own popups
// and by the popups every store page shares. Each part claims the class for
// itself, and it stays while anyone still claims it - so the storefront
// closing its photo scanner does not clear it under an open checkout.
const claims = new Map()

export function setBodyFlag(name, owner, on) {
  const owners = claims.get(name) || new Set()
  if (on) owners.add(owner)
  else owners.delete(owner)
  claims.set(name, owners)
  document.body.classList.toggle(name, owners.size > 0)
}
