import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Place } from '../types'
import { supabase, PlaceRow } from '../lib/supabase'
import { rowToPlace } from '../lib/places'
import { useAuth } from '../lib/auth'

type NewPlace = Omit<Place, 'id' | 'status' | 'dateAdded' | 'dateVisited'>

interface Props {
  onAdd?: (data: NewPlace) => void
  onUpdate?: (id: string, data: Partial<Place>) => void
  onClose: () => void
  editPlace?: Place
}

const CAT_EMOJI: Record<string, string> = {
  Restaurant: '🍽', Café: '☕', Bar: '🍷', Boutique: '🛍', Activité: '✦', Autre: '◎',
}

export default function AddPlaceModal({ onAdd, onUpdate, onClose, editPlace }: Props) {
  const { user } = useAuth()
  const isEdit = Boolean(editPlace)

  const [query,      setQuery]      = useState('')
  const [searching,  setSearching]  = useState(false)
  const [results,    setResults]    = useState<Place[]>([])
  const [hasSearched,setHasSearched]= useState(false)
  const [submitted,  setSubmitted]  = useState(false)
  const [sending,    setSending]    = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const searchDB = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setHasSearched(false); return }
    setSearching(true)
    const { data } = await supabase
      .from('places')
      .select('*')
      .or(`name.ilike.%${q.trim()}%,address.ilike.%${q.trim()}%`)
      .limit(10)
    if (data) {
      const seen = new Set<string>()
      const unique = (data as PlaceRow[]).filter(row => {
        const key = row.name.toLowerCase().trim()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      setResults(unique.map(rowToPlace))
    } else {
      setResults([])
    }
    setSearching(false)
    setHasSearched(true)
  }, [])

  const handleChange = (v: string) => {
    setQuery(v)
    setHasSearched(false)
    setSubmitted(false)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => searchDB(v), 400)
  }

  const handleSelectFromDB = (place: Place) => {
    if (!onAdd) return
    onAdd({
      name: place.name, address: place.address, category: place.category,
      lat: place.lat, lng: place.lng, coverPhoto: place.coverPhoto,
      tags: place.tags, description: place.description, notes: place.notes,
      rating: place.rating, priceRange: place.priceRange, instagram: place.instagram,
    })
    onClose()
  }

  const handleSendRequest = async () => {
    if (!user || !query.trim()) return
    setSending(true)
    const { error } = await supabase.from('place_requests').insert({
      query: query.trim(), requested_by: user.id, status: 'pending',
    })
    setSending(false)
    if (error) {
      alert(`Erreur : ${error.message}\n\nAssure-toi que le script SQL place_requests a été exécuté dans Supabase.`)
      return
    }
    setSubmitted(true)
  }

  const inp: React.CSSProperties = {
    width: '100%', background: 'var(--surface-3)', border: '1px solid var(--border-2)',
    borderRadius: '12px', padding: '12px 16px 12px 40px', color: 'var(--cream)',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
  }

  // ── Edit mode: keep the original full form ───────────────────────────────────
  if (isEdit && editPlace && onUpdate) {
    return <EditForm editPlace={editPlace} onUpdate={onUpdate} onClose={onClose} />
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'flex-end',
        justifyContent: 'center', background: 'rgba(9,12,6,0.72)', backdropFilter: 'blur(14px)', padding: '0' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        style={{ width: '100%', maxWidth: 480, background: 'var(--surface)',
          borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
          border: '1px solid var(--border-2)', boxShadow: '0 -12px 60px rgba(0,0,0,0.5)',
          maxHeight: '85dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p className="font-ui" style={{ fontSize: '9px', letterSpacing: '0.2em', color: 'var(--muted)',
              textTransform: 'uppercase', marginBottom: '3px' }}>Nouveau lieu</p>
            <h2 className="font-display font-medium" style={{ fontSize: '1.25rem', color: 'var(--cream)', fontStyle: 'italic' }}>
              Ajouter un restaurant
            </h2>
          </div>
          <button onClick={onClose}
            style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--surface-3)',
              border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '17px',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* Search input */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
              color: 'var(--muted)', fontSize: '15px', pointerEvents: 'none' }}>⌕</span>
            <input
              autoFocus
              value={query}
              onChange={e => handleChange(e.target.value)}
              placeholder="Nom ou adresse du restaurant…"
              className="font-ui"
              style={inp}
            />
            {searching && (
              <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                fontSize: '12px', color: 'var(--muted)' }}>…</span>
            )}
            {query && !searching && (
              <button onClick={() => { setQuery(''); setResults([]); setHasSearched(false) }}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '16px' }}>×</button>
            )}
          </div>
          <p className="font-ui" style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '8px', lineHeight: 1.5 }}>
            Paris intra muros · Tape au moins 2 caractères
          </p>
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div key="submitted" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                  padding: '32px 24px', textAlign: 'center' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%',
                  background: 'rgba(138,156,30,0.15)', border: '1px solid rgba(138,156,30,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>✦</div>
                <p className="font-display font-medium"
                  style={{ fontSize: '1.1rem', color: 'var(--cream)', fontStyle: 'italic' }}>
                  Demande envoyée !
                </p>
                <p className="font-ui" style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6, maxWidth: '280px' }}>
                  Ton restaurant sera ajouté à notre base très prochainement. On te préviendra.
                </p>
                <button onClick={onClose} className="font-ui font-medium"
                  style={{ marginTop: '8px', padding: '10px 24px', borderRadius: '10px',
                    background: 'var(--cream)', color: 'var(--bg)', border: 'none', cursor: 'pointer', fontSize: '12px' }}>
                  Fermer
                </button>
              </motion.div>
            ) : results.length > 0 ? (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p className="font-ui" style={{ fontSize: '9px', letterSpacing: '0.16em', color: 'var(--muted)',
                  textTransform: 'uppercase', padding: '8px 20px 6px' }}>
                  Dans notre base
                </p>
                {results.map((p, i) => (
                  <button key={p.id} type="button" onClick={() => handleSelectFromDB(p)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '14px',
                      padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                      borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                    {p.coverPhoto ? (
                      <img src={p.coverPhoto} alt={p.name}
                        style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'var(--surface-3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                        {CAT_EMOJI[p.category] ?? '◎'}
                      </div>
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p className="font-display font-medium"
                        style={{ fontSize: '1rem', color: 'var(--cream)', fontStyle: 'italic',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.name}
                      </p>
                      <p className="font-ui" style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '3px',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {CAT_EMOJI[p.category]} {p.category}
                        {p.address ? ` · ${p.address}` : ''}
                      </p>
                    </div>
                    <span className="font-ui font-medium"
                      style={{ flexShrink: 0, fontSize: '10px', color: 'var(--accent)',
                        background: 'rgba(138,156,30,0.12)', border: '1px solid rgba(138,156,30,0.25)',
                        borderRadius: '6px', padding: '3px 8px' }}>
                      + Ajouter
                    </span>
                  </button>
                ))}
              </motion.div>
            ) : hasSearched && query.trim().length >= 2 ? (
              <motion.div key="not-found" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                  padding: '32px 24px', textAlign: 'center' }}>
                <p className="font-ui font-medium" style={{ fontSize: '13px', color: 'var(--cream)' }}>
                  « {query} » n'est pas encore dans notre base.
                </p>
                <p className="font-ui" style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: 1.6 }}>
                  On peut l'ajouter pour toi — la fiche sera créée sous 48h.
                </p>
                <button onClick={() => void handleSendRequest()} disabled={sending}
                  className="font-ui font-medium"
                  style={{ marginTop: '8px', padding: '11px 28px', borderRadius: '10px',
                    background: sending ? 'var(--surface-3)' : 'var(--cream)',
                    color: sending ? 'var(--muted)' : 'var(--bg)',
                    border: 'none', cursor: sending ? 'default' : 'pointer', fontSize: '12px',
                    letterSpacing: '0.06em' }}>
                  {sending ? 'Envoi…' : 'Envoyer une demande'}
                </button>
              </motion.div>
            ) : !hasSearched && query.trim().length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '40px 24px', textAlign: 'center', gap: '8px' }}>
                <span style={{ fontSize: '32px', opacity: 0.25 }}>🍽</span>
                <p className="font-ui" style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6 }}>
                  Tape le nom ou l'adresse d'un restaurant parisien
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Formulaire d'édition complet (inchangé) ───────────────────────────────────
import { useState as useStateEdit, useRef as useRefEdit, useCallback as useCallbackEdit, useEffect } from 'react'
import { Place as PlaceType, PlaceCategory, NominatimResult } from '../types'
import { detectUrlType, parseShareUrl } from '../lib/parseShareUrl'

