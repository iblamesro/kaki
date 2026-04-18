import { motion } from 'framer-motion'
import { Place } from '../types'

const CAT_EMOJI: Record<string, string> = {
  Restaurant: '🍽', Café: '☕', Bar: '🍷', Boutique: '🛍', Activité: '✦', Autre: '◎',
}

const CAT_COLOR: Record<string, string> = {
  Restaurant: '#1C1A12', Café: '#1A150E', Bar: '#180E14',
  Boutique: '#0E1318', Activité: '#121818', Autre: '#141414',
}

const STATUS = {
  wishlist: { label: 'À tester', color: 'var(--accent)' },
  liked:    { label: 'Aimé',     color: 'var(--liked)'  },
  disliked: { label: 'Bof',      color: 'var(--muted)'  },
}

interface PlaceCardProps {
  place: Place
  isPicked?: boolean
  onClose: () => void
  onViewDetail: (place: Place) => void
  onUpdateStatus: (id: string, status: Place['status']) => void
  onDelete: (id: string) => void
  onToggleHeart: (id: string) => void
}

export default function PlaceCard({
  place, isPicked = false, onClose, onViewDetail, onUpdateStatus, onToggleHeart
}: PlaceCardProps) {
  const s = STATUS[place.status]

  return (
    <motion.div
      initial={{ y: 24, opacity: 0, scale: 0.97 }}
      animate={{ y: 0,  opacity: 1, scale: 1 }}
      exit={{   y: 24, opacity: 0, scale: 0.97 }}
      transition={{ type: 'spring', damping: 32, stiffness: 360 }}
      className="absolute z-[900]"
      style={{ bottom: '96px', left: '50%', transform: 'translateX(-50%)', width: 'min(300px, calc(100vw - 40px))' }}
    >
      <div style={{
        background: 'rgba(22,23,20,0.96)',
        backdropFilter: 'blur(24px)',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.65), 0 2px 8px rgba(0,0,0,0.4)',
        overflow: 'hidden',
      }}>

        {/* ── Main row ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 12px 10px' }}>

          {/* Thumbnail */}
          <div style={{
            width: '54px', height: '54px', borderRadius: '12px', flexShrink: 0,
            overflow: 'hidden', background: CAT_COLOR[place.category] ?? '#141414',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            {place.coverPhoto ? (
              <img
                src={place.coverPhoto}
                alt={place.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <span style={{ fontSize: '22px', opacity: 0.3 }}>{CAT_EMOJI[place.category]}</span>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {isPicked && (
              <p className="font-ui"
                style={{ fontSize: '9px', letterSpacing: '0.2em', color: 'var(--accent)',
                  textTransform: 'uppercase', marginBottom: '2px' }}>
                ✦ Kaki a choisi
              </p>
            )}
            <h2 className="font-display font-medium"
              style={{ fontSize: '1rem', color: 'var(--cream)', lineHeight: 1.2,
                fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {place.name}
            </h2>
            <p className="font-ui"
              style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px', letterSpacing: '0.04em' }}>
              <span style={{ color: s.color }}>{s.label}</span>
              <span style={{ opacity: 0.4, margin: '0 5px' }}>·</span>
              {place.category}
              {place.priceRange && (
                <>
                  <span style={{ opacity: 0.4, margin: '0 5px' }}>·</span>
                  <span style={{ letterSpacing: '0.02em' }}>{'€'.repeat(place.priceRange)}</span>
                </>
              )}
            </p>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            style={{ width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
              background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.45)', fontSize: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ×
          </button>
        </div>

        {/* ── Divider ──────────────────────────────────────────── */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0 12px' }} />

        {/* ── Actions row ──────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '0', padding: '8px 10px 10px' }}>

          {/* Heart */}
          <button
            onClick={() => onToggleHeart(place.id)}
            style={{ flex: 1, height: '38px', borderRadius: '10px',
              background: place.hearted ? 'rgba(224,92,106,0.14)' : 'transparent',
              border: 'none', cursor: 'pointer',
              color: place.hearted ? '#e05c6a' : 'rgba(255,255,255,0.3)',
              fontSize: '17px', transition: 'all 0.15s' }}
          >
            {place.hearted ? '♥' : '♡'}
          </button>

          {/* Bof */}
          <button
            onClick={() => onUpdateStatus(place.id, 'disliked')}
            className="font-ui font-medium"
            style={{ flex: 1.4, height: '38px', borderRadius: '10px',
              background: place.status === 'disliked' ? 'rgba(156,48,48,0.2)' : 'transparent',
              border: 'none', cursor: 'pointer',
              color: place.status === 'disliked' ? '#c05050' : 'rgba(255,255,255,0.3)',
              fontSize: '12px', letterSpacing: '0.04em', transition: 'all 0.15s' }}
          >
            ✕ Bof
          </button>

          {/* Aimé */}
          <button
            onClick={() => onUpdateStatus(place.id, 'liked')}
            className="font-ui font-semibold"
            style={{ flex: 1.4, height: '38px', borderRadius: '10px',
              background: place.status === 'liked' ? 'rgba(38,128,66,0.22)' : 'transparent',
              border: 'none', cursor: 'pointer',
              color: place.status === 'liked' ? 'var(--liked)' : 'rgba(255,255,255,0.3)',
              fontSize: '12px', letterSpacing: '0.04em', transition: 'all 0.15s' }}
          >
            ✓ Aimé
          </button>

          {/* Voir la fiche */}
          <button
            onClick={() => onViewDetail(place)}
            className="font-ui font-medium"
            style={{ flex: 1.8, height: '38px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.09)',
              cursor: 'pointer', color: 'rgba(255,255,255,0.7)',
              fontSize: '12px', letterSpacing: '0.04em', transition: 'all 0.15s' }}
          >
            Fiche →
          </button>
        </div>
      </div>
    </motion.div>
  )
}
