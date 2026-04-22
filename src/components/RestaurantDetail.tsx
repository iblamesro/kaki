import { useState } from 'react'
import { motion } from 'framer-motion'
import { Place } from '../types'

const CAT_EMOJI: Record<string, string> = {
  Restaurant: '🍽', Café: '☕', Bar: '🍷', Boutique: '🛍', Activité: '✦', Autre: '◎',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ── Inline editable ───────────────────────────────────────────────────────────
function EditableSection({ label, value, placeholder, onSave }: {
  label: string; value?: string; placeholder: string; onSave: (v: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(value ?? '')
  const save = () => { onSave(draft); setEditing(false) }

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '18px', marginTop: '18px' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '10px' }}>
        <p className="font-ui" style={{ fontSize: '9px', letterSpacing: '0.22em', color: 'var(--muted)', textTransform: 'uppercase' }}>{label}</p>
        <button onClick={() => editing ? save() : setEditing(true)}
          className="font-ui font-medium"
          style={{ fontSize: '10px', color: editing ? 'var(--liked)' : 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, letterSpacing: '0.06em' }}>
          {editing ? 'Enregistrer' : (value ? 'Modifier' : '+ Ajouter')}
        </button>
      </div>
      {editing ? (
        <textarea value={draft} onChange={e => setDraft(e.target.value)} autoFocus
          onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) save() }}
          placeholder={placeholder} rows={3}
          style={{ width: '100%', background: 'var(--surface-3)', border: '1px solid var(--border-2)',
            borderRadius: '10px', color: 'var(--cream)', padding: '10px 12px',
            fontSize: '13px', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
            lineHeight: 1.65, resize: 'none', outline: 'none' }} />
      ) : value ? (
        <p className="font-ui" style={{ fontSize: '14px', color: 'var(--cream-dim)', lineHeight: 1.75 }} onClick={() => setEditing(true)}>
          {value}
        </p>
      ) : (
        <button onClick={() => setEditing(true)} className="font-ui"
          style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic', padding: '4px 0',
            background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', opacity: 0.7 }}>
          + {placeholder}
        </button>
      )}
    </div>
  )
}

