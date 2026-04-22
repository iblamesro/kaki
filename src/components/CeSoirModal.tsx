import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Place } from '../types'
import ReservationForm from './ReservationForm'

interface Props {
  places: Place[]
  userId: string
  onResult: (place: Place) => void
  onClose: () => void
}

type Step = 'humeur' | 'proximite' | 'cuisine' | 'result'

interface Coords { lat: number; lng: number }

function haversine(a: Coords, b: Coords): number {
  const R = 6371
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(x))
}

const HUMEURS = [
  { id: 'casual', label: 'Décontracté',  sub: 'Ambiance cool, sans prise de tête', icon: '✦' },
  { id: 'chic',   label: 'Soirée chic',  sub: 'On s\'habille, on profite',          icon: '◈' },
  { id: 'rapide', label: 'Rapide',       sub: 'On mange bien, vite fait',           icon: '◎' },
]

const PROXIMITES = [
  { id: 'nearby', label: 'Près de moi',  sub: 'Moins de 1 km',  maxKm: 1 },
  { id: 'medium', label: '20 min',       sub: 'Moins de 2 km',  maxKm: 2 },
  { id: 'any',    label: 'Peu importe',  sub: 'Paris entier',   maxKm: Infinity },
]

const CUISINES = [
  { id: 'all',        label: 'Peu importe', emoji: '✦' },
  { id: 'Restaurant', label: 'Restaurant',  emoji: '🍽' },
  { id: 'Café',       label: 'Café',        emoji: '☕' },
  { id: 'Bar',        label: 'Bar',         emoji: '🍷' },
]

const FRIENDS_LIST = [
  { id: 'eden',  name: 'Eden',  avatar: 'E' },
  { id: 'chloe', name: 'Chloé', avatar: 'C' },
]

function formatGCalDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
}

