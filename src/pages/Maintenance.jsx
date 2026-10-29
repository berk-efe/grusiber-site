import { useEffect, useState } from 'react'

const FRAMES = ['|', '/', '-', '\\']

export default function Maintenance() {
  const [f, setF] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setF((n) => (n + 1) % FRAMES.length), 120)
    return () => clearInterval(t)
  }, [])

  return (
    <main className="screen warn">
      <div className="frame">
        <header className="topbar">
          <span>GRUSIBER://node-01</span>
          <span className="blink">● maintenance</span>
        </header>

        <section className="hero">
          <p className="code">ERR_503 :: SERVICE_UNAVAILABLE</p>
          <h1 className="glitch" data-text="WE ARE IN MAINTENANCE">
            WE ARE IN MAINTENANCE
          </h1>
          <p className="tagline">
            the node is being patched. check back soon.
          </p>

          <div className="progress" aria-hidden="true">
            <div className="progress-bar" />
          </div>
          <p className="dim">
            {FRAMES[f]} rebuilding systems...
          </p>
        </section>

        <footer className="bottombar dim">
          <span>© {new Date().getFullYear()} grusiber</span>
          <span>status: offline</span>
        </footer>
      </div>
    </main>
  )
}
