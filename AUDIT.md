# Kaki — Audit technique
> Généré le 17 avril 2026

---

## 1. Stack

| Couche | Techno |
|---|---|
| Framework | React 18 + TypeScript 5 + Vite 5 |
| Styling | Tailwind CSS 3 + CSS custom properties (palette dark) |
| Animation | Framer Motion 11 |
| Carte | Leaflet 1.9 + react-leaflet 4.2 |
| State | `useState` / `useEffect` + localStorage (zéro backend) |
| IDs | `uuid` v10 |
| Fonts | Cormorant Garamond (display) + Plus Jakarta Sans (UI) — Google Fonts |
| APIs externes | Nominatim (geocoding), allorigins.win (proxy CORS Instagram), CARTO tiles |
| Auth | **Aucune** |
| DB | **Aucune** — tout dans `localStorage` (clé `kaki-places`, version `v8`) |
| Mobile natif | **Néant** — pas de Capacitor, pas d'Expo, pas de `/ios` ni `/android` |

### Dépendances production

```json
"framer-motion": "^11.3.0",
"leaflet": "^1.9.4",
"react": "^18.3.1",
"react-dom": "^18.3.1",
"react-leaflet": "^4.2.1",
"uuid": "^10.0.0"
```

### Dépendances dev

```json
"@types/leaflet", "@types/react", "@types/react-dom", "@types/uuid",
"@vitejs/plugin-react", "autoprefixer", "postcss",
"tailwindcss", "typescript", "vite"
```

---

## 2. Ce qui est fait

### `src/store.ts`
- `usePlaces()` — CRUD complet : `addPlace`, `updatePlace`, `updateStatus`, `removePlace`
- Versioning localStorage avec reset automatique si version mismatch ou vieilles données
- 3 restaurants démo (Em Sherif, Hando, Spécimen) avec photos locales dans `/public`

### `src/types.ts`
- `Place` — modèle complet : `id`, `name`, `address`, `category`, `lat/lng`, `status`, `rating`, `priceRange`, `tags`, `coverPhoto`, `hearted`, `notes`, `description`, `instagram`
- `PlaceStatus = 'wishlist' | 'liked' | 'disliked'`

### Navigation — `src/App.tsx`
Stack de screens : `landing → map → list → detail → swipe → stats → friends`

### Composants fonctionnels

| Fichier | Ce qui tourne |
|---|---|
| `MapView.tsx` | Markers Leaflet avec couleur par statut, géolocalisation live (⊙), click direct → PlaceCard |
| `PlaceCard.tsx` | Carte compacte flottante : thumbnail, statut, prix, ♡, Bof / Aimé, Fiche |
| `RestaurantList.tsx` | Grille 3 colonnes, filtres statut + tags + search, share natif |
| `RestaurantDetail.tsx` | Vue détail complète, édition inline, rating, statut |
| `SwipeView.tsx` | Swipe left/right avec support clavier/trackpad |
| `StatsView.tsx` | Dashboard : totaux, catégories, tags, rating moyen, coup de cœur |
| `AddPlaceModal.tsx` | Formulaire avec import Instagram (proxy allorigins), geocoding Nominatim, tags, priceRange |
| `CeSoirModal.tsx` | Questionnaire 3 étapes (humeur → proximité GPS → type), itinéraire Google Maps, réservation, Google Agenda, invitation amis |
| `FriendMapView.tsx` | Profil Eden / Chloé, carte avec markers, like social, "+ Ma liste", itinéraire |
| `Header.tsx` | Logo kaki, search amis centré avec dropdown, compteur lieux |

### APIs externes actives