const CATEGORIES: PlaceCategory[] = ['Restaurant', 'Café', 'Bar', 'Boutique', 'Activité', 'Autre']
const TAG_SUGGESTIONS = ['romantique', 'date', 'gastronomique', 'naturel', 'terrasse', 'brunch', 'soirée', 'rapide', 'végé', 'incontournable', 'caché', 'festif', 'business', 'familial']
const CAT_EMOJI_EDIT: Record<PlaceCategory, string> = {
  Restaurant: '🍽', Café: '☕', Bar: '🍷', Boutique: '🛍', Activité: '✦', Autre: '◎',
}

function EditForm({ editPlace, onUpdate, onClose }: {
  editPlace: PlaceType
  onUpdate: (id: string, data: Partial<PlaceType>) => void
  onClose: () => void
}) {
  const [name,        setName]        = useStateEdit(editPlace.name)
  const [category,    setCategory]    = useStateEdit<PlaceCategory>(editPlace.category as PlaceCategory)
  const [address,     setAddress]     = useStateEdit(editPlace.address)
  const [notes,       setNotes]       = useStateEdit(editPlace.notes ?? '')
  const [instagram,   setInstagram]   = useStateEdit(editPlace.instagram ?? '')
  const [coverPhoto,  setCoverPhoto]  = useStateEdit(editPlace.coverPhoto ?? '')
  const [description, setDescription] = useStateEdit(editPlace.description ?? '')
  const [likedAspects,setLikedAspects]= useStateEdit(editPlace.likedAspects ?? '')
  const [orderedItems,setOrderedItems]= useStateEdit(editPlace.orderedItems ?? '')
  const [tags,        setTags]        = useStateEdit<string[]>(editPlace.tags ?? [])
  const [priceRange,  setPriceRange]  = useStateEdit<1|2|3|4|undefined>(editPlace.priceRange)
  const [coverPhotoError, setCoverPhotoError] = useStateEdit(false)
  const [coords, setCoords]           = useStateEdit({ lat: editPlace.lat, lng: editPlace.lng })
  const [suggestions, setSuggestions] = useStateEdit<NominatimResult[]>([])
  const [searching,   setSearching]   = useStateEdit(false)
  const [showSug,     setShowSug]     = useStateEdit(false)
  const [tab,         setTab]         = useStateEdit<'info' | 'critique'>('info')
  const [igUrl,       setIgUrl]       = useStateEdit('')
  const [igLoading,   setIgLoading]   = useStateEdit(false)
  const [igError,     setIgError]     = useStateEdit('')
  const [igPreview,   setIgPreview]   = useStateEdit<{ thumb: string; caption: string } | null>(null)
  const debounceRef = useRefEdit<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallbackEdit(async (q: string) => {
    if (q.length < 3) { setSuggestions([]); return }
    setSearching(true)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + ' Paris')}&limit=5&accept-language=fr&countrycodes=fr&viewbox=2.225,48.902,2.470,48.815&bounded=1`)
      const data: NominatimResult[] = await res.json()
      setSuggestions(data)
      setShowSug(true)
    } catch { setSuggestions([]) }
    finally { setSearching(false) }
  }, [])

  const handleAddressChange = (v: string) => {
    setAddress(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(v), 380)
  }

  const pickSuggestion = (r: NominatimResult) => {
    setAddress(r.display_name)
    setCoords({ lat: parseFloat(r.lat), lng: parseFloat(r.lon) })
    setSuggestions([]); setShowSug(false)
  }

  const importFromUrl = useCallbackEdit(async (url: string) => {
    setIgLoading(true); setIgError(''); setIgPreview(null)
    const type = detectUrlType(url)
    if (type === 'google-maps' || type === 'apple-maps') {
      try {
        const parsed = await parseShareUrl(url)
        if (!parsed) { setIgError('Impossible de lire cette URL.'); setIgLoading(false); return }
        if (parsed.name && !name) setName(parsed.name)
        if (parsed.address && !address) setAddress(parsed.address)
        if (parsed.lat && parsed.lng) setCoords({ lat: parsed.lat, lng: parsed.lng })
        setIgPreview({ thumb: '', caption: `${parsed.name ?? ''}${parsed.address ? ` · ${parsed.address}` : ''}` })
      } catch { setIgError('Erreur lors de la lecture de l\'URL Maps.') }
      setIgLoading(false); return
    }
    if (!url.includes('instagram.com')) { setIgError('URL non reconnue (Instagram, Google Maps, Apple Maps)'); setIgLoading(false); return }
    try {
      const workerUrl = import.meta.env.VITE_PROXY_WORKER_URL ?? 'http://localhost:8787'
      const proxy = `${workerUrl}?url=${encodeURIComponent(url)}`
      const res = await fetch(proxy)
      const data = await res.json() as { contents?: string }
      const html: string = data.contents ?? ''
      const getTag = (prop: string) => {
        const m = html.match(new RegExp(`<meta[^>]+(?:property|name)="${prop}"[^>]+content="([^"]+)"`, 'i'))
          || html.match(new RegExp(`<meta[^>]+content="([^"]+)"[^>]+(?:property|name)="${prop}"`, 'i'))
        return m ? m[1].replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&quot;/g, '"') : ''
      }
      const ogTitle = getTag('og:title')
      const ogImage = getTag('og:image')
      const ogDesc  = getTag('og:description')
      const caption = ogDesc || ogTitle
      if (!ogImage && !caption) { setIgError('Impossible de lire ce post (compte privé ?)'); setIgLoading(false); return }
      const firstLine = caption.split(/\n|#/)[0].trim()
      const guessedName = firstLine.length > 2 && firstLine.length < 60 ? firstLine : ''
      setIgPreview({ thumb: ogImage, caption })
      if (ogImage && !coverPhoto) setCoverPhoto(ogImage)
      if (guessedName && !name) setName(guessedName)
      if (!instagram) setInstagram(url)
    } catch { setIgError('Erreur réseau — réessaie') }
    setIgLoading(false)
  }, [coverPhoto, name, instagram, address])

  useEffect(() => {
    if (!igUrl.includes('instagram.com/')) return
    const t = setTimeout(() => importFromUrl(igUrl), 600)
    return () => clearTimeout(t)
  }, [igUrl, importFromUrl])

  const handleSubmit = () => {
    if (!name.trim()) return
    onUpdate(editPlace.id, {
      name: name.trim(), address: address.trim() || editPlace.address, category,
      notes: notes.trim() || undefined, lat: coords.lat, lng: coords.lng,
      instagram: instagram.trim() || undefined, coverPhoto: coverPhoto.trim() || undefined,
      description: description.trim() || undefined, likedAspects: likedAspects.trim() || undefined,
      orderedItems: orderedItems.trim() || undefined, tags: tags.length > 0 ? tags : undefined, priceRange,
    })
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[2000] flex items-center justify-center"
      style={{ background: 'rgba(9,12,6,0.72)', backdropFilter: 'blur(14px)', padding: '16px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }} transition={{ type: 'spring', damping: 32, stiffness: 340 }}
        className="flex flex-col w-full"
        style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: '20px',
          maxWidth: '460px', maxHeight: '88dvh', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.65)' }}>
        <div className="flex items-center justify-between flex-shrink-0"
          style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <p className="font-ui" style={{ fontSize: '10px', letterSpacing: '0.2em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '3px' }}>Modifier</p>
            <h2 className="font-display font-medium" style={{ fontSize: '1.35rem', color: 'var(--cream)' }}>{editPlace.name}</h2>
          </div>
          <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--surface-3)', color: 'var(--cream-dim)', fontSize: '17px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
        </div>
        <div className="flex flex-shrink-0" style={{ borderBottom: '1px solid var(--border)', padding: '0 20px' }}>
          {(['info', 'critique'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className="font-ui font-medium"
              style={{ padding: '10px 14px', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase',
                color: tab === t ? 'var(--cream)' : 'var(--muted)', background: 'none', border: 'none',
                borderBottom: tab === t ? '2px solid var(--cream)' : '2px solid transparent', cursor: 'pointer' }}>
              {t === 'info' ? 'Infos' : 'Critique'}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {tab === 'info' ? (
            <>
              <div style={{ background: 'var(--surface-3)', borderRadius: '12px', padding: '12px 14px', border: '1px solid var(--border-2)' }}>
                <label style={{ ...lbl, marginBottom: '8px' }}><span style={{ marginRight: '6px' }}>📎</span> Importer un lien</label>
                <div style={{ position: 'relative' }}>
                  <input value={igUrl} onChange={e => { setIgUrl(e.target.value); setIgError('') }}
                    placeholder="Instagram, Google Maps, Apple Maps…" style={{ ...inp, background: 'var(--surface-2)', paddingRight: igLoading ? '36px' : '14px' }} />
                  {igLoading && <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--muted)' }}>…</span>}
                </div>
                {igError && <p className="font-ui" style={{ fontSize: '11px', color: 'var(--disliked)', marginTop: '6px' }}>{igError}</p>}
                {igPreview && (
                  <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    {igPreview.thumb && <img src={igPreview.thumb} alt="" style={{ width: '52px', height: '52px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="font-ui" style={{ fontSize: '10px', color: 'var(--liked)', marginBottom: '3px' }}>✓ Infos importées</p>
                      <p className="font-ui" style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{igPreview.caption}</p>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label style={lbl}>Nom *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Le Comptoir du Relais…" required autoFocus style={inp} />
              </div>
              <div>
                <label style={lbl}>Catégorie</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat} type="button" onClick={() => setCategory(cat)} className="font-ui font-medium transition-all"
                      style={{ padding: '7px 14px', borderRadius: '99px', fontSize: '12px', background: category === cat ? 'var(--cream)' : 'var(--surface-3)', color: category === cat ? 'var(--bg)' : 'var(--cream-dim)', border: category === cat ? 'none' : '1px solid var(--border-2)', cursor: 'pointer' }}>
                      {CAT_EMOJI_EDIT[cat]} {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>Fourchette de prix</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {([1, 2, 3, 4] as const).map(n => (
                    <button key={n} type="button" onClick={() => setPriceRange(priceRange === n ? undefined : n)} className="font-ui font-medium"
                      style={{ flex: 1, padding: '8px 4px', borderRadius: '10px', fontSize: '12px', cursor: 'pointer', background: priceRange === n ? 'var(--cream)' : 'var(--surface-3)', color: priceRange === n ? 'var(--bg)' : 'var(--muted)', border: priceRange === n ? 'none' : '1px solid var(--border-2)' }}>
                      {'€'.repeat(n)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>Tags</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {TAG_SUGGESTIONS.map(tag => {
                    const active = tags.includes(tag)
                    return (
                      <button key={tag} type="button" onClick={() => setTags(active ? tags.filter(t => t !== tag) : [...tags, tag])} className="font-ui font-medium transition-all"
                        style={{ padding: '5px 11px', borderRadius: '99px', fontSize: '11px', background: active ? 'rgba(160,168,40,0.18)' : 'var(--surface-3)', color: active ? 'var(--kaki-light)' : 'var(--muted)', border: active ? '1px solid rgba(160,168,40,0.4)' : '1px solid var(--border-2)', cursor: 'pointer' }}>
                        # {tag}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="relative">
                <label style={lbl}>Adresse {searching && <span style={{ marginLeft: '6px', color: 'var(--accent)', opacity: 0.7 }}>recherche…</span>}</label>
                <input value={address} onChange={e => handleAddressChange(e.target.value)} onBlur={() => setTimeout(() => setShowSug(false), 150)} placeholder="Rechercher une adresse à Paris…" style={inp} />
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
              <div>
                <label style={{ ...lbl, marginBottom: '4px' }}>Photo de couverture</label>
                <input value={coverPhoto} onChange={e => { setCoverPhoto(e.target.value); setCoverPhotoError(false) }} placeholder="https://…" style={{ ...inp, marginBottom: coverPhoto && !coverPhotoError ? '10px' : '0' }} />
                {coverPhoto && !coverPhotoError && (
                  <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', height: '110px' }}>
                    <img src={coverPhoto} alt="Aperçu" onError={() => setCoverPhotoError(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={() => setCoverPhoto('')} style={{ position: 'absolute', top: '8px', right: '8px', width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(9,12,6,0.7)', color: 'var(--cream)', border: 'none', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                  </div>
                )}
                {coverPhotoError && <p className="font-ui" style={{ fontSize: '11px', color: 'var(--disliked)', marginTop: '6px' }}>Image inaccessible — vérifiez l'URL</p>}
              </div>
              <div>
                <label style={lbl}>Instagram (profil)</label>
                <input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="https://instagram.com/nomdulieu" style={inp} />
              </div>
              <div>
                <label style={lbl}>Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Recommandé par, horaires, réservation…" rows={3} style={{ ...inp, resize: 'none', lineHeight: '1.6' }} />
              </div>
            </>
          ) : (
            <>
              <div>
                <label style={lbl}>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Décrivez l'endroit, son ambiance, son style culinaire…" rows={4} style={{ ...inp, resize: 'none', lineHeight: '1.65' }} />
              </div>
              <div>
                <label style={lbl}>Ce qu'on a aimé</label>
                <textarea value={likedAspects} onChange={e => setLikedAspects(e.target.value)} placeholder="Les plats signature, le service, l'ambiance, les vins…" rows={3} style={{ ...inp, resize: 'none', lineHeight: '1.65' }} />
              </div>
              <div>
                <label style={lbl}>Ce qu'on a commandé</label>
                <textarea value={orderedItems} onChange={e => setOrderedItems(e.target.value)} placeholder="Les entrées, plats, desserts, vins…" rows={3} style={{ ...inp, resize: 'none', lineHeight: '1.65' }} />
              </div>
            </>
          )}
        </div>
        <div className="px-5 py-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={handleSubmit} disabled={!name.trim()} className="w-full font-ui font-semibold transition-all"
            style={{ padding: '14px', borderRadius: '12px', background: name.trim() ? 'var(--cream)' : 'var(--surface-3)', color: name.trim() ? 'var(--bg)' : 'var(--muted)', fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: name.trim() ? 'pointer' : 'not-allowed', border: 'none' }}>
            Enregistrer les modifications
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
