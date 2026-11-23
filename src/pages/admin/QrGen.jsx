import { useCallback, useEffect, useMemo, useState } from 'react'
import { qrRows } from '../../qr/matrix.js'
import { normalize } from '../../qr/style.js'
import Designer from './Designer.jsx'
import { ago, downloadPng, downloadSvg, fileSafe, fmtTime, goApi, renderSvg, svgUrl } from './qrUtil.js'

const phone = (s) => String(s || '').replace(/[^\d+]/g, '')

// [key, label, placeholder, type]; type "select:val=label|..." makes a dropdown
const TYPES = {
  url: {
    label: 'web sitesi',
    note: 'statik kod: link koda gömülür, sonra değiştirilemez ve taramalar sayılmaz. basılacak her şey için "linkler" sekmesinden kısa link kullan.',
    fields: [['url', 'adres', 'https://grusiber.com', 'url']],
    build: (f) => {
      const u = (f.url || '').trim()
      return u ? (/^[a-z][a-z0-9+.-]*:/i.test(u) ? u : `https://${u}`) : ''
    },
  },
  text: { label: 'metin', fields: [['text', 'metin', 'herhangi bir metin', 'textarea']], build: (f) => f.text || '' },
  wifi: {
    label: 'wi-fi',
    note: 'telefonlar okutunca ağa bağlanır.',
    fields: [
      ['ssid', 'ağ adı (ssid)', 'Grusiber Misafir'],
      ['password', 'şifre', '', 'text'],
      ['security', 'güvenlik', '', 'select:WPA=WPA/WPA2/WPA3|WEP=WEP|nopass=yok (açık ağ)'],
      ['hidden', 'gizli ağ', '', 'checkbox'],
    ],
    build: (f) => {
      if (!f.ssid) return ''
      const e = (s) => String(s || '').replace(/([\\;,:"])/g, '\\$1')
      const sec = f.security || 'WPA'
      return `WIFI:T:${sec};S:${e(f.ssid)};${sec !== 'nopass' ? `P:${e(f.password)};` : ''}${f.hidden ? 'H:true;' : ''};`
    },
  },
  email: {
    label: 'e-posta',
    fields: [
      ['to', 'kime', 'info@grusiber.com', 'email'],
      ['subject', 'konu', ''],
      ['body', 'mesaj', '', 'textarea'],
    ],
    build: (f) => {
      if (!f.to) return ''
      const q = [f.subject && `subject=${encodeURIComponent(f.subject)}`, f.body && `body=${encodeURIComponent(f.body)}`].filter(Boolean).join('&')
      return `mailto:${f.to.trim()}${q ? `?${q}` : ''}`
    },
  },
  phone: { label: 'telefon', fields: [['phone', 'telefon numarası', '+90 5xx xxx xx xx', 'tel']], build: (f) => (f.phone ? `tel:${phone(f.phone)}` : '') },
  sms: {
    label: 'sms',
    fields: [
      ['phone', 'telefon numarası', '+90 5xx xxx xx xx', 'tel'],
      ['message', 'mesaj', '', 'textarea'],
    ],
    build: (f) => (f.phone ? `SMSTO:${phone(f.phone)}:${f.message || ''}` : ''),
  },
  vcard: {
    label: 'kişi kartı',
    note: 'telefona bir kişi kartı (vcard) kaydeder.',
    fields: [
      ['first', 'ad', ''],
      ['last', 'soyad', ''],
      ['org', 'kurum', 'Grusiber'],
      ['title', 'unvan', ''],
      ['phone', 'telefon', '', 'tel'],
      ['email', 'e-posta', '', 'email'],
      ['website', 'web sitesi', 'https://grusiber.com', 'url'],
      ['address', 'adres', ''],
    ],
    build: (f) => {
      if (!f.first && !f.last && !f.org) return ''
      const e = (s) => String(s || '').replace(/([\\,;])/g, '\\$1').replace(/\n/g, '\\n')
      const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:${e(f.last)};${e(f.first)};;;`, `FN:${e([f.first, f.last].filter(Boolean).join(' ') || f.org)}`]
      if (f.org) lines.push(`ORG:${e(f.org)}`)
      if (f.title) lines.push(`TITLE:${e(f.title)}`)
      if (f.phone) lines.push(`TEL;TYPE=CELL:${phone(f.phone)}`)
      if (f.email) lines.push(`EMAIL:${e(f.email)}`)
      if (f.website) lines.push(`URL:${e(f.website)}`)
      if (f.address) lines.push(`ADR;TYPE=WORK:;;${e(f.address)};;;;`)
      lines.push('END:VCARD')
      return lines.join('\n')
    },
  },
}

// Static QR codes (Wi-Fi, vCard, text...) and their saved library.
export default function QrGen({ go }) {
  const { logos, setLogos, defaultDesign, saveDefault } = go
  const [kind, setKind] = useState('url')
  const [fields, setFields] = useState({})
  const [name, setName] = useState('')
  const [id, setId] = useState(null) // library row being edited
  const [design, setDesign] = useState(() => normalize(defaultDesign))
  const [msg, setMsg] = useState(null)
  const [lib, setLib] = useState(null)
  const [libErr, setLibErr] = useState(null)

  const content = TYPES[kind].build(fields)
  // debounce typing so long texts don't re-encode on every key
  const [encoded, setEncoded] = useState(content)
  useEffect(() => {
    const t = setTimeout(() => setEncoded(content), 200)
    return () => clearTimeout(t)
  }, [content])

  const { rows, error } = useMemo(() => {
    if (!encoded) return { rows: null, error: null }
    try {
      return { rows: qrRows(encoded), error: null }
    } catch (e) {
      return { rows: null, error: e.message }
    }
  }, [encoded])
  const svg = useMemo(() => (rows ? renderSvg(rows, design, logos) : ''), [rows, design, logos])

  const loadLib = useCallback(async () => {
    try {
      setLib((await goApi('GET', '/codes')).codes)
      setLibErr(null)
    } catch (e) {
      setLibErr(e.message)
    }
  }, [])
  useEffect(() => {
    loadLib()
  }, [loadLib])

  const pickKind = (k, values = {}) => {
    setKind(k)
    setFields(k === 'wifi' ? { security: 'WPA', ...values } : values)
  }
  const reset = () => {
    setId(null)
    setName('')
    setMsg(null)
    pickKind(kind)
  }

  const save = async () => {
    if (!name.trim()) return setMsg({ ok: false, text: 'önce bir isim ver' })
    if (!content || !rows) return setMsg({ ok: false, text: 'kaydedilecek bir şey yok' })
    const body = { name: name.trim(), kind, fields, content, design, svg: renderSvg(qrRows(content), design, logos) }
    try {
      if (id) await goApi('PUT', `/codes/${id}`, body)
      else setId((await goApi('POST', '/codes', body)).id)
      setMsg({ ok: true, text: 'kütüphaneye kaydedildi.' })
      loadLib()
    } catch (e) {
      setMsg({ ok: false, text: e.message })
    }
  }

  const open = (c) => {
    setId(c.id)
    setName(c.name)
    setMsg(null)
    setDesign(normalize(c.design || defaultDesign))
    if (c.kind in TYPES) pickKind(c.kind, c.fields || {})
    else pickKind('text', { text: c.content })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const remove = async (c) => {
    if (!confirm(`"${c.name}" kütüphaneden silinsin mi?`)) return
    try {
      await goApi('DELETE', `/codes/${c.id}`)
      if (id === c.id) setId(null)
      loadLib()
    } catch (e) {
      alert(e.message)
    }
  }

  const t = TYPES[kind]
  const file = `qr-${fileSafe(name || kind)}`

  return (
    <div className="go">
      <div className="go-top">
        <section className="adm-form">
          <header className="go-card-head">
            <h2>{id ? `düzenle: ${name}` : 'yeni qr kod'}</h2>
            <button type="button" onClick={reset}>
              yeni
            </button>
          </header>
          <div className="qg-types">
            {Object.entries(TYPES).map(([k, x]) => (
              <button key={k} type="button" className={k === kind ? 'is-on' : ''} onClick={() => k !== kind && pickKind(k)}>
                {x.label}
              </button>
            ))}
          </div>
          {t.note && <p className="qg-note dim">{t.note}</p>}
          {t.fields.map(([key, label, ph, type]) => (
            <FieldInput key={`${kind}-${key}`} label={label} ph={ph} type={type} value={fields[key]} onChange={(v) => setFields((f) => ({ ...f, [key]: v }))} />
          ))}
          <label className="adm-field">
            <span className="dim">isim (kütüphane için)</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="ör. lab wi-fi" />
          </label>
          <details className="qg-content">
            <summary className="dim">kodlanan içerik</summary>
            <code>{content || '—'}</code>
          </details>
        </section>

        <section className="go-preview">
          {error ? (
            <p className="adm-err">{error}</p>
          ) : !rows ? (
            <p className="dim">qr kodu görmek için içeriği doldur.</p>
          ) : (
            <>
              <img src={svgUrl(svg)} alt="qr kod" />
              <div className="adm-actions">
                <button type="button" onClick={() => downloadPng(svg, file)}>
                  png
                </button>
                <button type="button" onClick={() => downloadSvg(svg, file)}>
                  svg
                </button>
                <button type="button" className="adm-primary" onClick={save}>
                  {id ? 'değişiklikleri kaydet' : 'kütüphaneye kaydet'}
                </button>
              </div>
            </>
          )}
          {msg && <p className={msg.ok ? 'adm-ok' : 'adm-err'}>{msg.text}</p>}
        </section>
      </div>

      <section className="go-card">
        <header className="go-card-head">
          <h2>qr tasarımı</h2>
          <div className="adm-actions">
            <button type="button" onClick={() => setDesign(normalize(defaultDesign))}>
              varsayılana dön
            </button>
            <button
              type="button"
              onClick={() =>
                saveDefault(design)
                  .then(() => setMsg({ ok: true, text: 'varsayılan stil olarak kaydedildi.' }))
                  .catch((e) => setMsg({ ok: false, text: e.message }))
              }
            >
              varsayılan yap
            </button>
          </div>
        </header>
        <Designer design={design} onChange={setDesign} logos={logos} setLogos={setLogos} />
      </section>

      <section className="go-card">
        <header className="go-card-head">
          <h2>
            kütüphane <span className="dim">({lib?.length ?? '…'})</span>
          </h2>
          <button type="button" onClick={loadLib}>
            yenile
          </button>
        </header>
        {libErr && <p className="adm-err">{libErr}</p>}
        {lib?.length === 0 && <p className="dim">henüz kayıtlı kod yok.</p>}
        <ul className="go-links">
          {lib?.map((c) => (
            <li key={c.id} className={id === c.id ? 'is-sel' : ''}>
              <div className="go-l-main">
                <b>{c.name}</b>
                <span className="dim"> · {TYPES[c.kind]?.label ?? c.kind}</span>
                <span className="go-l-url dim" title={c.content}>
                  {c.kind === 'wifi' ? `wi-fi: ${c.fields?.ssid ?? ''}` : c.content}
                </span>
              </div>
              <div className="go-l-nums dim" title={fmtTime(c.updated_at)}>
                {ago(c.updated_at)}
              </div>
              <div className="adm-btns">
                <button type="button" onClick={() => open(c)}>
                  aç
                </button>
                <button type="button" className="adm-del" onClick={() => remove(c)}>
                  sil
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function FieldInput({ label, ph, type, value, onChange }) {
  if (type === 'checkbox') {
    return (
      <label className="adm-check">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        {label}
      </label>
    )
  }
  let input
  if (type === 'textarea') input = <textarea value={value ?? ''} placeholder={ph} rows={4} onChange={(e) => onChange(e.target.value)} />
  else if (type?.startsWith('select:')) {
    input = (
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        {type
          .slice(7)
          .split('|')
          .map((o) => o.split('='))
          .map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
      </select>
    )
  } else input = <input type={type || 'text'} value={value ?? ''} placeholder={ph} onChange={(e) => onChange(e.target.value)} />
  return (
    <label className="adm-field">
      <span className="dim">{label}</span>
      {input}
    </label>
  )
}
