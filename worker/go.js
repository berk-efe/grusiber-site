// Admin API for go.grusiber.com short links and QR codes, under /api/admin/go/.
// Ported from the old go.grusiber.com/_admin. The go worker itself now only
// redirects and logs scans; it reads the same KV (LINKS) and D1 (GO_DB).
//
// LINKS (KV): slug -> destination URL. This is what the redirect reads.
// GO_DB (D1): links (note, stored QR svg + design), scans, logos, settings,
//             qr_codes (the static QR library). Schema: migrations-go/.

import { plainSvg } from '../src/qr/matrix.js'

export const SHORT_BASE = 'https://go.grusiber.com'
// Slugs can never start with "_", so they can't collide with reserved paths.
const SLUG_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/
// Generated endings skip 0/o, 1/l/i so they stay readable when printed.
const GEN_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
const GEN_LENGTH = 5
const MAX_URL = 2048
const MAX_NOTE = 500
const MAX_SVG = 1_500_000 // styled SVG incl. embedded logo
const MAX_LOGO = 700_000 // PNG data URL
const MAX_DESIGN = 4_000

export class GoError extends Error {
  constructor(status, message, extra) {
    super(message)
    this.status = status
    this.extra = extra
  }
}
const bad = (msg, extra) => new GoError(400, msg, extra)

// The URL printed in QR codes. "?qr" tells scans apart from typed/shared links.
const qrTextFor = (slug) => `${SHORT_BASE}/${slug}?qr`

