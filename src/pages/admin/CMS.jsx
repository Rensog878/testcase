import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { toast } from 'sonner'

const DEFAULT_CONTENT = {
  // ── Hero ──────────────────────────────────────────────────────────────
  heroBannerTag:     "India's #1 Bio-Pesticide Store",
  heroBannerImage:   'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80',
  heroTitle:         'Grow More. Protect Better. Farm Smarter.',
  heroSubtitle:      "India's most trusted source for premium bio-pesticides, crop protection, and agro-inputs — trusted by 15,000+ farmers.",
  heroShopBtnText:   'Shop Catalog',

  // ── Deal Banner ───────────────────────────────────────────────────────
  dealBannerTitle:   'Kharif Season Sale — Up to 30% Off Paddy & Cotton Essentials',
  dealBannerSubtitle:'Limited stock. Ends midnight tonight. COD available.',

  // ── Trust Strip ───────────────────────────────────────────────────────
  trust1Title:  '100% Bio-Certified',
  trust1Desc:   'Lab-Tested Original Bio-Formulations',
  trust2Title:  'Same-Day Dispatch',
  trust2Desc:   'Express Doorstep Delivery Across India',
  trust3Title:  'Cash On Delivery',
  trust3Desc:   'Pay After Delivery at Your Farm',
  trust4Title:  'WhatsApp Advisory',
  trust4Desc:   '24/7 Advisory from Senior Agronomists',

  // ── Stats Strip ───────────────────────────────────────────────────────
  stat1Number:   '15000',
  stat1Label:    'Farmers Served',
  stat1Sub:      'across 18 Indian states',
  stat2Number:   '48',
  stat2Label:    'Product Formulations',
  stat2Sub:      '100% bio-certified lab tested',
  stat3Number:   '95',
  stat3Label:    '% Dispatch Rate',
  stat3Sub:      'same-day orders fulfilled',
  stat4Number:   '12',
  stat4Label:    'Years of Expertise',
  stat4Sub:      'trusted since 2013',

  // ── Category & Crop Grids ─────────────────────────────────────────────
  categoryGridTitle:    'Shop by Category',
  categoryGridSubtitle: 'Explore crop protection chemicals, bio-stimulants, and soil nutrients',
  cropGridTitle:        'Shop by Crop',
  cropGridSubtitle:     'Select your crop to get customized pesticide & nutrient recommendations',

  // ── Promo Ticker ──────────────────────────────────────────────────────
  banner: '🚜 Free Delivery on orders above ₹999 | Use code KISAN20 for 20% off first order',

  // ── Advisory Newsletter ───────────────────────────────────────────────
  advisoryTitle:  'Get Weekly Crop & Pesticide Recommendations',
  advisoryDesc:   'Join 15,000+ farmers receiving our free seasonal advisory newsletter. Kharif & Rabi crop schedules, disease alerts, and exclusive offers every week.',
  advisoryImage:  'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=500&q=80',

  // ── Certifications ────────────────────────────────────────────────────
  certificationsTitle:    'Certifications & Recognitions',
  certificationsSubtitle: '',
  certification1Image:    'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=120&q=80',
  certification1Label:    'ICAR Approved',
  certification2Image:    'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=120&q=80',
  certification2Label:    'ISO 9001:2015',
  certification3Image:    'https://images.unsplash.com/photo-1587614382346-4ec70e388b28?w=120&q=80',
  certification3Label:    'Organic India',
  certification4Image:    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=120&q=80',
  certification4Label:    'GreenTech 2025',
  certification5Image:    'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=120&q=80',
  certification5Label:    'APEDA Member',

  // ── Testimonials ──────────────────────────────────────────────────────
  testimonialsTitle:    'Trusted by 15,000+ Indian Farmers',
  testimonialsSubtitle: 'Real results from paddy, cotton, tomato, and fruit growers',
  testimonial1Quote: '"Sathyam Agro Mart BlastShield 75 WP completely saved my 5-acre paddy crop from neck blast after heavy rain. High quality product!"',
  testimonial1Name:  'K. Venkateswarlu',
  testimonial1Place: 'Paddy Farmer, Guntur (AP)',
  testimonial1Photo: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=200&q=80',
  testimonial2Quote: '"FlyKill Ultra controlled whitefly infestation in my cotton crop within 48 hours. Fast delivery and COD service."',
  testimonial2Name:  'Ramesh Patil',
  testimonial2Place: 'Cotton Grower, Yavatmal (MH)',
  testimonial2Photo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&q=80',
  testimonial3Quote: '"RootVigor Gold organic biostimulant increased white root mass and fruit size in my tomato farm by 30%."',
  testimonial3Name:  'Subramaniam B.',
  testimonial3Place: 'Horticulture Farmer, Salem (TN)',
  testimonial3Photo: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=200&q=80',

  // ── Welcome Popup ─────────────────────────────────────────────────────
  popupImage:     '',
  popupAudience:  'all',
  popupBehavior:  'firstVisit',
  popupTitle:     'Welcome to the Personalized Farming Experience!',
  popupText:      '"Welcome to the personalized farming experience that you can do farming with our expert with daily updates. We care for you!"',

  // ── Contact & Footer ──────────────────────────────────────────────────
  phone:         '+91-98450-12345',
  email:         'support@sathyabio.com',
  address:       '14, Kavundampalayam, Coimbatore – 641030, Tamil Nadu',
  footerBrand:   "Sathyam Agro Mart is India's leading digital platform for high-efficacy bio-pesticides, crop protection chemicals, and soil health fertilizers.",
  footerBrandMore: 'Providing 100% bio-certified products with fast express dispatch to 15,000+ farmers across India.',
  whatsappUrl:   '',
  facebookUrl:   'https://www.facebook.com/pradeep.sathyambio.7/',
  youtubeUrl:    '',
  instagramUrl:  'https://www.instagram.com/sathyambio/',
}