| URL | Usage | Fichier |
|---|---|---|
| `nominatim.openstreetmap.org/search` | Geocoding adresse | `AddPlaceModal.tsx` |
| `api.allorigins.win/get?url=` | Proxy CORS scraping Instagram OG tags | `AddPlaceModal.tsx` |
| `google.com/maps/dir/` | Itinéraire | `CeSoirModal.tsx`, `FriendMapView.tsx` |
| `google.com/search?q=` | Recherche réservation | `CeSoirModal.tsx` |
| `calendar.google.com/calendar/render` | Création événement agenda | `CeSoirModal.tsx` |
| `basemaps.cartocdn.com/light_all/` | Tuiles carte | `MapView.tsx`, `FriendMapView.tsx` |

---

## 3. Ce qui est incomplet

### `AddPlaceModal.tsx` — import Instagram cassé en production
- **`importFromInstagram()`** (ligne ~70) : utilise `api.allorigins.win` — proxy public instable, bloqué par Instagram dans >80% des cas depuis 2024
- Parse les `og:image` / `og:description` mais **ne récupère pas la localisation** — le champ adresse reste vide, l'utilisateur remplit manuellement
- Pas de fallback si le proxy échoue (juste un message d'erreur générique)

### `FriendMapView.tsx` — données 100% fictives hardcodées
- `FRIENDS` (ligne 17) : Eden (8 places) et Chloé (4 places) sont des constantes TypeScript, pas une vraie API
- `baseLikes` : compteurs de likes statiques, non persistés entre sessions
- Aucun vrai système d'amis, aucune relation entre comptes

### `CeSoirModal.tsx` — proximité approximative
- `haversine()` filtre par distance mais si aucun lieu assez proche → fallback silencieux vers toute la wishlist, sans prévenir l'utilisateur

### `store.ts` — pas de sync multi-device
- Toute la data est locale, perdue si on change de navigateur ou d'appareil
- Pas de migration progressive : reset brutal si `STORAGE_VERSION` change

### `types.ts` — champs manquants pour les features à venir
- Pas de `userId`, `groupId`, `sharedWith[]`, `reservationCount`, `rewardPoints`
- `instagram?: string` stocké mais jamais utilisé pour enrichir la fiche automatiquement

---

## 4. Ce qui manque — fichiers à créer

### A. Share Extension iOS + Android Share Intent

C'est la **feature core la plus critique**. Sans elle, l'utilisateur doit copier-coller une URL manuellement.

```
ios/ShareExtension/
  ShareViewController.swift      ← intercepte le share sheet natif
  Info.plist                     ← déclare NSExtensionActivationRule pour URLs
  ShareExtension.entitlements    ← App Group pour partager données avec l'app principale

android/app/src/main/java/
  ShareIntentActivity.kt         ← intercepte android.intent.action.SEND
```

Pour la version web (PWA sur Chrome Android), ajouter **Web Share Target API** :

```json
// public/manifest.json
{
  "share_target": {
    "action": "/share",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": { "url": "url", "title": "title", "text": "text" }
  }
}
```

### B. Parser URL → Restaurant

**Fichier à créer : `src/lib/parseShareUrl.ts`**

```typescript
export async function parseShareUrl(url: string): Promise<Partial<Place>> {
  // 1. Détecter la plateforme
  //    instagram.com, tiktok.com, maps.google.com, maps.apple.com
  // 2. Google Maps share → extraire place_id, name, address directement (fiable)
  // 3. Apple Maps → décoder coordonnées depuis l'URL
  // 4. Instagram post → scrape OG tags via Cloudflare Worker
  // 5. TikTok → extraire description + hashtags
  // 6. Échec → fallback Google Places avec le nom détecté
}
```

Pipeline de détection recommandé :

1. **URL Google/Apple Maps** → parser direct, très fiable
2. **URL Instagram** → scrape OG tags via proxy Cloudflare Worker propre (remplacer allorigins.win)
3. **Échec ou données insuffisantes** → Google Places Text Search avec le nom extrait

### C. Fallback Google Places API

**Fichier à créer : `src/lib/googlePlaces.ts`**

```typescript
// Clé API dans .env : VITE_GOOGLE_PLACES_KEY
export async function searchGooglePlaces(
  query: string,
  coords?: { lat: number; lng: number }
): Promise<PlaceCandidate[]>

export async function getPlaceDetails(placeId: string): Promise<{
  name: string
  address: string
  lat: number
  lng: number
  phone?: string
  website?: string
  rating?: number
  priceLevel?: 1 | 2 | 3 | 4
  photos?: string[]
  openingHours?: string[]
}>
```

Actuellement Nominatim ne retourne pas les infos restaurant (horaires, note, catégorie précise, photos Google).

### D. Backend + Auth

**Stack recommandée pour scaler rapidement : Supabase**

```
src/lib/supabase.ts            ← client Supabase (auth + DB + realtime)
src/lib/api.ts                 ← wrapper fetch avec auth headers
.env                           ← VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

**Tables SQL à créer :**

```sql
users (
  id uuid PRIMARY KEY,
  username text UNIQUE,
  avatar_url text,
  reward_points int DEFAULT 0,
  created_at timestamptz
)

places (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users,
  name text,
  address text,
  lat float, lng float,
  status text,            -- 'wishlist' | 'liked' | 'disliked'
  category text,
  rating int,
  price_range int,
  tags text[],
  cover_photo text,
  notes text,
  description text,
  instagram_url text,
  reservation_count int DEFAULT 0,
  created_at timestamptz
)

groups (
  id uuid PRIMARY KEY,
  name text,
  created_by uuid REFERENCES users,
  created_at timestamptz
)

group_members (
  group_id uuid REFERENCES groups,
  user_id uuid REFERENCES users,
  role text DEFAULT 'member'   -- 'admin' | 'member'
)

group_places (
  group_id uuid REFERENCES groups,
  place_id uuid REFERENCES places,
  added_by uuid REFERENCES users
)

place_likes (
  place_id uuid REFERENCES places,
  user_id uuid REFERENCES users,
  created_at timestamptz,
  PRIMARY KEY (place_id, user_id)
)

reservations (
  id uuid PRIMARY KEY,
  place_id uuid REFERENCES places,
  user_id uuid REFERENCES users,
  date timestamptz,
  guests text[],
  confirmed bool DEFAULT false,
  created_at timestamptz
)
```

### E. Système Kaki Rewards

**Fichier à créer : `src/components/RewardsView.tsx`**

Logique des points :

| Action | Points |
|---|---|
| Ajouter un restaurant | +5 pts |
| Évaluer (liked / disliked) | +3 pts |
| Ajouter une note/description | +2 pts |
| Confirmer une réservation | +20 pts |
| Inviter un ami qui s'inscrit | +50 pts |
| **100 pts** | **Dîner offert** (validation manuelle ou partenariat) |

Stocker dans `users.reward_points` (Supabase) ou `localStorage` pour le MVP.

### F. Notifications push contextuelles

**Fichier à créer : `src/lib/notifications.ts`**

Cas d'usage prioritaires :

- "Tu es à 200m de Septime, un resto que tu veux tester" → **geofencing**
- "Eden a ajouté 3 nouveaux restos" → **social feed**
- "Tu n'as pas évalué Hando depuis 3 semaines" → **nudge de rétention**
- "Votre soirée chez Em Sherif est dans 2h" → **rappel de réservation**

Via **Firebase Cloud Messaging** (PWA) ou **APNs / FCM** (natif).

### G. Vrai système de groupes

**Fichier à créer : `src/components/GroupView.tsx`**

Actuellement `FriendMapView` est read-only et hardcodé. Il manque :

- Création de groupe + lien d'invitation
- Carte partagée mise à jour en temps réel (Supabase Realtime)
- Votes sur "ce soir on va où" dans le groupe
- Visibilité granulaire : liste publique / amis / privée

---

## 5. Priorité — ordre d'exécution

```
SEMAINE 1 — Foundation
  ① src/lib/supabase.ts          ← auth + sync data (remplace localStorage)
  ② src/store.ts                 ← migrer usePlaces() vers Supabase
  ③ .env                         ← VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

SEMAINE 2 — Core feature (share)
  ④ src/lib/parseShareUrl.ts     ← parser Instagram / TikTok / Maps
  ⑤ Cloudflare Worker            ← proxy CORS propre (remplace allorigins.win)
  ⑥ src/lib/googlePlaces.ts      ← enrichissement automatique des fiches
  ⑦ public/manifest.json + sw.js ← Web Share Target (Android/Chrome)

SEMAINE 3 — Mobile natif
  ⑧ ios/ShareExtension/          ← Share Extension Swift
  ⑨ android/.../ShareIntentActivity.kt

SEMAINE 4 — Social réel
  ⑩ FriendMapView.tsx            ← brancher sur vraie DB (supprimer FRIENDS hardcodé)
  ⑪ src/components/GroupView.tsx ← groupes + carte partagée temps réel

SEMAINE 5 — Engagement
  ⑫ src/components/RewardsView.tsx ← compteur réservations + points
  ⑬ src/lib/notifications.ts       ← push notifications
```

---

## 6. Dettes techniques

| Priorité | Dette | Fichier | Problème | Fix |
|---|---|---|---|---|
| 🔴 Critique | Proxy CORS fragile | `AddPlaceModal.tsx:75` | `api.allorigins.win` est un service public instable, bloqué par Instagram dans la majorité des cas | Déployer un Cloudflare Worker avec cache (`cacheTtl: 3600`) |
| 🔴 Critique | Zéro backend | `store.ts` | Données perdues au changement d'appareil, impossible de faire du vrai social | Migrer vers Supabase |
| 🟠 Important | Données fictives en dur | `FriendMapView.tsx:17` | `FRIENDS` = 150 lignes de constantes dans le composant | Extraire dans `src/data/mockFriends.ts`, puis remplacer par API |
| 🟠 Important | Reset brutal | `store.ts:71` | `STORAGE_VERSION = 'v8'` efface tout à chaque changement | Migrations progressives : `migrateV7toV8(data)` |
| 🟠 Important | Pas de PWA manifest | `index.html` | App non installable sur iOS/Android | Ajouter `manifest.json` + icônes 192/512px + `sw.js` |
| 🟡 Moyen | Images démo dans `/public` | `public/*.jpg` | 10 MB de photos commitées dans le repo git | Migrer vers CDN (Supabase Storage ou Cloudinary) |
| 🟡 Moyen | Types trop larges | `types.ts` | `Place` mélange champs UI (`hearted`) et données métier | Séparer `PlaceDB` (persistance) et `PlaceUI` (état local) |
| 🟡 Moyen | Pas de clustering Leaflet | `MapView.tsx:39` | Markers qui se chevauchent dès 50+ lieux | Ajouter `leaflet.markercluster` |
| 🟢 Faible | Aucun test | tous | Zéro fichier `.test.ts` dans le repo | Tester au minimum `parseShareUrl()` et `haversine()` |
| 🟢 Faible | Pas de rate limiting | `AddPlaceModal.tsx:75` | Requêtes proxy non limitées | Cache côté serveur + debounce côté client (déjà 600ms) |

---

## Résumé

L'UI est solide et le produit est déjà utilisable. La dette principale est l'**absence totale de backend** — tout repose sur `localStorage`, ce qui rend impossible le vrai social (groupes, likes persistés, sync multi-device).

La feature manquante la plus différenciante est le **Share Extension** — c'est ce qui transforme Kaki d'un outil de notes personnel en un réseau social de restaurants. Sans elle, le flux d'acquisition principal (partager un post Instagram → restaurant ajouté automatiquement) n'existe pas.

La prochaine décision architecturale critique : choisir entre **PWA** (Web Share Target, déployable immédiatement, limité sur iOS) et **app native** (React Native / Expo ou SwiftUI/Kotlin, nécessite App Store, mais Share Extension iOS est la seule façon fiable de capter les partages sur iPhone).