export default function CeSoirModal({ places, userId, onResult, onClose }: Props) {
  const [step,           setStep]           = useState<Step>('humeur')
  const [humeur,         setHumeur]         = useState<string | null>(null)
  const [proximite,      setProximite]      = useState<string | null>(null)
  const [userCoords,     setUserCoords]     = useState<Coords | null>(null)
  const [locating,       setLocating]       = useState(false)
  const [result,         setResult]         = useState<Place | null>(null)
  const [spinning,       setSpinning]       = useState(false)
  const [planDate,       setPlanDate]       = useState('')
  const [showPlan,       setShowPlan]       = useState(false)
  const [selectedGuests, setSelectedGuests] = useState<string[]>([])
  const [copied,         setCopied]         = useState(false)
  const [showReservation,setShowReservation] = useState(false)

  const wishlist = places.filter(p => p.status === 'wishlist')

  useEffect(() => {
    if (step === 'proximite' && !userCoords) {
      setLocating(true)
      navigator.geolocation?.getCurrentPosition(
        pos => { setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false) },
        ()  => setLocating(false),
        { timeout: 6000 }
      )
    }
  }, [step, userCoords])

  const pick = (selectedCuisine: string) => {
    setSpinning(true)
    setStep('result')
    let pool = wishlist
    if (selectedCuisine !== 'all') pool = pool.filter(p => p.category === selectedCuisine)
    if (proximite !== 'any' && userCoords) {
      const maxKm = PROXIMITES.find(p => p.id === proximite)?.maxKm ?? Infinity
      const nearby = pool.filter(p => haversine(userCoords, p) <= maxKm)
      if (nearby.length > 0) pool = nearby
    }
    if (pool.length === 0) pool = wishlist.filter(p => selectedCuisine === 'all' || p.category === selectedCuisine)
    if (pool.length === 0) pool = wishlist
    if (pool.length === 0) { setSpinning(false); return }
    setTimeout(() => {
      setResult(pool[Math.floor(Math.random() * pool.length)])
      setSpinning(false)
    }, 1400)
  }

  const goNow = () => {
    if (!result) return
    const dest = encodeURIComponent(result.address)
    const origin = userCoords ? `${userCoords.lat},${userCoords.lng}` : ''
    window.open(`https://www.google.com/maps/dir/${origin}/${dest}`, '_blank')
    onResult(result)
    onClose()
  }

  const openCalendar = () => {
    if (!result || !planDate) return
    const dt  = new Date(planDate)
    const end = new Date(dt.getTime() + 2 * 60 * 60 * 1000)
    const url = [
      'https://calendar.google.com/calendar/render?action=TEMPLATE',
      `&text=${encodeURIComponent('✦ ' + result.name)}`,
      `&location=${encodeURIComponent(result.address)}`,
      `&dates=${formatGCalDate(dt)}/${formatGCalDate(end)}`,
      `&details=${encodeURIComponent(result.description ?? result.address)}`,
    ].join('')
    window.open(url, '_blank')
  }

  const shareInvite = async () => {
    if (!result || !planDate) return
    const dt = new Date(planDate)
    const fDate = dt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    const fTime = dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const guestNames = selectedGuests.map(id => FRIENDS_LIST.find(f => f.id === id)?.name).filter(Boolean).join(', ')
    const addr = result.address.split(',').slice(0, 2).join(',')
    const parts = [
      `✦ ${result.name}`,
      addr,
      `${fDate} à ${fTime}`,
      guestNames ? `avec ${guestNames}` : null,
      ``,
      `Rejoins-moi sur Kaki → kaki.app`,
    ].filter(Boolean) as string[]
    const text = parts.join('\n')

    try {
      if (navigator.share) {
        await navigator.share({ text })
      } else {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch { /* user cancelled */ }
  }

  const toggleGuest = (id: string) =>
    setSelectedGuests(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id])

  const reset = () => {
    setStep('humeur'); setResult(null); setPlanDate(''); setShowPlan(false); setSelectedGuests([]); setShowReservation(false)
  }

  // ── Shared button style ────────────────────────────────────────────────────
  const secondaryBtn: React.CSSProperties = {
    padding: '11px', borderRadius: '12px', background: 'var(--surface-3)',
    border: '1px solid var(--border-2)', color: 'var(--cream-dim)',
    fontSize: '12px', cursor: 'pointer', letterSpacing: '0.03em',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'flex-end',
        background: 'rgba(9,10,8,0.75)', backdropFilter: 'blur(18px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        style={{ width: '100%', background: 'var(--surface)', borderRadius: '24px 24px 0 0',
          border: '1px solid var(--border-2)', borderBottom: 'none', maxHeight: '90dvh', overflowY: 'auto' }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '99px', background: 'var(--border-2)' }} />
        </div>

        <div style={{ padding: '14px 22px 48px' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
            <div>
              <p className="font-ui" style={{ fontSize: '9px', letterSpacing: '0.22em', color: 'var(--kaki)', textTransform: 'uppercase', marginBottom: '5px' }}>
                ✦ Kaki choisit
              </p>
              <h2 className="font-display font-medium" style={{ fontSize: '1.55rem', color: 'var(--cream)', fontStyle: 'italic', lineHeight: 1.1 }}>
                Ce soir, on va où ?
              </h2>
            </div>
            <button onClick={onClose}
              style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--surface-3)',
                border: 'none', color: 'var(--muted)', fontSize: '16px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
          </div>

          {/* Step dots */}
          {step !== 'humeur' && !spinning && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '18px' }}>
              {(['humeur', 'proximite', 'cuisine'] as Step[]).map((s, i) => {
                const order: Step[] = ['humeur', 'proximite', 'cuisine', 'result']
                const past = order.indexOf(s) < order.indexOf(step)
                const active = s === step
                return (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', transition: 'all 0.2s',
                      background: past || active ? 'var(--kaki)' : 'var(--border-2)', opacity: past ? 0.4 : 1 }} />
                    {i < 2 && <div style={{ width: '20px', height: '1px', background: past ? 'rgba(138,156,30,0.3)' : 'var(--border-2)' }} />}
                  </div>
                )
              })}
            </div>
          )}

          <AnimatePresence mode="wait">

            {/* ── Humeur ── */}
            {step === 'humeur' && (
              <motion.div key="humeur" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <p className="font-ui" style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Quelle humeur ?
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {HUMEURS.map(h => (
                    <button key={h.id} onClick={() => { setHumeur(h.id); setStep('proximite') }}
                      style={{ padding: '14px 16px', borderRadius: '14px', textAlign: 'left', cursor: 'pointer',
                        background: 'var(--surface-3)', border: '1px solid var(--border-2)',
                        display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '16px', opacity: 0.6 }}>{h.icon}</span>
                      <div>
                        <p className="font-ui font-medium" style={{ fontSize: '14px', color: 'var(--cream)', marginBottom: '2px' }}>{h.label}</p>
                        <p className="font-ui" style={{ fontSize: '11px', color: 'var(--muted)' }}>{h.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Proximité ── */}
            {step === 'proximite' && (
              <motion.div key="proximite" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <p className="font-ui" style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    À quelle distance ?
                  </p>
                  {locating && <p className="font-ui" style={{ fontSize: '10px', color: 'var(--accent)' }}>localisation…</p>}
                  {userCoords && !locating && <p className="font-ui" style={{ fontSize: '10px', color: 'var(--liked)' }}>✓ localisé</p>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {PROXIMITES.map(p => (
                    <button key={p.id} onClick={() => { setProximite(p.id); setStep('cuisine') }}
                      style={{ padding: '13px 16px', borderRadius: '14px', textAlign: 'left', cursor: 'pointer',
                        background: 'var(--surface-3)', border: '1px solid var(--border-2)',
                        display: 'flex', alignItems: 'center', gap: '12px',
                        opacity: (p.id !== 'any' && !userCoords) ? 0.5 : 1 }}>
                      <div>
                        <p className="font-ui font-medium" style={{ fontSize: '13px', color: 'var(--cream)', marginBottom: '1px' }}>{p.label}</p>
                        <p className="font-ui" style={{ fontSize: '11px', color: 'var(--muted)' }}>{p.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <button onClick={() => setStep('humeur')} className="font-ui"
                  style={{ marginTop: '14px', fontSize: '11px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  ← retour
                </button>
              </motion.div>
            )}

            {/* ── Cuisine ── */}
            {step === 'cuisine' && (
              <motion.div key="cuisine" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <p className="font-ui" style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Quel type d'endroit ?
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {CUISINES.map(c => (
                    <button key={c.id} onClick={() => pick(c.id)}
                      style={{ padding: '16px 10px', borderRadius: '14px', textAlign: 'center', cursor: 'pointer',
                        background: 'var(--surface-3)', border: '1px solid var(--border-2)' }}>
                      <p style={{ fontSize: '20px', marginBottom: '6px' }}>{c.emoji}</p>
                      <p className="font-ui font-medium" style={{ fontSize: '12px', color: 'var(--cream)' }}>{c.label}</p>
                    </button>
                  ))}
                </div>
                <button onClick={() => setStep('proximite')} className="font-ui"
                  style={{ marginTop: '14px', fontSize: '11px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  ← retour
                </button>
              </motion.div>
            )}

            {/* ── Résultat ── */}
            {step === 'result' && showReservation && result && (
              <motion.div key="reservation" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <ReservationForm place={result} userId={userId} onBack={() => setShowReservation(false)} />
              </motion.div>
            )}

            {step === 'result' && !showReservation && (
              <motion.div key="result" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                {spinning ? (
                  <div style={{ textAlign: 'center', padding: '36px 0' }}>
                    <motion.p
                      animate={{ opacity: [0.3, 1, 0.3], scale: [0.9, 1.1, 0.9] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="font-display"
                      style={{ fontSize: '2.2rem', color: 'var(--kaki-light)', fontStyle: 'italic' }}>
                      ✦
                    </motion.p>
                    <p className="font-ui" style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '14px', letterSpacing: '0.1em' }}>
                      Kaki réfléchit…
                    </p>
                  </div>

                ) : result ? (
                  <div>
                    {/* Result card */}
                    <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-2)', marginBottom: '14px' }}>
                      {result.coverPhoto && (
                        <div style={{ height: '110px', position: 'relative', overflow: 'hidden' }}>
                          <img src={result.coverPhoto} alt={result.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', inset: 0,
                            background: 'linear-gradient(to bottom, transparent 30%, var(--surface-3) 100%)' }} />
                        </div>
                      )}
                      <div style={{ background: 'var(--surface-3)', padding: '14px 16px' }}>
                        <p className="font-ui" style={{ fontSize: '9px', letterSpacing: '0.2em', color: 'var(--kaki)', textTransform: 'uppercase', marginBottom: '6px' }}>
                          ✦ Kaki a choisi
                        </p>
                        <h3 className="font-display font-medium"
                          style={{ fontSize: '1.45rem', color: 'var(--cream)', fontStyle: 'italic', lineHeight: 1.1, marginBottom: '5px' }}>
                          {result.name}
                        </h3>
                        <p className="font-ui" style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
                          {result.address.split(',').slice(0, 2).join(',')}
                          {result.priceRange && (
                            <span style={{ marginLeft: '8px', color: 'var(--cream-dim)' }}>{'€'.repeat(result.priceRange)}</span>
                          )}
                        </p>
                        {result.description && (
                          <p className="font-ui"
                            style={{ fontSize: '12px', color: 'var(--cream-dim)', lineHeight: 1.6, opacity: 0.75, marginTop: '8px' }}>
                            {result.description.length > 90 ? result.description.slice(0, 90) + '…' : result.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Primary CTA — opens itinerary */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                      <button onClick={goNow} className="font-ui font-semibold"
                        style={{ flex: 1, padding: '14px', borderRadius: '14px', background: 'var(--cream)',
                          color: 'var(--bg)', border: 'none', fontSize: '12px', letterSpacing: '0.06em', cursor: 'pointer' }}>
                        On y va →
                      </button>
                      <button onClick={reset}
                        style={{ width: '46px', padding: '14px', borderRadius: '14px', background: 'var(--surface-3)',
                          color: 'var(--muted)', border: '1px solid var(--border-2)', fontSize: '14px', cursor: 'pointer' }}>
                        ↻
                      </button>
                    </div>

                    {/* Secondary actions — no emojis */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                      <button onClick={() => setShowReservation(true)} className="font-ui font-medium" style={secondaryBtn}>
                        Réserver
                      </button>
                      <button onClick={() => setShowPlan(!showPlan)} className="font-ui font-medium"
                        style={{ ...secondaryBtn,
                          background: showPlan ? 'rgba(138,156,30,0.1)' : 'var(--surface-3)',
                          border: showPlan ? '1px solid rgba(138,156,30,0.3)' : '1px solid var(--border-2)',
                          color: showPlan ? 'var(--kaki-light)' : 'var(--cream-dim)' }}>
                        Planifier
                      </button>
                    </div>

                    {/* Planning section */}
                    <AnimatePresence>
                      {showPlan && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                          <div style={{ background: 'var(--surface-3)', borderRadius: '16px',
                            padding: '16px', marginBottom: '10px', border: '1px solid var(--border-2)',
                            display: 'flex', flexDirection: 'column', gap: '14px' }}>

                            {/* Date picker */}
                            <div>
                              <p className="font-ui" style={{ fontSize: '10px', letterSpacing: '0.14em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                                Date et heure
                              </p>
                              <input
                                type="datetime-local"
                                value={planDate}
                                onChange={e => setPlanDate(e.target.value)}
                                style={{ background: 'var(--surface)', border: '1px solid var(--border-2)',
                                  borderRadius: '10px', color: 'var(--cream)', padding: '10px 14px',
                                  fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
                                  fontSize: '13px', outline: 'none', colorScheme: 'dark', width: '100%' }}
                              />
                            </div>

                            {/* Guest picker */}
                            <div>
                              <p className="font-ui" style={{ fontSize: '10px', letterSpacing: '0.14em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
                                Qui vient ?
                              </p>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                {FRIENDS_LIST.map(f => {
                                  const selected = selectedGuests.includes(f.id)
                                  return (
                                    <button key={f.id} onClick={() => toggleGuest(f.id)}
                                      style={{ display: 'flex', alignItems: 'center', gap: '8px',
                                        padding: '8px 14px 8px 8px', borderRadius: '99px', cursor: 'pointer',
                                        background: selected ? 'rgba(138,156,30,0.15)' : 'var(--surface)',
                                        border: `1px solid ${selected ? 'rgba(138,156,30,0.45)' : 'var(--border-2)'}`,
                                        transition: 'all 0.15s' }}>
                                      <div style={{ width: '24px', height: '24px', borderRadius: '50%',
                                        background: selected ? 'var(--kaki)' : 'var(--surface-3)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: 'background 0.15s', flexShrink: 0 }}>
                                        <span className="font-ui font-semibold" style={{ fontSize: '10px', color: selected ? '#fff' : 'var(--muted)' }}>
                                          {f.avatar}
                                        </span>
                                      </div>
                                      <span className="font-ui font-medium"
                                        style={{ fontSize: '12px', color: selected ? 'var(--kaki-light)' : 'var(--cream-dim)' }}>
                                        {f.name}
                                      </span>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <button onClick={shareInvite} disabled={!planDate}
                                className="font-ui font-semibold"
                                style={{ padding: '12px', borderRadius: '12px',
                                  background: planDate ? 'var(--kaki)' : 'var(--surface)',
                                  border: planDate ? 'none' : '1px solid var(--border-2)',
                                  color: planDate ? '#fff' : 'var(--muted)',
                                  fontSize: '12px', cursor: planDate ? 'pointer' : 'default',
                                  letterSpacing: '0.04em', transition: 'all 0.2s',
                                  opacity: planDate ? 1 : 0.5 }}>
                                {copied ? '✓ Invitation copiée !' : selectedGuests.length > 0
                                  ? `Inviter ${selectedGuests.map(id => FRIENDS_LIST.find(f => f.id === id)?.name).join(' & ')}`
                                  : 'Envoyer l\'invitation'}
                              </button>

                              <button onClick={openCalendar} disabled={!planDate}
                                className="font-ui font-medium" style={secondaryBtn}>
                                Ajouter à Google Agenda
                              </button>
                            </div>

                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
