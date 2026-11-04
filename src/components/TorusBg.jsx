import { useEffect, useRef } from 'react'

// Luminance ramp, dark to bright (the one from donut.c).
const RAMP = '.,-~:;=!*#$@'
const R1 = 1 // tube radius
const R2 = 2 // distance from the torus center to the tube center
const K2 = 5 // distance from the viewer
const FPS = 30

// A spinning ASCII torus drawn as text on a canvas, behind the page.
export default function TorusBg() {
  const ref = useRef()

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const color = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
    let cols, rows, cell, k1y, k1x, zbuf, chars
    let A = 1
    let B = 1
    let raf
    let last = 0

    const resize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      const dpr = window.devicePixelRatio || 1
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cell = Math.max(10, Math.min(w, h) / 50)
      // plain monospace, not JetBrains Mono: its ligatures turn == into ≡
      ctx.font = `${cell}px ui-monospace, monospace`
      const charW = ctx.measureText('M').width / cell // glyph width / height
      rows = Math.ceil(h / cell)
      cols = Math.ceil(w / (cell * charW))
      // the torus spans about 70% of the shorter side
      k1y = ((0.35 * Math.min(w, h)) / cell) * (K2 / (R1 + R2))
      k1x = k1y / charW
      zbuf = new Float32Array(cols * rows)
      chars = new Array(cols * rows)
      ctx.textBaseline = 'top'
      ctx.fillStyle = color
    }

    const draw = () => {
      zbuf.fill(0)
      chars.fill(' ')
      const cA = Math.cos(A), sA = Math.sin(A), cB = Math.cos(B), sB = Math.sin(B)
      for (let th = 0; th < 6.283; th += 0.05) {
        const ct = Math.cos(th), st = Math.sin(th)
        const cx = R2 + R1 * ct
        const cy = R1 * st
        for (let ph = 0; ph < 6.283; ph += 0.015) {
          const cp = Math.cos(ph), sp = Math.sin(ph)
          const x = cx * (cB * cp + sA * sB * sp) - cy * cA * sB
          const y = cx * (sB * cp - sA * cB * sp) + cy * cA * cB
          const ooz = 1 / (K2 + cA * cx * sp + cy * sA)
          const xp = Math.floor(cols / 2 + k1x * ooz * x)
          const yp = Math.floor(rows / 2 - k1y * ooz * y)
          if (xp < 0 || xp >= cols || yp < 0 || yp >= rows) continue
          const L = cp * ct * sB - cA * ct * sp - sA * st + cB * (cA * st - ct * sA * sp)
          const i = xp + yp * cols
          if (L > 0 && ooz > zbuf[i]) {
            zbuf[i] = ooz
            chars[i] = RAMP[Math.min(RAMP.length - 1, Math.floor(L * 8))]
          }
        }
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let r = 0; r < rows; r++) {
        ctx.fillText(chars.slice(r * cols, (r + 1) * cols).join(''), 0, r * cell)
      }
    }

    const frame = (now) => {
      raf = requestAnimationFrame(frame)
      if (now - last < 1000 / FPS) return
      // spin by elapsed time, so a slow machine spins at the same speed
      const dt = Math.min(now - last, 100) / 1000
      last = now
      A += dt * 0.8
      B += dt * 0.4
      draw()
    }

    resize()
    window.addEventListener('resize', resize)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) draw()
    else raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={ref} className="torus-bg" aria-hidden="true" />
}
