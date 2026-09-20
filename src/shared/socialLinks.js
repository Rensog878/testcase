// Official Sathyam Agro Mart social profiles, shown in both store footers.
//
// The href here is the default; an admin can point any of them somewhere else
// from Admin → CMS → Contact & Footer (keys `whatsappUrl`, `facebookUrl`,
// `youtubeUrl`, `instagramUrl`). Entries with no default and no CMS value are
// not rendered, so a placeholder "#" link never ships — WhatsApp and YouTube
// stay hidden until the business has an account to point them at.
export const SOCIAL_LINKS = [
  { name: 'WhatsApp', cmsKey: 'whatsappUrl', href: '', fa: 'fa-brands fa-whatsapp' },
  { name: 'Facebook', cmsKey: 'facebookUrl', href: 'https://www.facebook.com/pradeep.sathyambio.7/', fa: 'fa-brands fa-facebook' },
  { name: 'YouTube', cmsKey: 'youtubeUrl', href: '', fa: 'fa-brands fa-youtube' },
  { name: 'Instagram', cmsKey: 'instagramUrl', href: 'https://www.instagram.com/sathyambio/', fa: 'fa-brands fa-instagram' },
];

// The links to draw for a given CMS payload. A blank or "#" CMS value falls
// back to the default above, so clearing the field restores the official link
// rather than breaking it.
export function socialLinksFrom(cms) {
  return SOCIAL_LINKS
    .map((link) => {
      const typed = typeof cms?.[link.cmsKey] === 'string' ? cms[link.cmsKey].trim() : '';
      const href = typed && typed !== '#' ? typed : link.href;
      return { ...link, href };
    })
    .filter((link) => link.href);
}
