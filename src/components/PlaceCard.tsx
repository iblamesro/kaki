import { motion } from 'framer-motion'
import { Place } from '../types'

const CAT_EMOJI: Record<string, string> = {
  Restaurant: '🍽', Café: '☕', Bar: '🍷', Boutique: '🛍', Activité: '✦', Autre: '◎',
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

const STATUS = {
  wishlist: { label: 'À tester', color: 'var(--accent)' },
  liked:    { label: 'Aimé ✓',   color: 'var(--liked)'  },
  disliked: { label: 'Bof',      color: 'var(--muted)'  },
}

function shortAddr(a: string) {
  const parts = a.split(',')
  return parts.slice(0, 2).join(',').trim()
}

export default function PlaceCard({ place, isPicked = false, onClose, onViewDetail, onUpdateStatus, onDelete, onToggleHeart }: PlaceCardProps) {
  const s = STATUS[place.status]
  const hasCover = Boolean(place.coverPhoto)

  return (
    /* Floating — marges latérales, coins tous arrondis */
    <motion.div
      initial={{ y: 40, opacity: 0, scale: 0.96 }}
      animate={{ y: 0,  opacity: 1, scale: 1 }}
      exit={{   y: 40, opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="absolute z-[900]"
      style={{ bottom: '96px', left: '14px', right: '14px' }}
    >
      <div style={{
        background: 'var(--surface)',
        borderRadius: '20px',
        border: '1px solid var(--border-2)',
        boxShadow: '0 12px 48px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)',
        overflow: 'hidden',
      }}>
        {/* Cover photo — compacte */}
        {hasCover && (
          <div style={{ position: 'relative', height: '140px', flexShrink: 0 }}>
            <img src={place.coverPhoto} alt={place.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, var(--surface) 100%)' }} />
            <button onClick={onClose} style={{
              position: 'absolute', top: '10px', right: '10px',
              width: '28px', height: '28px', borderRadius: '50%',
              background: 'rgba(13,14,11,0.6)', backdropFilter: 'blur(8px)',
              color: 'var(--cream-dim)', fontSize: '15px', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>×</button>
          </div>
        )}

        {/* Body */}
        <div style={{ padding: hasCover ? '8px 16px 16px' : '16px 16px 16px' }}>

          {/* Top row */}
          <div className="flex items-start justify-between" style={{ marginBottom: '6px' }}>
            <div style={{ flex: 1, minWidth: 0, paddingRight: '10px' }}>
              {isPicked && (
                <p className="font-ui" style={{ fontSize: '9px', letterSpacing: '0.18em', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  ✦ Kaki a choisi
                </p>
              )}
              <h2 className="font-display font-medium"
                style={{ fontSize: '1.35rem', color: 'var(--cream)', lineHeight: 1.15, fontStyle: 'italic' }}>
                {place.name}
              </h2>
              <p className="font-ui" style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '3px', letterSpacing: '0.06em' }}>
                {CAT_EMOJI[place.category]} {place.category}
                <span style={{ color: s.color, marginLeft: '8px', fontWeight: 500 }}>· {s.label}</span>
              </p>
            </div>
            {!hasCover && (
              <button onClick={onClose} style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--surface-3)', color: 'var(--cream-dim)', fontSize: '15px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
            )}
          </div>

          {/* Address */}
          <p className="font-ui" style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.4, marginBottom: '12px' }}>
            {shortAddr(place.address)}
          </p>

          {/* Notes preview */}
          {place.notes && (
            <p className="font-display italic"
              style={{ fontSize: '13px', color: 'var(--cream-dim)', lineHeight: 1.55, marginBottom: '12px',
                borderLeft: '2px solid var(--kaki)', paddingLeft: '10px', opacity: 0.85 }}>
              {place.notes.length > 80 ? place.notes.slice(0, 80) + '…' : place.notes}
            </p>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button onClick={() => onViewDetail(place)} className="font-ui font-medium"
              style={{ width: '100%', padding: '11px', borderRadius: '12px',
                background: 'var(--surface-3)', color: 'var(--cream)',
                border: '1px solid var(--border-2)', fontSize: '12px', letterSpacing: '0.04em', cursor: 'pointer' }}>
              Voir la fiche →
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              {/* Heart */}
              <button onClick={() => onToggleHeart(place.id)}
                style={{ flex: 1, height: '40px', borderRadius: '12px',
                  background: place.hearted ? 'rgba(224,92,106,0.15)' : 'var(--surface-3)',
                  border: `1px solid ${place.hearted ? 'rgba(224,92,106,0.4)' : 'var(--border-2)'}`,
                  fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: place.hearted ? '#e05c6a' : 'var(--muted)' }}>
                {place.hearted ? '♥' : '♡'}
              </button>
              {/* Bof */}
              <button onClick={() => onUpdateStatus(place.id, 'disliked')} className="font-ui font-medium"
                style={{ flex: 1, height: '40px', borderRadius: '12px',
                  background: place.status === 'disliked' ? 'rgba(156,48,48,0.15)' : 'var(--surface-3)',
                  border: `1px solid ${place.status === 'disliked' ? 'rgba(156,48,48,0.4)' : 'var(--border-2)'}`,
                  color: 'var(--disliked)', fontSize: '13px', cursor: 'pointer' }}>
                ✕ Bof
              </button>
              {/* Aimé */}
              <button onClick={() => onUpdateStatus(place.id, 'liked')} className="font-ui font-semibold"
                style={{ flex: 1, height: '40px', borderRadius: '12px',
                  background: place.status === 'liked' ? 'var(--liked)' : 'rgba(38,128,66,0.12)',
                  border: `1px solid ${place.status === 'liked' ? 'transparent' : 'rgba(38,128,66,0.35)'}`,
                  color: place.status === 'liked' ? '#fff' : 'var(--liked)', fontSize: '13px', cursor: 'pointer' }}>
                ✓ Aimé
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
