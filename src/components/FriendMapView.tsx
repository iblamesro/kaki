import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Place } from '../types'
import { supabase, PlaceRow, UserRow } from '../lib/supabase'
import { rowToPlace } from '../lib/places'
import { useAuth } from '../lib/auth'
import { EDEN_DEMO_ID } from '../lib/demoData'

// ── Types ─────────────────────────────────────────────────────────────────────
interface FriendPlace extends Omit<Place, 'hearted'> {
  baseLikes?: number
}

interface FriendData {
  id: string
  name: string
  handle: string
  avatarUrl: string | null
  avatarLetter: string
  bio: string
  places: FriendPlace[]
}

function placeToFriendPlace(p: Place, likeCount: number): FriendPlace {
  const { hearted: _h, ...rest } = p
  return { ...rest, baseLikes: likeCount }
}

function displayNameFromProfile(row: UserRow): string {
  if (row.username?.trim()) return row.username.trim()
  return `Utilisateur ${row.id.slice(0, 4)}`
}

function avatarLetter(row: UserRow): string {
  const u = row.username?.trim()
  if (u) return u.slice(0, 1).toUpperCase()
  return 'K'
}

async function fetchLikeAggregates(
  placeIds: string[],
  currentUserId: string | undefined,
): Promise<{ counts: Record<string, number>; mine: Set<string> }> {
  const empty = { counts: {} as Record<string, number>, mine: new Set<string>() }
  if (placeIds.length === 0) return empty
  const { data: rows, error } = await supabase.from('place_likes').select('place_id, user_id').in('place_id', placeIds)
  if (error || !rows) return empty
  const counts: Record<string, number> = {}
  for (const id of placeIds) counts[id] = 0
  const mine = new Set<string>()
  for (const r of rows as { place_id: string; user_id: string }[]) {
    counts[r.place_id] = (counts[r.place_id] ?? 0) + 1
    if (currentUserId && r.user_id === currentUserId) mine.add(r.place_id)
  }
  return { counts, mine }
}

// ── Eden demo data ─────────────────────────────────────────────────────────────
const EDEN_DEMO: FriendData = {
  id: EDEN_DEMO_ID,
  name: 'Eden',
  handle: 'eden.paris',
  avatarUrl: null,
  avatarLetter: 'E',
  bio: '✦ Bistronomie · vins naturels · Paris',
  places: [
    { id: 'eden-1', name: 'Frenchie', address: '5 Rue du Nil, 75002 Paris',
      category: 'Restaurant', lat: 48.8634, lng: 2.3481, status: 'liked', rating: 5, priceRange: 3,
      tags: ['bistronomie', 'wine bar'], description: 'Greg Marchand at his best. Réservation indispensable.',
      dateAdded: '2024-09-12', dateVisited: '2024-09-12', baseLikes: 4 },
    { id: 'eden-2', name: 'Clown Bar', address: '114 Rue Amelot, 75011 Paris',
      category: 'Bar', lat: 48.8605, lng: 2.3716, status: 'liked', rating: 4, priceRange: 2,
      tags: ['naturel', 'bistronomie'], notes: 'Vins naturels, cuisine créative. Cadre historique incroyable.',
      dateAdded: '2024-10-03', dateVisited: '2024-10-03', baseLikes: 2 },
    { id: 'eden-3', name: 'Septime', address: '80 Rue de Charonne, 75011 Paris',
      category: 'Restaurant', lat: 48.8532, lng: 2.3802, status: 'wishlist', priceRange: 4,
      tags: ['gastronomique'], description: "L'étoile du 11e. Menu dégustation à réserver 2 mois à l'avance.",
      dateAdded: '2024-11-01', baseLikes: 6 },
    { id: 'eden-4', name: 'Café de Flore', address: '172 Bd Saint-Germain, 75006 Paris',
      category: 'Café', lat: 48.8539, lng: 2.3326, status: 'liked', rating: 4, priceRange: 2,
      tags: ['classique', 'terrasse'], description: 'Institution saint-germanoise. Croissant + café = parfait.',
      dateAdded: '2024-08-20', dateVisited: '2024-08-20', baseLikes: 3 },
    { id: 'eden-5', name: 'Le Comptoir du Relais', address: "9 Carrefour de l'Odéon, 75006 Paris",
      category: 'Restaurant', lat: 48.8518, lng: 2.3382, status: 'liked', rating: 5, priceRange: 3,
      tags: ['bistrot', 'parisien'], description: 'Yves Camdeborde, le patron du bistrot moderne.',
      dateAdded: '2024-07-14', dateVisited: '2024-07-14', baseLikes: 5 },
    { id: 'eden-6', name: 'Aux Deux Amis', address: '45 Rue Oberkampf, 75011 Paris',
      category: 'Bar', lat: 48.8637, lng: 2.3737, status: 'wishlist', priceRange: 2,
      tags: ['naturel', 'tapas'], notes: "Vins naturels + petites assiettes. L'ambiance Oberkampf au top.",
      dateAdded: '2024-11-15', baseLikes: 1 },
  ],
}

