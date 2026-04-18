# kaki

Carnet d'adresses social pour Paris — restaurants, bars, cafés, boutiques.  
Sauvegarde tes adresses sur une carte, évalue-les avec tes amis, partage tes coups de cœur.

---

## Stack

| Couche | Tech |
|--------|------|
| Front | React 18 · TypeScript · Vite · Tailwind CSS |
| Carte | Leaflet · react-leaflet · CARTO tiles |
| Auth | Supabase Email OTP |
| Base de données | Supabase (PostgreSQL + RLS + Realtime) |
| Stockage | Supabase Storage (avatars) |
| Proxy CORS | Cloudflare Worker |
| Animations | Framer Motion |
| PWA | manifest.json + Service Worker |

---

## Fonctionnalités

- **Carte interactive** — pins colorés par statut (wishlist / aimé / bof)
- **Swipe d'évaluation** — passe ta wishlist en revue carte par carte
- **Import d'adresses** — colle un lien Google Maps, Apple Maps ou Instagram
- **Kaki choisit** — sélection aléatoire pondérée dans ta wishlist pour le soir
- **Amis** — consulte la carte d'un ami par pseudo (démo : @eden.paris)
- **Groupes** — crée un groupe, partage des adresses, vote pour le dîner du soir
- **Feed d'activité** — vois les ajouts récents de tes co-membres de groupe
- **Profil** — pseudo, avatar (upload JPG/PNG), Kaki Rewards

---

## Démarrage local

```bash
# 1. Installer les dépendances
npm install

# 2. Variables d'environnement
cp .env.example .env.local
# Remplis VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_PROXY_WORKER_URL

# 3. Lancer le serveur de dev
npm run dev
```

### Variables d'environnement

```env
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_PROXY_WORKER_URL=https://kaki-proxy.<handle>.workers.dev
```

---

## Base de données Supabase

Colle le contenu de [`SUPABASE_SETUP.sql`](SUPABASE_SETUP.sql) dans le **SQL Editor** de ton projet Supabase.

Ce script crée :
- Tables : `users`, `places`, `groups`, `group_members`, `group_places`, `group_proposals`, `group_proposal_votes`, `place_likes`, `reservations`
- Policies RLS pour chaque table
- RPCs : `create_group`, `join_group_by_invite`, `increment_reward_points`
- Bucket Storage `avatars` (public, 5 Mo max, JPEG/PNG/WebP/GIF)
- Trigger `on_auth_user_created` pour initialiser le profil à l'inscription

### Config Dashboard Supabase

- **Authentication → Email** : activer "Enable Email OTP"
- **Authentication → URL Configuration → Site URL** : `http://localhost:5173` (dev) ou ton domaine de prod

---

## Cloudflare Worker (proxy CORS)

Le worker résout les short links Google Maps et scrape les OG tags Instagram.

```bash
cd worker
npm install -g wrangler
wrangler deploy
```

Ajoute ton domaine de production dans `ALLOWED_ORIGINS` dans [`worker/index.ts`](worker/index.ts) avant le déploiement.

---

## Déploiement

```bash
# Build
npm run build

# Déployer sur Vercel (recommandé)
vercel deploy --prod
```

Pense à ajouter les variables d'environnement dans les settings Vercel.

---

## Structure du projet

```
src/
├── components/
│   ├── AuthModal.tsx        — connexion Email OTP
│   ├── Header.tsx           — barre de navigation + recherche amis
│   ├── MapView.tsx          — carte principale
│   ├── PlaceCard.tsx        — popup lieu sur la carte
│   ├── AddPlaceModal.tsx    — ajout / édition d'un lieu + import URL
│   ├── SwipeView.tsx        — évaluation carte par carte
│   ├── RestaurantList.tsx   — vue liste
│   ├── RestaurantDetail.tsx — fiche détail
│   ├── CeSoirModal.tsx      — "Kaki choisit pour vous"
│   ├── FriendMapView.tsx    — carte d'un ami
│   ├── GroupView.tsx        — groupes + votes du soir
│   ├── FeedView.tsx         — fil d'activité
│   ├── ProfileView.tsx      — profil + avatar + rewards
│   ├── StatsView.tsx        — statistiques personnelles
│   └── LandingPage.tsx      — page d'accueil
├── lib/
│   ├── auth.ts              — sendOtp / verifyOtp / AuthProvider
│   ├── supabase.ts          — client Supabase + types de lignes
│   ├── places.ts            — rowToPlace (snake_case → camelCase)
│   ├── parseShareUrl.ts     — import Google Maps / Apple Maps / Instagram
│   └── demoData.ts          — identifiant de la carte démo Eden
├── store.ts                 — usePlaces : CRUD + realtime + Kaki Rewards
├── types.ts                 — types TypeScript (Place, PlaceStatus…)
└── App.tsx                  — routeur à pile de screens (push/pop)

worker/
├── index.ts                 — Cloudflare Worker : proxy CORS + short links
└── wrangler.toml
```

---

## Kaki Rewards

| Action | Points |
|--------|--------|
| Ajouter un lieu | +5 pts |
| Évaluer (aimé / bof) | +3 pts |
| Enrichir une fiche (notes/description) | +2 pts |
| Confirmer une réservation | +20 pts |
| Inviter un ami inscrit | +50 pts |

Tous les 100 points → un dîner offert.
