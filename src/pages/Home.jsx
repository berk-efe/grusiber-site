import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import TorusBg from '../components/TorusBg.jsx'
import Layout from '../components/Layout.jsx'
import Scramble from '../components/Scramble.jsx'
import Terminal from '../components/Terminal.jsx'
import CyberMap from '../components/CyberMap.jsx'
import { INSTAGRAM } from '../session.js'

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
  const [entered, setEntered] = useState(false)
  const [touch] = useState(isTouch)
  const [login] = useState(lastLogin)

  // The Arch boot (src/boot/) is switched off for now; `exit` just closes the shell.
  const closeShell = useCallback(() => setEntered(false), [])

  useEffect(() => {
    if (entered || touch) return
    const onKey = (e) => {
      if (e.key !== 'Enter') return
      e.preventDefault()
      setEntered(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [entered, touch])

  return (
    <>
      <TorusBg />
      <Layout banner>
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
          <Terminal onExit={closeShell} />
        ) : (
          <button className="enter" onClick={() => setEntered(true)}>
            [ PRESS ENTER ]
          </button>
        )}

        <p className="last-login dim">{login}</p>
      </section>
      <CyberMap />
      </Layout>
    </>
  )
}
