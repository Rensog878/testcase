import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import {
  Plus, Edit2, Trash2, X, Search, Youtube,
  ExternalLink, Video, Link2, Tag
} from 'lucide-react'

const VIDEO_CATEGORIES = ['Crop Advisory', 'Product Demo', 'How-To Guide', 'Pest Identification', 'Testimonial', 'General']

const emptyForm = {
  title: '',
  description: '',
  url: '',
  category: 'Crop Advisory',
  tags: '',
  thumbnailUrl: ''
}

export default function AdminVideos() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    fetchVideos()
  }, [])

  const authHeader = () => {
    const user = JSON.parse(localStorage.getItem('sathya_user') || '{}')
    const token = user.token || localStorage.getItem('sathya_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchVideos = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/videos')
      if (data.success) setVideos(data.data || [])
    } catch {
      toast.error('Failed to load videos')
    } finally {
      setLoading(false)
    }
  }

  const getYouTubeId = (url) => {
    if (!url) return null
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    return match ? match[1] : null
  }

  const getYouTubeThumbnail = (url) => {
    const id = getYouTubeId(url)
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
  }

  const openCreate = () => {
    setIsEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (video) => {
    setIsEditing(video._id || video.id)
    setForm({
      title: video.title || '',
      description: video.description || '',
      url: video.url || video.videoUrl || '',
      category: video.category || 'Crop Advisory',
      tags: Array.isArray(video.tags) ? video.tags.join(', ') : (video.tags || ''),
      thumbnailUrl: video.thumbnailUrl || ''
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Video title is required'); return }
    if (!form.url.trim()) { toast.error('Video URL is required'); return }

    const payload = {
      ...form,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      thumbnailUrl: form.thumbnailUrl || getYouTubeThumbnail(form.url) || ''
    }

    try {
      if (isEditing) {
        const { data } = await axios.put(`/api/videos/${isEditing}`, payload, { headers: authHeader() })
        if (data.success) {
          toast.success('Video updated!')
          setVideos(prev => prev.map(v => (v._id === isEditing || v.id === isEditing) ? data.data : v))
        }
      } else {
        const { data } = await axios.post('/api/videos', payload, { headers: authHeader() })
        if (data.success) {
          toast.success('Video added!')
          setVideos(prev => [data.data, ...prev])
        }
      }
      setModalOpen(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this video?')) return
    try {
      await axios.delete(`/api/videos/${id}`, { headers: authHeader() })
      toast.success('Video deleted')
      setVideos(prev => prev.filter(v => v._id !== id && v.id !== id))
    } catch {
      toast.error('Delete failed')
    }
  }

  const filtered = videos.filter(v =>
    !search.trim() ||
    (v.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (v.category || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Youtube size={24} style={{ color: '#dc2626' }} />
            Video Management
          </h1>
          <p className="page-subtitle">Add YouTube videos and link them to products and blog articles</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> Add Video
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '24px', maxWidth: '400px' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
        <input type="text" placeholder="Search videos..." value={search} onChange={e => setSearch(e.target.value)} className="form-control" style={{ paddingLeft: '36px' }} />
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Total Videos', value: videos.length, icon: '🎬', color: '#fee2e2' },
          { label: 'YouTube Links', value: videos.filter(v => getYouTubeId(v.url || v.videoUrl)).length, icon: '▶️', color: '#fef3c7' },
          { label: 'Categories', value: [...new Set(videos.map(v => v.category))].length, icon: '📂', color: '#e0f2fe' }
        ].map(stat => (
          <div key={stat.label} style={{ background: stat.color, borderRadius: '14px', padding: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '28px' }}>{stat.icon}</span>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>{stat.value}</div>
              <div style={{ fontSize: '0.8rem', color: '#374151', fontWeight: 600 }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Video Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>Loading videos...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px', background: '#f9fafb', borderRadius: '18px', border: '1px dashed #d1d5db' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎬</div>
          <h3 style={{ fontWeight: 700, color: '#1f2937', marginBottom: '8px' }}>No Videos Added Yet</h3>
          <p style={{ color: '#6b7280', marginBottom: '20px' }}>Add YouTube videos to embed in products and blog articles.</p>
          <button className="btn btn-primary" onClick={openCreate} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} /> Add First Video
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {filtered.map(video => {
            const ytId = getYouTubeId(video.url || video.videoUrl)
            const thumb = video.thumbnailUrl || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null)
            const vid = video._id || video.id
            return (
              <div key={vid} style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column' }}>
                {/* Thumbnail */}
                <div style={{ height: '170px', background: '#0f172a', position: 'relative', overflow: 'hidden' }}>
                  {thumb ? (
                    <img src={thumb} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <Youtube size={48} style={{ color: '#dc2626' }} />
                    </div>
                  )}
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(220,38,38,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                      <span style={{ color: '#fff', fontSize: '20px', paddingLeft: '4px' }}>▶</span>
                    </div>
                  </div>
                  <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(255,255,255,0.9)', padding: '3px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, color: '#374151' }}>
                    {video.category || 'General'}
                  </div>
                </div>

                {/* Info */}
                <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginBottom: '6px', lineHeight: 1.35 }}>{video.title}</h3>
                  {video.description && <p style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.5, marginBottom: '10px', flex: 1 }}>{video.description.slice(0, 100)}{video.description.length > 100 ? '…' : ''}</p>}

                  {Array.isArray(video.tags) && video.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' }}>
                      {video.tags.slice(0, 3).map((tag, i) => (
                        <span key={i} style={{ background: '#f0fdf4', color: '#15803d', fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: '6px' }}>#{tag}</span>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                    <a href={video.url || video.videoUrl} target="_blank" rel="noreferrer" style={{ background: '#fee2e2', color: '#dc2626', padding: '6px 12px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <ExternalLink size={13} /> Watch
                    </a>
                    <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => openEdit(video)}>
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(vid)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '580px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '24px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Youtube size={20} style={{ color: '#dc2626' }} />
                {isEditing ? 'Edit Video' : 'Add New Video'}
              </h2>
              <button onClick={() => setModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={22} /></button>
            </div>

            <div style={{ padding: '24px 28px', display: 'grid', gap: '16px' }}>
              <div>
                <label className="form-label">Video Title *</label>
                <input className="form-control" placeholder="e.g. How to use BlastShield on Paddy" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>

              <div>
                <label className="form-label">YouTube / Video URL *</label>
                <input className="form-control" placeholder="https://www.youtube.com/watch?v=..." value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
                {form.url && getYouTubeId(form.url) && (
                  <div style={{ marginTop: '10px', borderRadius: '10px', overflow: 'hidden', height: '160px' }}>
                    <img src={`https://img.youtube.com/vi/${getYouTubeId(form.url)}/hqdefault.jpg`} alt="thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label">Category</label>
                  <select className="form-control" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {VIDEO_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Tags (comma-separated)</label>
                  <input className="form-control" placeholder="e.g. Paddy, Blast, Fungicide" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="form-label">Description (optional)</label>
                <textarea className="form-control" rows={3} placeholder="Brief description of what this video covers..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>

            <div style={{ padding: '20px 28px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Youtube size={16} />
                {isEditing ? 'Update Video' : 'Add Video'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
