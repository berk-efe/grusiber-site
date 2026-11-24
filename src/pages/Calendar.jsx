import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { EVENT_TYPES } from '../eventTypes.js'
import { useApi } from '../api.js'

const MONTHS = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık']
const WEEKDAYS = ['pzt', 'sal', 'çar', 'per', 'cum', 'cmt', 'paz']
const UPCOMING = 6

// Everything is Türkiye time, and dates are handled as 'YYYY-MM-DD' strings so
// a visitor in another timezone still sees the club's dates.
const pad = (n) => String(n).padStart(2, '0')
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`
const todayTR = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' })
const nowTR = () => todayTR() + 'T' + new Date().toLocaleTimeString('en-GB', { timeZone: 'Europe/Istanbul' }).slice(0, 5)
const timeOf = (s) => s.slice(11, 16)
const dayOf = (s) => s.slice(0, 10)
const typeOf = (e) => EVENT_TYPES[e.type] ?? { label: e.type, color: 'var(--fg)' }

function longDate(day) {
  const [y, m, d] = day.split('-').map(Number)
  const wd = WEEKDAYS[(new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7]
  return `${d} ${MONTHS[m - 1]} ${y}, ${wd}`
}

// every day an event touches, so a two-day ctf shows on both days
function daysOf(e) {
  const days = [dayOf(e.start)]
  if (!e.end) return days
  const last = dayOf(e.end)
  const d = new Date(days[0] + 'T00:00Z')
  while (days.length < 31) {
    d.setUTCDate(d.getUTCDate() + 1)
    const s = d.toISOString().slice(0, 10)
    if (s > last) break
    days.push(s)
  }
  return days
}

// .ics so members can drop an event into their own calendar app
function icsFor(e) {
  const utc = (s) => new Date(s + ':00+03:00').toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
  const end = e.end ?? new Date(new Date(e.start + ':00+03:00').getTime() + 3600e3 + 3 * 3600e3).toISOString().slice(0, 16)
  const esc = (s = '') => s.replace(/[\\,;]/g, (c) => '\\' + c).replace(/\n/g, '\\n')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//grusiber//takvim//TR',
    'BEGIN:VEVENT',
    `UID:${e.id}@grusiber.com`,
    `DTSTAMP:${utc(nowTR())}`,
    `DTSTART:${utc(e.start)}`,
    `DTEND:${utc(end)}`,
    `SUMMARY:${esc(e.title)}`,
    e.place && `LOCATION:${esc(e.place)}`,
    `DESCRIPTION:${esc([e.description, e.link].filter(Boolean).join('\n'))}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n')
}

