import { useState, useCallback, useEffect } from 'react'
import {
  motion,
  useMotionValue,
  useTransform,
  useAnimation,
  AnimatePresence,
  type PanInfo,
} from 'framer-motion'
import { Place } from '../types'

const CAT_EMOJI: Record<string, string> = {
  Restaurant: '🍽',
  Café: '☕',
  Bar: '🍷',
  Boutique: '🛍',
  Activité: '✦',
  Autre: '◎',
}

function CardContent({ place }: { place: Place }) {
  return (
    <div
      className="w-full h-full flex flex-col justify-between"
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border-2)',
        borderRadius: '20px',
        padding: '28px',
        minHeight: '280px',
      }}
    >
      <div>
        <p
          className="font-ui"
          style={{ fontSize: '10px', letterSpacing: '0.18em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '16px' }}
        >
          {CAT_EMOJI[place.category]} {place.category}
        </p>
        <h2
          className="font-display font-medium leading-tight"
          style={{ fontSize: 'clamp(1.7rem, 5vw, 2.4rem)', color: 'var(--cream)', marginBottom: '16px' }}
        >
          {place.name}
        </h2>
        <div style={{ height: '1px', background: 'var(--border-2)', marginBottom: '14px' }} />
        <p className="font-ui" style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5, marginBottom: '12px' }}>
          {place.address}
        </p>
        {place.notes && (
          <p
            className="font-display font-medium italic leading-relaxed"
            style={{
              fontSize: '15px',
              color: 'var(--cream-dim)',
              borderLeft: '2px solid var(--accent)',
              paddingLeft: '12px',
              opacity: 0.8,
            }}
          >
            {place.notes}
          </p>
        )}
      </div>
      <p
        className="font-ui"
        style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '20px', letterSpacing: '0.06em' }}
      >
        Ajouté le{' '}
        {new Date(place.dateAdded).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
        })}
      </p>
    </div>
  )
}

interface TopCardProps {
  place: Place
  onSwipe: (id: string, dir: 'liked' | 'disliked') => void
}

function TopCard({ place, onSwipe }: TopCardProps) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-220, 220], [-12, 12])
  const likeOpacity = useTransform(x, [30, 110], [0, 1])
  const dislikeOpacity = useTransform(x, [-110, -30], [1, 0])
  const controls = useAnimation()

  const triggerSwipe = useCallback(
    async (dir: 'liked' | 'disliked') => {
      await controls.start({
        x: dir === 'liked' ? 700 : -700,
        opacity: 0,
        transition: { duration: 0.3, ease: 'easeOut' },
      })
      onSwipe(place.id, dir)
    },
    [controls, onSwipe, place.id],
  )

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const { offset, velocity } = info
      if (offset.x > 90 || velocity.x > 600) {
        triggerSwipe('liked')
      } else if (offset.x < -90 || velocity.x < -600) {
        triggerSwipe('disliked')
      } else {
        controls.start({ x: 0, transition: { type: 'spring', stiffness: 420, damping: 32 } })
      }
    },
    [triggerSwipe, controls],
  )

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.85}
      animate={controls}
      style={{ x, rotate, position: 'absolute', inset: 0, zIndex: 2, cursor: 'grab' }}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: 'grabbing' }}
    >
      {/* Boff overlay */}
      <motion.div
        className="absolute top-5 left-5 z-10 pointer-events-none"
        style={{ opacity: dislikeOpacity }}
      >
        <span
          className="block font-display font-medium"
          style={{
            fontSize: '15px',
            padding: '6px 14px',
            border: '2px solid var(--disliked)',
            color: 'var(--disliked)',
            borderRadius: '6px',
            transform: 'rotate(-12deg)',
            letterSpacing: '0.08em',
          }}
        >
          Boff
        </span>
      </motion.div>

      {/* J'ai aimé overlay */}
      <motion.div
        className="absolute top-5 right-5 z-10 pointer-events-none"
        style={{ opacity: likeOpacity }}
      >
        <span
          className="block font-display font-medium"
          style={{
            fontSize: '15px',
            padding: '6px 14px',
            border: '2px solid var(--liked)',
            color: 'var(--liked)',
            borderRadius: '6px',
            transform: 'rotate(12deg)',
            letterSpacing: '0.08em',
          }}
        >
          J'ai aimé
        </span>
      </motion.div>

      <CardContent place={place} />
    </motion.div>
  )
}

interface SwipeViewProps {
  places: Place[]
  onSwipe: (id: string, dir: 'liked' | 'disliked') => void
  onClose: () => void
}

