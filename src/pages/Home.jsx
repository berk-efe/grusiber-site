import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import BootSequence from '../boot/BootSequence.jsx'
import Layout from '../components/Layout.jsx'
import Scramble from '../components/Scramble.jsx'
import Terminal from '../components/Terminal.jsx'
import { INSTAGRAM, session } from '../session.js'

const isTouch = () => window.matchMedia('(pointer: coarse)').matches

// "Last login" like a real tty: this visitor's previous visit, if we know it.
function lastLogin() {
  let prev = null
  try {
    prev = localStorage.getItem('lastLogin')
    localStorage.setItem('lastLogin', new Date().toString())
  } catch {}
  const d = prev ? new Date(prev) : new Date()
  const day = d.toLocaleString('en-US', { weekday: 'short' })
  const mon = d.toLocaleString('en-US', { month: 'short' })
  const time = d.toTimeString().slice(0, 8)
  return `Last login: ${day} ${mon} ${String(d.getDate()).padStart(2)} ${time} ${d.getFullYear()} on tty1`
}

export default function Home() {
  const [booted, setBooted] = useState(session.booted)
  const [entered, setEntered] = useState(false)
  const [touch] = useState(isTouch)
  const [login] = useState(lastLogin)

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
    if (!booted || entered || touch) return
    const onKey = (e) => {
      if (e.key !== 'Enter') return
      e.preventDefault()
      setEntered(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [booted, entered, touch])

  if (!booted) return <BootSequence onDone={finishBoot} />

  return (
    <Layout>
      <section className="hero">
        <h1 className="glitch" data-text="HELLO, WORLD">
          <Scramble text="HELLO, WORLD" duration={1100} delay={250} />
        </h1>
        <p className="tagline">
          welcome to the grusiber community<span className="cursor">_</span>
        </p>

        {touch ? (
          // typing commands on a phone keyboard is no fun: plain links instead
          <nav className="quick">
            <Link to="/about/">&gt; man grusiber</Link>
            <a href={INSTAGRAM} target="_blank" rel="noreferrer">&gt; instagram</a>
          </nav>
        ) : entered ? (
          <Terminal onExit={reboot} />
        ) : (
          <button className="enter" onClick={() => setEntered(true)}>
            [ PRESS ENTER ]
          </button>
        )}

        <p className="last-login dim">{login}</p>
      </section>
    </Layout>
  )
}