function downloadIcs(e) {
  const url = URL.createObjectURL(new Blob([icsFor(e)], { type: 'text/calendar' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${e.id}.ics`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Calendar() {
  const [params, setParams] = useSearchParams()
  const today = todayTR()
  const [open, setOpen] = useState(null)
  const { data, error } = useApi('/api/events')
  const events = useMemo(() => data ?? [], [data])
  const [picked, setPicked] = useState(null)

  // ?ay=2026-12 picks the month, so a month can be shared as a link
  const [year, month] = useMemo(() => {
    const m = /^(\d{4})-(\d{2})$/.exec(params.get('ay') ?? '')
    if (m && +m[2] >= 1 && +m[2] <= 12) return [+m[1], +m[2] - 1]
    return [+today.slice(0, 4), +today.slice(5, 7) - 1]
  }, [params, today])

  const go = (delta) => {
    setPicked(null)
    const d = new Date(Date.UTC(year, month + delta, 1))
    setParams({ ay: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}` }, { replace: true })
  }
  const goToday = () => {
    setPicked(null)
    setParams({}, { replace: true })
  }

  const byDay = useMemo(() => {
    const map = {}
    for (const e of [...events].sort((a, b) => a.start.localeCompare(b.start))) {
      for (const d of daysOf(e)) (map[d] ??= []).push(e)
    }
    return map
  }, [events])

  // 6 rows of Monday-first weeks covering the month
  const cells = useMemo(() => {
    const first = new Date(Date.UTC(year, month, 1))
    const lead = (first.getUTCDay() + 6) % 7
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(Date.UTC(year, month, 1 - lead + i))
      return { day: ymd(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()), n: d.getUTCDate(), inMonth: d.getUTCMonth() === month }
    })
  }, [year, month])
  // drop a trailing week that is all next month
  const shown = cells.slice(35).every((c) => !c.inMonth) ? cells.slice(0, 35) : cells

  // phone view: the day whose events are listed under the grid. Defaults to
  // today in the current month, else the month's first day with an event.
  const monthKey = `${year}-${pad(month + 1)}`
  const selected =
    picked ??
    (today.startsWith(monthKey) ? today : shown.find((c) => c.inMonth && byDay[c.day])?.day ?? `${monthKey}-01`)
  const selectedEvents = byDay[selected] ?? []

  const now = nowTR()
  const upcoming = events.filter((e) => (e.end ?? e.start) >= now)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, UPCOMING)

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.('input, textarea')) return
      if (e.key === 'Escape') setOpen(null)
      if (open) return
      if (e.key === 'h' || e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'l' || e.key === 'ArrowRight') go(1)
      else if (e.key === 't') goToday()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <Layout wide>
      <section className="cal">
        <header className="cal-head">
          <h1 className="cal-title">
            {MONTHS[month]} <span className="dim">{year}</span>
          </h1>
          <div className="cal-nav">
            <button onClick={() => go(-1)} aria-label="önceki ay">‹</button>
            <button onClick={goToday}>bugün</button>
            <button onClick={() => go(1)} aria-label="sonraki ay">›</button>
          </div>
        </header>

        <div className="cal-legend">
          {Object.entries(EVENT_TYPES).map(([k, t]) => (
            <span key={k}>
              <i style={{ background: t.color }} />
              {t.label}
            </span>
          ))}
          <span className="cal-keys dim">h/l: ay · t: bugün</span>
        </div>

        <div className="cal-scroll">
          <div className="cal-grid" role="grid" aria-label={`${MONTHS[month]} ${year}`}>
            {WEEKDAYS.map((w) => (
              <div key={w} className="cal-wd dim" role="columnheader">{w}</div>
            ))}
            {shown.map((c) => {
              const events = byDay[c.day] ?? []
              const cls = [
                'cal-day',
                !c.inMonth && 'is-out',
                c.day === today && 'is-today',
                c.day < today && 'is-past',
                c.day === selected && 'is-selected',
              ]
              return (
                <div
                  key={c.day}
                  className={cls.filter(Boolean).join(' ')}
                  role="gridcell"
                  aria-label={longDate(c.day)}
                  aria-selected={c.day === selected}
                  onClick={() => setPicked(c.day)}
                >
                  <span className="cal-n">{c.n}</span>
                  {events.length > 0 && (
                    <span className="cal-dots" aria-hidden="true">
                      {events.slice(0, 3).map((e) => (
                        <i key={e.id} style={{ background: typeOf(e).color }} />
                      ))}
                    </span>
                  )}
                  {events.map((e) => (
                    <button
                      key={e.id}
                      className="cal-ev"
                      style={{ '--c': typeOf(e).color }}
                      onClick={() => setOpen(e)}
                      title={e.title}
                    >
                      {dayOf(e.start) === c.day && <span className="cal-ev-time">{timeOf(e.start)}</span>}
                      <span className="cal-ev-title">{e.title}</span>
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        </div>

        <section className="cal-dayview" aria-live="polite">
          <h2>{longDate(selected)}</h2>
          {selectedEvents.length === 0 && <p className="dim">bu gün etkinlik yok.</p>}
          {selectedEvents.map((e) => (
            <button key={e.id} className="cal-dv-ev" style={{ '--c': typeOf(e).color }} onClick={() => setOpen(e)}>
              <span className="cal-dv-time">
                {dayOf(e.start) === selected ? timeOf(e.start) : 'devam'}
                {e.end && dayOf(e.end) === selected && <span className="dim">–{timeOf(e.end)}</span>}
              </span>
              <span className="cal-dv-main">
                <span className="cal-dv-title">{e.title}</span>
                <span className="dim">
                  {typeOf(e).label}
                  {e.place && ` · ${e.place}`}
                </span>
              </span>
            </button>
          ))}
        </section>

        <section className="cal-up">
          <h2>yaklaşan etkinlikler</h2>
          {error && !data && <p className="dim">etkinlikler yüklenemedi. sayfayı yenilemeyi dene.</p>}
          {data && upcoming.length === 0 && <p className="dim">şimdilik planlı etkinlik yok.</p>}
          <ol>
            {upcoming.map((e) => (
              <li key={e.id}>
                <button onClick={() => setOpen(e)} style={{ '--c': typeOf(e).color }}>
                  <span className="cal-up-date">{longDate(dayOf(e.start))}</span>
                  <span className="dim">{timeOf(e.start)}</span>
                  <span className="cal-up-title">{e.title}</span>
                  <span className="cal-up-type">{typeOf(e).label}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      </section>

      {open && <EventDialog e={open} onClose={() => setOpen(null)} />}
    </Layout>
  )
}

function EventDialog({ e, onClose }) {
  const t = typeOf(e)
  const sameDay = !e.end || dayOf(e.end) === dayOf(e.start)
  const when = sameDay
    ? `${longDate(dayOf(e.start))}  ${timeOf(e.start)}${e.end ? '–' + timeOf(e.end) : ''}`
    : `${longDate(dayOf(e.start))} ${timeOf(e.start)}  →  ${longDate(dayOf(e.end))} ${timeOf(e.end)}`

  return (
    <div className="cal-modal" onClick={onClose}>
      <div className="cal-card" role="dialog" aria-modal="true" aria-label={e.title} onClick={(ev) => ev.stopPropagation()} style={{ '--c': t.color }}>
        <div className="cal-card-bar">
          <span>{t.label}</span>
          <button onClick={onClose} aria-label="kapat" autoFocus>[x]</button>
        </div>
        <div className="cal-card-body">
          <h2>{e.title}</h2>
          <dl>
            <dt className="dim">ne zaman</dt>
            <dd>{when}</dd>
            {e.place && (
              <>
                <dt className="dim">nerede</dt>
                <dd>{e.place}</dd>
              </>
            )}
          </dl>
          {e.description && <p>{e.description}</p>}
          <div className="cal-card-actions">
            <button onClick={() => downloadIcs(e)}>+ takvime ekle (.ics)</button>
            {e.link && (
              <a href={e.link} target="_blank" rel="noreferrer">
                bağlantı ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
