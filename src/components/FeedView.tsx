import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase, PlaceRow } from '../lib/supabase'
import { rowToPlace } from '../lib/places'
import { useAuth } from '../lib/auth'
import { Place } from '../types'

interface FeedItem {
  place: Place
  actorName: string
  actorId: string
  action: 'added' | 'liked'
  date: string
}

const CAT_EMOJI: Record<string, string> = {
  Restaurant: '🍽', Café: '☕', Bar: '🍷', Boutique: '🛍', Activité: '✦', Autre: '◎',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'à l\'instant'
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7)  return `il y a ${d}j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

interface Props {
  onBack: () => void
  onViewPlace?: (place: Place) => void
}

export default function FeedView({ onBack, onViewPlace }: Props) {
  const { user } = useAuth()
  const [feed,    setFeed]    = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    void (async () => {
      setLoading(true)
      setError(null)

      // 1. Trouver tous les co-membres de mes groupes
      const { data: memberRows, error: me } = await supabase
        .from('group_members')
        .select('user_id')
        .in('group_id', (
          await supabase.from('group_members').select('group_id').eq('user_id', user.id)
        ).data?.map((r: { group_id: string }) => r.group_id) ?? [])

      if (me) { setError(me.message); setLoading(false); return }

      const peerIds = [...new Set(
        (memberRows ?? []).map((r: { user_id: string }) => r.user_id).filter(id => id !== user.id)
      )]

      if (peerIds.length === 0) { setFeed([]); setLoading(false); return }

      // 2. Leurs lieux récents (30 derniers jours)
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
      const { data: placeRows, error: pe } = await supabase
        .from('places')
        .select('*')
        .in('user_id', peerIds)
        .gte('date_added', since)
        .order('date_added', { ascending: false })
        .limit(60)

      if (pe) { setError(pe.message); setLoading(false); return }

      // 3. Profils des pairs (username)
      const { data: profiles } = await supabase
        .from('users')
        .select('id, username')
        .in('id', peerIds)

      const nameMap: Record<string, string> = {}
      for (const p of (profiles ?? []) as { id: string; username: string | null }[]) {
        nameMap[p.id] = p.username?.trim() || p.id.slice(0, 6)
      }

      const items: FeedItem[] = (placeRows as PlaceRow[]).map(row => ({
        place: rowToPlace(row),
        actorId: row.user_id,
        actorName: nameMap[row.user_id] ?? row.user_id.slice(0, 6),
        action: row.status === 'liked' ? 'liked' : 'added',
        date: row.date_added,
      }))

      setFeed(items)
      setLoading(false)
    })()
  }, [user])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      style={{ height: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}
    >
      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '11px' }} className="font-ui">←</button>
        <div>
          <p className="font-ui" style={{ fontSize: '10px', letterSpacing: '0.2em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Réseau</p>
          <h1 className="font-display font-medium" style={{ fontSize: '1.3rem', color: 'var(--cream)', fontStyle: 'italic' }}>Activité</h1>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <p className="font-ui" style={{ padding: '32px 20px', fontSize: '13px', color: 'var(--muted)' }}>Chargement…</p>
        ) : error ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: '24px', marginBottom: '14px', opacity: 0.25 }}>◎</p>
            <p className="font-ui font-medium" style={{ fontSize: '13px', color: 'var(--cream)', marginBottom: '8px' }}>
              {error.includes('recursion') ? 'Configuration requise' : 'Erreur de chargement'}
            </p>
            <p className="font-ui" style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.65, maxWidth: '280px', margin: '0 auto' }}>
              {error.includes('recursion')
                ? 'Exécute le bloc "FIX CRITIQUE" du script SQL dans Supabase pour activer le fil d\'activité.'
                : error}
            </p>
          </div>
        ) : feed.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: '28px', marginBottom: '12px', opacity: 0.3 }}>◎</p>
            <p className="font-ui" style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6 }}>
              Pas encore d'activité.<br />
              Rejoins un groupe pour voir les adresses de tes amis ici.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {feed.map((item, i) => (
              <motion.button
                key={`${item.place.id}-${i}`}
                type="button"
                onClick={() => onViewPlace?.(item.place)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 20px',
                  borderBottom: '1px solid var(--border)',
                  background: 'none', border: 'none', cursor: onViewPlace ? 'pointer' : 'default',
                  textAlign: 'left', width: '100%',
                }}
              >
                {/* Thumbnail */}
                <div style={{ width: '48px', height: '48px', borderRadius: '10px', flexShrink: 0, overflow: 'hidden',
                  background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.place.coverPhoto ? (
                    <img src={item.place.coverPhoto} alt={item.place.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '20px', opacity: 0.35 }}>{CAT_EMOJI[item.place.category] ?? '◎'}</span>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="font-ui" style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '2px' }}>
                    <span style={{ color: 'var(--cream)', fontWeight: 600 }}>@{item.actorName}</span>
                    {item.action === 'liked'
                      ? <span style={{ color: 'var(--liked)' }}> a aimé</span>
                      : <span> a ajouté</span>}
                  </p>
                  <p className="font-display font-medium" style={{ fontSize: '0.95rem', color: 'var(--cream)', fontStyle: 'italic',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.place.name}
                  </p>
                  <p className="font-ui" style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>
                    {CAT_EMOJI[item.place.category]} {item.place.category}
                    {item.place.priceRange && <span style={{ opacity: 0.5 }}> · {'€'.repeat(item.place.priceRange)}</span>}
                  </p>
                </div>

                {/* Date */}
                <p className="font-ui" style={{ fontSize: '10px', color: 'var(--muted)', flexShrink: 0 }}>
                  {timeAgo(item.date)}
                </p>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
