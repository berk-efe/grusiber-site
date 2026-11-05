import { useEffect, useRef, useState } from 'react'
import { LAND, MAP } from './worldmap.js'

// A live-looking threat map. The attacks are made up (random city pairs), so
// the header says SİMÜLASYON; there is no real feed behind it.

const CITIES = [
  ['giresun', 40.91, 38.39],
  ['istanbul', 41.01, 28.98],
  ['ankara', 39.93, 32.86],
  ['frankfurt', 50.11, 8.68],
  ['amsterdam', 52.37, 4.9],
  ['london', 51.51, -0.13],
  ['paris', 48.86, 2.35],
  ['stockholm', 59.33, 18.07],
  ['moscow', 55.76, 37.62],
  ['kyiv', 50.45, 30.52],
  ['bucharest', 44.43, 26.1],
  ['tehran', 35.69, 51.39],
  ['dubai', 25.2, 55.27],
  ['cairo', 30.04, 31.24],
  ['lagos', 6.52, 3.38],
  ['johannesburg', -26.2, 28.05],
  ['nairobi', -1.29, 36.82],
  ['mumbai', 19.08, 72.88],
  ['singapore', 1.35, 103.82],
  ['beijing', 39.9, 116.4],
  ['shanghai', 31.23, 121.47],
  ['seoul', 37.57, 126.98],
  ['tokyo', 35.68, 139.69],
  ['jakarta', -6.21, 106.85],
  ['sydney', -33.87, 151.21],
  ['new york', 40.71, -74.01],
  ['ashburn', 39.04, -77.49],
  ['chicago', 41.88, -87.63],
  ['dallas', 32.78, -96.8],
  ['san francisco', 37.77, -122.42],
  ['toronto', 43.65, -79.38],
  ['mexico city', 19.43, -99.13],
  ['bogota', 4.71, -74.07],
  ['sao paulo', -23.55, -46.63],
  ['buenos aires', -34.6, -58.38],
]

const TYPES = [
  { key: 'DDOS', color: '#ff2bd6' },
  { key: 'MALWARE', color: '#ffb000' },
  { key: 'PHISHING', color: '#00e5ff' },
  { key: 'SCAN', color: '#00ff9c' },
]

const FEED_LEN = 6
const pick = (a) => a[Math.floor(Math.random() * a.length)]

// longitude/latitude to canvas pixels, same projection as the land mask
function project(lat, lon, w, h) {
  const bottom = MAP.top - MAP.rows * MAP.step
  return [((lon + 180) / 360) * w, ((MAP.top - lat) / (MAP.top - bottom)) * h]
}

function clock(d = new Date()) {
  return d.toTimeString().slice(0, 8)
}

