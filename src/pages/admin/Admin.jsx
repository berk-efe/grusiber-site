import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/Layout.jsx'
import { EVENT_TYPES } from '../../eventTypes.js'
import { adminApi } from '../../api.js'
import { normalize } from '../../qr/style.js'
import Links from './Links.jsx'
import QrGen from './QrGen.jsx'
import { goApi } from './qrUtil.js'

const TABS = [
  ['events', 'etkinlikler'],
  ['announcements', 'duyurular'],
  ['links', 'linkler'],
  ['qr', 'qr üretici'],
]

// /admin: add, edit and delete events and announcements. Cloudflare Access
// guards this page and /api/admin; the worker checks the login on every write.

const todayTR = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' })

const EMPTY_EVENT = { title: '', type: 'atolye', start: '', end: '', place: '', description: '', link: '' }
const emptyAnnouncement = () => ({ date: todayTR(), title: '', body: '', banner: false })

export default function Admin() {
  const [me, setMe] = useState(null)
  const [authError, setAuthError] = useState(null)
  const [tab, setTab] = useState(() => {
    try {
      const t = sessionStorage.getItem('adminTab')
      return TABS.some(([k]) => k === t) ? t : 'events'
    } catch {
      return 'events'
    }
  })
  const pick = (t) => {
    setTab(t)
    try {
      sessionStorage.setItem('adminTab', t)
    } catch {}
  }
  const go = useGoShared(!!me && (tab === 'links' || tab === 'qr'))

  useEffect(() => {
    adminApi('GET', '/me')
      .then((r) => setMe(r.email))
      .catch((e) => setAuthError(e))
  }, [])

  return (
    <Layout wide>
      <section className="adm">
        <header className="adm-head">
          <p className="dim">
            $ sudo grusiber-admin
            {me && (
              <>
                {' '}
                <span className="accent">[{me}]</span>
              </>
            )}
          </p>
          <nav className="adm-tabs">
            {TABS.map(([k, label]) => (
              <button key={k} className={tab === k ? 'is-on' : ''} onClick={() => pick(k)}>
                {label}
              </button>
            ))}
          </nav>
        </header>

        {authError ? (
          <div className="adm-denied">
            <p className="adm-err">
              {authError.status === 401 ? 'permission denied: giriş yapılmamış.' : `hata: ${authError.message}`}
            </p>
            <p className="dim">bu sayfa cloudflare access ile korunuyor. izinli bir e-postayla giriş yapıp sayfayı yenile.</p>
          </div>
        ) : !me ? (
          <p className="dim">bağlanıyor...</p>
        ) : tab === 'events' || tab === 'announcements' ? (
          <Editor key={tab} kind={tab} />
        ) : go.error ? (
          <p className="adm-err">go verisi yüklenemedi: {go.error}</p>
        ) : !go.ready ? (
          <p className="dim">yükleniyor...</p>
        ) : tab === 'links' ? (
          <Links go={go} />
        ) : (
          <QrGen go={go} />
        )}
      </section>
    </Layout>
  )
}

// Logos and the default QR style, shared by the links and qr tabs. Loaded
// the first time one of those tabs opens.
function useGoShared(active) {
  const [logos, setLogos] = useState([])
  const [defaultDesign, setDefaultDesign] = useState(() => normalize({}))
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    if (!active || started) return
    setStarted(true)
    Promise.all([goApi('GET', '/settings'), goApi('GET', '/logos')])
      .then(([s, l]) => {
        if (s.default_design) setDefaultDesign(normalize(s.default_design))
        setLogos(l.logos)
        setReady(true)
      })
      .catch((e) => setError(e.message))
  }, [active, started])

  const saveDefault = async (design) => {
    await goApi('PUT', '/settings', { default_design: design })
    setDefaultDesign(normalize(design))
  }
  return { logos, setLogos, defaultDesign, saveDefault, ready, error }
}

