import { useState, useEffect } from 'react'
import { Place, PlaceStatus } from './types'
import { v4 as uuidv4 } from 'uuid'

const STORAGE_KEY    = 'kaki-places'
const STORAGE_VERSION = 'v6'
const VERSION_KEY    = 'kaki-version'

// IDs des anciens restaurants démo à purger
const OLD_IDS = new Set(['demo-1','demo-2','demo-3','demo-4','demo-5','demo-6'])

type NewPlace = Omit<Place, 'id' | 'status' | 'dateAdded' | 'dateVisited'>
type PlaceUpdate = Partial<Omit<Place, 'id' | 'status' | 'dateAdded'>>

// ── Vos adresses ──────────────────────────────────────────────────────────────
const DEMO: Place[] = [
  {
    id: 'place-emsherif',
    name: 'Em Sherif',
    address: '4 Rue de Marignan, 75008 Paris',
    category: 'Restaurant',
    lat: 48.8709, lng: 2.3072,
    status: 'liked',
    dateAdded: '2025-03-10T19:00:00Z',
    dateVisited: '2025-03-10T19:00:00Z',
    description: 'La grande table libanaise de Paris. Mezze d\'exception, manakish dorés, kibbeh aux amandes — une générosité rare dans un cadre raffiné.',
    tags: ['libanais', 'mezze', 'gastronomique'],
    rating: 5,
  },
  {
    id: 'place-hando',
    name: 'Hando',
    address: '6 Rue du Faubourg Montmartre, 75009 Paris',
    category: 'Restaurant',
    lat: 48.8742, lng: 2.3453,
    status: 'liked',
    dateAdded: '2025-03-22T20:00:00Z',
    dateVisited: '2025-03-22T20:00:00Z',
    description: 'Collaboration Parisien Mangolia x Mira Mikati. Wagyu en nigiri servi au comptoir, champagne Moët en accord. Entre Paris et Tokyo.',
    tags: ['japonais', 'wagyu', 'comptoir', 'sushi'],
    rating: 5,
  },
  {
    id: 'place-specimen',
    name: 'Spécimen',
    address: '10 Rue Bichat, 75010 Paris',
    category: 'Restaurant',
    lat: 48.8699, lng: 2.3622,
    status: 'liked',
    dateAdded: '2025-04-05T13:00:00Z',
    dateVisited: '2025-04-05T13:00:00Z',
    description: 'Le burger parisien qui mérite son nom. Pain brioché, viande maturée, frites maison. Casual mais soigné.',
    tags: ['burger', 'casual', 'déjeuner'],
    rating: 4,
  },
]

// ── Hook ──────────────────────────────────────────────────────────────────────
export function usePlaces() {
  const [places, setPlaces] = useState<Place[]>(() => {
    try {
      const version = localStorage.getItem(VERSION_KEY)
      const stored  = localStorage.getItem(STORAGE_KEY)
      const parsed: Place[] = stored ? JSON.parse(stored) : []

      // Reset si mauvaise version OU si les vieilles données sont encore là
      const hasOldData = parsed.some(p => OLD_IDS.has(p.id))
      if (version !== STORAGE_VERSION || hasOldData || parsed.length === 0) {
        localStorage.setItem(VERSION_KEY, STORAGE_VERSION)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO))
        return DEMO
      }
      return parsed
    } catch {
      return DEMO
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(places))
  }, [places])

  const addPlace = (data: NewPlace): Place => {
    const newPlace: Place = {
      ...data,
      id: uuidv4(),
      status: 'wishlist',
      dateAdded: new Date().toISOString(),
    }
    setPlaces(prev => [newPlace, ...prev])
    return newPlace
  }

  const updatePlace = (id: string, data: PlaceUpdate) => {
    setPlaces(prev => prev.map(p => p.id === id ? { ...p, ...data } : p))
  }

  const updateStatus = (id: string, status: PlaceStatus) => {
    setPlaces(prev =>
      prev.map(p =>
        p.id === id
          ? { ...p, status, dateVisited: status !== 'wishlist' ? new Date().toISOString() : p.dateVisited }
          : p,
      ),
    )
  }

  const removePlace = (id: string) => {
    setPlaces(prev => prev.filter(p => p.id !== id))
  }

  return { places, addPlace, updatePlace, updateStatus, removePlace }
}
