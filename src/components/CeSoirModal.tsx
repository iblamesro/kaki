import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Place } from '../types'

interface Props {
  places: Place[]
  onResult: (place: Place) => void
  onClose: () => void
}

type Step = 'humeur' | 'cuisine' | 'result'

const HUMEURS = [
  { id: 'casual',   label: 'Décontracté',  sub: 'Ambiance cool, pas de prise de tête' },
  { id: 'chic',     label: 'Soirée chic',  sub: 'On s\'habille, on profite' },
  { id: 'rapide',   label: 'Rapide',       sub: 'On mange bien, vite' },
]

const CUISINES = [
  { id: 'all',      label: 'Peu importe',  emoji: '✦' },
  { id: 'Restaurant', label: 'Restaurant', emoji: '🍽' },
  { id: 'Café',     label: 'Café',         emoji: '☕' },
  { id: 'Bar',      label: 'Bar',          emoji: '🍷' },
]

export default function CeSoirModal({ places, onResult, onClose }: Props) {
  const [step, setStep]       = useState<Step>('humeur')
  const [humeur, setHumeur]   = useState<string | null>(null)
  const [cuisine, setCuisine] = useState<string | null>(null)
  const [result, setResult]   = useState<Place | null>(null)
  const [spinning, setSpinning] = useState(false)

  const wishlist = places.filter(p => p.status === 'wishlist')

  const pick = (selectedCuisine: string) => {
    setCuisine(selectedCuisine)
    setSpinning(true)
    setStep('result')

    let pool = wishlist
    if (selectedCuisine !== 'all') pool = pool.filter(p => p.category === selectedCuisine)
    if (pool.length === 0) pool = wishlist
    if (pool.length === 0) { setSpinning(false); return }

    // Simulate roulette — pick after a short delay
    setTimeout(() => {
      const picked = pool[Math.floor(Math.random() * pool.length)]
      setResult(picked)
      setSpinning(false)
    }, 1200)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'flex-end',
        background: 'rgba(9,10,8,0.72)', backdropFilter: 'blur(16px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        style={{ width: '100%', background: 'var(--surface)', borderRadius: '24px 24px 0 0',
          border: '1px solid var(--border-2)', borderBottom: 'none', overflow: 'hidden' }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12px', paddingBottom: '4px' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '99px', background: 'var(--border-2)' }} />
        </div>

        <div style={{ padding: '16px 24px 40px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <p className="font-ui" style={{ fontSize: '9px', letterSpacing: '0.22em', color: 'var(--kaki)', textTransform: 'uppercase', marginBottom: '6px' }}>
                ✦ Kaki choisit
              </p>
              <h2 className="font-display font-medium" style={{ fontSize: '1.6rem', color: 'var(--cream)', fontStyle: 'italic', lineHeight: 1.1 }}>
                Ce soir, on va où ?
              </h2>
            </div>
            <button onClick={onClose} style={{ width: '30px', height: '30px', borderRadius: '50%',
              background: 'var(--surface-3)', border: 'none', color: 'var(--muted)', fontSize: '16px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>

          <AnimatePresence mode="wait">

            {/* Step 1 — Humeur */}
            {step === 'humeur' && (
              <motion.div key="humeur" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <p className="font-ui" style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px' }}>
                  Quelle humeur ?
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {HUMEURS.map(h => (
                    <button key={h.id} onClick={() => { setHumeur(h.id); setStep('cuisine') }}
                      style={{ padding: '14px 16px', borderRadius: '14px', textAlign: 'left', cursor: 'pointer',
                        background: humeur === h.id ? 'rgba(138,156,30,0.15)' : 'var(--surface-3)',
                        border: `1px solid ${humeur === h.id ? 'rgba(138,156,30,0.4)' : 'var(--border-2)'}` }}>
                      <p className="font-ui font-medium" style={{ fontSize: '14px', color: 'var(--cream)', marginBottom: '2px' }}>{h.label}</p>
                      <p className="font-ui" style={{ fontSize: '11px', color: 'var(--muted)' }}>{h.sub}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 2 — Cuisine */}
            {step === 'cuisine' && (
              <motion.div key="cuisine" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <p className="font-ui" style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px' }}>
                  Quel type d'endroit ?
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {CUISINES.map(c => (
                    <button key={c.id} onClick={() => pick(c.id)}
                      style={{ padding: '16px 12px', borderRadius: '14px', textAlign: 'center', cursor: 'pointer',
                        background: 'var(--surface-3)', border: '1px solid var(--border-2)' }}>
                      <p style={{ fontSize: '22px', marginBottom: '6px' }}>{c.emoji}</p>
                      <p className="font-ui font-medium" style={{ fontSize: '12px', color: 'var(--cream)' }}>{c.label}</p>
                    </button>
                  ))}
                </div>
                <button onClick={() => setStep('humeur')} className="font-ui"
                  style={{ marginTop: '16px', fontSize: '11px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  ← retour
                </button>
              </motion.div>
            )}

            {/* Step 3 — Result */}
            {step === 'result' && (
              <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                {spinning ? (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <motion.p
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 0.8 }}
                      className="font-display" style={{ fontSize: '2rem', color: 'var(--kaki-light)', fontStyle: 'italic' }}>
                      ✦
                    </motion.p>
                    <p className="font-ui" style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '12px' }}>Kaki choisit…</p>
                  </div>
                ) : result ? (
                  <div>
                    <div style={{ background: 'var(--surface-3)', borderRadius: '16px', padding: '18px', marginBottom: '16px',
                      border: '1px solid var(--border-2)' }}>
                      <p className="font-ui" style={{ fontSize: '9px', letterSpacing: '0.2em', color: 'var(--kaki)', textTransform: 'uppercase', marginBottom: '8px' }}>
                        ✦ Kaki a choisi
                      </p>
                      <h3 className="font-display font-medium"
                        style={{ fontSize: '1.5rem', color: 'var(--cream)', fontStyle: 'italic', lineHeight: 1.1, marginBottom: '6px' }}>
                        {result.name}
                      </h3>
                      <p className="font-ui" style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: 1.5 }}>
                        {result.address.split(',').slice(0, 2).join(',')}
                      </p>
                      {result.description && (
                        <p className="font-ui" style={{ fontSize: '12px', color: 'var(--cream-dim)', marginTop: '10px', lineHeight: 1.6, opacity: 0.8 }}>
                          {result.description.slice(0, 100)}…
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => { onResult(result); onClose() }} className="font-ui font-semibold"
                        style={{ flex: 1, padding: '13px', borderRadius: '14px', background: 'var(--cream)',
                          color: 'var(--bg)', border: 'none', fontSize: '12px', letterSpacing: '0.06em', cursor: 'pointer' }}>
                        On y va →
                      </button>
                      <button onClick={() => { setStep('humeur'); setResult(null) }} className="font-ui"
                        style={{ padding: '13px 16px', borderRadius: '14px', background: 'var(--surface-3)',
                          color: 'var(--muted)', border: '1px solid var(--border-2)', fontSize: '12px', cursor: 'pointer' }}>
                        ↻
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <p className="font-ui" style={{ color: 'var(--muted)', fontSize: '13px' }}>Aucune adresse dans la wishlist</p>
                    <button onClick={onClose} className="font-ui"
                      style={{ marginTop: '12px', fontSize: '11px', color: 'var(--cream-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      Fermer
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}
