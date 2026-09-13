import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Search, Calendar, User, Clock, ArrowRight, Tag, Sprout } from 'lucide-react'
import axios from 'axios'

export default function Blog() {
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  useEffect(() => {
    let cancelled = false
    const fetchBlogs = async () => {
      try {
        const { data } = await axios.get('/api/blogs?publishedOnly=true')
        if (!cancelled && data.success) {
          setBlogs(data.data || [])
        }
      } catch (err) {
        console.error('Error fetching blogs:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchBlogs()
    return () => { cancelled = true }
  }, [])

  const categories = ['All', 'Crop Advisory', 'Pest Management', 'Organic Farming', 'Bio-Fungicides', 'Soil Health', 'Farmer Guides']

  const filteredBlogs = blogs.filter(blog => {
    const matchCategory = selectedCategory === 'All' || (blog.category || '').toLowerCase() === selectedCategory.toLowerCase()
    const matchSearch = !searchQuery.trim() || 
      (blog.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (blog.summary || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (blog.tags && Array.isArray(blog.tags) && blog.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
    return matchCategory && matchSearch
  })

  return (
    <div className="blog-page-container animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 16px' }}>
      {/* Blog Hero Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px', background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)', padding: '48px 24px', borderRadius: '24px', border: '1px solid #bbf7d0' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#dcfce7', color: '#15803d', padding: '6px 14px', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 700, marginBottom: '16px' }}>
          <BookOpen size={18} />
          <span>SATHYA BIO AGRONOMY & RESEARCH BLOG</span>
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#064e3b', marginBottom: '16px', lineHeight: 1.2 }}>
          Farmer Guides, Crop Care & Bio Insights
        </h1>
        <p style={{ fontSize: '1.125rem', color: '#374151', maxWidth: '680px', margin: '0 auto 28px' }}>
          Scientific pest management advisories, bio-fungicide guides, and seasonal farm strategies written by our certified agronomy experts.
        </p>

        {/* Search Bar */}
        <div style={{ maxWidth: '540px', margin: '0 auto', position: 'relative' }}>
          <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search articles e.g. Blast, Whitefly, Seaweed, Paddy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 20px 14px 48px',
              borderRadius: '12px',
              border: '1.5px solid #86efac',
              background: '#fff',
              fontSize: '1rem',
              outline: 'none',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.1)'
            }}
          />
        </div>
      </div>

      {/* Category Pills */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '32px' }}>
        {categories.map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: '8px 18px',
              borderRadius: '9999px',
              fontWeight: 600,
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              border: selectedCategory === cat ? '1.5px solid #16a34a' : '1px solid #e5e7eb',
              background: selectedCategory === cat ? '#16a34a' : '#fff',
              color: selectedCategory === cat ? '#fff' : '#4b5563',
              transition: 'all 0.2s ease'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>
          <p style={{ fontSize: '1.1rem' }}>Loading agronomy blogs...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredBlogs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 24px', background: '#f9fafb', borderRadius: '20px', border: '1px dashed #d1d5db' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📖</div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1f2937', marginBottom: '8px' }}>
            {blogs.length === 0 ? 'No Blog Articles Published Yet' : 'No articles match your search'}
          </h3>
          <p style={{ color: '#6b7280', maxWidth: '460px', margin: '0 auto 24px' }}>
            {blogs.length === 0 
              ? 'Our agricultural experts are preparing seasonal advisories and field research articles. Check back soon, or log in as Admin to publish articles!'
              : 'Try clearing your search query or selecting a different category filter.'}
          </p>
          {blogs.length === 0 ? (
            <Link
              to="/admin/blogs"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#15803d',
                color: '#fff',
                padding: '10px 22px',
                borderRadius: '10px',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              <span>Admin: Write New Blog</span>
              <ArrowRight size={16} />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
              style={{
                background: '#e5e7eb',
                color: '#374151',
                padding: '8px 20px',
                borderRadius: '8px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      {/* Blog Cards Grid */}
      {!loading && filteredBlogs.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '28px' }}>
          {filteredBlogs.map(blog => {
            const dateStr = blog.createdAt ? new Date(blog.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'
            return (
              <article
                key={blog.id || blog._id}
                style={{
                  background: '#fff',
                  borderRadius: '18px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                  border: '1px solid #f1f5f9',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
              >
                {/* Cover Image */}
                <div style={{ height: '210px', position: 'relative', overflow: 'hidden', background: '#e2e8f0' }}>
                  <img
                    src={blog.coverImage || 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=800&q=80'}
                    alt={blog.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.onerror = null
                      e.target.src = 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=800&q=80'
                    }}
                  />
                  <div style={{ position: 'absolute', top: '14px', left: '14px', background: 'rgba(255, 255, 255, 0.92)', backdropFilter: 'blur(4px)', padding: '4px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, color: '#166534', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
                    {blog.category || 'Agro Advisory'}
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* Meta: Author and Date */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.8rem', color: '#64748b', marginBottom: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={14} />
                      {blog.author || 'Agronomy Team'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={14} />
                      {dateStr}
                    </span>
                    {blog.readTime && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} />
                        {blog.readTime}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '10px', lineHeight: 1.35 }}>
                    <Link to={`/blog/${blog.id || blog._id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {blog.title}
                    </Link>
                  </h2>

                  {/* Summary */}
                  <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.55, marginBottom: '20px', flex: 1 }}>
                    {blog.summary || (blog.content ? blog.content.slice(0, 130) + '...' : '')}
                  </p>

                  {/* Tags */}
                  {Array.isArray(blog.tags) && blog.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '18px' }}>
                      {blog.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} style={{ background: '#f0fdf4', color: '#15803d', fontSize: '0.75rem', fontWeight: 600, padding: '3px 9px', borderRadius: '6px' }}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Read Article Link */}
                  <Link
                    to={`/blog/${blog.id || blog._id}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#15803d',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      textDecoration: 'none',
                      marginTop: 'auto'
                    }}
                  >
                    <span>Read Full Guide</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