const isHttpUrl = (v) => {
  try {
    const u = new URL(v.trim())
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}
const safeParse = (s) => {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

async function readJson(request, limit) {
  if (!request.headers.get('content-type')?.includes('application/json')) throw bad('json bekleniyor')
  const text = await request.text()
  if (text.length > limit) throw bad('istek çok büyük')
  const v = safeParse(text)
  if (!v || typeof v !== 'object') throw bad('geçersiz json')
  return v
}

function checkSvg(svg) {
  if (typeof svg !== 'string' || !svg.startsWith('<svg') || svg.length > MAX_SVG) throw bad('svg geçersiz ya da çok büyük')
  return svg
}
function checkDesign(design) {
  const s = JSON.stringify(design ?? null)
  if (typeof design !== 'object' || design === null || s.length > MAX_DESIGN) throw bad('tasarım geçersiz')
  return s
}
function parseSlug(raw) {
  let slug
  try {
    slug = decodeURIComponent(raw).toLowerCase()
  } catch {
    throw bad('uç geçersiz')
  }
  if (!SLUG_RE.test(slug)) throw bad('uç geçersiz')
  return slug
}

// path is what follows /api/admin/go, e.g. "/links/menu/stats"
export async function handleGo(request, env, path, url) {
  const m = request.method
  const [a, b, c] = path.split('/').filter(Boolean)

  if (a === 'generate' && m === 'GET') return { slug: await generateSlug(env) }
  if (a === 'settings' && m === 'GET') return getSettings(env)
  if (a === 'settings' && m === 'PUT') return putSettings(request, env)
  if (a === 'logos') return logos(request, env, b)
  if (a === 'codes') return codes(request, env, b)

  if (a === 'links') {
    if (!b && m === 'GET') return listLinks(env)
    if (!b && m === 'POST') return saveLink(request, env)
    if (b) {
      const slug = parseSlug(b)
      if (!c && m === 'DELETE') return deleteLink(env, slug)
      if (c === 'stats' && m === 'GET') return stats(env, slug, url.searchParams)
      if (c === 'qr' && m === 'PUT') return saveLinkQr(request, env, slug)
    }
  }
  throw new GoError(404, 'yok')
}

async function generateSlug(env) {
  for (let i = 0; i < 10; i++) {
    const bytes = crypto.getRandomValues(new Uint8Array(GEN_LENGTH))
    const slug = [...bytes].map((x) => GEN_ALPHABET[x % GEN_ALPHABET.length]).join('')
    if ((await env.LINKS.get(slug)) === null) return slug
  }
  throw new GoError(500, 'boş bir uç bulunamadı, tekrar dene')
}

// --- links ----------------------------------------------------------------

async function saveLink(request, env) {
  const body = await readJson(request, 10_000)
  const target = String(body.url ?? '').trim()
  if (!isHttpUrl(target) || /\s/.test(target)) throw bad('hedef geçerli bir http:// ya da https:// adresi olmalı')
  if (target.length > MAX_URL) throw bad('hedef adres çok uzun')

  let slug = String(body.slug ?? '').trim().replace(/^\/+|\/+$/g, '').toLowerCase()
  if (slug === '') slug = await generateSlug(env)
  if (!SLUG_RE.test(slug)) throw bad('uç sadece a-z, 0-9, . _ - içerebilir ve harf ya da rakamla başlamalı')
  const note = String(body.note ?? '').trim().slice(0, MAX_NOTE)

  const existing = await env.LINKS.get(slug)
  if (existing !== null && !body.overwrite) throw new GoError(409, `"${slug}" zaten kullanılıyor`, { existing })

  const now = new Date().toISOString()
  const qrText = qrTextFor(slug)
  // KV first: it is what the redirect reads. The metadata lets the list skip one read per key.
  await env.LINKS.put(slug, target, target.length <= 900 ? { metadata: { url: target } } : undefined)
  await env.GO_DB.prepare(
    `INSERT INTO links (slug, url, note, qr_text, qr_svg, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
     ON CONFLICT(slug) DO UPDATE SET url = excluded.url, note = excluded.note, updated_at = excluded.updated_at`,
  )
    .bind(slug, target, note, qrText, plainSvg(qrText), now)
    .run()

  return { slug, url: target, note, short: `${SHORT_BASE}/${slug}`, qr_text: qrText, updated: existing !== null }
}

async function deleteLink(env, slug) {
  await env.LINKS.delete(slug)
  await env.GO_DB.prepare('DELETE FROM links WHERE slug = ?1').bind(slug).run()
  // scan history is kept on purpose
  return { ok: true }
}

async function listLinks(env) {
  // every KV key is a link, including ones added with links.sh
  const keys = []
  let cursor
  do {
    const page = await env.LINKS.list({ cursor })
    for (const k of page.keys) keys.push({ name: k.name, url: k.metadata?.url })
    cursor = page.list_complete ? undefined : page.cursor
  } while (cursor)
  await Promise.all(keys.filter((k) => !k.url).map(async (k) => (k.url = (await env.LINKS.get(k.name)) ?? '')))

  const [rows, aggs] = await env.GO_DB.batch([
    env.GO_DB.prepare('SELECT slug, note, design, created_at, updated_at FROM links'),
    env.GO_DB.prepare(
      `SELECT slug, COUNT(*) AS total, SUM(is_bot = 0) AS humans,
              COUNT(DISTINCT CASE WHEN is_bot = 0 THEN visitor END) AS uniq,
              SUM(is_bot = 0 AND source = 'qr') AS qr, MAX(ts) AS last
         FROM scans GROUP BY slug`,
    ),
  ])
  const meta = new Map(rows.results.map((r) => [r.slug, r]))
  const agg = new Map(aggs.results.map((r) => [r.slug, r]))

  const links = keys.map((k) => {
    const mm = meta.get(k.name)
    const s = agg.get(k.name)
    return {
      slug: k.name,
      url: k.url,
      short: `${SHORT_BASE}/${k.name}`,
      note: mm?.note ?? '',
      design: mm?.design ? safeParse(mm.design) : null,
      created_at: mm?.created_at ?? null,
      updated_at: mm?.updated_at ?? null,
      scans: s?.humans ?? 0,
      unique: s?.uniq ?? 0,
      via_qr: s?.qr ?? 0,
      bots: (s?.total ?? 0) - (s?.humans ?? 0),
      last_scan: s?.last ?? null,
    }
  })
  links.sort((x, y) => (y.created_at ?? '').localeCompare(x.created_at ?? '') || x.slug.localeCompare(y.slug))
  return { links }
}

const BREAKDOWNS = {
  countries: 'country',
  cities: "COALESCE(city, '?') || ', ' || COALESCE(country, '?')",
  devices: 'device',
  os: 'os',
  browsers: 'browser',
  sources: 'source',
  referrers: "COALESCE(referer, '(yok / doğrudan)')",
  networks: 'asn_org',
}

async function stats(env, slug, params) {
  const days = Math.min(Math.max(parseInt(params.get('days') ?? '30', 10) || 30, 1), 3650)
  const since = new Date(Date.now() - days * 86400_000).toISOString()
  // the viewer's offset from UTC, so "per day" uses their local days
  const tzMin = Math.max(-840, Math.min(840, -(parseInt(params.get('tz') ?? '0', 10) || 0)))
  const shift = `${tzMin >= 0 ? '+' : ''}${tzMin} minutes`

  const DB = env.GO_DB
  const base = 'FROM scans WHERE slug = ?1 AND ts >= ?2 AND is_bot = 0'
  const res = await DB.batch([
    DB.prepare(
      `SELECT COUNT(*) AS scans, COUNT(DISTINCT visitor) AS unique_visitors,
              SUM(source = 'qr') AS via_qr, SUM(source = 'link') AS via_link,
              MIN(ts) AS first, MAX(ts) AS last ${base}`,
    ).bind(slug, since),
    DB.prepare('SELECT COUNT(*) AS bots FROM scans WHERE slug = ?1 AND ts >= ?2 AND is_bot = 1').bind(slug, since),
    DB.prepare(
      `SELECT COUNT(*) AS scans, COUNT(DISTINCT CASE WHEN is_bot = 0 THEN visitor END) AS unique_visitors,
              SUM(is_bot = 0) AS humans FROM scans WHERE slug = ?1`,
    ).bind(slug),
    DB.prepare(
      `SELECT substr(datetime(ts, ?3), 1, 10) AS day, COUNT(*) AS scans, COUNT(DISTINCT visitor) AS unique_visitors
         ${base} GROUP BY day ORDER BY day DESC`,
    ).bind(slug, since, shift),
    ...Object.values(BREAKDOWNS).map((expr) =>
      DB.prepare(`SELECT ${expr} AS k, COUNT(*) AS n ${base} GROUP BY k ORDER BY n DESC LIMIT 10`).bind(slug, since),
    ),
    DB.prepare(
      `SELECT ts, source, ip, country, region, city, asn_org, device, os, browser, is_bot, referer, lang, ua, target
         FROM scans WHERE slug = ?1 ORDER BY id DESC LIMIT 200`,
    ).bind(slug),
  ])
  const [totals, bots, allTime, daily, ...rest] = res
  const recent = rest.pop()
  const breakdowns = {}
  Object.keys(BREAKDOWNS).forEach((name, i) => (breakdowns[name] = rest[i].results))
  return {
    slug,
    days,
    totals: { ...totals.results[0], ...bots.results[0] },
    all_time: allTime.results[0],
    daily: daily.results,
    breakdowns,
    recent: recent.results,
  }
}

async function saveLinkQr(request, env, slug) {
  const body = await readJson(request, MAX_SVG + MAX_DESIGN + 200)
  const svg = checkSvg(body.svg)
  const design = checkDesign(body.design)
  const target = await env.LINKS.get(slug)
  if (target === null) throw new GoError(404, 'link bulunamadı')
  const now = new Date().toISOString()
  await env.GO_DB.prepare(
    `INSERT INTO links (slug, url, note, qr_text, qr_svg, design, created_at, updated_at)
     VALUES (?1, ?2, '', ?3, ?4, ?5, ?6, ?6)
     ON CONFLICT(slug) DO UPDATE SET qr_svg = excluded.qr_svg, design = excluded.design, updated_at = excluded.updated_at`,
  )
    .bind(slug, target, qrTextFor(slug), svg, design, now)
    .run()
  return { ok: true }
}

// --- designer: settings, logos ---------------------------------------------

async function getSettings(env) {
  const { results } = await env.GO_DB.prepare('SELECT key, value FROM settings').all()
  return Object.fromEntries(results.map((r) => [r.key, safeParse(r.value)]))
}

async function putSettings(request, env) {
  const body = await readJson(request, MAX_DESIGN + 100)
  if (body.default_design === undefined) throw bad('kaydedilecek bir şey yok')
  await env.GO_DB.prepare(
    "INSERT INTO settings (key, value) VALUES ('default_design', ?1) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  )
    .bind(checkDesign(body.default_design))
    .run()
  return { ok: true }
}

async function logos(request, env, rawId) {
  const m = request.method
  if (!rawId && m === 'GET') {
    const { results } = await env.GO_DB.prepare('SELECT id, name, data_url, created_at FROM logos ORDER BY id').all()
    return { logos: results }
  }
  if (!rawId && m === 'POST') {
    const body = await readJson(request, MAX_LOGO + 500)
    const dataUrl = String(body.data_url ?? '')
    if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(dataUrl) || dataUrl.length > MAX_LOGO) {
      throw bad('logo ~500 KB altında bir png olmalı')
    }
    const name = String(body.name ?? 'logo').trim().slice(0, 100) || 'logo'
    const row = await env.GO_DB.prepare('INSERT INTO logos (name, data_url, created_at) VALUES (?1, ?2, ?3) RETURNING id')
      .bind(name, dataUrl, new Date().toISOString())
      .first()
    return { id: row?.id, name, data_url: dataUrl }
  }
  const id = Number(rawId)
  if (rawId && Number.isInteger(id) && m === 'DELETE') {
    await env.GO_DB.prepare('DELETE FROM logos WHERE id = ?1').bind(id).run()
    return { ok: true }
  }
  throw new GoError(404, 'yok')
}

// --- static QR library ------------------------------------------------------

async function codes(request, env, rawId) {
  const m = request.method
  const id = rawId === undefined ? null : Number(rawId)
  if (rawId !== undefined && !Number.isInteger(id)) throw bad('id geçersiz')

  if (id === null && m === 'GET') {
    const { results } = await env.GO_DB.prepare(
      'SELECT id, name, kind, fields, content, design, created_at, updated_at FROM qr_codes ORDER BY id DESC LIMIT 500',
    ).all()
    return { codes: results.map((r) => ({ ...r, fields: safeParse(r.fields), design: safeParse(r.design) })) }
  }
  if (id !== null && m === 'DELETE') {
    await env.GO_DB.prepare('DELETE FROM qr_codes WHERE id = ?1').bind(id).run()
    return { ok: true }
  }
  if ((id === null && m === 'POST') || (id !== null && m === 'PUT')) {
    const b = await readJson(request, MAX_SVG + 10_000)
    const name = String(b.name ?? '').trim().slice(0, 120)
    const kind = String(b.kind ?? '').trim().slice(0, 20)
    const content = String(b.content ?? '')
    if (!name) throw bad('koda bir isim ver')
    if (!kind || !content || content.length > 4000) throw bad('içerik geçersiz')
    const fields = JSON.stringify(b.fields ?? {})
    if (fields.length > 6000) throw bad('alanlar geçersiz')
    const svg = checkSvg(b.svg)
    const design = checkDesign(b.design)
    const now = new Date().toISOString()
    if (id === null) {
      const row = await env.GO_DB.prepare(
        `INSERT INTO qr_codes (name, kind, fields, content, design, svg, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7) RETURNING id`,
      )
        .bind(name, kind, fields, content, design, svg, now)
        .first()
      return { id: row?.id }
    }
    const r = await env.GO_DB.prepare(
      `UPDATE qr_codes SET name = ?2, kind = ?3, fields = ?4, content = ?5, design = ?6, svg = ?7, updated_at = ?8
        WHERE id = ?1`,
    )
      .bind(id, name, kind, fields, content, design, svg, now)
      .run()
    if (!r.meta.changes) throw new GoError(404, 'bulunamadı')
    return { id }
  }
  throw new GoError(404, 'yok')
}
