import { memo } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../StoreContext'

const CATEGORY_CARDS = [
  { value: 'Fungicide', image: 'photo-1585314062340-f1a5a7c9328d', alt: 'Bio Fungicides Spraying', tag: 'Crop Disease Defense', title: 'Fungicides', desc: 'Cure Blast, Blight, Powdery Mildew & Rust' },
  { value: 'Insecticide', image: 'photo-1628352081506-83c43123ed6d', alt: 'Insect Pest Control', tag: 'Pest Protection', title: 'Insecticides', desc: 'Control Whitefly, Bollworm, Aphids & Borer' },
  { value: 'Bio-Stimulant', image: 'photo-1523348837708-15d4a09cfac2', alt: 'Bio Stimulant Crop Growth', tag: 'Yield Booster', title: 'Bio-Stimulants', desc: 'Root Vigor, Flowering & Fruit Mass Booster' },
  { value: 'Herbicide', image: 'photo-1500937386664-56d1dfef3854', alt: 'Weed Free Agricultural Field', tag: 'Weed Elimination', title: 'Herbicides', desc: 'Selective Pre & Post Emergence Weed Control' },
  { value: 'Nematicide', image: 'photo-1464226184884-fa280b87c399', alt: 'Soil Root Nematode Defense', tag: 'Soil Protection', title: 'Nematicides', desc: 'Protect Roots Against Nematode Attacks' },
  { value: 'All', image: 'photo-1500382017468-9049fed747ef', alt: 'Full Store Catalog', tag: 'Full Catalog', tagStyle: { background: 'white', color: 'black' }, title: 'All 35 Agro Formulations', desc: 'Browse complete Sathyam Bio product range' },
]

const CROP_CARDS = [
  { value: 'Paddy/Rice', image: 'photo-1530507629858-e4977d30e9e0', alt: 'Paddy Rice Field', tag: 'Blast Defense', title: 'Paddy / Rice' },
  { value: 'Cotton', image: 'photo-1605001011156-cbf0b0f67a35', alt: 'Cotton Crop Field', tag: 'Whitefly Shield', title: 'Cotton' },
  { value: 'Tomato', image: 'photo-1592924357228-91a4daadcfea', alt: 'Tomato Farm Harvest', tag: 'Blight Care', title: 'Tomato' },
  { value: 'Wheat', image: 'photo-1574323347407-f5e1ad6d020b', alt: 'Golden Wheat Field', tag: 'Rust Control', title: 'Wheat' },
  { value: 'Sugarcane', image: 'photo-1595855759920-86582396756a', alt: 'Sugarcane Plantation', tag: 'Borer Solution', title: 'Sugarcane' },
  { value: 'Corn', image: 'photo-1601593346740-925612772716', alt: 'Corn Maize Field', tag: 'Armyworm Defense', title: 'Corn / Maize' },
  { value: 'Grapes', image: 'photo-1560493676-04071c5f467b', alt: 'Grape Vineyard', tag: 'Mildew Protect', title: 'Grapes' },
  { value: 'Potato', image: 'photo-1518977676601-b53f82aba655', alt: 'Potato Crop Harvest', tag: 'Tuber Guard', title: 'Potato' },
]

const unsplash = (id, width) => `https://images.unsplash.com/${id}?w=${width}&q=80`

export const CategoryGrid = memo(function CategoryGrid({ t }) {
  const { filterByCategory } = useStore()
  return (
    <section className="section" id="categoriesSection" style={{ padding: '40px 0', background: '#ffffff' }}>
      <div className="container">
        <div className="section-header-flex">
          <div>
            <h2 className="section-title" data-i18n="shop_by_category">{t('shop_by_category')}</h2>
            <p className="section-subtitle">Explore crop protection chemicals, bio-stimulants, and soil nutrients</p>
          </div>
          <Link to="/categories" className="btn btn-outline">Shop All Categories <i className="fa-solid fa-arrow-right"></i></Link>
        </div>

        <div className="bento-grid-3">
          {CATEGORY_CARDS.map(card => (
            <div key={card.value} className="bento-card" onClick={() => filterByCategory(card.value)} style={{ cursor: 'pointer', height: '240px' }}>
              <img src={unsplash(card.image, 800)} className="bento-bg-img" alt={card.alt} loading="lazy" decoding="async" />
              <div className="bento-overlay">
                <span className="bento-tag" style={card.tagStyle}>{card.tag}</span>
                <h3 className="bento-title">{card.title}</h3>
                <p className="bento-desc">{card.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
})

export const CropGrid = memo(function CropGrid() {
  const { filterByCrop } = useStore()
  return (
    <section className="section" id="cropSection" style={{ background: 'var(--bg-section)', padding: '40px 0' }}>
      <div className="container">
        <div className="section-header-flex">
          <div>
            <h2 className="section-title">Shop by Crop</h2>
            <p className="section-subtitle">Select your crop to get customized pesticide &amp; nutrient recommendations</p>
          </div>
        </div>

        <div className="bento-grid-4">
          {CROP_CARDS.map(card => (
            <div key={card.value} className="bento-card" onClick={() => filterByCrop(card.value)} style={{ cursor: 'pointer', height: '200px' }}>
              <img src={unsplash(card.image, 600)} className="bento-bg-img" alt={card.alt} loading="lazy" decoding="async" />
              <div className="bento-overlay">
                <span className="bento-tag">{card.tag}</span>
                <h3 className="bento-title" style={{ fontSize: '1.15rem' }}>{card.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
})

const CERTIFICATIONS = [
  { image: 'photo-1586281380349-632531db7ed4', alt: 'ICAR Certified', label: 'ICAR Approved' },
  { image: 'photo-1560472354-b33ff0c44a43', alt: 'ISO 9001', label: 'ISO 9001:2015' },
  { image: 'photo-1587614382346-4ec70e388b28', alt: 'Organic India', label: 'Organic India' },
  { image: 'photo-1571019613454-1cb2f99b2d8b', alt: 'GreenTech Award', label: 'GreenTech 2025' },
  { image: 'photo-1559757148-5c350d0d3c56', alt: 'APEDA', label: 'APEDA Member' },
]

// Titles, labels and logos can be changed in the admin CMS.
export const Certifications = memo(function Certifications({ settings }) {
  return (
    <section className="cert-strip" id="certificationsSection">
      <div className="container">
        <div className="cert-strip-header" id="certificationsTitle">{settings.certificationsTitle || 'Certifications & Recognitions'}</div>
        <p id="certificationsSubtitle" style={{ textAlign: 'center', color: 'var(--text-muted)', margin: '-10px 0 20px', display: settings.certificationsSubtitle ? 'block' : 'none' }}>
          {settings.certificationsSubtitle || ''}
        </p>
        <div className="cert-logos-row">
          {CERTIFICATIONS.map((item, index) => {
            const label = settings[`certification${index + 1}Label`]
            return (
              <div className="cert-logo-card" key={item.image}>
                <img
                  id={`certification${index + 1}Image`}
                  src={settings[`certification${index + 1}Image`] || unsplash(item.image, 120)}
                  alt={label || item.alt}
                  loading="lazy"
                  decoding="async"
                />
                <span id={`certification${index + 1}Label`}>{label || item.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
})
