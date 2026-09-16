import { memo, useEffect, useRef, useState } from 'react'
import { WHATSAPP_EXPERT_URL } from '../data'
import { cmsText } from '../../hooks/useCmsSettings'

export const Hero = memo(function Hero({ t, cms }) {
  return (
    <section className="section" style={{ padding: '24px 0 40px 0' }}>
      <div className="container">
        <div className="bento-grid-4">
          {/* Main feature banner (2 columns, 2 rows) */}
          <div className="bento-card bento-span-2 bento-row-2">
            <img src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80" className="bento-bg-img" alt="Agriculture Farm Field" fetchpriority="high" decoding="async" />
            <div className="bento-overlay">
              <span className="bento-tag">India's #1 Bio-Pesticide Store</span>
              <h1 className="bento-title" style={{ fontSize: '2rem' }} data-i18n="hero_title">{cmsText(cms, 'heroTitle', t('hero_title'))}</h1>
              <p className="bento-desc" data-i18n="hero_desc">{cmsText(cms, 'heroSubtitle', t('hero_desc'))}</p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '10px' }}>
                <a href="#catalog" className="btn btn-primary bento-btn"><span data-i18n="hero_shop_btn">{t('hero_shop_btn')}</span></a>
              </div>
            </div>
          </div>

          {/* AI Leaf Doctor scanner */}
          <div className="bento-card bento-span-2" data-modal-target="photoScannerModal" style={{ cursor: 'pointer' }}>
            <img src="https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=600&q=80" className="bento-bg-img" alt="Crop Leaf Scan" loading="lazy" decoding="async" />
            <div className="bento-overlay">
              <span className="bento-tag">Instant Diagnostic</span>
              <h3 className="bento-title" style={{ fontSize: '1.15rem' }}>AI Leaf Scanner</h3>
              <p className="bento-desc">Upload leaf photo for 10-second disease check</p>
            </div>
          </div>

          {/* WhatsApp assistant */}
          <div className="bento-card bento-span-2" style={{ background: 'linear-gradient(135deg, #063F2A, #096540)', cursor: 'pointer' }} onClick={() => window.open(WHATSAPP_EXPERT_URL, '_blank', 'noopener')}>
            <img src="https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=800&q=80" className="bento-bg-img" style={{ opacity: 0.35 }} alt="Farmer Consultation" loading="lazy" decoding="async" />
            <div className="bento-overlay">
              <span className="bento-tag" style={{ background: '#25d366', color: 'white' }}>24/7 WhatsApp AI</span>
              <h3 className="bento-title">Automated Field Assistant</h3>
              <p className="bento-desc">Get instant pesticide dosage guides &amp; disease remedies directly on WhatsApp</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
})

const pad = value => String(value).padStart(2, '0')

function untilMidnight() {
  const now = new Date()
  const midnight = new Date()
  midnight.setHours(23, 59, 59, 999)
  let secs = Math.floor((midnight - now) / 1000)
  if (secs <= 0) secs = 86399
  return { h: pad(Math.floor(secs / 3600)), m: pad(Math.floor((secs % 3600) / 60)), s: pad(secs % 60) }
}

export const DealBanner = memo(function DealBanner() {
  const bannerRef = useRef(null)
  const [time, setTime] = useState(untilMidnight)

  useEffect(() => {
    // Nothing is redrawn while the banner is off-screen or a popup or sheet
    // covers the page. The time is read from the clock on each tick, so
    // skipped ticks never drift.
    let onScreen = true
    const tick = () => {
      if (!onScreen || document.body.classList.contains('overlay-open')) return
      const next = untilMidnight()
      setTime(current => (current.h === next.h && current.m === next.m && current.s === next.s ? current : next))
    }
    let observer = null
    if (bannerRef.current && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        onScreen = entries[entries.length - 1].isIntersecting
        if (onScreen) tick()
      })
      observer.observe(bannerRef.current)
    }
    const timer = setInterval(tick, 1000)
    return () => {
      clearInterval(timer)
      observer?.disconnect()
    }
  }, [])

  return (
    <div className="deal-banner" ref={bannerRef}>
      <div className="container deal-banner-inner">
        <div className="deal-left">
          <span className="deal-fire"><i className="fa-solid fa-bolt"></i></span>
          <div>
            <div className="deal-title">Kharif Season Sale — Up to 30% Off Paddy &amp; Cotton Essentials</div>
            <div className="deal-sub">Limited stock. Ends midnight tonight. COD available.</div>
          </div>
        </div>
        <div className="deal-right">
          <span className="deal-label">Ends in:</span>
          <div className="deal-countdown">
            <div className="deal-block"><span id="dealHours">{time.h}</span><small>hrs</small></div>
            <div className="deal-colon">:</div>
            <div className="deal-block"><span id="dealMins">{time.m}</span><small>min</small></div>
            <div className="deal-colon">:</div>
            <div className="deal-block"><span id="dealSecs">{time.s}</span><small>sec</small></div>
          </div>
          <a href="#catalog" className="deal-cta">Shop Now <i className="fa-solid fa-arrow-right"></i></a>
        </div>
      </div>
    </div>
  )
})

