const CACHE = 'kaki-v1'
const PRECACHE = ['/', '/index.html']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// Network-first pour les requêtes API, cache-first pour les assets statiques
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)

  // Ne pas intercepter Supabase, Cloudflare Worker, Nominatim
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('workers.dev') ||
    url.hostname.includes('nominatim') ||
    url.hostname.includes('cartocdn')
  ) return

  // Cache-first pour assets (JS, CSS, images)
  if (e.request.destination === 'script' || e.request.destination === 'style' || e.request.destination === 'image') {
    e.respondWith(
      caches.match(e.request).then(cached => cached ?? fetch(e.request).then(res => {
        const clone = res.clone()
        caches.open(CACHE).then(c => c.put(e.request, clone))
        return res
      }))
    )
    return
  }

  // Network-first pour le reste (HTML, navigation)
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request).then(r => r ?? caches.match('/index.html')))
  )
})

// Web Share Target — reçoit un lien partagé depuis une autre app
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  const url = new URL(e.request.url)
  const shareUrl = url.searchParams.get('share_url')
  if (!shareUrl) return

  e.respondWith(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window' })
      for (const client of clients) {
        client.postMessage({ type: 'SHARE_TARGET', url: shareUrl })
        client.focus()
        return Response.redirect('/', 302)
      }
      return Response.redirect(`/?share_url=${encodeURIComponent(shareUrl)}`, 302)
    })()
  )
})
