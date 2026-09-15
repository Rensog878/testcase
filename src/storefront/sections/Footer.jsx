import { memo } from 'react'
import { useStore } from '../StoreContext'
import FooterColumn from '../../components/FooterColumn'

const COLUMN_TITLE_STYLE = { color: 'var(--accent-gold)', marginBottom: '14px', fontSize: '0.95rem' }
const LIST_STYLE = { listStyle: 'none', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '8px', color: '#DCEFE4' }
const HELP_STYLE = { fontSize: '0.85rem', color: '#DCEFE4', marginBottom: '8px' }

export default memo(function Footer({ t }) {
  const { filterByCategory, filterByCrop } = useStore()
  return (
    <footer style={{ background: 'var(--primary-dark)', color: '#ffffff', padding: '50px 0 20px' }}>
      <div className="container">
        {/* The grid's margin below is in storefront.css, so phones can drop it. */}
        <div className="footer-grid" style={{ gap: '30px' }}>
          <div>
            <div className="logo-text" style={{ color: '#ffffff', fontSize: '1.6rem', marginBottom: '10px' }}>SATHYA <span style={{ color: 'var(--accent-gold)' }}>BIO</span></div>
            {/* Two sentences, each its own key in the language packs; phones
                show only the first. */}
            <p style={{ fontSize: '0.85rem', color: '#DCEFE4', lineHeight: 1.6, marginBottom: '16px' }}>
              <span>Sathya Bio is India's leading digital platform for high-efficacy bio-pesticides, crop protection chemicals, and soil health fertilizers.</span>{' '}
              <span className="footer-brand-more">Providing 100% bio-certified products with fast express dispatch to 15,000+ farmers across India.</span>
            </p>
            <div style={{ display: 'flex', gap: '12px', fontSize: '1.2rem' }}>
              <a href="#" style={{ color: 'white' }} aria-label="WhatsApp"><i className="fa-brands fa-whatsapp"></i></a>
              <a href="#" style={{ color: 'white' }} aria-label="Facebook"><i className="fa-brands fa-facebook"></i></a>
              <a href="#" style={{ color: 'white' }} aria-label="YouTube"><i className="fa-brands fa-youtube"></i></a>
              <a href="#" style={{ color: 'white' }} aria-label="Instagram"><i className="fa-brands fa-instagram"></i></a>
            </div>
          </div>

          <FooterColumn i18nKey="footer_nav" title={t('footer_nav')} titleStyle={COLUMN_TITLE_STYLE}>
            <ul className="footer-col-body" style={LIST_STYLE}>
              <li><a href="#catalog" onClick={() => filterByCategory('Fungicide')}>Bio-Fungicides</a></li>
              <li><a href="#catalog" onClick={() => filterByCategory('Insecticide')}>Insecticides</a></li>
              <li><a href="#catalog" onClick={() => filterByCategory('Herbicide')}>Herbicides</a></li>
              <li><a href="#catalog" onClick={() => filterByCategory('Bio-Stimulant')}>Bio-Stimulants</a></li>
              <li><a href="#catalog" onClick={() => filterByCategory('Nematicide')}>Nematicides</a></li>
            </ul>
          </FooterColumn>

          <FooterColumn i18nKey="footer_crops" title={t('footer_crops')} titleStyle={COLUMN_TITLE_STYLE}>
            <ul className="footer-col-body" style={LIST_STYLE}>
              <li><a href="#catalog" onClick={() => filterByCrop('Paddy/Rice')}>Paddy / Rice Care</a></li>
              <li><a href="#catalog" onClick={() => filterByCrop('Cotton')}>Cotton Protection</a></li>
              <li><a href="#catalog" onClick={() => filterByCrop('Tomato')}>Tomato &amp; Vegetables</a></li>
              <li><a href="#catalog" onClick={() => filterByCrop('Sugarcane')}>Sugarcane Care</a></li>
              <li><a href="#catalog" onClick={() => filterByCrop('Grapes')}>Horticulture &amp; Fruits</a></li>
            </ul>
          </FooterColumn>

          <FooterColumn i18nKey="footer_help" title={t('footer_help')} titleStyle={COLUMN_TITLE_STYLE}>
            <div className="footer-col-body">
              <p style={HELP_STYLE}><i className="fa-solid fa-phone"></i> Toll Free: 1800-425-9999</p>
              <p style={HELP_STYLE}><i className="fa-solid fa-envelope"></i> support@sathyabio.com</p>
              <p style={{ ...HELP_STYLE, marginBottom: '12px' }}><i className="fa-solid fa-location-dot"></i> Sathya Bio Tech Park, Hyderabad, India</p>
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px', fontSize: '0.78rem' }}>
                <i className="fa-solid fa-lock" style={{ color: 'var(--accent-gold)' }}></i> 100% Secure Payment (UPI, COD, NetBanking)
              </div>
            </div>
          </FooterColumn>
        </div>

        <div className="footer-bottom-row" style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#C2E8D4' }}>
          <span data-i18n="footer_copyright">{t('footer_copyright')}</span>
          <div style={{ display: 'flex', gap: '15px' }}>
            <span>Privacy Policy</span>
            <span>Terms of Sale</span>
            <span>Refund Policy</span>
          </div>
        </div>
      </div>
    </footer>
  )
})
