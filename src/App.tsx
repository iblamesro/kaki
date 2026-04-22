import { useState, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { usePlaces } from './store'
import { useAuth } from './lib/auth'
import { supabase } from './lib/supabase'
import { Place } from './types'
import Header from './components/Header'
import AuthModal from './components/AuthModal'
import MapView from './components/MapView'
import PlaceCard from './components/PlaceCard'
import AddPlaceModal from './components/AddPlaceModal'
import SwipeView from './components/SwipeView'
import LandingPage from './components/LandingPage'
import RestaurantList from './components/RestaurantList'
import RestaurantDetail from './components/RestaurantDetail'
import StatsView from './components/StatsView'
import CeSoirModal from './components/CeSoirModal'
import FriendMapView from './components/FriendMapView'
import GroupView from './components/GroupView'
import ProfileView from './components/ProfileView'
import FeedView from './components/FeedView'
import KakiAIModal from './components/KakiAIModal'
import OnboardingFlow from './components/OnboardingFlow'
import ConfirmReservation from './components/ConfirmReservation'
import InvitePage from './components/InvitePage'
import AdminPlaceManager from './components/AdminPlaceManager'

type Screen =
  | { name: 'landing' }
  | { name: 'map' }
  | { name: 'swipe' }
  | { name: 'list' }
  | { name: 'detail'; placeId: string }
  | { name: 'stats' }
  | { name: 'friends'; userId?: string }
  | { name: 'groups' }
  | { name: 'profile' }
  | { name: 'feed' }

type NewPlace = Omit<Place, 'id' | 'status' | 'dateAdded' | 'dateVisited'>

// ── App shell : gère l'auth gate + deep links ─────────────────────────────────
export default function App() {
  const { user, loading: authLoading } = useAuth()

  // Deep links — work before auth check
  const confirmMatch = window.location.pathname.match(/^\/confirm\/([a-zA-Z0-9]+)$/)
  if (confirmMatch) return <ConfirmReservation trackingCode={confirmMatch[1]} />

  const inviteMatch = window.location.pathname.match(/^\/invite\/([a-zA-Z0-9]+)$/)
  if (inviteMatch) return <InvitePage inviteCode={inviteMatch[1]} />

  if (window.location.pathname === '/admin') return <AdminPlaceManager />

  if (authLoading) {
    return (
      <div style={{ height: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="font-display font-medium"
          style={{ fontSize: '2rem', letterSpacing: '0.16em', color: 'var(--cream)', fontStyle: 'italic', opacity: 0.4 }}>
          kaki
        </span>
      </div>
    )
  }

  if (!user) return <AuthModal />

  return <AppInner userId={user.id} />
}

// ── AppInner : tous les hooks ici, jamais après un return conditionnel ─────────
function AppInner({ userId }: { userId: string }) {
  const { places, addPlace, updatePlace, updateStatus, removePlace } = usePlaces()

  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null)

  useEffect(() => {
    void supabase
      .from('users')
      .select('onboarding_completed')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => setOnboardingDone(data?.onboarding_completed ?? false))
  }, [userId])

  // Rejoindre un groupe en attente (venant d'un lien /invite/[code] avant auth)
  useEffect(() => {
    const pendingCode = sessionStorage.getItem('pending_invite')
    if (!pendingCode) return
    sessionStorage.removeItem('pending_invite')
    void supabase.rpc('join_group_by_invite', { p_code: pendingCode })
  }, [userId])

  const [stack, setStack] = useState<Screen[]>([{ name: 'landing' }])
  const [showAdd,     setShowAdd]     = useState(false)
  const [editPlace,   setEditPlace]   = useState<Place | undefined>(undefined)
  const [pickedId,    setPickedId]    = useState<string | null>(null)
  const [mapSelected, setMapSelected] = useState<Place | null>(null)
  const [showCeSoir,  setShowCeSoir]  = useState(false)
  const [showAI,      setShowAI]      = useState(false)

  const current = stack[stack.length - 1]

  const push   = useCallback((screen: Screen) => setStack(prev => [...prev, screen]), [])
  const pop    = useCallback(() => setStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev), [])
  const goHome = useCallback(() => setStack([{ name: 'landing' }]), [])
  const goMap  = useCallback(() => setStack([{ name: 'map' }]), [])

  const wishlist = places.filter(p => p.status === 'wishlist')

  const handleAdd = (data: NewPlace) => { addPlace(data); setShowAdd(false) }
  const handleUpdate = (id: string, data: Partial<Place>) => {
    updatePlace(id, data)
    setEditPlace(undefined)
    setShowAdd(false)
  }

  const handleKakiChoose = useCallback(() => setShowCeSoir(true), [])

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

  // ── Onboarding ───────────────────────────────────────────────────────────────
  if (onboardingDone === null) {
    return (
      <div style={{ height: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="font-display font-medium" style={{ fontSize: '2rem', letterSpacing: '0.16em', color: 'var(--cream)', fontStyle: 'italic', opacity: 0.4 }}>
          kaki
        </span>
      </div>
    )
  }
  if (onboardingDone === false) {
    return <OnboardingFlow userId={userId} onDone={() => setOnboardingDone(true)} />
  }

  // ── Profile ───────────────────────────────────────────────────────────────────
  if (current.name === 'profile') {
    return <ProfileView onBack={pop} />
  }

  // ── Feed ──────────────────────────────────────────────────────────────────────
  if (current.name === 'feed') {
    return <FeedView onBack={pop} />
  }

  // ── Landing ──────────────────────────────────────────────────────────────────
  if (current.name === 'landing') {
    return <LandingPage onEnter={() => push({ name: 'map' })} onOpenList={() => { push({ name: 'map' }); setTimeout(() => push({ name: 'list' }), 50) }} />
  }

  // ── Swipe ────────────────────────────────────────────────────────────────────
  if (current.name === 'swipe') {
    return <SwipeView places={wishlist} onSwipe={(id, dir) => updateStatus(id, dir)} onClose={pop} />
  }

  // ── Stats ────────────────────────────────────────────────────────────────────
  if (current.name === 'stats') {
    return <StatsView places={places} onBack={pop} onGoHome={goHome} />
  }

  // ── Friends ──────────────────────────────────────────────────────────────────
  if (current.name === 'friends') {
    return (
      <FriendMapView
        initialUserId={current.userId}
        onBack={pop}
        onAddToMyList={p => addPlace({
          name: p.name, address: p.address, category: p.category, lat: p.lat, lng: p.lng,
          notes: p.notes, coverPhoto: p.coverPhoto, tags: p.tags, description: p.description,
          rating: p.rating, priceRange: p.priceRange, instagram: p.instagram,
        })}
      />
    )
  }

  // ── Groups ───────────────────────────────────────────────────────────────────
  if (current.name === 'groups') {
    return <GroupView onBack={pop} myPlaces={places} />
  }

  // ── List ─────────────────────────────────────────────────────────────────────
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

  // ── Detail ───────────────────────────────────────────────────────────────────
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

  // ── Map ──────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col" style={{ height: '100dvh', background: 'var(--bg)' }}>
      <Header
        currentUserId={userId}
        onLogoClick={goHome}
        onOpenFriend={friendId => push({ name: 'friends', userId: friendId })}
        onOpenGroups={() => push({ name: 'groups' })}
        onOpenProfile={() => push({ name: 'profile' })}
      />

      <div className="flex-1 relative overflow-hidden">
        <MapView
          places={places}
          onPlaceClick={p => { setPickedId(null); setMapSelected(p) }}
        />

        {/* ── Bouton IA flottant ── */}
        <button
          type="button"
          onClick={() => setShowAI(true)}
          className="absolute font-ui font-semibold"
          style={{
            top: '14px', right: '14px', zIndex: 500,
            background: 'var(--surface)', color: 'var(--cream)',
            border: '1px solid var(--border-2)', borderRadius: '99px',
            padding: '9px 16px', fontSize: '11px', letterSpacing: '0.06em',
            boxShadow: '0 4px 24px rgba(0,0,0,0.4)', whiteSpace: 'nowrap', cursor: 'pointer',
          }}
        >
          ✦ Kaki IA
        </button>

        <AnimatePresence>
          {wishlist.length >= 1 && (
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
                top: '50px', right: '14px',
                zIndex: 500, background: 'rgba(138,156,30,0.18)', color: 'var(--accent)',
                border: '1px solid rgba(138,156,30,0.35)', borderRadius: '99px',
                padding: '9px 16px', fontSize: '11px', letterSpacing: '0.06em',
                boxShadow: '0 4px 24px rgba(0,0,0,0.3)', whiteSpace: 'nowrap', cursor: 'pointer',
              }}
            >
              ✦ Kaki choisit
            </motion.button>
          )}
        </AnimatePresence>

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

        <AnimatePresence>
          {showCeSoir && (
            <CeSoirModal
              places={places}
              userId={userId}
              onResult={place => { setPickedId(place.id); setMapSelected(place) }}
              onClose={() => setShowCeSoir(false)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showAI && (
            <KakiAIModal
              places={places}
              onSelect={place => { setMapSelected(place); setPickedId(null) }}
              onClose={() => setShowAI(false)}
            />
          )}
        </AnimatePresence>
      </div>

      <div
        className="flex items-center justify-between px-5 flex-shrink-0"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', minHeight: '72px', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
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

        <button
          onClick={() => { setEditPlace(undefined); setShowAdd(true) }}
          className="flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--cream)', color: 'var(--bg)', fontSize: '26px', lineHeight: 1, flexShrink: 0, border: 'none', cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}
        >
          +
        </button>

        <button
          onClick={() => push({ name: 'feed' })}
          className="font-ui font-medium"
          style={{ color: 'var(--cream-dim)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.06em', fontSize: '13px' }}
        >
          Activité
        </button>
      </div>

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
