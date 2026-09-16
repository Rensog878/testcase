import ComingSoon from '../components/ComingSoon'

// Community Blogs is Phase 3 work — not part of this presentation build.
// Real implementation kept below, commented out, to restore later.
// Note: admin blog management (/admin/blogs) is untouched.

/*
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Search, Calendar, User, Clock, ArrowRight } from 'lucide-react'
import axios from 'axios'

// Blog list. Styles: index.css, "BLOG PAGES" - the home page's fonts
// (Outfit headings, Plus Jakarta Sans text) at the home page's sizes.

const CATEGORIES = ['All', 'Crop Advisory', 'Pest Management', 'Organic Farming', 'Bio-Fungicides', 'Soil Health', 'Farmer Guides']
const FALLBACK_COVER = 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=800&q=80'

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

  const query = searchQuery.trim().toLowerCase()
  const filteredBlogs = blogs.filter(blog => {
    const matchCategory = selectedCategory === 'All' || (blog.category || '').toLowerCase() === selectedCategory.toLowerCase()
    const matchSearch = !query ||
      (blog.title || '').toLowerCase().includes(query) ||
      (blog.summary || '').toLowerCase().includes(query) ||
      (Array.isArray(blog.tags) && blog.tags.some(t => String(t).toLowerCase().includes(query)))
    return matchCategory && matchSearch
  })

  return (
    <div className="sb-blog animate-fade-in">
      <header className="sb-blog-hero">
        <span className="sb-blog-badge">
          <BookOpen size={14} aria-hidden="true" />
          <span>SATHYAM BIO AGRONOMY & RESEARCH BLOG</span>
        </span>
        <h1>Farmer Guides, Crop Care & Bio Insights</h1>
        <p>Scientific pest management advisories, bio-fungicide guides, and seasonal farm strategies written by our certified agronomy experts.</p>
        <div className="sb-blog-search">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search articles e.g. Blast, Whitefly, Seaweed, Paddy..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      <div className="sb-blog-chips" role="tablist" aria-label="Blog categories">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={selectedCategory === cat}
            className={`sb-blog-chip${selectedCategory === cat ? ' is-active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading && (
        <div className="sb-blog-state">
          <p>Loading agronomy blogs...</p>
        </div>
      )}

      {!loading && filteredBlogs.length === 0 && (
        <div className="sb-blog-state">
          <div className="sb-blog-state-emoji" aria-hidden="true">📖</div>
          <h3>{blogs.length === 0 ? 'No Blog Articles Published Yet' : 'No articles match your search'}</h3>
          <p>
            {blogs.length === 0
              ? 'Our agricultural experts are preparing seasonal advisories and field research articles. Check back soon, or log in as Admin to publish articles!'
              : 'Try clearing your search query or selecting a different category filter.'}
          </p>
          {blogs.length === 0 ? (
            <Link to="/admin/blogs" className="sb-blog-btn">
              <span>Admin: Write New Blog</span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          ) : (
            <button type="button" className="sb-blog-btn sb-blog-btn--ghost" onClick={() => { setSearchQuery(''); setSelectedCategory('All') }}>
              Reset Filters
            </button>
          )}
        </div>
      )}

      {!loading && filteredBlogs.length > 0 && (
        <div className="sb-blog-grid">
          {filteredBlogs.map(blog => {
            const href = `/blog/${blog.id || blog._id}`
            const dateStr = blog.createdAt ? new Date(blog.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'
            return (
              <article key={blog.id || blog._id} className="sb-blog-card">
                <div className="sb-blog-cover">
                  <img
                    src={blog.coverImage || FALLBACK_COVER}
                    alt={blog.title}
                    loading="lazy"
                    onError={e => { e.target.onerror = null; e.target.src = FALLBACK_COVER }}
                  />
                  <span className="sb-blog-cover-tag">{blog.category || 'Agro Advisory'}</span>
                </div>
                <div className="sb-blog-body">
                  <div className="sb-blog-meta">
                    <span><User size={13} aria-hidden="true" />{blog.author || 'Agronomy Team'}</span>
                    <span><Calendar size={13} aria-hidden="true" />{dateStr}</span>
                    {blog.readTime && <span><Clock size={13} aria-hidden="true" />{blog.readTime}</span>}
                  </div>
                  <h2><Link to={href}>{blog.title}</Link></h2>
                  <p className="sb-blog-summary">{blog.summary || (blog.content ? blog.content.slice(0, 130) + '...' : '')}</p>
                  {Array.isArray(blog.tags) && blog.tags.length > 0 && (
                    <div className="sb-blog-tags">
                      {blog.tags.slice(0, 3).map((tag, idx) => <span key={idx}>#{tag}</span>)}
                    </div>
                  )}
                  <Link to={href} className="sb-blog-read">
                    <span>Read Full Guide</span>
                    <ArrowRight size={15} aria-hidden="true" />
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
*/

export default function Blog() {
  return (
    <div className="sb-blog animate-fade-in">
      <ComingSoon title="Blog — coming soon" message="Farmer guides, crop care and bio insights will be published here soon." />
    </div>
  )
}
