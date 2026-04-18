import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Place } from '../types'
import { supabase, GroupRow, PlaceRow, ProposalRow, ProposalVoteRow } from '../lib/supabase'
import { rowToPlace } from '../lib/places'
import { useAuth } from '../lib/auth'

type GroupListRow = { role: string; groups: GroupRow }

interface GroupPlacePin extends Place {
  addedBy: string | null
}

const STATUS_COLORS = {
  wishlist: { fill: '#F4EFE2', stroke: '#262F18' },
  liked:    { fill: '#4A7A50', stroke: '#3A5E3F' },
  disliked: { fill: '#7A3A3A', stroke: '#5E3030' },
}

function GroupMarkers({ places, onSelectRef }: {
  places: GroupPlacePin[]
  onSelectRef: React.MutableRefObject<(p: GroupPlacePin) => void>
}) {
  const map = useMap()
  const markersRef = useRef<L.Marker[]>([])

  useEffect(() => {
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    places.forEach(p => {
      const c = STATUS_COLORS[p.status]
      const icon = L.divIcon({
        html: `<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="${c.fill}" stroke="${c.stroke}" stroke-width="2"/></svg>`,
        className: 'kaki-pin', iconSize: [16, 16], iconAnchor: [8, 8],
      })
      const marker = L.marker([p.lat, p.lng], { icon }).addTo(map)
      marker.on('click', e => { L.DomEvent.stopPropagation(e); onSelectRef.current(p) })
      markersRef.current.push(marker)
    })
    if (places.length > 0) {
      const bounds = L.latLngBounds(places.map(p => [p.lat, p.lng]))
      map.fitBounds(bounds, { padding: [50, 50] })
    } else {
      map.setView([48.8566, 2.3522], 13)
    }
    return () => { markersRef.current.forEach(m => m.remove()); markersRef.current = [] }
  }, [places, map, onSelectRef])

  return null
}

const CAT_EMOJI: Record<string, string> = {
  Restaurant: '🍽', Café: '☕', Bar: '🍷', Boutique: '🛍', Activité: '✦', Autre: '◎',
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  liked:    { label: 'Aimé',     color: 'var(--liked)'    },
  wishlist: { label: 'À tester', color: 'var(--accent)'   },
  disliked: { label: 'Bof',      color: 'var(--disliked)' },
}

interface Props {
  onBack: () => void
  myPlaces: Place[]
}

