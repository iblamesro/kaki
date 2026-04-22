import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Place, PlaceCategory } from '../types'
import { rowToPlace } from '../lib/places'
import type { PlaceRow } from '../lib/supabase'

const CATEGORIES: PlaceCategory[] = ['Restaurant', 'Café', 'Bar', 'Boutique', 'Activité', 'Autre']
const CAT_EMOJI: Record<string, string> = {
  Restaurant: '🍽', Café: '☕', Bar: '🍷', Boutique: '🛍', Activité: '✦', Autre: '◎',
}
const ADMIN_EMAIL = 'sara.benabdelkader03@gmail.com'

interface PlaceForm {
  name: string
  address: string
  lat: number
  lng: number
  category: PlaceCategory
  priceRange: 1 | 2 | 3 | 4 | null
  description: string
  tags: string
  googleMapsUrl: string
  reservationUrl: string
  instagramUrl: string
  photos: string[]
}

const EMPTY_FORM: PlaceForm = {
  name: '', address: '', lat: 48.8566, lng: 2.3522,
  category: 'Restaurant', priceRange: null,
  description: '', tags: '', googleMapsUrl: '',
  reservationUrl: '', instagramUrl: '', photos: [],
}

interface Request { id: string; query: string; created_at: string }

export default function AdminPlaceManager() {
  const { user } = useAuth()
  const [places,    setPlaces]    = useState<Place[]>([])
  const [requests,  setRequests]  = useState<Request[]>([])
  const [tab,       setTab]       = useState<'places' | 'add' | 'requests'>('places')
  const [form,      setForm]      = useState<PlaceForm>(EMPTY_FORM)
  const [editId,    setEditId]    = useState<string | null>(null)
  const [saving,    setSaving]    = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg,       setMsg]       = useState('')
  const [dragOver,  setDragOver]  = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const isAdmin = user?.email === ADMIN_EMAIL

  const load = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('places')
      .select('*')
      .eq('user_id', user.id)
      .order('date_added', { ascending: false })
    if (data) setPlaces((data as PlaceRow[]).map(rowToPlace))

    const { data: reqs } = await supabase
      .from('place_requests')
      .select('id, query, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    if (reqs) setRequests(reqs as Request[])
  }, [user])

  useEffect(() => { void load() }, [load])

  // ── Geocode address via Nominatim ──────────────────────────────────────────
  const geocode = async () => {
    if (!form.address.trim()) return
    setGeocoding(true)
    setMsg('')
    try {
      const q = encodeURIComponent(form.address + ', Paris, France')
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
        headers: { 'Accept-Language': 'fr' }
      })
      const data = await res.json() as Array<{ lat: string; lon: string; display_name: string }>
      if (data[0]) {
        setForm(f => ({ ...f, lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }))
        setMsg(`✓ Géocodé : ${parseFloat(data[0].lat).toFixed(5)}, ${parseFloat(data[0].lon).toFixed(5)}`)
      } else {
        setMsg('Adresse introuvable — vérifie et réessaie')
      }
    } catch {
      setMsg('Erreur Nominatim')
    }
    setGeocoding(false)
  }

  // ── Upload photos to Supabase Storage ─────────────────────────────────────
  const uploadFiles = async (files: File[]) => {
    if (!user) return
    setUploading(true)
    const uploaded: string[] = []
    for (const file of files) {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `places/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('place-photos').upload(path, file, {
        upsert: false, contentType: file.type,
      })
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('place-photos').getPublicUrl(path)
        uploaded.push(publicUrl)
      }
    }
    setForm(f => ({ ...f, photos: [...f.photos, ...uploaded] }))
    setUploading(false)
    if (uploaded.length) setMsg(`✓ ${uploaded.length} photo(s) téléversée(s)`)
  }

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const imgs = Array.from(files).filter(f => f.type.startsWith('image/'))
    void uploadFiles(imgs)
  }

  // ── Save place ─────────────────────────────────────────────────────────────
  const save = async () => {
    if (!user || !form.name.trim() || !form.address.trim()) {
      setMsg('Nom et adresse obligatoires')
      return
    }
    setSaving(true); setMsg('')
    const row = {
      user_id:      user.id,
      name:         form.name.trim(),
      address:      form.address.trim(),
      lat:          form.lat,
      lng:          form.lng,
      category:     form.category,
      price_range:  form.priceRange,
      description:  form.description.trim() || null,
      tags:         form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : null,
      cover_photo:  form.photos[0] ?? null,
      instagram_url: form.instagramUrl.trim() || null,
      status:       'liked' as const,
      date_added:   new Date().toISOString(),
    }

    if (editId) {
      await supabase.from('places').update(row).eq('id', editId)
      setMsg('✓ Mis à jour')
    } else {
      await supabase.from('places').insert(row)
      setMsg('✓ Ajouté à la base')
    }
    setSaving(false)
    setForm(EMPTY_FORM); setEditId(null)
    setTab('places')
    void load()
  }

  const startEdit = (p: Place) => {
    setForm({
      name: p.name, address: p.address, lat: p.lat, lng: p.lng,
      category: p.category, priceRange: p.priceRange ?? null,
      description: p.description ?? '', tags: (p.tags ?? []).join(', '),
      googleMapsUrl: '', reservationUrl: '', instagramUrl: p.instagram ?? '',
      photos: p.coverPhoto ? [p.coverPhoto] : [],
    })
    setEditId(p.id)
    setTab('add')
  }

  const deletePlace = async (id: string) => {
    if (!confirm('Supprimer ce restaurant de la base ?')) return
    await supabase.from('places').delete().eq('id', id)
    void load()
  }

  const dismissRequest = async (id: string) => {
    await supabase.from('place_requests').update({ status: 'done' }).eq('id', id)
    void load()
  }

  if (!isAdmin) {
    return (
      <div style={{ height: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="font-ui" style={{ color: 'var(--muted)', fontSize: '13px' }}>Accès restreint</p>
      </div>
    )
  }

  const inp: React.CSSProperties = {
    width: '100%', background: 'var(--surface-3)', border: '1px solid var(--border-2)',
    borderRadius: '10px', color: 'var(--cream)', padding: '10px 14px',
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
    fontSize: '13px', outline: 'none', boxSizing: 'border-box',
  }
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: '9px', letterSpacing: '0.18em', color: 'var(--muted)',
    textTransform: 'uppercase', marginBottom: '6px',
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
  }

  return (
    <div style={{ height: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <p className="font-ui" style={{ fontSize: '9px', letterSpacing: '0.2em', color: 'var(--kaki)', textTransform: 'uppercase', marginBottom: '3px' }}>
            ✦ Administration
          </p>
          <h1 className="font-display font-medium" style={{ fontSize: '1.3rem', color: 'var(--cream)', fontStyle: 'italic' }}>
            Base restaurants
          </h1>
        </div>
        <a href="/" className="font-ui"
          style={{ fontSize: '11px', color: 'var(--muted)', textDecoration: 'none' }}>
          ← App
        </a>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
        {([
          { key: 'places',   label: `Catalogue (${places.length})` },
          { key: 'add',      label: editId ? 'Modifier' : '+ Ajouter' },
          { key: 'requests', label: `Demandes (${requests.length})` },
        ] as { key: typeof tab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className="font-ui font-medium"
            style={{ flex: 1, padding: '12px 8px', fontSize: '11px', cursor: 'pointer', background: 'none',
              border: 'none', borderBottom: tab === t.key ? '2px solid var(--kaki)' : '2px solid transparent',
              color: tab === t.key ? 'var(--kaki-light)' : 'var(--muted)', letterSpacing: '0.06em',
              transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <AnimatePresence mode="wait">

          {/* ── Catalogue ── */}
          {tab === 'places' && (
            <motion.div key="places" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {msg && <p className="font-ui" style={{ fontSize: '12px', color: 'var(--kaki-light)', marginBottom: '12px' }}>{msg}</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {places.map(p => (
                  <div key={p.id}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px',
                      background: 'var(--surface)', border: '1px solid var(--border-2)',
                      borderRadius: '12px', padding: '10px 14px' }}>
                    {p.coverPhoto ? (
                      <img src={p.coverPhoto} alt={p.name}
                        style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: 'var(--surface-3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                        {CAT_EMOJI[p.category] ?? '◎'}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="font-display font-medium"
                        style={{ fontSize: '0.95rem', color: 'var(--cream)', fontStyle: 'italic',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.name}
                      </p>
                      <p className="font-ui" style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.address}
                        {p.lat !== 48.8566 && ` · ✓ géocodé`}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button onClick={() => startEdit(p)} className="font-ui"
                        style={{ padding: '5px 10px', fontSize: '10px', borderRadius: '7px',
                          background: 'var(--surface-3)', border: '1px solid var(--border-2)',
                          color: 'var(--cream-dim)', cursor: 'pointer' }}>
                        Modifier
                      </button>
                      <button onClick={() => void deletePlace(p.id)} className="font-ui"
                        style={{ padding: '5px 10px', fontSize: '10px', borderRadius: '7px',
                          background: 'none', border: '1px solid rgba(156,48,48,0.3)',
                          color: '#c97a7a', cursor: 'pointer' }}>
                        ×
                      </button>
                    </div>
                  </div>
                ))}
                {places.length === 0 && (
                  <p className="font-ui" style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '13px', padding: '40px 0' }}>
                    Aucun restaurant dans la base
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Formulaire ajout/modification ── */}
          {tab === 'add' && (
            <motion.div key="add" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              {msg && (
                <p className="font-ui" style={{ fontSize: '12px', color: 'var(--kaki-light)', marginBottom: '14px' }}>{msg}</p>
              )}

              {/* ── Zone drag & drop photos ── */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
                onClick={() => fileRef.current?.click()}
                style={{ border: `2px dashed ${dragOver ? 'var(--kaki)' : 'var(--border-2)'}`,
                  borderRadius: '16px', padding: '24px', textAlign: 'center',
                  cursor: 'pointer', marginBottom: '20px', transition: 'border-color 0.2s',
                  background: dragOver ? 'rgba(138,156,30,0.05)' : 'transparent' }}
              >
                <input ref={fileRef} type="file" multiple accept="image/*" style={{ display: 'none' }}
                  onChange={e => handleFiles(e.target.files)} />

                {uploading ? (
                  <p className="font-ui" style={{ fontSize: '12px', color: 'var(--muted)' }}>Téléversement…</p>
                ) : form.photos.length > 0 ? (
                  <div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
                      {form.photos.map((url, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          <img src={url} alt=""
                            style={{ width: '72px', height: '72px', borderRadius: '10px', objectFit: 'cover' }} />
                          {i === 0 && (
                            <span className="font-ui" style={{ position: 'absolute', bottom: '3px', left: '3px',
                              fontSize: '8px', background: 'rgba(0,0,0,0.7)', color: '#fff',
                              padding: '1px 4px', borderRadius: '4px' }}>
                              cover
                            </span>
                          )}
                          <button onClick={e => { e.stopPropagation(); setForm(f => ({ ...f, photos: f.photos.filter((_, j) => j !== i) })) }}
                            style={{ position: 'absolute', top: '2px', right: '2px', width: '18px', height: '18px',
                              borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none',
                              color: '#fff', fontSize: '11px', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="font-ui" style={{ fontSize: '10px', color: 'var(--muted)' }}>
                      + Glisser d'autres photos
                    </p>
                  </div>
                ) : (
                  <>
                    <p style={{ fontSize: '28px', marginBottom: '8px', opacity: 0.3 }}>↑</p>
                    <p className="font-ui font-medium" style={{ fontSize: '13px', color: 'var(--cream-dim)', marginBottom: '4px' }}>
                      Glisser les photos ici
                    </p>
                    <p className="font-ui" style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      ou cliquer pour sélectionner · JPG, PNG, WebP
                    </p>
                  </>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Nom */}
                <div>
                  <label style={lbl}>Nom du restaurant *</label>
                  <input style={inp} type="text" placeholder="Em Sherif"
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>

                {/* Adresse + geocode */}
                <div>
                  <label style={lbl}>Adresse *</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input style={{ ...inp, flex: 1 }} type="text" placeholder="4 Rue de Marignan, 75008"
                      value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                    <button onClick={() => void geocode()} disabled={geocoding}
                      className="font-ui font-medium"
                      style={{ padding: '10px 14px', borderRadius: '10px', whiteSpace: 'nowrap', flexShrink: 0,
                        background: geocoding ? 'var(--surface-3)' : 'rgba(138,156,30,0.15)',
                        border: '1px solid rgba(138,156,30,0.3)', color: geocoding ? 'var(--muted)' : 'var(--kaki-light)',
                        fontSize: '11px', cursor: geocoding ? 'default' : 'pointer' }}>
                      {geocoding ? '…' : '⊙ Géocoder'}
                    </button>
                  </div>
                  {form.lat !== 48.8566 && (
                    <p className="font-ui" style={{ fontSize: '10px', color: 'var(--kaki-light)', marginTop: '4px' }}>
                      ✓ {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
                    </p>
                  )}
                </div>

                {/* Catégorie + fourchette prix */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={lbl}>Catégorie</label>
                    <select style={{ ...inp, appearance: 'none' }}
                      value={form.category}
                      onChange={e => setForm(f => ({ ...f, category: e.target.value as PlaceCategory }))}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{CAT_EMOJI[c]} {c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Fourchette</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {([1, 2, 3, 4] as const).map(n => (
                        <button key={n} onClick={() => setForm(f => ({ ...f, priceRange: f.priceRange === n ? null : n }))}
                          className="font-ui font-medium"
                          style={{ flex: 1, padding: '10px 0', borderRadius: '8px', fontSize: '11px', cursor: 'pointer',
                            background: form.priceRange === n ? 'rgba(138,156,30,0.2)' : 'var(--surface-3)',
                            border: `1px solid ${form.priceRange === n ? 'rgba(138,156,30,0.45)' : 'var(--border-2)'}`,
                            color: form.priceRange === n ? 'var(--kaki-light)' : 'var(--muted)',
                            transition: 'all 0.15s' }}>
                          {'€'.repeat(n)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label style={lbl}>Description</label>
                  <textarea style={{ ...inp, resize: 'none', height: '80px' } as React.CSSProperties}
                    placeholder="La grande table libanaise de Paris…"
                    value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>

                {/* Tags */}
                <div>
                  <label style={lbl}>Tags (séparés par virgules)</label>
                  <input style={inp} type="text" placeholder="libanais, mezze, gastronomique"
                    value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
                </div>

                {/* Liens */}
                <div>
                  <label style={lbl}>Google Maps URL</label>
                  <input style={inp} type="url" placeholder="https://maps.google.com/…"
                    value={form.googleMapsUrl} onChange={e => setForm(f => ({ ...f, googleMapsUrl: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>URL Réservation (TheFork, site…)</label>
                  <input style={inp} type="url" placeholder="https://www.thefork.fr/…"
                    value={form.reservationUrl} onChange={e => setForm(f => ({ ...f, reservationUrl: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>Instagram</label>
                  <input style={inp} type="text" placeholder="@emsherifparis"
                    value={form.instagramUrl} onChange={e => setForm(f => ({ ...f, instagramUrl: e.target.value }))} />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
                  <button onClick={() => void save()} disabled={saving} className="font-ui font-semibold"
                    style={{ flex: 1, padding: '13px', borderRadius: '12px', background: 'var(--cream)',
                      color: 'var(--bg)', border: 'none', fontSize: '12px', letterSpacing: '0.06em',
                      cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                    {saving ? '…' : editId ? 'Mettre à jour' : 'Ajouter à la base ✦'}
                  </button>
                  {editId && (
                    <button onClick={() => { setForm(EMPTY_FORM); setEditId(null); setMsg('') }} className="font-ui"
                      style={{ padding: '13px 16px', borderRadius: '12px', background: 'var(--surface-3)',
                        border: '1px solid var(--border-2)', color: 'var(--muted)', fontSize: '12px', cursor: 'pointer' }}>
                      Annuler
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Demandes d'ajout ── */}
          {tab === 'requests' && (
            <motion.div key="requests" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {requests.map(r => (
                  <div key={r.id}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px',
                      background: 'var(--surface)', border: '1px solid var(--border-2)',
                      borderRadius: '12px', padding: '12px 14px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="font-ui font-medium" style={{ fontSize: '13px', color: 'var(--cream)', marginBottom: '2px' }}>
                        {r.query}
                      </p>
                      <p className="font-ui" style={{ fontSize: '10px', color: 'var(--muted)' }}>
                        {new Date(r.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button onClick={() => { setForm({ ...EMPTY_FORM, name: r.query }); setTab('add') }}
                        className="font-ui font-medium"
                        style={{ padding: '6px 12px', fontSize: '10px', borderRadius: '7px',
                          background: 'rgba(138,156,30,0.15)', border: '1px solid rgba(138,156,30,0.3)',
                          color: 'var(--kaki-light)', cursor: 'pointer' }}>
                        Ajouter
                      </button>
                      <button onClick={() => void dismissRequest(r.id)} className="font-ui"
                        style={{ padding: '6px 10px', fontSize: '10px', borderRadius: '7px',
                          background: 'none', border: '1px solid var(--border-2)',
                          color: 'var(--muted)', cursor: 'pointer' }}>
                        ×
                      </button>
                    </div>
                  </div>
                ))}
                {requests.length === 0 && (
                  <p className="font-ui" style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '13px', padding: '40px 0' }}>
                    Aucune demande en attente
                  </p>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
