// GET /api/threats: real attack data for the home page threat map, from the
// Cloudflare Radar API (layer 7 attacks, last 24 hours). Radar data is
// CC BY-NC 4.0, so the map credits it.
//
// Radar only publishes origin -> target country pairs for DDoS. For the other
// attack types it publishes the top origin countries and the top target
// countries separately, so the map pairs those at random. Each type comes with
// its share of all mitigated layer 7 requests, which decides how often it is
// drawn. Values are percentages, not individual events.

const API = 'https://api.cloudflare.com/client/v4/radar/attacks/layer7'
const TYPES = ['DDOS', 'WAF', 'BOT_MANAGEMENT', 'IP_REPUTATION']
const LIMIT = 40
const TTL = 10 * 60 // seconds; Radar aggregates in 15 minute buckets anyway

let memo = { at: 0, data: null }

export async function handleThreats(request, env, ctx) {
  if (!env.RADAR_TOKEN) return json({ error: 'radar yapılandırılmadı' }, 503)

  if (memo.data && Date.now() - memo.at < TTL * 1000) return json(memo.data)

  // the Cache API is shared across isolates on the custom domain
  const cache = caches.default
  // bump the version when the payload shape changes, so old cached copies are skipped
  const key = new Request(new URL('/api/threats?v=2', request.url).toString())
  const hit = await cache.match(key)
  if (hit) {
    memo = { at: Date.now(), data: await hit.clone().json() }
    return hit
  }

  const data = await load(env.RADAR_TOKEN)
  memo = { at: Date.now(), data }
  const res = json(data)
  ctx.waitUntil(cache.put(key, res.clone()))
  return res
}

async function load(token) {
  const get = async (path) => {
    const r = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } })
    const body = await r.json()
    if (!r.ok || !body.success) throw new Error(`radar ${path}: ${r.status} ${JSON.stringify(body.errors)}`)
    return body.result
  }
  const q = (product) => `dateRange=1d&limit=${LIMIT}&mitigationProduct=${product}&format=JSON`
  const places = (result, side) =>
    (result.top_0 || [])
      .map((p) => ({ code: p[`${side}CountryAlpha2`], name: p[`${side}CountryName`], value: Number(p.value) }))
      .filter((p) => p.code && p.value > 0)

  const [summary, ...perType] = await Promise.all([
    get('/summary/MITIGATION_PRODUCT?dateRange=1d&format=JSON'),
    ...TYPES.map(async (t) => {
      const [pairs, origins, targets] = await Promise.all([
        get(`/top/attacks?${q(t)}`),
        get(`/top/locations/origin?${q(t)}`),
        get(`/top/locations/target?${q(t)}`),
      ])
      return {
        pairs: (pairs.top_0 || [])
          .filter((p) => p.originCountryAlpha2 && p.targetCountryAlpha2 && Number(p.value) > 0)
          .map((p) => ({
            from: p.originCountryAlpha2,
            to: p.targetCountryAlpha2,
            fromName: p.originCountryName,
            toName: p.targetCountryName,
            value: Number(p.value),
          })),
        origins: places(origins, 'origin'),
        targets: places(targets, 'target'),
      }
    }),
  ])

  const shares = summary.summary_0 || {}
  return {
    updated: summary.meta?.lastUpdated || new Date().toISOString(),
    types: TYPES.map((key, i) => ({ key, share: Number(shares[key]) || 0, ...perType[i] })),
  }
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': status === 200 ? `public, max-age=${TTL}` : 'no-store',
    },
  })
