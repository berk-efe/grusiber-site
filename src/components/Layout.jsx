import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { session } from '../session.js'
import AnnounceBar from './AnnounceBar.jsx'

function useUptime() {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const s = Math.floor((now - session.bootedAt) / 1000)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`
}

export default function Layout({ children, banner = false, wide = false }) {
  const uptime = useUptime()

  return (
    <div className="page">
      {banner && <AnnounceBar />}
      <main className="screen fade-in">
        <div className={wide ? 'frame frame-wide' : 'frame'}>
          <header className="topbar">
            <span>GRUSIBER</span>
            <nav className="nav">
              <NavLink to="/" end>~/</NavLink>
              <NavLink to="/about/">about/</NavLink>
              <NavLink to="/duyurular/">duyurular/</NavLink>
              <NavLink to="/takvim/">takvim/</NavLink>
            </nav>
            <span className="dim">up {uptime}</span>
          </header>

          {children}

          <footer className="bottombar dim">
            <span>© {new Date().getFullYear()} grusiber</span>
            <span>giresun üniversitesi</span>
            <span>v0.2.0</span>
          </footer>
        </div>
      </main>
    </div>
  )
}
