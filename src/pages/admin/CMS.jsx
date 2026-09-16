import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { toast } from 'sonner'

const DEFAULT_CONTENT = {
  heroTitle: 'Grow More. Protect Better. Farm Smarter.',
  heroSubtitle: 'India\'s most trusted source for premium bio-pesticides, crop protection, and agro-inputs — trusted by 15,000+ farmers.',
  banner: '🚜 Free Delivery on orders above ₹999 | Use code KISAN20 for 20% off first order',
  advisoryTitle: 'Get Weekly Crop & Pesticide Recommendations',
  advisoryDesc: 'Join 15,000+ farmers receiving our free seasonal advisory newsletter. Kharif & Rabi crop schedules, disease alerts, and exclusive offers every week.',
  phone: '+91-98450-12345',
  address: '14, Kavundampalayam, Coimbatore – 641030, Tamil Nadu',
  popupImage: '',
  popupAudience: 'all',
  popupBehavior: 'firstVisit',
  certificationsTitle: 'Certifications & Recognitions',
  certificationsSubtitle: '',
  certification1Image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=120&q=80',
  certification1Label: 'ICAR Approved',
  certification2Image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=120&q=80',
  certification2Label: 'ISO 9001:2015',
  certification3Image: 'https://images.unsplash.com/photo-1587614382346-4ec70e388b28?w=120&q=80',
  certification3Label: 'Organic India',
  certification4Image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=120&q=80',
  certification4Label: 'GreenTech 2025',
  certification5Image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=120&q=80',
  certification5Label: 'APEDA Member',
}

