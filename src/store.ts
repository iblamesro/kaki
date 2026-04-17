import { useState, useEffect } from 'react'
import { Place, PlaceStatus } from './types'
import { v4 as uuidv4 } from 'uuid'

const STORAGE_KEY    = 'kaki-places'
const STORAGE_VERSION = 'v4'
const VERSION_KEY    = 'kaki-version'

type NewPlace = Omit<Place, 'id' | 'status' | 'dateAdded' | 'dateVisited'>
type PlaceUpdate = Partial<Omit<Place, 'id' | 'status' | 'dateAdded'>>

// ── Vos adresses ──────────────────────────────────────────────────────────────
const DEMO: Place[] = [
  {
    id: 'demo-1',
    name: 'Em Sherif',
    address: '14 Rue de Marignan, 75008 Paris',
    category: 'Restaurant',
    lat: 48.8704, lng: 2.3076,
    status: 'liked',
    dateAdded: '2025-03-10T19:00:00Z',
    dateVisited: '2025-03-10T19:00:00Z',
    description: 'La grande table libanaise de Paris. Mezze d\'exception, manakish dorés, kibbeh aux amandes — une générosité rare dans un cadre raffiné.',
    tags: ['libanais', 'mezze', 'gastronomique'],
    rating: 5,
  },
  {
    id: 'demo-2',
    name: 'Hando',
    address: '48 Rue de Richelieu, 75001 Paris',
    category: 'Restaurant',
    lat: 48.8645, lng: 2.3378,
    status: 'liked',
    dateAdded: '2025-03-22T20:00:00Z',
    dateVisited: '2025-03-22T20:00:00Z',
    description: 'Collaboration Parisien Mangolia x Mira Mikati. Sushis de wagyu servis au comptoir, champagne Moët en accord. Une expérience unique entre Paris et Tokyo.',
    tags: ['japonais', 'sushi', 'wagyu', 'comptoir'],
    rating: 5,
  },
  {
    id: 'demo-3',
    name: 'Spécimen',
    address: '1 Rue Biot, 75017 Paris',
    category: 'Restaurant',
    lat: 48.8840, lng: 2.3240,
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
      if (version !== STORAGE_VERSION) {
        // New version → reset to fresh demo data
        localStorage.setItem(VERSION_KEY, STORAGE_VERSION)
        return DEMO
      }
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) return JSON.parse(stored)
      return DEMO
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