// ─── Which fields are shown to farmers as words ───────────────────────────────
// A Tamil box appears under these. Everything else is a URL, an image, a
// colour, a number or a setting: nothing a farmer reads as a sentence, so
// translating it would be meaningless or would break the page.
const NOT_WORDS = /image|photo|url|link|color|colour|phone|email|whatsapp|key|secret|mode|count|percent|price|rate|id$/i
const isTranslatable = field =>
  (field.type === 'input' || field.type === 'textarea') && !NOT_WORDS.test(field.key)

// The languages an admin can translate into today. Adding Hindi, Kannada or
// Telugu is one more entry here; nothing else in the CMS or the storefront
// needs to change.
const TRANSLATION_LANGUAGES = [{ code: 'ta', label: 'Tamil', native: 'தமிழ்' }]

/* The five information pages (src/pages/InformationPage.jsx) read their copy
   from the CMS under a prefix, so an admin can write the privacy policy, the
   terms, the refund policy, About and Contact without touching the code.
   Alagu's work; it was dropped when his branch was merged, because these keys
   are built from template literals and the field-by-field comparison that
   checked the merge only saw keys written out as plain strings. */
const INFO_PAGE_FIELDS = [
  { prefix: 'privacy', label: 'Privacy Policy', sections: 4 },
  { prefix: 'terms', label: 'Terms of Sale', sections: 4 },
  { prefix: 'refund', label: 'Refund Policy', sections: 4 },
  { prefix: 'about', label: 'About Us', sections: 3 },
  { prefix: 'contact', label: 'Contact Us', sections: 2 },
]

function informationPageFields(prefix, label, sectionCount) {
  const fields = [
    { key: `${prefix}PageTitle`, label: `${label} — Page Title`, type: 'input' },
    { key: `${prefix}PageEyebrow`, label: `${label} — Eyebrow`, type: 'input' },
    { key: `${prefix}PageIntro`, label: `${label} — Introduction`, type: 'textarea' },
  ]
  for (let index = 1; index <= sectionCount; index += 1) {
    fields.push(
      { key: `${prefix}Section${index}Title`, label: `${label} — Section ${index} Heading`, type: 'input' },
      { key: `${prefix}Section${index}Text`, label: `${label} — Section ${index} Content`, type: 'textarea', rows: 4 },
    )
  }
  return fields
}