export default function AdminCMS() {
  const [content, setContent] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sathya_cms') || '{}') } catch { return {} }
  })
  const [saving, setSaving] = useState(false)

  // Load what is actually published, not just this browser's copy. Without
  // this, opening the editor on another machine showed the built-in defaults
  // and publishing from there would overwrite the live content with them.
  useEffect(() => {
    let cancelled = false
    axios.get('/api/cms')
      .then(({ data }) => {
        if (cancelled || !data?.success || !data.data) return
        setContent(current => ({ ...data.data, ...current }))
      })
      .catch(() => {}) // keep the local copy; the editor still works offline
    return () => { cancelled = true }
  }, [])

  const merged = { ...DEFAULT_CONTENT, ...content }
  const set = k => e => setContent(c => ({ ...c, [k]: e.target.value }))

  // Image fields accept a pasted URL or an upload. Uploads go to MongoDB via
  // /api/upload and come back as /api/upload/<id>, so the image survives a
  // deploy — the host has no writable disk. Sent as base64 JSON rather than
  // multipart so the server needs no extra dependency.
  const [uploadingKey, setUploadingKey] = useState('')
  const fileRefs = useRef({})

  const handleUpload = key => async event => {
    const file = event.target.files?.[0]
    event.target.value = '' // let the same file be re-picked after an error
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file')
      return
    }
    setUploadingKey(key)
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
      const { data } = await axios.post('/api/upload', {
        filename: file.name,
        contentType: file.type,
        data: dataUrl
      })
      if (data?.success && data.url) {
        setContent(c => ({ ...c, [key]: data.url }))
        toast.success('Image uploaded — publish to make it live')
      } else {
        toast.error(data?.message || 'Upload failed')
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Upload failed')
    } finally {
      setUploadingKey('')
    }
  }

  const save = async () => {
    setSaving(true)
    localStorage.setItem('sathya_cms', JSON.stringify(merged))
    try {
      await axios.put('/api/cms', merged)
      // Tell any open storefront tab to re-read immediately, so "live" means
      // live rather than "after the farmer reloads".
      try {
        if ('BroadcastChannel' in window) {
          const channel = new BroadcastChannel('sathya_cms')
          channel.postMessage('cms-changed')
          channel.close()
        }
      } catch {}
      toast.success('Content published live! ✅')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to publish content to server')
    } finally {
      setSaving(false)
    }
  }

  const fields = [
    { key: 'heroTitle',      label: '🏠 Hero Title',      type: 'input' },
    { key: 'heroSubtitle',   label: '📝 Hero Subtitle',   type: 'textarea' },
    { key: 'banner',         label: '📢 Promo Ticker — one promo per line (blank = keep the built-in promos)', type: 'textarea' },
    { key: 'advisoryTitle',  label: '🌾 Advisory Section Title', type: 'input' },
    { key: 'advisoryDesc',   label: '📩 Advisory Description', type: 'textarea' },
    { key: 'phone',          label: '📞 Support Phone', type: 'input' },
    { key: 'address',        label: '📍 Address', type: 'input' },
    { key: 'popupImage',     label: '🖼️ Welcome Popup Image URL', type: 'input' },
    { key: 'popupAudience',  label: '👨‍🌾 Popup Audience', type: 'select', options: [['all', 'All visitors'], ['farmer', 'Farmers only']] },
    { key: 'popupBehavior',  label: '🎯 Popup Behavior', type: 'select', options: [['firstVisit', 'First visit only'], ['returning', 'Returning visitors'], ['always', 'Every visit']] },
    { key: 'certificationsTitle', label: '🏅 Certifications Section Title', type: 'input' },
    { key: 'certificationsSubtitle', label: '📝 Certifications Section Subtitle', type: 'textarea' },
    { key: 'certification1Image', label: '🖼️ Certification 1 Image URL', type: 'input' },
    { key: 'certification1Label', label: '🏷️ Certification 1 Label', type: 'input' },
    { key: 'certification2Image', label: '🖼️ Certification 2 Image URL', type: 'input' },
    { key: 'certification2Label', label: '🏷️ Certification 2 Label', type: 'input' },
    { key: 'certification3Image', label: '🖼️ Certification 3 Image URL', type: 'input' },
    { key: 'certification3Label', label: '🏷️ Certification 3 Label', type: 'input' },
    { key: 'certification4Image', label: '🖼️ Certification 4 Image URL', type: 'input' },
    { key: 'certification4Label', label: '🏷️ Certification 4 Label', type: 'input' },
    { key: 'certification5Image', label: '🖼️ Certification 5 Image URL', type: 'input' },
    { key: 'certification5Label', label: '🏷️ Certification 5 Label', type: 'input' },
  ]

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div><h1>✏️ Live CMS Editor</h1><p>Edit website content — changes go live instantly</p></div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <><div className="spinner" /> Publishing...</> : '🚀 Publish Live'}
          </button>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {fields.map(f => (
            <div key={f.key} className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{f.label}</label>
              {f.type === 'textarea'
                ? <textarea className="form-textarea" value={merged[f.key]} onChange={set(f.key)} rows={f.key === 'banner' ? 6 : 3} />
                : f.type === 'select'
                  ? <select className="form-input" value={merged[f.key]} onChange={set(f.key)}>{f.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                  : f.key.endsWith('Image')
                    ? (
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input className="form-input" value={merged[f.key]} onChange={set(f.key)} placeholder="https://… or upload an image" />
                        <button
                          type="button"
                          className="btn"
                          onClick={() => fileRefs.current[f.key]?.click()}
                          disabled={uploadingKey === f.key}
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          {uploadingKey === f.key ? 'Uploading…' : '⬆ Upload'}
                        </button>
                        <input
                          ref={el => { fileRefs.current[f.key] = el }}
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handleUpload(f.key)}
                        />
                        {merged[f.key] && (
                          <img
                            src={merged[f.key]}
                            alt=""
                            style={{ height: '40px', width: '40px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--surface-border)' }}
                            onError={event => { event.currentTarget.style.visibility = 'hidden' }}
                          />
                        )}
                      </div>
                    )
                    : <input className="form-input" value={merged[f.key]} onChange={set(f.key)} />
              }
            </div>
          ))}
        </div>
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--surface-border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary btn-lg" onClick={save} disabled={saving}>
            {saving ? <><div className="spinner" /> Publishing...</> : '🚀 Publish All Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
