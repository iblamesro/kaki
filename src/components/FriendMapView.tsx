import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useEffect, useRef } from 'react'
import { Place } from '../types'

// ── Fake friend data ───────────────────────────────────────────────────────────
interface FriendData {
  name: string
  handle: string
  avatar: string
  places: Omit<Place, 'hearted'>[]
}

const FRIENDS: Record<string, FriendData> = {
  eden: {
    name: 'Eden',
    handle: 'eden',
    avatar: 'E',
    places: [
      { id: 'f-eden-1', name: 'Septime', address: '80 Rue de Charonne, 75011 Paris', category: 'Restaurant', lat: 48.8537, lng: 2.3769, status: 'liked', dateAdded: '2025-01-10T19:00:00Z', rating: 5, tags: ['bistronomique', 'gastronomique'], coverPhoto: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=70' },
      { id: 'f-eden-2', name: 'Frenchie', address: '5 Rue du Nil, 75002 Paris', category: 'Restaurant', lat: 48.8646, lng: 2.3481, status: 'liked', dateAdded: '2025-02-05T20:00:00Z', rating: 4, tags: ['néo-bistrot'], coverPhoto: 'https://images.unsplash.com/photo-1559339352-11d035aa65ce?w=400&q=70' },
      { id: 'f-eden-3', name: 'Café de Flore', address: '172 Bd Saint-Germain, 75006 Paris', category: 'Café', lat: 48.8540, lng: 2.3330, status: 'liked', dateAdded: '2025-01-20T10:00:00Z', rating: 4, tags: ['historique', 'café'], coverPhoto: 'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=400&q=70' },
      { id: 'f-eden-4', name: 'Clown Bar', address: '114 Rue Amelot, 75011 Paris', category: 'Bar', lat: 48.8643, lng: 2.3726, status: 'wishlist', dateAdded: '2025-03-01T18:00:00Z', tags: ['bar', 'naturel'] },
      { id: 'f-eden-5', name: 'Le Grand Véfour', address: '17 Rue de Beaujolais, 75001 Paris', category: 'Restaurant', lat: 48.8637, lng: 2.3370, status: 'wishlist', dateAdded: '2025-03-15T12:00:00Z', tags: ['gastronomique', 'historique'], coverPhoto: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=70' },
    ],
  },
  chloe: {
    name: 'Chloé',
    handle: 'chloe',
    avatar: 'C',
    places: [
      { id: 'f-chloe-1', name: 'Maison Kitsuné Café', address: '52 Rue de Richelieu, 75001 Paris', category: 'Café', lat: 48.8644, lng: 2.3372, status: 'liked', dateAdded: '2025-02-14T09:00:00Z', rating: 5, tags: ['café', 'design'] },
      { id: 'f-chloe-2', name: 'Substance', address: '18 Rue de Chaillot, 75016 Paris', category: 'Restaurant', lat: 48.8678, lng: 2.2989, status: 'liked', dateAdded: '2025-01-28T19:30:00Z', rating: 5, tags: ['gastronomique', 'chic'] },
      { id: 'f-chloe-3', name: 'Le Mary Celeste', address: '1 Rue Commines, 75003 Paris', category: 'Bar', lat: 48.8613, lng: 2.3611, status: 'liked', dateAdded: '2025-03-05T21:00:00Z', rating: 4, tags: ['cocktails', 'naturel'] },
      { id: 'f-chloe-4', name: 'Ober Mamma', address: '107 Bd Richard-Lenoir, 75011 Paris', category: 'Restaurant', lat: 48.8628, lng: 2.3707, status: 'disliked', dateAdded: '2025-02-20T19:00:00Z', tags: ['italien'] },
    ],
  },
}

const STATUS_COLORS = {
  wishlist: { fill: '#F4EFE2', stroke: '#262F18' },
  liked:    { fill: '#4A7A50', stroke: '#3A5E3F' },
  disliked: { fill: '#7A3A3A', stroke: '#5E3030' },
}

function FriendMarkers({ places }: { places: FriendData['places'] }) {
  const map = useMap()
  const ref  = useRef<L.Marker[]>([])

  useEffect(() => {
    ref.current.forEach(m => m.remove())
    ref.current = []
    places.forEach(p => {
      const c = STATUS_COLORS[p.status]
      const icon = L.divIcon({
        html: `<svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.5" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.5"/></svg>`,
        className: 'kaki-pin', iconSize: [14, 14], iconAnchor: [7, 7],
      })
      const m = L.marker([p.lat, p.lng], { icon }).addTo(map)
      ref.current.push(m)
    })
    if (places.length > 0) {
      const bounds = L.latLngBounds(places.map(p => [p.lat, p.lng]))
      map.fitBounds(bounds, { padding: [40, 40] })
    }
    return () => { ref.current.forEach(m => m.remove()); ref.current = [] }
  }, [places, map])

  return null
}

interface Props {
  onBack: () => void
  onAddToMyList: (place: Omit<Place, 'hearted'>) => void
}

export default function FriendMapView({ onBack, onAddToMyList }: Props) {
  const [query,    setQuery]    = useState('')
  const [friend,   setFriend]   = useState<FriendData | null>(null)
  const [selected, setSelected] = useState<FriendData['places'][0] | null>(null)
  const [added,    setAdded]    = useState<Set<string>>(new Set())

  const suggestions = query.length >= 2
    ? Object.values(FRIENDS).filter(f =>
        f.name.toLowerCase().includes(query.toLowerCase()) ||
        f.handle.toLowerCase().includes(query.toLowerCase()))
    : []

  const handleAdd = (place: FriendData['places'][0]) => {
    onAddToMyList(place)
    setAdded(prev => new Set([...prev, place.id]))
  }

  return (
    <div style={{ height: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: 'rgba(13,14,11,0.92)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)', padding: '12px 18px', flexShrink: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={onBack} className="font-ui"
            style={{ fontSize: '11px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
            ←
          </button>

          {/* Search */}
          <div style={{ flex: 1, position: 'relative' }}>
            <input value={query} onChange={e => { setQuery(e.target.value); setFriend(null) }}
              placeholder="Chercher un ami…"
              style={{ width: '100%', background: 'var(--surface-3)', border: 'none', borderRadius: '10px',
                color: 'var(--cream)', padding: '9px 12px 9px 32px',
                fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', fontSize: '14px', outline: 'none' }} />
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '14px', pointerEvents: 'none' }}>⌕</span>

            {/* Suggestions dropdown */}
            <AnimatePresence>
              {suggestions.length > 0 && !friend && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '6px', zIndex: 100,
                    background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: '12px',
                    overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                  {suggestions.map(f => (
                    <button key={f.handle} onClick={() => { setFriend(f); setQuery(f.name); setSelected(null) }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
                        borderBottom: '1px solid var(--border)' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--kaki)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className="font-ui font-medium" style={{ fontSize: '13px', color: '#fff' }}>{f.avatar}</span>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <p className="font-ui font-medium" style={{ fontSize: '13px', color: 'var(--cream)' }}>{f.name}</p>
                        <p className="font-ui" style={{ fontSize: '10px', color: 'var(--muted)' }}>{f.places.length} adresses</p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {friend && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--kaki)',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="font-ui font-medium" style={{ fontSize: '11px', color: '#fff' }}>{friend.avatar}</span>
              </div>
              <span className="font-ui font-medium" style={{ fontSize: '12px', color: 'var(--cream)' }}>{friend.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        {friend ? (
          <MapContainer center={[48.8566, 2.3522]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
            <TileLayer
              attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              maxZoom={19}
            />
            <FriendMarkers places={friend.places} />
          </MapContainer>
        ) : (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <p style={{ fontSize: '32px', opacity: 0.2 }}>👤</p>
            <p className="font-ui" style={{ fontSize: '13px', color: 'var(--muted)' }}>
              Recherche un ami pour voir sa carte
            </p>
            <p className="font-ui" style={{ fontSize: '11px', color: 'var(--border-2)' }}>
              Essaie "Eden" ou "Chloé"
            </p>
          </div>
        )}

        {/* Friend's place list */}
        {friend && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
            background: 'linear-gradient(to top, var(--bg) 60%, transparent)',
            padding: '20px 0 0', pointerEvents: 'none' }}>
            <div style={{ display: 'flex', gap: '10px', padding: '0 16px 20px', overflowX: 'auto', scrollbarWidth: 'none', pointerEvents: 'all' }}>
              {friend.places.map(place => (
                <button key={place.id} onClick={() => setSelected(place)}
                  style={{ flexShrink: 0, width: '130px', background: 'var(--surface)',
                    border: `1px solid ${selected?.id === place.id ? 'var(--kaki)' : 'var(--border-2)'}`,
                    borderRadius: '14px', overflow: 'hidden', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                  {place.coverPhoto && (
                    <div style={{ height: '70px', overflow: 'hidden' }}>
                      <img src={place.coverPhoto} alt={place.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{ padding: '8px 10px' }}>
                    <p className="font-display font-medium" style={{ fontSize: '0.82rem', color: 'var(--cream)', fontStyle: 'italic', lineHeight: 1.2, marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {place.name}
                    </p>
                    {added.has(place.id) ? (
                      <p className="font-ui" style={{ fontSize: '10px', color: 'var(--liked)' }}>✓ Ajouté</p>
                    ) : (
                      <button onClick={e => { e.stopPropagation(); handleAdd(place) }} className="font-ui"
                        style={{ fontSize: '10px', color: 'var(--kaki-light)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, letterSpacing: '0.04em' }}>
                        + Ma liste
                      </button>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
