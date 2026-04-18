import { createClient } from '@supabase/supabase-js'

const url  = import.meta.env.VITE_SUPABASE_URL  as string
const key  = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(url, key)

// ── Types row Supabase (snake_case) ───────────────────────────────────────────
export interface PlaceRow {
  id: string
  user_id: string
  name: string
  address: string
  lat: number
  lng: number
  status: 'wishlist' | 'liked' | 'disliked'
  category: string
  rating?: number
  price_range?: number
  tags?: string[]
  cover_photo?: string
  notes?: string
  description?: string
  liked_aspects?: string
  ordered_items?: string
  instagram_url?: string
  hearted?: boolean
  date_added: string
  date_visited?: string
}

export interface UserRow {
  id: string
  username: string | null
  avatar_url: string | null
  reward_points?: number
  created_at?: string
}

export interface GroupRow {
  id: string
  name: string
  created_by: string | null
  invite_code: string | null
  created_at: string
}

export interface GroupMemberRow {
  group_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at?: string
}

export interface GroupPlaceRow {
  group_id: string
  place_id: string
  added_by: string | null
  added_at?: string
}

export interface ProposalRow {
  id: string
  group_id: string
  place_id: string
  proposed_by: string
  proposed_for: string
  created_at: string
}

export interface ProposalVoteRow {
  proposal_id: string
  user_id: string
  vote: boolean
}
