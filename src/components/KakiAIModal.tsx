import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Place } from '../types'

interface Props {
  places: Place[]
  onSelect: (place: Place) => void
  onClose: () => void
}

type Step = 'ambiance' | 'category' | 'budget' | 'result'

const AMBIANCES = [
  { label: 'Romantique', tag: 'romantique' },
  { label: 'Festif', tag: 'festif' },
  { label: 'Décontracté', tag: 'décontracté' },
  { label: 'Date', tag: 'date' },
  { label: 'Business', tag: 'business' },
  { label: 'Peu importe', tag: null },
]
const CATEGORIES = ['Restaurant', 'Bar', 'Café', 'Peu importe']
const BUDGETS: { label: string; max: number | null }[] = [
  { label: '€', max: 1 },
  { label: '€€', max: 2 },
  { label: '€€€', max: 3 },
  { label: '€€€€', max: 4 },
  { label: 'Peu importe', max: null },
]

const CAT_EMOJI: Record<string, string> = {
  Restaurant: '🍽', Café: '☕', Bar: '🍷', Boutique: '🛍', Activité: '✦', Autre: '◎',
}

const QUESTIONS: Record<Step, string> = {
  ambiance: 'Quelle ambiance ce soir ?',
  category: 'Plutôt quel type d\'endroit ?',
  budget:   'Quel budget ?',
  result:   'Voilà mes suggestions pour toi ✦',
}

const STEPS: Step[] = ['ambiance', 'category', 'budget', 'result']

