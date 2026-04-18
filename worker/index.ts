/**
 * Kaki — Cloudflare Worker : proxy CORS pour scraping OG tags Instagram
 *
 * Usage : GET https://kaki-proxy.ton-handle.workers.dev/?url=https://www.instagram.com/p/xxx
 * Réponse : { contents: "<html>..." }  (même format qu'allorigins.win)
 */

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  // Ajoute ton domaine de prod ici : 'https://kaki.app'
]

const CACHE_TTL = 3600 // 1h

interface Ctx { waitUntil(p: Promise<unknown>): void }

export default {
  async fetch(request: Request, _env: unknown, ctx: Ctx): Promise<Response> {
    const url = new URL(request.url)

    // ── Preflight CORS ────────────────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return corsResponse(new Response(null, { status: 204 }), request)
    }

    if (request.method !== 'GET') {
      return corsResponse(new Response('Method Not Allowed', { status: 405 }), request)
    }

    // ── Paramètre ?url= ───────────────────────────────────────────────────────
    const target = url.searchParams.get('url')
    if (!target) {
      return corsResponse(json({ error: 'Missing ?url= parameter' }, 400), request)
    }

    let targetUrl: URL
    try {
      targetUrl = new URL(target)
    } catch {
      return corsResponse(json({ error: 'Invalid URL' }, 400), request)
    }

    const host = targetUrl.hostname.replace('www.', '')
    const allowedHosts = ['instagram.com', 'goo.gl', 'maps.app.goo.gl', 'google.com', 'maps.google.com']
    if (!allowedHosts.includes(host)) {
      return corsResponse(json({ error: `Host not allowed: ${host}` }, 403), request)
    }

    // ── Résolution des short links Google Maps ────────────────────────────────
    if (host === 'goo.gl' || host === 'maps.app.goo.gl') {
      try {
        const res = await fetch(target, { redirect: 'follow' })
        return corsResponse(json({ resolved_url: res.url }), request)
      } catch (e) {
        return corsResponse(json({ error: `Redirect failed: ${(e as Error).message}` }, 502), request)
      }
    }

    // Seul Instagram nécessite le scraping HTML
    if (host !== 'instagram.com') {
      return corsResponse(json({ error: `Host not allowed for scraping: ${host}` }, 403), request)
    }

    // ── Cache Cloudflare ──────────────────────────────────────────────────────
    const cache = (caches as unknown as { default: Cache }).default
    const cacheKey = new Request(request.url, { method: 'GET' })
    const cached = await cache.match(cacheKey)
    if (cached) {
      const clone = new Response(cached.body, cached)
      clone.headers.set('X-Cache', 'HIT')
      return corsResponse(clone, request)
    }

    // ── Fetch Instagram ───────────────────────────────────────────────────────
    let html: string
    try {
      const igRes = await fetch(target, {
        headers: {
          // User-agent mobile — Instagram retourne plus souvent le HTML OG complet
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8',
        },
        redirect: 'follow',
        // @ts-ignore — CF specific
        cf: { cacheTtl: CACHE_TTL, cacheEverything: false },
      })

      if (!igRes.ok) {
        return corsResponse(json({ error: `Instagram returned ${igRes.status}` }, 502), request)
      }

      html = await igRes.text()
    } catch (e) {
      return corsResponse(json({ error: `Fetch failed: ${(e as Error).message}` }, 502), request)
    }

    // ── Réponse + mise en cache ───────────────────────────────────────────────
    const body = JSON.stringify({ contents: html })
    const response = new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
        'X-Cache': 'MISS',
      },
    })

    ctx.waitUntil(cache.put(cacheKey, response.clone()))
    return corsResponse(response, request)
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function corsResponse(response: Response, request: Request): Response {
  const origin = request.headers.get('Origin') ?? ''
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

  const headers = new Headers(response.headers)
  headers.set('Access-Control-Allow-Origin', allowed)
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type')
  headers.set('Vary', 'Origin')

  return new Response(response.body, { status: response.status, headers })
}
