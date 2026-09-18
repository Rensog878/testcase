import { memo, useState } from 'react'
import axios from 'axios'
import { cmsText } from '../../hooks/useCmsSettings'
import { showToast } from '../toast'

const DEFAULT_TESTIMONIALS = [
  {
    quote: '"Sathyam Bio BlastShield 75 WP completely saved my 5-acre paddy crop from neck blast after heavy rain. High quality product!"',
    photo: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=200&q=80',
    name:  'K. Venkateswarlu',
    place: 'Paddy Farmer, Guntur (AP)',
  },
  {
    quote: '"FlyKill Ultra controlled whitefly infestation in my cotton crop within 48 hours. Fast delivery and COD service."',
    photo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&q=80',
    name:  'Ramesh Patil',
    place: 'Cotton Grower, Yavatmal (MH)',
  },
  {
    quote: '"RootVigor Gold organic biostimulant increased white root mass and fruit size in my tomato farm by 30%."',
    photo: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=200&q=80',
    name:  'Subramaniam B.',
    place: 'Horticulture Farmer, Salem (TN)',
  },
]

export const Testimonials = memo(function Testimonials({ cms }) {
  const sectionTitle    = cmsText(cms, 'testimonialsTitle',    'Trusted by 15,000+ Indian Farmers')
  const sectionSubtitle = cmsText(cms, 'testimonialsSubtitle', 'Real results from paddy, cotton, tomato, and fruit growers')

  // Merge CMS overrides over the default testimonials
  const testimonials = DEFAULT_TESTIMONIALS.map((item, i) => {
    const n = i + 1
    return {
      quote: cmsText(cms, `testimonial${n}Quote`, item.quote),
      photo: cmsText(cms, `testimonial${n}Photo`, item.photo),
      name:  cmsText(cms, `testimonial${n}Name`,  item.name),
      place: cmsText(cms, `testimonial${n}Place`, item.place),
    }
  })

  return (
    <section className="section" style={{ background: '#ffffff', padding: '50px 0' }}>
      <div className="container">
        <div className="section-header text-center">
          <h2 className="section-title">{sectionTitle}</h2>
          <p className="section-subtitle">{sectionSubtitle}</p>
        </div>
        <div className="testimonials-grid">
          {testimonials.map(item => (
            <div key={item.name} style={{ background: '#FAF9F6', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ color: 'var(--accent-amber)', marginBottom: '8px' }}>★★★★★</div>
              <p style={{ fontSize: '0.88rem', fontStyle: 'italic', color: 'var(--text-main)', lineHeight: 1.5 }}>{item.quote}</p>
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                  src={item.photo}
                  alt="Farmer"
                  style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }}
                  loading="lazy"
                  decoding="async"
                />
                <div>
                  <strong style={{ fontSize: '0.9rem', display: 'block', color: 'var(--primary-dark)' }}>{item.name}</strong>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.place}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
})

const CROP_OPTIONS = ['Paddy / Rice Farmer', 'Cotton Farmer', 'Horticulture / Vegetables', 'Sugarcane Farmer', 'Mixed Crop Farmer']

export const Newsletter = memo(function Newsletter({ cms }) {
  const [subscribed, setSubscribed] = useState(false)
  const [phone, setPhone] = useState('')
  const [crop, setCrop] = useState(CROP_OPTIONS[0])
  const [submitting, setSubmitting] = useState(false)

  const farmImg = cmsText(cms, 'advisoryImage', 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=500&q=80')

  const handleSubmit = async event => {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      const { data } = await axios.post('/api/advisory/subscribe', { phone, crop })
      if (!data.success) throw new Error(data.message || 'Could not subscribe')
      setSubscribed(true)
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Could not subscribe. Please try again.'
      showToast(message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="newsletter-section">
      <div className="container">
        <div className="newsletter-inner">
          <div className="newsletter-left">
            <img
              src={farmImg}
              className="newsletter-farm-img"
              alt="Farm Newsletter"
              loading="lazy"
              decoding="async"
              onError={event => { event.currentTarget.style.visibility = 'hidden' }}
            />
          </div>
          <div className="newsletter-right">
            <span className="newsletter-tag"><i className="fa-solid fa-seedling"></i> Free Seasonal Advisory</span>
            <h2 className="newsletter-title">
              {cms && typeof cms.advisoryTitle === 'string' && cms.advisoryTitle.trim()
                ? cms.advisoryTitle
                : <>Get Weekly Crop &amp; Pesticide<br />Recommendations</>}
            </h2>
            <p className="newsletter-desc">{cmsText(cms, 'advisoryDesc', 'Join 15,000+ farmers receiving our free seasonal advisory newsletter. Kharif & Rabi crop schedules, disease alerts, and exclusive offers every week.')}</p>
            <form className="newsletter-form" onSubmit={handleSubmit}>
              {subscribed ? (
                <div style={{ padding: '12px', color: '#0B7A4B', fontWeight: 600 }}>Thank you! Your advisory subscription is confirmed.</div>
              ) : (
                <>
                  <input
                    type="tel"
                    placeholder="Enter your WhatsApp Number"
                    className="newsletter-input"
                    value={phone}
                    onChange={event => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
                    inputMode="numeric"
                    maxLength={10}
                    required
                  />
                  <select className="newsletter-select" value={crop} onChange={event => setCrop(event.target.value)}>
                    {CROP_OPTIONS.map(option => <option key={option}>{option}</option>)}
                  </select>
                  <button type="submit" className="newsletter-btn" disabled={submitting}>
                    <i className="fa-brands fa-whatsapp"></i> {submitting ? 'Subscribing…' : 'Subscribe Free'}
                  </button>
                </>
              )}
            </form>
            <p className="newsletter-note"><i className="fa-solid fa-lock"></i> No spam. Unsubscribe anytime. Available in 6 South Indian languages.</p>
          </div>
        </div>
      </div>
    </section>
  )
})
