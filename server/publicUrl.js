/**
 * The site's public address, for links and images in WhatsApp messages.
 *
 *   PUBLIC_SITE_URL   e.g. https://shop.example.com. When it is not set on
 *                     Vercel, the production domain is used.
 */

// Where farmers' links point when the server has no usable public address.
export const LIVE_SITE_URL = 'https://www.sathyamagromart.com';

export function publicSiteUrl() {
  const configured = (process.env.PUBLIC_SITE_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')).replace(/\/+$/, '');
  // A farmer's phone cannot open localhost or a private address, so a server
  // configured with one (e.g. a copied development .env) links to the live site.
  if (process.env.NODE_ENV !== 'test' && !isPublicHttpsUrl(configured)) return LIVE_SITE_URL;
  return configured;
}

// True when WhatsApp's servers could fetch the URL: HTTPS on a public host, so
// not localhost or a private network address.
export function isPublicHttpsUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;

  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host.includes(':')) return !(host === '::1' || /^(fc|fd|fe80:)/.test(host));
  return host.includes('.')
    && !/(^|\.)localhost$|\.local$|\.internal$/.test(host)
    && !/^(0|10|127)\.|^169\.254\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(host);
}

// Public URL of a file served from public/ (e.g. '/assets/logo.png'), or null
// when the site has no public HTTPS address, as in local development.
export function publicAssetUrl(path) {
  const url = `${publicSiteUrl()}${path}`;
  return isPublicHttpsUrl(url) ? url : null;
}
