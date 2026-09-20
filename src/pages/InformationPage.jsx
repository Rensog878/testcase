import { Mail, MapPin, Phone, ShieldCheck } from 'lucide-react'
import { useCms } from '../context/CmsContext'

const PAGE_CONTENT = {
  '/privacy-policy': {
    prefix: 'privacy',
    title: 'Privacy Policy',
    eyebrow: 'Your trust matters',
    intro: 'This policy explains how Sathyam Agro Mart collects, uses, and protects information when you shop with us or contact our team.',
    sections: [
      ['Information we collect', 'We collect the details needed to process orders, provide crop advisory support, manage your account, and improve the store. This may include your name, phone number, email address, delivery address, order details, and messages sent to our support team.'],
      ['How we use information', 'Your information is used to fulfil purchases, send order updates, provide relevant agricultural support, prevent misuse, and improve our products and services. We do not sell your personal information.'],
      ['Payments and security', 'Payments are processed through trusted payment partners. We use reasonable technical and organisational safeguards to protect account and order information, but no online service can guarantee absolute security.'],
      ['Your choices', 'You may ask us to review, update, or delete personal information where applicable. Contact support@sathyabio.com for privacy requests.'],
    ],
  },
  '/terms-of-sale': {
    prefix: 'terms',
    title: 'Terms of Sale',
    eyebrow: 'Clear terms for every order',
    intro: 'These terms apply to purchases made through the Sathyam Agro Mart online store.',
    sections: [
      ['Orders and acceptance', 'An order is confirmed after payment or order verification is successfully completed. We may contact you to confirm delivery details or cancel an order if a product is unavailable, incorrectly listed, or affected by suspected misuse.'],
      ['Product use', 'Always read the product label and follow the recommended crop, dosage, storage, and safety instructions. Products must be used only for their intended agricultural purpose and in accordance with applicable local requirements.'],
      ['Pricing and payment', 'Prices, offers, taxes, and delivery charges are shown at checkout. We may correct an obvious pricing or availability error and will contact you if that affects an order.'],
      ['Delivery and support', 'Delivery timelines are estimates and may vary by location, weather, transport conditions, or verification requirements. Contact our support team promptly if an order arrives damaged or incomplete.'],
    ],
  },
  '/refund-policy': {
    prefix: 'refund',
    title: 'Refund Policy',
    eyebrow: 'Simple support when something goes wrong',
    intro: 'We want every order to arrive in good condition and match what you purchased.',
    sections: [
      ['When you can request help', 'Contact us within 48 hours of delivery for damaged, incorrect, missing, or visibly tampered items. Include your order number and clear photographs of the package and product.'],
      ['Review process', 'Our team reviews the order and delivery evidence before approving a replacement, refund, or other resolution. Opened or used products may require additional review for safety and compliance reasons.'],
      ['Refund timing', 'Approved refunds are sent to the original payment method. Bank and payment-provider processing times can vary, so the amount may take several business days to appear.'],
      ['How to contact us', 'Email support@sathyabio.com or call 1800-425-9999 with your order number so we can resolve the issue quickly.'],
    ],
  },
  '/about-us': {
    prefix: 'about',
    title: 'About Sathyam Agro Mart',
    eyebrow: 'Better biology for better harvests',
    intro: 'Sathyam Agro Mart helps farmers find dependable crop protection, bio-stimulant, and soil-health solutions with practical support at every step.',
    sections: [
      ['Built around the farmer', 'Our store brings essential agricultural inputs into one clear, accessible experience. We pair product information with crop-focused guidance so farmers can make confident choices.'],
      ['Responsible innovation', 'We believe productive farming and responsible stewardship belong together. Our range is selected around efficacy, traceability, and the long-term health of farms and soil.'],
      ['Our promise', 'From product discovery to delivery and after-sales support, we aim to be responsive, transparent, and useful to the farming communities we serve.'],
    ],
  },
  '/contact-us': {
    prefix: 'contact',
    title: 'Contact Us',
    eyebrow: 'We are here to help',
    intro: 'Need help choosing a product, tracking an order, or raising a support request? Our team is ready to assist.',
    sections: [
      ['Customer support', 'For orders, returns, and account help, call us during support hours or email our team. Please keep your order number ready for faster assistance.'],
      ['Crop advisory', 'Tell us your crop, location, and the issue you are seeing. Our team can help you find the most relevant product information and next steps.'],
    ],
  },
}

export default function InformationPage({ path }) {
  const { cms } = useCms()
  const content = PAGE_CONTENT[path] || PAGE_CONTENT['/about-us']
  const text = (key, fallback) => typeof cms[key] === 'string' && cms[key].trim() ? cms[key].trim() : fallback
  const pageTitle = text(`${content.prefix}PageTitle`, content.title)
  const pageEyebrow = text(`${content.prefix}PageEyebrow`, content.eyebrow)
  const pageIntro = text(`${content.prefix}PageIntro`, content.intro)
  const isContact = path === '/contact-us'

  return (
    <article className="information-page">
      <div className="information-page-inner">
        <header className="information-page-hero">
          <span className="information-page-eyebrow"><ShieldCheck size={16} aria-hidden="true" /> {pageEyebrow}</span>
          <h1>{pageTitle}</h1>
          <p>{pageIntro}</p>
        </header>

        <div className="information-page-body">
          <div className="information-page-copy">
            {content.sections.map(([heading, body], index) => (
              <section key={heading}>
                <h2>{text(`${content.prefix}Section${index + 1}Title`, heading)}</h2>
                <p>{text(`${content.prefix}Section${index + 1}Text`, body)}</p>
              </section>
            ))}
          </div>

          {isContact && (
            <aside className="information-contact-card">
              <h2>{text('contactCardTitle', 'Reach our team')}</h2>
              <a href={`tel:${text('phone', '1800-425-9999').replace(/[^\d+]/g, '')}`}><Phone size={18} aria-hidden="true" /> {text('phone', '1800-425-9999')}</a>
              <a href={`mailto:${text('email', 'support@sathyabio.com')}`}><Mail size={18} aria-hidden="true" /> {text('email', 'support@sathyabio.com')}</a>
              <p><MapPin size={18} aria-hidden="true" /> {text('address', 'Sathyam Agro Mart, Hyderabad, India')}</p>
            </aside>
          )}
        </div>
      </div>
    </article>
  )
}
