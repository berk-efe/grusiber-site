import { useEffect, useState } from 'react'

// Live threat map: Kaspersky's official Cybermap widget (cybermap.kaspersky.com,
// "Widget" section), embedded as an iframe inside our terminal frame.
// The globe grabs the mouse wheel and touch, so a cover sits on top until the
// visitor clicks it; otherwise scrolling the home page gets stuck on the map.

const SRC = 'https://cybermap.kaspersky.com/tr/widget/dynamic/dark'

function clock(d = new Date()) {
  return d.toTimeString().slice(0, 8)
}

export default function CyberMap() {
  const [now, setNow] = useState(clock)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setNow(clock()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <section className="cmap">
      <div className="cmap-bar">
        <span>THREATMAP</span>
        <span className="cmap-sim">[ CANLI ]</span>
        <span className="dim">{now}</span>
      </div>
      <div className="cmap-frame">
        <iframe
          src={SRC}
          title="Kaspersky canlı siber tehdit haritası"
          loading="lazy"
          referrerPolicy="no-referrer"
          allow="fullscreen"
        />
        {!active && (
          <button className="cmap-cover" onClick={() => setActive(true)} aria-label="haritayı etkinleştir" />
        )}
      </div>
      <div className="cmap-src dim">
        <span>
          veri:{' '}
          <a href="https://cybermap.kaspersky.com/" target="_blank" rel="noreferrer">
            kaspersky cybermap
          </a>
        </span>
        <span className={active ? '' : 'cmap-hint'}>{active ? 'etkileşim açık' : 'döndürmek için haritaya tıkla'}</span>
      </div>
    </section>
  )
}
