import { useState, useEffect, useCallback } from 'react'
import { Place, PlaceStatus } from './types'
import { supabase, PlaceRow } from './lib/supabase'
import { rowToPlace } from './lib/places'
import { useAuth } from './lib/auth'
import { v4 as uuidv4 } from 'uuid'

async function addPoints(userId: string, pts: number) {
  await supabase.rpc('increment_reward_points', { p_user_id: userId, p_points: pts })
}

type NewPlace = Omit<Place, 'id' | 'status' | 'dateAdded' | 'dateVisited'>
type PlaceUpdate = Partial<Omit<Place, 'id' | 'status' | 'dateAdded'>>

function placeToRow(place: Place, userId: string): PlaceRow {
  return {
    id:            place.id,
    user_id:       userId,
    name:          place.name,
    address:       place.address,
    category:      place.category,
    lat:           place.lat,
    lng:           place.lng,
    status:        place.status,
    rating:        place.rating,
    price_range:   place.priceRange,
    tags:          place.tags,
    cover_photo:   place.coverPhoto,
    notes:         place.notes,
    description:   place.description,
    liked_aspects: place.likedAspects,
    ordered_items: place.orderedItems,
    instagram_url: place.instagram,
    hearted:       place.hearted ?? false,
    date_added:    place.dateAdded,
    date_visited:  place.dateVisited,
  }
}

// ── Demo places (insérées au premier login) ───────────────────────────────────
function buildDemos(userId: string): PlaceRow[] {
  return [
    {
      id: uuidv4(), user_id: userId,
      name: 'Em Sherif', address: '4 Rue de Marignan, 75008 Paris',
      category: 'Restaurant', lat: 48.8709, lng: 2.3072,
      status: 'liked', rating: 5, price_range: 4,
      cover_photo: '/emsherif.jpg',
      description: 'La grande table libanaise de Paris. Mezze d\'exception, manakish dorés, kibbeh aux amandes.',
      tags: ['libanais', 'mezze', 'gastronomique'],
      hearted: false, date_added: new Date().toISOString(), date_visited: new Date().toISOString(),
    },
    {
      id: uuidv4(), user_id: userId,
      name: 'Hando', address: '6 Rue du Faubourg Montmartre, 75009 Paris',
      category: 'Restaurant', lat: 48.8742, lng: 2.3453,
      status: 'liked', rating: 5, price_range: 3,
      cover_photo: '/hando.jpg',
      description: 'Wagyu en nigiri servi au comptoir, champagne Moët en accord. Entre Paris et Tokyo.',
      tags: ['japonais', 'wagyu', 'comptoir', 'sushi'],
      hearted: false, date_added: new Date().toISOString(), date_visited: new Date().toISOString(),
    },
    {
      id: uuidv4(), user_id: userId,
      name: 'Spécimen', address: '10 Rue Bichat, 75010 Paris',
      category: 'Restaurant', lat: 48.8699, lng: 2.3622,
      status: 'wishlist', rating: 4, price_range: 2,
      cover_photo: '/specimen.jpg',
      description: 'Le burger parisien qui mérite son nom. Pain brioché, viande maturée, frites maison.',
      tags: ['burger', 'casual', 'déjeuner'],
      hearted: false, date_added: new Date().toISOString(),
    },
  ]
}

