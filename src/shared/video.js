// Video links on product pages, blog posts and the admin video library.

// The 11-character id of a YouTube watch, embed or youtu.be link, else null.
export function getYouTubeId(url) {
  if (!url) return null
  const match = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : null
}

// An uploaded or direct video file the <video> tag can play.
export function isHtml5Video(url) {
  if (!url) return false
  return url.startsWith('/api/upload') || url.startsWith('data:video') || /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)
}
