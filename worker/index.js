// The site is static files; this worker only sees /api/* (see run_worker_first
// in wrangler.jsonc). Public reads are open. Writes under /api/admin/ need a
// Cloudflare Access login: Access puts a signed JWT on the request and we
// check it here, so the API is safe even if someone reaches it directly.

import { EVENT_TYPES } from '../src/eventTypes.js'

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  })
const fail = (status, error) => json({ error }, status)

class Bad extends Error {}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname.replace(/\/+$/, '')
    try {
      if (request.method === 'GET' && path === '/api/events') return json(await listEvents(env), 200, PUBLIC_CACHE)
      if (request.method === 'GET' && path === '/api/announcements') return json(await listAnnouncements(env), 200, PUBLIC_CACHE)

      if (path === '/api/admin' || path.startsWith('/api/admin/')) {
        const who = await authenticate(request, env)
        if (!who) return fail(401, 'giriş gerekli')
        if (request.method !== 'GET' && !isLocalDev(request, env) && !sameOrigin(request, url)) return fail(403, 'izin yok')
        return await admin(request, env, path.slice('/api/admin'.length), who)
      }
      return fail(404, 'yok')
    } catch (e) {
      if (e instanceof Bad) return fail(400, e.message)
      console.error(e)
      return fail(500, 'sunucu hatası')
    }
  },
}

// no browser caching: an admin's edit should show up on the next page load
const PUBLIC_CACHE = { 'cache-control': 'no-cache' }

async function listEvents(env) {
  const { results } = await env.DB.prepare('SELECT id, title, type, start, "end", place, description, link FROM events ORDER BY start').all()
  return results.map(stripNulls)
}

async function listAnnouncements(env) {
  const { results } = await env.DB.prepare('SELECT id, date, title, body, banner FROM announcements ORDER BY date DESC, updated_at DESC').all()
  return results.map((a) => ({ ...a, banner: !!a.banner, body: a.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) }))
}

const stripNulls = (row) => Object.fromEntries(Object.entries(row).filter(([, v]) => v !== null))

async function admin(request, env, path, who) {
  const m = request.method
  if (m === 'GET' && path === '/me') return json({ email: who })

  let match
  if ((match = /^\/(events|announcements)(?:\/([\w-]+))?$/.exec(path))) {
    const [, kind, id] = match
    const table = kind === 'events' ? EVENTS : ANNOUNCEMENTS
    if (m === 'GET' && !id) return json(kind === 'events' ? await listEvents(env) : await listAnnouncements(env))
    if (m === 'POST' && !id) return json(await save(env, table, null, await body(request), who), 201)
    if (m === 'PUT' && id) return json(await save(env, table, id, await body(request), who))
    if (m === 'DELETE' && id) {
      const r = await env.DB.prepare(`DELETE FROM ${table.name} WHERE id = ?`).bind(id).run()
      return r.meta.changes ? json({ ok: true }) : fail(404, 'bulunamadı')
    }
  }
  return fail(404, 'yok')
}

async function body(request) {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new Bad('json bekleniyor')
  try {
    return await request.json()
  } catch {
    throw new Bad('geçersiz json')
  }
}

// --- validation ---------------------------------------------------------

const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

function text(v, name, { max = 200, required = false } = {}) {
  const s = typeof v === 'string' ? v.trim() : ''
  if (required && !s) throw new Bad(`${name} boş olamaz`)
  if (s.length > max) throw new Bad(`${name} en fazla ${max} karakter`)
  return s || null
}

