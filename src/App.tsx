import { useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { usePlaces } from './store'
import { Place } from './types'
import Header from './components/Header'
import MapView from './components/MapView'
import PlaceCard from './components/PlaceCard'
import AddPlaceModal from './components/AddPlaceModal'
import SwipeView from './components/SwipeView'
import LandingPage from './components/LandingPage'
import RestaurantList from './components/RestaurantList'
import RestaurantDetail from './components/RestaurantDetail'
import StatsView from './components/StatsView'
import CeSoirModal from './components/CeSoirModal'

type Screen =
  | { name: 'landing' }
  | { name: 'map' }
  | { name: 'swipe' }
  | { name: 'list' }
  | { name: 'detail'; placeId: string }
  | { name: 'stats' }

type NewPlace = Omit<Place, 'id' | 'status' | 'dateAdded' | 'dateVisited'>

export default function App() {
  const { places, addPlace, updatePlace, updateStatus, removePlace } = usePlaces()

  const [stack, setStack]           = useState<Screen[]>([{ name: 'landing' }])
  const [showAdd,    setShowAdd]    = useState(false)
  const [editPlace,  setEditPlace]  = useState<Place | undefined>(undefined)
  const [pickedId,   setPickedId]   = useState<string | null>(null)
  const [mapSelected, setMapSelected] = useState<Place | null>(null)
  const [showCeSoir,  setShowCeSoir]  = useState(false)

  const current = stack[stack.length - 1]

  const push     = useCallback((screen: Screen) => setStack(prev => [...prev, screen]), [])
  const pop      = useCallback(() => setStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev), [])
  const goHome   = useCallback(() => setStack([{ name: 'landing' }]), [])
  const goMap    = useCallback(() => setStack([{ name: 'map' }]), [])

  const wishlist = places.filter(p => p.status === 'wishlist')

  const handleAdd = (data: NewPlace) => { addPlace(data); setShowAdd(false) }
  const handleUpdate = (id: string, data: Partial<Place>) => {
    updatePlace(id, data)
    setEditPlace(undefined)
    setShowAdd(false)
  }

  const handleKakiChoose = useCallback(() => {
    setShowCeSoir(true)
  }, [])

  const handleToggleHeart = useCallback((id: string) => {
    updatePlace(id, { hearted: !places.find(p => p.id === id)?.hearted })
  }, [places, updatePlace])

  const openEdit = (place: Place) => { setEditPlace(place); setShowAdd(true) }

  const handleDeletePlace = (id: string) => {
    removePlace(id)
    if (current.name === 'detail') pop()
    setMapSelected(null)
    setPickedId(null)
  }

  // ── Landing ───────────────────────────────────────────────────────────────────
  if (current.name === 'landing') {
    return <LandingPage onEnter={() => push({ name: 'map' })} onOpenList={() => { push({ name: 'map' }); setTimeout(() => push({ name: 'list' }), 50) }} />
  }

  // ── Swipe ─────────────────────────────────────────────────────────────────────
  if (current.name === 'swipe') {
    return (
      <SwipeView
        places={wishlist}
        onSwipe={(id, dir) => updateStatus(id, dir)}
        onClose={pop}
      />
    )
  }

  // ── Stats ─────────────────────────────────────────────────────────────────────
  if (current.name === 'stats') {
    return <StatsView places={places} onBack={pop} onGoHome={goHome} />
  }

  // ── List ──────────────────────────────────────────────────────────────────────
  if (current.name === 'list') {
    return (
      <>
        <RestaurantList
          places={places}
          onBack={goMap}
          onGoHome={goHome}
          onSelectPlace={p => push({ name: 'detail', placeId: p.id })}
          onAdd={() => { setEditPlace(undefined); setShowAdd(true) }}
          onOpenStats={() => push({ name: 'stats' })}
        />
        <AnimatePresence>
          {showAdd && (
            <AddPlaceModal
              key="edit-modal"
              editPlace={editPlace}
              onAdd={editPlace ? undefined : handleAdd}
              onUpdate={editPlace ? handleUpdate : undefined}
              onClose={() => { setShowAdd(false); setEditPlace(undefined) }}
            />
          )}
        </AnimatePresence>
      </>
    )
  }

  // ── Detail ────────────────────────────────────────────────────────────────────
  if (current.name === 'detail') {
    const place = places.find(p => p.id === current.placeId)
    if (!place) { pop(); return null }
    return (
      <>
        <AnimatePresence>
          <RestaurantDetail
            key={place.id}
            place={place}
            onBack={pop}
            onGoHome={goHome}
            onEdit={openEdit}
            onUpdateStatus={(id, status) => updateStatus(id, status)}
            onDelete={handleDeletePlace}
            onUpdateField={(id, data) => updatePlace(id, data)}
          />
        </AnimatePresence>
        <AnimatePresence>
          {showAdd && (
            <AddPlaceModal
              key="edit-modal"
              editPlace={editPlace}
              onUpdate={editPlace ? handleUpdate : undefined}
              onClose={() => { setShowAdd(false); setEditPlace(undefined) }}
            />
          )}
        </AnimatePresence>
      </>
    )
  }

  // ── Map view ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col" style={{ height: '100dvh', background: 'var(--bg)' }}>
      <Header
        placesCount={places.length}
        wishlistCount={wishlist.length}
        onLogoClick={goHome}
        onOpenList={() => push({ name: 'list' })}
      />

      <div className="flex-1 relative overflow-hidden">
        <MapView
          places={places}
          onPlaceClick={p => { setPickedId(null); setMapSelected(p) }}
        />

        {/* Kaki choisit */}
        <AnimatePresence>
          {wishlist.length >= 2 && !mapSelected && (
            <motion.button
              key="kaki-choose"
              initial={{ opacity: 0, y: 10, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.95 }}
              transition={{ type: 'spring', damping: 24, stiffness: 260 }}
              onClick={handleKakiChoose}
              whileTap={{ scale: 0.94 }}
              className="absolute font-ui font-semibold"
              style={{
                top: '16px', left: '50%', transform: 'translateX(-50%)',
                zIndex: 500, background: 'var(--surface)', color: 'var(--cream)',
                border: '1px solid var(--border-2)', borderRadius: '99px',
                padding: '10px 20px', fontSize: '12px', letterSpacing: '0.06em',
                boxShadow: '0 4px 24px rgba(0,0,0,0.4)', whiteSpace: 'nowrap', cursor: 'pointer',
              }}
            >
              ✦ Kaki choisit pour vous
            </motion.button>
          )}
        </AnimatePresence>

        {/* Place card */}
        <AnimatePresence>
          {mapSelected && (
            <PlaceCard
              key={mapSelected.id}
              place={mapSelected}
              isPicked={pickedId === mapSelected.id}
              onClose={() => { setMapSelected(null); setPickedId(null) }}
              onViewDetail={p => push({ name: 'detail', placeId: p.id })}
              onUpdateStatus={(id, status) => {
                updateStatus(id, status)
                setMapSelected(prev => prev?.id === id ? { ...prev, status } : prev)
              }}
              onDelete={id => { removePlace(id); setMapSelected(null); setPickedId(null) }}
              onToggleHeart={id => {
                handleToggleHeart(id)
                setMapSelected(prev => prev?.id === id ? { ...prev, hearted: !prev.hearted } : prev)
              }}
            />
          )}
        </AnimatePresence>

        {/* Ce soir modal */}
        <AnimatePresence>
          {showCeSoir && (
            <CeSoirModal
              places={places}
              onResult={place => { setPickedId(place.id); setMapSelected(place) }}
              onClose={() => setShowCeSoir(false)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Bottom bar */}
      <div
        className="flex items-center justify-between px-5 flex-shrink-0"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', minHeight: '72px', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Évaluer */}
        <button
          onClick={() => push({ name: 'swipe' })}
          disabled={wishlist.length === 0}
          className="flex items-center gap-2 font-ui font-medium transition-opacity disabled:opacity-25"
          style={{ letterSpacing: '0.06em', color: 'var(--cream)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}
        >
          Évaluer
          {wishlist.length > 0 && (
            <span style={{ background: 'var(--accent)', color: 'var(--bg)', fontWeight: 700, padding: '1px 7px', borderRadius: '99px', fontSize: '10px', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
              {wishlist.length}
            </span>
          )}
        </button>

        {/* + Add */}
        <button
          onClick={() => { setEditPlace(undefined); setShowAdd(true) }}
          className="flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--cream)', color: 'var(--bg)', fontSize: '26px', lineHeight: 1, flexShrink: 0, border: 'none', cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}
        >
          +
        </button>

        {/* Nos adresses */}
        <button
          onClick={() => push({ name: 'list' })}
          className="font-ui font-medium"
          style={{ color: 'var(--cream-dim)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.06em', fontSize: '13px' }}
        >
          Adresses
        </button>
      </div>

      {/* Add / Edit modal */}
      <AnimatePresence>
        {showAdd && (
          <AddPlaceModal
            key="add-modal"
            editPlace={editPlace}
            onAdd={editPlace ? undefined : handleAdd}
            onUpdate={editPlace ? handleUpdate : undefined}
            onClose={() => { setShowAdd(false); setEditPlace(undefined) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
