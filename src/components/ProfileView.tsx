import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuth, signOut } from '../lib/auth'

interface Props {
  onBack: () => void
  isOnboarding?: boolean
  onOnboardingDone?: () => void
}

export default function ProfileView({ onBack, isOnboarding = false, onOnboardingDone }: Props) {
  const { user } = useAuth()
  const [username,     setUsername]     = useState('')
  const [avatarUrl,    setAvatarUrl]    = useState('')
  const [points,       setPoints]       = useState(0)
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [uploading,    setUploading]    = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [saved,        setSaved]        = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    void (async () => {
      const { data } = await supabase
        .from('users')
        .select('username, avatar_url, reward_points')
        .eq('id', user.id)
        .maybeSingle()
      if (data) {
        setUsername(data.username ?? '')
        setAvatarUrl(data.avatar_url ?? '')
        setPoints(data.reward_points ?? 0)
      }
      setLoading(false)
    })()
  }, [user])

  // ── Upload photo ────────────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true); setError(null)

    const ext  = file.name.split('.').pop() ?? 'jpg'
    const path = `${user.id}/avatar.${ext}`

    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (upErr) { setError(upErr.message); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    // Ajoute un timestamp pour forcer le rechargement du cache
    const url = `${publicUrl}?t=${Date.now()}`
    setAvatarUrl(url)
    setUploading(false)
  }

  // ── Sauvegarde profil ───────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user || saving) return
    const trimmed = username.trim().toLowerCase()
    if (trimmed.length < 2) { setError('Le pseudo doit faire au moins 2 caractères.'); return }
    if (!/^[a-z0-9_.-]+$/.test(trimmed)) { setError('Lettres, chiffres, _ . - uniquement.'); return }
    setSaving(true); setError(null)

    const { error: dbErr } = await supabase
      .from('users')
      .upsert({ id: user.id, username: trimmed, avatar_url: avatarUrl || null })

    setSaving(false)
    if (dbErr) {
      setError(dbErr.message.includes('unique') ? 'Ce pseudo est déjà pris.' : dbErr.message)
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    if (isOnboarding) onOnboardingDone?.()
  }

  const inp: React.CSSProperties = {
    background: 'var(--surface-3)', border: '1px solid var(--border-2)', borderRadius: '12px',
    color: 'var(--cream)', padding: '13px 16px', width: '100%', outline: 'none', boxSizing: 'border-box',
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', fontSize: '14px',
  }
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: '10px', letterSpacing: '0.16em', color: 'var(--muted)',
    textTransform: 'uppercase', marginBottom: '8px',
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
  }

  const rewardsConfig = [
    { pts: 5,  label: 'Ajouter un lieu' },
    { pts: 3,  label: 'Évaluer (aimé / bof)' },
    { pts: 10, label: 'Compléter une fiche' },
    { pts: 15, label: 'Ajouter une photo' },
    { pts: 20, label: 'Confirmer une réservation' },
    { pts: 50, label: 'Inviter un ami inscrit' },
  ]
  const nextReward = 1000
  const progress = Math.min((points % nextReward) / nextReward, 1)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      style={{ height: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}
    >
      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        {!isOnboarding && (
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '11px' }} className="font-ui">←</button>
        )}
        <div>
          <p className="font-ui" style={{ fontSize: '10px', letterSpacing: '0.2em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
            {isOnboarding ? 'Bienvenue' : 'Mon profil'}
          </p>
          <h1 className="font-display font-medium" style={{ fontSize: '1.3rem', color: 'var(--cream)', fontStyle: 'italic' }}>
            {isOnboarding ? 'Choisis ton pseudo' : 'Profil'}
          </h1>
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '480px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>

        {isOnboarding && (
          <p className="font-ui" style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6, marginTop: '-4px' }}>
            Tes amis te cherchent par pseudo. Choisis-en un — tu pourras le changer plus tard.
          </p>
        )}

        {loading ? (
          <p className="font-ui" style={{ fontSize: '13px', color: 'var(--muted)' }}>Chargement…</p>
        ) : (
          <>
            {/* ── Avatar ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Photo */}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{ position: 'relative', width: '72px', height: '72px', borderRadius: '50%', flexShrink: 0,
                  background: 'var(--kaki)', overflow: 'hidden', border: 'none', cursor: 'pointer',
                  boxShadow: '0 0 0 2px rgba(138,156,30,0.3)' }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span className="font-ui font-semibold" style={{ fontSize: '26px', color: '#fff' }}>
                    {username ? username[0].toUpperCase() : '?'}
                  </span>
                )}
                {/* Overlay "changer" */}
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: uploading ? 1 : 0, transition: 'opacity 0.15s' }}
                  className="hover-show"
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => !uploading && (e.currentTarget.style.opacity = '0')}
                >
                  <span className="font-ui" style={{ fontSize: '10px', color: '#fff', letterSpacing: '0.06em' }}>
                    {uploading ? '…' : 'Changer'}
                  </span>
                </div>
              </button>

              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              <div>
                <p className="font-ui font-medium" style={{ fontSize: '13px', color: 'var(--cream)', marginBottom: '4px' }}>
                  {avatarUrl ? 'Photo de profil' : 'Ajouter une photo'}
                </p>
                <p className="font-ui" style={{ fontSize: '11px', color: 'var(--muted)' }}>
                  Clique sur l'avatar · JPG, PNG, WebP · max 5 Mo
                </p>
              </div>
            </div>

            {/* ── Pseudo ── */}
            <div>
              <label style={lbl}>Pseudo *</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--muted)', fontSize: '14px', pointerEvents: 'none' }}>@</span>
                <input
                  value={username}
                  onChange={e => { setUsername(e.target.value.toLowerCase()); setError(null); setSaved(false) }}
                  placeholder="monpseudo"
                  autoFocus={isOnboarding}
                  style={{ ...inp, paddingLeft: '30px' }}
                  onKeyDown={e => e.key === 'Enter' && void handleSave()}
                />
              </div>
              <p className="font-ui" style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '6px' }}>
                Lettres, chiffres, _ . - · Visible par tous
              </p>
            </div>

            {error && (
              <p className="font-ui" style={{ fontSize: '12px', color: '#e05c6a', marginTop: '-12px' }}>{error}</p>
            )}

            <button
              onClick={() => void handleSave()}
              disabled={saving || uploading || username.trim().length < 2}
              className="font-ui font-semibold"
              style={{
                padding: '14px', borderRadius: '12px', border: 'none', fontSize: '13px', letterSpacing: '0.08em',
                cursor: (saving || uploading || username.trim().length < 2) ? 'default' : 'pointer',
                background: saved ? 'rgba(38,128,66,0.3)' : (username.trim().length < 2 ? 'var(--surface-3)' : 'var(--cream)'),
                color: saved ? 'var(--liked)' : (username.trim().length < 2 ? 'var(--muted)' : 'var(--bg)'),
                opacity: uploading ? 0.5 : 1,
                transition: 'all 0.2s',
              }}
            >
              {saving ? 'Enregistrement…' : uploading ? 'Upload en cours…' : saved ? '✓ Enregistré' : isOnboarding ? 'Continuer →' : 'Enregistrer'}
            </button>

            {/* ── Kaki Rewards ── */}
            {!isOnboarding && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <p className="font-ui font-semibold" style={{ fontSize: '13px', color: 'var(--cream)' }}>Kaki Rewards</p>
                  <p className="font-ui font-semibold" style={{ fontSize: '13px', color: 'var(--accent)' }}>{points} pts</p>
                </div>
                <div style={{ height: '6px', borderRadius: '99px', background: 'var(--surface-3)', overflow: 'hidden', marginBottom: '8px' }}>
                  <div style={{ height: '100%', borderRadius: '99px', background: 'var(--kaki)',
                    width: `${progress * 100}%`, transition: 'width 0.4s ease' }} />
                </div>
                <p className="font-ui" style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '16px' }}>
                  {nextReward - (points % nextReward)} pts avant un dîner offert
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {rewardsConfig.map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="font-ui" style={{ fontSize: '11px', color: 'var(--muted)' }}>{r.label}</span>
                      <span className="font-ui font-medium" style={{ fontSize: '11px', color: 'var(--accent)' }}>+{r.pts} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Déconnexion ── */}
            {!isOnboarding && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <p className="font-ui" style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px' }}>
                  {user?.email}
                </p>
                <button
                  onClick={() => void signOut()}
                  className="font-ui"
                  style={{ fontSize: '12px', color: '#c97a7a', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Se déconnecter
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  )
}
