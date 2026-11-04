import { useCallback, useEffect, useState } from 'react'
import BootSequence from '../boot/BootSequence.jsx'
import Layout from '../components/Layout.jsx'
import Scramble from '../components/Scramble.jsx'
import Terminal from '../components/Terminal.jsx'
import { session } from '../session.js'

const PILLARS = [
  ['01', 'öğren', 'nasıl çalıştığını anlamadan korunamazsın.'],
  ['02', 'kurcala', 'kurcala, boz, tekrar kur. lab ortamında tabii.'],
  ['03', 'koru', 'öğrendiğini paylaş. herkes biraz daha güvende olsun.'],
]

export default function Home() {
  const [booted, setBooted] = useState(session.booted)
  const [entered, setEntered] = useState(false)

  const finishBoot = useCallback(() => {
    session.booted = true
    session.bootedAt = Date.now()
    setBooted(true)
  }, [])

  const reboot = useCallback(() => {
    session.booted = false
    setEntered(false)
    setBooted(false)
  }, [])

  useEffect(() => {
    if (!booted || entered) return
    const onKey = (e) => {
      if (e.key !== 'Enter') return
      e.preventDefault()
      setEntered(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [booted, entered])

  if (!booted) return <BootSequence onDone={finishBoot} />

  return (
    <Layout>
      <section className="hero">
        <p className="code">
          <Scramble text="// giresun üniversitesi siber güvenlik topluluğu" duration={900} />
        </p>
        <h1 className="glitch" data-text="HELLO, WORLD">
          <Scramble text="HELLO, WORLD" duration={1100} delay={250} />
        </h1>
        <p className="tagline">
          welcome to the grusiber community<span className="cursor">_</span>
        </p>

        {entered ? (
          <Terminal onExit={reboot} />
        ) : (
          <button className="enter" onClick={() => setEntered(true)}>
            [ PRESS ENTER ]
          </button>
        )}

        <ul className="pillars">
          {PILLARS.map(([n, title, text], i) => (
            <li key={n} className="fade-in" style={{ animationDelay: `${1.2 + i * 0.15}s` }}>
              <span className="dim">{n}</span>
              <strong>&gt; {title}</strong>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </section>
    </Layout>
  )
}