export default function SwipeView({ places: initialPlaces, onSwipe, onClose }: SwipeViewProps) {
  const [queue, setQueue] = useState<Place[]>([...initialPlaces])
  const [rated, setRated] = useState(0)

  const handleSwipe = useCallback(
    (id: string, dir: 'liked' | 'disliked') => {
      onSwipe(id, dir)
      setRated(n => n + 1)
      setQueue(prev => prev.filter(p => p.id !== id))
    },
    [onSwipe],
  )

  const handleSkip = () => {
    setQueue(prev => {
      if (prev.length <= 1) return prev
      const [first, ...rest] = prev
      return [...rest, first]
    })
  }

  const top = queue[0]
  const second = queue[1]

  // Keyboard + trackpad support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!top) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') handleSwipe(top.id, 'liked')
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowDown') handleSwipe(top.id, 'disliked')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [top, handleSwipe])

  return (
    <div
      className="fixed inset-0 z-[3000] flex flex-col"
      style={{ background: 'var(--bg)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)', minHeight: '64px' }}
      >
        <div>
          <h1
            className="font-display font-medium"
            style={{ fontSize: '1.4rem', color: 'var(--cream)', letterSpacing: '0.02em' }}
          >
            Vous y êtes allé(e) ?
          </h1>
          <p className="font-ui" style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
            {queue.length} lieu{queue.length !== 1 ? 'x' : ''} à évaluer
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex items-center justify-center transition-opacity hover:opacity-60"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'var(--surface-3)',
            color: 'var(--cream-dim)',
            fontSize: '18px',
          }}
        >
          ×
        </button>
      </div>

      {/* Direction hints */}
      <div className="flex justify-between px-8 pt-4 pb-2 flex-shrink-0">
        <span className="font-ui" style={{ fontSize: '11px', color: 'var(--disliked)', letterSpacing: '0.08em' }}>
          ← Bof
        </span>
        <span className="font-ui" style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.06em' }}>
          ← → ou trackpad
        </span>
        <span className="font-ui" style={{ fontSize: '11px', color: 'var(--liked)', letterSpacing: '0.08em' }}>
          J'ai aimé →
        </span>
      </div>

      {/* Card stack */}
      <div className="flex-1 relative mx-5 overflow-hidden" style={{ maxHeight: '460px' }}>
        <AnimatePresence>
          {queue.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="text-center px-8">
                {rated > 0 && (
                  <p
                    className="font-display"
                    style={{ fontSize: '3rem', color: 'var(--liked)', marginBottom: '12px' }}
                  >
                    ✓
                  </p>
                )}
                <p
                  className="font-display font-medium"
                  style={{ fontSize: '1.4rem', color: 'var(--cream)' }}
                >
                  {rated > 0
                    ? `${rated} lieu${rated > 1 ? 'x' : ''} évalué${rated > 1 ? 's' : ''}`
                    : 'Aucun lieu à évaluer'}
                </p>
                <p className="font-ui" style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '8px' }}>
                  {rated > 0
                    ? 'Continuez à explorer de nouveaux endroits'
                    : 'Ajoutez des lieux depuis la carte'}
                </p>
              </div>
            </motion.div>
          ) : (
            <>
              {second && (
                <div
                  key={`bg-${second.id}`}
                  className="absolute inset-0"
                  style={{
                    zIndex: 1,
                    transform: 'scale(0.94) translateY(14px)',
                    transformOrigin: 'top center',
                    opacity: 0.5,
                  }}
                >
                  <CardContent place={second} />
                </div>
              )}
              <TopCard key={top.id} place={top} onSwipe={handleSwipe} />
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      {top && (
        <div className="flex items-center justify-center gap-6 px-6 py-6 flex-shrink-0">
          {/* Dislike */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => handleSwipe(top.id, 'disliked')}
            className="flex items-center justify-center font-ui transition-colors"
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              border: '1.5px solid var(--disliked)',
              color: 'var(--disliked)',
              background: 'transparent',
              fontSize: '20px',
            }}
          >
            ✕
          </motion.button>

          {/* Skip */}
          <button
            onClick={handleSkip}
            disabled={queue.length <= 1}
            className="font-ui transition-opacity disabled:opacity-20"
            style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 16px' }}
          >
            Pas encore
          </button>

          {/* Like */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => handleSwipe(top.id, 'liked')}
            className="flex items-center justify-center font-ui transition-colors"
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              border: '1.5px solid var(--liked)',
              color: 'var(--liked)',
              background: 'transparent',
              fontSize: '20px',
            }}
          >
            ✓
          </motion.button>
        </div>
      )}

      {/* Return */}
      <button
        onClick={onClose}
        className="pb-8 font-ui text-center flex-shrink-0 transition-opacity hover:opacity-70"
        style={{ fontSize: '12px', color: 'var(--muted)', letterSpacing: '0.1em' }}
      >
        ← Revenir à la carte
      </button>
    </div>
  )
}
