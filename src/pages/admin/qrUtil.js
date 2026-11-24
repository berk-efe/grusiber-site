import { adminApi } from '../../api.js'
import { render } from '../../qr/style.js'

export const goApi = (method, path, body) => adminApi(method, `/go${path}`, body)

export const svgUrl = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)

export const logoUrlFor = (design, logos) => {
  const id = design?.logo?.id
  return (id != null && logos.find((l) => l.id === id)?.data_url) || null
}

export const renderSvg = (rows, design, logos) => render(rows, design, { logoDataUrl: logoUrlFor(design, logos) })

export const fileSafe = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'qr'

function download(blob, name) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

export const downloadSvg = (svg, name) => download(new Blob([svg], { type: 'image/svg+xml' }), `${name}.svg`)

// 1200 px wide PNG, drawn from the SVG in a canvas
export function downloadPng(svg, name) {
  const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg)
  const ratio = vb ? parseFloat(vb[2]) / parseFloat(vb[1]) : 1
  const w = 1200
  const h = Math.round(w * ratio)
  const img = new Image()
  img.onload = () => {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    c.getContext('2d').drawImage(img, 0, 0, w, h)
    c.toBlob((b) => download(b, `${name}.png`), 'image/png')
  }
  img.src = svgUrl(svg)
}

// Any image -> PNG of at most 512 px, stored in the go database.
export async function uploadLogo(file) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = () => rej(new Error('bu resim okunamadı'))
      i.src = url
    })
    const w0 = img.naturalWidth || 512
    const h0 = img.naturalHeight || 512
    const k = Math.min(1, 512 / Math.max(w0, h0))
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(w0 * k))
    c.height = Math.max(1, Math.round(h0 * k))
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
    return await goApi('POST', '/logos', { name: file.name, data_url: c.toDataURL('image/png') })
  } finally {
    URL.revokeObjectURL(url)
  }
}

export const fmtTime = (iso) => (iso ? new Date(iso).toLocaleString('tr-TR') : '—')

export function ago(iso) {
  if (!iso) return 'hiç'
  const s = (Date.now() - new Date(iso)) / 1000
  if (s < 60) return 'az önce'
  if (s < 3600) return `${Math.floor(s / 60)} dk önce`
  if (s < 86400) return `${Math.floor(s / 3600)} sa önce`
  return `${Math.floor(s / 86400)} gün önce`
}