// ── Hook principal ────────────────────────────────────────────────────────────
export function usePlaces() {
  const { user } = useAuth()
  const [places,  setPlaces]  = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  // ── Chargement initial + seed si premier login ─────────────────────────────
  useEffect(() => {
    if (!user) {
      setPlaces([])
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('places')
        .select('*')
        .eq('user_id', user!.id)
        .order('date_added', { ascending: false })

      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message)
        setLoading(false)
        return
      }

      // Premier login → seed 3 démos
      if ((data ?? []).length === 0) {
        const demos = buildDemos(user!.id)
        const { error: insertError } = await supabase.from('places').insert(demos)
        if (!cancelled && !insertError) {
          setPlaces(demos.map(rowToPlace))
        }
      } else {
        setPlaces((data as PlaceRow[]).map(rowToPlace))
      }

      if (!cancelled) setLoading(false)
    }

    load()

    return () => { cancelled = true }
  }, [user?.id])

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`places:${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'places',
        filter: `user_id=eq.${user.id}`,
      }, payload => {
        if (payload.eventType === 'INSERT') {
          setPlaces(prev => [rowToPlace(payload.new as PlaceRow), ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setPlaces(prev => prev.map(p => p.id === (payload.new as PlaceRow).id ? rowToPlace(payload.new as PlaceRow) : p))
        } else if (payload.eventType === 'DELETE') {
          setPlaces(prev => prev.filter(p => p.id !== (payload.old as PlaceRow).id))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const addPlace = useCallback(async (data: NewPlace): Promise<Place> => {
    const newPlace: Place = {
      ...data,
      id: uuidv4(),
      status: 'wishlist',
      dateAdded: new Date().toISOString(),
    }

    if (user) {
      const { error } = await supabase.from('places').insert(placeToRow(newPlace, user.id))
      if (error) setError(error.message)
      else void addPoints(user.id, 5) // +5 pts : ajouter un lieu
    } else {
      setPlaces(prev => [newPlace, ...prev])
    }

    return newPlace
  }, [user])

  const updatePlace = useCallback(async (id: string, data: PlaceUpdate) => {
    setPlaces(prev => prev.map(p => p.id === id ? { ...p, ...data } : p))

    if (user) {
      // Convertit uniquement les champs modifiés en snake_case
      const patch: Partial<PlaceRow> = {}
      if (data.name        !== undefined) patch.name         = data.name
      if (data.address     !== undefined) patch.address      = data.address
      if (data.category    !== undefined) patch.category     = data.category
      if (data.lat         !== undefined) patch.lat          = data.lat
      if (data.lng         !== undefined) patch.lng          = data.lng
      if (data.rating      !== undefined) patch.rating       = data.rating
      if (data.priceRange  !== undefined) patch.price_range  = data.priceRange
      if (data.tags        !== undefined) patch.tags         = data.tags
      if (data.coverPhoto  !== undefined) patch.cover_photo  = data.coverPhoto
      if (data.notes       !== undefined) patch.notes        = data.notes
      if (data.description !== undefined) patch.description  = data.description
      if (data.likedAspects !== undefined) patch.liked_aspects = data.likedAspects
      if (data.orderedItems !== undefined) patch.ordered_items = data.orderedItems
      if (data.instagram   !== undefined) patch.instagram_url = data.instagram
      if (data.hearted     !== undefined) patch.hearted      = data.hearted
      if (data.dateVisited !== undefined) patch.date_visited = data.dateVisited

      const { error } = await supabase.from('places').update(patch).eq('id', id).eq('user_id', user.id)
      if (error) setError(error.message)
      // +2 pts si l'utilisateur enrichit une fiche (notes ou description)
      else if (data.notes !== undefined || data.description !== undefined) void addPoints(user.id, 2)
    }
  }, [user])

  const updateStatus = useCallback(async (id: string, status: PlaceStatus) => {
    const dateVisited = status !== 'wishlist' ? new Date().toISOString() : undefined

    setPlaces(prev =>
      prev.map(p => p.id === id
        ? { ...p, status, dateVisited: dateVisited ?? p.dateVisited }
        : p,
      ),
    )

    if (user) {
      const patch: Partial<PlaceRow> = { status }
      if (dateVisited) patch.date_visited = dateVisited
      const { error } = await supabase.from('places').update(patch).eq('id', id).eq('user_id', user.id)
      if (error) setError(error.message)
      else if (status !== 'wishlist') void addPoints(user.id, 3) // +3 pts : évaluer
    }
  }, [user])

  const removePlace = useCallback(async (id: string) => {
    setPlaces(prev => prev.filter(p => p.id !== id))

    if (user) {
      const { error } = await supabase.from('places').delete().eq('id', id).eq('user_id', user.id)
      if (error) setError(error.message)
    }
  }, [user])

  return { places, addPlace, updatePlace, updateStatus, removePlace, loading, error }
}
