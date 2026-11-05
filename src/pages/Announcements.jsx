import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { ANNOUNCEMENTS } from '../announcements.js'

export default function Announcements() {
  const { hash } = useLocation()
  const target = decodeURIComponent(hash.slice(1))

  // the router doesn't jump to #anchors by itself
  useEffect(() => {
    if (target) document.getElementById(target)?.scrollIntoView({ block: 'start' })
  }, [target])

  return (
    <Layout>
      <section className="news">
        <p className="news-cmd dim">
          $ ls -t /var/mail/duyurular <span className="accent">({ANNOUNCEMENTS.length})</span>
        </p>
        {ANNOUNCEMENTS.length === 0 && <p className="dim">yeni duyuru yok.</p>}
        {ANNOUNCEMENTS.map((a) => (
          <article key={a.id} id={a.id} className={`news-item${a.id === target ? ' is-target' : ''}`}>
            <header>
              <time className="dim" dateTime={a.date}>{a.date}</time>
              <h2>{a.title}</h2>
            </header>
            {a.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </article>
        ))}
      </section>
    </Layout>
  )
}
