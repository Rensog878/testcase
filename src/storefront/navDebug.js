// On-device diagnostics for the bottom bar. Open the storefront with
// ?debug=nav to overlay live viewport numbers and outline the bar in red, then
// screenshot it while the bar is hidden. Does nothing without the parameter.
// Returns a function that removes the panel.
export function startNavDebugPanel() {
  if (new URLSearchParams(window.location.search).get('debug') !== 'nav') return () => {}
  const nav = document.getElementById('mobileBottomNav')
  const vv = window.visualViewport

  const probe = unit => {
    const el = document.createElement('div')
    el.style.cssText = `position:fixed;top:0;left:-9999px;width:1px;height:100${unit};visibility:hidden;pointer-events:none`
    document.body.appendChild(el)
    return el
  }
  const vhProbe = probe('vh')
  const dvhProbe = CSS.supports('height', '100dvh') ? probe('dvh') : null

  const panel = document.createElement('pre')
  panel.id = 'navDebugPanel'
  panel.style.cssText = 'position:fixed;top:130px;left:8px;right:8px;z-index:2147483647;margin:0;padding:8px 10px;background:rgba(0,0,0,0.85);color:#7cfc00;font:11px/1.45 ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;border-radius:8px;pointer-events:none'
  document.body.appendChild(panel)
  if (nav) nav.style.outline = '3px solid #ff2d55'

  const describe = el => {
    if (!el) return 'none'
    const cls = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/)[0] : ''
    return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${cls}`
  }

  const render = () => {
    const rect = nav?.getBoundingClientRect()
    const css = nav ? getComputedStyle(nav) : null
    const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight
    // elementFromPoint skips this panel (pointer-events: none).
    const hit = document.elementFromPoint(window.innerWidth / 2, Math.max(0, visibleBottom - 8))
    const ua = (navigator.userAgent.match(/(SamsungBrowser|Chrome|CriOS|Firefox|Version)\/[\d.]+/g) || []).join(' ')
    const fixed = n => (typeof n === 'number' ? n.toFixed(1) : '-')
    panel.textContent = [
      `ua         ${ua}`,
      `url        ${window.location.pathname}  top=${window.top === window}`,
      `screen     ${window.screen.width}x${window.screen.height} dpr=${window.devicePixelRatio}`,
      `inner      ${window.innerWidth}x${window.innerHeight}  client=${document.documentElement.clientHeight}`,
      `visualVP   h=${fixed(vv?.height)} top=${fixed(vv?.offsetTop)} scale=${vv ? vv.scale.toFixed(2) : '-'}`,
      `100vh=${vhProbe.offsetHeight}  100dvh=${dvhProbe ? dvhProbe.offsetHeight : 'n/a'}`,
      `scrollY    ${Math.round(window.scrollY)} / ${document.documentElement.scrollHeight}`,
      `nav rect   top=${fixed(rect?.top)} bottom=${fixed(rect?.bottom)} visibleBottom=${fixed(visibleBottom)}`,
      `nav css    bottom=${css?.bottom} margin-bottom=${css?.marginBottom} display=${css?.display}`,
      `bottom hit ${describe(hit)} ${nav && nav.contains(hit) ? '(nav OK)' : '(NOT nav)'}`,
    ].join('\n')
  }

  let queued = false
  const queue = () => {
    if (queued) return
    queued = true
    requestAnimationFrame(() => {
      queued = false
      render()
    })
  }
  window.addEventListener('scroll', queue, { passive: true })
  window.addEventListener('resize', queue)
  vv?.addEventListener('resize', queue)
  vv?.addEventListener('scroll', queue)
  // Toolbar animations do not always fire events; keep the numbers fresh.
  const timer = setInterval(render, 500)
  render()

  return () => {
    clearInterval(timer)
    window.removeEventListener('scroll', queue)
    window.removeEventListener('resize', queue)
    vv?.removeEventListener('resize', queue)
    vv?.removeEventListener('scroll', queue)
    panel.remove()
    vhProbe.remove()
    dvhProbe?.remove()
    if (nav) nav.style.outline = ''
  }
}
