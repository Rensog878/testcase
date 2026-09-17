import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import {
  Plus, Edit2, Trash2, Check, X, Search, User, Filter,
  ArrowUpDown, RefreshCw, Sparkles, Tag, ShieldAlert, BarChart3,
  IndianRupee, Sprout, Package, Image as ImageIcon, Info
} from 'lucide-react'
import { parseImageList } from '../../shared/productImages.js'

const PFORM_SECTIONS = [
  { id: 'pform-basic', label: 'Basic details', hint: 'Title, category, badge' },
  { id: 'pform-pricing', label: 'Pricing & stock', hint: 'Price, MRP, quantity' },
  { id: 'pform-targeting', label: 'Crops & packs', hint: 'Crops, pests, sizes' },
  { id: 'pform-media', label: 'Photos & copy', hint: 'Gallery, description' },
  { id: 'pform-visibility', label: 'Visibility', hint: 'Audience, online' },
  { id: 'pform-advanced', label: 'Advanced', hint: 'Usage, related, reviews' },
]

const DEFAULT_CATEGORIES = ['Fungicide', 'Insecticide', 'Herbicide', 'Bio-Stimulant', 'Fertilizer', 'Nematicide', 'Adjuvant', 'Seeds', 'Equipments', 'Animal Husbandry']

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
  const [catalogOptions, setCatalogOptions] = useState({ categories: DEFAULT_CATEGORIES, crops: [], storageBatches: [], diseases: [] })
  const [newCategory, setNewCategory] = useState('')
  const [newCrop, setNewCrop] = useState('')
  const [newDisease, setNewDisease] = useState('')
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
    diseases: '',
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
    setForm(current => ({ ...current, [field]: field === 'crops' || field === 'diseases' || field === 'packSizes' ? `${current[field] ? `${current[field]}, ` : ''}${cleanValue}` : cleanValue }))
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

  // Display-only helpers for the product form (section rail, required meter,
  // discount readout, photo previews). They read form state; saving is unchanged.
  const [activeSection, setActiveSection] = useState(PFORM_SECTIONS[0].id)
  const scrollToSection = (id) => {
    const el = document.getElementById(id)
    if (!el) return
    if (el.tagName === 'DETAILS') el.open = true
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveSection(id)
  }
  const handleFormScroll = (event) => {
    const body = event.currentTarget
    const top = body.getBoundingClientRect().top + 24
    let current = PFORM_SECTIONS[0].id
    for (const s of PFORM_SECTIONS) {
      const el = document.getElementById(s.id)
      if (el && el.getBoundingClientRect().top <= top) current = s.id
    }
    if (body.scrollTop + body.clientHeight >= body.scrollHeight - 2) current = PFORM_SECTIONS[PFORM_SECTIONS.length - 1].id
    if (current !== activeSection) setActiveSection(current)
  }
  // On tablet/phone the rail is a horizontal strip: keep the active step in view.
  useEffect(() => {
    const button = document.querySelector('.pform-rail > button.active')
    const rail = button?.parentElement
    if (rail && rail.scrollWidth > rail.clientWidth) {
      rail.scrollTo({ left: Math.max(0, button.offsetLeft - (rail.clientWidth - button.offsetWidth) / 2), behavior: 'smooth' })
    }
  }, [activeSection])
  const removeListItem = (field, item) => {
    setForm(current => ({ ...current, [field]: current[field].split(',').map(s => s.trim()).filter(s => s && s !== item).join(', ') }))
  }
  const photoList = parseImageList(form.images)
  const requiredChecks = [
    { label: 'Product title', done: Boolean(String(form.name).trim()) },
    { label: 'Selling price', done: form.price !== '' },
    { label: 'Stock quantity', done: form.stock !== '' },
    { label: 'At least one photo', done: photoList.length > 0 },
  ]
  const requiredDone = requiredChecks.filter(c => c.done).length
  const discountPercent = Number(form.mrp) > Number(form.price) && Number(form.price) > 0
    ? Math.round((1 - Number(form.price) / Number(form.mrp)) * 100)
    : 0

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
      diseases: '',
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
      diseases: Array.isArray(p.diseases) ? p.diseases.join(', ') : (p.diseases || ''),
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

    const images = parseImageList(form.images)
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
      diseases: form.diseases.split(',').map(s => s.trim()).filter(Boolean),
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
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(2px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
        }}>
          <div className="pform-shell">
            <div className="pform-header">
              <div className="pform-header-main">
                <span className="pform-header-icon">{isEditing ? <Edit2 size={17} /> : <Plus size={18} />}</span>
                <div>
                  <h2>{isEditing ? 'Edit Product' : 'Add New Product'}</h2>
                  <p>{isEditing ? 'Update catalog details — changes go live immediately.' : 'Fields marked * are required. Everything else can be filled in later.'}</p>
                </div>
              </div>
              <span className={`pform-status ${form.online ? '' : 'offline'}`}>
                <i aria-hidden="true" />{form.online ? 'Online on store' : 'Billing only'}
              </span>
              <button type="button" className="pform-close" onClick={() => setModalOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} id="product-form">
              <div className="pform-frame">
                {/* Section rail: desktop only (hidden by CSS below 1025px) */}
                <nav className="pform-rail" aria-label="Form sections">
                  {PFORM_SECTIONS.map((s, index) => (
                    <button
                      key={s.id}
                      type="button"
                      className={activeSection === s.id ? 'active' : ''}
                      onClick={() => scrollToSection(s.id)}
                    >
                      <span className="pform-rail-num">{index + 1}</span>
                      <span className="pform-rail-text">
                        <strong>{s.label}</strong>
                        <small>{s.hint}</small>
                      </span>
                    </button>
                  ))}
                  <div className="pform-rail-progress">
                    <div className="pform-rail-progress-head">
                      <span>Required</span>
                      <strong>{requiredDone}/{requiredChecks.length}</strong>
                    </div>
                    <div className="pform-meter"><i style={{ width: `${(requiredDone / requiredChecks.length) * 100}%` }} /></div>
                    <ul>
                      {requiredChecks.map(c => (
                        <li key={c.label} className={c.done ? 'done' : ''}>
                          <Check size={12} aria-hidden="true" />{c.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                </nav>

              <div className="pform-body" onScroll={handleFormScroll}>

                {/* BASIC DETAILS */}
                <section className="pform-section" id="pform-basic">
                  <div className="pform-section-head">
                    <span className="pform-section-icon"><Tag size={15} /></span>
                    <div>
                      <h3>Basic Details</h3>
                      <span className="pform-section-sub">Name, category and the badge shoppers see on the card</span>
                    </div>
                  </div>
                  <div className="pform-field">
                    <label>Product Title *</label>
                    <input
                      required
                      placeholder="e.g. Sathyam Bio BlastShield 75 WP"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="pform-field pform-grid-2">
                    <div>
                      <label>Category</label>
                      <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                        {catalogOptions.categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <div className="pform-adder">
                        <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="New category" />
                        <button type="button" onClick={() => addFormOption('category', newCategory, setNewCategory)}><Plus size={14} className="pform-adder-icon" />Add</button>
                      </div>
                    </div>
                    <div>
                      <label>Store Badge</label>
                      <select value={form.badge} onChange={e => setForm({ ...form, badge: e.target.value })}>
                        <option value="">None</option>
                        <option value="Best Seller">Best Seller</option>
                        <option value="100% Organic">100% Organic</option>
                        <option value="Top Rated">Top Rated</option>
                        <option value="Expert Choice">Expert Choice</option>
                        <option value="New Launch">New Launch</option>
                      </select>
                      <p className="pform-hint pform-badge-preview">
                        Card preview: {form.badge ? <span className="pform-chip">{form.badge}</span> : <em>no badge</em>}
                      </p>
                    </div>
                  </div>
                </section>

                {/* PRICING & STOCK */}
                <section className="pform-section" id="pform-pricing">
                  <div className="pform-section-head">
                    <span className="pform-section-icon"><IndianRupee size={15} /></span>
                    <div>
                      <h3>Pricing &amp; Stock</h3>
                      <span className="pform-section-sub">MRP above the selling price shows a discount on the store</span>
                    </div>
                  </div>
                  <div className="pform-grid-3">
                    <div className="pform-field">
                      <label>Selling Price (₹) *</label>
                      <div className="pform-affix">
                        <span className="pform-affix-pre" aria-hidden="true">₹</span>
                        <input type="number" required placeholder="680" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                      </div>
                    </div>
                    <div className="pform-field">
                      <label>MRP (₹)</label>
                      <div className="pform-affix">
                        <span className="pform-affix-pre" aria-hidden="true">₹</span>
                        <input type="number" placeholder="850" value={form.mrp} onChange={e => setForm({ ...form, mrp: e.target.value })} />
                      </div>
                      <p className={`pform-hint pform-discount ${discountPercent > 0 ? 'on' : ''}`}>
                        {discountPercent > 0 ? `${discountPercent}% off shown to shoppers` : 'No discount shown'}
                      </p>
                    </div>
                    <div className="pform-field">
                      <label>Stock Qty *</label>
                      <div className="pform-affix">
                        <input type="number" required placeholder="100" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
                        <span className="pform-affix-post" aria-hidden="true">units</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* CROP, PEST & PACK TARGETING */}
                <section className="pform-section" id="pform-targeting">
                  <div className="pform-section-head">
                    <span className="pform-section-icon"><Sprout size={15} /></span>
                    <div>
                      <h3>Crop, Pest &amp; Pack Targeting</h3>
                      <span className="pform-section-sub">Drives the store's crop, pest and pack-size filters</span>
                    </div>
                  </div>

                  <div className="pform-field">
                    <label>Suitable Crops <em>(comma separated)</em></label>
                    <input
                      placeholder="e.g. Paddy/Rice, Wheat, Cotton, Tomato"
                      value={form.crops}
                      onChange={e => setForm({ ...form, crops: e.target.value })}
                    />
                    {form.crops.trim() && (
                      <div className="pform-chips">
                        {form.crops.split(',').map(s => s.trim()).filter(Boolean).map(c => <span key={c} className="pform-chip">{c}<button type="button" className="pform-chip-x" onClick={() => removeListItem('crops', c)} aria-label={`Remove ${c}`}><X size={11} /></button></span>)}
                      </div>
                    )}
                    <div className="pform-adder">
                      <input value={newCrop} onChange={e => setNewCrop(e.target.value)} placeholder="Add a custom crop" />
                      <button type="button" onClick={() => addFormOption('crops', newCrop, setNewCrop)}><Plus size={14} className="pform-adder-icon" />Add crop</button>
                    </div>
                  </div>

                  <div className="pform-field">
                    <label>Target Pests / Diseases <em>(comma separated)</em></label>
                    <input
                      placeholder="e.g. Blast, Whitefly, Leaf Miner"
                      value={form.diseases}
                      onChange={e => setForm({ ...form, diseases: e.target.value })}
                    />
                    {form.diseases.trim() && (
                      <div className="pform-chips">
                        {form.diseases.split(',').map(s => s.trim()).filter(Boolean).map(d => <span key={d} className="pform-chip">{d}<button type="button" className="pform-chip-x" onClick={() => removeListItem('diseases', d)} aria-label={`Remove ${d}`}><X size={11} /></button></span>)}
                      </div>
                    )}
                    <p className="pform-hint">Powers the storefront's "Shop by Pest &amp; Disease" filters — a product only shows up there once it's tagged with the disease it treats.</p>
                    <div className="pform-adder">
                      <select value="" onChange={e => addFormOption('diseases', e.target.value, setNewDisease)}>
                        <option value="">Choose a known pest / disease</option>
                        {catalogOptions.diseases.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <input value={newDisease} onChange={e => setNewDisease(e.target.value)} placeholder="Add a new pest / disease" />
                      <button type="button" onClick={() => addFormOption('diseases', newDisease, setNewDisease)}><Plus size={14} className="pform-adder-icon" />Add disease</button>
                    </div>
                  </div>

                  <div className="pform-field">
                    <label>Pack Sizes</label>
                    <input
                      placeholder="e.g. 250g, 500g, 1kg"
                      value={form.packSizes}
                      onChange={e => setForm({ ...form, packSizes: e.target.value })}
                    />
                    {form.packSizes.trim() && (
                      <div className="pform-chips">
                        {form.packSizes.split(',').map(s => s.trim()).filter(Boolean).map(p => <span key={p} className="pform-chip">{p}<button type="button" className="pform-chip-x" onClick={() => removeListItem('packSizes', p)} aria-label={`Remove ${p}`}><X size={11} /></button></span>)}
                      </div>
                    )}
                    <div className="pform-adder">
                      <select value="" onChange={e => addFormOption('packSizes', e.target.value, setNewStorageBatch)}>
                        <option value="">Choose saved pack size</option>
                        {catalogOptions.storageBatches.map(batch => <option key={batch} value={batch}>{batch}</option>)}
                      </select>
                      <input value={newStorageBatch} onChange={e => setNewStorageBatch(e.target.value)} placeholder="New pack size" />
                      <button type="button" onClick={() => addFormOption('packSizes', newStorageBatch, setNewStorageBatch)}><Plus size={14} className="pform-adder-icon" />Add pack size</button>
                    </div>
                  </div>
                </section>

                {/* PHOTOS & DESCRIPTION */}
                <section className="pform-section" id="pform-media">
                  <div className="pform-section-head">
                    <span className="pform-section-icon"><ImageIcon size={15} /></span>
                    <div>
                      <h3>Photos &amp; Description</h3>
                      <span className="pform-section-sub">The first photo is the card image; the rest fill the detail gallery</span>
                    </div>
                  </div>
                  <div className="pform-field">
                    <label>Product Photos * <em>(one URL or asset path per line)</em></label>
                    <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} />
                    {photoList.length > 0 && (
                      <div className="pform-thumbs">
                        {photoList.map((src, index) => (
                          <figure key={`${index}-${src.slice(0, 40)}`}>
                            <img src={src} alt="" onError={e => { e.currentTarget.style.visibility = 'hidden' }} />
                            {index === 0 && <figcaption>Cover</figcaption>}
                          </figure>
                        ))}
                      </div>
                    )}
                    <textarea rows="2" required value={form.images} onChange={e => setForm({ ...form, images: e.target.value })} placeholder="/assets/product-front.jpg&#10;/assets/product-label.jpg" />
                    <p className="pform-hint">Use at least one photo. Select multiple files or add URLs/asset paths for the detail-page gallery and hover zoom.</p>
                  </div>
                  <div className="pform-field">
                    <label>Product Description</label>
                    <textarea
                      rows="3"
                      placeholder="Key farmer benefits, disease target, application instructions..."
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                </section>

                {/* TARGETING & VISIBILITY */}
                <section className="pform-section" id="pform-visibility">
                  <div className="pform-section-head">
                    <span className="pform-section-icon"><User size={15} /></span>
                    <div>
                      <h3>Targeting &amp; Visibility</h3>
                      <span className="pform-section-sub">Who sees it first, and whether it is sold online</span>
                    </div>
                  </div>
                  <div className="pform-field">
                    <label>Assign to user <em>(personalizes their catalog &amp; prioritizes it on their store page)</em></label>
                    <select
                      value={form.targetUserId}
                      onChange={e => setForm({ ...form, targetUserId: e.target.value })}
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
                  <div className="product-visibility-panel" style={{ marginTop: '14px' }}>
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
                </section>

                {/* ADVANCED / OPTIONAL DETAILS */}
                <details className="pform-advanced" id="pform-advanced">
                  <summary>
                    <span className="pform-section-icon pform-advanced-tile"><Info size={15} /></span>
                    <Info size={15} className="pform-advanced-info" /> Advanced details
                    <span>Ingredient, dosage, usage guidance, related content, reviews</span>
                  </summary>
                  <div className="pform-advanced-body">
                    <div className="pform-field pform-grid-2">
                      <div>
                        <label>Active Ingredient</label>
                        <input
                          placeholder="Active Chemical/Bio ingredient"
                          value={form.activeIngredient}
                          onChange={e => setForm({ ...form, activeIngredient: e.target.value })}
                        />
                      </div>
                      <div>
                        <label>Dosage</label>
                        <input
                          placeholder="Dosage e.g. 250g per Acre"
                          value={form.dosage}
                          onChange={e => setForm({ ...form, dosage: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="product-detail-fields">
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
                  </div>
                </details>
              </div>
              </div>

              <div className="pform-footer">
                <span className="pform-footer-note">
                  {requiredDone === requiredChecks.length
                    ? <><Check size={14} aria-hidden="true" /> Ready to publish</>
                    : <>{requiredChecks.length - requiredDone} required {requiredChecks.length - requiredDone === 1 ? 'field' : 'fields'} left</>}
                </span>
                <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
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
