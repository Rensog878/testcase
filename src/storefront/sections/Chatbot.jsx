import { memo, useEffect, useRef, useState } from 'react'
import { useStore } from '../StoreContext'
import { WHATSAPP_EXPERT_URL } from '../data'

const QUICK_CHATS = [
  ['What is the best pesticide for Paddy Blast?', '🌾 Paddy Blast Remedy'],
  ['How to control Cotton Whitefly?', '🐛 Cotton Whitefly'],
  ['How to test soil health?', '🌱 Soil Test Guide'],
  ['I want to speak with an agronomist', '📞 Call Agronomist'],
]
const SMALL_BUTTON = { padding: '4px 10px', fontSize: '0.75rem', marginTop: '6px' }

// Canned answers to common crop questions.
function replyTo(text, addToCart) {
  const lower = text.toLowerCase()
  const cartButton = (productId, label) => (
    <button className="btn btn-primary" style={SMALL_BUTTON} onClick={() => addToCart(productId)}><i className="fa-solid fa-cart-plus"></i> {label}</button>
  )
  const whatsAppButton = label => (
    <a className="btn btn-gold" style={SMALL_BUTTON} href={WHATSAPP_EXPERT_URL} target="_blank" rel="noopener noreferrer"><i className="fa-brands fa-whatsapp"></i> {label}</a>
  )

  if (lower.includes('blast') || lower.includes('paddy')) {
    return <>🌾 <strong>Paddy Blast Defense:</strong> We recommend <strong>Sathyam Bio BlastShield 75 WP</strong> (₹680) or <strong>Pseudomonas 1% WP</strong>.<br />{cartButton('sb-01', 'Add BlastShield to Cart')}</>
  }
  if (lower.includes('whitefly') || lower.includes('cotton')) {
    return <>🐛 <strong>Cotton Whitefly Defense:</strong> Use <strong>Sathyam Bio FlyKill Ultra</strong> (₹840) or <strong>NeemGuard 10000 PPM</strong> (₹580). Spray early morning.<br />{cartButton('sb-02', 'Add FlyKill Ultra to Cart')}</>
  }
  if (lower.includes('soil')) {
    return <>🌱 <strong>Soil Health:</strong> Send your soil test report to our agronomists on WhatsApp for N-P-K nutrient recommendations.<br />{whatsAppButton('Send it on WhatsApp')}</>
  }
  if (lower.includes('agronomist') || lower.includes('speak') || lower.includes('doctor')) {
    return <>📞 <strong>Senior Agronomist Consultation:</strong> Call toll-free <strong>1800-425-9999</strong> or chat with an agronomist on WhatsApp.<br />{whatsAppButton('Chat with an Agronomist')}</>
  }
  if (lower.includes('weed') || lower.includes('herbicide')) {
    return <>🌿 <strong>Weed Control:</strong> Use <strong>WeedClear 24-D</strong> (₹340) for broadleaf weeds or <strong>GrassOut 10 EC</strong> (₹480) for grass weeds.<br />{cartButton('sb-26', 'Add WeedClear to Cart')}</>
  }
  return <>🌿 <strong>Sathyam Bio Crop Assistant:</strong> We offer 35+ bio-certified pesticides and crop nutrients for Paddy, Cotton, Tomato, Wheat, Sugarcane, and Grapes. Filter products by crop or disease above!</>
}

export default memo(function Chatbot({ t }) {
  const { addToCart } = useStore()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)
  const messagesRef = useRef(null)
  const timers = useRef([])
  const nextId = useRef(0)

  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])
  useEffect(() => {
    const box = messagesRef.current
    if (box) box.scrollTop = box.scrollHeight
  }, [messages])

  const send = text => {
    const add = (sender, content) => setMessages(current => [...current, { id: nextId.current++, sender, content }])
    add('user', text)
    timers.current.push(setTimeout(() => add('bot', replyTo(text, addToCart)), 500))
  }

  const sendDraft = () => {
    const text = draft.trim()
    if (!text) return
    send(text)
    setDraft('')
  }

  return (
    <>
      <div className="chatbot-trigger-btn" id="chatbotTriggerBtn" onClick={() => setOpen(current => !current)} role="button" tabIndex={0} aria-label="Chat assistant">
        <i className={open ? 'fa-solid fa-xmark' : 'fa-solid fa-comments'}></i>
      </div>

      <div className={`chatbot-window${open ? ' active' : ''}`} id="chatbotWindow">
        <div className="chatbot-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-robot"></i>
            <div>
              <span style={{ fontWeight: 700, display: 'block' }} data-i18n="chatbot_title">{t('chatbot_title')}</span>
              <span style={{ fontSize: '0.7rem', color: '#DCEFE4' }}>● Online 24/7 (Instant Response)</span>
            </div>
          </div>
          <button id="chatbotCloseBtn" onClick={() => setOpen(false)} style={{ background: 'transparent', color: 'white', fontSize: '1.2rem', cursor: 'pointer' }} aria-label="Close chat">&times;</button>
        </div>
        <div className="chatbot-messages" id="chatbotMessages" ref={messagesRef}>
          <div className="chat-msg bot-msg" data-i18n="chat_welcome">{t('chat_welcome')}</div>
          <div className="chat-chip-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
            {QUICK_CHATS.map(([question, label]) => (
              <button key={question} className="chat-quick-chip" onClick={() => { setOpen(true); send(question) }}>{label}</button>
            ))}
          </div>
          {messages.map(message => (
            <div key={message.id} className={`chat-msg ${message.sender === 'user' ? 'user-msg' : 'bot-msg'}`}>{message.content}</div>
          ))}
        </div>
        <div className="chatbot-input-row">
          <input
            ref={inputRef}
            type="text"
            id="chatbotInput"
            data-i18n-placeholder="chat_placeholder"
            placeholder={t('chat_placeholder')}
            value={draft}
            onChange={event => setDraft(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter') sendDraft() }}
          />
          <button id="chatbotSendBtn" onClick={sendDraft} aria-label="Send"><i className="fa-solid fa-paper-plane"></i></button>
        </div>
      </div>
    </>
  )
})
