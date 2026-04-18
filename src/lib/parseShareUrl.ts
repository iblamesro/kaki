import type { PlaceCategory } from '../types'

export interface ParsedPlace {
  name?: string
  address?: string
  lat?: number
  lng?: number
  category?: PlaceCategory
}

// ── Google Maps long URL ───────────────────────────────────────────────────────
// Formats :
//   /maps/place/Name/@lat,lng,zoom
//   /maps/place/Name/data=...
//   /maps/search/query/@lat,lng
function parseGoogleMapsUrl(url: URL): ParsedPlace | null {
  const path = decodeURIComponent(url.pathname)

  // Coordonnées @lat,lng
  const coordMatch = path.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  const lat = coordMatch ? parseFloat(coordMatch[1]) : undefined
  const lng = coordMatch ? parseFloat(coordMatch[2]) : undefined

  // Nom du lieu depuis /maps/place/<name>/
  const placeMatch = path.match(/\/maps\/place\/([^/]+)/)
  let name = placeMatch ? placeMatch[1].replace(/\+/g, ' ').trim() : undefined

  // Paramètre q= (maps/search?q=...)
  const q = url.searchParams.get('q')
  if (!name && q) name = q.split('@')[0].replace(/\+/g, ' ').trim()

  if (!name && !lat) return null

  return { name, lat, lng }
}

// ── Apple Maps ────────────────────────────────────────────────────────────────
// https://maps.apple.com/?q=Name&ll=lat,lng
function parseAppleMapsUrl(url: URL): ParsedPlace | null {
  const q   = url.searchParams.get('q') ?? undefined
  const ll  = url.searchParams.get('ll')
  const adr = url.searchParams.get('address') ?? undefined

  let lat: number | undefined
  let lng: number | undefined
  if (ll) {
    const parts = ll.split(',')
    lat = parseFloat(parts[0])
    lng = parseFloat(parts[1])
  }

  if (!q && !lat) return null
  return { name: q, address: adr, lat, lng }
}

// ── Détecteur principal ───────────────────────────────────────────────────────
export type UrlType = 'google-maps' | 'apple-maps' | 'instagram' | 'unknown'

export function detectUrlType(raw: string): UrlType {
  try {
    const url = new URL(raw)
    const host = url.hostname.replace('www.', '')
    if (host === 'google.com' && url.pathname.startsWith('/maps')) return 'google-maps'
    if (host === 'maps.google.com') return 'google-maps'
    if (host === 'maps.apple.com') return 'apple-maps'
    if (host === 'instagram.com') return 'instagram'
    // Short links (goo.gl, maps.app.goo.gl) → resolved by the Worker
    if (host === 'goo.gl' || host === 'maps.app.goo.gl') return 'google-maps'
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

export async function parseShareUrl(raw: string): Promise<ParsedPlace | null> {
  const trimmed = raw.trim()
  if (!trimmed) return null

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }

  const type = detectUrlType(trimmed)

  // ── Google Maps ───────────────────────────────────────────────────────────
  if (type === 'google-maps') {
    const host = url.hostname.replace('www.', '')

    // Short link → le Worker va suivre la redirection
    if (host === 'goo.gl' || host === 'maps.app.goo.gl') {
      try {
        const workerUrl = import.meta.env.VITE_PROXY_WORKER_URL ?? 'http://localhost:8787'
        const res = await fetch(`${workerUrl}?url=${encodeURIComponent(trimmed)}`)
        if (res.ok) {
          const json = await res.json() as { resolved_url?: string }
          if (json.resolved_url) return parseShareUrl(json.resolved_url)
        }
      } catch { /* fallback: renvoyer null */ }
      return null
    }

    return parseGoogleMapsUrl(url)
  }

  // ── Apple Maps ────────────────────────────────────────────────────────────
  if (type === 'apple-maps') {
    return parseAppleMapsUrl(url)
  }

  return null
}
