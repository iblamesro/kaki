import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Place, PlaceCategory, NominatimResult } from '../types'

const CATEGORIES: PlaceCategory[] = ['Restaurant', 'Café', 'Bar', 'Boutique', 'Activité', 'Autre']
const TAG_SUGGESTIONS = ['romantique', 'date', 'gastronomique', 'naturel', 'terrasse', 'brunch', 'soirée', 'rapide', 'végé', 'incontournable', 'caché', 'festif', 'business', 'familial']
const CAT_EMOJI: Record<PlaceCategory, string> = {
  Restaurant: '🍽', Café: '☕', Bar: '🍷', Boutique: '🛍', Activité: '✦', Autre: '◎',
}

type NewPlace = Omit<Place, 'id' | 'status' | 'dateAdded' | 'dateVisited'>

interface Props {
  onAdd?: (data: NewPlace) => void
  onUpdate?: (id: string, data: Partial<Place>) => void
  onClose: () => void
  editPlace?: Place
}

export default function AddPlaceModal({ onAdd, onUpdate, onClose, editPlace }: Props) {
  const isEdit = Boolean(editPlace)

  const [name,        setName]        = useState(editPlace?.name        ?? '')
  const [category,    setCategory]    = useState<PlaceCategory>(editPlace?.category    ?? 'Restaurant')
  const [address,     setAddress]     = useState(editPlace?.address     ?? '')
  const [notes,       setNotes]       = useState(editPlace?.notes       ?? '')
  const [instagram,   setInstagram]   = useState(editPlace?.instagram   ?? '')
  const [coverPhoto,  setCoverPhoto]  = useState(editPlace?.coverPhoto  ?? '')
  const [description, setDescription] = useState(editPlace?.description ?? '')
  const [likedAspects,setLikedAspects]= useState(editPlace?.likedAspects ?? '')
  const [orderedItems,setOrderedItems]= useState(editPlace?.orderedItems ?? '')
  const [tags,         setTags]        = useState<string[]>(editPlace?.tags ?? [])
  const [coverPhotoError, setCoverPhotoError] = useState(false)
  const [coords, setCoords]           = useState({ lat: editPlace?.lat ?? 48.8566, lng: editPlace?.lng ?? 2.3522 })
  const [suggestions,  setSuggestions]  = useState<NominatimResult[]>([])
  const [searching,    setSearching]    = useState(false)
  const [showSug,      setShowSug]      = useState(false)
  const [tab,          setTab]          = useState<'info' | 'critique'>('info')
  const [igUrl,        setIgUrl]        = useState('')
  const [igLoading,    setIgLoading]    = useState(false)
  const [igError,      setIgError]      = useState('')
  const [igPreview,    setIgPreview]    = useState<{ thumb: string; caption: string } | null>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 3) { setSuggestions([]); return }
    setSearching(true)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&accept-language=fr`)
      const data: NominatimResult[] = await res.json()
      setSuggestions(data)
      setShowSug(true)
    } catch { setSuggestions([]) }
    finally { setSearching(false) }
  }, [])

  const handleAddressChange = (v: string) => {
    setAddress(v)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => search(v), 380)
  }

  const pickSuggestion = (r: NominatimResult) => {
    setAddress(r.display_name)
    setCoords({ lat: parseFloat(r.lat), lng: parseFloat(r.lon) })
    setSuggestions([])
    setShowSug(false)
  }

  const importFromInstagram = useCallback(async (url: string) => {
    if (!url.includes('instagram.com')) { setIgError('URL Instagram invalide'); return }
    setIgLoading(true); setIgError(''); setIgPreview(null)
    try {
      // Fetch Open Graph tags via CORS proxy
      const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
      const res = await fetch(proxy)
      const data = await res.json()
      const html: string = data.contents ?? ''

      const getTag = (prop: string) => {
        const m = html.match(new RegExp(`<meta[^>]+(?:property|name)="${prop}"[^>]+content="([^"]+)"`, 'i'))
          || html.match(new RegExp(`<meta[^>]+content="([^"]+)"[^>]+(?:property|name)="${prop}"`, 'i'))
        return m ? m[1].replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&quot;/g, '"') : ''
      }

      const ogTitle   = getTag('og:title')
      const ogImage   = getTag('og:image')
      const ogDesc    = getTag('og:description')
      const caption   = ogDesc || ogTitle

      if (!ogImage && !caption) { setIgError('Impossible de lire ce post (compte privé ?)'); setIgLoading(false); return }

      // Try to extract restaurant name: first line of caption before hashtags/newline
      const firstLine = caption.split(/\n|#/)[0].trim()
      const guessedName = firstLine.length > 2 && firstLine.length < 60 ? firstLine : ''

      setIgPreview({ thumb: ogImage, caption })
      if (ogImage && !coverPhoto) setCoverPhoto(ogImage)
      if (guessedName && !name) setName(guessedName)
      if (!instagram) setInstagram(url)
      setIgLoading(false)
    } catch {
      setIgError('Erreur réseau — réessaie')
      setIgLoading(false)
    }
  }, [coverPhoto, name, instagram])

  // Debounced trigger when igUrl changes
  useEffect(() => {
    if (!igUrl.includes('instagram.com/')) return
    const t = setTimeout(() => importFromInstagram(igUrl), 600)
    return () => clearTimeout(t)
  }, [igUrl, importFromInstagram])

  const handleSubmit = () => {
    if (!name.trim()) return
    if (isEdit && editPlace && onUpdate) {
      onUpdate(editPlace.id, {
        name: name.trim(),
        address: address.trim() || editPlace.address,
        category,
        notes: notes.trim() || undefined,
        lat: coords.lat,
        lng: coords.lng,
        instagram: instagram.trim() || undefined,
        coverPhoto: coverPhoto.trim() || undefined,
        description: description.trim() || undefined,
        likedAspects: likedAspects.trim() || undefined,
        orderedItems: orderedItems.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      })
    } else if (onAdd) {
      onAdd({
        name: name.trim(),
        address: address.trim() || `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
        category,
        notes: notes.trim() || undefined,
        lat: coords.lat,
        lng: coords.lng,
        instagram: instagram.trim() || undefined,
        coverPhoto: coverPhoto.trim() || undefined,
        description: description.trim() || undefined,
        likedAspects: likedAspects.trim() || undefined,
        orderedItems: orderedItems.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      })
    }
    onClose()
  }

  const inp: React.CSSProperties = {
    background: 'var(--surface-3)', border: '1px solid var(--border-2)', borderRadius: '10px',
    color: 'var(--cream)', padding: '10px 14px', width: '100%', outline: 'none',
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', fontSize: '13px',
  }
  const lbl: React.CSSProperties = {
    fontSize: '10px', letterSpacing: '0.18em', color: 'var(--muted)', textTransform: 'uppercase' as const,
    marginBottom: '6px', display: 'block', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
  }

  return (
    /* Backdrop flouté */
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[2000] flex items-center justify-center"
      style={{ background: 'rgba(9,12,6,0.72)', backdropFilter: 'blur(14px)', padding: '16px' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 16 }}
      transition={{ type: 'spring', damping: 32, stiffness: 340 }}
      className="flex flex-col w-full"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-2)',
        borderRadius: '20px',
        maxWidth: '460px',
        maxHeight: '88dvh',
        overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.65)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0" style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)' }}>
        <div>
          <p className="font-ui" style={{ fontSize: '10px', letterSpacing: '0.2em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '3px' }}>
            {isEdit ? 'Modifier' : 'Nouveau lieu'}
          </p>
          <h2 className="font-display font-medium" style={{ fontSize: '1.35rem', color: 'var(--cream)' }}>
            {isEdit ? editPlace!.name : 'Où voulez-vous aller ?'}
          </h2>
        </div>
        <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--surface-3)', color: 'var(--cream-dim)', fontSize: '17px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
      </div>

      {/* Tabs */}
      <div className="flex flex-shrink-0" style={{ borderBottom: '1px solid var(--border)', padding: '0 20px' }}>
        {(['info', 'critique'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="font-ui font-medium"
            style={{
              padding: '10px 14px', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase',
              color: tab === t ? 'var(--cream)' : 'var(--muted)',
              background: 'none', border: 'none',
              borderBottom: tab === t ? '2px solid var(--cream)' : '2px solid transparent',
              cursor: 'pointer', transition: 'color 0.15s',
            }}
          >
            {t === 'info' ? 'Infos' : 'Critique'}
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-5 py-4" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {tab === 'info' ? (
          <>
            {/* ── Instagram import ── */}
            <div style={{ background: 'var(--surface-3)', borderRadius: '12px', padding: '12px 14px', border: '1px solid var(--border-2)' }}>
              <label style={{ ...lbl, marginBottom: '8px' }}>
                <span style={{ marginRight: '6px' }}>📎</span> Importer depuis Instagram
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  value={igUrl}
                  onChange={e => { setIgUrl(e.target.value); setIgError('') }}
                  placeholder="Colle un lien Instagram…"
                  style={{ ...inp, background: 'var(--surface-2)', paddingRight: igLoading ? '36px' : '14px' }}
                />
                {igLoading && (
                  <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--muted)' }}>…</span>
                )}
              </div>
              {igError && <p className="font-ui" style={{ fontSize: '11px', color: 'var(--disliked)', marginTop: '6px' }}>{igError}</p>}
              {igPreview && (
                <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  {igPreview.thumb && (
                    <img src={igPreview.thumb} alt="" style={{ width: '52px', height: '52px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="font-ui" style={{ fontSize: '10px', color: 'var(--liked)', marginBottom: '3px' }}>✓ Infos importées</p>
                    <p className="font-ui" style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: 1.4,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {igPreview.caption}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Name */}
            <div>
              <label style={lbl}>Nom *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Le Comptoir du Relais…" required autoFocus style={inp} />
            </div>

            {/* Category */}
            <div>
              <label style={lbl}>Catégorie</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button key={cat} type="button" onClick={() => setCategory(cat)} className="font-ui font-medium transition-all"
                    style={{ padding: '7px 14px', borderRadius: '99px', fontSize: '12px', background: category === cat ? 'var(--cream)' : 'var(--surface-3)', color: category === cat ? 'var(--bg)' : 'var(--cream-dim)', border: category === cat ? 'none' : '1px solid var(--border-2)', cursor: 'pointer' }}>
                    {CAT_EMOJI[cat]} {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label style={lbl}>Tags</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {TAG_SUGGESTIONS.map(tag => {
                  const active = tags.includes(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setTags(active ? tags.filter(t => t !== tag) : [...tags, tag])}
                      className="font-ui font-medium transition-all"
                      style={{
                        padding: '5px 11px', borderRadius: '99px', fontSize: '11px',
                        background: active ? 'rgba(160,168,40,0.18)' : 'var(--surface-3)',
                        color:      active ? 'var(--kaki-light)'      : 'var(--muted)',
                        border:     active ? '1px solid rgba(160,168,40,0.4)' : '1px solid var(--border-2)',
                        cursor: 'pointer',
                      }}
                    >
                      # {tag}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Address */}
            <div className="relative">
              <label style={lbl}>
                Adresse
                {searching && <span style={{ marginLeft: '6px', color: 'var(--accent)', opacity: 0.7 }}>recherche…</span>}
              </label>
              <input value={address} onChange={e => handleAddressChange(e.target.value)} onBlur={() => setTimeout(() => setShowSug(false), 150)} placeholder="Rechercher une adresse…" style={inp} />
              {showSug && suggestions.length > 0 && (
                <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 50, marginTop: '6px', background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.45)' }}>
                  {suggestions.map((s, i) => (
                    <button key={s.place_id} type="button" onMouseDown={() => pickSuggestion(s)}
                      style={{ width: '100%', padding: '12px 16px', borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none', color: 'var(--cream-dim)', fontSize: '13px', display: 'block', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      {s.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cover photo */}
            <div>
              <label style={{ ...lbl, marginBottom: '4px' }}>Photo de couverture</label>
              <p className="font-ui" style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '8px', lineHeight: 1.5 }}>
                Astuce : sur Instagram, maintenez appuyé sur une photo → "Copier l'URL de l'image"
              </p>
              <input value={coverPhoto} onChange={e => { setCoverPhoto(e.target.value); setCoverPhotoError(false) }} placeholder="https://…" style={{ ...inp, marginBottom: coverPhoto && !coverPhotoError ? '10px' : '0' }} />
              {coverPhoto && !coverPhotoError && (
                <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', height: '110px' }}>
                  <img src={coverPhoto} alt="Aperçu" onError={() => setCoverPhotoError(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button type="button" onClick={() => setCoverPhoto('')}
                    style={{ position: 'absolute', top: '8px', right: '8px', width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(9,12,6,0.7)', color: 'var(--cream)', border: 'none', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ×
                  </button>
                </div>
              )}
              {coverPhotoError && <p className="font-ui" style={{ fontSize: '11px', color: 'var(--disliked)', marginTop: '6px' }}>Image inaccessible — vérifiez l'URL</p>}
            </div>

            {/* Instagram */}
            <div>
              <label style={lbl}>Instagram (profil)</label>
              <input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="https://instagram.com/nomdulieu" style={inp} />
            </div>

            {/* Notes */}
            <div>
              <label style={lbl}>Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Recommandé par, horaires, réservation…" rows={3} style={{ ...inp, resize: 'none', lineHeight: '1.6' }} />
            </div>
          </>
        ) : (
          <>
            {/* Description */}
            <div>
              <label style={lbl}>Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Décrivez l'endroit, son ambiance, son style culinaire…" rows={4} style={{ ...inp, resize: 'none', lineHeight: '1.65' }} />
            </div>

            {/* Liked aspects */}
            <div>
              <label style={lbl}>Ce qu'on a aimé</label>
              <textarea value={likedAspects} onChange={e => setLikedAspects(e.target.value)} placeholder="Les plats signature, le service, l'ambiance, les vins…" rows={3} style={{ ...inp, resize: 'none', lineHeight: '1.65' }} />
            </div>

            {/* Ordered items */}
            <div>
              <label style={lbl}>Ce qu'on a commandé</label>
              <textarea value={orderedItems} onChange={e => setOrderedItems(e.target.value)} placeholder="Les entrées, plats, desserts, vins…" rows={3} style={{ ...inp, resize: 'none', lineHeight: '1.65' }} />
            </div>
          </>
        )}
      </div>

      {/* Submit */}
      <div className="px-5 py-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="w-full font-ui font-semibold transition-all"
          style={{ padding: '14px', borderRadius: '12px', background: name.trim() ? 'var(--cream)' : 'var(--surface-3)', color: name.trim() ? 'var(--bg)' : 'var(--muted)', fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: name.trim() ? 'pointer' : 'not-allowed', border: 'none' }}
        >
          {isEdit ? 'Enregistrer les modifications' : 'Ajouter ce lieu'}
        </button>
      </div>
    </motion.div>
    </motion.div>
  )
}
