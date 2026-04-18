import type { Place } from '../types'
import type { PlaceRow } from './supabase'

export function rowToPlace(row: PlaceRow): Place {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    category: row.category as Place['category'],
    lat: row.lat,
    lng: row.lng,
    status: row.status,
    rating: row.rating,
    priceRange: row.price_range as 1 | 2 | 3 | 4 | undefined,
    tags: row.tags,
    coverPhoto: row.cover_photo,
    notes: row.notes,
    description: row.description,
    likedAspects: row.liked_aspects,
    orderedItems: row.ordered_items,
    instagram: row.instagram_url,
    hearted: row.hearted ?? false,
    dateAdded: row.date_added,
    dateVisited: row.date_visited,
  }
}
