import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Calendar, User, Clock, Tag, Share2, Youtube,
  ShoppingCart, BookOpen, ExternalLink, Sprout, ChevronRight, Film, Video
} from 'lucide-react'
import axios from 'axios'

// One blog article. Styles: index.css, "BLOG PAGES" - the home page's fonts
// (Outfit headings, Plus Jakarta Sans text) at the home page's sizes.

const FALLBACK_PRODUCT_IMAGE = 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=400&q=80'

export default function BlogDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [blog, setBlog] = useState(null)
  const [relatedProducts, setRelatedProducts] = useState([])
  const [relatedVideos, setRelatedVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    const fetchBlog = async () => {
      try {
        setLoading(true)
        const { data } = await axios.get(`/api/blogs/${id}`)
        if (!cancelled && data.success) {
          setBlog(data.data)
          if (data.data.taggedProducts?.length) {
            const productPromises = data.data.taggedProducts.map(pid =>
              axios.get(`/api/products/${pid}`).catch(() => null)
            )
            const results = await Promise.all(productPromises)
            const products = results.filter(r => r?.data?.success).map(r => r.data.data)
            if (!cancelled) setRelatedProducts(products)
          }
          if (data.data.taggedVideos?.length) {
            const videoPromises = data.data.taggedVideos.map(vid =>
              axios.get(`/api/videos/${vid}`).catch(() => null)
            )
            const vResults = await Promise.all(videoPromises)
            const videos = vResults.filter(r => r?.data?.success).map(r => r.data.data)
            if (!cancelled) setRelatedVideos(videos)
          }
        }
      } catch (err) {
        if (!cancelled) setError('Blog article not found or has been removed.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchBlog()
    return () => { cancelled = true }
  }, [id])

  const getYouTubeId = (url) => {
    if (!url) return null
    const match = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    return match ? match[1] : null
  }

  const isHtml5Video = (url) => {
    if (!url) return false
    return url.startsWith('/api/upload') || url.startsWith('data:video') || /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: blog?.title, url: window.location.href })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  if (loading) {
    return (
      <div className="sb-article-page">
        <div className="sb-article sb-blog-state">
          <div className="sb-blog-state-emoji" aria-hidden="true">📖</div>
          <p>Loading article...</p>
        </div>
      </div>
    )
  }

  if (error || !blog) {
    return (
      <div className="sb-article-page">
        <div className="sb-article sb-blog-state">
          <div className="sb-blog-state-emoji" aria-hidden="true">🌾</div>
          <h2>Article Not Found</h2>
          <p>{error}</p>
          <Link to="/blog" className="sb-blog-btn">Back to Blog</Link>
        </div>
      </div>
    )
  }

  const dateStr = blog.createdAt
    ? new Date(blog.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Recent'

  const paragraphs = (blog.content || '').split('\n').filter(p => p.trim())

  return (
    <div className="sb-article-page animate-fade-in">
      <nav className="sb-article-crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <ChevronRight size={13} aria-hidden="true" />
        <Link to="/blog">Blog</Link>
        <ChevronRight size={13} aria-hidden="true" />
        <span>{blog.title}</span>
      </nav>

      <article className="sb-article">
        <button type="button" className="sb-article-back" onClick={() => navigate('/blog')}>
          <ArrowLeft size={16} aria-hidden="true" />
          Back to All Articles
        </button>

        <div>
          <span className="sb-blog-badge">{blog.category || 'Agro Advisory'}</span>
        </div>

        <h1>{blog.title}</h1>

        <div className="sb-article-meta">
          <span><User size={14} aria-hidden="true" /><strong>{blog.author || 'Agronomy Team'}</strong></span>
          <span><Calendar size={14} aria-hidden="true" />{dateStr}</span>
          {blog.readTime && <span><Clock size={14} aria-hidden="true" />{blog.readTime}</span>}
          <button type="button" className="sb-article-share" onClick={handleShare}>
            <Share2 size={14} aria-hidden="true" />
            Share
          </button>
        </div>

        {blog.coverImage && (
          <div className="sb-article-cover">
            <img src={blog.coverImage} alt={blog.title} onError={e => { e.target.parentElement.style.display = 'none' }} />
          </div>
        )}

        {blog.summary && (
          <div className="sb-article-summary">
            <p>📌 {blog.summary}</p>
          </div>
        )}

        <div className="sb-article-content">
          {paragraphs.map((para, idx) => {
            const clean = para.replace(new RegExp('^#+\\s*'), '')
            if (para.startsWith('## ')) return <h2 key={idx}>{clean}</h2>
            if (para.startsWith('# ')) return <h3 key={idx}>{clean}</h3>
            return <p key={idx}>{para}</p>
          })}
        </div>

        {Array.isArray(blog.tags) && blog.tags.length > 0 && (
          <div className="sb-article-tags">
            <Tag size={14} aria-hidden="true" />
            {blog.tags.map((tag, idx) => <span key={idx}>#{tag}</span>)}
          </div>
        )}

        {relatedVideos.length > 0 && (
          <section className="sb-article-section" style={{ marginTop: '32px' }}>
            <div className="sb-article-section-head">
              <h2><Film size={20} color="#16a34a" aria-hidden="true" />Watch: Video Demonstrations &amp; Guides</h2>
            </div>
            <div className="sb-article-videos" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {relatedVideos.map(video => {
                const videoUrl = video.url || video.videoUrl || ''
                const ytId = getYouTubeId(videoUrl)
                const isLocal = isHtml5Video(videoUrl)

                return (
                  <div key={video._id || video.id} className="sb-article-video" style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#fff' }}>
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000' }}>
                      {ytId ? (
                        <iframe
                          src={`https://www.youtube.com/embed/${ytId}`}
                          title={video.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          style={{ width: '100%', height: '100%', border: 0 }}
                        />
                      ) : isLocal ? (
                        <video
                          src={videoUrl}
                          controls
                          preload="metadata"
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      ) : (
                        <a className="sb-article-video-link" href={videoUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textDecoration: 'none', color: '#fff' }}>
                          <Youtube size={40} color="#dc2626" aria-hidden="true" />
                          <span style={{ marginTop: '8px', fontSize: '0.85rem' }}>Watch Video Guide</span>
                        </a>
                      )}
                    </div>
                    <div className="sb-article-video-body" style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <span className="badge badge-green" style={{ fontSize: '0.68rem' }}>{video.category || 'Guide'}</span>
                      </div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{video.title}</h4>
                      {video.description && <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#6b7280' }}>{video.description}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {relatedProducts.length > 0 && (
          <section className="sb-article-section">
            <div className="sb-article-section-head">
              <h2><Sprout size={20} color="#16a34a" aria-hidden="true" />Products Mentioned in This Guide</h2>
              <Link to="/products">View All <ExternalLink size={13} aria-hidden="true" /></Link>
            </div>
            <div className="sb-article-products">
              {relatedProducts.map(product => (
                <Link key={product._id || product.id} to={`/product/${product._id || product.id}`} className="sb-article-product">
                  <div className="sb-article-product-img">
                    <img
                      src={Array.isArray(product.images) ? product.images[0] : product.image}
                      alt={product.name}
                      loading="lazy"
                      onError={e => { e.target.onerror = null; e.target.src = FALLBACK_PRODUCT_IMAGE }}
                    />
                  </div>
                  <div className="sb-article-product-body">
                    <p>{product.category}</p>
                    <h4>{product.name}</h4>
                    <div className="sb-article-product-row">
                      <strong>₹{Number(product.price || 0).toLocaleString('en-IN')}</strong>
                      <span><ShoppingCart size={12} aria-hidden="true" /> Buy</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="sb-article-cta">
          <BookOpen size={28} aria-hidden="true" />
          <h3>Explore More Agronomy Articles</h3>
          <p>Stay updated with the latest field research, crop protection strategies, and seasonal advisories.</p>
          <Link to="/blog">All Articles</Link>
        </div>
      </article>
    </div>
  )
}
