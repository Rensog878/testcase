import { useEffect, useId, useRef, useState } from 'react'

// The advisory form's crop picker: a field-styled button that opens a
// floating list, in place of a native <select> (whose open list the browser
// draws and CSS cannot touch). ARIA "select-only combobox" pattern: focus
// stays on the button, the highlighted option is aria-activedescendant.
// Keys: Up/Down, Home/End, Enter/Space to pick, Escape or Tab to close,
// letters jump to the next option starting with them (in the language shown).
// Opens upward when there is no room below. Styles: storefront.css,
// NEWSLETTER ("crop picker").

export default function CropSelect({ id, labelId, value, onChange, groups }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [up, setUp] = useState(false)
  const [maxHeight, setMaxHeight] = useState(300)
  const rootRef = useRef(null)
  const listRef = useRef(null)
  const typed = useRef({ text: '', at: 0 })
  const listId = useId()
  const options = groups.flatMap(group => group.options)
  const optionId = index => `${listId}-o${index}`

  const show = () => {
    // Room between the sticky header (--sb-chrome-h, phones) and the bottom
    // bar (the body's bottom padding): open towards the larger side and fit.
    const box = rootRef.current.getBoundingClientRect()
    const head = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sb-chrome-h')) || 0
    const bar = parseFloat(getComputedStyle(document.body).paddingBottom) || 0
    const below = window.innerHeight - bar - box.bottom
    const above = box.top - head
    const opensUp = below < 320 && above > below
    setUp(opensUp)
    setMaxHeight(Math.max(140, Math.min(300, (opensUp ? above : below) - 32)))
    setActive(Math.max(0, options.indexOf(value)))
    setOpen(true)
  }
  const choose = index => {
    if (options[index] !== undefined) onChange(options[index])
    setOpen(false)
  }

  // Outside tap closes; the highlighted option stays in view.
  useEffect(() => {
    if (!open) return undefined
    const away = event => { if (!rootRef.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [open])
  useEffect(() => {
    if (open) listRef.current?.querySelector(`#${CSS.escape(optionId(active))}`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const onKeyDown = event => {
    const last = options.length - 1
    const move = next => { event.preventDefault(); if (!open) show(); setActive(next) }
    switch (event.key) {
      case 'ArrowDown': return open ? move(Math.min(last, active + 1)) : move(Math.max(0, options.indexOf(value)))
      case 'ArrowUp': return open ? move(Math.max(0, active - 1)) : move(Math.max(0, options.indexOf(value)))
      case 'Home': return open && move(0)
      case 'End': return open && move(last)
      case 'Enter':
      case ' ':
        event.preventDefault()
        return open ? choose(active) : show()
      case 'Escape':
        if (open) { event.preventDefault(); setOpen(false) }
        return undefined
      case 'Tab':
        return setOpen(false)
      default: {
        if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return undefined
        // Type-ahead on the words on screen, so it works in Tamil too.
        const now = Date.now()
        typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : '') + event.key.toLowerCase(), at: now }
        const labels = [...(listRef.current?.querySelectorAll('[role=option]') || [])].map(el => el.textContent.trim().toLowerCase())
        const from = open ? active : options.indexOf(value)
        const order = [...labels.keys()].map(i => (from + 1 + i) % labels.length)
        const hit = order.find(i => labels[i].startsWith(typed.current.text)) ?? order.find(i => labels[i].startsWith(event.key.toLowerCase()))
        if (hit !== undefined) { if (open) setActive(hit); else onChange(options[hit]) }
        return undefined
      }
    }
  }

  let index = -1
  return (
    <div ref={rootRef} className={`crop-select${open ? ' is-open' : ''}${up ? ' opens-up' : ''}`}>
      <button
        type="button" id={id} className="crop-select-btn" role="combobox"
        aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} aria-labelledby={`${labelId} ${id}`}
        aria-activedescendant={open ? optionId(active) : undefined}
        onClick={() => (open ? setOpen(false) : show())} onKeyDown={onKeyDown}
      >
        <i className="fa-solid fa-seedling crop-select-lead" aria-hidden="true"></i>
        <span className="crop-select-value">{value}</span>
        <i className="fa-solid fa-chevron-down crop-select-chev" aria-hidden="true"></i>
      </button>
      {/* Always in the page (hidden when closed) so the language packs have
          translated the words before it opens. */}
      <div className="crop-select-pop" hidden={!open}>
        <ul ref={listRef} id={listId} role="listbox" aria-labelledby={labelId} tabIndex={-1} className="crop-select-list" style={{ maxHeight }}>
          {groups.map(group => (
            <li key={group.title} role="presentation" className="crop-select-group">
              <span className="crop-select-group-title" aria-hidden="true">{group.title}</span>
              <ul role="group" aria-label={group.title}>
                {group.options.map(option => {
                  index += 1
                  const i = index
                  const selected = option === value
                  return (
                    <li
                      key={option} id={optionId(i)} role="option" aria-selected={selected} data-value={option}
                      className={`crop-select-option${i === active ? ' is-active' : ''}${selected ? ' is-selected' : ''}`}
                      onPointerEnter={() => setActive(i)}
                      onPointerDown={event => event.preventDefault()}
                      onClick={() => choose(i)}
                    >
                      <span>{option}</span>
                      <i className="fa-solid fa-check crop-select-tick" aria-hidden="true"></i>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