// ─── Accordion section metadata ───────────────────────────────────────────────
const SECTIONS = [
  {
    id: 'hero',
    label: '🏠 Hero Banner',
    fields: [
      { key: 'heroBannerTag',   label: 'Badge Text (e.g. "India\'s #1 Bio-Pesticide Store")', type: 'input' },
      { key: 'heroBannerImage', label: '🖼️ Hero Main Image URL',                              type: 'input' },
      { key: 'heroTitle',       label: 'Hero Heading',                                         type: 'input' },
      { key: 'heroSubtitle',    label: 'Hero Description',                                     type: 'textarea' },
      { key: 'heroShopBtnText', label: 'Shop CTA Button Text',                                 type: 'input' },
    ],
  },
  {
    id: 'deal',
    label: '🔥 Deal Banner',
    fields: [
      { key: 'dealBannerTitle',    label: 'Sale Headline', type: 'input' },
      { key: 'dealBannerSubtitle', label: 'Sale Sub-text', type: 'input' },
    ],
  },
  {
    id: 'trust',
    label: '✅ Trust Strip (4 items)',
    fields: [
      { key: 'trust1Title', label: 'Trust Item 1 — Heading', type: 'input' },
      { key: 'trust1Desc',  label: 'Trust Item 1 — Description', type: 'input' },
      { key: 'trust2Title', label: 'Trust Item 2 — Heading', type: 'input' },
      { key: 'trust2Desc',  label: 'Trust Item 2 — Description', type: 'input' },
      { key: 'trust3Title', label: 'Trust Item 3 — Heading', type: 'input' },
      { key: 'trust3Desc',  label: 'Trust Item 3 — Description', type: 'input' },
      { key: 'trust4Title', label: 'Trust Item 4 — Heading', type: 'input' },
      { key: 'trust4Desc',  label: 'Trust Item 4 — Description', type: 'input' },
    ],
  },
  {
    id: 'stats',
    label: '📊 Stats Strip (4 counters)',
    fields: [
      { key: 'stat1Number', label: 'Stat 1 — Number (digits only, e.g. 15000)', type: 'input' },
      { key: 'stat1Label',  label: 'Stat 1 — Label', type: 'input' },
      { key: 'stat1Sub',    label: 'Stat 1 — Sub-label', type: 'input' },
      { key: 'stat2Number', label: 'Stat 2 — Number', type: 'input' },
      { key: 'stat2Label',  label: 'Stat 2 — Label', type: 'input' },
      { key: 'stat2Sub',    label: 'Stat 2 — Sub-label', type: 'input' },
      { key: 'stat3Number', label: 'Stat 3 — Number', type: 'input' },
      { key: 'stat3Label',  label: 'Stat 3 — Label', type: 'input' },
      { key: 'stat3Sub',    label: 'Stat 3 — Sub-label', type: 'input' },
      { key: 'stat4Number', label: 'Stat 4 — Number', type: 'input' },
      { key: 'stat4Label',  label: 'Stat 4 — Label', type: 'input' },
      { key: 'stat4Sub',    label: 'Stat 4 — Sub-label', type: 'input' },
    ],
  },
  {
    id: 'grids',
    label: '📂 Category & Crop Grids',
    fields: [
      { key: 'categoryGridTitle',    label: 'Category Section Title', type: 'input' },
      { key: 'categoryGridSubtitle', label: 'Category Section Subtitle', type: 'input' },
      { key: 'cropGridTitle',        label: 'Crop Grid Title', type: 'input' },
      { key: 'cropGridSubtitle',     label: 'Crop Grid Subtitle', type: 'input' },
    ],
  },
  {
    id: 'ticker',
    label: '📢 Promo Ticker',
    fields: [
      { key: 'banner', label: 'Promos — one per line (blank = use built-in promos)', type: 'textarea', rows: 6 },
    ],
  },
  {
    id: 'newsletter',
    label: '🌾 Advisory Newsletter',
    fields: [
      { key: 'advisoryTitle', label: 'Newsletter Section Title', type: 'input' },
      { key: 'advisoryDesc',  label: 'Newsletter Description',   type: 'textarea' },
      { key: 'advisoryImage', label: '🖼️ Newsletter Left Image URL', type: 'input' },
    ],
  },
  {
    id: 'certs',
    label: '🏅 Certifications',
    fields: [
      { key: 'certificationsTitle',    label: 'Section Title',    type: 'input' },
      { key: 'certificationsSubtitle', label: 'Section Subtitle', type: 'textarea' },
      { key: 'certification1Image', label: '🖼️ Cert 1 Image URL', type: 'input' },
      { key: 'certification1Label', label: '🏷️ Cert 1 Label',    type: 'input' },
      { key: 'certification2Image', label: '🖼️ Cert 2 Image URL', type: 'input' },
      { key: 'certification2Label', label: '🏷️ Cert 2 Label',    type: 'input' },
      { key: 'certification3Image', label: '🖼️ Cert 3 Image URL', type: 'input' },
      { key: 'certification3Label', label: '🏷️ Cert 3 Label',    type: 'input' },
      { key: 'certification4Image', label: '🖼️ Cert 4 Image URL', type: 'input' },
      { key: 'certification4Label', label: '🏷️ Cert 4 Label',    type: 'input' },
      { key: 'certification5Image', label: '🖼️ Cert 5 Image URL', type: 'input' },
      { key: 'certification5Label', label: '🏷️ Cert 5 Label',    type: 'input' },
    ],
  },
  {
    id: 'testimonials',
    label: '💬 Testimonials',
    fields: [
      { key: 'testimonialsTitle',    label: 'Section Title',    type: 'input' },
      { key: 'testimonialsSubtitle', label: 'Section Subtitle', type: 'input' },
      { key: 'testimonial1Quote', label: '💬 Testimonial 1 — Quote',    type: 'textarea' },
      { key: 'testimonial1Name',  label: '👤 Testimonial 1 — Name',     type: 'input' },
      { key: 'testimonial1Place', label: '📍 Testimonial 1 — Location', type: 'input' },
      { key: 'testimonial1Photo', label: '🖼️ Testimonial 1 — Photo URL', type: 'input' },
      { key: 'testimonial2Quote', label: '💬 Testimonial 2 — Quote',    type: 'textarea' },
      { key: 'testimonial2Name',  label: '👤 Testimonial 2 — Name',     type: 'input' },
      { key: 'testimonial2Place', label: '📍 Testimonial 2 — Location', type: 'input' },
      { key: 'testimonial2Photo', label: '🖼️ Testimonial 2 — Photo URL', type: 'input' },
      { key: 'testimonial3Quote', label: '💬 Testimonial 3 — Quote',    type: 'textarea' },
      { key: 'testimonial3Name',  label: '👤 Testimonial 3 — Name',     type: 'input' },
      { key: 'testimonial3Place', label: '📍 Testimonial 3 — Location', type: 'input' },
      { key: 'testimonial3Photo', label: '🖼️ Testimonial 3 — Photo URL', type: 'input' },
    ],
  },
  {
    id: 'popup',
    label: '🖼️ Welcome Popup',
    fields: [
      { key: 'popupImage',    label: '🖼️ Popup Image',       type: 'input' },
      { key: 'popupAudience', label: '👨‍🌾 Popup Audience',   type: 'select', options: [['all', 'All visitors'], ['farmer', 'Farmers only']] },
      { key: 'popupBehavior', label: '🎯 Popup Behavior',    type: 'select', options: [['firstVisit', 'First visit only'], ['returning', 'Returning visitors'], ['always', 'Every visit']] },
      { key: 'popupTitle',    label: '📝 Popup Heading',     type: 'input' },
      { key: 'popupText',     label: '📄 Popup Body Text',   type: 'textarea' },
    ],
  },
  ...INFO_PAGE_FIELDS.map(page => ({
    id: page.prefix,
    label: `📄 ${page.label} Page`,
    fields: informationPageFields(page.prefix, page.label, page.sections),
  })),
  {
    id: 'contact-card',
    label: '📞 Contact Page Card',
    fields: [
      { key: 'contactCardTitle', label: 'Contact Card Heading', type: 'input' },
    ],
  },
  {
    id: 'footer',
    label: '📍 Contact & Footer',
    fields: [
      { key: 'phone',          label: '📞 Support Phone Number', type: 'input' },
      { key: 'email',          label: '✉️ Support Email',        type: 'input' },
      { key: 'address',        label: '📍 Address',              type: 'input' },
      { key: 'footerBrand',    label: '🏢 Footer Brand Paragraph (first sentence)', type: 'textarea' },
      { key: 'footerBrandMore',label: '🏢 Footer Brand Paragraph (second sentence — hidden on mobile)', type: 'textarea' },
      { key: 'whatsappUrl',    label: '💬 WhatsApp Link URL',   type: 'input' },
      { key: 'facebookUrl',    label: '📘 Facebook Link URL',   type: 'input' },
      { key: 'youtubeUrl',     label: '▶️ YouTube Link URL',    type: 'input' },
      { key: 'instagramUrl',   label: '📸 Instagram Link URL',  type: 'input' },
    ],
  },
]

