export type PlaceCategory =
  | 'Restaurant'
  | 'Café'
  | 'Bar'
  | 'Boutique'
  | 'Activité'
  | 'Autre'

export type PlaceStatus = 'wishlist' | 'liked' | 'disliked'

export interface Place {
  id: string
  name: string
  address: string
  category: PlaceCategory
  notes?: string
  lat: number
  lng: number
  status: PlaceStatus
  dateAdded: string
  dateVisited?: string
  instagram?: string
  coverPhoto?: string
  description?: string
  likedAspects?: string
  orderedItems?: string
  tags?: string[]
  rating?: number      // 1–5
  priceRange?: 1 | 2 | 3 | 4  // € €€ €€€ €€€€
  hearted?: boolean  // Eden a mis un ♡
}

export interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}
