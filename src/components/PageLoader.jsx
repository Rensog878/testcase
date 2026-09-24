// The full-page loader with the "Factory to Farmer" tagline. Same markup as the
// first-paint loader in index.html, whose <style> holds the .sb-loader rules.
// `late` waits 0.2s before fading in, so a fast route change never flashes it.
const TAGLINE = 'Factory to Farmer'

export default function PageLoader({ late = false }) {
  return (
    <div className={`sb-loader${late ? ' sb-loader--late' : ''}`} role="status" aria-label="Loading">
      <div className="sb-loader-mark"><img src="/assets/brand/logo-mark.png" alt="" /></div>
      <img className="sb-loader-word" src="/assets/brand/logo-wordmark.png" alt="Sathyam Agro Mart" />
      <div className="sb-loader-road" aria-hidden="true">
        <span>🏭</span>
        <span className="sb-loader-line"><span className="sb-loader-truck"><span>🚚</span></span></span>
        <span>🌾</span>
      </div>
      <p className="sb-loader-tag notranslate">
        {[...TAGLINE].map((ch, i) => ch === ' '
          ? <span key={i} className="sb-l sb-sp"> </span>
          : <span key={i} className="sb-l" style={{ '--i': i }}>{ch}</span>)}
      </p>
    </div>
  )
}