// ─── Accordion item ───────────────────────────────────────────────────────────
function AccordionSection({ section, merged, onChange, translationOf, onTranslationChange, uploadingKey, fileRefs, onUpload }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{
      border: '1px solid var(--surface-border)',
      borderRadius: '12px',
      overflow: 'hidden',
      background: 'var(--surface-bg)',
    }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          background: open ? 'var(--surface-raised)' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.95rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          textAlign: 'left',
          transition: 'background 0.2s',
        }}
      >
        <span>{section.label}</span>
        <span style={{ fontSize: '0.75rem', opacity: 0.6, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
      </button>

      {open && (
        <div style={{ padding: '16px 18px 20px', display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--surface-border-subtle)' }}>
          {section.fields.map(f => (
            <div key={f.key} className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{f.label}</label>

              {f.type === 'textarea' ? (
                <textarea
                  className="form-textarea"
                  value={merged[f.key] ?? ''}
                  onChange={onChange(f.key)}
                  rows={f.rows || 3}
                />
              ) : f.type === 'select' ? (
                <select className="form-input" value={merged[f.key] ?? ''} onChange={onChange(f.key)}>
                  {f.options.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              ) : f.key.endsWith('Image') || f.key.endsWith('Photo') ? (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    className="form-input"
                    value={merged[f.key] ?? ''}
                    onChange={onChange(f.key)}
                    placeholder="https://… or upload an image"
                  />
                  <button
                    type="button"
                    className="btn"
                    onClick={() => fileRefs.current[f.key]?.click()}
                    disabled={uploadingKey === f.key}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {uploadingKey === f.key ? 'Uploading…' : '⬆ Upload'}
                  </button>
                  <input
                    ref={el => { fileRefs.current[f.key] = el }}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={onUpload(f.key)}
                  />
                  {merged[f.key] && (
                    <img
                      src={merged[f.key]}
                      alt=""
                      style={{ height: '40px', width: '40px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--surface-border)' }}
                      onError={event => { event.currentTarget.style.visibility = 'hidden' }}
                    />
                  )}
                </div>
              ) : (
                <input className="form-input" value={merged[f.key] ?? ''} onChange={onChange(f.key)} />
              )}

              {isTranslatable(f) && TRANSLATION_LANGUAGES.map(language => (
                <div key={language.code} style={{ marginTop: '8px', paddingLeft: '12px', borderLeft: '2px solid var(--surface-border)' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', opacity: 0.75 }} htmlFor={`${f.key}-${language.code}`}>
                    {language.native} — {language.label}
                  </label>
                  <input
                    id={`${f.key}-${language.code}`}
                    className="form-input"
                    lang={language.code}
                    value={translationOf(language.code, f.key)}
                    onChange={onTranslationChange(language.code, f.key)}
                    placeholder="Leave blank to show the English above"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main CMS Page ─────────────────────────────────────────────────────────────
export default function AdminCMS() {
  const [content, setContent] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sathya_cms') || '{}') } catch { return {} }
  })
  const [saving, setSaving] = useState(false)

  // Load what is actually published so another machine's draft never overwrites
  // live content. Keep the local copy as the offline seed.
  useEffect(() => {
    let cancelled = false
    axios.get('/api/cms')
      .then(({ data }) => {
        if (cancelled || !data?.success || !data.data) return
        setContent(current => ({ ...data.data, ...current }))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const merged = { ...DEFAULT_CONTENT, ...content }
  const onChange = k => e => setContent(c => ({ ...c, [k]: e.target.value }))

  // Translations live beside the English, under cms.translations.<code>.<key>,
  // so a field and its wording travel together and a new language needs no
  // change to how any of this is stored.
  const translationOf = (code, key) => merged.translations?.[code]?.[key] ?? ''
  const onTranslationChange = (code, key) => event => {
    const { value } = event.target
    setContent(c => {
      const all = { ...(c.translations ?? merged.translations ?? {}) }
      const forLanguage = { ...(all[code] || {}) }
      // A blank box is no translation at all, not an empty one.
      if (value.trim()) forLanguage[key] = value
      else delete forLanguage[key]
      all[code] = forLanguage
      return { ...c, translations: all }
    })
  }

  // Image upload — sends base64 to /api/upload which stores in MongoDB and
  // returns a /api/upload/<id> URL so the image persists across deploys.
  const [uploadingKey, setUploadingKey] = useState('')
  const fileRefs = useRef({})

  const handleUpload = key => async event => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file')
      return
    }
    setUploadingKey(key)
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
      const { data } = await axios.post('/api/upload', {
        filename: file.name,
        contentType: file.type,
        data: dataUrl,
      })
      if (data?.success && data.url) {
        setContent(c => ({ ...c, [key]: data.url }))
        toast.success('Image uploaded — publish to make it live')
      } else {
        toast.error(data?.message || 'Upload failed')
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Upload failed')
    } finally {
      setUploadingKey('')
    }
  }

  const save = async () => {
    setSaving(true)
    localStorage.setItem('sathya_cms', JSON.stringify(merged))
    try {
      await axios.put('/api/cms', merged)
      try {
        if ('BroadcastChannel' in window) {
          const channel = new BroadcastChannel('sathya_cms')
          channel.postMessage('cms-changed')
          channel.close()
        }
      } catch {}
      toast.success('Content published live! ✅')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to publish content to server')
    } finally {
      setSaving(false)
    }
  }

  const PublishBtn = ({ size }) => (
    <button
      className={`btn btn-primary${size === 'lg' ? ' btn-lg' : ''}`}
      onClick={save}
      disabled={saving}
    >
      {saving ? <><div className="spinner" /> Publishing...</> : '🚀 Publish Live'}
    </button>
  )

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1>✏️ Live CMS Editor</h1>
          <p>Edit every section of the home page — changes go live instantly after publishing</p>
        </div>
        <div className="page-header-actions">
          <PublishBtn />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {SECTIONS.map(section => (
          <AccordionSection
            key={section.id}
            section={section}
            merged={merged}
            onChange={onChange}
            translationOf={translationOf}
            onTranslationChange={onTranslationChange}
            uploadingKey={uploadingKey}
            fileRefs={fileRefs}
            onUpload={handleUpload}
          />
        ))}
      </div>

      <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end' }}>
        <PublishBtn size="lg" />
      </div>
    </div>
  )
}
