import { useMemo } from 'react'
import { FRAME_DEFAULT_TEXT, normalize, render, sampleRows, warnings } from '../../qr/style.js'
import { goApi, logoUrlFor, svgUrl, uploadLogo } from './qrUtil.js'

const DOTS = [['square', 'kare'], ['rounded', 'yuvarlak'], ['dots', 'nokta'], ['fluid', 'akışkan']]
const OUTER = [['square', 'kare'], ['rounded', 'yuvarlak'], ['circle', 'daire'], ['leaf', 'yaprak']]
const INNER = [['square', 'kare'], ['rounded', 'yuvarlak'], ['dot', 'nokta'], ['leaf', 'yaprak']]
const FRAMES = [['none', 'yok'], ['terminal', 'terminal'], ['brackets', 'köşeli'], ['matrix', 'matrix'], ['hud', 'hud'], ['classic', 'klasik']]
const SAMPLE = sampleRows(21)
const HEX = /^#[0-9a-fA-F]{6}$/

// The QR style editor. `design` in, `onChange(next)` out; logos are shared
// between the link and generator tabs, so they live in the parent.
export default function Designer({ design, onChange, logos, setLogos }) {
  const d = useMemo(() => normalize(design), [design])
  const update = (fn) => {
    const next = structuredClone(d)
    fn(next)
    onChange(next)
  }
  const hasLogo = !!logoUrlFor(d, logos)
  const warns = warnings(d, hasLogo)

  // thumbnails: zoom into a corner so the shape shows at small size
  const plain = { ...d, logo: { ...d.logo, id: null } }
  const thumb = (variant) =>
    svgUrl(render(SAMPLE, normalize({ ...plain, ...variant, frame: { ...d.frame, style: 'none' } })).replace(/viewBox="[^"]*"/, 'viewBox="3 3 12 12"'))
  const frameThumb = (style) => svgUrl(render(SAMPLE, normalize({ ...plain, frame: { ...d.frame, style, text: '' } })))

  const Opt = ({ sel, onClick, img, label, wide }) => (
    <button type="button" className={`qd-opt${sel ? ' is-sel' : ''}${wide ? ' is-wide' : ''}`} onClick={onClick} title={label}>
      {img && <img alt="" src={img} />}
      <span>{label}</span>
    </button>
  )

  const upload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const logo = await uploadLogo(file)
      setLogos((l) => [...l, logo])
      update((n) => (n.logo.id = logo.id))
    } catch (err) {
      alert(`logo yüklenemedi: ${err.message}`)
    }
  }

  const removeLogo = async (id) => {
    if (!confirm('bu logo silinsin mi? onu kullanan kayıtlı qr kodlar kendi kopyalarını korur.')) return
    try {
      await goApi('DELETE', `/logos/${id}`)
      setLogos((l) => l.filter((x) => x.id !== id))
      if (d.logo.id === id) update((n) => (n.logo.id = null))
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="qd">
      <div className="qd-grid">
        <section>
          <h3>logo</h3>
          <div className="qd-opts">
            <Opt sel={d.logo.id == null} onClick={() => update((n) => (n.logo.id = null))} label="yok" />
            {logos.map((l) => (
              <span key={l.id} className="qd-logo">
                <Opt sel={d.logo.id === l.id} onClick={() => update((n) => (n.logo.id = l.id))} img={l.data_url} label={l.name} />
                <button type="button" className="qd-x" onClick={() => removeLogo(l.id)} aria-label={`${l.name} logosunu sil`}>
                  ×
                </button>
              </span>
            ))}
            <label className="qd-opt qd-upload" title="logo yükle (png, jpg, svg, webp)">
              <span>+ yükle</span>
              <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={upload} hidden />
            </label>
          </div>
          {d.logo.id != null && (
            <div className="qd-sub">
              <label className="adm-field">
                <span className="dim">logo boyutu: %{Math.round(d.logo.size * 100)}</span>
                <input
                  type="range"
                  min="10"
                  max="30"
                  value={Math.round(d.logo.size * 100)}
                  onChange={(e) => update((n) => (n.logo.size = Number(e.target.value) / 100))}
                />
              </label>
              <label className="adm-check">
                <input type="checkbox" checked={d.logo.pad} onChange={(e) => update((n) => (n.logo.pad = e.target.checked))} />
                logonun arkasında zemin
              </label>
            </div>
          )}
        </section>

        <section>
          <h3>noktalar</h3>
          <div className="qd-opts">
            {DOTS.map(([v, l]) => (
              <Opt key={v} sel={d.dot === v} onClick={() => update((n) => (n.dot = v))} img={thumb({ dot: v })} label={l} />
            ))}
          </div>
        </section>

        <section>
          <h3>köşe çerçevesi</h3>
          <div className="qd-opts">
            {OUTER.map(([v, l]) => (
              <Opt key={v} sel={d.eyeOuter === v} onClick={() => update((n) => (n.eyeOuter = v))} img={thumb({ eyeOuter: v })} label={l} />
            ))}
          </div>
          <h3>köşe noktası</h3>
          <div className="qd-opts">
            {INNER.map(([v, l]) => (
              <Opt key={v} sel={d.eyeInner === v} onClick={() => update((n) => (n.eyeInner = v))} img={thumb({ eyeInner: v })} label={l} />
            ))}
          </div>
        </section>

        <section>
          <h3>renkler</h3>
          <Color label="kod" value={d.fg} onChange={(v) => update((n) => (n.fg = v))} />
          <label className="adm-check">
            <input type="checkbox" checked={!d.eye} onChange={(e) => update((n) => (n.eye = e.target.checked ? '' : n.fg))} />
            köşeler kod rengini kullansın
          </label>
          {d.eye && <Color label="köşeler" value={d.eye} onChange={(v) => update((n) => (n.eye = v))} />}
          <Color label="arka plan" value={d.bg} onChange={(v) => update((n) => (n.bg = v))} />
        </section>

        <section className="qd-full">
          <h3>çerçeve</h3>
          <div className="qd-opts">
            {FRAMES.map(([v, l]) => (
              <Opt key={v} wide sel={d.frame.style === v} onClick={() => update((n) => (n.frame.style = v))} img={frameThumb(v)} label={l} />
            ))}
          </div>
          {d.frame.style !== 'none' && (
            <div className="qd-frame">
              <label className="adm-field">
                <span className="dim">çerçeve yazısı</span>
                <input
                  value={d.frame.text}
                  maxLength={40}
                  placeholder={FRAME_DEFAULT_TEXT[d.frame.style] || ''}
                  onChange={(e) => update((n) => (n.frame.text = e.target.value))}
                />
              </label>
              <Color label="vurgu" value={d.frame.color} onChange={(v) => update((n) => (n.frame.color = v))} />
              <Color label="çerçeve zemini" value={d.frame.bg} onChange={(v) => update((n) => (n.frame.bg = v))} />
            </div>
          )}
        </section>
      </div>
      {warns.map((w) => (
        <p key={w} className="qd-warn">
          [!] {w}
        </p>
      ))}
    </div>
  )
}

// color picker + hex text field, kept in sync
function Color({ label, value, onChange }) {
  return (
    <label className="adm-field qd-color">
      <span className="dim">{label}</span>
      <span className="qd-color-row">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        <input
          defaultValue={value}
          key={value}
          maxLength={7}
          spellCheck={false}
          onChange={(e) => HEX.test(e.target.value.trim()) && onChange(e.target.value.trim())}
        />
      </span>
    </label>
  )
}
