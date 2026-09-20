import { Mail, Phone, MapPin, Facebook, Instagram, MessageCircle, Youtube } from 'lucide-react'
import { Link } from 'react-router-dom'
import FooterColumn from '../FooterColumn'
import { socialLinksFrom } from '../../shared/socialLinks'
import { useCms } from '../../context/CmsContext'
import { cmsText } from '../../hooks/useCmsSettings'

// THE footer. One copy, on every store page including the home page.
//
// There used to be two - this one and storefront/sections/Footer.jsx - built
// from different markup, and they had drifted: they showed different phone
// numbers and different addresses, so the shop gave two answers depending on
// which page a farmer happened to be reading. This one keeps its markup and
// takes over the other's CMS wiring, so the contact details an admin types
// appear everywhere.
//
// Phones get the brand on top, the link groups as tap-to-open rows and a
// centred bottom row. Styles: index.css, .public-site-footer.

const ICONS = { WhatsApp: MessageCircle, Facebook, YouTube: Youtube, Instagram }

// Drawn in the brand block on phones and in the bottom row on wider screens;
// the hidden copy is display: none, so each is announced once.
function SocialLinks({ className }) {
  const { cms } = useCms()
  return (
    <div className={`public-social-links ${className}`}>
      {socialLinksFrom(cms).map(({ name, href }) => {
        const Icon = ICONS[name]
        return (
          <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Sathyam Agro Mart on ${name} (opens in a new tab)`}>
            <Icon size={20} aria-hidden="true" />
          </a>
        )
      })}
    </div>
  )
}

export default function Footer() {
  const { cms } = useCms()
  const brandLine = cmsText(cms, 'footerBrand', "India's leading digital platform for high-efficacy bio-pesticides, crop protection chemicals, and soil health fertilizers.")
  const brandMore = cmsText(cms, 'footerBrandMore', 'Providing 100% bio-certified products with fast express dispatch to 15,000+ farmers across India.')
  const phone = cmsText(cms, 'phone', '1800-425-9999')
  const email = cmsText(cms, 'email', 'support@sathyabio.com')
  const address = cmsText(cms, 'address', 'Sathyam Agro Mart, Hyderabad, India')
  return (
    <footer className="public-site-footer">
      {/* Main Footer */}
      <div className="public-footer-grid">
        {/* Brand */}
        <div className="public-footer-brand">
          <h3>SATHYAM <span>AGRO MART</span></h3>
          <p>{brandLine}</p>
          <p className="public-footer-brand-more">{brandMore}</p>
          <SocialLinks className="public-footer-brand-social" />
        </div>

        <FooterColumn base="public-footer-col" title="Store Categories">
          <ul className="public-footer-col-body">
            <li><Link to="/categories?category=Fungicide">Bio-Fungicides</Link></li>
            <li><Link to="/categories?category=Insecticide">Insecticides</Link></li>
            <li><Link to="/categories?category=Herbicide">Herbicides</Link></li>
            <li><Link to="/categories?category=Bio-Stimulant">Bio-Stimulants</Link></li>
            <li><Link to="/categories?category=Nematicide">Nematicides</Link></li>
          </ul>
        </FooterColumn>

        <FooterColumn base="public-footer-col" title="Top Crops">
          <ul className="public-footer-col-body">
            <li><Link to="/crops?crop=Paddy%20%2F%20Rice">Paddy / Rice Care</Link></li>
            <li><Link to="/crops?crop=Cotton">Cotton Protection</Link></li>
            <li><Link to="/crops?crop=Vegetables">Tomato & Vegetables</Link></li>
            <li><Link to="/crops?crop=Sugarcane">Sugarcane Care</Link></li>
            <li><Link to="/crops?crop=Horticulture">Horticulture & Fruits</Link></li>
          </ul>
        </FooterColumn>

        <FooterColumn base="public-footer-col" title="Customer Support">
          <ul className="public-footer-col-body public-footer-contact">
            <li>
              <Phone size={16} aria-hidden="true" />
              <div>
                <p className="public-footer-contact-label">Toll Free</p>
                <p>{phone}</p>
              </div>
            </li>
            <li>
              <Mail size={16} aria-hidden="true" />
              <div>
                <p className="public-footer-contact-label">Email</p>
                <p>{email}</p>
              </div>
            </li>
            <li>
              <MapPin size={16} aria-hidden="true" />
              <div>
                <p className="public-footer-contact-label">Address</p>
                <p>{address}</p>
              </div>
            </li>
          </ul>
        </FooterColumn>
      </div>

      <hr />

      {/* Bottom Footer */}
      <div className="public-footer-bottom">
        <div>
          <p>© 2026 Sathyam Agro Mart. All rights reserved.</p>
        </div>

        <div>
          <Link to="/privacy-policy">Privacy Policy</Link>
          <Link to="/terms-of-sale">Terms of Sale</Link>
          <Link to="/refund-policy">Refund Policy</Link>
          <Link to="/about-us">About Us</Link>
          <Link to="/contact-us">Contact Us</Link>
          <span className="public-footer-credit">Designed by cupnsaucer</span>
        </div>

        <SocialLinks className="public-footer-bottom-social" />
      </div>

      {/* Payment Methods. One span per promise, so phones wrap between them
          rather than start a line with "|". The ticks and bars are drawn, not
          read out, and each promise is its own key in the language packs. */}
      <div className="public-payment-strip">
        <p>
          <span><span aria-hidden="true">{'✓ '}</span>100% Secure Payment (UPI, COD, NetBanking)</span>
          <span className="public-payment-sep" aria-hidden="true">{' | '}</span>
          <span><span aria-hidden="true">{'✓ '}</span>Express Delivery</span>
          <span className="public-payment-sep" aria-hidden="true">{' | '}</span>
          <span><span aria-hidden="true">{'✓ '}</span>24/7 Support</span>
        </p>
      </div>
    </footer>
  )
}
