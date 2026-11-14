// Theme toggle + interactive halftone portrait. The halftone sampler is
// adapted from cali.so's components/halftone-portrait.tsx (MIT).

;(function theme() {
  const root = document.documentElement
  const control = document.querySelector('[data-theme-control]')
  if (!control) return
  const icon = control.querySelector('.dock-item')
  const slider = control.querySelector('[role="radiogroup"]')
  const stops = [...slider.querySelectorAll('[role="radio"]')]
  const knob = slider.querySelector('.ts-knob')
  const label = slider.querySelector('.ts-label')
  const names = { mono: 'Black ink', blue: 'Blue ink', xmas: 'Christmas' }
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches

  const current = () => stops.find((s) => root.classList.contains(s.dataset.theme))?.dataset.theme || 'mono'

  // the knob rests on the chosen stop
  function show(theme) {
    stops.forEach((s) => {
      const on = s.dataset.theme === theme
      s.setAttribute('aria-checked', String(on))
      s.tabIndex = on ? 0 : -1
    })
    const stop = stops.find((s) => s.dataset.theme === theme)
    knob.style.transform = `translateX(${stop.offsetLeft}px)`
    label.textContent = names[theme]
  }

  function apply(theme) {
    if (theme === current()) return show(theme)
    const swap = () => {
      root.classList.add('theme-switching')
      stops.forEach((s) => root.classList.toggle(s.dataset.theme, s.dataset.theme === theme && theme !== 'mono'))
      try {
        localStorage.setItem('theme', theme)
      } catch {}
      requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-switching')))
    }
    show(theme)
    // the new ink wipes across on a diagonal (skiper26)
    if (document.startViewTransition && !still()) document.startViewTransition(swap)
    else swap()
  }

  // keyboard presses (Enter, Space); pointer presses are handled below
  stops.forEach((s) => s.addEventListener('click', (e) => e.detail === 0 && apply(s.dataset.theme)))

  // arrow keys move along the stops, like any radio group
  slider.addEventListener('keydown', (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    if (!step) return
    e.preventDefault()
    const i = stops.findIndex((s) => s.dataset.theme === current())
    const next = stops[(i + step + stops.length) % stops.length]
    apply(next.dataset.theme)
    next.focus()
  })

  // drag along the slider: the knob follows and snaps to the nearest stop
  let press = null
  let dragged = false
  slider.addEventListener('pointerdown', (e) => {
    press = e.clientX
    dragged = false
    slider.setPointerCapture(e.pointerId)
  })
  slider.addEventListener('pointermove', (e) => {
    if (press === null) return
    if (!dragged && Math.abs(e.clientX - press) < 5) return
    dragged = true
    slider.dataset.dragging = ''
    const r = slider.getBoundingClientRect()
    const x = Math.max(stops[0].offsetLeft, Math.min(stops[2].offsetLeft, e.clientX - r.left - knob.offsetWidth / 2))
    knob.style.transform = `translateX(${x}px)`
  })
  slider.addEventListener('pointerup', (e) => {
    if (press === null) return
    press = null
    delete slider.dataset.dragging
    if (!dragged) {
      // a plain press: pick the stop under the pointer
      const hit = stops.find((s) => {
        const r = s.getBoundingClientRect()
        return e.clientX >= r.left && e.clientX <= r.right
      })
      if (hit) apply(hit.dataset.theme)
      return
    }
    const r = slider.getBoundingClientRect()
    const x = e.clientX - r.left
    const nearest = stops.reduce((a, s) =>
      Math.abs(s.offsetLeft + s.offsetWidth / 2 - x) < Math.abs(a.offsetLeft + a.offsetWidth / 2 - x) ? s : a,
    )
    apply(nearest.dataset.theme)
  })
  slider.addEventListener('pointercancel', () => {
    press = null
    delete slider.dataset.dragging
    show(current())
  })

  // hover opens it on desktop; a tap or Enter on the icon opens it anywhere
  const setOpen = (open) => {
    control.toggleAttribute('data-open', open)
    icon.setAttribute('aria-expanded', String(open))
    if (open) show(current())
  }
  icon.addEventListener('click', () => setOpen(!control.hasAttribute('data-open')))
  control.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && setOpen(true))
  control.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && setOpen(false))
  control.addEventListener('focusout', (e) => !control.contains(e.relatedTarget) && setOpen(false))
  document.addEventListener('keydown', (e) => e.key === 'Escape' && control.hasAttribute('data-open') && (setOpen(false), icon.focus()))
  document.addEventListener('click', (e) => !control.contains(e.target) && setOpen(false))
  show(current())
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
document.querySelectorAll('.reveal').forEach((button) => {
  const note = document.getElementById(button.getAttribute('aria-controls'))
  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true'
    button.setAttribute('aria-expanded', String(open))
    note.toggleAttribute('data-open', open)
  })
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
    out.append(span('typed-close', close + ' '), span('typed-end', end))
    return
  }

  // a typewriter rhythm: uneven keystrokes, a beat after punctuation
  async function type(target, text) {
    for (const ch of text) {
      target.textContent += ch
      await wait(/[.,…]/.test(ch) ? 260 : 45 + Math.random() * 70)
    }
  }

  async function run() {
    const caret = span('typed-caret')
    const head = span('')
    out.append(head, caret)
    await type(head, lead)
    for (const [i, text] of items.entries()) {
      const s = span('typed-item')
      out.insertBefore(s, caret)
      await type(s, text)
      await wait(380)
      s.dataset.struck = ''
      await wait(320)
      out.insertBefore(document.createTextNode(i < items.length - 1 ? ', ' : '.'), caret)
    }
    await wait(500)
    const c = span('typed-close')
    out.insertBefore(c, caret)
    await type(c, close)
    await wait(700)
    out.insertBefore(document.createTextNode(' '), caret)
    const e = span('typed-end')
    out.insertBefore(e, caret)
    await type(e, end)
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
  const el = (tag, cls) => Object.assign(document.createElement(tag), cls ? { className: cls } : {})

  // ---- frames, their masks and every view of them ----

  function makeFrame(img) {
    const mask = el('canvas')
    mask.width = MASK_W
    mask.height = MASK_H
    const frame = {
      src: img.getAttribute('src'),
      caption: img.dataset.caption || '',
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
    all.textContent = 'develop all'
    all.setAttribute('aria-label', `Develop every frame of ${title}`)
    all.addEventListener('click', () => roll.frames.forEach((f, i) => setTimeout(() => develop(f), still ? 0 : i * 70)))
    head.append(h, meta, all)
    root.append(head)
    roll.refresh = () => (all.hidden = roll.frames.every((f) => f.developed))

    // leader, the photos, then unexposed frames to fill the last strip
    const cells = ['leader', ...roll.frames]
    while (cells.length % PER) cells.push('empty')
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
        const view = makeView(cell, { number: i + 1, label: `Open frame ${i + 1} of ${title}` })
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
      big = makeView(frame, { large: true, label: `Frame ${index + 1}, scratch to develop` })
      big.el.tabIndex = -1
      wire(big, null)
      stage.append(big.el)
      count.textContent = `${index + 1} / ${roll.frames.length}`
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
  if (reducedMotion || !window.Lenis) return
  const lenis = new Lenis({ lerp: 0.14, anchors: { offset: -80 } })
  document.documentElement.classList.add('has-lenis')
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

document.querySelectorAll('.topbar .pill:not(.pill-icon)').forEach((pill) => {
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
      const split = new SplitText(title, { type: 'chars' })
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

  // build cards: each one shrinks back a little as the next slides over it (skiper16)
  const cards = gsap.utils.toArray('.build')
  cards.forEach((card, i) => {
    if (i === cards.length - 1) return
    gsap.to(card, {
      scale: 1 - (cards.length - 1 - i) * 0.04,
      ease: 'none',
      scrollTrigger: {
        trigger: cards[i + 1],
        start: 'top bottom',
        end: 'top top+=200',
        scrub: true,
      },
    })
  })
})()

// § 06 Places: a dotted world map; countries visited are drawn in ink, and
// hovering one names it
;(function worldMap() {
  const fig = document.querySelector('[data-world]')
  const data = window.WORLD_DOTS
  if (!fig || !data) return
  const canvas = fig.querySelector('canvas')
  const caption = fig.querySelector('[data-world-caption]')
  const ctx = canvas.getContext('2d')
  const { rows, cols } = data
  const owner = new Map() // cell → country index
  data.countries.forEach((c, k) => c.cells.forEach((cell) => owner.set(cell, k)))
  // "Netherlands:2024:a note|India" → { name: { year, note } }
  const visited = new Map(
    fig.dataset.visited
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const [name, year = '', note = ''] = s.split(':').map((x) => x.trim())
        return [name.toLowerCase(), { year, note }]
      }),
  )
  const blankCaption = caption.textContent
  let hover = -1

  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim()

  function draw() {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    const dpr = devicePixelRatio || 1
    if (canvas.width !== Math.round(w * dpr)) {
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    const cw = w / cols
    const ch = h / rows
    const r = Math.min(cw, ch) * 0.32
    const land = css('--gray-4')
    const ink = css('--foreground')
    const mark = css('--redline')
    data.countries.forEach((c, k) => {
      const been = visited.has(c.name.toLowerCase())
      ctx.fillStyle = k === hover && been ? mark : been ? ink : land
      const rr = been ? r * 1.15 : r
      c.cells.forEach((cell) => {
        const x = ((cell % cols) + 0.5) * cw
        const y = (Math.floor(cell / cols) + 0.5) * ch
        ctx.beginPath()
        ctx.arc(x, y, rr, 0, Math.PI * 2)
        ctx.fill()
      })
    })
  }

  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect()
    const col = Math.floor(((e.clientX - rect.left) / rect.width) * cols)
    const row = Math.floor(((e.clientY - rect.top) / rect.height) * rows)
    // look at the cell and its neighbours, so small countries are easy to hit
    let k = -1
    for (const [dr, dc] of [[0, 0], [0, 1], [1, 0], [0, -1], [-1, 0]]) {
      const hit = owner.get((row + dr) * cols + col + dc)
      if (hit !== undefined) {
        k = hit
        break
      }
    }
    if (k === hover) return
    hover = k
    const c = data.countries[k]
    const info = c && visited.get(c.name.toLowerCase())
    caption.textContent = c ? (info ? [c.name, info.year, info.note].filter(Boolean).join(' · ') : c.name) : blankCaption
    draw()
  })
  canvas.addEventListener('pointerleave', () => {
    hover = -1
    caption.textContent = blankCaption
    draw()
  })

  new ResizeObserver(draw).observe(canvas)
  // redraw in the new ink when the colour toggle flips
  new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
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
    measure.font = `${fs}px "Instrument Serif"`
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
    ScrollTrigger.create({
      trigger: stage,
      start: 'top top',
      end: '+=110%',
      pin: true,
      scrub: true,
      onUpdate: (self) => render((progress = self.progress)),
      onRefresh: () => {
        layout()
        render(progress)
      },
    })
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
