// Theme toggle + interactive halftone portrait. The halftone sampler is
// adapted from cali.so's components/halftone-portrait.tsx (MIT).

;(function themeMenu() {
  // Theme menu in the top bar: Black (default), Blue or Christmas
  const menu = document.querySelector('[data-theme-menu]')
  if (!menu) return
  const root = document.documentElement
  const button = menu.querySelector('.theme-pill')
  const pop = menu.querySelector('.theme-pop')
  const items = [...pop.querySelectorAll('[role="menuitemradio"]')]
  const themes = items.map((i) => i.dataset.theme)
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches
  const current = () => themes.find((t) => root.classList.contains(t)) || 'mono'
  const mark = () => {
    const t = current()
    items.forEach((i) => i.setAttribute('aria-checked', String(i.dataset.theme === t)))
    button.dataset.theme = t
  }
  function apply(theme) {
    if (theme === current()) return
    const swap = () => {
      root.classList.add('theme-switching')
      themes.forEach((t) => root.classList.toggle(t, t === theme && theme !== 'mono'))
      try { localStorage.setItem('theme', theme) } catch {}
      mark()
      requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-switching')))
    }
    // the new ink wipes across on a diagonal
    if (document.startViewTransition && !still()) document.startViewTransition(swap)
    else swap()
  }
  const open = (on, focus) => {
    pop.hidden = !on
    button.setAttribute('aria-expanded', String(on))
    menu.classList.toggle('is-open', on)
    if (on && focus) (items.find((i) => i.getAttribute('aria-checked') === 'true') || items[0]).focus()
  }
  button.addEventListener('click', (e) => open(pop.hidden, e.detail === 0))
  items.forEach((i) => i.addEventListener('click', () => {
    apply(i.dataset.theme)
    open(false)
    button.focus()
  }))
  pop.addEventListener('keydown', (e) => {
    const k = items.indexOf(document.activeElement)
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      items[(k + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus()
    }
  })
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !pop.hidden) {
      open(false)
      button.focus()
    }
  })
  addEventListener('pointerdown', (e) => !menu.contains(e.target) && open(false))
  mark()
})()


document.querySelectorAll('[data-year]').forEach((el) => {
  el.textContent = new Date().getFullYear()
})

// Top bar menus (Contents, and the languages I speak): one open at a time,
// closed by a pick, Escape, or a click anywhere else.
;(function menus() {
  const buttons = [...document.querySelectorAll('[data-menu]')]
  const panel = (b) => document.getElementById(b.getAttribute('aria-controls'))
  const set = (button, open) => {
    button.setAttribute('aria-expanded', String(open))
    panel(button).hidden = !open
  }
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const open = panel(button).hidden
      buttons.forEach((b) => set(b, false))
      set(button, open)
    })
    panel(button).addEventListener('click', (e) => {
      if (e.target.closest('a')) set(button, false)
    })
  })
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return
    const open = buttons.find((b) => !panel(b).hidden)
    if (open) {
      set(open, false)
      open.focus()
    }
  })
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.menu')) buttons.forEach((b) => set(b, false))
  })
})()

// The languages pill says hello in the next language each time the visitor
// scrolls into a different section of the page.
;(function greeting() {
  const button = document.querySelector('[data-greetings]')
  const sections = document.querySelectorAll('main > header[id], main > section[id]')
  if (!button || !sections.length) return
  const word = button.querySelector('[data-greeting]')
  const words = button.dataset.greetings.split('|')
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  let i = 0
  let current = null
  function swap() {
    i = (i + 1) % words.length
    const set = (w) => word.replaceChildren(rollText(w))
    if (still) return set(words[i])
    word.dataset.out = ''
    setTimeout(() => {
      set(words[i])
      delete word.dataset.out
    }, 220)
  }
  // the current section is the last one whose top has passed 40% of the
  // way down the screen
  function check() {
    const line = innerHeight * 0.4
    let now = sections[0]
    sections.forEach((s) => {
      if (s.getBoundingClientRect().top <= line) now = s
    })
    if (now !== current) {
      if (current) swap()
      current = now
    }
  }
  let queued = false
  addEventListener(
    'scroll',
    () => {
      if (queued) return
      queued = true
      requestAnimationFrame(() => {
        queued = false
        check()
      })
    },
    { passive: true },
  )
  check()
})()

// "lawyer" opens a one-line note beneath it.
// Hovering shows it too; a click keeps it open until clicked again.
document.querySelectorAll('.reveal').forEach((button) => {
  const note = document.getElementById(button.getAttribute('aria-controls'))
  let pinned = false
  const set = (open) => {
    button.setAttribute('aria-expanded', String(open))
    note.toggleAttribute('data-open', open)
  }
  button.addEventListener('click', () => {
    pinned = !pinned
    set(pinned)
  })
  button.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && set(true))
  button.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && !pinned && set(false))
})

// Typed list: each item is written out, then struck through in red, then
// the next begins. Plays once per visit; reduced motion shows the result.
;(function typed() {
  const root = document.querySelector('[data-typed]')
  if (!root) return
  const out = root.querySelector('[data-typed-out]')
  const items = [...root.querySelector('[data-typed-items]').content.children].map((el) =>
    el.textContent.trim(),
  )
  const { lead = '', close = '', end = '' } = root.dataset
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  const span = (cls, text = '') => Object.assign(document.createElement('span'), { className: cls, textContent: text })

  if (still) {
    out.append(lead)
    items.forEach((text, i) => {
      const s = span('typed-item', text)
      s.dataset.struck = ''
      out.append(s, i < items.length - 1 ? ', ' : '.')
    })
    const e = span('typed-end', end)
    out.append(span('typed-close', close + ' '), e)
    words(e)
    return
  }

  // "curious" and "creative" become underlined words; hovering or clicking
  // one shows what drives it, in a line beneath
  const NOTES = { curious: 'Curiosity drives me to consume.', creative: 'Creativity drives me to create.' }
  function words(e) {
    const note = document.getElementById('am-note')
    if (!note) return
    const text = note.querySelector('span')
    let pinned = null
    const show = (b) => {
      text.textContent = NOTES[b.textContent]
      // sit directly beneath the word it belongs to
      note.style.setProperty('--nx', `${b.offsetLeft}px`)
      note.style.setProperty('--ny', `${b.offsetTop + b.offsetHeight}px`)
      note.toggleAttribute('data-open', true)
      e.querySelectorAll('.reveal').forEach((x) => x.setAttribute('aria-expanded', String(x === b)))
    }
    const hide = () => {
      if (pinned) return show(pinned)
      note.removeAttribute('data-open')
      e.querySelectorAll('.reveal').forEach((x) => x.setAttribute('aria-expanded', 'false'))
    }
    e.textContent = ''
    end.split(/(curious|creative)/).forEach((part) => {
      if (!NOTES[part]) return part && e.append(part)
      const b = Object.assign(document.createElement('button'), { type: 'button', className: 'reveal', textContent: part })
      b.setAttribute('aria-expanded', 'false')
      b.setAttribute('aria-controls', 'am-note')
      b.addEventListener('mouseenter', () => show(b))
      b.addEventListener('mouseleave', hide)
      b.addEventListener('focus', () => show(b))
      b.addEventListener('blur', hide)
      b.addEventListener('click', () => {
        pinned = pinned === b ? null : b
        pinned ? show(b) : hide()
      })
      e.append(b)
    })
    // the line sits right after the full stop
    e.append(note)
  }

  // a quick typewriter rhythm: uneven keystrokes, a short beat after punctuation
  async function type(target, text, fast = false) {
    for (const ch of text) {
      target.textContent += ch
      await wait(/[.,…]/.test(ch) ? (fast ? 110 : 220) : (fast ? 30 : 35) + Math.random() * (fast ? 26 : 45))
    }
  }

  async function run() {
    const caret = span('typed-caret')
    const head = span('')
    out.append(head, caret)
    await type(head, lead, true)
    // write the whole list quickly first…
    const written = []
    for (const [i, text] of items.entries()) {
      const s = span('typed-item')
      out.insertBefore(s, caret)
      await type(s, text, true)
      written.push(s)
      out.insertBefore(document.createTextNode(i < items.length - 1 ? ', ' : '.'), caret)
      await wait(60)
    }
    // …then the red line runs through them all, one after another
    await wait(450)
    for (const s of written) {
      s.dataset.struck = ''
      await wait(150)
    }
    await wait(550)
    const c = span('typed-close')
    out.insertBefore(c, caret)
    await type(c, close)
    await wait(700)
    out.insertBefore(document.createTextNode(' '), caret)
    const e = span('typed-end')
    out.insertBefore(e, caret)
    await type(e, end)
    words(e)
    await wait(1200)
    caret.remove()
  }

  // starts once the paragraph is properly on screen
  new IntersectionObserver(
    (entries, io) => {
      if (!entries[0].isIntersecting) return
      io.disconnect()
      run()
    },
    { threshold: 0.6 },
  ).observe(root)
})()

