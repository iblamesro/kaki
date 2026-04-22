import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

interface GroupPreview {
  name: string
  member_count: number
  places: Array<{ name: string; cover_photo: string | null; category: string }>
}

interface Props {
  inviteCode: string
}

const CAT_BG: Record<string, string> = {
  Restaurant: '#1C1A12', Café: '#1A150E', Bar: '#180E14',
  Boutique: '#0E1318', Activité: '#121818', Autre: '#141414',
}

export default function InvitePage({ inviteCode }: Props) {
  const { user } = useAuth()
  const [preview,  setPreview]  = useState<GroupPreview | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [joining,  setJoining]  = useState(false)
  const [joined,   setJoined]   = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    void (async () => {
      const { data, error: err } = await supabase
        .rpc('get_group_preview', { p_code: inviteCode })
      if (err || !data) {
        setError('Lien d\'invitation invalide ou expiré.')
      } else {
        setPreview(data as GroupPreview)
      }
      setLoading(false)
    })()
  }, [inviteCode])

  const join = async () => {
    if (!user) {
      // Stocker le code pour rejoindre après auth
      sessionStorage.setItem('pending_invite', inviteCode)
      window.location.href = '/'
      return
    }
    setJoining(true)
    const { data: groupId, error: err } = await supabase
      .rpc('join_group_by_invite', { p_code: inviteCode })
    setJoining(false)
    if (err || !groupId) {
      setError('Impossible de rejoindre ce groupe.')
      return
    }
    setJoined(true)
  }

  // Redirect to app after join
  useEffect(() => {
    if (joined) {
      setTimeout(() => { window.location.href = '/' }, 1800)
    }
  }, [joined])

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '24px' }}>

      {/* Logo */}
      <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="font-display font-medium"
        style={{ fontSize: '1.5rem', color: 'var(--cream)', fontStyle: 'italic', letterSpacing: '0.14em',
          marginBottom: '36px', opacity: 0.85 }}>
        kaki
      </motion.p>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        style={{ width: '100%', maxWidth: '400px' }}>

        {loading && (
          <p className="font-ui" style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
            Chargement…
          </p>
        )}

        {error && (
          <div style={{ textAlign: 'center' }}>
            <p className="font-ui" style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '16px' }}>{error}</p>
            <a href="/" className="font-ui"
              style={{ fontSize: '12px', color: 'var(--cream-dim)', textDecoration: 'none' }}>
              Ouvrir Kaki →
            </a>
          </div>
        )}

        {preview && !loading && (
          <>
            {/* Invite card */}
            <div style={{ background: 'var(--surface)', borderRadius: '20px', border: '1px solid var(--border-2)',
              overflow: 'hidden', marginBottom: '16px' }}>

              {/* Header */}
              <div style={{ padding: '22px 22px 18px', borderBottom: '1px solid var(--border-2)' }}>
                <p className="font-ui" style={{ fontSize: '9px', letterSpacing: '0.2em', color: 'var(--kaki)',
                  textTransform: 'uppercase', marginBottom: '8px' }}>
                  ✦ Invitation au groupe
                </p>
                <h2 className="font-display font-medium"
                  style={{ fontSize: '1.6rem', color: 'var(--cream)', fontStyle: 'italic', lineHeight: 1.1, marginBottom: '8px' }}>
                  {preview.name}
                </h2>
                <p className="font-ui" style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  {preview.member_count} membre{preview.member_count !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Preview places */}
              {preview.places.length > 0 && (
                <div style={{ padding: '16px 22px' }}>
                  <p className="font-ui" style={{ fontSize: '9px', letterSpacing: '0.16em', color: 'var(--muted)',
                    textTransform: 'uppercase', marginBottom: '12px' }}>
                    Dernières adresses
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {preview.places.slice(0, 3).map((p, i) => (
                      <div key={i} style={{ flex: 1, borderRadius: '10px', overflow: 'hidden', aspectRatio: '3/4',
                        position: 'relative', background: CAT_BG[p.category] ?? '#141414',
                        filter: !user ? 'blur(6px)' : 'none', transition: 'filter 0.3s' }}>
                        {p.cover_photo && (
                          <img src={p.cover_photo} alt=""
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                        <div style={{ position: 'absolute', inset: 0,
                          background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.75) 100%)' }} />
                        <p className="font-display font-medium"
                          style={{ position: 'absolute', bottom: '6px', left: '6px', right: '6px',
                            fontSize: '0.7rem', color: '#fff', fontStyle: 'italic', lineHeight: 1.2,
                            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical' } as React.CSSProperties}>
                          {p.name}
                        </p>
                      </div>
                    ))}
                  </div>
                  {!user && (
                    <p className="font-ui" style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center',
                      marginTop: '10px', opacity: 0.6 }}>
                      Rejoins le groupe pour voir les adresses
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* CTA */}
            {joined ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ textAlign: 'center', padding: '20px', background: 'rgba(138,156,30,0.1)',
                  borderRadius: '16px', border: '1px solid rgba(138,156,30,0.25)' }}>
                <p className="font-ui font-semibold" style={{ fontSize: '14px', color: 'var(--kaki-light)', marginBottom: '4px' }}>
                  ✦ Tu as rejoint {preview.name}
                </p>
                <p className="font-ui" style={{ fontSize: '11px', color: 'var(--muted)' }}>
                  Redirection en cours…
                </p>
              </motion.div>
            ) : (
              <button onClick={join} disabled={joining} className="font-ui font-semibold"
                style={{ width: '100%', padding: '15px', borderRadius: '14px', background: 'var(--cream)',
                  color: 'var(--bg)', border: 'none', fontSize: '13px', letterSpacing: '0.06em',
                  cursor: joining ? 'default' : 'pointer', opacity: joining ? 0.7 : 1 }}>
                {joining ? '…' : user ? `Rejoindre ${preview.name}` : 'Se connecter pour rejoindre →'}
              </button>
            )}

            {!user && (
              <p className="font-ui" style={{ textAlign: 'center', fontSize: '11px', color: 'var(--muted)',
                marginTop: '12px', opacity: 0.5 }}>
                Gratuit · Sans engagement
              </p>
            )}
          </>
        )}
      </motion.div>
    </div>
  )
}