// ── Map helpers ────────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  wishlist: { fill: '#F4EFE2', stroke: '#262F18' },
  liked:    { fill: '#4A7A50', stroke: '#3A5E3F' },
  disliked: { fill: '#7A3A3A', stroke: '#5E3030' },
}

function FriendMarkers({ places, onSelectRef }: {
  places: FriendPlace[]
  onSelectRef: React.MutableRefObject<(p: FriendPlace) => void>
}) {
  const map = useMap()
  const markersRef = useRef<L.Marker[]>([])

  useEffect(() => {
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    places.forEach(p => {
      const c = STATUS_COLORS[p.status]
      const icon = L.divIcon({
        html: `<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="${c.fill}" stroke="${c.stroke}" stroke-width="2"/></svg>`,
        className: 'kaki-pin', iconSize: [16, 16], iconAnchor: [8, 8],
      })
      const marker = L.marker([p.lat, p.lng], { icon }).addTo(map)
      marker.on('click', e => { L.DomEvent.stopPropagation(e); onSelectRef.current(p) })
      markersRef.current.push(marker)
    })
    if (places.length > 0) {
      const bounds = L.latLngBounds(places.map(p => [p.lat, p.lng]))
      map.fitBounds(bounds, { padding: [50, 50] })
    } else {
      map.setView([48.8566, 2.3522], 13)
    }
    return () => { markersRef.current.forEach(m => m.remove()); markersRef.current = [] }
  }, [places, map, onSelectRef])

  return null
}

const EMPTY_PLACES: FriendPlace[] = []

const CAT_EMOJI: Record<string, string> = {
  Restaurant: '🍽', Café: '☕', Bar: '🍷', Boutique: '🛍', Activité: '✦', Autre: '◎',
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  liked:    { label: 'Aimé',     color: 'var(--liked)'    },
  wishlist: { label: 'À tester', color: 'var(--accent)'   },
  disliked: { label: 'Bof',      color: 'var(--disliked)' },
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  initialUserId?: string
  onBack: () => void
  onAddToMyList: (place: FriendPlace) => void
}