// The Film Roll. Each roll's photo list becomes strips of five negatives
// (leader first, unexposed frames at the end) that unspool as they scroll
// into view. Scratching a frame wipes the negative off to reveal the print,
// and once most of it is gone the frame develops. Pressing a frame opens
// the viewer: the whole roll, one large frame at a time, still scratchable.
// Developed frames last for this visit only.
;(function filmRoll() {
  const rolls = [...document.querySelectorAll('[data-roll]')]
  if (!rolls.length) return
  const PER = 5 // frames per strip
  const MASK_W = 300 // each frame's scratch mask, shared by all its views
  const MASK_H = 200
  const DEVELOP_AT = 0.6 // fraction scratched before a frame develops
  const TILTS = [-0.25, 0.3, -0.15, 0.2, -0.3] // deg, per strip
  const NUDGES = [-14, 10, -6, 14, -10] // px, per strip
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  const dpr = Math.min(2, devicePixelRatio || 1)
  const hint = document.querySelector('[data-film-hint]')
  // phones: say how to develop a photo with a finger
  if (hint && matchMedia('(hover: none)').matches) hint.textContent = 'Tip: tap a photo, then rub it with your finger to develop it'
  const el = (tag, cls) => Object.assign(document.createElement(tag), cls ? { className: cls } : {})

  // ---- frames, their masks and every view of them ----

  function makeFrame(img) {
    const mask = el('canvas')
    mask.width = MASK_W
    mask.height = MASK_H
    const frame = {
      src: img.getAttribute('src'),
      caption: img.dataset.caption || '',
      alt: img.getAttribute('alt') || '',
      img: new Image(),
      mask,
      mctx: mask.getContext('2d', { willReadFrequently: true }),
      views: [],
      developed: false,
      strokes: 0,
    }
    frame.img.onload = () => frame.views.forEach(render)
    frame.img.src = frame.src
    return frame
  }

  // draw the photo, then cut away whatever has been scratched
  function render(view) {
    const { frame, canvas } = view
    if (frame.developed || !frame.img.naturalWidth) return
    const w = view.el.clientWidth
    const h = view.el.clientHeight
    if (!w) return
    if (canvas.width !== Math.round(w * dpr)) {
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
    }
    const ctx = canvas.getContext('2d')
    const { naturalWidth: iw, naturalHeight: ih } = frame.img
    const s = Math.max(canvas.width / iw, canvas.height / ih)
    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(frame.img, (canvas.width - iw * s) / 2, (canvas.height - ih * s) / 2, iw * s, ih * s)
    ctx.globalCompositeOperation = 'destination-out'
    ctx.drawImage(frame.mask, 0, 0, canvas.width, canvas.height)
  }

  // a soft round brush, in mask coordinates (0–1 across the frame)
  function stamp(frame, nx, ny) {
    const x = nx * MASK_W
    const y = ny * MASK_H
    const r = MASK_W * 0.085
    const g = frame.mctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, 'rgba(0,0,0,1)')
    g.addColorStop(0.6, 'rgba(0,0,0,0.92)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    frame.mctx.fillStyle = g
    frame.mctx.fillRect(x - r, y - r, r * 2, r * 2)
  }

  function scratched(frame) {
    const data = frame.mctx.getImageData(0, 0, MASK_W, MASK_H).data
    let hit = 0
    let total = 0
    for (let i = 3; i < data.length; i += 16) {
      total++
      if (data[i] > 110) hit++
    }
    return hit / total
  }

  function develop(frame) {
    if (frame.developed) return
    frame.developed = true
    frame.views.forEach((v) => (v.el.dataset.developed = ''))
    frame.roll.refresh()
    viewer.refresh()
  }

  function makeView(frame, { label, number, large } = {}) {
    const view = { frame, el: el('button', 'frame'), canvas: el('canvas') }
    view.el.type = 'button'
    if (label) view.el.setAttribute('aria-label', label)
    const img = el('img')
    img.alt = ''
    img.draggable = false
    img.decoding = 'async'
    if (!large) img.loading = 'lazy'
    img.src = frame.src
    view.canvas.setAttribute('aria-hidden', 'true')
    view.el.append(img, view.canvas)
    if (number) {
      const no = el('span', 'frame-no')
      no.setAttribute('aria-hidden', 'true')
      no.textContent = `→ ${number}A`
      view.el.append(no)
    }
    if (frame.developed) view.el.dataset.developed = ''
    frame.views.push(view)
    new ResizeObserver(() => render(view)).observe(view.el)
    return view
  }

  // drag to scratch; a press without dragging (or Enter/Space) calls onPress
  function wire(view, onPress) {
    const { el: node, frame } = view
    let down = null
    let last = null
    let moved = false
    let swallowClick = false
    const at = (e) => {
      const r = node.getBoundingClientRect()
      return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, cx: e.clientX, cy: e.clientY }
    }
    node.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return
      down = last = at(e)
      moved = false
      node.setPointerCapture(e.pointerId)
    })
    node.addEventListener('pointermove', (e) => {
      if (!down || frame.developed) return
      const p = at(e)
      if (!moved) {
        if (Math.hypot(p.cx - down.cx, p.cy - down.cy) < 5) return
        moved = true
        hint?.setAttribute('data-gone', '')
        stamp(frame, down.x, down.y)
      }
      const steps = Math.max(1, Math.ceil((Math.hypot(p.x - last.x, p.y - last.y) * MASK_W) / 6))
      for (let i = 1; i <= steps; i++) stamp(frame, last.x + ((p.x - last.x) * i) / steps, last.y + ((p.y - last.y) * i) / steps)
      last = p
      frame.views.forEach(render)
      if (++frame.strokes % 6 === 0 && scratched(frame) > DEVELOP_AT) develop(frame)
    })
    const up = () => {
      if (!down) return
      down = null
      if (moved) {
        swallowClick = true
        if (scratched(frame) > DEVELOP_AT) develop(frame)
      }
    }
    node.addEventListener('pointerup', up)
    node.addEventListener('pointercancel', () => (down = null))
    node.addEventListener('click', () => {
      if (swallowClick) return (swallowClick = false)
      onPress?.()
    })
  }

  // ---- rolls and strips ----

  const strips = []

  rolls.forEach((root) => {
    const imgs = [...root.querySelectorAll(':scope > img')]
    const title = root.dataset.title || 'Roll'
    const stock = root.dataset.stock || ''
    const roll = { frames: imgs.map(makeFrame), title }
    imgs.forEach((img) => img.remove())
    roll.frames.forEach((f) => (f.roll = roll))

    const head = el('div', 'roll-head')
    const h = el('h3', 'roll-title')
    h.textContent = title
    const meta = el('span', 'roll-meta')
    meta.textContent = [stock, root.dataset.camera, root.dataset.shot].filter(Boolean).join(' · ')
    const all = el('button', 'develop-all')
    all.type = 'button'
    all.textContent = 'Develop all'
    all.setAttribute('aria-label', `Develop every frame of ${title}`)
    all.addEventListener('click', () => roll.frames.forEach((f, i) => setTimeout(() => develop(f), still ? 0 : i * 70)))
    head.append(h, meta, all)
    root.append(head)
    roll.refresh = () => (all.hidden = roll.frames.every((f) => f.developed))

    // leader, the photos, then plain film base to the end of the last strip,
    // so the roll ends the way it begins
    const cells = ['leader', ...roll.frames]
    while (cells.length % PER) cells.push('leader')
    for (let s = 0; s < cells.length / PER; s++) {
      const strip = el('div', 'strip')
      const k = strips.length
      strip.style.setProperty('--tilt', `${TILTS[k % TILTS.length]}deg`)
      strip.style.marginLeft = `${NUDGES[k % NUDGES.length]}px`
      const edge = el('span', 'strip-edge')
      edge.setAttribute('aria-hidden', 'true')
      edge.textContent = Array(14).fill(stock.toUpperCase()).join('      ')
      strip.append(edge)
      cells.slice(s * PER, s * PER + PER).forEach((cell) => {
        if (typeof cell === 'string') {
          const blank = el('div', `frame frame-${cell}`)
          blank.setAttribute('aria-hidden', 'true')
          return strip.append(blank)
        }
        const i = roll.frames.indexOf(cell)
        const view = makeView(cell, { number: i + 1, label: `Open frame ${i + 1} of ${title}${cell.alt ? `: ${cell.alt}` : ''}` })
        wire(view, () => viewer.open(roll, i, view.el))
        strip.append(view.el)
      })
      root.append(strip)
      strips.push(strip)
    }
  })

  // ---- unspooling: each strip wipes in from the left as it scrolls up ----

  let queued = false
  function unspool() {
    queued = false
    const vh = innerHeight
    strips.forEach((strip) => {
      const t = still ? 1 : Math.min(1, Math.max(0, (vh * 0.96 - strip.getBoundingClientRect().top) / (vh * 0.42)))
      const eased = t * t * (3 - 2 * t)
      strip.style.setProperty('--unspool', eased.toFixed(3))
    })
  }
  const queue = () => {
    if (!queued) {
      queued = true
      requestAnimationFrame(unspool)
    }
  }
  addEventListener('scroll', queue, { passive: true })
  addEventListener('resize', queue)
  unspool()

  // ---- the viewer ----

  const viewer = (() => {
    const box = document.querySelector('[data-viewer]')
    const stage = box.querySelector('[data-viewer-strip]')
    const count = box.querySelector('[data-viewer-count]')
    const caption = box.querySelector('[data-viewer-caption]')
    const prev = box.querySelector('[data-viewer-prev]')
    const next = box.querySelector('[data-viewer-next]')
    const devBtn = box.querySelector('[data-viewer-develop]')
    const closeBtn = box.querySelector('[data-viewer-close]')
    let roll = null
    let index = 0
    let big = null
    let origin = null
    let closing = false

    // transform that puts the large frame exactly over a small one
    function over(small, large) {
      const s = small.width / large.width
      const dx = small.left + small.width / 2 - (large.left + large.width / 2)
      const dy = small.top + small.height / 2 - (large.top + large.height / 2)
      return `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${s.toFixed(4)})`
    }

    function show() {
      const frame = roll.frames[index]
      if (big) big.frame.views.splice(big.frame.views.indexOf(big), 1)
      stage.textContent = ''
      big = makeView(frame, { large: true, label: `Frame ${index + 1}${frame.alt ? `, ${frame.alt}` : ''}, scratch to develop` })
      big.el.tabIndex = -1
      wire(big, null)
      stage.append(big.el)
      count.textContent = `${index + 1} of ${roll.frames.length}`
      caption.textContent = frame.caption
      prev.disabled = index === 0
      next.disabled = index === roll.frames.length - 1
      refresh()
      requestAnimationFrame(() => render(big))
    }

    function refresh() {
      if (roll) devBtn.hidden = roll.frames[index].developed
    }

    function open(r, i, from) {
      roll = r
      index = i
      origin = from
      box.hidden = false
      show()
      if (!still && from) {
        stage.animate([{ transform: over(from.getBoundingClientRect(), big.el.getBoundingClientRect()) }, { transform: 'none' }], {
          duration: 560,
          easing: 'cubic-bezier(.2,.8,.2,1)',
        })
        box.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320 })
      }
      closeBtn.focus({ preventScroll: true })
    }

    // shrinks back into its frame in the strip, if that's on screen
    function close() {
      if (box.hidden || closing) return
      const home = roll.frames[index].views[0]?.el
      const rect = home?.getBoundingClientRect()
      const done = () => {
        box.hidden = true
        closing = false
        box.getAnimations().forEach((a) => a.cancel())
        stage.getAnimations().forEach((a) => a.cancel())
        ;(home || origin)?.focus({ preventScroll: true })
      }
      if (still || !rect || rect.bottom < 0 || rect.top > innerHeight) return done()
      closing = true
      stage.animate([{ transform: 'none' }, { transform: over(rect, big.el.getBoundingClientRect()) }], {
        duration: 420,
        easing: 'cubic-bezier(.5,0,.75,.4)',
        fill: 'forwards',
      })
      box.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, fill: 'forwards' }).onfinish = done
    }

    prev.addEventListener('click', () => index > 0 && (index--, show()))
    next.addEventListener('click', () => index < roll.frames.length - 1 && (index++, show()))
    devBtn.addEventListener('click', () => develop(roll.frames[index]))
    closeBtn.addEventListener('click', close)
    box.addEventListener('click', (e) => e.target === box && close())
    document.addEventListener('keydown', (e) => {
      if (box.hidden) return
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowLeft') prev.click()
      else if (e.key === 'ArrowRight') next.click()
      else if (e.key === 'Tab') {
        // keep focus inside the viewer
        const items = [...box.querySelectorAll('button:not([disabled]):not([hidden])')].filter((b) => b.tabIndex >= 0)
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) (e.preventDefault(), last.focus())
        else if (!e.shiftKey && document.activeElement === last) (e.preventDefault(), first.focus())
      }
    })

    return { open, refresh }
  })()
})()

