import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ANNOUNCEMENTS } from '../announcements.js'

const key = (id) => `closed:${id}`

function wasClosed(id) {
  try {
    return localStorage.getItem(key(id)) === '1'
  } catch {
    return false
  }
}

// Full-width strip at the top of the page. It sits in the normal flow, so it
// pushes the page down instead of covering it.
export default function AnnounceBar() {
  const [item, setItem] = useState(() => ANNOUNCEMENTS.find((a) => a.banner && !wasClosed(a.id)))
  if (!item) return null

  const close = () => {
    try {
      localStorage.setItem(key(item.id), '1')
    } catch {}
    setItem(null)
  }

  return (
    <div className="announce" role="status">
      <span className="announce-tag">[!] DUYURU</span>
      <Link to={`/duyurular/#${item.id}`} className="announce-text">
        {item.title}
      </Link>
      <span className="announce-date dim">{item.date}</span>
      <button className="announce-close" onClick={close} aria-label="duyuruyu kapat">
        [x]
      </button>
    </div>
  )
}
