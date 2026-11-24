import { useCallback, useEffect, useMemo, useState } from 'react'
import { qrRows } from '../../qr/matrix.js'
import { normalize } from '../../qr/style.js'
import Designer from './Designer.jsx'
import Stats from './Stats.jsx'
import { ago, downloadPng, downloadSvg, fmtTime, goApi, renderSvg, svgUrl } from './qrUtil.js'

const SHORT = 'go.grusiber.com/'
const EMPTY = { url: '', slug: '', note: '' }
const qrText = (slug) => `https://${SHORT}${slug}?qr`

// go.grusiber.com short links: create/edit/delete, each link's QR, stats.
export default function Links({ go }) {
  const { logos, setLogos, defaultDesign, saveDefault } = go
  const [links, setLinks] = useState(null)
  const [listErr, setListErr] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [current, setCurrent] = useState(null) // link whose QR is shown
  const [design, setDesign] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [qrMsg, setQrMsg] = useState(null)
  const [statsSlug, setStatsSlug] = useState(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    try {
      const { links } = await goApi('GET', '/links')
      setLinks(links)
      setListErr(null)
      return links
    } catch (e) {
      setListErr(e.message)
      return []
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const rows = useMemo(() => (current ? qrRows(qrText(current.slug)) : null), [current])
  const svg = useMemo(() => (rows && design ? renderSvg(rows, design, logos) : ''), [rows, design, logos])

  const showQr = (l) => {
    setCurrent(l)
    setDesign(normalize(l.design || defaultDesign))
    setDirty(!l.design)
    setQrMsg(l.design ? null : { ok: null, text: 'henüz kaydedilmedi: varsayılan stil gösteriliyor' })
  }

  const saveDesign = async (l = current, d = design, s = svg) => {
    try {
      await goApi('PUT', `/links/${encodeURIComponent(l.slug)}/qr`, { design: d, svg: s })
      setLinks((ls) => ls?.map((x) => (x.slug === l.slug ? { ...x, design: d } : x)))
      setCurrent((c) => (c?.slug === l.slug ? { ...c, design: d } : c))
      setDirty(false)
      setQrMsg({ ok: true, text: 'tasarım kaydedildi.' })
    } catch (e) {
      setQrMsg({ ok: false, text: e.message })
    }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const generate = async () => {
    try {
      const { slug } = await goApi('GET', '/generate')
      setForm((f) => ({ ...f, slug }))
    } catch (e) {
      setMsg({ ok: false, text: e.message })
    }
  }

  const startEdit = (l) => {
    setEditing(l.slug)
    setForm({ url: l.url, slug: l.slug, note: l.note || '' })
    setMsg({ ok: null, text: 'hedefi değiştirmek qr kodu değiştirmez.' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const endEdit = () => {
    setEditing(null)
    setForm(EMPTY)
  }

  const submit = async (e) => {
    e.preventDefault()
    const body = { url: form.url.trim(), slug: form.slug.trim(), note: form.note.trim(), overwrite: !!editing }
    setBusy(true)
    setMsg(null)
    try {
      let res
      try {
        res = await goApi('POST', '/links', body)
      } catch (err) {
        if (err.status === 409 && confirm(`${SHORT}${body.slug} şu an şuraya gidiyor:\n${err.data.existing}\n\nyerine bu yazılsın mı?\n${body.url}`)) {
          res = await goApi('POST', '/links', { ...body, overwrite: true })
        } else throw err
      }
      endEdit()
      setMsg({ ok: true, text: `${res.updated ? 'güncellendi' : 'oluşturuldu'}: ${res.short} (~60 sn içinde aktif)` })
      const list = await load()
      const l = list.find((x) => x.slug === res.slug) ?? { ...res, design: null }
      showQr(l)
      if (!l.design) {
        // store the styled QR for a new link right away
        const d = normalize(defaultDesign)
        await saveDesign(l, d, renderSvg(qrRows(qrText(l.slug)), d, logos))
      }
    } catch (err) {
      setMsg({ ok: false, text: err.message })
    } finally {
      setBusy(false)
    }
  }

  const remove = async (l) => {
    if (!confirm(`${SHORT}${l.slug} silinsin mi?\n\nbasılmış qr kodları 404 sayfası gösterir. tarama geçmişi saklanır.`)) return
    try {
      await goApi('DELETE', `/links/${encodeURIComponent(l.slug)}`)
      setMsg({ ok: true, text: `silindi: ${l.slug}` })
      if (current?.slug === l.slug) setCurrent(null)
      if (statsSlug === l.slug) setStatsSlug(null)
      if (editing === l.slug) endEdit()
      load()
    } catch (e) {
      setMsg({ ok: false, text: e.message })
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`https://${SHORT}${current.slug}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setQrMsg({ ok: false, text: 'kopyalanamadı' })
    }
  }

  return (
    <div className="go">
      <div className="go-top">
        <form className="adm-form go-form" onSubmit={submit}>
          <h2>{editing ? `düzenle: ${SHORT}${editing}` : 'yeni kısa link'}</h2>
          <label className="adm-field">
            <span className="dim">hedef adres *</span>
            <input type="url" value={form.url} onChange={set('url')} placeholder="https://grusiber.com/takvim/" required />
          </label>
          <label className="adm-field">
            <span className="dim">uç</span>
            <span className="go-slug">
              <span className="dim">{SHORT}</span>
              <input
                value={form.slug}
                onChange={set('slug')}
                placeholder="boş = rastgele"
                disabled={!!editing}
                autoCapitalize="off"
                autoComplete="off"
                spellCheck={false}
              />
              <button type="button" onClick={generate} disabled={!!editing}>
                üret
              </button>
            </span>
          </label>
          <label className="adm-field">
            <span className="dim">not</span>
            <input value={form.note} onChange={set('note')} maxLength={500} placeholder="ör. kasım afişleri" />
          </label>
          <div className="adm-actions">
            <button type="submit" className="adm-primary" disabled={busy}>
              {busy ? 'kaydediliyor...' : editing ? 'güncelle' : 'oluştur'}
            </button>
            {editing && (
              <button type="button" onClick={() => (endEdit(), setMsg(null))}>
                vazgeç
              </button>
            )}
          </div>
          {msg && <p className={msg.ok === false ? 'adm-err' : msg.ok ? 'adm-ok' : 'dim'}>{msg.text}</p>}
        </form>

        <section className="go-preview">
          {!current ? (
            <p className="dim">bir link oluştur ya da listeden [qr]'a bas: kodu burada tasarlayıp indirebilirsin.</p>
          ) : (
            <>
              <img src={svgUrl(svg)} alt={`${SHORT}${current.slug} qr kodu`} />
              <p className="go-short">
                {SHORT}
                <b>{current.slug}</b>
              </p>
              <p className="go-dest dim">→ {current.url}</p>
              <div className="adm-actions">
                <button type="button" onClick={copy}>
                  {copied ? 'kopyalandı' : 'linki kopyala'}
                </button>
                <button type="button" onClick={() => downloadPng(svg, `qr-${current.slug}`)}>
                  png
                </button>
                <button type="button" onClick={() => downloadSvg(svg, `qr-${current.slug}`)}>
                  svg
                </button>
                <button type="button" className="adm-primary" disabled={!dirty} onClick={() => saveDesign()}>
                  tasarımı kaydet
                </button>
              </div>
              {qrMsg && <p className={qrMsg.ok === false ? 'adm-err' : qrMsg.ok ? 'adm-ok' : 'dim'}>{qrMsg.text}</p>}
              <p className="dim go-enc">
                kodlanan: <code>{qrText(current.slug)}</code>
              </p>
            </>
          )}
        </section>
      </div>

      {current && (
        <section className="go-card">
          <header className="go-card-head">
            <h2>qr tasarımı · {SHORT}{current.slug}</h2>
            <div className="adm-actions">
              <button
                type="button"
                onClick={() => {
                  setDesign(normalize(defaultDesign))
                  setDirty(true)
                }}
              >
                varsayılana dön
              </button>
              <button
                type="button"
                onClick={() =>
                  saveDefault(design)
                    .then(() => setQrMsg({ ok: true, text: 'varsayılan stil olarak kaydedildi.' }))
                    .catch((e) => setQrMsg({ ok: false, text: e.message }))
                }
              >
                varsayılan yap
              </button>
            </div>
          </header>
          <Designer
            design={design}
            onChange={(d) => {
              setDesign(d)
              setDirty(true)
              setQrMsg({ ok: null, text: 'kaydedilmemiş değişiklikler var' })
            }}
            logos={logos}
            setLogos={setLogos}
          />
        </section>
      )}

      <section className="go-card">
        <header className="go-card-head">
          <h2>
            linkler <span className="dim">({links?.length ?? '…'})</span>
          </h2>
          <button type="button" onClick={load}>
            yenile
          </button>
        </header>
        {listErr && <p className="adm-err">{listErr}</p>}
        {links?.length === 0 && <p className="dim">henüz link yok. yukarıdan oluştur.</p>}
        <ul className="go-links">
          {links?.map((l) => (
            <li key={l.slug} className={current?.slug === l.slug ? 'is-sel' : ''}>
              <div className="go-l-main">
                <b>/{l.slug}</b>
                {l.note && <span className="dim"> · {l.note}</span>}
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="go-l-url" title={l.url}>
                  → {l.url}
                </a>
              </div>
              <div className="go-l-nums" title={`son tarama: ${fmtTime(l.last_scan)}`}>
                <span>
                  <b>{l.scans}</b> tarama
                </span>
                <span>
                  <b>{l.unique}</b> tekil
                </span>
                <span>
                  <b>{l.via_qr}</b> qr
                </span>
                <span className="dim">{ago(l.last_scan)}</span>
              </div>
              <div className="adm-btns">
                <button type="button" onClick={() => (showQr(l), window.scrollTo({ top: 0, behavior: 'smooth' }))}>
                  qr
                </button>
                <button type="button" onClick={() => setStatsSlug(l.slug)}>
                  istatistik
                </button>
                <button type="button" onClick={() => startEdit(l)}>
                  düzenle
                </button>
                <button type="button" className="adm-del" onClick={() => remove(l)}>
                  sil
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {statsSlug && <Stats slug={statsSlug} onClose={() => setStatsSlug(null)} />}
    </div>
  )
}
