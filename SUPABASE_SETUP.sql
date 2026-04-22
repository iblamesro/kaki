-- ============================================================
--  KAKI — Supabase SQL Setup
--  Colle ce fichier dans l'éditeur SQL de ton projet Supabase
-- ============================================================

-- 1. USERS (extension du profil Supabase Auth)
-- La table auth.users existe déjà ; on crée un profil public
CREATE TABLE IF NOT EXISTS public.users (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username       TEXT UNIQUE,
  avatar_url     TEXT,
  reward_points  INT DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Créer le profil automatiquement après signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (id)
  VALUES (new.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 2. PLACES
CREATE TABLE IF NOT EXISTS public.places (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  address        TEXT NOT NULL DEFAULT '',
  lat            FLOAT NOT NULL DEFAULT 0,
  lng            FLOAT NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'wishlist'
                   CHECK (status IN ('wishlist','liked','disliked')),
  category       TEXT NOT NULL DEFAULT 'Restaurant',
  rating         INT CHECK (rating BETWEEN 1 AND 5),
  price_range    INT CHECK (price_range BETWEEN 1 AND 4),
  tags           TEXT[],
  cover_photo    TEXT,
  notes          TEXT,
  description    TEXT,
  liked_aspects  TEXT,
  ordered_items  TEXT,
  instagram_url  TEXT,
  hearted        BOOLEAN DEFAULT FALSE,
  date_added     TIMESTAMPTZ DEFAULT NOW(),
  date_visited   TIMESTAMPTZ
);

-- Index pour les requêtes par user
CREATE INDEX IF NOT EXISTS places_user_id_idx ON public.places (user_id);
CREATE INDEX IF NOT EXISTS places_status_idx  ON public.places (user_id, status);


-- 3. GROUPS
CREATE TABLE IF NOT EXISTS public.groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.group_members (
  group_id  UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES auth.users(id)   ON DELETE CASCADE,
  role      TEXT DEFAULT 'member' CHECK (role IN ('admin','member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.group_places (
  group_id  UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  place_id  UUID REFERENCES public.places(id) ON DELETE CASCADE,
  added_by  UUID REFERENCES auth.users(id)   ON DELETE SET NULL,
  added_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, place_id)
);


-- 4. PLACE LIKES (likes sociaux entre amis)
CREATE TABLE IF NOT EXISTS public.place_likes (
  place_id   UUID REFERENCES public.places(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES auth.users(id)   ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (place_id, user_id)
);


-- 5. RESERVATIONS
CREATE TABLE IF NOT EXISTS public.reservations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id     UUID REFERENCES public.places(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES auth.users(id)   ON DELETE CASCADE,
  date         TIMESTAMPTZ,
  guests       TEXT[],
  confirmed    BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
--  RLS (Row Level Security)
-- ============================================================

-- USERS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users: lecture publique" ON public.users;
CREATE POLICY "users: lecture publique"  ON public.users FOR SELECT USING (true);
DROP POLICY IF EXISTS "users: modif propre" ON public.users;
CREATE POLICY "users: modif propre"      ON public.users FOR UPDATE USING (auth.uid() = id);

-- PLACES
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "places: lecture propre" ON public.places;
CREATE POLICY "places: lecture propre"   ON public.places FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "places: insert propre" ON public.places;
CREATE POLICY "places: insert propre"    ON public.places FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "places: update propre" ON public.places;
CREATE POLICY "places: update propre"    ON public.places FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "places: delete propre" ON public.places;
CREATE POLICY "places: delete propre"    ON public.places FOR DELETE USING (auth.uid() = user_id);

-- GROUPS
ALTER TABLE public.groups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_places  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "groups: membres peuvent lire" ON public.groups;
CREATE POLICY "groups: membres peuvent lire"
  ON public.groups FOR SELECT
  USING (id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "group_members: lecture" ON public.group_members;
CREATE POLICY "group_members: lecture"
  ON public.group_members FOR SELECT
  USING (group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "group_places: lecture" ON public.group_places;
CREATE POLICY "group_places: lecture"
  ON public.group_places FOR SELECT
  USING (group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()));

-- PLACE LIKES
ALTER TABLE public.place_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "likes: lecture" ON public.place_likes;
CREATE POLICY "likes: lecture"  ON public.place_likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "likes: insert" ON public.place_likes;
CREATE POLICY "likes: insert"   ON public.place_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "likes: delete" ON public.place_likes;
CREATE POLICY "likes: delete"   ON public.place_likes FOR DELETE USING (auth.uid() = user_id);

-- RESERVATIONS
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reservations: propres" ON public.reservations;
CREATE POLICY "reservations: propres" ON public.reservations FOR ALL USING (auth.uid() = user_id);


-- ============================================================
--  REALTIME
--  Active le realtime sur la table places
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'places'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.places;
  END IF;
END $$;


-- ============================================================
--  Notes de configuration dans le dashboard Supabase :
--
--  Authentication → Email → activer "Enable Email OTP"
--  Authentication → Email → désactiver "Confirm email" (ou laisser activé)
--  Authentication → URL Configuration → Site URL: http://localhost:5173
-- ============================================================


-- ============================================================
--  CHANTIER 3 — Réseau (carte amis + groupes)
--  Exécuter après le script ci-dessus (complète RLS + RPC).
-- ============================================================

-- Tout utilisateur connecté peut lire les lieux (cartes amis / groupe).
-- INSERT / UPDATE / DELETE restent limités au propriétaire via les policies existantes.
DROP POLICY IF EXISTS "places: lecture réseau" ON public.places;
CREATE POLICY "places: lecture réseau"
  ON public.places FOR SELECT
  TO authenticated
  USING (true);

-- GROUPS : création et mise à jour par le créateur
DROP POLICY IF EXISTS "groups: insert creator" ON public.groups;
CREATE POLICY "groups: insert creator"
  ON public.groups FOR INSERT
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "groups: update creator" ON public.groups;
CREATE POLICY "groups: update creator"
  ON public.groups FOR UPDATE
  USING (created_by = auth.uid());

-- Quitter un groupe (retirer sa ligne membre)
DROP POLICY IF EXISTS "group_members: delete self" ON public.group_members;
CREATE POLICY "group_members: delete self"
  ON public.group_members FOR DELETE
  USING (user_id = auth.uid());

-- Partager un de ses lieux avec un groupe dont on est membre
DROP POLICY IF EXISTS "group_places: insert own place" ON public.group_places;
CREATE POLICY "group_places: insert own place"
  ON public.group_places FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_id AND gm.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.places p
      WHERE p.id = place_id AND p.user_id = auth.uid()
    )
  );

-- Retirer un lieu du shortlist groupe (tout membre)
DROP POLICY IF EXISTS "group_places: delete member" ON public.group_places;
CREATE POLICY "group_places: delete member"
  ON public.group_places FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_places.group_id AND gm.user_id = auth.uid()
    )
  );

-- Crée un groupe et t’ajoute comme admin (contourne le blocage « join sans être membre »)
CREATE OR REPLACE FUNCTION public.create_group(p_name text)
RETURNS public.groups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g public.groups;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF trim(p_name) = '' THEN
    RAISE EXCEPTION 'name required';
  END IF;
  INSERT INTO public.groups (name, created_by)
  VALUES (trim(p_name), auth.uid())
  RETURNING * INTO g;
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (g.id, auth.uid(), 'admin');
  RETURN g;
END;
$$;

REVOKE ALL ON FUNCTION public.create_group(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_group(text) TO authenticated;

-- Rejoindre un groupe via invite_code (insensible à la casse)
CREATE OR REPLACE FUNCTION public.join_group_by_invite(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  gid uuid;
  normalized text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  normalized := lower(trim(p_code));
  IF normalized = '' THEN
    RETURN NULL;
  END IF;
  SELECT id INTO gid FROM public.groups WHERE lower(invite_code) = normalized;
  IF gid IS NULL THEN
    RETURN NULL;
  END IF;
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (gid, auth.uid(), 'member')
  ON CONFLICT (group_id, user_id) DO NOTHING;
  RETURN gid;
END;
$$;

REVOKE ALL ON FUNCTION public.join_group_by_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_group_by_invite(text) TO authenticated;


-- ============================================================
--  VOTES DE GROUPE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.group_proposals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     UUID NOT NULL REFERENCES public.groups(id)  ON DELETE CASCADE,
  place_id     UUID NOT NULL REFERENCES public.places(id)  ON DELETE CASCADE,
  proposed_by  UUID NOT NULL REFERENCES auth.users(id)     ON DELETE CASCADE,
  proposed_for DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (group_id, place_id, proposed_for)
);

CREATE TABLE IF NOT EXISTS public.group_proposal_votes (
  proposal_id  UUID NOT NULL REFERENCES public.group_proposals(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote         BOOLEAN NOT NULL,   -- true = oui, false = non
  PRIMARY KEY (proposal_id, user_id)
);

ALTER TABLE public.group_proposals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_proposal_votes  ENABLE ROW LEVEL SECURITY;

-- Proposals : visibles par les membres du groupe
CREATE POLICY "proposals: membres peuvent lire"
  ON public.group_proposals FOR SELECT
  USING (group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()));

CREATE POLICY "proposals: membres peuvent proposer"
  ON public.group_proposals FOR INSERT
  WITH CHECK (
    proposed_by = auth.uid() AND
    group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "proposals: créateur peut supprimer"
  ON public.group_proposals FOR DELETE
  USING (proposed_by = auth.uid());

-- Votes
CREATE POLICY "votes: membres peuvent lire"
  ON public.group_proposal_votes FOR SELECT
  USING (
    proposal_id IN (
      SELECT id FROM public.group_proposals
      WHERE group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "votes: voter"
  ON public.group_proposal_votes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "votes: changer son vote"
  ON public.group_proposal_votes FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "votes: retirer son vote"
  ON public.group_proposal_votes FOR DELETE
  USING (user_id = auth.uid());


-- ============================================================
--  KAKI REWARDS — incrément atomique des points
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_reward_points(p_user_id uuid, p_points int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, reward_points)
  VALUES (p_user_id, p_points)
  ON CONFLICT (id) DO UPDATE
    SET reward_points = COALESCE(public.users.reward_points, 0) + p_points;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_reward_points(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_reward_points(uuid, int) TO authenticated;


-- ============================================================
--  FIX RLS users — permettre l'upsert du profil
-- ============================================================
DROP POLICY IF EXISTS "users: insert propre" ON public.users;
CREATE POLICY "users: insert propre"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Bucket avatars (Storage) — à créer dans Dashboard > Storage aussi
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars: lecture publique" ON storage.objects;
CREATE POLICY "avatars: lecture publique"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars: upload propre" ON storage.objects;
CREATE POLICY "avatars: upload propre"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

DROP POLICY IF EXISTS "avatars: update propre" ON storage.objects;
CREATE POLICY "avatars: update propre"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

DROP POLICY IF EXISTS "avatars: delete propre" ON storage.objects;
CREATE POLICY "avatars: delete propre"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (string_to_array(name, '/'))[1]);


-- ============================================================
--  FIX CRITIQUE — Récursion infinie dans les policies groupe
--  Exécuter ce bloc dans Supabase > SQL Editor
--
--  Problème : les policies GROUP_MEMBERS se référencent elles-
--  mêmes → "infinite recursion detected in policy for relation
--  group_members".
--
--  Solution : fonction SECURITY DEFINER qui lit group_members
--  sans déclencher RLS (brise le cycle).
-- ============================================================

CREATE OR REPLACE FUNCTION public.my_group_ids()
RETURNS SETOF UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT group_id FROM public.group_members WHERE user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.my_group_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_group_ids() TO authenticated;

-- Remplacer toutes les policies récursives par des appels à my_group_ids()

DROP POLICY IF EXISTS "group_members: lecture" ON public.group_members;
CREATE POLICY "group_members: lecture"
  ON public.group_members FOR SELECT
  USING (group_id IN (SELECT public.my_group_ids()));

DROP POLICY IF EXISTS "groups: membres peuvent lire" ON public.groups;
CREATE POLICY "groups: membres peuvent lire"
  ON public.groups FOR SELECT
  USING (id IN (SELECT public.my_group_ids()));

DROP POLICY IF EXISTS "group_places: lecture" ON public.group_places;
CREATE POLICY "group_places: lecture"
  ON public.group_places FOR SELECT
  USING (group_id IN (SELECT public.my_group_ids()));

DROP POLICY IF EXISTS "group_places: insert own place" ON public.group_places;
CREATE POLICY "group_places: insert own place"
  ON public.group_places FOR INSERT
  WITH CHECK (
    group_id IN (SELECT public.my_group_ids())
    AND EXISTS (
      SELECT 1 FROM public.places p WHERE p.id = place_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "group_places: delete member" ON public.group_places;
CREATE POLICY "group_places: delete member"
  ON public.group_places FOR DELETE
  USING (group_id IN (SELECT public.my_group_ids()));

DROP POLICY IF EXISTS "proposals: membres peuvent lire" ON public.group_proposals;
CREATE POLICY "proposals: membres peuvent lire"
  ON public.group_proposals FOR SELECT
  USING (group_id IN (SELECT public.my_group_ids()));

DROP POLICY IF EXISTS "proposals: membres peuvent proposer" ON public.group_proposals;
CREATE POLICY "proposals: membres peuvent proposer"
  ON public.group_proposals FOR INSERT
  WITH CHECK (
    proposed_by = auth.uid() AND
    group_id IN (SELECT public.my_group_ids())
  );

DROP POLICY IF EXISTS "votes: membres peuvent lire" ON public.group_proposal_votes;
CREATE POLICY "votes: membres peuvent lire"
  ON public.group_proposal_votes FOR SELECT
  USING (
    proposal_id IN (
      SELECT id FROM public.group_proposals
      WHERE group_id IN (SELECT public.my_group_ids())
    )
  );

-- S'assurer que le bucket avatars existe bien
-- (à exécuter aussi dans Dashboard > Storage si erreur "bucket not found")
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

-- ============================================================
--  NOTE : si "Could not find function public.create_group"
--  → exécuter à nouveau le bloc CREATE OR REPLACE FUNCTION
--    public.create_group et public.join_group_by_invite
--    ci-dessus, puis recharger la page (schema cache refresh).
-- ============================================================


-- ============================================================
--  JOUR 1 — Vrai bouton Réserver
--  Exécuter ce bloc dans Supabase > SQL Editor
-- ============================================================

-- Enrichir la table reservations existante
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS status           text        DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','cancelled')),
  ADD COLUMN IF NOT EXISTS guest_name       text,
  ADD COLUMN IF NOT EXISTS guest_email      text,
  ADD COLUMN IF NOT EXISTS guest_phone      text,
  ADD COLUMN IF NOT EXISTS party_size       int,
  ADD COLUMN IF NOT EXISTS reservation_date timestamptz,
  ADD COLUMN IF NOT EXISTS message          text,
  ADD COLUMN IF NOT EXISTS tracking_code    text UNIQUE DEFAULT substr(md5(random()::text),1,10);

-- Ajouter l'email du restaurant sur la table places
ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS restaurant_email text;

-- Policy INSERT pour reservations
DROP POLICY IF EXISTS "reservations: insert propre" ON public.reservations;
CREATE POLICY "reservations: insert propre"
  ON public.reservations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Permettre la lecture par le propriétaire
DROP POLICY IF EXISTS "reservations: lecture par tracking" ON public.reservations;
CREATE POLICY "reservations: lecture par tracking"
  ON public.reservations FOR SELECT
  USING (auth.uid() = user_id OR tracking_code IS NOT NULL);


-- ============================================================
--  JOUR 2 — Onboarding + Tracking réservation
--  Exécuter ce bloc dans Supabase > SQL Editor
-- ============================================================

-- Flag onboarding sur la table users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Fonction : lire une réservation par tracking_code (sans auth)
CREATE OR REPLACE FUNCTION public.get_reservation_by_code(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'guest_name',       r.guest_name,
    'guest_email',      r.guest_email,
    'party_size',       r.party_size,
    'reservation_date', r.reservation_date,
    'message',          r.message,
    'status',           r.status,
    'place_name',       p.name,
    'place_address',    p.address
  )
  INTO result
  FROM public.reservations r
  LEFT JOIN public.places p ON p.id = r.place_id
  WHERE r.tracking_code = p_code;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_reservation_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_reservation_by_code(text) TO anon, authenticated;

-- Fonction : confirmer une réservation par tracking_code (sans auth)
CREATE OR REPLACE FUNCTION public.confirm_reservation(p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.reservations
  SET status = 'confirmed'
  WHERE tracking_code = p_code AND status = 'pending';
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_reservation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_reservation(text) TO anon, authenticated;


-- ============================================================
--  JOUR 3 — Page d'invitation virale /invite/[code]
--  Exécuter ce bloc dans Supabase > SQL Editor
-- ============================================================

-- Fonction : aperçu public d'un groupe par invite_code
CREATE OR REPLACE FUNCTION public.get_group_preview(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g   public.groups;
  cnt int;
  pls json;
BEGIN
  -- Trouver le groupe (insensible à la casse)
  SELECT * INTO g FROM public.groups WHERE lower(invite_code) = lower(trim(p_code));
  IF g.id IS NULL THEN RETURN NULL; END IF;

  -- Nombre de membres
  SELECT COUNT(*) INTO cnt FROM public.group_members WHERE group_id = g.id;

  -- Dernières adresses ajoutées au groupe (max 3)
  SELECT json_agg(sub) INTO pls FROM (
    SELECT p.name, p.cover_photo, p.category
    FROM public.group_places gp
    JOIN public.places p ON p.id = gp.place_id
    WHERE gp.group_id = g.id
    ORDER BY gp.added_at DESC
    LIMIT 3
  ) sub;

  RETURN json_build_object(
    'name',         g.name,
    'member_count', cnt,
    'places',       COALESCE(pls, '[]'::json)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_group_preview(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_group_preview(text) TO anon, authenticated;


-- ============================================================
--  BASE RESTAURANTS PARTAGÉE — place_requests
--  Exécuter ce bloc dans Supabase > SQL Editor
-- ============================================================

-- Table des demandes d'ajout (quand un resto n'est pas encore dans la base)
CREATE TABLE IF NOT EXISTS public.place_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query        TEXT NOT NULL,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','done','rejected')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.place_requests ENABLE ROW LEVEL SECURITY;

-- Tout utilisateur connecté peut soumettre une demande
DROP POLICY IF EXISTS "place_requests: insert" ON public.place_requests;
CREATE POLICY "place_requests: insert"
  ON public.place_requests FOR INSERT
  WITH CHECK (auth.uid() = requested_by);

-- Lecture de ses propres demandes
DROP POLICY IF EXISTS "place_requests: select propre" ON public.place_requests;
CREATE POLICY "place_requests: select propre"
  ON public.place_requests FOR SELECT
  USING (auth.uid() = requested_by);

-- Permettre à l'admin de lire toutes les demandes
DROP POLICY IF EXISTS "place_requests: admin select" ON public.place_requests;
CREATE POLICY "place_requests: admin select"
  ON public.place_requests FOR SELECT
  USING (
    auth.jwt() ->> 'email' = 'sara.benabdelkader03@gmail.com'
  );

-- Permettre à l'admin de mettre à jour les demandes
DROP POLICY IF EXISTS "place_requests: admin update" ON public.place_requests;
CREATE POLICY "place_requests: admin update"
  ON public.place_requests FOR UPDATE
  USING (
    auth.jwt() ->> 'email' = 'sara.benabdelkader03@gmail.com'
  );


-- ============================================================
--  BUCKET PHOTOS RESTAURANTS (Storage)
--  Exécuter dans Supabase > SQL Editor
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('place-photos', 'place-photos', true, 10485760,
        ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "place-photos: lecture publique" ON storage.objects;
CREATE POLICY "place-photos: lecture publique"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'place-photos');

DROP POLICY IF EXISTS "place-photos: upload admin" ON storage.objects;
CREATE POLICY "place-photos: upload admin"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'place-photos' AND
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND email = 'sara.benabdelkader03@gmail.com'
    )
  );