;(function halftone() {
  const wrapper = document.querySelector('[data-halftone]')
  if (!wrapper) return
  const canvas = wrapper.querySelector('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const CELL = 3 // CSS px between dot centers
  const MOBILE_CELL = 2 // only for the small phone-size portrait
  const MOBILE_MAX = 170 // portraits narrower than this use the finer grid
  const EDGE_FADE = 0.1 // fraction of each edge where dots taper out
  const RADIUS = 110 // pointer influence radius
  const SWELL = 0.45 // extra dot growth right under the pointer
  const PUSH = 7 // how far dots are pushed away from the pointer (CSS px)

  const src = wrapper.dataset.src
  const initials = wrapper.dataset.initials || '?'
  const interactive =
    matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !matchMedia('(prefers-reduced-motion: reduce)').matches

  let cssW = 0
  let cssH = 0
  let cells = []
  let cell = CELL
  let source = null
  let raf = 0
  const pointer = { x: -1e4, y: -1e4 }
  const target = { x: -1e4, y: -1e4 }

  const ink = () => getComputedStyle(document.documentElement).getPropertyValue('--foreground').trim()

  // No photo yet: print the initials as a stand-in so the layout still works.
  function initialsSource() {
    const off = document.createElement('canvas')
    off.width = off.height = 400
    const o = off.getContext('2d')
    const g = o.createRadialGradient(200, 200, 40, 200, 200, 200)
    g.addColorStop(0, '#444')
    g.addColorStop(1, '#fff')
    o.fillStyle = g
    o.fillRect(0, 0, 400, 400)
    o.fillStyle = '#000'
    o.font = '600 190px Geist, system-ui, sans-serif'
    o.textAlign = 'center'
    o.textBaseline = 'middle'
    o.fillText(initials, 200, 214)
    return off
  }

  function build() {
    if (!source || cssW < 4) return
    cell = cssW < MOBILE_MAX ? MOBILE_CELL : CELL
    const cols = Math.max(1, Math.round(cssW / cell))
    const rows = Math.max(1, Math.round(cssH / cell))
    const off = document.createElement('canvas')
    off.width = cols
    off.height = rows
    const o = off.getContext('2d', { willReadFrequently: true })
    const sw = source.naturalWidth || source.width
    const sh = source.naturalHeight || source.height
    // framing, set on the portrait in the HTML: data-zoom below 1 zooms out
    // (the white ground drops out), data-focus-x centres the face, and
    // data-anchor="bottom" keeps the shoulders running off the bottom edge
    const zoom = parseFloat(wrapper.dataset.zoom) || 1
    const focusX = parseFloat(wrapper.dataset.focusX) || 0.5
    const scale = Math.max(cols / sw, rows / sh) * zoom
    o.fillStyle = '#fff'
    o.fillRect(0, 0, cols, rows)
    const dx = cols / 2 - sw * scale * focusX
    const dy = wrapper.dataset.anchor === 'bottom' ? rows - sh * scale : (rows - sh * scale) / 2
    o.drawImage(source, dx, dy, sw * scale, sh * scale)
    const data = o.getImageData(0, 0, cols, rows).data
    const radial = 'radial' in wrapper.dataset

    const lums = new Float32Array(cols * rows)
    for (let i = 0; i < lums.length; i++) {
      const j = i * 4
      lums[i] = (0.2126 * data[j] + 0.7152 * data[j + 1] + 0.0722 * data[j + 2]) / 255
    }
    // stretch contrast between the 5th and 95th percentile
    const sorted = Float32Array.from(lums).sort()
    const lo = sorted[Math.floor(sorted.length * 0.05)]
    const hi = sorted[Math.floor(sorted.length * 0.95)]
    const range = Math.max(0.05, hi - lo)

    cells = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lum = Math.min(1, Math.max(0, (lums[r * cols + c] - lo) / range))
        // ink ∝ darkness; a white background drops out
        const tone = lum > 0.93 ? 0 : Math.pow(1 - lum, 0.95)
        if (tone < 0.06) continue
        const x = (c + 0.5) * cell
        const y = (r + 0.5) * cell
        const fx = Math.min(x, cssW - x) / (cssW * EDGE_FADE)
        const fy = (cssH - y) / (cssH * EDGE_FADE)
        let edge = Math.min(1, fx, fy)
        // data-radial: dots thin out towards a circle, so the shoulders melt
        // away instead of ending at a hard edge
        if (radial) {
          const d = Math.hypot(x - cssW / 2, y - cssH / 2) / (cssW / 2)
          edge = Math.min(edge, Math.max(0, (0.98 - d) / 0.3))
        }
        if (edge <= 0) continue
        cells.push({ x, y, tone: tone * edge })
      }
    }
  }

  function draw() {
    const dpr = devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssW, cssH)
    ctx.fillStyle = ink()
    const maxR = cell * 0.52
    for (const p of cells) {
      let { x, y } = p
      let r = p.tone * maxR
      const dx = x - pointer.x
      const dy = y - pointer.y
      const d = Math.hypot(dx, dy)
      if (d < RADIUS) {
        const t = 1 - d / RADIUS
        const fall = t * t * (3 - 2 * t)
        r *= 1 + SWELL * fall
        const push = (PUSH * fall) / (d || 1)
        x += dx * push
        y += dy * push
      }
      if (r < 0.3) continue
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
    if (cells.length) wrapper.dataset.ready = ''
  }

  function tick() {
    raf = 0
    const dx = target.x - pointer.x
    const dy = target.y - pointer.y
    pointer.x += dx * 0.16
    pointer.y += dy * 0.16
    draw()
    if (Math.hypot(dx, dy) > 0.5) raf = requestAnimationFrame(tick)
  }
  const wake = () => {
    if (!raf) raf = requestAnimationFrame(tick)
  }

  // layout size, not the on-screen size: the opening scales the portrait
  // with a transform while it grows, and the dots shouldn't be rebuilt for that
  function layout() {
    cssW = canvas.offsetWidth
    cssH = canvas.offsetHeight
    const dpr = devicePixelRatio || 1
    canvas.width = Math.round(cssW * dpr)
    canvas.height = Math.round(cssH * dpr)
    build()
    draw()
  }

  if (interactive) {
    canvas.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect()
      const k = cssW / rect.width
      target.x = (e.clientX - rect.left) * k
      target.y = (e.clientY - rect.top) * k
      // entering from outside: start near the pointer instead of easing
      // in from far away, so the face reacts right away
      if (pointer.x < -1e3) {
        pointer.x = target.x + (target.x < cssW / 2 ? -40 : 40)
        pointer.y = target.y
      }
      wake()
    })
    canvas.addEventListener('pointerleave', () => {
      target.x = target.y = -1e4
      wake()
    })
  }

  // touch screens: the face still moves. A soft "pointer" drifts slowly across
  // it in a loose figure of eight, and a finger on the portrait takes over.
  if (!interactive && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let visible = false
    let finger = 0
    const t0 = performance.now()
    const drift = (now) => {
      if (!visible) return
      if (now - finger > 1600 && cssW) {
        const t = (now - t0) / 1000
        target.x = cssW * (0.5 + 0.28 * Math.sin(t * 0.55))
        target.y = cssH * (0.45 + 0.2 * Math.sin(t * 1.1))
        if (pointer.x < -1e3) {
          pointer.x = target.x
          pointer.y = target.y
        }
        wake()
      }
      requestAnimationFrame(drift)
    }
    new IntersectionObserver(([e]) => {
      const was = visible
      visible = e.isIntersecting
      if (visible && !was) requestAnimationFrame(drift)
    }).observe(canvas)
    const touch = (e) => {
      const t = e.touches[0]
      if (!t) return
      const rect = canvas.getBoundingClientRect()
      const k = cssW / rect.width
      target.x = (t.clientX - rect.left) * k
      target.y = (t.clientY - rect.top) * k
      finger = performance.now()
      wake()
    }
    canvas.addEventListener('touchstart', touch, { passive: true })
    canvas.addEventListener('touchmove', touch, { passive: true })
  }

  new ResizeObserver(layout).observe(canvas)
  // redraw in the new ink when the theme flips
  new MutationObserver(draw).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })

  function useSource(s) {
    source = s
    try {
      build()
    } catch {
      // opened straight from disk (file://), the browser blocks reading
      // the photo's pixels; fall back to the initials until it's served
      source = initialsSource()
      build()
    }
    draw()
  }

  // the initials stand-in is drawn in Geist; rebuild once the font is in
  document.fonts?.ready.then(() => {
    if (source && !source.naturalWidth) useSource(initialsSource())
  })

  if (src) {
    const img = new Image()
    img.onload = () => useSource(img)
    img.onerror = () => useSource(initialsSource())
    img.src = src
  } else {
    useSource(initialsSource())
  }
})()