export default function CyberMap() {
  const wrap = useRef()
  const ref = useRef()
  const [feed, setFeed] = useState([])
  const [counts, setCounts] = useState(() => Object.fromEntries(TYPES.map((t) => [t.key, 0])))
  const [now, setNow] = useState(clock)

  useEffect(() => {
    const t = setInterval(() => setNow(clock()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const css = getComputedStyle(document.documentElement)
    const accent = css.getPropertyValue('--accent').trim()
    const dim = css.getPropertyValue('--dim').trim()
    const land = document.createElement('canvas')
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0, h = 0, cities = []
    let attacks = []
    let rings = []
    let raf, last = 0, nextSpawn = 0
    let visible = true

    const resize = () => {
      w = wrap.current.clientWidth
      h = Math.round((w * MAP.rows) / MAP.cols)
      const dpr = window.devicePixelRatio || 1
      for (const c of [canvas, land]) {
        c.width = w * dpr
        c.height = h * dpr
      }
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // the land is static: draw its dots once, then copy it every frame
      const lctx = land.getContext('2d')
      lctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      lctx.fillStyle = dim
      const cell = w / MAP.cols
      const dot = Math.max(1, cell * 0.42)
      LAND.forEach((row, r) => {
        for (let c = 0; c < MAP.cols; c++) {
          if (!((parseInt(row[c >> 2], 16) >> (3 - (c & 3))) & 1)) continue
          lctx.fillRect(c * cell + (cell - dot) / 2, r * cell + (cell - dot) / 2, dot, dot)
        }
      })
      cities = CITIES.map(([name, lat, lon]) => ({ name, xy: project(lat, lon, w, h) }))
    }

    const spawn = (t) => {
      const type = pick(TYPES)
      const to = Math.random() < 0.2 ? cities[0] : pick(cities)
      let from = pick(cities)
      while (from === to) from = pick(cities)
      const [x1, y1] = from.xy
      const [x2, y2] = to.xy
      const lift = Math.hypot(x2 - x1, y2 - y1) * 0.35
      attacks.push({
        type, to, x1, y1, x2, y2,
        cx: (x1 + x2) / 2,
        cy: Math.min(y1, y2) - lift,
        start: t,
        dur: 1100 + Math.random() * 900,
      })
      setCounts((c) => ({ ...c, [type.key]: c[type.key] + 1 }))
      setFeed((f) => [{ id: t + Math.random(), time: clock(), type, from: from.name, to: to.name }, ...f].slice(0, FEED_LEN))
    }

    const at = (a, t) => {
      const u = 1 - t
      return [u * u * a.x1 + 2 * u * t * a.cx + t * t * a.x2, u * u * a.y1 + 2 * u * t * a.cy + t * t * a.y2]
    }

    const draw = (t) => {
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(land, 0, 0, w, h)

      // giresun: a slow pulse so you can find home
      const [gx, gy] = cities[0].xy
      const pulse = (t / 1600) % 1
      ctx.strokeStyle = accent
      ctx.globalAlpha = 1 - pulse
      ctx.beginPath()
      ctx.arc(gx, gy, 3 + pulse * 14, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.fillStyle = accent
      ctx.fillRect(gx - 2, gy - 2, 4, 4)
      ctx.font = '10px ui-monospace, monospace'
      ctx.fillText('GIRESUN', gx + 7, gy - 6)

      ctx.lineWidth = 1.5
      ctx.lineCap = 'round'
      attacks = attacks.filter((a) => {
        const p = (t - a.start) / a.dur
        if (p >= 1) {
          rings.push({ x: a.x2, y: a.y2, color: a.type.color, start: t })
          return false
        }
        // a short tail behind the head, fading out
        const steps = 14
        const tail = 0.3
        for (let i = 0; i < steps; i++) {
          const s0 = Math.max(0, p - tail + (tail * i) / steps)
          const s1 = Math.max(0, p - tail + (tail * (i + 1)) / steps)
          const [ax, ay] = at(a, s0)
          const [bx, by] = at(a, s1)
          ctx.globalAlpha = (i + 1) / steps
          ctx.strokeStyle = a.type.color
          ctx.beginPath()
          ctx.moveTo(ax, ay)
          ctx.lineTo(bx, by)
          ctx.stroke()
        }
        const [hx, hy] = at(a, p)
        ctx.globalAlpha = 1
        ctx.fillStyle = a.type.color
        ctx.fillRect(hx - 1.5, hy - 1.5, 3, 3)
        return true
      })
      ctx.lineWidth = 1
      rings = rings.filter((r) => {
        const p = (t - r.start) / 700
        if (p >= 1) return false
        ctx.globalAlpha = 1 - p
        ctx.strokeStyle = r.color
        ctx.beginPath()
        ctx.arc(r.x, r.y, 2 + p * 12, 0, Math.PI * 2)
        ctx.stroke()
        return true
      })
      ctx.globalAlpha = 1
    }

    const frame = (t) => {
      raf = requestAnimationFrame(frame)
      if (!visible) return
      // skip spawns while the tab was in the background instead of bursting
      if (t - last > 1000) nextSpawn = t
      last = t
      if (t >= nextSpawn) {
        spawn(t)
        nextSpawn = t + 80 + Math.random() * 280
      }
      draw(t)
    }

    resize()
    const ro = new ResizeObserver(() => {
      resize()
      if (still) draw(0)
    })
    ro.observe(wrap.current)
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    io.observe(canvas)
    if (still) draw(0)
    else raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
    }
  }, [])

  return (
    <section className="cmap">
      <div className="cmap-bar">
        <span>THREATMAP</span>
        <span className="cmap-sim">[ SİMÜLASYON ]</span>
        <span className="dim">{now}</span>
      </div>
      <div ref={wrap} className="cmap-canvas">
        <canvas ref={ref} aria-label="simüle edilmiş saldırı haritası" role="img" />
      </div>
      <div className="cmap-legend">
        {TYPES.map((t) => (
          <span key={t.key}>
            <i style={{ background: t.color }} />
            {t.key} <span className="dim">{counts[t.key]}</span>
          </span>
        ))}
      </div>
      <ol className="cmap-feed" aria-live="off">
        {feed.map((e) => (
          <li key={e.id}>
            <span className="dim">{e.time}</span>
            <span style={{ color: e.type.color }}>{e.type.key.padEnd(8)}</span>
            <span>
              {e.from} <span className="dim">→</span> {e.to}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
