import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Place } from '../types'

interface Props {
  places: Place[]
  onBack: () => void
  onGoHome: () => void
}

const CAT_EMOJI: Record<string, string> = {
  Restaurant: '🍽', Café: '☕', Bar: '🍷', Boutique: '🛍', Activité: '✦', Autre: '◎',
}

const card = {
  hidden:  { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
}
const stagger = {
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
}

export default function StatsView({ places, onBack, onGoHome }: Props) {
  const stats = useMemo(() => {
    const liked    = places.filter(p => p.status === 'liked')
    const wishlist = places.filter(p => p.status === 'wishlist')
    const disliked = places.filter(p => p.status === 'disliked')

    // Category breakdown
    const byCategory: Record<string, number> = {}
    places.forEach(p => { byCategory[p.category] = (byCategory[p.category] ?? 0) + 1 })
    const catSorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1])
    const maxCat = catSorted[0]?.[1] ?? 1

    // Rating
    const rated = places.filter(p => p.rating)
    const avgRating = rated.length > 0
      ? (rated.reduce((s, p) => s + (p.rating ?? 0), 0) / rated.length).toFixed(1)
      : null
    const topRated = rated.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0]

    // Tags
    const tagCount: Record<string, number> = {}
    places.forEach(p => (p.tags ?? []).forEach(t => { tagCount[t] = (tagCount[t] ?? 0) + 1 }))
    const topTags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 5)

    // Most recent
    const newest = [...places].sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())[0]

    return { liked, wishlist, disliked, catSorted, maxCat, avgRating, topRated, topTags, newest }
  }, [places])

  if (places.length === 0) {
    return (
      <div style={{ height: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <p className="font-ui" style={{ color: 'var(--muted)', fontSize: '13px' }}>Aucune adresse encore.</p>
        <button onClick={onBack} style={{ marginTop: '16px', background: 'none', border: 'none', color: 'var(--cream-dim)', cursor: 'pointer', fontSize: '12px', fontFamily: '"Plus Jakarta Sans", system-ui' }}>← retour</button>
      </div>
    )
  }

  return (
    <div style={{ height: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top bar ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(13,14,11,0.9)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <button onClick={onGoHome} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <span className="font-display font-medium" style={{ fontSize: '1.1rem', color: 'var(--cream)', fontStyle: 'italic', letterSpacing: '0.14em' }}>kaki</span>
        </button>
        <button onClick={onBack} className="font-ui"
          style={{ fontSize: '11px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.06em' }}>
          ← retour
        </button>
      </div>

      {/* ── Scrollable content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 18px 48px' }}>

        {/* Hero headline */}
        <motion.div variants={stagger} initial="hidden" animate="visible">
          <motion.p variants={card} className="font-ui"
            style={{ fontSize: '9px', letterSpacing: '0.24em', color: 'var(--kaki)', textTransform: 'uppercase', marginBottom: '10px' }}>
            Votre collection
          </motion.p>
          <motion.h1 variants={card} className="font-display font-medium"
            style={{ fontSize: 'clamp(3rem, 14vw, 4.5rem)', color: 'var(--cream)', fontStyle: 'italic', lineHeight: 0.95, letterSpacing: '-0.02em', marginBottom: '6px' }}>
            {places.length}
          </motion.h1>
          <motion.p variants={card} className="font-ui"
            style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '32px' }}>
            adresse{places.length !== 1 ? 's' : ''} à Paris
          </motion.p>

          {/* Status trio */}
          <motion.div variants={card} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            {[
              { label: 'Aimés',    count: stats.liked.length,    color: 'var(--liked)',    bg: 'rgba(38,128,66,0.1)'  },
              { label: 'À tester', count: stats.wishlist.length, color: 'var(--accent)',   bg: 'rgba(196,124,16,0.1)' },
              { label: 'Bof',      count: stats.disliked.length, color: 'var(--disliked)', bg: 'rgba(156,48,48,0.1)'  },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, borderRadius: '14px', padding: '14px 10px', textAlign: 'center', border: `1px solid ${s.color}22` }}>
                <p className="font-display font-medium" style={{ fontSize: '1.9rem', color: s.color, fontStyle: 'italic', lineHeight: 1 }}>{s.count}</p>
                <p className="font-ui" style={{ fontSize: '9px', color: s.color, letterSpacing: '0.1em', marginTop: '4px', opacity: 0.8 }}>{s.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Category breakdown */}
          {stats.catSorted.length > 0 && (
            <motion.div variants={card} style={{ background: 'var(--surface)', borderRadius: '16px', padding: '18px 16px', marginBottom: '14px', border: '1px solid var(--border)' }}>
              <p className="font-ui" style={{ fontSize: '9px', letterSpacing: '0.22em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '14px' }}>Par catégorie</p>
              {stats.catSorted.map(([cat, count]) => (
                <div key={cat} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span className="font-ui" style={{ fontSize: '12px', color: 'var(--cream-dim)' }}>{CAT_EMOJI[cat]} {cat}</span>
                    <span className="font-ui" style={{ fontSize: '11px', color: 'var(--muted)' }}>{count}</span>
                  </div>
                  <div style={{ height: '4px', background: 'var(--surface-3)', borderRadius: '99px', overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / stats.maxCat) * 100}%` }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                      style={{ height: '100%', background: 'var(--kaki)', borderRadius: '99px' }}
                    />
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* Rating + top rated side by side */}
          {stats.avgRating && (
            <motion.div variants={card} style={{ display: 'grid', gridTemplateColumns: stats.topRated ? '1fr 1fr' : '1fr', gap: '10px', marginBottom: '14px' }}>
              <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '18px 16px', border: '1px solid var(--border)', textAlign: 'center' }}>
                <p className="font-ui" style={{ fontSize: '9px', letterSpacing: '0.2em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '10px' }}>Note moyenne</p>
                <p className="font-display font-medium" style={{ fontSize: '2.4rem', color: 'var(--accent)', fontStyle: 'italic', lineHeight: 1 }}>{stats.avgRating}</p>
                <p className="font-ui" style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px' }}>sur 5</p>
              </div>
              {stats.topRated && (
                <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '18px 16px', border: '1px solid var(--border)' }}>
                  <p className="font-ui" style={{ fontSize: '9px', letterSpacing: '0.2em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '10px' }}>Coup de cœur</p>
                  <p className="font-display font-medium" style={{ fontSize: '1rem', color: 'var(--cream)', fontStyle: 'italic', lineHeight: 1.2 }}>{stats.topRated.name}</p>
                  <p style={{ fontSize: '12px', color: 'var(--accent)', marginTop: '6px', letterSpacing: '1px' }}>{'★'.repeat(stats.topRated.rating ?? 0)}</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Top tags */}
          {stats.topTags.length > 0 && (
            <motion.div variants={card} style={{ background: 'var(--surface)', borderRadius: '16px', padding: '18px 16px', marginBottom: '14px', border: '1px solid var(--border)' }}>
              <p className="font-ui" style={{ fontSize: '9px', letterSpacing: '0.22em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '14px' }}>Vos tags</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {stats.topTags.map(([tag, count], i) => (
                  <span key={tag} className="font-ui"
                    style={{ fontSize: i === 0 ? '13px' : '11px', padding: '5px 12px', borderRadius: '99px',
                      background: i === 0 ? 'rgba(138,156,30,0.2)' : 'var(--surface-3)',
                      color: i === 0 ? 'var(--kaki-light)' : 'var(--muted)',
                      border: `1px solid ${i === 0 ? 'rgba(138,156,30,0.4)' : 'var(--border-2)'}` }}>
                    #{tag} <span style={{ opacity: 0.5 }}>({count})</span>
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* Newest place */}
          {stats.newest && (
            <motion.div variants={card} style={{ background: 'var(--surface)', borderRadius: '16px', padding: '18px 16px', border: '1px solid var(--border)' }}>
              <p className="font-ui" style={{ fontSize: '9px', letterSpacing: '0.22em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '12px' }}>Dernière adresse ajoutée</p>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0,
                  background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {stats.newest.coverPhoto
                    ? <img src={stats.newest.coverPhoto} alt={stats.newest.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: '18px', opacity: 0.3 }}>{CAT_EMOJI[stats.newest.category]}</span>}
                </div>
                <div>
                  <p className="font-display font-medium" style={{ fontSize: '1rem', color: 'var(--cream)', fontStyle: 'italic' }}>{stats.newest.name}</p>
                  <p className="font-ui" style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                    {new Date(stats.newest.dateAdded).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

        </motion.div>
      </div>
    </div>
  )
}