// ── Version one motion: smooth scrolling, rolling tab labels, titles that
// write themselves in, stacking build cards, and the view switch ─────────

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

// Lenis: subtle smooth scrolling, kept in step with GSAP's ScrollTrigger
;(function smoothScroll() {
  // project pages scroll natively: their live demo sits in an iframe, and plain
  // scrolling (and the browser's swipe-back) feels best there
  if (reducedMotion || !window.Lenis || document.querySelector('.work-page')) return
  const lenis = new Lenis({ lerp: 0.13, wheelMultiplier: 1, anchors: { offset: -80 }, allowNestedScroll: true })
  document.documentElement.classList.add('has-lenis')
  window.__lenis = lenis
  if (window.gsap && window.ScrollTrigger) {
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add((t) => lenis.raf(t * 1000))
    gsap.ticker.lagSmoothing(0)
  } else {
    const loop = (t) => {
      lenis.raf(t)
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  }
})()

// Text roll (skiper58): each letter of a tab label rolls up to a second copy
// on hover, starting from the middle of the word. Kannada and Hindi letters
// join into each other, so words in those scripts roll as one piece.
function rollText(text) {
  const parts = /^[\p{Script=Latin}\p{P}\s]+$/u.test(text) ? [...text] : [text]
  const roll = document.createElement('span')
  roll.className = 'roll-text'
  roll.setAttribute('aria-hidden', 'true')
  for (let r = 0; r < 2; r++) {
    const row = document.createElement('span')
    row.className = 'roll-row'
    parts.forEach((ch, i) => {
      const c = document.createElement('span')
      c.className = 'roll-char'
      c.textContent = ch
      c.style.setProperty('--delay', `${Math.round(35 * Math.abs(i - (parts.length - 1) / 2))}ms`)
      row.append(c)
    })
    roll.append(row)
  }
  return roll
}

document.querySelectorAll('.topbar .pill:not(.pill-icon):not(.theme-pill)').forEach((pill) => {
  // the greeting's word changes as you scroll, so it rolls its inner word
  const host = pill.querySelector('[data-greeting]') || pill
  const text = host.textContent.trim()
  if (!text) return
  pill.setAttribute('aria-label', pill.getAttribute('aria-label') || text)
  host.textContent = ''
  host.append(rollText(text))
})

// Lawyer view / Engineer view: one switch per build
document.querySelectorAll('.build').forEach((card) => {
  const buttons = card.querySelectorAll('[data-view]')
  buttons.forEach((b) =>
    b.addEventListener('click', () => {
      buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)))
      card.querySelectorAll('[data-view-panel]').forEach((p) => {
        const show = p.dataset.viewPanel === b.dataset.view
        p.hidden = !show
        if (show && window.gsap && !reducedMotion) gsap.fromTo(p, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' })
      })
    }),
  )
})

