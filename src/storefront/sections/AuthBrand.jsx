// The logo lock-up shown on the sign-in card and the guest contact prompt.
// Its own module so the guest prompt does not pull the whole sign-in card
// into the first download (StorePopups loads AuthModal lazily).

export default function AuthBrand({ t }) {
  return (
    <div className="auth-brand">
      {/* Emblem and wordmark share a line, as they do on the header; the
          slogan is centred under both, not tucked beside the emblem. */}
      <span className="auth-brand-line">
        <span className="auth-brand-icon has-brand-mark" aria-hidden="true"><img className="brand-mark" src="/assets/brand/logo-mark.png" alt="" width="512" height="512" /></span>
        <span className="auth-brand-text has-brand-wordmark"><img className="brand-wordmark" src="/assets/brand/logo-wordmark.png" alt="Sathyam Agro Mart" width="1200" height="254" /></span>
      </span>
      <span className="auth-brand-sub" data-i18n="logo_sub">{t('logo_sub')}</span>
    </div>
  )
}
