import { useEffect, useState } from 'react'

// Public data from the worker (worker/index.js). Kept for the tab's lifetime
// so moving between pages doesn't flash empty.
const cache = new Map()

export function useApi(path) {
  const [state, setState] = useState(() =>
    cache.has(path) ? { data: cache.get(path), error: null } : { data: null, error: null },
  )
  useEffect(() => {
    let live = true
    fetch(path)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        cache.set(path, data)
        if (live) setState({ data, error: null })
      })
      .catch((error) => live && setState((s) => ({ data: s.data, error })))
    return () => {
      live = false
    }
  }, [path])
  return state
}

// Admin calls. Throws an Error with the server's (Turkish) message.
export async function adminApi(method, path, body) {
  const r = await fetch(`/api/admin${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(new Error(data.error || `HTTP ${r.status}`), { status: r.status, data })
  // the public lists changed: drop them so the next visit refetches
  cache.clear()
  return data
}
