import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { showToast } from '../toast'
import { normalizeReferralCode, referralShareText, referralShareUrl } from '../../shared/referralLink'

// Signup: an optional friend's code. Filled in from a ?ref= link when there
// was one; otherwise hidden behind "Have a referral code?". The friend's name
// is shown once the server recognises the code. The server checks the code
// again when the account is made, so nothing here is trusted.
export function ReferralCodeField({ value, onChange }) {
  const [open, setOpen] = useState(Boolean(value))
  const [check, setCheck] = useState(null) // { valid, referrerName, welcomeDiscount, minOrder, message }
  const asked = useRef('')

  useEffect(() => {
    const code = normalizeReferralCode(value)
    if (!code) { setCheck(null); asked.current = ''; return }
    if (asked.current === code) return
    asked.current = code
    let current = true
    axios.get('/api/referrals/check', { params: { code } })
      .then(({ data }) => { if (current) setCheck(data) })
      .catch(() => { if (current) setCheck(null) })
    return () => { current = false }
  }, [value])

  if (!open) {
    return (
      <div className="auth-field ref-field-toggle">
        <button type="button" className="auth-link" onClick={() => setOpen(true)}>
          <i className="fa-solid fa-tag" aria-hidden="true"></i> Have a referral code?
        </button>
      </div>
    )
  }

  const typed = String(value || '').trim()
  const complete = Boolean(normalizeReferralCode(typed))
  return (
    <div className="auth-field">
      <label className="auth-label" htmlFor="regReferral">Referral code, if you have one</label>
      <div className="auth-control">
        <input
          id="regReferral"
          className="notranslate"
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={12}
          placeholder="e.g. SAM4K7QXP"
          value={value}
          onChange={event => onChange(event.target.value.toUpperCase())}
          aria-describedby="regReferralHint"
        />
        <i className="fa-solid fa-tag auth-control-icon" aria-hidden="true"></i>
      </div>
      {check?.valid && (
        <small id="regReferralHint" className="sb-field-ok">
          <span>{`${check.referrerName} invited you.`}</span> <span>{`You get ₹${check.welcomeDiscount} off your first order of ₹${check.minOrder} or more.`}</span>
        </small>
      )}
      {check && !check.valid && <small id="regReferralHint" className="sb-field-error">{check.message}</small>}
      {!check && typed.length >= 9 && !complete && <small id="regReferralHint" className="sb-field-error">That referral code was not found.</small>}
    </div>
  )
}

const STATUS = {
  Pending: { label: 'Waiting for first order', tone: 'wait' },
  Completed: { label: 'Earned', tone: 'ok' },
  Expired: { label: 'Expired', tone: 'off' },
  Rejected: { label: 'Not eligible', tone: 'off' },
  Reversed: { label: 'Reversed', tone: 'off' },
}

const formatDate = iso => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Signed-in farmer: their code, points and the friends they invited.
export function ReferEarnCard() {
  const [data, setData] = useState(null)
  const [failed, setFailed] = useState(false)
  const [showFriends, setShowFriends] = useState(false)

  useEffect(() => {
    let current = true
    axios.get('/api/me/referrals')
      .then(({ data: reply }) => { if (current) setData(reply.data) })
      .catch(() => { if (current) setFailed(true) })
    return () => { current = false }
  }, [])

  if (failed || (data && !data.settings.enabled && !data.points)) return null
  if (!data) {
    return <section className="refer-card is-loading" aria-busy="true" aria-label="Refer & Earn"><span className="refer-skeleton" /></section>
  }

  const { code, settings, points, pointsExpireAt, welcome, referrals } = data
  const url = referralShareUrl(code, window.location.origin)
  const shareText = referralShareText({ code, url, welcomeDiscount: settings.welcomeDiscount, minOrder: settings.minOrder })
  const earned = referrals.filter(r => r.status === 'Completed').reduce((sum, r) => sum + r.pointsAwarded, 0)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      showToast('Referral code copied.', 'success')
    } catch {
      showToast(`Your code is ${code}`, 'info')
    }
  }

  return (
    <section className="refer-card" aria-labelledby="referTitle">
      <header className="refer-head">
        <span className="refer-icon" aria-hidden="true"><i className="fa-solid fa-award"></i></span>
        <div>
          <h3 id="referTitle" className="refer-title">Refer &amp; Earn</h3>
          {settings.enabled && (
            <p className="refer-sub">
              <span>{`Your friend gets ₹${settings.welcomeDiscount} off their first order of ₹${settings.minOrder} or more.`}</span>{' '}
              <span>{`You get ${settings.referrerPoints} points when it is delivered.`}</span>
            </p>
          )}
        </div>
      </header>

      {welcome && (
        <p className="refer-welcome" role="status">
          <i className="fa-solid fa-circle-check" aria-hidden="true"></i>{' '}
          <span>{`Your welcome offer: ₹${welcome.discount} off your first order of ₹${welcome.minOrder} or more, applied at checkout.`}</span>
        </p>
      )}

      <div className="refer-points">
        <span className="refer-points-label"><i className="fa-solid fa-wallet" aria-hidden="true"></i> Your points</span>
        <strong className="refer-points-value">{points}</strong>
        <span className="refer-points-note">
          <span>{`1 point = ₹1. Use up to ${settings.redeemMaxPercent}% of an order of ₹${settings.redeemMinOrder} or more.`}</span>
          {pointsExpireAt && <> <span>{`Valid till ${formatDate(pointsExpireAt)}`}</span></>}
        </span>
      </div>

      {settings.enabled && (
        <>
          <div className="refer-code">
            <span className="refer-code-label">Your referral code</span>
            <div className="refer-code-row">
              <strong className="refer-code-value notranslate">{code}</strong>
              <button type="button" className="acct-btn refer-copy" onClick={copy}>
                <i className="fa-solid fa-paste" aria-hidden="true"></i> Copy
              </button>
            </div>
          </div>
          <a
            className="auth-cta refer-share"
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <i className="fa-brands fa-whatsapp" aria-hidden="true"></i> Share on WhatsApp
          </a>
        </>
      )}

      {referrals.length > 0 && (
        <div className="refer-friends">
          <button type="button" className="auth-link" aria-expanded={showFriends} onClick={() => setShowFriends(open => !open)}>
            <span>{`Friends you invited (${referrals.length})`}</span>
            {earned > 0 && <span>{` · ${earned} points earned`}</span>}
            <i className={`fa-solid ${showFriends ? 'fa-chevron-up' : 'fa-chevron-down'}`} aria-hidden="true"></i>
          </button>
          {showFriends && (
            <ul className="refer-list">
              {referrals.map(friend => {
                const status = STATUS[friend.status] || { label: friend.status, tone: 'off' }
                return (
                  <li key={friend.id}>
                    <span className="refer-list-who">
                      <span className="refer-list-name notranslate">{friend.name}</span>
                      <span className="refer-list-date">{formatDate(friend.createdAt)}</span>
                    </span>
                    <span className={`refer-badge is-${status.tone}`}>
                      {friend.status === 'Completed' && friend.pointsAwarded > 0 ? `+${friend.pointsAwarded} points` : status.label}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
