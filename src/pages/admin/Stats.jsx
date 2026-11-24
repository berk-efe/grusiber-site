import { useCallback, useEffect, useRef, useState } from 'react'
import { fmtTime, goApi } from './qrUtil.js'

const RANGES = [
  [1, 'son 24 saat'],
  [7, 'son 7 gün'],
  [30, 'son 30 gün'],
  [90, 'son 90 gün'],
  [365, 'son 1 yıl'],
  [3650, 'tüm zamanlar'],
]

const BREAKDOWNS = [
  ['countries', 'ülkeler'],
  ['cities', 'şehirler'],
  ['devices', 'cihazlar'],
  ['os', 'işletim sistemleri'],
  ['browsers', 'tarayıcı / uygulama'],
  ['networks', 'ağ (isp)'],
  ['referrers', 'yönlendiren'],
]

// Scan stats for one short link. Bots and link previews are counted apart.
export default function Stats({ slug, onClose }) {
  const [days, setDays] = useState(30)
  const [s, setS] = useState(null)
  const [err, setErr] = useState(null)
  const ref = useRef()

  const load = useCallback(async () => {
    setErr(null)
    try {
      setS(await goApi('GET', `/links/${encodeURIComponent(slug)}/stats?days=${days}&tz=${new Date().getTimezoneOffset()}`))
    } catch (e) {
      setErr(e.message)
    }
  }, [slug, days])

  useEffect(() => {
    setS(null)
    load()
  }, [load])
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [slug])

  const t = s?.totals
  const tiles = s && [
    [t.scans, 'aralıktaki tarama'],
    [t.unique_visitors, 'tekil ziyaretçi'],
    [t.via_qr, 'qr ile'],
    [t.via_link, 'link ile'],
    [s.all_time.humans, 'tüm zamanlar'],
    [t.bots, 'bot / önizleme (hariç)'],
  ]

  return (
    <section className="go-card go-stats" ref={ref}>
      <header className="go-card-head">
        <h2>istatistik · go.grusiber.com/{slug}</h2>
        <div className="adm-actions">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="go-select">
            {RANGES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <button type="button" onClick={load}>
            yenile
          </button>
          <button type="button" onClick={onClose}>
            kapat
          </button>
        </div>
      </header>

      {err && <p className="adm-err">{err}</p>}
      {!s && !err && <p className="dim">yükleniyor...</p>}
      {s && (
        <>
          <div className="go-tiles">
            {tiles.map(([v, l]) => (
              <div key={l}>
                <b>{v ?? 0}</b>
                <span className="dim">{l}</span>
              </div>
            ))}
          </div>

          <div className="go-bd">
            {BREAKDOWNS.map(([k, title]) => (
              <Breakdown key={k} title={title} rows={s.breakdowns[k]} />
            ))}
            <div>
              <h3>günlük</h3>
              {s.daily.length ? (
                <table>
                  <tbody>
                    {s.daily.map((d) => (
                      <tr key={d.day}>
                        <td>{d.day}</td>
                        <td className="num">{d.scans}</td>
                        <td className="num dim">{d.unique_visitors} tekil</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="dim">veri yok</p>
              )}
            </div>
          </div>

          <h3>son taramalar (en yeni 200, botlar soluk)</h3>
          <div className="go-recent">
            {s.recent.length === 0 && <p className="dim">henüz tarama yok.</p>}
            {s.recent.map((r, i) => (
              <details key={i} className={r.is_bot ? 'is-bot' : ''}>
                <summary>
                  <span className="dim">{fmtTime(r.ts)}</span>
                  <span className="go-chip">{r.source === 'qr' ? 'qr' : 'link'}</span>
                  {r.is_bot ? <span className="go-chip">bot</span> : null}
                  <span>{[r.city, r.country].filter(Boolean).join(', ') || '—'}</span>
                  <span className="dim">
                    {r.device} · {r.os} · {r.browser}
                  </span>
                </summary>
                <dl>
                  <dt>ip</dt>
                  <dd>{r.ip || '—'}</dd>
                  <dt>ağ</dt>
                  <dd>{r.asn_org || '—'}</dd>
                  <dt>konum</dt>
                  <dd>{[r.city, r.region, r.country].filter(Boolean).join(', ') || '—'}</dd>
                  <dt>dil</dt>
                  <dd>{r.lang || '—'}</dd>
                  {r.referer && (
                    <>
                      <dt>yönlendiren</dt>
                      <dd>{r.referer}</dd>
                    </>
                  )}
                  <dt>hedef</dt>
                  <dd>{r.target || '—'}</dd>
                  <dt>ua</dt>
                  <dd>
                    <code>{r.ua}</code>
                  </dd>
                </dl>
              </details>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

function Breakdown({ title, rows }) {
  const max = Math.max(1, ...rows.map((r) => r.n))
  return (
    <div>
      <h3>{title}</h3>
      {rows.length ? (
        <table>
          <tbody>
            {rows.map((r) => (
              <tr key={r.k ?? '?'}>
                <td>
                  <span className="go-bar" style={{ '--w': `${(r.n / max) * 100}%` }} />
                  {r.k ?? 'bilinmiyor'}
                </td>
                <td className="num">{r.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="dim">veri yok</p>
      )}
    </div>
  )
}
