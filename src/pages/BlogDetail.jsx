import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Calendar, User, Clock, Tag, Share2, Youtube,
  ShoppingCart, BookOpen, ExternalLink, Sprout, ChevronRight
} from 'lucide-react'
import axios from 'axios'

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
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    return match ? match[1] : null
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
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📖</div>
        <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>Loading article...</p>
      </div>
    )
  }

  if (error || !blog) {
    return (
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🌾</div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1f2937', marginBottom: '12px' }}>Article Not Found</h2>
        <p style={{ color: '#6b7280', marginBottom: '28px' }}>{error}</p>
        <Link to="/blog" style={{ background: '#15803d', color: '#fff', padding: '10px 22px', borderRadius: '10px', fontWeight: 600, textDecoration: 'none' }}>
          Back to Blog
        </Link>
      </div>
    )
  }

  const dateStr = blog.createdAt
    ? new Date(blog.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Recent'

  const paragraphs = (blog.content || '').split('\n').filter(p => p.trim())

  return (
    <div className="animate-fade-in" style={{ background: '#f8fafc', minHeight: '100vh', paddingBottom: '60px' }}>

      {/* Breadcrumb */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#64748b' }}>
          <Link to="/" style={{ color: '#64748b', textDecoration: 'none' }}>Home</Link>
          <ChevronRight size={14} />
          <Link to="/blog" style={{ color: '#64748b', textDecoration: 'none' }}>Blog</Link>
          <ChevronRight size={14} />
          <span style={{ color: '#0f172a', fontWeight: 600 }}>{blog.title?.slice(0, 48)}{blog.title?.length > 48 ? '…' : ''}</span>
        </div>
      </div>

      {/* Main Article */}
      <article style={{ maxWidth: '860px', margin: '24px auto', padding: '0 20px' }}>

        {/* Back Button */}
        <button
          onClick={() => navigate('/blog')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#15803d', fontWeight: 600, fontSize: '0.9rem', background: 'transparent', border: 'none', cursor: 'pointer', marginBottom: '24px', padding: 0 }}
        >
          <ArrowLeft size={18} />
          Back to All Articles
        </button>

        {/* Category Badge */}
        <div style={{ marginBottom: '16px' }}>
          <span style={{ background: '#dcfce7', color: '#15803d', padding: '5px 14px', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 700 }}>
            {blog.category || 'Agro Advisory'}
          </span>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: '2.1rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.25, marginBottom: '20px' }}>
          {blog.title}
        </h1>

        {/* Meta Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '20px', fontSize: '0.875rem', color: '#64748b', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <User size={16} />
            <strong style={{ color: '#374151' }}>{blog.author || 'Agronomy Team'}</strong>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={16} />
            {dateStr}
          </span>
          {blog.readTime && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} />
              {blog.readTime}
            </span>
          )}
          <button
            onClick={handleShare}
            style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '6px 14px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
          >
            <Share2 size={15} />
            Share
          </button>
        </div>

        {/* Cover Image */}
        {blog.coverImage && (
          <div style={{ borderRadius: '18px', overflow: 'hidden', marginBottom: '32px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
            <img
              src={blog.coverImage}
              alt={blog.title}
              style={{ width: '100%', height: '400px', objectFit: 'cover', display: 'block' }}
              onError={e => { e.target.style.display = 'none' }}
            />
          </div>
        )}

        {/* Summary Box */}
        {blog.summary && (
          <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', border: '1px solid #bbf7d0', borderRadius: '14px', padding: '20px 24px', marginBottom: '32px' }}>
            <p style={{ color: '#166534', fontSize: '1.05rem', fontWeight: 600, lineHeight: 1.6, margin: 0 }}>
              📌 {blog.summary}
            </p>
          </div>
        )}

        {/* Article Content */}
        <div style={{ background: '#fff', borderRadius: '18px', padding: '32px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', marginBottom: '36px' }}>
          {paragraphs.map((para, idx) => {
            const isH2 = para.startsWith('## ')
            const isH3 = para.startsWith('# ')
            const cleanPara = para.replace(/^#+\s*/, '')
            if (isH2) return (
              <h2 key={idx} style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: '28px 0 12px' }}>{cleanPara}</h2>
            )
            if (isH3) return (
              <h3 key={idx} style={{ fontSize: '1.1rem', fontWeight: 700, color: '#166534', margin: '22px 0 10px' }}>{cleanPara}</h3>
            )
            return (
              <p key={idx} style={{ fontSize: '1rem', color: '#374151', lineHeight: 1.75, marginBottom: '18px' }}>{para}</p>
            )
          })}
        </div>

        {/* Tags */}
        {Array.isArray(blog.tags) && blog.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '36px', alignItems: 'center' }}>
            <Tag size={15} style={{ color: '#94a3b8' }} />
            {blog.tags.map((tag, idx) => (
              <span key={idx} style={{ background: '#f0f9ff', color: '#0369a1', fontSize: '0.8rem', fontWeight: 600, padding: '4px 12px', borderRadius: '8px' }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Tagged Videos Section */}
        {relatedVideos.length > 0 && (
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Youtube size={22} style={{ color: '#dc2626' }} />
              Watch: Related Videos
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {relatedVideos.map(video => {
                const ytId = getYouTubeId(video.url || video.videoUrl)
                return (
                  <div key={video._id || video.id} style={{ borderRadius: '14px', overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.08)', background: '#fff' }}>
                    {ytId ? (
                      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                        <iframe
                          src={`https://www.youtube.com/embed/${ytId}`}
                          title={video.title}
                          frameBorder="0"
                          allowFullScreen
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                        />
                      </div>
                    ) : (
                      <a href={video.url || video.videoUrl} target="_blank" rel="noreferrer" style={{ display: 'block', background: '#0f172a', color: '#fff', padding: '32px', textAlign: 'center', textDecoration: 'none' }}>
                        <Youtube size={36} style={{ color: '#dc2626', marginBottom: '8px' }} />
                        <div style={{ fontWeight: 600 }}>Watch on YouTube</div>
                      </a>
                    )}
                    <div style={{ padding: '16px' }}>
                      <h4 style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem', margin: '0 0 6px' }}>{video.title}</h4>
                      {video.description && <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>{video.description}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Tagged Products Section */}
        {relatedProducts.length > 0 && (
          <section style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                <Sprout size={22} style={{ color: '#16a34a' }} />
                Products Mentioned in This Guide
              </h2>
              <Link to="/products" style={{ color: '#15803d', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                View All <ExternalLink size={14} />
              </Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
              {relatedProducts.map(product => (
                <Link
                  key={product._id || product.id}
                  to={`/product/${product._id || product.id}`}
                  style={{ background: '#fff', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', border: '1px solid #f1f5f9', textDecoration: 'none', display: 'flex', flexDirection: 'column' }}
                >
                  <div style={{ height: '140px', overflow: 'hidden', background: '#f8fafc' }}>
                    <img
                      src={Array.isArray(product.images) ? product.images[0] : product.image}
                      alt={product.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => { e.target.src = 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=400&q=80' }}
                    />
                  </div>
                  <div style={{ padding: '14px' }}>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>{product.category}</p>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px', lineHeight: 1.3 }}>{product.name}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 800, color: '#15803d', fontSize: '1.05rem' }}>Rs.{product.price}</span>
                      <span style={{ background: '#15803d', color: '#fff', padding: '5px 12px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ShoppingCart size={13} /> Buy
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <div style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)', borderRadius: '20px', padding: '32px', textAlign: 'center', color: '#fff' }}>
          <BookOpen size={32} style={{ marginBottom: '14px', opacity: 0.85 }} />
          <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '10px' }}>Explore More Agronomy Articles</h3>
          <p style={{ color: '#a7f3d0', marginBottom: '22px', fontSize: '0.95rem' }}>
            Stay updated with the latest field research, crop protection strategies, and seasonal advisories.
          </p>
          <Link
            to="/blog"
            style={{ background: '#fff', color: '#065f46', padding: '10px 26px', borderRadius: '10px', fontWeight: 700, textDecoration: 'none', fontSize: '0.95rem', display: 'inline-block' }}
          >
            All Articles
          </Link>
        </div>
      </article>
    </div>
  )
}