export const TrustStrip = memo(function TrustStrip({ t }) {
  return (
    <section className="trust-strip">
      <div className="container trust-strip-grid">
        <div className="trust-item">
          <i className="fa-solid fa-shield-halved"></i>
          <div>
            <strong data-i18n="trust_certified">{t('trust_certified')}</strong>
            <span>Lab-Tested Original Bio-Formulations</span>
          </div>
        </div>
        <div className="trust-item">
          <i className="fa-solid fa-truck-fast"></i>
          <div>
            <strong data-i18n="trust_dispatch">{t('trust_dispatch')}</strong>
            <span>Express Doorstep Delivery Across India</span>
          </div>
        </div>
        <div className="trust-item">
          <i className="fa-solid fa-hand-holding-dollar"></i>
          <div>
            <strong>Cash On Delivery</strong>
            <span>Pay After Delivery at Your Farm</span>
          </div>
        </div>
        <div className="trust-item">
          <i className="fa-brands fa-whatsapp"></i>
          <div>
            <strong data-i18n="trust_whatsapp">{t('trust_whatsapp')}</strong>
            <span>24/7 Advisory from Senior Agronomists</span>
          </div>
        </div>
      </div>
    </section>
  )
})

const STATS = [
  { target: 15000, label: 'Farmers Served', sub: 'across 18 Indian states' },
  { target: 48, label: 'Product Formulations', sub: '100% bio-certified lab tested' },
  { target: 95, label: '% Dispatch Rate', sub: 'same-day orders fulfilled' },
  { target: 12, label: 'Years of Expertise', sub: 'trusted since 2013' },
]

export const StatsStrip = memo(function StatsStrip() {
  const numbers = useRef([])

  // Each number counts up once, the first time it scrolls into view. The
  // count is written straight to the element, not through React state, so
  // the animation re-renders nothing.
  useEffect(() => {
    const frames = new Set()
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        const el = entry.target
        const target = parseInt(el.dataset.target, 10)
        const startTime = performance.now()
        const duration = 1400
        const animate = now => {
          const progress = Math.min((now - startTime) / duration, 1)
          const ease = 1 - Math.pow(1 - progress, 3) // cubic ease-out
          el.textContent = Math.floor(target * ease).toLocaleString('en-IN')
          if (progress < 1) frames.add(requestAnimationFrame(animate))
          else el.textContent = target.toLocaleString('en-IN')
        }
        frames.add(requestAnimationFrame(animate))
        observer.unobserve(el)
      })
    }, { threshold: 0.4 })
    numbers.current.forEach(el => el && observer.observe(el))
    return () => {
      observer.disconnect()
      frames.forEach(cancelAnimationFrame)
    }
  }, [])

  return (
    <section className="stats-strip">
      <div className="container stats-grid">
        {STATS.map((stat, index) => (
          <StatItem key={stat.target} stat={stat} index={index} numbers={numbers} />
        ))}
      </div>
    </section>
  )
})

function StatItem({ stat, index, numbers }) {
  return (
    <>
      {index > 0 && <div className="stat-divider"></div>}
      <div className="stat-item">
        <div className="stat-number" data-target={stat.target} ref={el => { numbers.current[index] = el }}>0</div>
        <div className="stat-label">{stat.label}</div>
        <div className="stat-sublabel">{stat.sub}</div>
      </div>
    </>
  )
}