function Editor({ kind }) {
  const isEvents = kind === 'events'
  const blank = useCallback(() => (isEvents ? { ...EMPTY_EVENT } : emptyAnnouncement()), [isEvents])
  const [items, setItems] = useState(null)
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState(null) // id being edited, or null for new
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null) // { ok, text }

  const load = useCallback(
    () =>
      adminApi('GET', `/${kind}`)
        .then(setItems)
        .catch((e) => setMsg({ ok: false, text: e.message })),
    [kind],
  )
  useEffect(() => {
    load()
  }, [load])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const reset = () => {
    setForm(blank())
    setEditing(null)
  }

  const edit = (item) => {
    setEditing(item.id)
    setMsg(null)
    setForm(
      isEvents
        ? { ...EMPTY_EVENT, ...item }
        : { date: item.date, title: item.title, body: item.body.join('\n\n'), banner: item.banner },
    )
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      if (editing) await adminApi('PUT', `/${kind}/${editing}`, form)
      else await adminApi('POST', `/${kind}`, form)
      setMsg({ ok: true, text: editing ? 'güncellendi.' : 'eklendi.' })
      reset()
      await load()
    } catch (err) {
      setMsg({ ok: false, text: err.message })
    } finally {
      setBusy(false)
    }
  }

  const remove = async (item) => {
    if (!window.confirm(`"${item.title}" silinsin mi? geri alınamaz.`)) return
    setMsg(null)
    try {
      await adminApi('DELETE', `/${kind}/${item.id}`)
      if (editing === item.id) reset()
      setMsg({ ok: true, text: 'silindi.' })
      await load()
    } catch (err) {
      setMsg({ ok: false, text: err.message })
    }
  }

  // events: upcoming first (soonest on top), then past ones (latest on top)
  const now = todayTR()
  const sorted = !items
    ? []
    : isEvents
      ? [
          ...items.filter((e) => (e.end ?? e.start).slice(0, 10) >= now),
          ...items.filter((e) => (e.end ?? e.start).slice(0, 10) < now).reverse(),
        ]
      : items

  return (
    <div className="adm-grid">
      <form className="adm-form" onSubmit={submit}>
        <h2>{editing ? `düzenle: ${editing}` : isEvents ? 'yeni etkinlik' : 'yeni duyuru'}</h2>

        {isEvents ? (
          <>
            <Field label="başlık *">
              <input value={form.title} onChange={set('title')} required maxLength={200} />
            </Field>
            <Field label="tür *">
              <select value={form.type} onChange={set('type')}>
                {Object.entries(EVENT_TYPES).map(([k, t]) => (
                  <option key={k} value={k}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="adm-row">
              <Field label="başlangıç *">
                <input type="datetime-local" value={form.start} onChange={set('start')} required />
              </Field>
              <Field label="bitiş">
                <input type="datetime-local" value={form.end} onChange={set('end')} min={form.start || undefined} />
              </Field>
            </div>
            <Field label="yer">
              <input value={form.place} onChange={set('place')} maxLength={200} placeholder="z-12, online..." />
            </Field>
            <Field label="açıklama">
              <textarea value={form.description} onChange={set('description')} rows={4} maxLength={2000} />
            </Field>
            <Field label="bağlantı">
              <input type="url" value={form.link} onChange={set('link')} placeholder="https://" maxLength={500} />
            </Field>
            <p className="adm-hint dim">saatler türkiye saati.</p>
          </>
        ) : (
          <>
            <Field label="tarih *">
              <input type="date" value={form.date} onChange={set('date')} required />
            </Field>
            <Field label="başlık *">
              <input value={form.title} onChange={set('title')} required maxLength={200} />
            </Field>
            <Field label="metin *">
              <textarea value={form.body} onChange={set('body')} rows={7} required maxLength={5000} />
            </Field>
            <p className="adm-hint dim">paragrafları boş bir satırla ayır.</p>
            <label className="adm-check">
              <input type="checkbox" checked={form.banner} onChange={set('banner')} />
              ana sayfanın üstünde bar olarak göster
            </label>
          </>
        )}

        <div className="adm-actions">
          <button type="submit" className="adm-primary" disabled={busy}>
            {busy ? 'kaydediliyor...' : editing ? 'güncelle' : 'ekle'}
          </button>
          {editing && (
            <button type="button" onClick={reset}>
              vazgeç
            </button>
          )}
        </div>
        {msg && <p className={msg.ok ? 'adm-ok' : 'adm-err'}>{msg.text}</p>}
      </form>

      <div className="adm-list">
        <h2>
          {isEvents ? 'etkinlikler' : 'duyurular'} <span className="dim">({items?.length ?? '…'})</span>
          <Link to={isEvents ? '/takvim/' : '/duyurular/'} className="adm-view">
            sitede gör ↗
          </Link>
        </h2>
        {items && items.length === 0 && <p className="dim">henüz kayıt yok.</p>}
        <ul>
          {sorted.map((it) => {
            const past = isEvents && (it.end ?? it.start).slice(0, 10) < now
            const t = EVENT_TYPES[it.type]
            return (
              <li key={it.id} className={[past && 'is-past', editing === it.id && 'is-editing'].filter(Boolean).join(' ')}>
                <span className="adm-when dim">{isEvents ? it.start.replace('T', ' ') : it.date}</span>
                <span className="adm-title">
                  {isEvents && <i style={{ background: t?.color }} />}
                  {it.title}
                  {!isEvents && it.banner && <span className="adm-tag">bar</span>}
                </span>
                <span className="adm-btns">
                  <button onClick={() => edit(it)}>düzenle</button>
                  <button className="adm-del" onClick={() => remove(it)}>
                    sil
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="adm-field">
      <span className="dim">{label}</span>
      {children}
    </label>
  )
}
