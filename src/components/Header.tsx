import { useState, useRef, useEffect } from 'react'
import { supabase, UserRow } from '../lib/supabase'
import { EDEN_DEMO_ID } from '../lib/demoData'

interface HeaderProps {
  currentUserId: string
  onLogoClick?: () => void
  onOpenFriend?: (userId: string) => void
  onOpenGroups?: () => void
  onOpenProfile?: () => void
}

function displayName(row: UserRow): string {
  if (row.username?.trim()) return row.username.trim()
  return `Utilisateur ${row.id.slice(0, 4)}`
}

function avatarInitial(row: UserRow): string {
  const u = row.username?.trim()
  if (u) return u.slice(0, 1).toUpperCase()
  return 'K'
}

export default function Header({
  currentUserId,
  onLogoClick,
  onOpenFriend,
  onOpenGroups,
  onOpenProfile,
}: HeaderProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<UserRow[]>([])
  const [searching, setSearching] = useState(false)
  const [myProfile, setMyProfile] = useState<{ username: string | null; avatar_url: string | null } | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Charge le profil courant pour l'avatar
  useEffect(() => {
    void supabase.from('users').select('username, avatar_url').eq('id', currentUserId).maybeSingle()
      .then(({ data }) => { if (data) setMyProfile(data as { username: string | null; avatar_url: string | null }) })
  }, [currentUserId])

  // Recherche d'amis
  useEffect(() => {
    if (!open || query.length < 1) { setSuggestions([]); return }
    const t = window.setTimeout(() => {
      void (async () => {
        setSearching(true)
        const { data, error } = await supabase
          .from('users').select('id, username, avatar_url')
          .neq('id', currentUserId).not('username', 'is', null)
          .ilike('username', `%${query.trim()}%`).limit(10)
        setSuggestions(!error && data ? data as UserRow[] : [])
        setSearching(false)
      })()
    }, 220)
    return () => window.clearTimeout(t)
  }, [open, query, currentUserId])

  // Ferme au clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false); setQuery('')
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleSelect = (userId: string) => {
    setOpen(false); setQuery('')
    onOpenFriend?.(userId)
  }

  const showEden = open && query.length === 0
  const showResults = open && query.length > 0

  return (
    <header
      className="flex-shrink-0"
      style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'relative', height: '52px' }}
    >
      {/* Logo */}
      <button onClick={onLogoClick}
        style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <span className="font-display font-medium"
          style={{ fontSize: '1.4rem', letterSpacing: '0.16em', color: 'var(--cream)', fontStyle: 'italic' }}>
          kaki
        </span>
      </button>

      {/* Groupes */}
      {onOpenGroups && (
        <button type="button" onClick={onOpenGroups} className="font-ui font-medium"
          style={{ position: 'absolute', left: '92px', top: '50%', transform: 'translateY(-50%)',
            fontSize: '11px', letterSpacing: '0.06em', color: 'var(--muted)',
            background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
          Groupes
        </button>
      )}

      {/* Search amis — centré */}
      <div ref={wrapRef}
        style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
          width: 'min(200px, calc(100vw - 220px))' }}>
        {open ? (
          <input autoFocus value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && (setOpen(false), setQuery(''))}
            placeholder="Pseudo…"
            style={{ width: '100%', background: 'var(--surface-3)', border: '1px solid var(--border-2)',
              borderRadius: '20px', color: 'var(--cream)', padding: '6px 14px 6px 28px',
              fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', fontSize: '12px', outline: 'none',
              letterSpacing: '0.03em' }}
          />
        ) : (
          <button onClick={() => setOpen(true)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
              background: 'var(--surface-3)', border: '1px solid var(--border-2)',
              borderRadius: '20px', padding: '6px 14px', cursor: 'pointer' }}>
            <span style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1 }}>⌕</span>
            <span className="font-ui" style={{ fontSize: '12px', color: 'var(--muted)', letterSpacing: '0.04em' }}>
              Amis
            </span>
          </button>
        )}

        {open && (
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
            color: 'var(--muted)', fontSize: '12px', pointerEvents: 'none' }}>⌕</span>
        )}

        {/* Dropdown */}
        {open && (
          <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
            width: '240px', zIndex: 500, background: 'var(--surface)',
            border: '1px solid var(--border-2)', borderRadius: '14px',
            overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>

            {/* Eden suggestion quand pas encore tapé */}
            {showEden && (
              <>
                <p className="font-ui" style={{ padding: '8px 14px 4px', fontSize: '9px', letterSpacing: '0.14em',
                  color: 'var(--muted)', textTransform: 'uppercase' }}>Suggestion</p>
                <button type="button" onClick={() => handleSelect(EDEN_DEMO_ID)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 14px 12px', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%',
                    background: 'linear-gradient(135deg,#8a9c1e,#5a6e10)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="font-ui font-semibold" style={{ fontSize: '12px', color: '#fff' }}>E</span>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <p className="font-ui font-medium" style={{ fontSize: '12px', color: 'var(--cream)' }}>Eden</p>
                    <p className="font-ui" style={{ fontSize: '10px', color: 'var(--muted)' }}>@eden.paris · démo</p>
                  </div>
                </button>
              </>
            )}

            {/* Résultats de recherche */}
            {showResults && (
              searching ? (
                <p className="font-ui" style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--muted)' }}>Recherche…</p>
              ) : suggestions.length === 0 ? (
                <p className="font-ui" style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--muted)' }}>Aucun résultat</p>
              ) : (
                suggestions.map((row, i) => (
                  <button key={row.id} type="button" onClick={() => handleSelect(row.id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer',
                      borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--kaki)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                      {row.avatar_url
                        ? <img src={row.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span className="font-ui font-medium" style={{ fontSize: '12px', color: '#fff' }}>{avatarInitial(row)}</span>}
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <p className="font-ui font-medium" style={{ fontSize: '12px', color: 'var(--cream)' }}>{displayName(row)}</p>
                      <p className="font-ui" style={{ fontSize: '10px', color: 'var(--muted)' }}>@{row.username}</p>
                    </div>
                  </button>
                ))
              )
            )}
          </div>
        )}
      </div>

      {/* Avatar profil — droite */}
      <button onClick={onOpenProfile}
        style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
          width: '32px', height: '32px', borderRadius: '50%',
          background: myProfile?.avatar_url ? 'transparent' : 'var(--kaki)',
          border: '1.5px solid rgba(138,156,30,0.35)',
          cursor: 'pointer', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}>
        {myProfile?.avatar_url ? (
          <img src={myProfile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span className="font-ui font-semibold" style={{ fontSize: '12px', color: '#fff' }}>
            {myProfile?.username?.[0]?.toUpperCase() ?? 'K'}
          </span>
        )}
      </button>
    </header>
  )
}
