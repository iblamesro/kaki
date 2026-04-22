import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Place, PlaceStatus } from '../types'

const STATUS_CFG = {
  wishlist: { label: 'À tester', dot: '#C47C10', bar: '#C47C10' },
  liked:    { label: 'Aimé',     dot: '#268042', bar: '#268042' },
  disliked: { label: 'Bof',      dot: '#9C3030', bar: '#9C3030' },
}

const CAT_BG: Record<string, string> = {
  Restaurant: '#1C1A12', Café: '#1A150E', Bar: '#180E14',
  Boutique: '#0E1318', Activité: '#121818', Autre: '#141414',
}

const CAT_EMOJI: Record<string, string> = {
  Restaurant: '🍽', Café: '☕', Bar: '🍷', Boutique: '🛍', Activité: '✦', Autre: '◎',
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
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())

  const counts = {
    all:      places.length,
    wishlist: places.filter(p => p.status === 'wishlist').length,
    liked:    places.filter(p => p.status === 'liked').length,
    disliked: places.filter(p => p.status === 'disliked').length,
  }

  return (
    <div style={{ height: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 0' }}>
          <button onClick={onGoHome} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <span className="font-display font-medium"
              style={{ fontSize: '1.3rem', color: 'var(--cream)', fontStyle: 'italic', letterSpacing: '0.14em' }}>
              kaki
            </span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button onClick={onBack} className="font-ui"
              style={{ padding: '7px 10px', fontSize: '11px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
              ← carte
            </button>
            <button onClick={onOpenStats}
              style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'transparent',
                border: '1px solid var(--border-2)', color: 'var(--muted)', fontSize: '13px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ◎
            </button>
            <button onClick={onAdd}
              style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--cream)',
                color: 'var(--bg)', fontSize: '20px', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
              +
            </button>
          </div>
        </div>

        {/* Title */}
        <div style={{ padding: '12px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '14px' }}>
            <h1 className="font-display font-medium"
              style={{ fontSize: '1.75rem', color: 'var(--cream)', fontStyle: 'italic', lineHeight: 1 }}>
              Nos adresses
            </h1>
            <span className="font-ui" style={{ fontSize: '11px', color: 'var(--muted)' }}>
              {filtered.length}/{counts.all}
            </span>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', margin: '0 20px 12px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
            color: 'var(--muted)', fontSize: '13px', pointerEvents: 'none' }}>⌕</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
            style={{ width: '100%', background: 'var(--surface-3)', border: '1px solid var(--border-2)',
              borderRadius: '10px', color: 'var(--cream)', padding: '9px 32px 9px 32px',
              fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', fontSize: '13px',
              outline: 'none', boxSizing: 'border-box' }} />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '15px' }}>
              ×
            </button>
          )}
        </div>

        {/* Status filters */}
        <div style={{ display: 'flex', gap: '6px', padding: '0 20px 14px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {(['all', 'liked', 'wishlist', 'disliked'] as StatusFilter[]).map(f => {
            const active = statusFilter === f
            const label = f === 'all' ? 'Tous' : STATUS_CFG[f].label
            return (
              <button key={f} onClick={() => setStatusFilter(f)} className="font-ui font-medium flex-shrink-0"
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 13px',
                  borderRadius: '99px', fontSize: '12px', cursor: 'pointer',
                  background: active ? 'var(--cream)' : 'var(--surface-3)',
                  color: active ? 'var(--bg)' : 'var(--cream-dim)',
                  border: active ? 'none' : '1px solid var(--border-2)', transition: 'all 0.15s' }}>
                {f !== 'all' && (
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%',
                    background: active ? 'var(--bg)' : STATUS_CFG[f].dot, opacity: active ? 0.4 : 1, flexShrink: 0 }} />
                )}
                {label}
                <span style={{ opacity: 0.4, fontSize: '10px' }}>{counts[f]}</span>
              </button>
            )
          })}
        </div>

        {/* Tag chips */}
        {allTags.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', padding: '0 20px 14px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {allTags.map(tag => (
              <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className="font-ui flex-shrink-0"
                style={{ padding: '3px 10px', borderRadius: '99px', fontSize: '11px', cursor: 'pointer',
                  background: activeTag === tag ? 'rgba(138,156,30,0.15)' : 'transparent',
                  color: activeTag === tag ? 'var(--kaki-light)' : 'var(--muted)',
                  border: `1px solid ${activeTag === tag ? 'rgba(138,156,30,0.4)' : 'var(--border-2)'}`,
                  transition: 'all 0.15s' }}>
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 0' }}>
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ paddingTop: '64px', textAlign: 'center' }}>
              <p className="font-display font-medium"
                style={{ fontSize: '1.3rem', color: 'var(--cream)', fontStyle: 'italic', opacity: 0.25, marginBottom: '14px' }}>
                {search ? `"${search}"` : 'Aucune adresse'}
              </p>
              {!search && (
                <button onClick={onAdd} className="font-ui font-medium"
                  style={{ padding: '10px 22px', borderRadius: '99px', background: 'var(--surface-3)',
                    border: '1px solid var(--border-2)', color: 'var(--cream-dim)', fontSize: '12px', cursor: 'pointer' }}>
                  + Ajouter un lieu
                </button>
              )}
            </motion.div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 10px' }}>
              {filtered.map((place, i) => {
                const sc = STATUS_CFG[place.status]
                const shortAddr = (() => {
                  const parts = place.address.split(',')
                  // "134 Bd Haussmann, 75008 Paris" → "75008 Paris"
                  const arrond = parts.find(p => /7[5-9]\d{3}/.test(p.trim()))
                  return arrond?.trim() ?? parts.slice(0, 2).join(',').trim()
                })()

                return (
                  <motion.div key={place.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.25) }}
                  >
                    <button
                      onClick={() => onSelectPlace(place)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        textAlign: 'left', display: 'block', width: '100%' }}
                    >
                      {/* Square photo card */}
                      <div style={{ borderRadius: '14px', overflow: 'hidden', position: 'relative',
                        aspectRatio: '1 / 1', background: CAT_BG[place.category] ?? '#141414',
                        boxShadow: '0 2px 14px rgba(0,0,0,0.45)', marginBottom: '9px' }}>

                        {place.coverPhoto && (
                          <img src={place.coverPhoto} alt={place.name}
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        )}

                        {/* No photo: emoji */}
                        {!place.coverPhoto && (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '28px', opacity: 0.15 }}>{CAT_EMOJI[place.category] ?? '◎'}</span>
                          </div>
                        )}

                        {/* Gradient */}
                        <div style={{ position: 'absolute', inset: 0,
                          background: 'linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(0,0,0,0.55) 100%)' }} />

                        {/* Status stripe */}
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                          background: sc.bar, opacity: 0.85 }} />

                        {/* Heart + price — top right */}
                        <div style={{ position: 'absolute', top: '9px', right: '9px',
                          display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          {place.hearted && (
                            <span style={{ fontSize: '12px', color: '#e05c6a',
                              filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' }}>♥</span>
                          )}
                          {place.priceRange && (
                            <span className="font-ui" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.75)',
                              letterSpacing: '0.04em', textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
                              {'€'.repeat(place.priceRange)}
                            </span>
                          )}
                        </div>

                        {/* Rating — bottom left */}
                        {place.rating && (
                          <span style={{ position: 'absolute', bottom: '8px', left: '9px', fontSize: '9px',
                            color: 'rgba(244,220,120,0.9)', letterSpacing: '1.5px',
                            filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.7))' }}>
                            {'★'.repeat(place.rating)}
                          </span>
                        )}
                      </div>

                      {/* Name + info BELOW the card */}
                      <div style={{ paddingLeft: '2px', paddingBottom: '4px' }}>
                        <p className="font-display font-medium"
                          style={{ fontSize: '1rem', color: 'var(--cream)', fontStyle: 'italic',
                            lineHeight: 1.2, marginBottom: '4px',
                            display: '-webkit-box', WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                          {place.name}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%',
                            background: sc.bar, flexShrink: 0 }} />
                          <span className="font-ui" style={{ fontSize: '10px', color: 'var(--muted)' }}>
                            {sc.label}
                          </span>
                          {shortAddr && (
                            <>
                              <span style={{ color: 'var(--border-2)', fontSize: '10px' }}>·</span>
                              <span className="font-ui" style={{ fontSize: '10px', color: 'var(--muted)', opacity: 0.7,
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' }}>
                                {shortAddr}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  </motion.div>
                )
              })}
            </div>
          )}
        </AnimatePresence>
        <div style={{ height: '40px' }} />
      </div>
    </div>
  )
}
