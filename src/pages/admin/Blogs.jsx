import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import {
  Plus, Edit2, Trash2, X, Search, Eye, EyeOff,
  BookOpen, Upload, Tag, Video, Sprout, Bold, Italic,
  Heading2, List, Quote, Minus, Plus as PlusIcon
} from 'lucide-react'

const BLOG_CATEGORIES = ['Crop Advisory', 'Pest Management', 'Organic Farming', 'Bio-Fungicides', 'Soil Health', 'Farmer Guides', 'General']

const emptyForm = {
  title: '',
  summary: '',
  content: '',
  category: 'Crop Advisory',
  author: '',
  coverImage: '',
  tags: '',
  readTime: '',
  published: false,
  taggedProducts: [],
  taggedVideos: []
}

export default function AdminBlogs() {
  const [blogs, setBlogs] = useState([])
  const [products, setProducts] = useState([])
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [uploading, setUploading] = useState(false)
  const [editorFontSize, setEditorFontSize] = useState(17)
  const fileRef = useRef(null)
  const contentRef = useRef(null)

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [bRes, pRes, vRes] = await Promise.all([
        axios.get('/api/blogs', { headers: authHeader() }),
        axios.get('/api/products'),
        axios.get('/api/videos')
      ])
      if (bRes.data.success) setBlogs(bRes.data.data || [])
      if (pRes.data.success) setProducts(pRes.data.data || [])
      if (vRes.data.success) setVideos(vRes.data.data || [])
    } catch (err) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const authHeader = () => {
    const user = JSON.parse(localStorage.getItem('sathya_user') || '{}')
    const token = user.token || localStorage.getItem('sathya_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const openCreate = () => {
    setIsEditing(null)
    setForm(emptyForm)
    setEditorFontSize(17)
    setModalOpen(true)
  }

  const openEdit = (blog) => {
    setIsEditing(blog._id || blog.id)
    setForm({
      title: blog.title || '',
      summary: blog.summary || '',
      content: blog.content || '',
      category: blog.category || 'Crop Advisory',
      author: blog.author || '',
      coverImage: blog.coverImage || '',
      tags: Array.isArray(blog.tags) ? blog.tags.join(', ') : (blog.tags || ''),
      readTime: blog.readTime || '',
      published: !!blog.published,
      taggedProducts: blog.taggedProducts || [],
      taggedVideos: blog.taggedVideos || []
    })
    setEditorFontSize(17)
    setModalOpen(true)
  }

  const insertMarkdown = (prefix, suffix = prefix, placeholder = 'your text') => {
    const editor = contentRef.current
    if (!editor) return
    const start = editor.selectionStart
    const end = editor.selectionEnd
    const selected = form.content.slice(start, end) || placeholder
    const nextContent = `${form.content.slice(0, start)}${prefix}${selected}${suffix}${form.content.slice(end)}`
    setForm(f => ({ ...f, content: nextContent }))
    requestAnimationFrame(() => {
      editor.focus()
      const selectionStart = start + prefix.length
      editor.setSelectionRange(selectionStart, selectionStart + selected.length)
    })
  }

  const insertLinePrefix = (prefix) => {
    const editor = contentRef.current
    if (!editor) return
    const start = editor.selectionStart
    const lineStart = form.content.lastIndexOf('\n', start - 1) + 1
    const nextContent = `${form.content.slice(0, lineStart)}${prefix}${form.content.slice(lineStart)}`
    setForm(f => ({ ...f, content: nextContent }))
    requestAnimationFrame(() => {
      editor.focus()
      editor.setSelectionRange(start + prefix.length, start + prefix.length)
    })
  }

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Blog title is required'); return }
    if (!form.content.trim()) { toast.error('Blog content is required'); return }

    const payload = {
      ...form,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : []
    }

    try {
      if (isEditing) {
        const { data } = await axios.put(`/api/blogs/${isEditing}`, payload, { headers: authHeader() })
        if (data.success) {
          toast.success('Blog updated!')
          setBlogs(prev => prev.map(b => (b._id === isEditing || b.id === isEditing) ? data.data : b))
        }
      } else {
        const { data } = await axios.post('/api/blogs', payload, { headers: authHeader() })
        if (data.success) {
          toast.success('Blog published!')
          setBlogs(prev => [data.data, ...prev])
        }
      }
      setModalOpen(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this blog article permanently?')) return
    try {
      await axios.delete(`/api/blogs/${id}`, { headers: authHeader() })
      toast.success('Blog deleted')
      setBlogs(prev => prev.filter(b => b._id !== id && b.id !== id))
    } catch {
      toast.error('Delete failed')
    }
  }

  const handleTogglePublish = async (blog) => {
    const id = blog._id || blog.id
    try {
      const { data } = await axios.put(`/api/blogs/${id}`, { ...blog, published: !blog.published }, { headers: authHeader() })
      if (data.success) {
        setBlogs(prev => prev.map(b => (b._id === id || b.id === id) ? data.data : b))
        toast.success(!blog.published ? 'Blog published!' : 'Blog unpublished')
      }
    } catch {
      toast.error('Failed to toggle publish status')
    }
  }

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    setUploading(true)
    try {
      const { data } = await axios.post('/api/upload', fd, { headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' } })
      if (data.url) {
        setForm(f => ({ ...f, coverImage: data.url }))
        toast.success('Image uploaded!')
      }
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const toggleTaggedItem = (field, id) => {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(id) ? f[field].filter(x => x !== id) : [...f[field], id]
    }))
  }

  const filtered = blogs.filter(b =>
    !search.trim() ||
    (b.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (b.category || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookOpen size={24} style={{ color: '#16a34a' }} />
            Blog Management
          </h1>
          <p className="page-subtitle">Write and publish agronomy articles, guides, and seasonal advisories</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> Write New Blog
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '24px', maxWidth: '400px' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
        <input
          type="text"
          placeholder="Search blog articles..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="form-control"
          style={{ paddingLeft: '36px' }}
        />
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Total Articles', value: blogs.length, icon: '📝', color: '#e0f2fe' },
          { label: 'Published', value: blogs.filter(b => b.published).length, icon: '✅', color: '#dcfce7' },
          { label: 'Drafts', value: blogs.filter(b => !b.published).length, icon: '📋', color: '#fef9c3' }
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

      {/* Blog Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>Loading blogs...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px', background: '#f9fafb', borderRadius: '18px', border: '1px dashed #d1d5db' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📖</div>
          <h3 style={{ fontWeight: 700, color: '#1f2937', marginBottom: '8px' }}>No Blog Articles Yet</h3>
          <p style={{ color: '#6b7280', marginBottom: '20px' }}>Start writing agronomy guides and seasonal advisories for your farmers.</p>
          <button className="btn btn-primary" onClick={openCreate} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} /> Write First Blog
          </button>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Article', 'Category', 'Author', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(blog => {
                const dateStr = blog.createdAt ? new Date(blog.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'
                return (
                  <tr key={blog._id || blog.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {blog.coverImage ? (
                          <img src={blog.coverImage} alt="" style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', background: '#e2e8f0' }} />
                        ) : (
                          <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📖</div>
                        )}
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{blog.title}</div>
                          <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '2px' }}>{(blog.summary || '').slice(0, 60)}{blog.summary?.length > 60 ? '…' : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ background: '#f0fdf4', color: '#15803d', padding: '3px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600 }}>{blog.category || 'General'}</span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#374151', fontSize: '0.875rem' }}>{blog.author || 'Agronomy Team'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <button
                        onClick={() => handleTogglePublish(blog)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem', background: blog.published ? '#dcfce7' : '#fef3c7', color: blog.published ? '#15803d' : '#92400e' }}
                      >
                        {blog.published ? <><Eye size={13} /> Published</> : <><EyeOff size={13} /> Draft</>}
                      </button>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '0.85rem' }}>{dateStr}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => openEdit(blog)}>
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(blog._id || blog.id)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="blog-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px', overflowY: 'auto' }}>
          <div className="blog-modal" style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '820px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', marginTop: '20px' }}>
            {/* Modal Header */}
            <div className="blog-modal-header" style={{ padding: '24px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.3rem', color: '#0f172a', margin: 0 }}>
                {isEditing ? 'Edit Blog Article' : 'Write New Blog Article'}
              </h2>
              <button onClick={() => setModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={22} /></button>
            </div>

            {/* Modal Body */}
            <div className="blog-modal-body" style={{ padding: '28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>

              {/* Title - Full Width */}
              <div className="blog-field blog-field-full blog-field-title">
                <div className="blog-field-heading">
                  <label className="form-label" htmlFor="blog-title">Blog title <span>*</span></label>
                  <span>Give your article a clear, searchable name</span>
                </div>
                <input id="blog-title" className="form-control" placeholder="How to control Blast disease in Paddy" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>

              {/* Category & Author */}
              <div className="blog-field">
                <label className="form-label" htmlFor="blog-category">Category</label>
                <select id="blog-category" className="form-control" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {BLOG_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="blog-field">
                <label className="form-label" htmlFor="blog-author">Author</label>
                <input id="blog-author" className="form-control" placeholder="e.g. Dr. Suresh Rajan" value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} />
              </div>

              {/* Summary - Full Width */}
              <div className="blog-field blog-field-full">
                <div className="blog-field-heading">
                  <label className="form-label" htmlFor="blog-summary">Summary / teaser</label>
                  <span>Shown on the blog card before readers open the article</span>
                </div>
                <textarea id="blog-summary" className="form-control blog-summary-input" rows={3} maxLength={240} placeholder="In 1-2 sentences, tell farmers what they will learn..." value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} />
                <div className="blog-field-counter">{form.summary.length}/240</div>
              </div>

              {/* Content - Full Width */}
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="blog-editor-label-row">
                  <label className="form-label" style={{ marginBottom: 0 }}>Article Content *</label>
                  <span className="blog-editor-hint">Markdown is supported</span>
                </div>
                <div className="blog-editor">
                  <div className="blog-editor-toolbar" role="toolbar" aria-label="Article formatting">
                    <div className="blog-editor-tool-group">
                      <button type="button" className="blog-editor-tool" title="Bold" aria-label="Bold" onClick={() => insertMarkdown('**')}><Bold size={16} /></button>
                      <button type="button" className="blog-editor-tool" title="Italic" aria-label="Italic" onClick={() => insertMarkdown('*')}><Italic size={16} /></button>
                      <button type="button" className="blog-editor-tool" title="Heading" aria-label="Heading" onClick={() => insertLinePrefix('## ')}><Heading2 size={17} /></button>
                      <button type="button" className="blog-editor-tool" title="Bullet list" aria-label="Bullet list" onClick={() => insertLinePrefix('- ')}><List size={17} /></button>
                      <button type="button" className="blog-editor-tool" title="Quote" aria-label="Quote" onClick={() => insertLinePrefix('> ')}><Quote size={17} /></button>
                    </div>
                    <div className="blog-editor-toolbar-divider" />
                    <div className="blog-editor-size-control" aria-label="Editor text size">
                      <span>Text size</span>
                      <button type="button" className="blog-editor-tool blog-editor-size-button" title="Decrease text size" aria-label="Decrease text size" onClick={() => setEditorFontSize(size => Math.max(14, size - 1))}><Minus size={14} /></button>
                      <strong>{editorFontSize}px</strong>
                      <button type="button" className="blog-editor-tool blog-editor-size-button" title="Increase text size" aria-label="Increase text size" onClick={() => setEditorFontSize(size => Math.min(24, size + 1))}><PlusIcon size={14} /></button>
                    </div>
                  </div>
                  <textarea
                    ref={contentRef}
                    className="blog-editor-input"
                    aria-label="Article content"
                    placeholder="Start writing your article...\n\nUse the toolbar to add headings, emphasis, lists, and quotes. Separate paragraphs with a blank line."
                    value={form.content}
                    onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                    style={{ fontSize: `${editorFontSize}px` }}
                  />
                  <div className="blog-editor-footer">
                    <span>{form.content.trim() ? form.content.trim().split(/\s+/).length : 0} words</span>
                    <span>{form.content.length} characters</span>
                  </div>
                </div>
              </div>

              {/* Cover Image */}
              <div>
                <label className="form-label">Cover Image URL</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input className="form-control" placeholder="https://... or upload below" value={form.coverImage} onChange={e => setForm(f => ({ ...f, coverImage: e.target.value }))} />
                  <button onClick={() => fileRef.current?.click()} style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                    <Upload size={15} /> {uploading ? 'Uploading...' : 'Upload'}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverUpload} />
                </div>
                {form.coverImage && <img src={form.coverImage} alt="preview" style={{ marginTop: '10px', height: '80px', borderRadius: '8px', objectFit: 'cover' }} />}
              </div>

              {/* Read Time & Tags */}
              <div>
                <label className="form-label">Read Time</label>
                <input className="form-control" placeholder="e.g. 5 min read" value={form.readTime} onChange={e => setForm(f => ({ ...f, readTime: e.target.value }))} />
              </div>

              {/* Tags - Full width */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label"><Tag size={14} style={{ verticalAlign: 'middle' }} /> Tags (comma-separated)</label>
                <input className="form-control" placeholder="e.g. Paddy, Blast, Fungicide, Kharif" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
              </div>

              {/* Tag Products */}
              {products.length > 0 && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label"><Sprout size={14} style={{ verticalAlign: 'middle' }} /> Tag Related Products (shown at bottom of article)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '140px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                    {products.map(p => {
                      const pid = p._id || p.id
                      const selected = form.taggedProducts.includes(pid)
                      return (
                        <button key={pid} type="button" onClick={() => toggleTaggedItem('taggedProducts', pid)}
                          style={{ padding: '5px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: selected ? '1.5px solid #15803d' : '1px solid #e2e8f0', background: selected ? '#dcfce7' : '#fff', color: selected ? '#15803d' : '#374151' }}>
                          {selected ? '✓ ' : ''}{p.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Tag Videos */}
              {videos.length > 0 && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label"><Video size={14} style={{ verticalAlign: 'middle' }} /> Tag Related Videos (embedded in article)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '120px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                    {videos.map(v => {
                      const vid = v._id || v.id
                      const selected = form.taggedVideos.includes(vid)
                      return (
                        <button key={vid} type="button" onClick={() => toggleTaggedItem('taggedVideos', vid)}
                          style={{ padding: '5px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: selected ? '1.5px solid #dc2626' : '1px solid #e2e8f0', background: selected ? '#fee2e2' : '#fff', color: selected ? '#dc2626' : '#374151' }}>
                          {selected ? '▶ ' : ''}🎬 {v.title}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Publish toggle */}
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, color: '#374151' }}>
                  <div
                    onClick={() => setForm(f => ({ ...f, published: !f.published }))}
                    style={{ width: '44px', height: '24px', borderRadius: '12px', background: form.published ? '#16a34a' : '#e2e8f0', position: 'relative', transition: 'background 0.2s', cursor: 'pointer' }}
                  >
                    <div style={{ position: 'absolute', top: '3px', left: form.published ? '22px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
                  </div>
                  {form.published ? '✅ Published — visible on website' : '📋 Draft — not visible publicly'}
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="blog-modal-footer" style={{ padding: '20px 28px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={16} />
                {isEditing ? 'Update Article' : 'Save & Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
