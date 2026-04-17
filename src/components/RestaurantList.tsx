import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Place, PlaceStatus } from '../types'

const CAT_EMOJI: Record<string, string> = {
  Restaurant: '🍽', Café: '☕', Bar: '🍷', Boutique: '🛍', Activité: '✦', Autre: '◎',
}

const STATUS_CFG = {
  wishlist: { label: 'À tester', color: 'var(--accent)',   bar: '#C47C10' },
  liked:    { label: 'Aimé',     color: 'var(--liked)',    bar: '#268042' },
  disliked: { label: 'Bof',      color: 'var(--disliked)', bar: '#9C3030' },
}

// Warm placeholder colors by category
const CAT_BG: Record<string, string> = {
  Restaurant: '#1C1A12', Café: '#1A150E', Bar: '#180E14',
  Boutique: '#0E1318', Activité: '#121818', Autre: '#141414',
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

  const handleShare = () => {
    const text = `Ma carte kaki 🍽\n\n${places.map(p => `• ${p.name} — ${p.status === 'liked' ? 'Aimé ✓' : 'À tester'}`).join('\n')}`
    if (navigator.share) {
      navigator.share({ title: 'Ma carte kaki', text })
    } else {
      navigator.clipboard.writeText(text)
      alert('Liste copiée dans le presse-papiers !')
    }
  }

  return (
    <div style={{ height: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 20px 0', flexShrink: 0 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: '18px' }}>
          <button onClick={onGoHome} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <span className="font-display font-medium" style={{ fontSize: '1.3rem', color: 'var(--cream)', fontStyle: 'italic', letterSpacing: '0.14em' }}>kaki</span>
          </button>
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="font-ui"
              style={{ fontSize: '11px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.06em' }}>
              ← carte
            </button>
            <button onClick={handleShare} title="Partager"
              style={{ fontSize: '15px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', lineHeight: 1 }}>
              ↑
            </button>
            <button onClick={onOpenStats} title="Stats"
              style={{ fontSize: '16px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', lineHeight: 1 }}>
              ◎
            </button>
            <button onClick={onAdd}
              style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--cream)', color: 'var(--bg)', fontSize: '18px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
              +
            </button>
          </div>
        </div>

        {/* Title */}
        <div style={{ marginBottom: '16px' }}>
          <h1 className="font-display font-medium" style={{ fontSize: '1.6rem', color: 'var(--cream)', fontStyle: 'italic', lineHeight: 1 }}>
            Nos adresses
          </h1>
          <p className="font-ui" style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
            {filtered.length} adresse{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
            style={{ width: '100%', background: 'var(--surface-3)', border: 'none', borderRadius: '10px',
              color: 'var(--cream)', padding: '9px 36px 9px 32px',
              fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', fontSize: '14px', outline: 'none' }} />
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '14px', pointerEvents: 'none' }}>⌕</span>
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '15px' }}>×</button>}
        </div>

        {/* Status chips */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: allTags.length > 0 ? '8px' : '14px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {(['all', 'liked', 'wishlist', 'disliked'] as StatusFilter[]).map(f => {
            const count = f === 'all' ? places.length : places.filter(p => p.status === f).length
            const label = f === 'all' ? 'Tous' : STATUS_CFG[f].label
            const active = statusFilter === f
            return (
              <button key={f} onClick={() => setStatusFilter(f)} className="font-ui font-medium flex-shrink-0"
                style={{ padding: '5px 13px', borderRadius: '99px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap',
                  background: active ? 'var(--cream)' : 'var(--surface-3)',
                  color: active ? 'var(--bg)' : 'var(--cream-dim)', border: 'none' }}>
                {label} <span style={{ opacity: 0.45, fontSize: '10px' }}>{count}</span>
              </button>
            )
          })}
        </div>

        {/* Tag chips */}
        {allTags.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', paddingBottom: '14px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {allTags.map(tag => (
              <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)} className="font-ui font-medium flex-shrink-0"
                style={{ padding: '4px 10px', borderRadius: '99px', fontSize: '11px', cursor: 'pointer',
                  background: activeTag === tag ? 'rgba(138,156,30,0.2)' : 'transparent',
                  color: activeTag === tag ? 'var(--kaki-light)' : 'var(--muted)',
                  border: `1px solid ${activeTag === tag ? 'rgba(138,156,30,0.45)' : 'var(--border-2)'}` }}>
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Card grid ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p className="font-ui" style={{ fontSize: '13px', color: 'var(--muted)' }}>Aucune adresse</p>
            </motion.div>
          ) : (
            <motion.div
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}
            >
              {filtered.map((place, i) => {
                const sc = STATUS_CFG[place.status]
                return (
                  <motion.button key={place.id}
                    initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25, delay: i * 0.04 }}
                    onClick={() => onSelectPlace(place)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', display: 'block' }}
                    whileTap={{ scale: 0.97 } as never}
                  >
                    {/* Card */}
                    <div style={{ borderRadius: '14px', overflow: 'hidden', position: 'relative',
                      aspectRatio: '3/4', background: CAT_BG[place.category] ?? '#141414',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.35)' }}>

                      {/* Photo */}
                      {place.coverPhoto && (
                        <img src={place.coverPhoto} alt={place.name}
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      )}

                      {/* No photo — category emoji centered */}
                      {!place.coverPhoto && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '32px', opacity: 0.18 }}>{CAT_EMOJI[place.category]}</span>
                        </div>
                      )}

                      {/* Gradient overlay */}
                      <div style={{ position: 'absolute', inset: 0,
                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.78) 100%)' }} />

                      {/* Status bar top */}
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: sc.bar, opacity: 0.8 }} />

                      {/* Heart badge */}
                      {place.hearted && (
                        <div style={{ position: 'absolute', top: '10px', right: '10px',
                          fontSize: '13px', color: '#e05c6a', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }}>
                          ♥
                        </div>
                      )}

                      {/* Rating */}
                      {place.rating && (
                        <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
                          <span style={{ fontSize: '9px', color: 'rgba(244,220,120,0.9)', letterSpacing: '1px', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }}>
                            {'★'.repeat(place.rating)}
                          </span>
                        </div>
                      )}

                      {/* Bottom info */}
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 10px 12px' }}>
                        <p className="font-display font-medium"
                          style={{ fontSize: '0.92rem', color: '#fff', fontStyle: 'italic', lineHeight: 1.15,
                            marginBottom: '4px', textShadow: '0 1px 6px rgba(0,0,0,0.6)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {place.name}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: sc.bar, flexShrink: 0 }} />
                          <span className="font-ui" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.65)', letterSpacing: '0.04em' }}>
                            {sc.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
        <div style={{ height: '32px' }} />
      </div>
    </div>
  )
}