export default function FriendMapView({ initialUserId, onBack, onAddToMyList }: Props) {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [friend, setFriend] = useState<FriendData | null>(null)
  const [selected, setSelected] = useState<FriendPlace | null>(null)
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [suggestions, setSuggestions] = useState<UserRow[]>([])
  const [loadingFriend, setLoadingFriend] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)

  const onSelectRef = useRef<(p: FriendPlace) => void>(() => {})
  onSelectRef.current = useCallback((p: FriendPlace) => setSelected(p), [])

  const currentPlaces = friend ? friend.places : EMPTY_PLACES
  const likedCount = friend?.places.filter(p => p.status === 'liked').length ?? 0
  const wishlistCount = friend?.places.filter(p => p.status === 'wishlist').length ?? 0

  const loadFriendById = useCallback(async (userId: string) => {
    setLoadingFriend(true)
    setLoadError(null)
    setSelected(null)

    // Demo mode — Eden
    if (userId === EDEN_DEMO_ID) {
      await new Promise(r => setTimeout(r, 400))
      setFriend(EDEN_DEMO)
      setQuery('eden.paris')
      setLiked(new Set())
      setLoadingFriend(false)
      return
    }

    const [{ data: profile, error: pe }, { data: placeRows, error: ple }] = await Promise.all([
      supabase.from('users').select('id, username, avatar_url').eq('id', userId).maybeSingle(),
      supabase.from('places').select('*').eq('user_id', userId).order('date_added', { ascending: false }),
    ])

    if (pe) { setLoadError(pe.message); setFriend(null); setLoadingFriend(false); return }
    if (!profile) { setLoadError('Profil introuvable'); setFriend(null); setLoadingFriend(false); return }
    if (ple) { setLoadError(ple.message); setFriend(null); setLoadingFriend(false); return }

    const rows = (placeRows ?? []) as PlaceRow[]
    const ids = rows.map(r => r.id)
    const { counts, mine } = await fetchLikeAggregates(ids, user?.id)

    const places: FriendPlace[] = rows.map(r => placeToFriendPlace(rowToPlace(r), counts[r.id] ?? 0))

    const prof = profile as UserRow
    setFriend({
      id: prof.id,
      name: displayNameFromProfile(prof),
      handle: prof.username?.trim() || prof.id.slice(0, 8),
      avatarUrl: prof.avatar_url?.trim() || null,
      avatarLetter: avatarLetter(prof),
      bio: 'Sur Kaki',
      places,
    })
    setQuery(displayNameFromProfile(prof))
    setLiked(new Set([...mine].filter(id => ids.includes(id))))
    setLoadingFriend(false)
  }, [user?.id])

  useEffect(() => {
    if (!initialUserId) return
    void loadFriendById(initialUserId)
  }, [initialUserId, loadFriendById])

  useEffect(() => {
    if (!user?.id || query.length < 2 || friend) { setSuggestions([]); return }
    const t = window.setTimeout(() => {
      void (async () => {
        setSearching(true)
        const q = `%${query.trim()}%`
        const { data, error } = await supabase
          .from('users').select('id, username, avatar_url')
          .neq('id', user.id).not('username', 'is', null).ilike('username', q).limit(12)
        if (!error && data) setSuggestions(data as UserRow[])
        else setSuggestions([])
        setSearching(false)
      })()
    }, 280)
    return () => window.clearTimeout(t)
  }, [query, user?.id, friend])

  const handleAdd = (place: FriendPlace) => {
    onAddToMyList(place)
    setAdded(prev => new Set([...prev, place.id]))
  }

  const toggleLike = async (placeId: string) => {
    if (!user || friend?.id === EDEN_DEMO_ID) return
    const isOn = liked.has(placeId)
    if (isOn) {
      const { error } = await supabase.from('place_likes').delete().eq('place_id', placeId).eq('user_id', user.id)
      if (error) return
      setLiked(prev => { const n = new Set(prev); n.delete(placeId); return n })
      setFriend(prev => prev ? { ...prev, places: prev.places.map(p => p.id === placeId ? { ...p, baseLikes: Math.max(0, (p.baseLikes ?? 0) - 1) } : p) } : prev)
    } else {
      const { error } = await supabase.from('place_likes').insert({ place_id: placeId, user_id: user.id })
      if (error) return
      setLiked(prev => new Set([...prev, placeId]))
      setFriend(prev => prev ? { ...prev, places: prev.places.map(p => p.id === placeId ? { ...p, baseLikes: (p.baseLikes ?? 0) + 1 } : p) } : prev)
    }
  }

  const openItinerary = (place: FriendPlace) => {
    window.open(`https://www.google.com/maps/dir//${encodeURIComponent(place.address)}`, '_blank')
  }

  const suggestionList = useMemo(() => suggestions, [suggestions])
  const showEdenSuggestion = !friend && query.length < 2 && !loadingFriend

  return (
    <div style={{ height: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <div style={{ background: 'rgba(13,14,11,0.95)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)', flexShrink: 0, zIndex: 10 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px 10px' }}>
          <button onClick={onBack} className="font-ui"
            style={{ fontSize: '11px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
            ←
          </button>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); if (friend) { setFriend(null); setSelected(null) } }}
              placeholder="Pseudo d'un ami…"
              disabled={loadingFriend}
              style={{ width: '100%', background: 'var(--surface-3)', border: 'none', borderRadius: '10px',
                color: 'var(--cream)', padding: '8px 12px 8px 30px',
                fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', fontSize: '13px', outline: 'none' }}
            />
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
              color: 'var(--muted)', fontSize: '13px', pointerEvents: 'none' }}>⌕</span>

            {/* Eden suggestion quand aucun query */}
            <AnimatePresence>
              {showEdenSuggestion && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 200,
                    background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: '12px',
                    overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.55)' }}>
                  <p className="font-ui" style={{ padding: '8px 14px 4px', fontSize: '9px', letterSpacing: '0.14em',
                    color: 'var(--muted)', textTransform: 'uppercase' }}>Suggestion</p>
                  <button onClick={() => void loadFriendById(EDEN_DEMO_ID)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 14px 12px', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #8a9c1e, #5a6e10)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span className="font-ui font-semibold" style={{ fontSize: '13px', color: '#fff' }}>E</span>
                    </div>
                    <div style={{ textAlign: 'left', flex: 1 }}>
                      <p className="font-ui font-medium" style={{ fontSize: '13px', color: 'var(--cream)' }}>Eden</p>
                      <p className="font-ui" style={{ fontSize: '10px', color: 'var(--muted)' }}>@eden.paris · démo</p>
                    </div>
                    <span className="font-ui" style={{ fontSize: '10px', color: 'var(--muted)' }}>Voir →</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Résultats de recherche réels */}
            <AnimatePresence>
              {suggestionList.length > 0 && !friend && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 200,
                    background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: '12px',
                    overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.55)' }}>
                  {suggestionList.map((row, i) => (
                    <button key={row.id} onClick={() => void loadFriendById(row.id)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer',
                        borderBottom: i < suggestionList.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--kaki)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                        {row.avatar_url
                          ? <img src={row.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span className="font-ui font-medium" style={{ fontSize: '13px', color: '#fff' }}>{avatarLetter(row)}</span>}
                      </div>
                      <div style={{ textAlign: 'left', flex: 1 }}>
                        <p className="font-ui font-medium" style={{ fontSize: '13px', color: 'var(--cream)' }}>{displayNameFromProfile(row)}</p>
                        <p className="font-ui" style={{ fontSize: '10px', color: 'var(--muted)' }}>@{row.username}</p>
                      </div>
                      <span className="font-ui" style={{ fontSize: '10px', color: 'var(--muted)' }}>Voir →</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            {searching && !friend && query.length >= 2 && (
              <p className="font-ui" style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 8, fontSize: '10px', color: 'var(--muted)' }}>
                Recherche…
              </p>
            )}
          </div>
        </div>

        <AnimatePresence>
          {friend && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '2px 16px 14px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%',
                  background: friend.id === EDEN_DEMO_ID ? 'linear-gradient(135deg,#8a9c1e,#5a6e10)' : 'var(--kaki)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  boxShadow: '0 0 0 2px rgba(138,156,30,0.3)', overflow: 'hidden' }}>
                  {friend.avatarUrl
                    ? <img src={friend.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span className="font-ui font-medium" style={{ fontSize: '15px', color: '#fff' }}>{friend.avatarLetter}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="font-ui font-semibold" style={{ fontSize: '13px', color: 'var(--cream)', marginBottom: '2px' }}>
                    {friend.name}
                    <span style={{ color: 'var(--muted)', fontWeight: 400, marginLeft: '6px', fontSize: '11px' }}>@{friend.handle}</span>
                  </p>
                  <p className="font-ui" style={{ fontSize: '11px', color: 'var(--muted)' }}>{friend.bio}</p>
                </div>
                <div style={{ display: 'flex', gap: '14px', flexShrink: 0 }}>
                  <div style={{ textAlign: 'center' }}>
                    <p className="font-ui font-semibold" style={{ fontSize: '13px', color: 'var(--liked)', lineHeight: 1 }}>{likedCount}</p>
                    <p className="font-ui" style={{ fontSize: '9px', color: 'var(--muted)', marginTop: '2px' }}>aimés</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p className="font-ui font-semibold" style={{ fontSize: '13px', color: 'var(--accent)', lineHeight: 1 }}>{wishlistCount}</p>
                    <p className="font-ui" style={{ fontSize: '9px', color: 'var(--muted)', marginTop: '2px' }}>wishlist</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loadError && (
          <p className="font-ui" style={{ padding: '0 16px 12px', fontSize: '11px', color: '#c97a7a' }}>{loadError}</p>
        )}
      </div>

      {/* ── Map ── */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer center={[48.8566, 2.3522]} zoom={13}
          style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            maxZoom={19}
          />
          <FriendMarkers places={currentPlaces} onSelectRef={onSelectRef} />
        </MapContainer>

        {!friend && !loadingFriend && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '10px', background: 'rgba(13,14,11,0.78)' }}>
            <p style={{ fontSize: '26px', opacity: 0.3 }}>◎</p>
            <p className="font-ui" style={{ fontSize: '13px', color: 'var(--muted)' }}>Cherche un ami par pseudo</p>
          </div>
        )}

        {loadingFriend && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(13,14,11,0.55)' }}>
            <p className="font-ui" style={{ fontSize: '12px', color: 'var(--muted)' }}>Chargement…</p>
          </div>
        )}

        <AnimatePresence>
          {selected && (
            <motion.div key={selected.id}
              initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}
              transition={{ type: 'spring', damping: 32, stiffness: 340 }}
              style={{ position: 'absolute', zIndex: 20,
                bottom: friend ? '168px' : '20px',
                left: '50%', transform: 'translateX(-50%)',
                width: 'min(300px, calc(100% - 28px))',
                background: 'rgba(20,21,18,0.97)', backdropFilter: 'blur(20px)',
                borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.65)', overflow: 'hidden' }}>

              {selected.coverPhoto && (
                <div style={{ height: '80px', position: 'relative', overflow: 'hidden' }}>
                  <img src={selected.coverPhoto} alt={selected.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 20%, rgba(20,21,18,0.97) 100%)' }} />
                  <button onClick={() => setSelected(null)}
                    style={{ position: 'absolute', top: '8px', right: '8px', width: '24px', height: '24px',
                      borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none',
                      color: 'rgba(255,255,255,0.6)', fontSize: '13px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>
              )}

              <div style={{ padding: selected.coverPhoto ? '6px 14px 0' : '12px 14px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="font-display font-medium"
                    style={{ fontSize: '1rem', color: 'var(--cream)', fontStyle: 'italic', lineHeight: 1.2, marginBottom: '3px' }}>
                    {selected.name}
                  </p>
                  <p className="font-ui" style={{ fontSize: '11px', color: 'var(--muted)' }}>
                    <span style={{ color: STATUS_LABEL[selected.status].color }}>{STATUS_LABEL[selected.status].label}</span>
                    <span style={{ opacity: 0.35, margin: '0 5px' }}>·</span>
                    {CAT_EMOJI[selected.category]} {selected.category}
                    {selected.priceRange && <><span style={{ opacity: 0.35, margin: '0 5px' }}>·</span>{'€'.repeat(selected.priceRange)}</>}
                    {selected.rating && <><span style={{ opacity: 0.35, margin: '0 5px' }}>·</span><span style={{ color: 'rgba(244,220,120,0.8)' }}>{'★'.repeat(selected.rating)}</span></>}
                  </p>
                </div>
                {!selected.coverPhoto && (
                  <button onClick={() => setSelected(null)}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '16px', cursor: 'pointer', flexShrink: 0 }}>×</button>
                )}
              </div>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '10px 14px 0' }} />

              <div style={{ display: 'flex', gap: '6px', padding: '8px 10px 12px' }}>
                <button type="button" onClick={() => void toggleLike(selected.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '34px',
                    padding: '0 10px', borderRadius: '8px', border: 'none',
                    cursor: friend?.id === EDEN_DEMO_ID ? 'default' : 'pointer',
                    background: liked.has(selected.id) ? 'rgba(224,92,106,0.15)' : 'rgba(255,255,255,0.06)',
                    color: liked.has(selected.id) ? '#e05c6a' : 'rgba(255,255,255,0.35)',
                    fontSize: '13px', flexShrink: 0, transition: 'all 0.15s' }}>
                  {liked.has(selected.id) ? '♥' : '♡'}
                  <span className="font-ui" style={{ fontSize: '10px' }}>{selected.baseLikes ?? 0}</span>
                </button>

                {added.has(selected.id) ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '34px',
                    padding: '0 10px', borderRadius: '8px',
                    background: 'rgba(38,128,66,0.15)', color: 'var(--liked)', fontSize: '11px', flexShrink: 0 }}>
                    <span className="font-ui font-medium">✓ Ajouté</span>
                  </div>
                ) : (
                  <button type="button" onClick={() => handleAdd(selected)} className="font-ui font-medium"
                    style={{ flex: 1, height: '34px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)',
                      fontSize: '11px', letterSpacing: '0.03em', transition: 'all 0.15s' }}>
                    + Ma liste
                  </button>
                )}

                <button type="button" onClick={() => openItinerary(selected)} className="font-ui font-medium"
                  style={{ flex: 1, height: '34px', borderRadius: '8px', cursor: 'pointer',
                    background: 'var(--cream)', color: 'var(--bg)', border: 'none', fontSize: '11px', letterSpacing: '0.03em' }}>
                  📍 Itinéraire
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {friend && (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 15 }}>
              <div style={{ background: 'linear-gradient(to top, rgba(13,14,11,0.97) 60%, transparent)', padding: '28px 0 0' }}>
                <div style={{ display: 'flex', gap: '10px', padding: '0 16px 20px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                  {friend.places.map(place => {
                    const sl = STATUS_LABEL[place.status]
                    const isLiked = liked.has(place.id)
                    return (
                      <button key={place.id} type="button"
                        onClick={() => setSelected(selected?.id === place.id ? null : place)}
                        style={{ flexShrink: 0, width: '110px', background: 'rgba(22,23,20,0.96)',
                          border: `1px solid ${selected?.id === place.id ? 'rgba(138,156,30,0.6)' : 'rgba(255,255,255,0.07)'}`,
                          borderRadius: '14px', overflow: 'hidden', cursor: 'pointer', padding: 0, textAlign: 'left',
                          transition: 'border-color 0.15s' }}>
                        {place.coverPhoto ? (
                          <div style={{ height: '60px', overflow: 'hidden' }}>
                            <img src={place.coverPhoto} alt={place.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ) : (
                          <div style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(255,255,255,0.04)', fontSize: '18px', opacity: 0.35 }}>
                            {CAT_EMOJI[place.category]}
                          </div>
                        )}
                        <div style={{ padding: '7px 9px 9px' }}>
                          <p className="font-display font-medium"
                            style={{ fontSize: '0.78rem', color: 'var(--cream)', fontStyle: 'italic',
                              lineHeight: 1.2, marginBottom: '4px',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {place.name}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span className="font-ui" style={{ fontSize: '9px', color: sl.color }}>{sl.label}</span>
                            <button type="button" onClick={e => { e.stopPropagation(); void toggleLike(place.id) }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                                display: 'flex', alignItems: 'center', gap: '2px',
                                color: isLiked ? '#e05c6a' : 'rgba(255,255,255,0.2)', fontSize: '11px' }}>
                              {isLiked ? '♥' : '♡'}
                              <span className="font-ui" style={{ fontSize: '8px' }}>{place.baseLikes ?? 0}</span>
                            </button>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
