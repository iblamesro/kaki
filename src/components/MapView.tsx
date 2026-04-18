import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Place } from '../types'

export interface MapViewProps {
  places: Place[]
  onPlaceClick: (place: Place) => void
}

const STATUS_COLORS = {
  wishlist: { fill: '#F4EFE2', stroke: '#262F18' },
  liked:    { fill: '#4A7A50', stroke: '#3A5E3F' },
  disliked: { fill: '#7A3A3A', stroke: '#5E3030' },
}

function pinSVG(status: Place['status']) {
  const c = STATUS_COLORS[status]
  return `<svg width="14" height="14" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">
    <circle cx="7" cy="7" r="5.5" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.5"/>
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
      const marker = L.marker([place.lat, place.lng], { icon: createIcon(place) })
      marker.on('click', e => {
        L.DomEvent.stopPropagation(e)
        onPlaceClick(place)
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
          radius: 8, fillColor: '#3B82F6', fillOpacity: 1, color: '#fff', weight: 2,
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