const EVENTS = {
  name: 'events',
  columns: ['title', 'type', 'start', '"end"', 'place', 'description', 'link'],
  clean(b) {
    const start = text(b.start, 'başlangıç', { required: true })
    const end = text(b.end, 'bitiş')
    if (!DATETIME.test(start)) throw new Bad('başlangıç YYYY-AA-GGTSS:DD olmalı')
    if (end && !DATETIME.test(end)) throw new Bad('bitiş YYYY-AA-GGTSS:DD olmalı')
    if (end && end < start) throw new Bad('bitiş başlangıçtan önce olamaz')
    if (!EVENT_TYPES[b.type]) throw new Bad('tür geçersiz')
    const link = text(b.link, 'bağlantı', { max: 500 })
    if (link && !/^https?:\/\//.test(link)) throw new Bad('bağlantı http(s):// ile başlamalı')
    return [text(b.title, 'başlık', { required: true }), b.type, start, end, text(b.place, 'yer'), text(b.description, 'açıklama', { max: 2000 }), link]
  },
}

const ANNOUNCEMENTS = {
  name: 'announcements',
  columns: ['date', 'title', 'body', 'banner'],
  clean(b) {
    const date = text(b.date, 'tarih', { required: true })
    if (!DATE.test(date)) throw new Bad('tarih YYYY-AA-GG olmalı')
    const raw = Array.isArray(b.body) ? b.body.join('\n\n') : b.body
    return [date, text(b.title, 'başlık', { required: true }), text(raw, 'metin', { max: 5000, required: true }), b.banner ? 1 : 0]
  },
}

async function save(env, table, id, b, who) {
  const values = table.clean(b ?? {})
  const now = new Date().toISOString()
  if (id) {
    const set = table.columns.map((c) => `${c} = ?`).join(', ')
    const r = await env.DB.prepare(`UPDATE ${table.name} SET ${set}, updated_at = ?, updated_by = ? WHERE id = ?`)
      .bind(...values, now, who, id)
      .run()
    if (!r.meta.changes) throw new Bad('bulunamadı')
  } else {
    // short readable id: used in links like /duyurular/#id and .ics UIDs
    id = slug(values[table === EVENTS ? 0 : 1]) + '-' + crypto.randomUUID().slice(0, 6)
    const cols = ['id', ...table.columns, 'updated_at', 'updated_by']
    await env.DB.prepare(`INSERT INTO ${table.name} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`)
      .bind(id, ...values, now, who)
      .run()
  }
  return { id }
}

function slug(s) {
  const tr = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' }
  return (
    s
      .toLocaleLowerCase('tr')
      .replace(/[çğıöşü]/g, (c) => tr[c])
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'kayit'
  )
}

// --- auth ---------------------------------------------------------------

// Writes must come from our own pages, not a form on another site riding the
// Access cookie.
function sameOrigin(request, url) {
  const origin = request.headers.get('origin')
  return !origin || origin === url.origin
}

// `wrangler dev` with .dev.vars: pretend to be signed in. The deployed worker
// never has DEV_ADMIN_EMAIL, and it only counts on localhost anyway.
const isLocalDev = (request, env) => !!env.DEV_ADMIN_EMAIL && new URL(request.url).hostname === 'localhost'

// Returns the signed-in email, or null.
async function authenticate(request, env) {
  if (isLocalDev(request, env)) return env.DEV_ADMIN_EMAIL

  const token = request.headers.get('cf-access-jwt-assertion')
  if (!token || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return null
  const claims = await verifyAccessJwt(token, env)
  return claims?.email ?? null
}

let certs = { at: 0, keys: [] }

async function verifyAccessJwt(token, env) {
  const [h, p, s] = token.split('.')
  if (!s) return null
  const header = JSON.parse(b64text(h))
  const claims = JSON.parse(b64text(p))
  if (header.alg !== 'RS256') return null

  const issuer = `https://${env.ACCESS_TEAM_DOMAIN}`
  if (Date.now() - certs.at > 3600e3) {
    const r = await fetch(`${issuer}/cdn-cgi/access/certs`)
    certs = { at: Date.now(), keys: (await r.json()).keys }
  }
  const jwk = certs.keys.find((k) => k.kid === header.kid)
  if (!jwk) return null
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64bytes(s), new TextEncoder().encode(`${h}.${p}`))
  if (!ok) return null

  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
  const now = Date.now() / 1000
  if (claims.iss !== issuer || !aud.includes(env.ACCESS_AUD) || !(claims.exp > now) || claims.nbf > now) return null
  return claims
}

function b64bytes(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}
const b64text = (s) => new TextDecoder().decode(b64bytes(s))
