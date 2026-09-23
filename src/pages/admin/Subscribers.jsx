import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import {
  ADVISORY_GREETING, CROP_GROUPS, MESSAGE_MAX_LENGTH, OTHER_GROUP, SEASONS,
  cropGroupKey, cropGroupLabel, isActiveSubscriber, renderAdvisory, selectRecipients,
} from '../../shared/advisoryRules.js'

const SUBS = [
  { name: 'Rameshwar Patel', phone: '9845012345', crop: 'Paddy / Rice', season: 'Kharif', acres: 5, village: 'Karur', date: '2026-08-30' },
  { name: 'Suresh Pillai',   phone: '9751234567', crop: 'Cotton',      season: 'Kharif', acres: 8, village: 'Coimbatore', date: '2026-08-29' },
  { name: 'Meena Devi',      phone: '9942345678', crop: 'Tomato',      season: 'Rabi',   acres: 2, village: 'Salem', date: '2026-08-28' },
]

const ALL_GROUPS = [...CROP_GROUPS, OTHER_GROUP]
const PLACEHOLDERS = ['{name}', '{crop}', '{season}', '{acres}']
const STATUS_LABEL = { sending: 'Sending', completed: 'Completed', cancelled: 'Cancelled' }
const errorMessage = (err, fallback) => err.response?.data?.message || fallback

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('en-IN') : '')

function progressOf(broadcast) {
  const c = broadcast?.counts || {}
  const done = (c.sent || 0) + (c.failed || 0) + (c.skipped || 0) + (c.cancelled || 0)
  return { ...c, done, pct: c.total ? Math.round((done / c.total) * 100) : 0 }
}