export default function KakiAIModal({ places, onSelect, onClose }: Props) {
  const [step,     setStep]     = useState<Step>('ambiance')
  const [ambiance, setAmbiance] = useState<string | null>(null)
  const [category, setCategory] = useState<string | null>(null)
  const [budget,   setBudget]   = useState<number | null>(null)

  const [messages, setMessages] = useState<{ from: 'ai' | 'user'; text: string }[]>([
    { from: 'ai', text: 'Bonsoir ! Je vais t\'aider à choisir où aller.' },
    { from: 'ai', text: QUESTIONS.ambiance },
  ])

  const addMsg = (from: 'ai' | 'user', text: string) =>
    setMessages(prev => [...prev, { from, text }])

  const pickAmbiance = (label: string, tag: string | null) => {
    setAmbiance(tag)
    addMsg('user', label)
    setTimeout(() => {
      addMsg('ai', QUESTIONS.category)
      setStep('category')
    }, 300)
  }

  const pickCategory = (cat: string) => {
    setCategory(cat === 'Peu importe' ? null : cat)
    addMsg('user', cat)
    setTimeout(() => {
      addMsg('ai', QUESTIONS.budget)
      setStep('budget')
    }, 300)
  }

  const pickBudget = (label: string, max: number | null) => {
    setBudget(max)
    addMsg('user', label)
    setTimeout(() => {
      addMsg('ai', QUESTIONS.result)
      setStep('result')
    }, 300)
  }

  const results = useMemo(() => {
    const pool = places.filter(p => p.status !== 'disliked')
    const filtered = pool.filter(p => {
      const catOk  = !category || p.category === category
      const budgOk = !budget   || !p.priceRange || p.priceRange <= budget
      const tagOk  = !ambiance || (p.tags ?? []).some(t => t.toLowerCase() === ambiance)
      return catOk && budgOk && tagOk
    })
    const base = filtered.length >= 2 ? filtered : pool.filter(p => {
      const catOk  = !category || p.category === category
      const budgOk = !budget   || !p.priceRange || p.priceRange <= budget
      return catOk && budgOk
    })
    const shuffled = [...base].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 3)
  }, [places, ambiance, category, budget])

  const chipStyle = (active = false): React.CSSProperties => ({
    padding: '8px 16px', borderRadius: '99px', fontSize: '13px', cursor: 'pointer',
    background: active ? 'var(--cream)' : 'var(--surface-3)',
    color: active ? 'var(--bg)' : 'var(--cream)',
    border: active ? 'none' : '1px solid var(--border-2)',
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
    fontWeight: 500,
  })

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(9,12,6,0.82)',
        backdropFilter: 'blur(14px)', display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'flex-end' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        style={{ width: '100%', maxWidth: 480, background: 'var(--surface)',
          borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
          border: '1px solid var(--border-2)', boxShadow: '0 -12px 60px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column', maxHeight: '85dvh', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div>
            <p className="font-ui" style={{ fontSize: '9px', letterSpacing: '0.2em', color: 'var(--accent)',
              textTransform: 'uppercase', marginBottom: '2px' }}>Kaki IA</p>
            <h2 className="font-display font-medium" style={{ fontSize: '1.15rem', color: 'var(--cream)', fontStyle: 'italic' }}>
              Où ce soir ?
            </h2>
          </div>
          <button onClick={onClose}
            style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--surface-3)',
              border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '17px',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* Chat messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', justifyContent: m.from === 'ai' ? 'flex-start' : 'flex-end' }}>
                <div style={{
                  maxWidth: '75%', padding: '10px 14px', borderRadius: m.from === 'ai' ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
                  background: m.from === 'ai' ? 'var(--surface-3)' : 'rgba(138,156,30,0.22)',
                  border: m.from === 'ai' ? '1px solid var(--border)' : '1px solid rgba(138,156,30,0.35)',
                }}>
                  <p className="font-ui" style={{ fontSize: '13px', color: 'var(--cream)', lineHeight: 1.5 }}>{m.text}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Input area — chips per step */}
        <div style={{ flexShrink: 0, borderTop: '1px solid var(--border)', padding: '16px 20px 24px' }}>
          <AnimatePresence mode="wait">
            {step === 'ambiance' && (
              <motion.div key="ambiance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {AMBIANCES.map(a => (
                  <button key={a.label} type="button" onClick={() => pickAmbiance(a.label, a.tag)}
                    style={chipStyle()}>{a.label}</button>
                ))}
              </motion.div>
            )}
            {step === 'category' && (
              <motion.div key="category" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {CATEGORIES.map(c => (
                  <button key={c} type="button" onClick={() => pickCategory(c)}
                    style={chipStyle()}>{c !== 'Peu importe' ? `${CAT_EMOJI[c] ?? ''} ${c}` : c}</button>
                ))}
              </motion.div>
            )}
            {step === 'budget' && (
              <motion.div key="budget" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {BUDGETS.map(b => (
                  <button key={b.label} type="button" onClick={() => pickBudget(b.label, b.max)}
                    style={chipStyle()}>{b.label}</button>
                ))}
              </motion.div>
            )}
            {step === 'result' && (
              <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {results.length === 0 ? (
                  <p className="font-ui" style={{ fontSize: '13px', color: 'var(--muted)', textAlign: 'center', padding: '12px 0' }}>
                    Aucune adresse ne correspond… Ajoutes-en d'abord !
                  </p>
                ) : results.map(p => (
                  <button key={p.id} type="button" onClick={() => { onSelect(p); onClose() }}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
                      background: 'var(--surface-3)', border: '1px solid var(--border-2)',
                      borderRadius: '14px', cursor: 'pointer', textAlign: 'left' }}>
                    {p.coverPhoto ? (
                      <img src={p.coverPhoto} alt={p.name}
                        style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'var(--surface)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                        {CAT_EMOJI[p.category] ?? '◎'}
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <p className="font-display font-medium"
                        style={{ fontSize: '1rem', color: 'var(--cream)', fontStyle: 'italic',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
                      <p className="font-ui" style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '3px',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.address}</p>
                    </div>
                    <span style={{ flexShrink: 0, fontSize: '16px', color: 'var(--accent)' }}>→</span>
                  </button>
                ))}
                <button type="button" onClick={() => {
                  setStep('ambiance'); setAmbiance(null); setCategory(null); setBudget(null)
                  setMessages([
                    { from: 'ai', text: 'Bonsoir ! Je vais t\'aider à choisir où aller.' },
                    { from: 'ai', text: QUESTIONS.ambiance },
                  ])
                }}
                  className="font-ui"
                  style={{ marginTop: '4px', fontSize: '11px', color: 'var(--muted)', background: 'none',
                    border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                  Recommencer
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}
