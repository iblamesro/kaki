import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

interface ReservationInfo {
  guest_name: string
  guest_email: string
  party_size: number
  reservation_date: string
  message: string | null
  status: string
  place_name?: string
  place_address?: string
}

interface Props {
  trackingCode: string
}

export default function ConfirmReservation({ trackingCode }: Props) {
  const [info,       setInfo]       = useState<ReservationInfo | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [done,       setDone]       = useState(false)
  const [error,      setError]      = useState('')

  useEffect(() => {
    void (async () => {
      const { data, error: err } = await supabase
        .rpc('get_reservation_by_code', { p_code: trackingCode })
      if (err || !data) {
        setError('Réservation introuvable.')
      } else {
        setInfo(data as ReservationInfo)
      }
      setLoading(false)
    })()
  }, [trackingCode])

  const confirm = async () => {
    setConfirming(true)
    const { error: err } = await supabase
      .rpc('confirm_reservation', { p_code: trackingCode })
    setConfirming(false)
    if (err) { setError(err.message); return }
    setDone(true)
    if (info) setInfo({ ...info, status: 'confirmed' })
  }

  const date = info?.reservation_date
    ? new Date(info.reservation_date).toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : ''
  const time = info?.reservation_date
    ? new Date(info.reservation_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '24px' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <p className="font-display font-medium"
          style={{ fontSize: '1.4rem', color: 'var(--cream)', fontStyle: 'italic', letterSpacing: '0.14em',
            marginBottom: '32px', textAlign: 'center', opacity: 0.8 }}>
          kaki
        </p>

        {loading && (
          <p className="font-ui" style={{ color: 'var(--muted)', fontSize: '13px', textAlign: 'center' }}>
            Chargement…
          </p>
        )}

        {error && (
          <div style={{ textAlign: 'center' }}>
            <p className="font-ui" style={{ color: 'var(--muted)', fontSize: '14px' }}>{error}</p>
          </div>
        )}

        {info && !loading && (
          <div style={{ background: 'var(--surface)', borderRadius: '20px', border: '1px solid var(--border-2)',
            overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ background: 'var(--surface-3)', padding: '20px 22px', borderBottom: '1px solid var(--border-2)' }}>
              <p className="font-ui" style={{ fontSize: '9px', letterSpacing: '0.2em', color: 'var(--kaki)',
                textTransform: 'uppercase', marginBottom: '6px' }}>
                ✦ Demande de réservation
              </p>
              <h2 className="font-display font-medium"
                style={{ fontSize: '1.4rem', color: 'var(--cream)', fontStyle: 'italic', lineHeight: 1.1 }}>
                {info.place_name ?? 'Votre restaurant'}
              </h2>
              {info.place_address && (
                <p className="font-ui" style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                  {info.place_address}
                </p>
              )}
            </div>

            {/* Details */}
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'Client',    value: info.guest_name },
                { label: 'Email',     value: info.guest_email },
                { label: 'Date',      value: `${date} à ${time}` },
                { label: 'Couverts',  value: `${info.party_size} personne${info.party_size > 1 ? 's' : ''}` },
                ...(info.message ? [{ label: 'Message', value: info.message }] : []),
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', gap: '12px' }}>
                  <span className="font-ui" style={{ fontSize: '11px', color: 'var(--muted)', width: '70px', flexShrink: 0, paddingTop: '1px' }}>
                    {row.label}
                  </span>
                  <span className="font-ui" style={{ fontSize: '13px', color: 'var(--cream)', flex: 1 }}>
                    {row.value}
                  </span>
                </div>
              ))}

              {/* Status badge */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', paddingTop: '4px' }}>
                <span className="font-ui" style={{ fontSize: '11px', color: 'var(--muted)', width: '70px', flexShrink: 0 }}>
                  Statut
                </span>
                <span className="font-ui font-semibold" style={{
                  fontSize: '11px', padding: '4px 12px', borderRadius: '99px',
                  background: info.status === 'confirmed'
                    ? 'rgba(138,156,30,0.15)' : 'rgba(255,200,50,0.1)',
                  color: info.status === 'confirmed'
                    ? 'var(--kaki-light)' : '#d4a53a',
                  border: `1px solid ${info.status === 'confirmed' ? 'rgba(138,156,30,0.35)' : 'rgba(212,165,58,0.3)'}`,
                }}>
                  {info.status === 'confirmed' ? '✓ Confirmée' : 'En attente'}
                </span>
              </div>
            </div>

            {/* CTA */}
            {info.status !== 'confirmed' && (
              <div style={{ padding: '0 22px 22px' }}>
                {done ? (
                  <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(138,156,30,0.1)',
                    borderRadius: '12px', border: '1px solid rgba(138,156,30,0.25)' }}>
                    <p className="font-ui font-semibold" style={{ fontSize: '13px', color: 'var(--kaki-light)' }}>
                      ✓ Réservation confirmée
                    </p>
                    <p className="font-ui" style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                      Un email a été envoyé à {info.guest_email}
                    </p>
                  </div>
                ) : (
                  <button onClick={confirm} disabled={confirming}
                    className="font-ui font-semibold"
                    style={{ width: '100%', padding: '14px', borderRadius: '14px', background: 'var(--kaki)',
                      color: '#fff', border: 'none', fontSize: '13px', letterSpacing: '0.06em',
                      cursor: confirming ? 'default' : 'pointer', opacity: confirming ? 0.7 : 1 }}>
                    {confirming ? '…' : 'Confirmer la réservation'}
                  </button>
                )}
              </div>
            )}

          </div>
        )}

        {/* Code */}
        <p className="font-ui" style={{ textAlign: 'center', fontSize: '11px', color: 'var(--muted)',
          marginTop: '20px', opacity: 0.5, letterSpacing: '0.1em' }}>
          Code · {trackingCode}
        </p>

      </motion.div>
    </div>
  )
}
