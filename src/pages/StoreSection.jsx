import { Link, useLocation } from 'react-router-dom'

const SECTION_CONTENT = {
  products: {
    title: 'All Products',
    intro: 'Browse crop protection products selected for reliable field performance.',
    links: [
      ['/products?category=Fungicide', 'Bio-Fungicides & Crop Care', 'Field-tested bio-protection solutions'],
      ['/categories', 'Shop by Category', 'Find products by agricultural formulation'],
      ['/crops', 'Shop by Crop', 'Choose products customized for your crop']
    ]
  },
  categories: {
    title: 'Categories',
    intro: 'Choose the right crop-care formulation for your farm.',
    links: [
      ['/products?category=Fungicide', 'Bio-Fungicides', 'Protect crops from fungal disease'],
      ['/products?category=Insecticide', 'Insecticides', 'Manage common field pests'],
      ['/products?category=Herbicide', 'Herbicides', 'Control weeds with confidence'],
      ['/products?category=Bio-Stimulant', 'Bio-Stimulants', 'Support healthier plant growth']
    ]
  },
  crops: {
    title: 'Shop by Crop',
    intro: 'Explore crop-focused care plans and products.',
    links: [
      ['/products?crop=Paddy%20%2F%20Rice', 'Paddy / Rice', 'Seasonal protection for rice fields'],
      ['/products?crop=Cotton', 'Cotton', 'Protection through the cotton cycle'],
      ['/products?crop=Sugarcane', 'Sugarcane', 'Support strong, healthy cane'],
      ['/products?crop=Vegetables', 'Vegetables', 'Practical protection for vegetables']
    ]
  },
  brands: {
    title: 'Brands',
    intro: 'Discover Sathyam Bio products and trusted crop-care solutions.',
    links: [
      ['/products', 'Sathyam Bio Formulations', 'Bio-certified crop protection'],
      ['/products?category=Bio-Stimulant', 'Bio-Stimulants & Nutrition', 'Compare available formulations']
    ]
  },
}

export default function StoreSection({ type }) {
  const location = useLocation()
  const section = SECTION_CONTENT[type] || SECTION_CONTENT.products

  return (
    <div className="store-section-page animate-fade-in">
      <div className="store-section-heading">
        <span className="badge badge-green">Sathyam Bio Store</span>
        <h1>{section.title}</h1>
        <p>{section.intro}</p>
      </div>
      <div className="store-section-grid">
        {section.links.map(([href, title, description]) => (
          <Link className="store-section-card" to={href} key={href + title}>
            <strong>{title}</strong>
            <span>{description}</span>
            <small>Open page</small>
          </Link>
        ))}
      </div>
      {location.search && <p className="store-section-filter">Showing options for {new URLSearchParams(location.search).toString().replaceAll('=', ': ').replaceAll('&', ' | ')}</p>}
    </div>
  )
}