export default function AdminSubscribers() {
  const [subscribers, setSubscribers] = useState(SUBS)
  const [cropFilter, setCropFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [broadcasts, setBroadcasts] = useState([])
  const [composerOpen, setComposerOpen] = useState(false)
  const [running, setRunning] = useState(null)
  const [pausedNote, setPausedNote] = useState('')
  const driving = useRef(null)

  const loadSubscribers = useCallback(() => axios.get('/api/advisory/subscribers')
    .then(({ data }) => setSubscribers(data.data || []))
    .catch(() => setSubscribers(SUBS)), [])

  const loadBroadcasts = useCallback(() => axios.get('/api/advisory/broadcasts')
    .then(({ data }) => setBroadcasts(data.data || []))
    .catch(() => {}), [])

  useEffect(() => {
    loadSubscribers()
    loadBroadcasts()
    return () => { driving.current = null }
  }, [loadSubscribers, loadBroadcasts])

  // Sends a broadcast batch by batch until it finishes, is cancelled or the page closes.
  const drive = useCallback(async (broadcast) => {
    driving.current = broadcast.id
    setRunning(broadcast)
    setPausedNote('')
    let current = broadcast
    while (driving.current === broadcast.id && current.status === 'sending') {
      try {
        const { data } = await axios.post(`/api/advisory/broadcasts/${broadcast.id}/process`)
        current = data.data
        if (driving.current !== broadcast.id) break
        setRunning(current)
        setPausedNote(data.paused || '')
        if (data.paused) await new Promise(resolve => setTimeout(resolve, 5000))
      } catch (err) {
        setPausedNote(errorMessage(err, 'Connection problem. Retrying…'))
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }
    if (driving.current === broadcast.id) {
      driving.current = null
      if (current.status === 'completed') toast.success(`Advisory sent to ${current.counts?.sent || 0} farmers`)
      loadSubscribers()
      loadBroadcasts()
    }
  }, [loadSubscribers, loadBroadcasts])

  const cancelRun = async () => {
    if (!running) return
    try {
      const { data } = await axios.post(`/api/advisory/broadcasts/${running.id}/cancel`)
      driving.current = null
      setRunning(data.data)
      toast('Broadcast stopped. Farmers already messaged are not affected.')
      loadBroadcasts()
    } catch (err) {
      toast.error(errorMessage(err, 'Could not stop the broadcast'))
    }
  }

  const closeRun = () => {
    driving.current = null
    setRunning(null)
    loadBroadcasts()
  }

  const toggleStatus = async (sub) => {
    const status = isActiveSubscriber(sub) ? 'Unsubscribed' : 'Active'
    try {
      await axios.patch(`/api/advisory/subscribers/${sub.id}`, { status })
      toast.success(status === 'Active' ? `${sub.phone} will receive advisories again` : `${sub.phone} will no longer receive advisories`)
      loadSubscribers()
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update the subscriber'))
    }
  }

  const groupCounts = useMemo(() => {
    const counts = {}
    for (const sub of subscribers) {
      const key = cropGroupKey(sub.crop)
      counts[key] = (counts[key] || 0) + 1
    }
    return counts
  }, [subscribers])

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return subscribers.filter(sub => (cropFilter === 'all' || cropGroupKey(sub.crop) === cropFilter)
      && (!needle || [sub.name, sub.phone, sub.crop, sub.village].some(v => String(v || '').toLowerCase().includes(needle))))
  }, [subscribers, cropFilter, search])

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div><h1>📩 Advisory Subscribers</h1><p>{subscribers.length.toLocaleString()} farmers registered</p></div>
        <button className="btn btn-primary" onClick={() => setComposerOpen(true)} disabled={!!running && running.status === 'sending'}>📲 WhatsApp Broadcast</button>
      </div>

      <div className="adv-filters">
        <div className="adv-chips" role="tablist" aria-label="Filter by crop">
          <button className={`adv-chip${cropFilter === 'all' ? ' active' : ''}`} onClick={() => setCropFilter('all')}>All <span>{subscribers.length}</span></button>
          {ALL_GROUPS.filter(g => groupCounts[g.key]).map(g => (
            <button key={g.key} className={`adv-chip${cropFilter === g.key ? ' active' : ''}`} onClick={() => setCropFilter(g.key)}>
              {g.label} <span>{groupCounts[g.key]}</span>
            </button>
          ))}
        </div>
        <input className="form-input adv-search" type="search" placeholder="Search name, phone, crop" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Farmer</th><th>Phone</th><th>Crop</th><th>Season</th><th>Acres</th><th>Last advisory</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              {visible.map((s, i) => (
                <tr key={s.id || i} className={isActiveSubscriber(s) ? '' : 'adv-row-off'}>
                  <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td><span className="badge badge-green">📱 {s.phone}</span></td>
                  <td>{s.crop}<div className="adv-sub">{cropGroupLabel(cropGroupKey(s.crop))}</div></td>
                  <td><span className="badge badge-blue">{s.season}</span></td>
                  <td>{s.acres || s.acreage || 0} ac</td>
                  <td>{s.lastAdvisorySent ? <>{s.lastAdvisorySent}<div className="adv-sub">{formatDate(s.lastAdvisoryAt)}</div></> : <span className="adv-sub">None yet</span>}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{s.date || formatDate(s.subscribedAt)}</td>
                  <td>
                    {s.id
                      ? <button className={`adv-status${isActiveSubscriber(s) ? ' on' : ''}`} onClick={() => toggleStatus(s)} title={isActiveSubscriber(s) ? 'Click to stop advisories' : 'Click to resume advisories'}>
                          {isActiveSubscriber(s) ? 'Active' : 'Unsubscribed'}
                        </button>
                      : <span className="adv-sub">—</span>}
                  </td>
                </tr>
              ))}
              {!visible.length && <tr><td colSpan={9} className="adv-empty">No subscribers match.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card adv-history">
        <h3>Broadcast history</h3>
        {!broadcasts.length && <p className="adv-sub">No advisories sent yet.</p>}
        {broadcasts.map(b => {
          const p = progressOf(b)
          return (
            <div key={b.id} className="adv-history-row">
              <div className="adv-history-main">
                <strong>{b.title}</strong>
                <div className="adv-sub">
                  {(b.crops || []).map(cropGroupLabel).join(', ')}{b.seasons?.length ? ` · ${b.seasons.join(', ')}` : ''} · {new Date(b.createdAt).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="adv-history-counts">
                <span className="adv-count sent">{p.sent || 0} sent</span>
                {!!p.failed && <span className="adv-count failed">{p.failed} failed</span>}
                {!!p.skipped && <span className="adv-count skipped">{p.skipped} not on WhatsApp</span>}
                <span className="adv-sub">of {p.total || 0}</span>
              </div>
              <span className={`adv-state ${b.status}`}>{STATUS_LABEL[b.status] || b.status}</span>
              {b.status === 'sending' && running?.id !== b.id && (
                <button className="btn btn-secondary btn-sm" onClick={() => drive(b)}>Resume</button>
              )}
            </div>
          )
        })}
      </div>

      {composerOpen && (
        <BroadcastComposer
          subscribers={subscribers}
          onClose={() => setComposerOpen(false)}
          onStarted={(broadcast) => { setComposerOpen(false); drive(broadcast) }}
        />
      )}

      {running && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Sending advisory">
          <div className="modal adv-progress">
            <div className="modal-header">
              <div className="modal-title">{running.status === 'sending' ? 'Sending advisory…' : `Broadcast ${STATUS_LABEL[running.status]?.toLowerCase() || running.status}`}</div>
            </div>
            <div className="adv-progress-body">
              <strong>{running.title}</strong>
              {(() => {
                const p = progressOf(running)
                return (
                  <>
                    <div className="adv-bar"><span style={{ width: `${p.pct}%` }} /></div>
                    <div className="adv-history-counts">
                      <span className="adv-count sent">{p.sent || 0} sent</span>
                      <span className="adv-count failed">{p.failed || 0} failed</span>
                      <span className="adv-count skipped">{p.skipped || 0} not on WhatsApp</span>
                      <span className="adv-sub">{p.done} / {p.total}</span>
                    </div>
                  </>
                )
              })()}
              {running.status === 'sending' && (
                <p className="adv-sub">
                  Messages go out about one every 5 seconds per WhatsApp number to keep the numbers safe from bans.
                  {pausedNote && <><br /><em>{pausedNote}</em></>}
                </p>
              )}
            </div>
            <div className="adv-modal-footer">
              {running.status === 'sending'
                ? <>
                    <button className="btn btn-secondary" onClick={closeRun}>Continue later</button>
                    <button className="btn btn-danger" onClick={cancelRun}>Stop broadcast</button>
                  </>
                : <button className="btn btn-primary" onClick={closeRun}>Done</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BroadcastComposer({ subscribers, onClose, onStarted }) {
  const [crops, setCrops] = useState([])
  const [seasons, setSeasons] = useState([])
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [sending, setSending] = useState(false)
  const textRef = useRef(null)

  const recipients = useMemo(() => selectRecipients(subscribers, { crops, seasons }), [subscribers, crops, seasons])
  const activeByGroup = useMemo(() => {
    const counts = {}
    for (const sub of selectRecipients(subscribers, { crops: ALL_GROUPS.map(g => g.key), seasons })) {
      const key = cropGroupKey(sub.crop)
      counts[key] = (counts[key] || 0) + 1
    }
    return counts
  }, [subscribers, seasons])

  const toggle = (list, setList, value) => {
    setConfirming(false)
    setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value])
  }

  // Fills the message with the Tamil + English greeting (no crop advice) for
  // the admin to add to. Asks first rather than wiping something typed.
  const useTemplate = () => {
    if (message.trim() && message !== ADVISORY_GREETING && !window.confirm('Replace your message with the crop greeting template?')) return
    setMessage(ADVISORY_GREETING)
    setConfirming(false)
    if (!title) setTitle(`${crops.length ? crops.map(cropGroupLabel).join(', ') : 'Crop'} greetings`)
    requestAnimationFrame(() => {
      const el = textRef.current
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length) }
    })
  }

  const insertPlaceholder = (token) => {
    const el = textRef.current
    const start = el?.selectionStart ?? message.length
    const end = el?.selectionEnd ?? message.length
    setMessage(message.slice(0, start) + token + message.slice(end))
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + token.length, start + token.length) })
  }

  const sample = recipients[0] || { name: 'Murugan', crop: 'Paddy / Rice Farmer', season: 'Kharif', acreage: 3 }
  const canSend = crops.length && recipients.length && message.trim().length >= 10 && message.length <= MESSAGE_MAX_LENGTH

  const start = async () => {
    if (!confirming) return setConfirming(true)
    setSending(true)
    try {
      const { data } = await axios.post('/api/advisory/broadcasts', { title, message, crops, seasons })
      onStarted(data.data)
    } catch (err) {
      toast.error(errorMessage(err, 'Could not start the broadcast'))
      setSending(false)
      setConfirming(false)
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="WhatsApp advisory broadcast" onClick={e => e.target === e.currentTarget && !sending && onClose()}>
      <div className="modal modal-xl adv-composer">
        <div className="modal-header">
          <div className="modal-title">📲 WhatsApp Crop Advisory</div>
          <button className="modal-close" onClick={onClose} disabled={sending} aria-label="Close">✕</button>
        </div>

        <div className="adv-composer-grid">
          <div className="adv-composer-form">
            <div className="form-group">
              <label className="form-label">1. Which crops?</label>
              <div className="adv-chips">
                {ALL_GROUPS.map(g => (
                  <button key={g.key} type="button" className={`adv-chip${crops.includes(g.key) ? ' active' : ''}`}
                    onClick={() => toggle(crops, setCrops, g.key)} disabled={!activeByGroup[g.key]}>
                    {g.label} <span>{activeByGroup[g.key] || 0}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Season <span className="adv-sub">(none selected = all seasons)</span></label>
              <div className="adv-chips">
                {SEASONS.map(s => (
                  <button key={s} type="button" className={`adv-chip${seasons.includes(s) ? ' active' : ''}`} onClick={() => toggle(seasons, setSeasons, s)}>{s}</button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="adv-title">2. Advisory title <span className="adv-sub">(shown in history and on each farmer)</span></label>
              <input id="adv-title" className="form-input" maxLength={80} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Paddy blast alert — Week 4" />
            </div>

            <div className="form-group">
              <div className="adv-label-row">
                <label className="form-label" htmlFor="adv-message">3. Message</label>
                <button type="button" className="btn btn-secondary btn-sm" onClick={useTemplate}>Use crop template</button>
              </div>
              <textarea id="adv-message" ref={textRef} className="form-textarea adv-textarea" value={message}
                onChange={e => { setMessage(e.target.value); setConfirming(false) }} placeholder="Write the advisory. Use {name} and {crop} to personalise it." />
              <div className="adv-label-row">
                <div className="adv-chips">
                  {PLACEHOLDERS.map(p => <button key={p} type="button" className="adv-chip small" onClick={() => insertPlaceholder(p)}>{p}</button>)}
                </div>
                <span className={`adv-sub${message.length > MESSAGE_MAX_LENGTH ? ' adv-over' : ''}`}>{message.length} / {MESSAGE_MAX_LENGTH}</span>
              </div>
            </div>
          </div>

          <div className="adv-preview">
            <div className="adv-preview-head">Preview for {sample.name && sample.name !== 'Farmer Partner' ? sample.name : 'a farmer'} · {sample.phone || 'sample'}</div>
            <div className="adv-bubble">{message.trim() ? renderAdvisory(message, sample) : 'Your message will appear here.'}</div>
            <div className="adv-audience">
              <strong>{recipients.length}</strong> farmer{recipients.length === 1 ? '' : 's'} will receive this
              <div className="adv-sub">Active subscribers only, one message per phone number.</div>
              {!!recipients.length && (
                <div className="adv-sub">~{Math.max(1, Math.ceil((recipients.length * 6) / 60))} min to send</div>
              )}
            </div>
          </div>
        </div>

        <div className="adv-modal-footer">
          {confirming && <span className="adv-confirm">Send to {recipients.length} farmers on WhatsApp? This cannot be undone.</span>}
          <button className="btn btn-secondary" onClick={onClose} disabled={sending}>Cancel</button>
          <button className="btn btn-primary" onClick={start} disabled={!canSend || sending}>
            {sending ? 'Starting…' : confirming ? 'Yes, send now' : `Send to ${recipients.length}`}
          </button>
        </div>
      </div>
    </div>
  )
}
