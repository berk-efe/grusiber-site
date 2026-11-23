import qrcode from 'qrcode-generator'

// Shared by the admin page and the worker, so both make the exact same code.

// Max bytes a version-40 QR holds at error correction H.
export const MAX_QR_BYTES = 1273

// UTF-8 bytes as a "binary string" (one char per byte), so Turkish letters encode correctly.
function utf8Binary(text) {
  let out = ''
  for (const b of new TextEncoder().encode(text)) out += String.fromCharCode(b)
  return out
}

// Rows of "0101…" strings; error correction H (~30% recoverable, room for a logo).
export function qrRows(text) {
  if (new TextEncoder().encode(text).length > MAX_QR_BYTES) {
    throw new Error(`bir qr kod için çok uzun (en fazla ${MAX_QR_BYTES} bayt)`)
  }
  const qr = qrcode(0, 'H')
  qr.addData(utf8Binary(text), 'Byte')
  qr.make()
  const n = qr.getModuleCount()
  const rows = []
  for (let r = 0; r < n; r++) {
    let s = ''
    for (let c = 0; c < n; c++) s += qr.isDark(r, c) ? '1' : '0'
    rows.push(s)
  }
  return rows
}

// Plain black-on-white QR with a 4-module quiet zone (stored until a design is saved).
export function plainSvg(text) {
  const rows = qrRows(text)
  const n = rows.length
  const m = 4
  const size = n + m * 2
  let d = ''
  rows.forEach((row, r) => {
    for (let c = 0; c < n; c++) if (row[c] === '1') d += `M${c + m} ${r + m}h1v1h-1z`
  })
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">` +
    `<rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`
  )
}
