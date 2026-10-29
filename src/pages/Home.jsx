import { useCallback, useEffect, useState } from 'react'
import BootSequence from '../boot/BootSequence.jsx'

export default function Home() {
  const [booted, setBooted] = useState(false)
  const [entered, setEntered] = useState(false)
  const finishBoot = useCallback(() => setBooted(true), [])

  useEffect(() => {
    if (!booted) return
    const onKey = (e) => e.key === 'Enter' && setEntered(true)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [booted])

  if (!booted) return <BootSequence onDone={finishBoot} />

  return (
    <main className="screen fade-in">
      <div className="frame">
        <header className="topbar">
          <span>GRUSIBER://node-01</span>
          <span className="dim">sys.online</span>
        </header>

        <section className="hero">
          <h1 className="glitch" data-text="HELLO, WORLD">
            HELLO, WORLD
          </h1>
          <p className="tagline">
            welcome to the grusiber community<span className="cursor">_</span>
          </p>

          {entered ? (
            <p className="accent fade-in">
              [ access granted ] — more coming soon.
            </p>
          ) : (
            <button className="enter" onClick={() => setEntered(true)}>
              [ PRESS ENTER ]
            </button>
          )}
        </section>

        <footer className="bottombar dim">
          <span>© {new Date().getFullYear()} grusiber</span>
          <span>v0.1.0</span>
        </footer>
      </div>
    </main>
  )
}
