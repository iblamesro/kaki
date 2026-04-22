import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Place } from '../types'
import { supabase } from '../lib/supabase'

interface Props {
  place: Place
  userId: string
  onBack: () => void
}

interface FormData {
  guestName: string
  guestEmail: string
  guestPhone: string
  date: string
  time: string
  partySize: number
  message: string
}

type Step = 'form' | 'sending' | 'success' | 'error'

export default function ReservationForm({ place, userId, onBack }: Props) {
  const [step, setStep]           = useState<Step>('form')
  const [trackingCode, setCode]   = useState('')
  const [errorMsg, setError]      = useState('')
  const [form, setForm]           = useState<FormData>({
    guestName: '', guestEmail: '', guestPhone: '',
    date: '', time: '20:00', partySize: 2, message: '',
  })

  const proxyUrl = import.meta.env.VITE_PROXY_WORKER_URL as string

  const set = (k: keyof FormData, v: string | number) =>
    setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStep('sending')
    try {
      const reservationDate = new Date(`${form.date}T${form.time}:00`)

      const { data, error } = await supabase
        .from('reservations')
        .insert({
          place_id:         place.id,
          user_id:          userId,
          guest_name:       form.guestName,
          guest_email:      form.guestEmail,
          guest_phone:      form.guestPhone || null,
          party_size:       form.partySize,
          reservation_date: reservationDate.toISOString(),
          message:          form.message || null,
          status:           'pending',
        })
        .select('tracking_code')
        .single()

      if (error) throw error

      const code = data.tracking_code as string
      setCode(code)

      // Fire-and-forget — email via CF Worker (RESEND_API_KEY stays server-side)
      fetch(`${proxyUrl}/send-reservation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeName:        place.name,
          placeAddress:     place.address,
          restaurantEmail:  (place as any).restaurantEmail ?? null,
          guestName:        form.guestName,
          guestEmail:       form.guestEmail,
          guestPhone:       form.guestPhone,
          partySize:        form.partySize,
          reservationDate:  reservationDate.toISOString(),
          message:          form.message,
          trackingCode:     code,
        }),
      }).catch(() => { /* non-bloquant */ })

      setStep('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setStep('error')
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--surface)', border: '1px solid var(--border-2)',
    borderRadius: '10px', color: 'var(--cream)', padding: '11px 14px',
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
    fontSize: '13px', outline: 'none', colorScheme: 'dark', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '9px', letterSpacing: '0.18em', color: 'var(--muted)',
    textTransform: 'uppercase', display: 'block', marginBottom: '6px',
  }

  return (
    <AnimatePresence mode="wait">
      {step === 'sending' && (
        <motion.div key="sending" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ textAlign: 'center', padding: '40px 0' }}>
          <motion.p animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }}
            className="font-display" style={{ fontSize: '2rem', color: 'var(--kaki-light)', fontStyle: 'italic' }}>✦</motion.p>
          <p className="font-ui" style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '14px', letterSpacing: '0.1em' }}>
            Envoi en cours…
          </p>
        </motion.div>
      )}

      {step === 'success' && (
        <motion.div key="success" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', padding: '24px 0' }}>
          <p style={{ fontSize: '2rem', marginBottom: '12px' }}>✦</p>
          <h3 className="font-display font-medium" style={{ fontSize: '1.3rem', color: 'var(--cream)', fontStyle: 'italic', marginBottom: '8px' }}>
            Demande envoyée
          </h3>
          <p className="font-ui" style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '18px', lineHeight: 1.6 }}>
            Le restaurant a reçu ta demande.<br />Un email de confirmation a été envoyé à {form.guestEmail}.
          </p>
          <div style={{ background: 'var(--surface-3)', border: '1px solid var(--border-2)',
            borderRadius: '12px', padding: '14px', marginBottom: '18px' }}>
            <p className="font-ui" style={{ fontSize: '9px', letterSpacing: '0.18em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Code de suivi
            </p>
            <p className="font-ui font-semibold" style={{ fontSize: '18px', color: 'var(--kaki-light)', letterSpacing: '0.12em' }}>
              {trackingCode}
            </p>
          </div>
          <button onClick={onBack} className="font-ui font-medium"
            style={{ padding: '12px 24px', borderRadius: '12px', background: 'var(--cream)',
              color: 'var(--bg)', border: 'none', fontSize: '12px', cursor: 'pointer', letterSpacing: '0.06em' }}>
            Retour
          </button>
        </motion.div>
      )}

      {step === 'error' && (
        <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ textAlign: 'center', padding: '32px 0' }}>
          <p className="font-ui" style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '8px' }}>
            Une erreur est survenue
          </p>
          <p className="font-ui" style={{ color: 'var(--muted)', fontSize: '11px', marginBottom: '18px', opacity: 0.6 }}>
            {errorMsg}
          </p>
          <button onClick={() => setStep('form')} className="font-ui"
            style={{ fontSize: '11px', color: 'var(--cream-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Réessayer
          </button>
        </motion.div>
      )}

      {step === 'form' && (
        <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <button onClick={onBack} className="font-ui"
              style={{ fontSize: '11px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
              ←
            </button>
            <div>
              <p className="font-ui" style={{ fontSize: '9px', letterSpacing: '0.2em', color: 'var(--kaki)', textTransform: 'uppercase', marginBottom: '3px' }}>
                Réserver
              </p>
              <p className="font-display font-medium" style={{ fontSize: '1.1rem', color: 'var(--cream)', fontStyle: 'italic', lineHeight: 1.1 }}>
                {place.name}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="font-ui" style={labelStyle}>Nom complet *</label>
              <input style={inputStyle} type="text" required placeholder="Jean Dupont"
                value={form.guestName} onChange={e => set('guestName', e.target.value)} />
            </div>

            <div>
              <label className="font-ui" style={labelStyle}>Email *</label>
              <input style={inputStyle} type="email" required placeholder="jean@example.com"
                value={form.guestEmail} onChange={e => set('guestEmail', e.target.value)} />
            </div>

            <div>
              <label className="font-ui" style={labelStyle}>Téléphone</label>
              <input style={inputStyle} type="tel" placeholder="+33 6 12 34 56 78"
                value={form.guestPhone} onChange={e => set('guestPhone', e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label className="font-ui" style={labelStyle}>Date *</label>
                <input style={inputStyle} type="date" required
                  min={new Date().toISOString().split('T')[0]}
                  value={form.date} onChange={e => set('date', e.target.value)} />
              </div>
              <div>
                <label className="font-ui" style={labelStyle}>Heure *</label>
                <input style={inputStyle} type="time" required
                  value={form.time} onChange={e => set('time', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="font-ui" style={labelStyle}>Nombre de personnes *</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <button type="button"
                  onClick={() => set('partySize', Math.max(1, form.partySize - 1))}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--surface-3)',
                    border: '1px solid var(--border-2)', color: 'var(--cream)', fontSize: '18px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>−</button>
                <span className="font-ui font-semibold" style={{ fontSize: '20px', color: 'var(--cream)', minWidth: '32px', textAlign: 'center' }}>
                  {form.partySize}
                </span>
                <button type="button"
                  onClick={() => set('partySize', Math.min(20, form.partySize + 1))}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--surface-3)',
                    border: '1px solid var(--border-2)', color: 'var(--cream)', fontSize: '18px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>
              </div>
            </div>

            <div>
              <label className="font-ui" style={labelStyle}>Message (optionnel)</label>
              <textarea style={{ ...inputStyle, resize: 'none', height: '72px' } as React.CSSProperties}
                placeholder="Allergie, occasion spéciale…"
                value={form.message} onChange={e => set('message', e.target.value)} />
            </div>

            <button type="submit" className="font-ui font-semibold"
              style={{ padding: '14px', borderRadius: '14px', background: 'var(--cream)',
                color: 'var(--bg)', border: 'none', fontSize: '12px', letterSpacing: '0.06em',
                cursor: 'pointer', marginTop: '4px' }}>
              Envoyer la demande →
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
