import { useState, useEffect } from 'react'
import { Star, ShoppingCart, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import axios from 'axios'

export default function ProductCatalog({ onAddToCart = () => {} }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCrop, setSelectedCrop] = useState('ALL')
  const [selectedDisease, setSelectedDisease] = useState('ALL')

  useEffect(() => {
    let cancelled = false
    const fetchProducts = async () => {
      try {
        const { data } = await axios.get('/api/products?onlineOnly=true')
        if (!cancelled && data.success) {
          setProducts(data.data || [])
        }
      } catch (err) {
        console.error('Error fetching catalog products:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchProducts()
    return () => { cancelled = true }
  }, [])

  const categoryColors = {
    'FUNGICIDE': 'bg-purple-100 text-purple-800',
    'INSECTICIDE': 'bg-red-100 text-red-800',
    'BIO-STIMULANT': 'bg-green-100 text-green-800',
    'HERBICIDE': 'bg-yellow-100 text-yellow-800'
  }

  const filtered = products.filter(p => {
    if (selectedCrop !== 'ALL' && (!p.crops || !p.crops.some(c => c.toLowerCase().includes(selectedCrop.toLowerCase())))) {
      return false
    }
    if (selectedDisease !== 'ALL' && (!p.diseases || !p.diseases.some(d => d.toLowerCase().includes(selectedDisease.toLowerCase())))) {
      return false
    }
    return true
  })

  return (
    <section id="catalog" className="py-16 md:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Agro Pesticides Store Catalog
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Filter chemicals by target crop, plant disease, or product category
          </p>

          {/* Simple Filters */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <select
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
            >
              <option value="ALL">ALL CROPS</option>
              <option value="Paddy">Paddy / Rice</option>
              <option value="Cotton">Cotton</option>
              <option value="Tomato">Tomato</option>
              <option value="Wheat">Wheat</option>
              <option value="Chilli">Chilli</option>
            </select>
            <select
              value={selectedDisease}
              onChange={(e) => setSelectedDisease(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
            >
              <option value="ALL">ALL DISEASES / PESTS</option>
              <option value="Blast">Blast</option>
              <option value="Blight">Blight</option>
              <option value="Whitefly">Whitefly</option>
              <option value="Aphids">Aphids</option>
              <option value="Thrips">Thrips</option>
            </select>
            <button
              onClick={() => { setSelectedCrop('ALL'); setSelectedDisease('ALL'); }}
              className="px-6 py-2 text-green-600 border-2 border-green-600 rounded-lg hover:bg-green-50 font-semibold transition"
            >
              Reset All Filters
            </button>
          </div>

          <p className="text-gray-600 font-semibold">
            {loading ? 'Loading real products from database...' : `Showing ${filtered.length} of ${products.length} products`}
          </p>
        </div>

        {/* Empty state when no products exist yet */}
        {!loading && products.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center max-w-xl mx-auto shadow-sm border border-gray-100">
            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              🌿
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Products in Catalog Yet</h3>
            <p className="text-gray-600 mb-6">
              Only real products added by the administrator from the admin panel are displayed here. All demo products have been removed.
            </p>
            <Link
              to="/admin/products"
              className="inline-flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg transition shadow"
            >
              <span>Go to Admin Panel to Add Products</span>
            </Link>
          </div>
        )}

        {/* Products Grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid md:grid-cols-4 gap-6">
            {filtered.map((product) => {
              const packSizes = Array.isArray(product.packSizes) ? product.packSizes : ['Standard Pack']
              const catKey = (product.category || 'AGRO').toUpperCase()
              return (
                <div key={product.id || product._id} className="bg-white rounded-xl overflow-hidden shadow hover:shadow-lg transition group">
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden bg-gray-200">
                    <img
                      src={product.image || product.images?.[0] || './assets/p1.png'}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                    />

                    {/* Discount Badge */}
                    {product.discount && (
                      <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                        {product.discount}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold mb-2 ${categoryColors[catKey] || 'bg-gray-100 text-gray-800'}`}>
                      {product.category || 'Agro Solution'}
                    </span>

                    <h3 className="font-bold text-gray-900 text-sm mb-2 line-clamp-2">
                      <Link to={`/product/${product.id || product._id}`} className="hover:text-green-700">
                        {product.name}
                      </Link>
                    </h3>

                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                      {product.description}
                    </p>

                    {/* Rating */}
                    <div className="flex items-center space-x-1 mb-3">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            className={i < Math.floor(product.rating || 5) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-600">
                        {product.rating || 5.0} ({product.reviewsCount || 0})
                      </span>
                    </div>

                    {/* Price */}
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="text-lg font-bold text-gray-900">₹{Number(product.price).toLocaleString()}</span>
                      {product.originalPrice > product.price && (
                        <span className="text-sm text-gray-500 line-through">₹{Number(product.originalPrice).toLocaleString()}</span>
                      )}
                    </div>

                    {/* Variants */}
                    <div className="flex gap-2 mb-4 flex-wrap">
                      {packSizes.map((variant) => (
                        <span
                          key={variant}
                          className="text-xs px-2 py-1 border border-gray-300 rounded text-gray-600"
                        >
                          {variant}
                        </span>
                      ))}
                    </div>

                    {/* Add to Cart / View */}
                    <div className="flex gap-2">
                      <Link
                        to={`/product/${product.id || product._id}`}
                        className="flex-1 bg-green-50 text-green-700 hover:bg-green-100 text-center font-semibold py-2 rounded-lg text-xs flex items-center justify-center transition"
                      >
                        View Details
                      </Link>
                      <button
                        onClick={() => onAddToCart(product)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg flex items-center justify-center space-x-1 transition text-xs"
                      >
                        <ShoppingCart size={14} />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
