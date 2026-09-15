import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import {
  Plus, Edit2, Trash2, Check, X, Search, User, Filter,
  ArrowUpDown, RefreshCw, Sparkles, Tag, ShieldAlert, BarChart3
} from 'lucide-react'

const DEFAULT_CATEGORIES = ['Fungicide', 'Insecticide', 'Herbicide', 'Bio-Stimulant', 'Fertilizer', 'Nematicide', 'Adjuvant']

// Tells open storefront tabs (src/storefront/Storefront.jsx listens on the same channel) to reload products.
const notifyStorefront = () => {
  if (!('BroadcastChannel' in window)) return
  const channel = new BroadcastChannel('sathya_catalog')
  channel.postMessage('products-changed')
  channel.close()
}

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [userFilter, setUserFilter] = useState('all')
  const [sortBy, setSortBy] = useState('user') // 'user', 'price_asc', 'price_desc', 'stock', 'default'
  const [showDemandSummary, setShowDemandSummary] = useState(false)
  const [catalogOptions, setCatalogOptions] = useState({ categories: DEFAULT_CATEGORIES, crops: [], storageBatches: [] })
  const [newCategory, setNewCategory] = useState('')
  const [newCrop, setNewCrop] = useState('')
  const [newStorageBatch, setNewStorageBatch] = useState('')

  const [isEditing, setIsEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    category: 'Fungicide',
    price: '',
    mrp: '',
    stock: '',
    badge: '',
    crops: '',
    description: '',
    online: true,
    targetUserId: 'all',
    activeIngredient: '',
    dosage: '250g - 500g per Acre',
    packSizes: '250g, 500g, 1kg',
    images: '',
    howToUse: '',
    whenToUse: '',
    relatedBlogs: '',
    relatedProductIds: '',
    reviewsEnabled: false,
    emoji: '🌿'
  })

  useEffect(() => {
    fetchProducts()
    fetchUsersList()
    fetchCatalogOptions()
  }, [category, sortBy])

  const fetchCatalogOptions = async () => {
    try {
      const { data } = await axios.get('/api/catalog-options')
      if (data.success) setCatalogOptions(data.data)
    } catch (err) {
      console.error('Error loading catalog options:', err)
    }
  }

  const addFormOption = (field, value, setValue) => {
    const cleanValue = value.trim()
    if (!cleanValue) return
    setForm(current => ({ ...current, [field]: field === 'crops' || field === 'packSizes' ? `${current[field] ? `${current[field]}, ` : ''}${cleanValue}` : cleanValue }))
    setValue('')
  }

  const handlePhotoUpload = async (event) => {
    const files = Array.from(event.target.files || [])
    const encodedPhotos = await Promise.all(files.map(file => new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.readAsDataURL(file)
    })))
    setForm(current => ({ ...current, images: [current.images, ...encodedPhotos].filter(Boolean).join('\n') }))
    event.target.value = ''
  }

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/products', {
        params: {
          category,
          sortBy,
          search: search.trim() || undefined
        }
      })
      if (data.success) {
        setProducts(data.data)
      }
    } catch (err) {
      console.error('Error fetching products:', err)
      toast.error('Could not load products from database')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsersList = async () => {
    try {
      const { data } = await axios.get('/api/admin/users')
      if (data.success) {
        setUsers(data.data)
      }
    } catch (err) {
      console.error('Error loading users for assignment:', err)
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    fetchProducts()
  }

  // Filter products by targeted user if selected
  const filtered = products.filter(p => {
    if (userFilter === 'all') return true
    if (userFilter === 'general') return !p.targetUserId || p.targetUserId === 'all'
    return p.targetUserId === userFilter
  })

  const openAddModal = () => {
    setIsEditing(null)
    setForm({
      name: '',
      category: 'Fungicide',
      price: '',
      mrp: '',
      stock: 100,
      badge: 'Best Seller',
      crops: 'Paddy / Rice, Wheat',
      description: '',
      online: true,
      targetUserId: userFilter !== 'all' && userFilter !== 'general' ? userFilter : 'all',
      activeIngredient: '100% Bio-Active Formulation',
      dosage: '250g per Acre',
      packSizes: '250g, 500g, 1kg',
      images: '',
      howToUse: '',
      whenToUse: '',
      relatedBlogs: '',
      relatedProductIds: '',
      reviewsEnabled: false,
      emoji: '🌿'
    })
    setModalOpen(true)
  }

  const openEditModal = (p) => {
    setIsEditing(p.id)
    setForm({
      name: p.name || '',
      category: p.category || 'Fungicide',
      price: p.price || '',
      mrp: p.originalPrice || p.mrp || '',
      stock: p.stock !== undefined ? p.stock : '',
      badge: p.badge || '',
      crops: Array.isArray(p.crops) ? p.crops.join(', ') : (p.crops || ''),
      description: p.description || '',
      online: p.online !== false,
      targetUserId: p.targetUserId || 'all',
      activeIngredient: p.activeIngredient || '',
      dosage: p.dosage || '250g per Acre',
      packSizes: Array.isArray(p.packSizes) ? p.packSizes.join(', ') : (p.packSizes || '500g, 1kg'),
      images: Array.isArray(p.images) ? p.images.join('\n') : (p.image || ''),
      howToUse: p.howToUse || '',
      whenToUse: p.whenToUse || '',
      relatedBlogs: Array.isArray(p.relatedBlogs) ? p.relatedBlogs.map(blog => `${blog.title || ''} | ${blog.url || ''}`).join('\n') : '',
      relatedProductIds: Array.isArray(p.relatedProductIds) ? p.relatedProductIds.join(', ') : '',
      reviewsEnabled: p.reviewsEnabled === true,
      emoji: p.emoji || '🌿'
    })
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name || form.price === '' || form.stock === '') {
      toast.error('Please fill required fields (Name, Price, Stock)')
      return
    }

    const images = form.images.split(/\n|,/).map(value => value.trim()).filter(Boolean)
    if (images.length === 0) {
      toast.error('Add at least one product photo URL or asset path')
      return
    }

    const payload = {
      ...form,
      price: Number(form.price),
      originalPrice: Number(form.mrp || form.price * 1.2),
      stock: Number(form.stock),
      crops: form.crops.split(',').map(s => s.trim()).filter(Boolean),
      packSizes: form.packSizes.split(',').map(s => s.trim()).filter(Boolean),
      images,
      image: images[0],
      howToUse: form.howToUse.trim(),
      whenToUse: form.whenToUse.trim(),
      relatedBlogs: form.relatedBlogs.split('\n').map(line => {
        const [title, url] = line.split('|').map(value => value.trim())
        return title && url ? { title, url } : null
      }).filter(Boolean),
      relatedProductIds: form.relatedProductIds.split(',').map(value => value.trim()).filter(Boolean),
      reviewsEnabled: form.reviewsEnabled
    }

    try {
      if (isEditing) {
        const { data } = await axios.put(`/api/products/${isEditing}`, payload)
        if (data.success) {
          toast.success(data.message || 'Product updated successfully in DB! 🌿')
          notifyStorefront()
          fetchProducts()
          fetchCatalogOptions()
          setModalOpen(false)
        }
      } else {
        const { data } = await axios.post('/api/products', payload)
        if (data.success) {
          toast.success(data.message || 'New product added and live on customer storefront! ✨')
          notifyStorefront()
          fetchProducts()
          fetchCatalogOptions()
          setModalOpen(false)
        }
      }
    } catch (err) {
      console.error('Save product error:', err)
      const msg = err.response?.data?.message || 'Error saving product'
      toast.error(msg)
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from store database?`)) {
      return
    }

    try {
      const { data } = await axios.delete(`/api/products/${id}`)
      if (data.success) {
        toast.success(`"${name}" removed from catalog and database`)
        notifyStorefront()
        fetchProducts()
      }
    } catch (err) {
      toast.error('Failed to delete product')
    }
  }

  // Count user targeted products
  const targetedCount = products.filter(p => p.targetUserId && p.targetUserId !== 'all').length
  const generalCount = products.length - targetedCount

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            🌿 Products Master
          </h1>
          <p>Full control over store catalog, real-time customer reflections, and user-based targeting & sorting</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-outline"
            onClick={() => setShowDemandSummary(!showDemandSummary)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <BarChart3 size={15} /> {showDemandSummary ? 'Hide User Demand' : 'User Allocation & Demand'}
          </button>
          <button className="btn btn-primary" onClick={openAddModal} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> Add New Product
          </button>
        </div>
      </div>

      {/* USER DEMAND & SORTING INSIGHTS ACCORDION */}
      {showDemandSummary && (
        <div className="card animate-fade-in" style={{
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)',
          border: '1px solid rgba(74, 222, 128, 0.3)',
          borderRadius: '12px', padding: '18px 20px', marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--brand-400)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Sparkles size={16} /> User Demand & Targeted Inventory Allocations
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Based on sorting by registered user farm needs
            </span>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            Admin can sort by user or filter specifically to decide which high-yield bio products or bulk packages to add for specific farmers:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            {users.filter(u => u.role === 'farmer').map(u => {
              const assigned = products.filter(p => p.targetUserId === u.id)
              return (
                <div key={u.id} style={{
                  background: 'rgba(0, 0, 0, 0.35)', padding: '12px 14px', borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>{u.name}</div>
                    <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>🌾 {u.crop || 'Paddy'}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {u.acreage} Acres • {u.village || 'Farm'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--brand-400)' }}>
                      {assigned.length > 0 ? `🎯 ${assigned.length} Targeted Products` : '⚠️ No custom products yet'}
                    </span>
                    <button
                      onClick={() => {
                        setUserFilter(u.id)
                        setShowDemandSummary(false)
                      }}
                      style={{ background: 'transparent', border: 'none', color: '#60a5fa', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Filter & View
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* FILTER & USER SORTING BAR */}
      <div className="filter-bar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '20px' }}>
        {/* Search */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flex: 1, minWidth: '240px' }}>
          <div className="search-box" style={{ width: '100%', position: 'relative' }}>
            <Search size={16} className="search-icon" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              style={{ width: '100%', paddingLeft: '38px' }}
              placeholder="Search products by chemical, crop, or name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </form>

        {/* Filter by Category */}
        <select
          className="filter-select"
          value={category}
          onChange={e => setCategory(e.target.value)}
          title="Filter by Category"
        >
          {['All', ...catalogOptions.categories].map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
        </select>

        {/* Filter by Target User */}
        <select
          className="filter-select"
          value={userFilter}
          onChange={e => setUserFilter(e.target.value)}
          title="Filter by User Assignment"
          style={{ minWidth: '180px', borderColor: userFilter !== 'all' ? 'var(--brand-400)' : undefined }}
        >
          <option value="all">Filter: All Products ({products.length})</option>
          <option value="general">🌐 General Catalog ({generalCount})</option>
          <optgroup label="Targeted Farmers">
            {users.filter(u => u.role === 'farmer').map(u => (
              <option key={u.id} value={u.id}>
                👤 {u.name} ({u.crop || 'Farmer'})
              </option>
            ))}
          </optgroup>
        </select>

        {/* Sort Controls (including Sort by User) */}
        <select
          className="filter-select"
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          title="Sort catalog"
        >
          <option value="user">Sort: By Target User 👥</option>
          <option value="default">Sort: Default Catalog Order</option>
          <option value="price_asc">Sort: Price (Low to High)</option>
          <option value="price_desc">Sort: Price (High to Low)</option>
          <option value="stock">Sort: Stock Quantity</option>
        </select>

        <button className="btn btn-outline" onClick={fetchProducts} title="Refresh catalog from DB">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* PRODUCTS TABLE */}
      <div className="card" style={{ background: 'var(--dark-800)', borderRadius: '12px', border: '1px solid var(--dark-700)', overflow: 'hidden' }}>
        <div className="table-wrap">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--dark-700)' }}>
                <th style={{ padding: '14px 16px' }}>Product</th>
                <th style={{ padding: '14px 16px' }}>Category</th>
                <th style={{ padding: '14px 16px' }}>Price / MRP</th>
                <th style={{ padding: '14px 16px' }}>Stock</th>
                <th style={{ padding: '14px 16px' }}>Targeted User (Sorting)</th>
                <th style={{ padding: '14px 16px' }}>Suitable Crops</th>
                <th style={{ padding: '14px 16px' }}>Badge</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Loading products from database...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No products found. Adjust filters or click "Add New Product" to create one.
                  </td>
                </tr>
              ) : (
                filtered.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--dark-700)' }}>
                    {/* Product Name & Description */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '8px',
                          background: 'rgba(74, 222, 128, 0.1)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem'
                        }}>
                          {p.emoji || '🌿'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p.tagline || p.description}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td style={{ padding: '14px 16px' }}>
                      <span className="badge badge-blue">{p.category}</span>
                    </td>

                    {/* Price & MRP */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--brand-400)' }}>₹{p.price}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>₹{p.originalPrice || p.mrp}</div>
                    </td>

                    {/* Stock Status */}
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge ${p.stock > 50 ? 'badge-green' : p.stock > 0 ? 'badge-yellow' : 'badge-red'}`}>
                        {p.stock > 0 ? `${p.stock} units` : 'Out of stock'}
                      </span>
                    </td>

                    {/* Targeted User / Sorting */}
                    <td style={{ padding: '14px 16px' }}>
                      {p.targetUserId && p.targetUserId !== 'all' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>
                            🎯 {p.targetUserName || p.targetUserId}
                          </span>
                          {p.targetUserPhone && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>📞 {p.targetUserPhone}</span>
                          )}
                        </div>
                      ) : (
                        <span className="badge" style={{ fontSize: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(96, 165, 250, 0.3)' }}>
                          🌐 General Public
                        </span>
                      )}
                    </td>

                    {/* Crops */}
                    <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {Array.isArray(p.crops) ? p.crops.slice(0, 2).join(', ') + (p.crops.length > 2 ? ` +${p.crops.length - 2}` : '') : p.crops}
                    </td>

                    {/* Badge */}
                    <td style={{ padding: '14px 16px' }}>
                      {p.badge && (
                        <span className={`badge ${p.badge.toLowerCase().includes('best') ? 'badge-yellow' : p.badge.toLowerCase().includes('organic') ? 'badge-green' : 'badge-blue'}`}>
                          {p.badge}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                          onClick={() => openEditModal(p)}
                          title="Edit product"
                        >
                          <Edit2 size={13} /> Edit
                        </button>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '6px 10px', fontSize: '0.75rem', color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.3)' }}
                          onClick={() => handleDelete(p.id, p.name)}
                          title="Delete product"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT PRODUCT MODAL */}
      {modalOpen && (
        <div className="modal-backdrop product-modal" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
        }}>
          <div className="modal-content product-modal-content" style={{
            background: 'var(--dark-800)', border: '1px solid var(--dark-700)',
            borderRadius: '16px', width: '100%', maxWidth: '1180px', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', padding: '28px 32px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isEditing ? <Edit2 size={18} color="var(--brand-400)" /> : <Plus size={18} color="var(--brand-400)" />}
                {isEditing ? 'Edit Product in Catalog' : 'Add New Product to Store Catalog'}
              </h2>
              <button onClick={() => setModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form className="product-modal-form" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="product-form-full">
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Product Title *</label>
                <input
                  required
                  placeholder="e.g. Sathya Bio BlastShield 75 WP"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--dark-900)', border: '1px solid var(--dark-700)', color: '#fff' }}
                />
              </div>

              {/* TARGET USER / SORTING BY USER */}
              <div className="product-form-full product-target-user" style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '2px solid #111827' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#000', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <User size={15} /> Target / Assign To User (Sorting by User)
                </label>
                <p style={{ fontSize: '0.74rem', color: '#111827', marginBottom: '8px' }}>
                  Assign this product to a specific user to personalize their catalog & prioritize it at the top of their store page:
                </p>
                <select
                  value={form.targetUserId}
                  onChange={e => setForm({ ...form, targetUserId: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#fff', border: '1px solid #111827', color: '#000', fontWeight: 700 }}
                >
                  <option value="all">🌐 All Users (General Public E-Commerce)</option>
                  <optgroup label="Assign to Registered Farmer">
                    {users.filter(u => u.role === 'farmer').map(u => (
                      <option key={u.id} value={u.id}>
                        👤 {u.name} — {u.phone} ({u.crop || 'Farmer'}, {u.village || 'Tamil Nadu'})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Assign to Staff / Operations">
                    {users.filter(u => u.role !== 'farmer').map(u => (
                      <option key={u.id} value={u.id}>
                        🛡️ {u.name} ({u.role})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="product-form-full product-visibility-panel">
                <div>
                  <label className="product-visibility-title">Product visibility</label>
                  <p>Choose where this product can be used.</p>
                </div>
                <div className="product-visibility-options">
                  <label className={`product-visibility-option ${form.online ? 'active' : ''}`}>
                    <input type="radio" name="product-visibility" checked={form.online} onChange={() => setForm({ ...form, online: true })} />
                    <strong>Online</strong>
                    <span>Visible on the customer website</span>
                  </label>
                  <label className={`product-visibility-option ${!form.online ? 'active offline' : ''}`}>
                    <input type="radio" name="product-visibility" checked={!form.online} onChange={() => setForm({ ...form, online: false })} />
                    <strong>Offline</strong>
                    <span>Billing portal only, hidden from website</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--dark-900)', border: '1px solid var(--dark-700)', color: '#fff' }}
                  >
                    {catalogOptions.categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="product-option-adder">
                    <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="New category" />
                    <button type="button" onClick={() => addFormOption('category', newCategory, setNewCategory)}>Add</button>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Store Badge</label>
                  <select
                    value={form.badge}
                    onChange={e => setForm({ ...form, badge: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--dark-900)', border: '1px solid var(--dark-700)', color: 'var(--text-primary)' }}
                  >
                    <option value="">None</option>
                    <option value="Best Seller">Best Seller</option>
                    <option value="100% Organic">100% Organic</option>
                    <option value="Top Rated">Top Rated</option>
                    <option value="Expert Choice">Expert Choice</option>
                    <option value="New Launch">New Launch</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="680"
                    value={form.price}
                    onChange={e => setForm({ ...form, price: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--dark-900)', border: '1px solid var(--dark-700)', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>MRP (₹)</label>
                  <input
                    type="number"
                    placeholder="850"
                    value={form.mrp}
                    onChange={e => setForm({ ...form, mrp: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--dark-900)', border: '1px solid var(--dark-700)', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Stock Qty *</label>
                  <input
                    type="number"
                    required
                    placeholder="100"
                    value={form.stock}
                    onChange={e => setForm({ ...form, stock: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--dark-900)', border: '1px solid var(--dark-700)', color: '#fff' }}
                  />
                </div>
              </div>

              <div className="product-form-full">
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Suitable Crops (comma separated)</label>
                <input
                  placeholder="e.g. Paddy/Rice, Wheat, Cotton, Tomato"
                  value={form.crops}
                  onChange={e => setForm({ ...form, crops: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--dark-900)', border: '1px solid var(--dark-700)', color: 'var(--text-primary)' }}
                />
                <div className="product-option-adder">
                  <input value={newCrop} onChange={e => setNewCrop(e.target.value)} placeholder="Add a custom crop" />
                  <button type="button" onClick={() => addFormOption('crops', newCrop, setNewCrop)}>Add crop</button>
                </div>
              </div>

              <div className="product-form-full">
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Storage Batches / Pack Sizes</label>
                <input
                  placeholder="e.g. 250g, 500g, 1kg"
                  value={form.packSizes}
                  onChange={e => setForm({ ...form, packSizes: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--dark-900)', border: '1px solid var(--dark-700)', color: 'var(--text-primary)' }}
                />
                <div className="product-option-adder">
                  <select value="" onChange={e => addFormOption('packSizes', e.target.value, setNewStorageBatch)}>
                    <option value="">Choose saved batch size</option>
                    {catalogOptions.storageBatches.map(batch => <option key={batch} value={batch}>{batch}</option>)}
                  </select>
                  <input value={newStorageBatch} onChange={e => setNewStorageBatch(e.target.value)} placeholder="New batch size" />
                  <button type="button" onClick={() => addFormOption('packSizes', newStorageBatch, setNewStorageBatch)}>Add batch</button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Active Ingredient & Dosage</label>
                <div className="product-form-full" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                  <input
                    placeholder="Active Chemical/Bio ingredient"
                    value={form.activeIngredient}
                    onChange={e => setForm({ ...form, activeIngredient: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--dark-900)', border: '1px solid var(--dark-700)', color: '#fff' }}
                  />
                  <input
                    placeholder="Dosage e.g. 250g per Acre"
                    value={form.dosage}
                    onChange={e => setForm({ ...form, dosage: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--dark-900)', border: '1px solid var(--dark-700)', color: '#fff' }}
                  />
                </div>
              </div>

              <div className="product-form-full">
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Product Description</label>
                <textarea
                  rows="3"
                  placeholder="Key farmer benefits, disease target, application instructions..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--dark-900)', border: '1px solid var(--dark-700)', color: '#fff', resize: 'vertical' }}
                />
              </div>

              <div className="product-detail-fields product-form-full">
                <label>Product Photos * <span>(one URL or asset path per line)</span></label>
                <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} />
                <textarea rows="3" required value={form.images} onChange={e => setForm({ ...form, images: e.target.value })} placeholder="/assets/product-front.jpg&#10;/assets/product-label.jpg" />
                <small>Use at least one photo. Select multiple files or add URLs/asset paths for the detail-page gallery and hover zoom.</small>

                <div className="product-detail-grid">
                  <div>
                    <label>How to use</label>
                    <textarea rows="4" value={form.howToUse} onChange={e => setForm({ ...form, howToUse: e.target.value })} placeholder="Application method, dosage, dilution and safety steps" />
                  </div>
                  <div>
                    <label>When to use</label>
                    <textarea rows="4" value={form.whenToUse} onChange={e => setForm({ ...form, whenToUse: e.target.value })} placeholder="Crop stage, symptoms, weather or timing guidance" />
                  </div>
                </div>

                <label>Related blogs <span>(one per line: Blog title | https://example.com/blog)</span></label>
                <textarea rows="3" value={form.relatedBlogs} onChange={e => setForm({ ...form, relatedBlogs: e.target.value })} placeholder="Paddy blast prevention | /blogs/paddy-blast-prevention" />

                <label>Related product IDs <span>(comma separated)</span></label>
                <input value={form.relatedProductIds} onChange={e => setForm({ ...form, relatedProductIds: e.target.value })} placeholder="sb-1234, sb-5678" />

                <label className="review-toggle">
                  <input type="checkbox" checked={form.reviewsEnabled} onChange={e => setForm({ ...form, reviewsEnabled: e.target.checked })} />
                  Enable verified customer reviews for this product
                </label>
                <small>Ratings stay hidden until genuine review records are submitted. No seeded or random reviews are shown.</small>
              </div>

              <div className="product-form-full" style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setModalOpen(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  {isEditing ? 'Save Product Changes' : 'Save & Publish to Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
