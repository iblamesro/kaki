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

interface Env {
  RESEND_API_KEY?: string
  NOTIFICATION_EMAIL?: string
}

export default {
  async fetch(request: Request, env: Env, ctx: Ctx): Promise<Response> {
    const url = new URL(request.url)

    // ── Preflight CORS ────────────────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return corsResponse(new Response(null, { status: 204 }), request)
    }

    // ── POST /send-reservation ────────────────────────────────────────────────
    if (request.method === 'POST' && url.pathname === '/send-reservation') {
      return corsResponse(await handleSendReservation(request, env), request)
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

// ── Email via Resend ──────────────────────────────────────────────────────────
async function handleSendReservation(request: Request, env: Env): Promise<Response> {
  if (!env.RESEND_API_KEY) {
    return json({ error: 'RESEND_API_KEY not configured' }, 503)
  }

  let body: Record<string, unknown>
  try {
    body = await request.json() as Record<string, unknown>
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const { placeName, placeAddress, restaurantEmail, guestName, guestEmail,
    guestPhone, partySize, reservationDate, message, trackingCode } = body

  const date = new Date(reservationDate as string)
  const dateStr = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  const toRestaurant = (restaurantEmail as string | null) ?? env.NOTIFICATION_EMAIL
  if (!toRestaurant) return json({ error: 'No recipient email' }, 400)

  // Email au restaurant
  const restaurantHtml = `
    <div style="font-family: sans-serif; max-width: 520px; color: #1a1a1a;">
      <h2 style="color: #5a6b00;">Nouvelle demande de réservation — ${placeName}</h2>
      <table style="width:100%; border-collapse: collapse;">
        <tr><td style="padding:6px 0; color:#555;">Client</td><td style="padding:6px 0;"><strong>${guestName}</strong></td></tr>
        <tr><td style="padding:6px 0; color:#555;">Email</td><td style="padding:6px 0;">${guestEmail}</td></tr>
        ${guestPhone ? `<tr><td style="padding:6px 0; color:#555;">Téléphone</td><td style="padding:6px 0;">${guestPhone}</td></tr>` : ''}
        <tr><td style="padding:6px 0; color:#555;">Date</td><td style="padding:6px 0;">${dateStr} à ${timeStr}</td></tr>
        <tr><td style="padding:6px 0; color:#555;">Couverts</td><td style="padding:6px 0;">${partySize} personne${Number(partySize) > 1 ? 's' : ''}</td></tr>
        ${message ? `<tr><td style="padding:6px 0; color:#555; vertical-align:top;">Message</td><td style="padding:6px 0;">${message}</td></tr>` : ''}
      </table>
      <p style="margin-top:20px; font-size:12px; color:#888;">Code de suivi : <strong>${trackingCode}</strong></p>
    </div>`

  // Email de confirmation au client
  const clientHtml = `
    <div style="font-family: sans-serif; max-width: 520px; color: #1a1a1a;">
      <h2 style="color: #5a6b00;">Demande de réservation envoyée ✦</h2>
      <p>Bonjour ${guestName},</p>
      <p>Ta demande de réservation chez <strong>${placeName}</strong> (${placeAddress}) a bien été transmise.</p>
      <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding:6px 0; color:#555;">Date</td><td style="padding:6px 0;">${dateStr} à ${timeStr}</td></tr>
        <tr><td style="padding:6px 0; color:#555;">Couverts</td><td style="padding:6px 0;">${partySize} personne${Number(partySize) > 1 ? 's' : ''}</td></tr>
      </table>
      <p style="font-size:13px; color:#555;">Le restaurant te confirmera directement. En attendant, garde ce code de suivi :</p>
      <p style="font-size:22px; letter-spacing:0.12em; font-weight:bold; color:#5a6b00;">${trackingCode}</p>
      <p style="font-size:11px; color:#aaa; margin-top:24px;">Envoyé via Kaki ✦</p>
    </div>`

  const sendEmail = (to: string, subject: string, html: string) =>
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'Kaki <onboarding@resend.dev>', to: [to], subject, html }),
    })

  await Promise.all([
    sendEmail(toRestaurant, `Nouvelle réservation — ${placeName}`, restaurantHtml),
    sendEmail(guestEmail as string, `Confirmation de ta demande — ${placeName}`, clientHtml),
  ])

  return json({ ok: true, trackingCode })
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
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type')
  headers.set('Vary', 'Origin')

  return new Response(response.body, { status: response.status, headers })
}
