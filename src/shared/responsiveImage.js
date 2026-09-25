// Store photos from images.unsplash.com, sized for the screen that shows them.
// Unsplash resizes on its CDN: `w` sets the width, `auto=format` serves AVIF
// or WebP to browsers that accept them (JPEG otherwise) and `q` the quality.
// A 360px phone used to download the same 800-1200px JPEG as a desktop.
// Any other URL (admin uploads, /assets/...) is returned untouched.

const UNSPLASH = /^https:\/\/images\.unsplash\.com\//
export const PHOTO_WIDTHS = [400, 800, 1200]

export function photoUrl(url, width, quality = 70) {
  if (!url || !UNSPLASH.test(url)) return url
  const [base, query = ''] = url.split('?')
  const params = new URLSearchParams(query)
  params.set('w', String(width))
  params.set('q', String(quality))
  params.set('auto', 'format')
  params.set('fit', 'crop')
  return `${base}?${params.toString()}`
}

// srcset for <img>; empty for non-Unsplash URLs so the plain src is used.
export function photoSrcSet(url, widths = PHOTO_WIDTHS, quality = 70) {
  if (!url || !UNSPLASH.test(url)) return undefined
  return widths.map(width => `${photoUrl(url, width, quality)} ${width}w`).join(', ')
}