;(function scrollEffects() {
  if (reducedMotion || !window.gsap || !window.ScrollTrigger) return
  gsap.registerPlugin(ScrollTrigger)

  // section titles write themselves in, letter by letter, as they scroll up (skiper31)
  if (window.SplitText) {
    gsap.registerPlugin(SplitText)
    document.querySelectorAll('[data-reveal-title]').forEach((title) => {
      const split = new SplitText(title, { type: 'words,chars' })
      gsap.fromTo(
        split.chars,
        { opacity: 0.1, y: '0.15em' },
        {
          opacity: 1,
          y: 0,
          ease: 'none',
          stagger: 0.06,
          scrollTrigger: { trigger: title, start: 'top 88%', end: 'top 55%', scrub: true },
        },
      )
    })
  }

  // "I am a lawyer who builds." holds still for a moment before the projects
  const intro = document.querySelector('.intro-more')
  if (intro && !matchMedia('(max-width: 760px)').matches) ScrollTrigger.create({ trigger: intro, start: 'top top', end: '+=35%', pin: true, anticipatePin: 1 })

})()


// Opening: PRADYUN KRISHNAN starts whole and stacked. Scrolling spreads the
// letters flat across the screen (top and bottom, like a letterbox) while
// the portrait grows between them. The stage is pinned while this plays.
;(function opening() {
  const root = document.querySelector('.opening')
  const stage = root?.querySelector('[data-opening]')
  if (!stage) return
  const words = [...stage.querySelectorAll('.opening-word')].map((w) => w.textContent.trim())
  const portrait = stage.querySelector('.opening-portrait')
  const measure = document.createElement('canvas').getContext('2d')
  const clamp = (x) => Math.max(0, Math.min(1, x))
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
  const lerp = (a, b, t) => a + (b - a) * t

  const letters = words.flatMap((word, row) =>
    [...word].map((ch, i) => {
      const el = document.createElement('span')
      el.className = 'opening-letter'
      el.setAttribute('aria-hidden', 'true')
      el.textContent = ch
      // Christmas theme: a Santa hat on the N that ends PRADYUN
      if (row === 0 && i === word.length - 1) {
        el.insertAdjacentHTML(
          'beforeend',
          `<svg class="santa-hat xmas-only" viewBox="0 0 100 80" aria-hidden="true">
            <path class="hat-red" d="M10 62C18 30 42 6 70 8c14 1 22 12 20 30-6-10-14-14-22-12 6 10 6 24 2 36Z" />
            <rect class="hat-white" x="4" y="58" width="74" height="16" rx="8" />
            <circle class="hat-white" cx="90" cy="40" r="9" />
          </svg>`,
        )
      }
      stage.append(el)
      return { el, row, i, n: word.length }
    }),
  )
  root.classList.add('is-live')

  let geo = null
  function layout() {
    const W = stage.clientWidth
    const H = stage.clientHeight
    const fs = Math.max(44, Math.min(W / 7.2, H / 4.2, 152))
    measure.font = `600 ${fs}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-display')}`
    const widths = words.map((w) => [...w].map((c) => measure.measureText(c).width))
    const S = Math.min(W * (W < 640 ? 0.6 : 0.46), H * 0.5, 380) // portrait diameter
    stage.style.setProperty('--seal-size', `${S}px`)
    geo = { W, H, cx: W / 2, cy: H / 2, fs, widths, S }
    letters.forEach((l) => (l.el.style.fontSize = `${fs}px`))
  }

  function render(p) {
    const { W, cx, cy, fs, widths, S } = geo
    const flat = ease(clamp(p / 0.8))
    const grow = ease(clamp(p / 0.85))
    portrait.style.setProperty('--grow', Math.max(0.001, grow).toFixed(4))
    portrait.style.opacity = grow < 0.02 ? 0 : 1
    letters.forEach(({ el, row, i, n }) => {
      const ws = widths[row]
      const total = ws.reduce((a, b) => a + b, 0)
      let before = 0
      for (let j = 0; j < i; j++) before += ws[j]
      // whole and stacked, centred
      const sx = cx - total / 2 + before
      const sy = cy + (row ? fs * 0.02 : -fs * 0.9)
      // spread across the width, above and below the portrait
      const fx = 24 + ((W - 48) * (i + 0.5)) / n - ws[i] * 0.3
      const fy = row ? cy + S / 2 + fs * 0.15 : cy - S / 2 - fs
      const x = lerp(sx, fx, flat)
      const y = lerp(sy, fy, flat)
      const s = lerp(1, 0.62, flat)
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${s.toFixed(3)})`
    })
  }

  let progress = 0
  const start = () => {
    layout()
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (still || !window.gsap || !window.ScrollTrigger) {
      // no scroll scene: show it already spread
      progress = 1
      render(1)
      return
    }
    gsap.registerPlugin(ScrollTrigger)
    // phones get a shorter, softly smoothed scroll so it doesn't feel heavy
    const small = matchMedia('(max-width: 760px)').matches
    // the scroll drives a small tween, so on phones the name eases after
    // the finger instead of snapping to it
    const state = { p: 0 }
    gsap.to(state, {
      p: 1,
      ease: 'none',
      onUpdate: () => render((progress = state.p)),
      scrollTrigger: {
        trigger: stage,
        start: 'top top',
        end: small ? '+=65%' : '+=110%',
        pin: true,
        anticipatePin: 1,
        scrub: small ? 0.5 : true,
        onRefresh: () => {
          layout()
          render(progress)
        },
      },
    })
    // this pin is made after fonts load, later than the pins below it, so
    // put the triggers back in page order and measure again
    ScrollTrigger.sort()
    ScrollTrigger.refresh()
    render(progress)
  }
  ;(document.fonts?.ready || Promise.resolve()).then(start)
})()

// Snow for the Christmas theme: soft flakes drifting down the whole page.
// Only while the theme is on, and not for reduced motion.
;(function snow() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const root = document.documentElement
  let canvas = null
  let raf = 0
  let flakes = []

  function start() {
    canvas = Object.assign(document.createElement('canvas'), { className: 'snow' })
    canvas.setAttribute('aria-hidden', 'true')
    document.body.append(canvas)
    const ctx = canvas.getContext('2d')
    const size = () => {
      if (!canvas) return
      const dpr = devicePixelRatio || 1
      canvas.width = innerWidth * dpr
      canvas.height = innerHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    size()
    addEventListener('resize', size)
    const count = Math.round(Math.min(140, (innerWidth * innerHeight) / 9000))
    flakes = Array.from({ length: count }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      r: 1 + Math.random() * 2.6,
      vy: 0.3 + Math.random() * 0.9,
      sway: Math.random() * Math.PI * 2,
    }))
    const tick = () => {
      ctx.clearRect(0, 0, innerWidth, innerHeight)
      ctx.fillStyle = '#c7d3e0' // pale blue-grey, so flakes show on white
      for (const f of flakes) {
        f.y += f.vy
        f.sway += 0.01
        f.x += Math.sin(f.sway) * 0.4
        if (f.y > innerHeight + 5) {
          f.y = -5
          f.x = Math.random() * innerWidth
        }
        ctx.beginPath()
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2)
        ctx.fill()
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
  }

  function stop() {
    cancelAnimationFrame(raf)
    canvas?.remove()
    canvas = null
  }

  const sync = () => (root.classList.contains('xmas') ? !canvas && start() : canvas && stop())
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['class'] })
  sync()
})()

// Demos sit in iframes. When a demo has nothing left to scroll, it hands the
// wheel back to the page so the deck keeps turning.
addEventListener('message', (e) => {
  if (e.origin !== location.origin || !e.data || typeof e.data.wheel !== 'number') return
  if (window.__deckWheel?.(e.data.wheel)) return
  if (window.__lenis) window.__lenis.scrollTo(window.__lenis.targetScroll + e.data.wheel)
  else scrollBy(0, e.data.wheel)
})

// Enlarge: open a demo in a big window people can click around in
;(function enlarge() {
  const dlg = document.querySelector('[data-demo-dialog]')
  if (!dlg) return
  const frame = dlg.querySelector('iframe')
  const title = dlg.querySelector('[data-demo-title]')
  document.querySelectorAll('[data-enlarge]').forEach((b) =>
    b.addEventListener('click', () => {
      frame.src = b.dataset.enlarge
      frame.title = b.dataset.name + ' demo, enlarged'
      title.textContent = b.dataset.name
      window.__lenis?.stop()
      dlg.showModal()
    }),
  )
  const close = () => dlg.open && dlg.close()
  dlg.querySelector('[data-demo-close]').addEventListener('click', close)
  dlg.addEventListener('click', (e) => e.target === dlg && close())
  dlg.addEventListener('close', () => {
    if (!document.documentElement.classList.contains('deck-locked')) window.__lenis?.start()
    frame.src = 'about:blank'
  })
})()

// § 01 Projects: tiles. Each one shows a still of its demo, muted. Hovering
// brings it into colour, a soft light follows the pointer, and the demo plays.
// On touch screens a tile plays when it is mostly on screen.
;(function projectTiles() {
  const tiles = [...document.querySelectorAll('[data-tile]')]
  if (!tiles.length) return
  let lastScroll = 0
  addEventListener('scroll', () => (lastScroll = performance.now()), { passive: true })
  const scrolling = () => performance.now() - lastScroll < 200
  const hoverable = matchMedia('(hover: hover)').matches
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  tiles.forEach((tile) => {
    const frame = tile.querySelector('iframe')
    const cover = tile.querySelector('.tile-cover')
    const win = tile.querySelector('.tile-window')
    const ctl = () => {
      try {
        const d = frame.contentDocument
        return { t: d.getElementById('t'), b: d.getElementById('play') }
      } catch { return {} }
    }
    const playing = (c) => /pause/i.test(c.b?.textContent || '')
    const set = (v, play) => {
      const c = ctl()
      if (!c.t || !c.b) return
      if (playing(c)) c.b.click()
      c.t.value = v
      c.t.dispatchEvent(new Event('input'))
      if (play && !still) c.b.click()
    }
    // the demo is laid out at a readable width (900px, 560px on phones) and
    // scaled down only when the window is narrower than that
    // the demo keeps one size while its card widens and narrows (a narrow card
    // just crops it), scaled to fit the card at its widest
    const fit = () => {
      const row = tile.closest('.tiles')
      const narrow = innerWidth <= 900
      const open = narrow ? win.clientWidth : ((row.clientWidth - 2 * 16) * 3.2) / 5.2 * 0.9
      const base = narrow ? 520 : 760
      const sc = Math.min(1, open / base)
      win.style.setProperty('--s', sc)
      win.style.setProperty('--w', `${base}px`)
    }
    new ResizeObserver(fit).observe(tile.closest('.tiles'))
    let started = false
    const start = () => {
      tile.classList.add('is-live')
      const c = ctl()
      if (!c.t || !c.b) return // not loaded yet: the load handler below starts it
      // every hover plays the demo from the beginning
      if (!playing(c)) set(0, true)
      started = true
    }
    // at rest each card shows the start of its demo (Rete on Text, and so on)
    frame.addEventListener('load', () => (tile.classList.contains('is-live') ? start() : set(0, false)))
    // the coloured background opens the project page
    cover.addEventListener('click', (e) => {
      if (!e.target.closest('.tile-window')) location.href = tile.dataset.href
    })
    // the demo ignores the mouse wheel (so the page scrolls smoothly over it)
    // until it is clicked; then it is fully interactive until the pointer leaves
    const shield = win.querySelector('.tile-shield')
    // in the three-across grid the demos are previews: a click opens the project page
    shield.addEventListener('click', () => (location.href = tile.dataset.href))
    tile.addEventListener('pointerleave', () => tile.classList.remove('is-using'))
    const stop = () => {
      tile.classList.remove('is-live')
      const c = ctl()
      if (playing(c)) c.b.click()
      set(0, false) // back to the beginning for next time
    }
    if (hoverable) {
      // only a real hover plays it: a card sliding under a still pointer while
      // the page scrolls does not count
      tile.addEventListener('pointermove', () => {
        if (!tile.classList.contains('is-live') && !scrolling()) start()
      })
      tile.addEventListener('pointerleave', stop)
      tile.addEventListener('pointermove', (e) => {
        const r = cover.getBoundingClientRect()
        cover.style.setProperty('--mx', `${e.clientX - r.left}px`)
        cover.style.setProperty('--my', `${e.clientY - r.top}px`)
      })
    } else {
      // phones: the card in the middle of the screen plays and lights up as you scroll
      new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), {
        rootMargin: '-38% 0px -38% 0px',
      }).observe(cover)
    }
  })
  // one row: the card you hover widens, the others slim down
  const items = [...document.querySelectorAll('.tiles > li')].slice(0, tiles.length)
  const widen = (li) => items.forEach((x) => x.classList.toggle('is-wide', x === li))
  items.forEach((li) => li.addEventListener('pointermove', () => !li.classList.contains('is-wide') && !scrolling() && widen(li)))
  items.forEach((li) => li.addEventListener('focusin', () => widen(li)))
  widen(items[0])

  // the "more" tile gets the same light
  document.querySelectorAll('.more-panel').forEach((tile) => {
    const cover = tile
    tile.addEventListener('pointermove', (e) => {
      const r = cover.getBoundingClientRect()
      cover.style.setProperty('--mx', `${e.clientX - r.left}px`)
      cover.style.setProperty('--my', `${e.clientY - r.top}px`)
    })
  })
})()

// Project pages: swiping back (trackpad or touch) returns to the projects on the
// home page. With browser history the browser does this itself; this covers
// pages opened directly, where there is nothing to go back to.
;(function swipeBack() {
  if (!document.querySelector('.work-page')) return
  const home = '../index.html#projects'
  const hasHistory = document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1
  if (hasHistory) return
  let dx = 0
  let timer = 0
  addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
    dx += e.deltaX
    clearTimeout(timer)
    timer = setTimeout(() => (dx = 0), 250)
    if (dx < -140) location.href = home
  }, { passive: true })
  let x0 = null
  let y0 = 0
  addEventListener('touchstart', (e) => {
    const t = e.touches[0]
    x0 = t.clientX < 40 ? t.clientX : null
    y0 = t.clientY
  }, { passive: true })
  addEventListener('touchend', (e) => {
    if (x0 == null) return
    const t = e.changedTouches[0]
    if (t.clientX - x0 > 90 && Math.abs(t.clientY - y0) < 60) location.href = home
    x0 = null
  }, { passive: true })
})()

// Coming back from a project page (back button or swipe) lands on the projects
// again, not the top of the page.
;(function returnToProjects() {
  const section = document.querySelector('#projects')
  if (!section) return
  document.querySelectorAll('a[href^="work/"], [data-href^="work/"]').forEach((el) =>
    el.addEventListener('click', () => {
      try { sessionStorage.setItem('fromProject', '1') } catch {}
    }, true),
  )
  const back = () => {
    let flag = null
    try {
      flag = sessionStorage.getItem('fromProject')
      sessionStorage.removeItem('fromProject')
    } catch {}
    if (!flag) return
    const go = () => {
      window.ScrollTrigger?.refresh()
      const y = section.getBoundingClientRect().top + scrollY - 40
      if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true })
      else scrollTo(0, y)
    }
    ;(document.fonts?.ready || Promise.resolve()).then(() => setTimeout(go, 60))
  }
  // also covers pages restored from the browser's back-forward cache
  addEventListener('pageshow', back)
})()

// § 03 Experience: the soft light follows the pointer across each row
document.querySelectorAll('.ledger-row').forEach((row) =>
  row.addEventListener('pointermove', (e) => {
    const r = row.getBoundingClientRect()
    row.style.setProperty('--mx', `${e.clientX - r.left}px`)
    row.style.setProperty('--my', `${e.clientY - r.top}px`)
  }),
)

// Top bar menus open on hover with a mouse (Contents, languages, Theme).
// Clicking still works everywhere, and on touch screens it is the only way.
;(function hoverMenus() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return
  const wraps = [...document.querySelectorAll('.topbar .menu, .topbar .theme-menu')]
  const parts = (w) => {
    const button = w.querySelector('[data-menu], .theme-pill')
    return { button, panel: button && document.getElementById(button.getAttribute('aria-controls')) }
  }
  const set = (w, open) => {
    const { button, panel } = parts(w)
    if (!button || !panel) return
    panel.hidden = !open
    button.setAttribute('aria-expanded', String(open))
    w.classList.toggle('is-open', open)
  }
  wraps.forEach((w) => {
    let timer = 0
    w.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return
      clearTimeout(timer)
      wraps.forEach((o) => o !== w && set(o, false))
      set(w, true)
    })
    // with a mouse the menu is already open on hover, so a click keeps it open
    const { button, panel } = parts(w)
    button?.addEventListener('click', (e) => {
      if (e.detail > 0 && panel && !panel.hidden) e.stopImmediatePropagation()
    }, true)
    // a short grace period lets the pointer cross the gap into the menu
    w.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'mouse') return
      timer = setTimeout(() => set(w, false), 220)
    })
  })
})()

// § 02 Experience and education: a year rail on the left lights up the
// active role's span of time; big names in the middle; a card beside the
// active name. Hover, focus or scroll chooses the role. Tabs switch between
// experience and education. Names open the organisation's site in a new tab.
;(function timeline() {
  const root = document.querySelector('[data-timeline]')
  if (!root) return
  const section = root.closest('section')
  const tabs = [...section.querySelectorAll('.tl-tabs [role="tab"]')]
  const ind = section.querySelector('.tl-ind')
  const rail = root.querySelector('.tl-rail')
  const span = root.querySelector('.tl-span')
  const card = root.querySelector('.tl-card')
  const narrow = matchMedia('(max-width: 760px)')
  const Y0 = 2022
  const Y1 = 2027 // "now"
  const pct = (v) => ((Math.min(Y1, Math.max(Y0, v)) - Y0) / (Y1 - Y0)) * 100
  for (let y = Y0; y <= Y1; y++) {
    const t = document.createElement('span')
    t.className = 'tl-year'
    t.textContent = y === Y1 ? 'now' : y
    t.style.setProperty('--p', `${pct(y)}%`)
    rail.append(t)
  }
  let list = root.querySelector('.tl-list:not([hidden])')
  let active = null

  function select(row) {
    if (!row || row === active) return
    active = row
    list.querySelectorAll('.tl-row').forEach((r) => r.classList.toggle('is-on', r === row))
    const a = pct(+row.dataset.start)
    const b = pct(+row.dataset.end)
    span.style.setProperty('--a', `${a}%`)
    span.style.setProperty('--b', `${Math.max(b - a, 2)}%`)
    card.innerHTML = ''
    const inner = document.createElement('div')
    inner.className = 'tl-card-inner'
    const logo = Object.assign(document.createElement('span'), { className: 'tl-logo', textContent: row.dataset.logo })
    logo.style.background = row.dataset.color
    logo.setAttribute('aria-hidden', 'true')
    const role = Object.assign(document.createElement('p'), { className: 'tl-role', textContent: row.dataset.role })
    const meta = Object.assign(document.createElement('p'), { className: 'tl-meta', textContent: row.dataset.meta })
    const line = Object.assign(document.createElement('p'), { className: 'tl-desc', textContent: row.dataset.line })
    inner.append(logo, role, meta, line)
    card.append(inner)
    if (narrow.matches) row.append(card)
    else {
      root.querySelector('.tl-lists').append(card)
      card.style.top = `${row.offsetTop}px`
    }
  }

  function wire(l) {
    l.querySelectorAll('.tl-row').forEach((row) => {
      row.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && select(row))
      row.querySelector('.tl-name').addEventListener('focus', () => select(row))
      // a click or tap opens the details for that role
      row.querySelector('.tl-name').addEventListener('click', () => select(row))
    })
  }
  root.querySelectorAll('.tl-list').forEach(wire)

  // scrolling picks the name that has reached the upper part of the screen
  let ticking = false
  addEventListener('scroll', () => {
    if (ticking) return
    ticking = true
    requestAnimationFrame(() => {
      ticking = false
      const rect = root.getBoundingClientRect()
      if (rect.bottom < 0 || rect.top > innerHeight) return
      const line = innerHeight * 0.42
      let pick = null
      list.querySelectorAll('.tl-row').forEach((r) => {
        if (r.getBoundingClientRect().top <= line) pick = r
      })
      if (pick) select(pick)
    })
  }, { passive: true })

  function moveInd() {
    const t = tabs.find((x) => x.getAttribute('aria-selected') === 'true')
    ind.style.width = `${t.offsetWidth}px`
    ind.style.transform = `translateX(${t.offsetLeft}px)`
  }
  function choose(tab) {
    tabs.forEach((t) => {
      const on = t === tab
      t.setAttribute('aria-selected', String(on))
      t.tabIndex = on ? 0 : -1
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on
    })
    list = document.getElementById(tab.getAttribute('aria-controls'))
    active = null
    moveInd()
    select(list.querySelector('.tl-row'))
    window.ScrollTrigger?.refresh()
  }
  tabs.forEach((t) => t.addEventListener('click', () => choose(t)))
  section.querySelector('.tl-tabs').addEventListener('keydown', (e) => {
    const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]
    if (!d) return
    e.preventDefault()
    const i = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true')
    const next = tabs[(i + d + tabs.length) % tabs.length]
    choose(next)
    next.focus()
  })
  addEventListener('resize', () => {
    moveInd()
    const r = active
    active = null
    select(r)
  })
  ;(document.fonts?.ready || Promise.resolve()).then(moveInd)
  select(list.querySelector('.tl-row'))
})()

// § 05 Places: the Atlas. A flat map of the places I've been; hover (or tap)
// a place in the list and the map folds up into a globe turned to it, then
// unfolds again when you move away. Uses d3-geo and topojson (both ISC).
;(function atlas() {
  const root = document.querySelector('[data-atlas]')
  if (!root || !window.d3?.geoPath || !window.topojson) return
  const d3 = window.d3
  const svg = root.querySelector('svg')
  const capName = root.querySelector('.atlas-caption b')
  const capNote = root.querySelector('.atlas-caption span')
  const buttons = [...root.querySelectorAll('.atlas-place')]
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  const NS = 'http://www.w3.org/2000/svg'
  const W = 600
  // phones: a flat map at rest that folds into a big globe filling the width;
  // the frame grows taller as it folds so the globe has room
  const phone = matchMedia('(max-width: 760px)').matches
  const H = 330
  const GLOBE = phone ? 288 : 160
  const REST = [0, 0]
  const frameH = (t) => (phone ? H + (600 - H) * (1 - t) : H)
  const sub = root.closest('section')?.querySelector('.places-sub')
  if (phone && sub) sub.textContent = '45 places, and counting. Tap one to fold the map into a globe and find it.'
  const HOME = ['India', 'Netherlands']
  const NOTES = { India: 'Home', Netherlands: 'Home', Argentina: 'Exchange semester', 'United Kingdom': 'England and Scotland' }
  const ALIAS = { 'Bosnia and Herzegovina': 'Bosnia and Herz.', 'North Macedonia': 'Macedonia' }
  // places too small for this map are drawn as small rings
  const POINTS = { Liechtenstein: [9.55, 47.16], Monaco: [7.42, 43.74], Vatican: [12.45, 41.9], 'Hong Kong': [114.17, 22.3], Macao: [113.55, 22.2], Singapore: [103.82, 1.35] }
  const CENTRE = { Netherlands: [5.3, 52.2], India: [78.9, 21.5], France: [2.5, 46.5], Argentina: [-64, -34.5], 'United Kingdom': [-2.5, 54], Chile: [-71, -33] }
  const places = buttons.map((b) => b.dataset.place)

  fetch('data/countries-110m.json')
    .then((r) => r.json())
    .then((topo) => {
      const feats = topojson.feature(topo, topo.objects.countries).features.filter((f) => f.properties.name !== 'Antarctica')
      const byPlace = {}
      places.forEach((p) => {
        const f = feats.find((x) => x.properties.name === (ALIAS[p] || p))
        if (f) byPlace[p] = f
      })
      const placeOf = new Map(Object.entries(byPlace).map(([p, f]) => [f, p]))
      const byName = Object.fromEntries(feats.map((f) => [f.properties.name, f]))
      const centre = (p) => CENTRE[p] || POINTS[p] || ((byPlace[p] || byName[p]) && d3.geoCentroid(byPlace[p] || byName[p]))

      // a projection that blends a globe (0) into a flat map (1)
      const mutate = d3.geoProjectionMutator((a) => (x, y) => {
        const o = d3.geoOrthographicRaw(x, y)
        const e = d3.geoEquirectangularRaw(x, y)
        return [o[0] * (1 - a) + e[0] * a, o[1] * (1 - a) + e[1] * a]
      })
      const proj = mutate(1)
      const path = d3.geoPath(proj)
      const el = (tag, attrs = {}) => {
        const n = document.createElementNS(NS, tag)
        Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v))
        return n
      }
      const sphere = el('path', { class: 'atlas-sphere' })
      const land = el('g', { class: 'atlas-land' })
      const rings = el('g', { class: 'atlas-rings' })
      svg.append(sphere, land, rings)
      const shapes = feats.map((f) => {
        const p = placeOf.get(f)
        const n = el('path', { class: p ? (HOME.includes(p) ? 'is-home' : 'is-visited') : '' })
        n.__f = f
        n.__p = p
        land.append(n)
        return n
      })
      const marks = Object.keys(POINTS).filter((p) => places.includes(p)).map((p) => {
        const c = el('circle', { r: 3, class: 'atlas-ring' })
        c.__p = p
        rings.append(c)
        return c
      })

      let t = 1
      let tTo = 1
      let rot = REST.slice()
      let rotTo = REST.slice()
      let active = null
      let raf = 0
      function draw() {
        mutate(t)
        // globe radius 150; the flat map fills the width
        proj.scale(GLOBE + (W / (2 * Math.PI) - GLOBE) * t).translate([W / 2, frameH(t) / 2 + t * (14 * Math.PI / 180) * (W / (2 * Math.PI))]).rotate(rot).clipAngle(t < 0.98 ? 90 + 89 * t : null).precision(0.5)
        if (phone) svg.setAttribute('viewBox', `0 0 ${W} ${frameH(t).toFixed(1)}`)
        sphere.setAttribute('d', path({ type: 'Sphere' }))
        shapes.forEach((n) => {
          n.setAttribute('d', path(n.__f) || '')
          n.classList.toggle('is-active', !!active && (n.__p || n.__f.properties.name) === active)
        })
        const view = [-rot[0], -rot[1]]
        marks.forEach((c) => {
          const xy = proj(POINTS[c.__p])
          const front = t > 0.98 || d3.geoDistance(POINTS[c.__p], view) < Math.PI / 2
          c.setAttribute('cx', xy ? xy[0] : -99)
          c.setAttribute('cy', xy ? xy[1] : -99)
          c.style.opacity = front ? 1 : 0
          c.classList.toggle('is-active', c.__p === active)
        })
      }
      function tick() {
        const k = still ? 1 : 0.085
        t += (tTo - t) * k
        rot = rot.map((v, i) => v + (rotTo[i] - v) * k)
        draw()
        const done = Math.abs(tTo - t) < 0.001 && Math.abs(rotTo[0] - rot[0]) < 0.05 && Math.abs(rotTo[1] - rot[1]) < 0.05
        raf = done ? 0 : requestAnimationFrame(tick)
      }
      const go = () => !raf && (raf = requestAnimationFrame(tick))

      function show(p) {
        active = p
        buttons.forEach((b) => b.classList.toggle('is-on', b.dataset.place === p))
        capName.textContent = p || ''
        capNote.textContent = p ? NOTES[p] || (places.includes(p) ? '' : 'Not yet') : ''
        root.classList.toggle('is-folded', !!p)
        const c = p && centre(p)
        if (c) {
          // fold into a globe and turn the short way round to the place
          let x = -c[0]
          while (x - rot[0] > 180) x -= 360
          while (x - rot[0] < -180) x += 360
          rotTo = [x, -c[1] * 0.75]
          tTo = 0
        } else {
          rotTo = [0, 0]
          tTo = 1
        }
        go()
      }

      let pinned = null
      let leaveTimer = 0
      const unfoldSoon = () => {
        clearTimeout(leaveTimer)
        leaveTimer = setTimeout(() => !pinned && show(null), 450)
      }
      buttons.forEach((b) => {
        b.addEventListener('pointerenter', (e) => {
          if (e.pointerType !== 'mouse' || pinned) return
          clearTimeout(leaveTimer)
          show(b.dataset.place)
        })
        b.addEventListener('focus', () => show(b.dataset.place))
        b.addEventListener('click', () => {
          pinned = pinned === b.dataset.place ? null : b.dataset.place
          show(pinned)
        })
      })
      const list = root.querySelector('.atlas-list')
      const figure = root.querySelector('.atlas-map')
      list.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && unfoldSoon())
      // moving onto the map keeps the globe up, so it can be turned and clicked
      figure.addEventListener('pointerenter', () => clearTimeout(leaveTimer))
      figure.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && !drag && unfoldSoon())

      // drag the globe round; a short press without moving picks a country
      let drag = null
      svg.addEventListener('pointerdown', (e) => {
        if (t > 0.5) return
        drag = { x: e.clientX, y: e.clientY, rot: rot.slice(), moved: false }
        svg.setPointerCapture(e.pointerId)
      })
      svg.addEventListener('pointermove', (e) => {
        if (!drag) return
        const dx = e.clientX - drag.x
        const dy = e.clientY - drag.y
        if (Math.hypot(dx, dy) > 4) drag.moved = true
        if (!drag.moved) return
        const k = 180 / (svg.getBoundingClientRect().width * 0.55)
        rot = rotTo = [drag.rot[0] + dx * k, Math.max(-70, Math.min(70, drag.rot[1] - dy * k))]
        draw()
      })
      const endDrag = () => {
        if (drag?.moved) pinned = active || pinned
        drag = null
      }
      svg.addEventListener('pointerup', endDrag)
      svg.addEventListener('pointercancel', endDrag)
      svg.addEventListener('click', (e) => {
        if (drag?.moved) return
        const target = e.target.closest('path, circle')
        const name = target?.__p || target?.__f?.properties.name
        if (!name) return
        pinned = name
        show(name)
      })
      // Escape, or the button under the globe, lays the map flat again
      const flat = document.createElement('button')
      flat.type = 'button'
      flat.className = 'atlas-flat'
      flat.textContent = 'Back to the map'
      figure.append(flat)
      flat.addEventListener('click', () => {
        pinned = null
        show(null)
      })
      addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && active) {
          pinned = null
          show(null)
        }
      })
      draw()
    })
    .catch(() => root.classList.add('is-offline'))
})()
