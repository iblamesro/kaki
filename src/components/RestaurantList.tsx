import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Place, PlaceStatus } from '../types'

const CAT_EMOJI: Record<string, string> = {
  Restaurant: '🍽', Café: '☕', Bar: '🍷', Boutique: '🛍', Activité: '✦', Autre: '◎',
}

const STATUS_CFG = {
  wishlist: { label: 'À tester', color: 'var(--accent)'   },
  liked:    { label: 'Aimé',     color: 'var(--liked)'    },
  disliked: { label: 'Bof',      color: 'var(--disliked)' },
}

type StatusFilter = 'all' | PlaceStatus

interface Props {
  places: Place[]
  onBack: () => void
  onGoHome: () => void
  onSelectPlace: (place: Place) => void
  onAdd: () => void
  onOpenStats: () => void
}

export default function RestaurantList({ places, onBack, onGoHome, onSelectPlace, onAdd, onOpenStats }: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [activeTag,    setActiveTag]    = useState<string | null>(null)
  const [search,       setSearch]       = useState('')

  const allTags = Array.from(new Set(places.flatMap(p => p.tags ?? []))).sort()

  const filtered = places
    .filter(p => statusFilter === 'all' || p.status === statusFilter)
    .filter(p => !activeTag || (p.tags ?? []).includes(activeTag))
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())

  return (
    <div style={{ height: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 18px 0', flexShrink: 0 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
          <button onClick={onGoHome} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <span className="font-display font-medium" style={{ fontSize: '1.3rem', color: 'var(--cream)', fontStyle: 'italic', letterSpacing: '0.14em' }}>kaki</span>
          </button>
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="font-ui"
              style={{ fontSize: '11px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.06em' }}>
              ← carte
            </button>
            <button onClick={onOpenStats} className="font-ui"
              style={{ fontSize: '18px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, padding: '2px 4px' }}
              title="Statistiques">
              ◎
            </button>
            <button onClick={onAdd}
              style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--cream)', color: 'var(--bg)', fontSize: '18px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
              +
            </button>
          </div>
        </div>

        {/* Title */}
        <div style={{ marginBottom: '14px' }}>
          <h1 className="font-display font-medium" style={{ fontSize: '1.55rem', color: 'var(--cream)', fontStyle: 'italic', lineHeight: 1 }}>
            Nos adresses
          </h1>
          <p className="font-ui" style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '3px' }}>
            {filtered.length} adresse{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
            style={{ width: '100%', background: 'var(--surface-3)', border: 'none',
              borderRadius: '10px', color: 'var(--cream)', padding: '9px 12px 9px 32px',
              fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', fontSize: '14px', outline: 'none' }} />
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '14px', pointerEvents: 'none' }}>⌕</span>
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '15px' }}>×</button>}
        </div>

        {/* Status chips */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: allTags.length > 0 ? '8px' : '14px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {(['all', 'wishlist', 'liked', 'disliked'] as StatusFilter[]).map(f => {
            const count = f === 'all' ? places.length : places.filter(p => p.status === f).length
            const label = f === 'all' ? 'Tous' : STATUS_CFG[f].label
            const active = statusFilter === f
            return (
              <button key={f} onClick={() => setStatusFilter(f)} className="font-ui font-medium flex-shrink-0"
                style={{ padding: '5px 13px', borderRadius: '99px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap',
                  background: active ? 'var(--cream)' : 'var(--surface-3)',
                  color: active ? 'var(--bg)' : 'var(--cream-dim)',
                  border: 'none' }}>
                {label} <span style={{ opacity: 0.5, fontSize: '11px' }}>({count})</span>
              </button>
            )
          })}
        </div>

        {/* Tag chips */}
        {allTags.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', paddingBottom: '14px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {allTags.map(tag => (
              <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)} className="font-ui font-medium flex-shrink-0"
                style={{ padding: '4px 11px', borderRadius: '99px', fontSize: '11px', cursor: 'pointer',
                  background: activeTag === tag ? 'rgba(138,156,30,0.25)' : 'transparent',
                  color: activeTag === tag ? 'var(--kaki-light)' : 'var(--muted)',
                  border: `1px solid ${activeTag === tag ? 'rgba(138,156,30,0.5)' : 'var(--border-2)'}` }}>
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── List ── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p className="font-ui" style={{ fontSize: '13px', color: 'var(--muted)' }}>Aucune adresse</p>
            </motion.div>
          ) : filtered.map((place, i) => (
            <motion.button key={place.id}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.22, delay: i * 0.03 }}
              onClick={() => onSelectPlace(place)}
              style={{ width: '100%', padding: '0', background: 'none', border: 'none',
                borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left', display: 'block' }}
              whileTap={{ background: 'var(--surface)' } as never}
            >
              <div style={{ display: 'flex', gap: '14px', alignItems: 'stretch', padding: '14px 18px' }}>

                {/* Thumbnail */}
                <div style={{ width: '62px', height: '62px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0,
                  background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {place.coverPhoto
                    ? <img src={place.coverPhoto} alt={place.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    : <span style={{ fontSize: '24px', opacity: 0.22 }}>{CAT_EMOJI[place.category]}</span>}
                </div>

                {/* Info — prend toute la largeur restante */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4px' }}>

                  {/* Name + heart */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <p className="font-display font-medium"
                      style={{ fontSize: '1.05rem', color: 'var(--cream)', fontStyle: 'italic', lineHeight: 1.15,
                        flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {place.name}
                    </p>
                    {place.hearted && <span style={{ fontSize: '12px', color: '#e05c6a', flexShrink: 0 }}>♥</span>}
                  </div>

                  {/* Category · Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span className="font-ui" style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      {CAT_EMOJI[place.category]} {place.category}
                    </span>
                    <span style={{ width: '2px', height: '2px', borderRadius: '50%', background: 'var(--border-2)', flexShrink: 0 }} />
                    <span className="font-ui font-medium" style={{ fontSize: '11px', color: STATUS_CFG[place.status].color }}>
                      {STATUS_CFG[place.status].label}
                    </span>
                  </div>

                  {/* Rating + tags */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {place.rating && (
                      <span style={{ fontSize: '10px', color: 'var(--accent)', letterSpacing: '1px' }}>
                        {'★'.repeat(place.rating)}{'☆'.repeat(5 - place.rating)}
                      </span>
                    )}
                    {place.tags && place.tags.length > 0 && (
                      <span className="font-ui" style={{ fontSize: '10px', color: 'var(--kaki)', opacity: 0.8 }}>
                        {place.tags.slice(0, 2).map(t => `#${t}`).join(' ')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Chevron only */}
                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '14px', color: 'var(--border-2)' }}>›</span>
                </div>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
        <div style={{ height: '32px' }} />
      </div>
    </div>
  )
}
