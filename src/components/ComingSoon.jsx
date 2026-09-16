// Placeholder shown for features not yet part of this presentation phase.
// Swap back to the real component by uncommenting it where this is used.
export default function ComingSoon({ title = 'Coming soon', message = "We're putting the finishing touches on this feature. Please check back soon." }) {
  return (
    <div
      style={{
        minHeight: '40vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 'var(--space-lg, 32px) var(--space-md, 20px)',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 'var(--radius-lg, 16px)',
          background: 'var(--brand-100, #d1fae5)',
          color: 'var(--brand-700, #047857)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
        }}
        aria-hidden="true"
      >
        <i className="fa-regular fa-clock"></i>
      </div>
      <h2 style={{ margin: 0, color: 'var(--text-primary, #1f2b3b)', fontSize: '1.35rem' }}>{title}</h2>
      <p style={{ margin: 0, color: 'var(--text-muted, #7b8794)', maxWidth: 420 }}>{message}</p>
    </div>
  )
}