// ── Rating stars ──────────────────────────────────────────────────────────────
function RatingStars({ rating, onChange }: { rating?: number; onChange: (r: number) => void }) {
  const [hover, setHover] = useState<number | null>(null)
  return (
    <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
      {[1,2,3,4,5].map(n => (
        <button key={n} onClick={() => onChange(rating === n ? 0 : n)}
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(null)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', fontSize: '22px',
            color: n <= (hover ?? rating ?? 0) ? 'var(--accent)' : 'var(--border-2)', transition: 'color 0.1s' }}>
          ★
        </button>
      ))}
      {rating ? (
        <span className="font-ui" style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: '6px' }}>{rating} / 5</span>
      ) : (
        <span className="font-ui" style={{ fontSize: '11px', color: 'var(--muted)', fontStyle: 'italic', marginLeft: '6px', opacity: 0.6 }}>noter</span>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
interface Props {
  place: Place
  onBack: () => void
  onGoHome: () => void
  onEdit: (place: Place) => void
  onUpdateStatus: (id: string, status: Place['status']) => void
  onDelete: (id: string) => void
  onUpdateField: (id: string, data: Partial<Place>) => void
}

const STATUS_CFG = {
  wishlist: { label: 'À tester', color: 'var(--accent)',    bg: 'rgba(196,124,16,0.12)',  border: 'rgba(196,124,16,0.3)'  },
  liked:    { label: 'Aimé',     color: 'var(--liked)',     bg: 'rgba(38,128,66,0.12)',   border: 'rgba(38,128,66,0.3)'   },
  disliked: { label: 'Bof',      color: 'var(--disliked)',  bg: 'rgba(156,48,48,0.1)',    border: 'rgba(156,48,48,0.25)'  },
}

export default function RestaurantDetail({ place, onBack, onGoHome, onEdit, onUpdateStatus, onDelete, onUpdateField }: Props) {
  const hasCover = Boolean(place.coverPhoto)
  const sc = STATUS_CFG[place.status]

  return (
    <motion.div
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 32, stiffness: 280 }}
      style={{ height: '100dvh', background: 'var(--bg)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
    >
      {/* ── Sticky top bar ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(13,14,11,0.88)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <button onClick={onGoHome} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <span className="font-display font-medium" style={{ fontSize: '1.1rem', color: 'var(--cream)', fontStyle: 'italic', letterSpacing: '0.14em' }}>kaki</span>
        </button>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onBack} className="font-ui"
            style={{ fontSize: '11px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.06em' }}>
            ← retour
          </button>
          <button onClick={() => onEdit(place)} className="font-ui"
            style={{ fontSize: '11px', color: 'var(--cream)', background: 'var(--surface-3)',
              border: '1px solid var(--border-2)', borderRadius: '99px', padding: '5px 12px', cursor: 'pointer', letterSpacing: '0.06em' }}>
            Éditer
          </button>
        </div>
      </div>

      {/* ── Cover photo ── */}
      {hasCover && (
        <div style={{ height: '260px', overflow: 'hidden', position: 'relative', flexShrink: 0, background: 'var(--surface-3)' }}>
          <img src={place.coverPhoto} alt={place.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, var(--bg) 100%)' }} />
        </div>
      )}

      {/* ── Content ── */}
      <div style={{ padding: hasCover ? '0 20px 0' : '24px 20px 0', flex: 1 }}>

        {/* Category + date */}
        <p className="font-ui" style={{ fontSize: '9px', letterSpacing: '0.22em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '10px', marginTop: hasCover ? '0' : undefined }}>
          {CAT_EMOJI[place.category]} {place.category}
          {place.dateVisited ? ` · visité le ${fmt(place.dateVisited)}` : ` · ajouté le ${fmt(place.dateAdded)}`}
        </p>

        {/* Name */}
        <h1 className="font-display font-medium"
          style={{ fontSize: 'clamp(1.9rem, 8vw, 2.5rem)', color: 'var(--cream)', lineHeight: 1.05,
            fontStyle: 'italic', marginBottom: '14px', letterSpacing: '-0.01em' }}>
          {place.name}
        </h1>

        {/* Status + Instagram */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', alignItems: 'center', marginBottom: '20px' }}>
          <span className="font-ui font-medium"
            style={{ fontSize: '10px', padding: '4px 10px', borderRadius: '99px',
              background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
            {sc.label}
          </span>
          {place.instagram && (
            <a href={place.instagram} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: '10px', color: 'var(--muted)', background: 'var(--surface-3)',
                padding: '4px 10px', borderRadius: '99px', border: '1px solid var(--border-2)',
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" strokeWidth="0"/></svg>
              Instagram
            </a>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--border)', marginBottom: '20px' }} />

        {/* Tags */}
        {place.tags && place.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
            {place.tags.map(tag => (
              <span key={tag} className="font-ui"
                style={{ fontSize: '10px', color: 'var(--kaki-light)',
                  background: 'rgba(138,156,30,0.12)', border: '1px solid rgba(138,156,30,0.28)',
                  borderRadius: '99px', padding: '3px 10px' }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Address */}
        <div style={{ background: 'var(--surface)', borderRadius: '12px', padding: '12px 14px', marginBottom: '20px',
          border: '1px solid var(--border)' }}>
          <p className="font-ui" style={{ fontSize: '9px', letterSpacing: '0.2em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '5px' }}>Adresse</p>
          <p className="font-ui" style={{ fontSize: '13px', color: 'var(--cream-dim)', lineHeight: 1.5 }}>{place.address}</p>
        </div>

        {/* Description */}
        <EditableSection
          label="Description"
          value={place.description}
          placeholder="Ambiance, style culinaire, concept…"
          onSave={v => onUpdateField(place.id, { description: v || undefined })}
        />

        {/* ── Après la visite ── */}
        {place.status !== 'wishlist' ? (
          <div style={{ marginTop: '28px', borderRadius: '18px', border: '1px solid rgba(138,156,30,0.22)',
            background: 'rgba(138,156,30,0.04)', padding: '18px 16px 6px' }}>
            <p className="font-ui" style={{ fontSize: '9px', letterSpacing: '0.22em', color: 'var(--accent)',
              textTransform: 'uppercase', marginBottom: '18px' }}>
              ✦ Après la visite
            </p>

            {/* Note */}
            <div style={{ marginBottom: '18px' }}>
              <p className="font-ui" style={{ fontSize: '9px', letterSpacing: '0.18em', color: 'var(--muted)',
                textTransform: 'uppercase', marginBottom: '10px' }}>Ma note</p>
              <RatingStars rating={place.rating} onChange={r => onUpdateField(place.id, { rating: r || undefined })} />
            </div>

            {/* Budget */}
            <div style={{ marginBottom: '18px' }}>
              <p className="font-ui" style={{ fontSize: '9px', letterSpacing: '0.18em', color: 'var(--muted)',
                textTransform: 'uppercase', marginBottom: '10px' }}>Budget</p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                {([1, 2, 3, 4] as const).map(n => (
                  <button key={n} type="button"
                    onClick={() => onUpdateField(place.id, { priceRange: place.priceRange === n ? undefined : n })}
                    className="font-ui font-medium"
                    style={{ padding: '5px 12px', borderRadius: '99px', fontSize: '12px', cursor: 'pointer',
                      border: `1px solid ${place.priceRange === n ? 'rgba(138,156,30,0.5)' : 'var(--border-2)'}`,
                      background: place.priceRange === n ? 'rgba(138,156,30,0.15)' : 'var(--surface-3)',
                      color: place.priceRange === n ? 'var(--kaki-light)' : 'var(--muted)',
                      transition: 'all 0.15s' }}>
                    {'€'.repeat(n)}
                  </button>
                ))}
                {place.priceRange && (
                  <span className="font-ui" style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: '4px' }}>
                    {place.priceRange === 1 ? '< 20€ / pers.' : place.priceRange === 2 ? '20–40€ / pers.' : place.priceRange === 3 ? '40–80€ / pers.' : '80€+ / pers.'}
                  </span>
                )}
              </div>
            </div>

            <EditableSection
              label="Ce qu'on a commandé"
              value={place.orderedItems}
              placeholder="Plats, vins, desserts…"
              onSave={v => onUpdateField(place.id, { orderedItems: v || undefined })}
            />
            <EditableSection
              label="Ce qu'on a aimé"
              value={place.likedAspects}
              placeholder="Plats signature, service, ambiance…"
              onSave={v => onUpdateField(place.id, { likedAspects: v || undefined })}
            />
            <EditableSection
              label="Remarques"
              value={place.notes}
              placeholder="Notes libres, anecdotes, à retenir…"
              onSave={v => onUpdateField(place.id, { notes: v || undefined })}
            />
          </div>
        ) : (
          <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
              <p className="font-ui" style={{ fontSize: '9px', letterSpacing: '0.18em', color: 'var(--muted)',
                textTransform: 'uppercase', marginBottom: '10px' }}>Ma note</p>
              <RatingStars rating={place.rating} onChange={r => onUpdateField(place.id, { rating: r || undefined })} />
            </div>
            {place.notes && (
              <div style={{ paddingLeft: '12px', borderLeft: '2px solid var(--kaki)', marginBottom: '4px' }}>
                <p className="font-display italic"
                  style={{ fontSize: '14px', color: 'var(--cream-dim)', lineHeight: 1.7, opacity: 0.85 }}>
                  "{place.notes}"
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Status change ── */}
        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
          <p className="font-ui" style={{ fontSize: '9px', letterSpacing: '0.22em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '10px' }}>Changer le statut</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {place.status !== 'wishlist' && (
              <button onClick={() => onUpdateStatus(place.id, 'wishlist')} className="font-ui font-medium flex-1"
                style={{ padding: '10px 8px', borderRadius: '12px', background: 'var(--surface-3)',
                  color: 'var(--cream-dim)', border: '1px solid var(--border-2)', fontSize: '11px', cursor: 'pointer' }}>
                ↩ À tester
              </button>
            )}
            {place.status !== 'liked' && (
              <button onClick={() => onUpdateStatus(place.id, 'liked')} className="font-ui font-medium flex-1"
                style={{ padding: '10px 8px', borderRadius: '12px', background: 'var(--liked)',
                  color: '#fff', border: 'none', fontSize: '11px', cursor: 'pointer' }}>
                ✓ Aimé
              </button>
            )}
            {place.status !== 'disliked' && (
              <button onClick={() => onUpdateStatus(place.id, 'disliked')} className="font-ui font-medium flex-1"
                style={{ padding: '10px 8px', borderRadius: '12px', background: 'var(--surface-3)',
                  color: 'var(--disliked)', border: '1px solid rgba(156,48,48,0.3)', fontSize: '11px', cursor: 'pointer' }}>
                × Bof
              </button>
            )}
          </div>
        </div>

        {/* Delete */}
        <button onClick={() => { if (window.confirm(`Supprimer "${place.name}" ?`)) onDelete(place.id) }}
          className="font-ui"
          style={{ fontSize: '11px', color: 'var(--muted)', textDecoration: 'underline',
            background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
            padding: '20px 0 0', opacity: 0.5 }}>
          Supprimer ce lieu
        </button>

        <div style={{ height: '48px' }} />
      </div>
    </motion.div>
  )
}
