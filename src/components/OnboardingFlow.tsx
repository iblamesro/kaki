import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

interface Props {
  userId: string
  onDone: () => void
}

type Step = 'username' | 'first-place' | 'invite'

interface PlaceData {
  name: string
  address: string
  category: string
}

export default function OnboardingFlow({ userId, onDone }: Props) {
  const [step,      setStep]     = useState<Step>('username')
  const [username,  setUsername] = useState('')
  const [error,     setError]    = useState('')
  const [saving,    setSaving]   = useState(false)
  const [place,     setPlace]    = useState<PlaceData>({ name: '', address: '', category: 'Restaurant' })
  const [copied,    setCopied]   = useState(false)
  const [skipping,  setSkipping] = useState(false)

  const saveUsername = async () => {
    const trimmed = username.trim().toLowerCase()
    if (trimmed.length < 2) { setError('Au moins 2 caractères.'); return }
    if (!/^[a-z0-9_.-]+$/.test(trimmed)) { setError('Lettres, chiffres, _ . - uniquement.'); return }
    setSaving(true); setError('')
    const { error: err } = await supabase
      .from('users')
      .upsert({ id: userId, username: trimmed })
    setSaving(false)
    if (err) { setError(err.message.includes('unique') ? 'Ce pseudo est déjà pris.' : err.message); return }
    setStep('first-place')
  }

  const savePlace = async () => {
    if (!place.name.trim()) { setStep('invite'); return }
    setSaving(true)
    await supabase.from('places').insert({
      user_id:  userId,
      name:     place.name.trim(),
      address:  place.address.trim() || 'Paris',
      category: place.category,
      lat:      48.8566,
      lng:      2.3522,
      status:   'wishlist',
    })
    setSaving(false)
    setStep('invite')
  }

  const finish = async () => {
    setSkipping(true)
    // fire-and-forget — on passe même si la colonne n'existe pas encore en base
    supabase.from('users').update({ onboarding_completed: true }).eq('id', userId).then(() => {})
    onDone()
  }

  const shareInvite = async () => {
    const text = `Rejoins-moi sur Kaki — l'app pour sauvegarder tes adresses préférées à Paris ✦ https://kaki.app`
    try {
      if (navigator.share) {
        await navigator.share({ text })
      } else {
        await navigator.clipboard.writeText(text)
        setCopied(true)
      }
      // Avancer automatiquement après partage réussi
      await finish()
    } catch { /* user cancelled */ }
  }

  const CATEGORIES = ['Restaurant', 'Café', 'Bar', 'Boutique', 'Activité']

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--surface-3)', border: '1px solid var(--border-2)',
    borderRadius: '12px', color: 'var(--cream)', padding: '13px 16px',
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  }

  const primaryBtn: React.CSSProperties = {
    width: '100%', padding: '15px', borderRadius: '14px', background: 'var(--cream)',
    color: 'var(--bg)', border: 'none', fontSize: '13px', fontWeight: 600,
    letterSpacing: '0.06em', cursor: 'pointer',
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
  }

  const steps: Step[] = ['username', 'first-place', 'invite']
  const stepIdx = steps.indexOf(step)

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'var(--bg)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '24px' }}
    >
      {/* Logo */}
      <p className="font-display font-medium"
        style={{ fontSize: '1.6rem', color: 'var(--cream)', fontStyle: 'italic', letterSpacing: '0.14em', marginBottom: '40px', opacity: 0.9 }}>
        kaki
      </p>

      {/* Step dots */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '32px' }}>
        {steps.map((s, i) => (
          <div key={s} style={{ width: '6px', height: '6px', borderRadius: '50%', transition: 'all 0.3s',
            background: i <= stepIdx ? 'var(--kaki)' : 'var(--border-2)',
            opacity: i < stepIdx ? 0.4 : 1 }} />
        ))}
      </div>

      <div style={{ width: '100%', maxWidth: '380px' }}>
        <AnimatePresence mode="wait">

          {/* ── Step 1 : Username ── */}
          {step === 'username' && (
            <motion.div key="username" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <h2 className="font-display font-medium"
                style={{ fontSize: '1.7rem', color: 'var(--cream)', fontStyle: 'italic', marginBottom: '10px' }}>
                Choisis ton pseudo
              </h2>
              <p className="font-ui" style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px', lineHeight: 1.6 }}>
                Tes amis te retrouvent par pseudo. Tu pourras le changer plus tard.
              </p>
              <div style={{ marginBottom: '16px' }}>
                <input
                  style={inputStyle}
                  type="text"
                  placeholder="ex: sara.b"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && saveUsername()}
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect="off"
                />
                {error && (
                  <p className="font-ui" style={{ fontSize: '11px', color: '#e07070', marginTop: '6px' }}>{error}</p>
                )}
              </div>
              <button onClick={saveUsername} disabled={saving} className="font-ui" style={primaryBtn}>
                {saving ? '…' : 'Continuer →'}
              </button>
            </motion.div>
          )}

          {/* ── Step 2 : Premier lieu ── */}
          {step === 'first-place' && (
            <motion.div key="place" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <h2 className="font-display font-medium"
                style={{ fontSize: '1.7rem', color: 'var(--cream)', fontStyle: 'italic', marginBottom: '10px' }}>
                Ton premier endroit
              </h2>
              <p className="font-ui" style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px', lineHeight: 1.6 }}>
                Un resto, un café, un bar — l'endroit dont tu parles tout le temps.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                <input
                  style={inputStyle}
                  type="text"
                  placeholder="Nom du lieu *"
                  value={place.name}
                  onChange={e => setPlace(p => ({ ...p, name: e.target.value }))}
                  autoFocus
                />
                <input
                  style={inputStyle}
                  type="text"
                  placeholder="Adresse (optionnel)"
                  value={place.address}
                  onChange={e => setPlace(p => ({ ...p, address: e.target.value }))}
                />
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {CATEGORIES.map(c => (
                    <button key={c} onClick={() => setPlace(p => ({ ...p, category: c }))}
                      className="font-ui font-medium"
                      style={{ padding: '7px 14px', borderRadius: '99px', fontSize: '11px', cursor: 'pointer',
                        background: place.category === c ? 'rgba(138,156,30,0.2)' : 'var(--surface-3)',
                        border: `1px solid ${place.category === c ? 'rgba(138,156,30,0.5)' : 'var(--border-2)'}`,
                        color: place.category === c ? 'var(--kaki-light)' : 'var(--muted)',
                        transition: 'all 0.15s' }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={savePlace} disabled={saving} className="font-ui" style={primaryBtn}>
                {saving ? '…' : place.name.trim() ? 'Ajouter →' : 'Passer →'}
              </button>
            </motion.div>
          )}

          {/* ── Step 3 : Inviter ── */}
          {step === 'invite' && (
            <motion.div key="invite" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <h2 className="font-display font-medium"
                style={{ fontSize: '1.7rem', color: 'var(--cream)', fontStyle: 'italic', marginBottom: '10px' }}>
                Invite un ami
              </h2>
              <p className="font-ui" style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px', lineHeight: 1.6 }}>
                Kaki est mieux à plusieurs — partage tes adresses, votez pour ce soir.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                <button onClick={shareInvite} className="font-ui font-semibold" style={primaryBtn}>
                  {copied ? '✓ Lien copié !' : 'Partager Kaki'}
                </button>
                <button onClick={finish} disabled={skipping} className="font-ui"
                  style={{ width: '100%', padding: '13px', borderRadius: '14px', background: 'none',
                    border: '1px solid var(--border-2)', color: 'var(--muted)', fontSize: '12px',
                    cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
                    letterSpacing: '0.04em' }}>
                  {skipping ? '…' : 'Commencer sans inviter'}
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  )
}
