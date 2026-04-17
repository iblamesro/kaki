import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Place } from '../types'

export interface MapViewProps {
  places: Place[]
  onPlaceClick: (place: Place) => void
}

const CAT_EMOJI: Record<string, string> = {
  Restaurant: '🍽',
  Café: '☕',
  Bar: '🍷',
  Boutique: '🛍',
  Activité: '✦',
  Autre: '◎',
}

function pinSVG(status: Place['status']) {
  const colors = {
    wishlist: { fill: '#F4EFE2', stroke: '#262F18', sw: 1.5 },
    liked:    { fill: '#4A7A50', stroke: '#3A5E3F', sw: 1.5 },
    disliked: { fill: '#B0A898', stroke: '#8A8278', sw: 1   },
  }
  const c = colors[status]
  return `<svg width="14" height="14" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">
    <circle cx="7" cy="7" r="5.5" fill="${c.fill}" stroke="${c.stroke}" stroke-width="${c.sw}"/>
  </svg>`
}

function createIcon(place: Place): L.DivIcon {
  return L.divIcon({
    html: pinSVG(place.status),
    className: 'kaki-pin',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}

function shortAddr(address: string) {
  const parts = address.split(',')
  return parts.slice(0, 2).join(',').trim()
}

interface MarkersProps {
  places: Place[]
  onPlaceClick: (place: Place) => void
}

function Markers({ places, onPlaceClick }: MarkersProps) {
  const map = useMap()
  const markersRef = useRef<Map<string, L.Marker>>(new Map())

  useEffect(() => {
    markersRef.current.forEach(m => m.remove())
    markersRef.current.clear()

    places.forEach(place => {
      const icon = createIcon(place)
      const marker = L.marker([place.lat, place.lng], { icon })

      marker.on('click', e => {
        L.DomEvent.stopPropagation(e)

        const popup = L.popup({
          closeButton: false,
          className: 'kaki-popup-container',
          maxWidth: 260,
          autoPan: true,
          autoPanPaddingTopLeft: L.point(20, 80),
          autoPanPaddingBottomRight: L.point(20, 120),
          offset: L.point(0, -10),
        })
          .setLatLng([place.lat, place.lng])
          .setContent(`
            <div class="kaki-popup">
              <p class="kaki-popup-cat">${CAT_EMOJI[place.category]} ${place.category}</p>
              <h3 class="kaki-popup-name">${place.name}</h3>
              <p class="kaki-popup-addr">${shortAddr(place.address)}</p>
              <div class="kaki-popup-footer">
                <button class="kaki-popup-btn" id="popup-open-${place.id}">
                  Voir les détails
                </button>
                <button class="kaki-popup-close" id="popup-close-${place.id}">×</button>
              </div>
            </div>
          `)
          .openOn(map)

        popup.on('add', () => {
          const openBtn = document.getElementById(`popup-open-${place.id}`)
          const closeBtn = document.getElementById(`popup-close-${place.id}`)
          if (openBtn) {
            openBtn.addEventListener('click', () => {
              onPlaceClick(place)
              map.closePopup()
            })
          }
          if (closeBtn) {
            closeBtn.addEventListener('click', () => map.closePopup())
          }
        })
      })

      marker.addTo(map)
      markersRef.current.set(place.id, marker)
    })

    return () => {
      markersRef.current.forEach(m => m.remove())
      markersRef.current.clear()
    }
  }, [places, map, onPlaceClick])

  return null
}

function LocationButton() {
  const map = useMap()
  const [locating, setLocating] = useState(false)
  const dotRef = useRef<L.CircleMarker | null>(null)

  const handleLocate = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        if (dotRef.current) dotRef.current.remove()
        dotRef.current = L.circleMarker([lat, lng], {
          radius: 8,
          fillColor: '#3B82F6',
          fillOpacity: 1,
          color: '#fff',
          weight: 2,
        }).addTo(map)
        map.flyTo([lat, lng], 16, { duration: 1.2 })
        setLocating(false)
      },
      () => setLocating(false),
      { timeout: 8000 },
    )
  }

  return (
    <button onClick={handleLocate}
      style={{ position: 'absolute', bottom: '16px', left: '16px', zIndex: 500,
        width: '40px', height: '40px', borderRadius: '12px',
        background: 'var(--surface)', border: '1px solid var(--border-2)',
        color: locating ? 'var(--accent)' : 'var(--cream-dim)',
        fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}
      title="Ma position">
      {locating ? '…' : '⊙'}
    </button>
  )
}

export default function MapView({ places, onPlaceClick }: MapViewProps) {
  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapContainer
        center={[48.8566, 2.3522]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />
        <Markers places={places} onPlaceClick={onPlaceClick} />
        <LocationButton />
      </MapContainer>
    </div>
  )
}