export default function GroupView({ onBack, myPlaces }: Props) {
  const { user } = useAuth()
  const [rows, setRows] = useState<GroupListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [selected, setSelected] = useState<GroupRow | null>(null)
  const [pins, setPins] = useState<GroupPlacePin[]>([])
  const [loadingPins, setLoadingPins] = useState(false)
  const [newName, setNewName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [cardPlace, setCardPlace] = useState<GroupPlacePin | null>(null)
  const [showAddPicker, setShowAddPicker] = useState(false)
  const [memberLabels, setMemberLabels] = useState<Record<string, string>>({})

  // ── Votes ──────────────────────────────────────────────────────────────────
  type ProposalWithVotes = ProposalRow & { yeas: number; nays: number; myVote: boolean | null; placeName: string }
  const [proposals, setProposals] = useState<ProposalWithVotes[]>([])

  const loadProposals = useCallback(async (groupId: string) => {
    const today = new Date().toISOString().slice(0, 10)
    const { data: prows } = await supabase
      .from('group_proposals')
      .select('*')
      .eq('group_id', groupId)
      .eq('proposed_for', today)
      .order('created_at', { ascending: false })

    if (!prows || prows.length === 0) { setProposals([]); return }

    const ids = (prows as ProposalRow[]).map(p => p.id)
    const { data: votes } = await supabase
      .from('group_proposal_votes')
      .select('proposal_id, user_id, vote')
      .in('proposal_id', ids)

    const voteRows = (votes ?? []) as ProposalVoteRow[]

    setProposals((prows as ProposalRow[]).map(p => {
      const pvotes = voteRows.filter(v => v.proposal_id === p.id)
      const mine = pvotes.find(v => v.user_id === user?.id)
      const place = pins.find(pl => pl.id === p.place_id)
      return {
        ...p,
        yeas: pvotes.filter(v => v.vote).length,
        nays: pvotes.filter(v => !v.vote).length,
        myVote: mine ? mine.vote : null,
        placeName: place?.name ?? p.place_id.slice(0, 8),
      }
    }))
  }, [user?.id, pins])

  useEffect(() => {
    if (selected) void loadProposals(selected.id)
  }, [selected, pins, loadProposals])

  const propose = async (placeId: string) => {
    if (!user || !selected) return
    const today = new Date().toISOString().slice(0, 10)
    const { error } = await supabase.from('group_proposals').insert({
      group_id: selected.id, place_id: placeId, proposed_by: user.id, proposed_for: today,
    })
    if (!error) void loadProposals(selected.id)
    else setErr(error.message.includes('unique') ? 'Déjà proposé aujourd\'hui.' : error.message)
  }

  const castVote = async (proposalId: string, vote: boolean) => {
    if (!user) return
    const existing = proposals.find(p => p.id === proposalId)?.myVote
    if (existing === vote) {
      await supabase.from('group_proposal_votes').delete().eq('proposal_id', proposalId).eq('user_id', user.id)
    } else {
      await supabase.from('group_proposal_votes').upsert({ proposal_id: proposalId, user_id: user.id, vote })
    }
    if (selected) void loadProposals(selected.id)
  }

  const onSelectRef = useRef<(p: GroupPlacePin) => void>(() => {})
  onSelectRef.current = useCallback((p: GroupPlacePin) => setCardPlace(p), [])

  const loadGroups = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setErr(null)
    const { data, error } = await supabase
      .from('group_members')
      .select('role, groups(id, name, invite_code, created_by, created_at)')
      .eq('user_id', user.id)

    if (error) {
      setErr(error.message)
      setRows([])
    } else {
      const raw = data as unknown as { role: string; groups: GroupRow | GroupRow[] | null }[]
      const list: GroupListRow[] = raw
        .map(r => {
          const g = r.groups
          const group = Array.isArray(g) ? g[0] : g
          return group ? { role: r.role, groups: group } : null
        })
        .filter((x): x is GroupListRow => x != null)
      setRows(list)
    }
    setLoading(false)
  }, [user])

  useEffect(() => { void loadGroups() }, [loadGroups])

  const loadGroupPins = useCallback(async (g: GroupRow) => {
    setLoadingPins(true)
    setCardPlace(null)
    const { data, error } = await supabase
      .from('group_places')
      .select('place_id, added_by, places(*)')
      .eq('group_id', g.id)

    if (error) {
      setErr(error.message)
      setPins([])
      setLoadingPins(false)
      return
    }

    const list: GroupPlacePin[] = []
    for (const row of (data ?? []) as unknown as { place_id: string; added_by: string | null; places: PlaceRow | PlaceRow[] | null }[]) {
      const raw = row.places
      const placeRow = Array.isArray(raw) ? raw[0] : raw
      if (!placeRow) continue
      const p = rowToPlace(placeRow)
      list.push({ ...p, addedBy: row.added_by })
    }
    setPins(list)
    setLoadingPins(false)

    const ids = [...new Set(list.map(p => p.addedBy).filter(Boolean))] as string[]
    if (ids.length === 0) {
      setMemberLabels({})
      return
    }
    const { data: profs } = await supabase.from('users').select('id, username').in('id', ids)
    const map: Record<string, string> = {}
    for (const u of (profs ?? []) as { id: string; username: string | null }[]) {
      map[u.id] = u.username?.trim() || u.id.slice(0, 6)
    }
    setMemberLabels(map)
  }, [])

  useEffect(() => {
    if (selected) void loadGroupPins(selected)
  }, [selected, loadGroupPins])

  const placeIdsInGroup = useMemo(() => new Set(pins.map(p => p.id)), [pins])

  const addablePlaces = useMemo(
    () => myPlaces.filter(p => !placeIdsInGroup.has(p.id)),
    [myPlaces, placeIdsInGroup],
  )

  const handleCreate = async () => {
    if (!newName.trim() || busy) return
    setBusy(true)
    setErr(null)
    const { data, error } = await supabase.rpc('create_group', { p_name: newName.trim() })
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    const g = data as GroupRow
    setNewName('')
    await loadGroups()
    setSelected(g)
  }

  const handleJoin = async () => {
    if (!joinCode.trim() || busy) return
    setBusy(true)
    setErr(null)
    const { data: gid, error } = await supabase.rpc('join_group_by_invite', { p_code: joinCode.trim() })
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    if (!gid) {
      setErr('Code d’invitation invalide')
      return
    }
    setJoinCode('')
    await loadGroups()
    const { data: g } = await supabase.from('groups').select('*').eq('id', gid).maybeSingle()
    if (g) setSelected(g as GroupRow)
  }

  const copyInvite = (code: string | null) => {
    if (!code) return
    void navigator.clipboard.writeText(code)
  }

  const addPlaceToGroup = async (placeId: string) => {
    if (!user || !selected) return
    setBusy(true)
    const { error } = await supabase.from('group_places').insert({
      group_id: selected.id,
      place_id: placeId,
      added_by: user.id,
    })
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    setShowAddPicker(false)
    void loadGroupPins(selected)
  }

  const removePlaceFromGroup = async (placeId: string) => {
    if (!selected) return
    setBusy(true)
    const { error } = await supabase.from('group_places').delete().eq('group_id', selected.id).eq('place_id', placeId)
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    setCardPlace(null)
    void loadGroupPins(selected)
  }

  const leaveGroup = async () => {
    if (!user || !selected) return
    setBusy(true)
    const { error } = await supabase.from('group_members').delete().eq('group_id', selected.id).eq('user_id', user.id)
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    setSelected(null)
    setPins([])
    void loadGroups()
  }

  if (selected) {
    return (
      <div style={{ height: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: 'rgba(13,14,11,0.95)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border)', flexShrink: 0, zIndex: 10, padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <button type="button" onClick={() => { setSelected(null); setPins([]); setCardPlace(null) }} className="font-ui"
              style={{ fontSize: '11px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>←</button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="font-ui font-semibold" style={{ fontSize: '14px', color: 'var(--cream)' }}>{selected.name}</p>
              {selected.invite_code && (
                <button type="button" onClick={() => copyInvite(selected.invite_code)}
                  className="font-ui"
                  style={{ marginTop: '4px', fontSize: '10px', color: 'var(--muted)', background: 'var(--surface-3)',
                    border: '1px solid var(--border)', borderRadius: '8px', padding: '4px 8px', cursor: 'pointer' }}>
                  Code : {selected.invite_code} · copier
                </button>
              )}
            </div>
            <button type="button" onClick={() => setShowAddPicker(true)} disabled={busy || addablePlaces.length === 0}
              className="font-ui font-medium"
              style={{ fontSize: '11px', color: 'var(--bg)', background: addablePlaces.length ? 'var(--cream)' : 'rgba(255,255,255,0.15)',
                border: 'none', borderRadius: '10px', padding: '8px 12px', cursor: addablePlaces.length ? 'pointer' : 'default' }}>
              + Lieu
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {pins.length === 0 && !loadingPins && (
              <span className="font-ui" style={{ fontSize: '10px', color: 'var(--muted)' }}>Aucune adresse partagée encore</span>
            )}
            <button type="button" onClick={() => void leaveGroup()} disabled={busy}
              className="font-ui" style={{ fontSize: '10px', color: '#c97a7a', background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}>
              Quitter le groupe
            </button>
          </div>
          {err && <p className="font-ui" style={{ marginTop: '8px', fontSize: '11px', color: '#c97a7a' }}>{err}</p>}

          {/* ── Votes du soir ── */}
          {proposals.length > 0 && (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <p className="font-ui" style={{ fontSize: '10px', letterSpacing: '0.12em', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '2px' }}>
                Ce soir — votes
              </p>
              {proposals.map(prop => (
                <div key={prop.id} style={{ display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'var(--surface-3)', borderRadius: '10px', padding: '8px 10px' }}>
                  <p className="font-ui font-medium" style={{ flex: 1, fontSize: '12px', color: 'var(--cream)', minWidth: 0,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prop.placeName}</p>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <button type="button" onClick={() => void castVote(prop.id, true)}
                      className="font-ui font-medium"
                      style={{ height: '28px', padding: '0 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px',
                        background: prop.myVote === true ? 'rgba(38,128,66,0.35)' : 'rgba(255,255,255,0.07)',
                        color: prop.myVote === true ? 'var(--liked)' : 'rgba(255,255,255,0.4)' }}>
                      ✓ {prop.yeas}
                    </button>
                    <button type="button" onClick={() => void castVote(prop.id, false)}
                      className="font-ui font-medium"
                      style={{ height: '28px', padding: '0 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px',
                        background: prop.myVote === false ? 'rgba(156,48,48,0.3)' : 'rgba(255,255,255,0.07)',
                        color: prop.myVote === false ? '#c05050' : 'rgba(255,255,255,0.4)' }}>
                      ✗ {prop.nays}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: 1, position: 'relative' }}>
          <MapContainer center={[48.8566, 2.3522]} zoom={13}
            style={{ height: '100%', width: '100%' }} zoomControl={false}>
            <TileLayer
              attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              maxZoom={19}
            />
            <GroupMarkers places={pins} onSelectRef={onSelectRef} />
          </MapContainer>

          {loadingPins && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(13,14,11,0.35)', pointerEvents: 'none' }}>
              <span className="font-ui" style={{ fontSize: '12px', color: 'var(--muted)' }}>Chargement…</span>
            </div>
          )}

          <AnimatePresence>
            {cardPlace && (
              <motion.div
                key={cardPlace.id}
                initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}
                style={{ position: 'absolute', zIndex: 20, bottom: pins.length ? '168px' : '24px', left: '50%', transform: 'translateX(-50%)',
                  width: 'min(300px, calc(100% - 28px))', background: 'rgba(20,21,18,0.97)', backdropFilter: 'blur(20px)',
                  borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 12px 40px rgba(0,0,0,0.65)', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div>
                    <p className="font-display font-medium" style={{ fontSize: '1rem', color: 'var(--cream)', fontStyle: 'italic' }}>{cardPlace.name}</p>
                    <p className="font-ui" style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px' }}>
                      {CAT_EMOJI[cardPlace.category]} {cardPlace.category}
                      <span style={{ opacity: 0.35, margin: '0 5px' }}>·</span>
                      {STATUS_LABEL[cardPlace.status].label}
                    </p>
                    {cardPlace.addedBy && memberLabels[cardPlace.addedBy] && (
                      <p className="font-ui" style={{ fontSize: '9px', color: 'var(--muted)', marginTop: '4px' }}>
                        Ajouté par @{memberLabels[cardPlace.addedBy]}
                      </p>
                    )}
                  </div>
                  <button type="button" onClick={() => setCardPlace(null)}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: '16px' }}>×</button>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button type="button" onClick={() => void propose(cardPlace.id)} disabled={busy}
                    className="font-ui font-medium"
                    style={{ height: '34px', padding: '0 10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      background: 'rgba(138,156,30,0.2)', color: 'var(--accent)', fontSize: '11px', flexShrink: 0 }}>
                    Ce soir ?
                  </button>
                  <button type="button" onClick={() => {
                    const dest = encodeURIComponent(cardPlace.address)
                    window.open(`https://www.google.com/maps/dir//${dest}`, '_blank')
                  }}
                    className="font-ui font-medium"
                    style={{ flex: 1, height: '34px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      background: 'var(--cream)', color: 'var(--bg)', fontSize: '11px' }}>
                    📍 Itinéraire
                  </button>
                  {cardPlace.addedBy === user?.id && (
                    <button type="button" onClick={() => void removePlaceFromGroup(cardPlace.id)} disabled={busy}
                      className="font-ui"
                      style={{ height: '34px', borderRadius: '8px', border: '1px solid rgba(255,100,100,0.35)',
                        background: 'rgba(80,30,30,0.25)', color: '#e0a0a0', fontSize: '10px', cursor: 'pointer', padding: '0 10px' }}>
                      Retirer
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {pins.length > 0 && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 15,
              background: 'linear-gradient(to top, rgba(13,14,11,0.97) 60%, transparent)', padding: '28px 0 0' }}>
              <div style={{ display: 'flex', gap: '10px', padding: '0 16px 20px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                {pins.map(p => (
                  <button key={p.id} type="button" onClick={() => setCardPlace(cardPlace?.id === p.id ? null : p)}
                    style={{ flexShrink: 0, width: '110px', background: 'rgba(22,23,20,0.96)',
                      border: `1px solid ${cardPlace?.id === p.id ? 'rgba(138,156,30,0.6)' : 'rgba(255,255,255,0.07)'}`,
                      borderRadius: '14px', overflow: 'hidden', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                    {p.coverPhoto ? (
                      <div style={{ height: '60px', overflow: 'hidden' }}>
                        <img src={p.coverPhoto} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : (
                      <div style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(255,255,255,0.04)', fontSize: '18px', opacity: 0.35 }}>{CAT_EMOJI[p.category]}</div>
                    )}
                    <div style={{ padding: '7px 9px 9px' }}>
                      <p className="font-display font-medium" style={{ fontSize: '0.78rem', color: 'var(--cream)', fontStyle: 'italic',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <AnimatePresence>
          {showAddPicker && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
              onClick={() => setShowAddPicker(false)}>
              <motion.div
                initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }}
                onClick={e => e.stopPropagation()}
                style={{ width: '100%', maxWidth: 480, maxHeight: '70vh', overflow: 'auto',
                  background: 'var(--surface)', borderTopLeftRadius: '20px', borderTopRightRadius: '20px',
                  border: '1px solid var(--border)', padding: '20px 16px' }}>
                <p className="font-ui font-semibold" style={{ fontSize: '14px', color: 'var(--cream)', marginBottom: '12px' }}>Tes lieux à partager</p>
                {addablePlaces.length === 0 ? (
                  <p className="font-ui" style={{ fontSize: '12px', color: 'var(--muted)' }}>Rien à ajouter pour l’instant.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {addablePlaces.map(p => (
                      <button key={p.id} type="button" onClick={() => void addPlaceToGroup(p.id)} disabled={busy}
                        className="font-ui"
                        style={{ textAlign: 'left', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)',
                          background: 'var(--surface-3)', color: 'var(--cream)', cursor: 'pointer', fontSize: '13px' }}>
                        {p.name}
                        <span style={{ display: 'block', fontSize: '10px', color: 'var(--muted)', marginTop: '4px' }}>{p.address}</span>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div style={{ height: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <button type="button" onClick={onBack} className="font-ui"
            style={{ fontSize: '11px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>←</button>
          <h1 className="font-ui font-semibold" style={{ fontSize: '16px', color: 'var(--cream)' }}>Groupes</h1>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nouveau groupe…"
            className="font-ui"
            style={{ flex: 1, background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: '10px',
              padding: '10px 12px', color: 'var(--cream)', fontSize: '13px', outline: 'none' }} />
          <button type="button" onClick={() => void handleCreate()} disabled={busy || !newName.trim()}
            className="font-ui font-medium"
            style={{ padding: '10px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              background: 'var(--cream)', color: 'var(--bg)', fontSize: '12px' }}>Créer</button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <input value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="Code d’invitation"
            className="font-ui"
            style={{ flex: 1, background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: '10px',
              padding: '10px 12px', color: 'var(--cream)', fontSize: '13px', outline: 'none' }} />
          <button type="button" onClick={() => void handleJoin()} disabled={busy || !joinCode.trim()}
            className="font-ui font-medium"
            style={{ padding: '10px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              background: 'rgba(255,255,255,0.1)', color: 'var(--cream)', fontSize: '12px' }}>Rejoindre</button>
        </div>

        {err && <p className="font-ui" style={{ marginTop: '12px', fontSize: '11px', color: '#c97a7a' }}>{err}</p>}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {loading ? (
          <p className="font-ui" style={{ fontSize: '13px', color: 'var(--muted)' }}>Chargement…</p>
        ) : rows.length === 0 ? (
          <p className="font-ui" style={{ fontSize: '13px', color: 'var(--muted)' }}>Tu n’as pas encore de groupe. Crée-en un ou entre un code.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {rows.map(r => (
              <button key={r.groups.id} type="button" onClick={() => setSelected(r.groups)}
                className="font-ui"
                style={{ textAlign: 'left', padding: '14px', borderRadius: '14px', border: '1px solid var(--border)',
                  background: 'var(--surface-3)', color: 'var(--cream)', cursor: 'pointer' }}>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>{r.groups.name}</span>
                <span style={{ display: 'block', fontSize: '10px', color: 'var(--muted)', marginTop: '4px' }}>{r.role}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
