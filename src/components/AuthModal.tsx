import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { sendOtp, verifyOtp } from '../lib/auth'

type Step = 'phone' | 'otp'

export default function AuthModal() {
  const [step,    setStep]    = useState<Step>('phone')
  const [email,   setEmail]   = useState('')
  const [otp,     setOtp]     = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Focus premier champ OTP quand on arrive à cette étape
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    }
  }, [step])

  // ── Étape 1 : envoi du code ───────────────────────────────────────────────
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await sendOtp(email.trim())
    setLoading(false)
    if (error) { setError(error); return }
    setStep('otp')
  }

  // ── Étape 2 : vérification du code ───────────────────────────────────────
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    const token = otp.join('')
    if (token.length < 6) { setError('Entre les 6 chiffres reçus par email.'); return }
    setError(null)
    setLoading(true)
    const { error } = await verifyOtp(email.trim(), token)
    setLoading(false)
    if (error) { setError(error); setOtp(['', '', '', '', '', '']); inputRefs.current[0]?.focus() }
    // Si OK → onAuthStateChange dans AuthProvider met à jour le user → AuthModal disparaît
  }

  // ── Saisie OTP chiffre par chiffre ────────────────────────────────────────
  function handleOtpChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) return
    const next = [...otp]
    next[index] = value
    setOtp(next)
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && index > 0)  inputRefs.current[index - 1]?.focus()
    if (e.key === 'ArrowRight' && index < 5) inputRefs.current[index + 1]?.focus()
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(''))
      inputRefs.current[5]?.focus()
    }
  }

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(10,10,8,0.92)', backdropFilter: 'blur(12px)',
      }}
    >
      <AnimatePresence mode="wait">
        {step === 'phone' ? (
          <motion.div
            key="phone"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            style={{
              width: 'min(360px, calc(100vw - 40px))',
              background: 'var(--surface)',
              borderRadius: '24px',
              border: '1px solid var(--border-2)',
              padding: '36px 28px 32px',
              boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <p className="font-display font-medium"
                style={{ fontSize: '2rem', letterSpacing: '0.16em', color: 'var(--cream)', fontStyle: 'italic', marginBottom: '8px' }}>
                kaki
              </p>
              <p className="font-ui"
                style={{ fontSize: '13px', color: 'var(--muted)', letterSpacing: '0.04em', lineHeight: 1.5 }}>
                Tes adresses, celles de tes amis.
              </p>
            </div>

            <form onSubmit={handleSendOtp}>
              <label className="font-ui"
                style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
                Adresse email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="toi@exemple.com"
                autoFocus
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--surface-3)', border: '1px solid var(--border-2)',
                  borderRadius: '12px', color: 'var(--cream)',
                  padding: '14px 16px', fontSize: '15px',
                  fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
                  outline: 'none', letterSpacing: '0.04em',
                }}
              />

              {error && (
                <p className="font-ui" style={{ fontSize: '12px', color: '#e05c6a', marginTop: '10px', letterSpacing: '0.02em' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim().includes('@')}
                className="font-ui font-semibold"
                style={{
                  width: '100%', marginTop: '16px',
                  background: loading ? 'var(--surface-3)' : 'var(--cream)',
                  color: 'var(--bg)', border: 'none', borderRadius: '12px',
                  padding: '14px', fontSize: '13px', letterSpacing: '0.08em',
                  cursor: loading ? 'default' : 'pointer',
                  opacity: !email.trim().includes('@') ? 0.4 : 1,
                  transition: 'all 0.15s',
                }}
              >
                {loading ? 'Envoi…' : 'Recevoir le code →'}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="otp"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            style={{
              width: 'min(360px, calc(100vw - 40px))',
              background: 'var(--surface)',
              borderRadius: '24px',
              border: '1px solid var(--border-2)',
              padding: '36px 28px 32px',
              boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
            }}
          >
            <button
              onClick={() => { setStep('phone'); setError(null); setOtp(['','','','','','']) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '12px', letterSpacing: '0.04em', marginBottom: '24px', padding: 0 }}
              className="font-ui"
            >
              ← Retour
            </button>

            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <p className="font-display font-medium"
                style={{ fontSize: '1.4rem', color: 'var(--cream)', fontStyle: 'italic', marginBottom: '8px' }}>
                Code reçu ?
              </p>
              <p className="font-ui"
                style={{ fontSize: '13px', color: 'var(--muted)', letterSpacing: '0.02em', lineHeight: 1.5 }}>
                On t'a envoyé un code à<br />
                <span style={{ color: 'var(--cream)' }}>{email}</span>
              </p>
            </div>

            <form onSubmit={handleVerifyOtp}>
              {/* 6 champs OTP */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '8px' }} onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { inputRefs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    style={{
                      width: '44px', height: '52px', textAlign: 'center',
                      background: digit ? 'rgba(255,255,255,0.1)' : 'var(--surface-3)',
                      border: '1px solid var(--border-2)',
                      borderRadius: '10px', color: 'var(--cream)',
                      fontSize: '20px', fontWeight: 600,
                      fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
                      outline: 'none', transition: 'background 0.15s',
                    }}
                  />
                ))}
              </div>

              {error && (
                <p className="font-ui" style={{ fontSize: '12px', color: '#e05c6a', textAlign: 'center', marginTop: '8px', letterSpacing: '0.02em' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || otp.join('').length < 6}
                className="font-ui font-semibold"
                style={{
                  width: '100%', marginTop: '20px',
                  background: loading ? 'var(--surface-3)' : 'var(--cream)',
                  color: 'var(--bg)', border: 'none', borderRadius: '12px',
                  padding: '14px', fontSize: '13px', letterSpacing: '0.08em',
                  cursor: loading ? 'default' : 'pointer',
                  opacity: otp.join('').length < 6 ? 0.4 : 1,
                  transition: 'all 0.15s',
                }}
              >
                {loading ? 'Vérification…' : 'Entrer →'}
              </button>

              <button
                type="button"
                onClick={() => { setOtp(['','','','','','']); setError(null); sendOtp(email.trim()) }}
                className="font-ui"
                style={{ width: '100%', marginTop: '12px', background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--muted)', fontSize: '12px', letterSpacing: '0.04em' }}
              >
                Renvoyer le code
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
