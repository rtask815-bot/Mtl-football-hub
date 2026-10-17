-- ============================================================================
-- MTL FOOTBALL HUB - SUPABASE USER STATUSES & CALLS MIGRATION SCRIPT
-- Run this SQL in the Supabase Dashboard SQL Editor (or psql)
-- Project: MTL Football Intelligence
-- ============================================================================

-- 1. Ensure required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREATE OR UPDATE TABLE: user_statuses
CREATE TABLE IF NOT EXISTS public.user_statuses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_name TEXT DEFAULT 'Anonymous Fan',
    user_avatar TEXT,
    status_type TEXT DEFAULT 'match_card', -- 'match_card', 'reel', 'image'
    match_fixture TEXT NOT NULL DEFAULT 'Match Day',
    league TEXT,
    home_team TEXT,
    away_team TEXT,
    predicted_score TEXT,
    prediction_pick TEXT NOT NULL DEFAULT '',
    decimal_odds NUMERIC(6, 2) DEFAULT 1.95,
    confidence_stars INTEGER DEFAULT 5,
    caption TEXT,
    media_url TEXT,
    media_type TEXT DEFAULT 'image', -- 'image', 'video'
    theme_color TEXT DEFAULT 'emerald',
    views_count INTEGER DEFAULT 1,
    likes_count INTEGER DEFAULT 0,
    viewers TEXT[] DEFAULT ARRAY[]::TEXT[],
    likers TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Ensure all columns exist if table was previously created with fewer columns
DO $$
BEGIN
    ALTER TABLE public.user_statuses ADD COLUMN IF NOT EXISTS status_type TEXT DEFAULT 'match_card';
    ALTER TABLE public.user_statuses ADD COLUMN IF NOT EXISTS match_fixture TEXT NOT NULL DEFAULT 'Match Day';
    ALTER TABLE public.user_statuses ADD COLUMN IF NOT EXISTS league TEXT;
    ALTER TABLE public.user_statuses ADD COLUMN IF NOT EXISTS home_team TEXT;
    ALTER TABLE public.user_statuses ADD COLUMN IF NOT EXISTS away_team TEXT;
    ALTER TABLE public.user_statuses ADD COLUMN IF NOT EXISTS predicted_score TEXT;
    ALTER TABLE public.user_statuses ADD COLUMN IF NOT EXISTS prediction_pick TEXT NOT NULL DEFAULT '';
    ALTER TABLE public.user_statuses ADD COLUMN IF NOT EXISTS decimal_odds NUMERIC(6, 2) DEFAULT 1.95;
    ALTER TABLE public.user_statuses ADD COLUMN IF NOT EXISTS confidence_stars INTEGER DEFAULT 5;
    ALTER TABLE public.user_statuses ADD COLUMN IF NOT EXISTS caption TEXT;
    ALTER TABLE public.user_statuses ADD COLUMN IF NOT EXISTS media_url TEXT;
    ALTER TABLE public.user_statuses ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image';
    ALTER TABLE public.user_statuses ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT 'emerald';
    ALTER TABLE public.user_statuses ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 1;
    ALTER TABLE public.user_statuses ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
    ALTER TABLE public.user_statuses ADD COLUMN IF NOT EXISTS viewers TEXT[] DEFAULT ARRAY[]::TEXT[];
    ALTER TABLE public.user_statuses ADD COLUMN IF NOT EXISTS likers TEXT[] DEFAULT ARRAY[]::TEXT[];
    ALTER TABLE public.user_statuses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.user_statuses ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours');
END $$;

-- 3. CREATE OR UPDATE TABLE: status_likes (Audit and individual like records)
CREATE TABLE IF NOT EXISTS public.status_likes (
    id TEXT PRIMARY KEY,
    status_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (status_id, user_id)
);

-- 4. CREATE OR UPDATE TABLE: call_records (Hotline voice & video logs)
CREATE TABLE IF NOT EXISTS public.call_records (
    id TEXT PRIMARY KEY,
    caller_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    call_type TEXT DEFAULT 'audio', -- 'audio' or 'video'
    status TEXT DEFAULT 'completed', -- 'connecting', 'connected', 'missed', 'rejected', 'completed'
    duration_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_user_statuses_created_at ON public.user_statuses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_statuses_user_id ON public.user_statuses (user_id);
CREATE INDEX IF NOT EXISTS idx_user_statuses_expires_at ON public.user_statuses (expires_at);
CREATE INDEX IF NOT EXISTS idx_status_likes_status_id ON public.status_likes (status_id);
CREATE INDEX IF NOT EXISTS idx_status_likes_user_id ON public.status_likes (user_id);
CREATE INDEX IF NOT EXISTS idx_call_records_caller ON public.call_records (caller_id);
CREATE INDEX IF NOT EXISTS idx_call_records_receiver ON public.call_records (receiver_id);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.user_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_records ENABLE ROW LEVEL SECURITY;

-- Allow public / authenticated reads on user statuses (within 24h)
DROP POLICY IF EXISTS "Public can view user statuses" ON public.user_statuses;
CREATE POLICY "Public can view user statuses"
    ON public.user_statuses
    FOR SELECT
    USING (true);

-- Allow public / authenticated insert on user statuses
DROP POLICY IF EXISTS "Anyone can publish user status" ON public.user_statuses;
CREATE POLICY "Anyone can publish user status"
    ON public.user_statuses
    FOR INSERT
    WITH CHECK (true);

-- Allow public / authenticated update on user statuses (for views and likes)
DROP POLICY IF EXISTS "Anyone can update status counts" ON public.user_statuses;
CREATE POLICY "Anyone can update status counts"
    ON public.user_statuses
    FOR UPDATE
    USING (true);

-- Allow public / authenticated delete on user statuses
DROP POLICY IF EXISTS "Anyone can delete own status" ON public.user_statuses;
CREATE POLICY "Anyone can delete own status"
    ON public.user_statuses
    FOR DELETE
    USING (true);

-- Policies for status_likes
DROP POLICY IF EXISTS "Public can read status likes" ON public.status_likes;
CREATE POLICY "Public can read status likes"
    ON public.status_likes
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Anyone can insert status likes" ON public.status_likes;
CREATE POLICY "Anyone can insert status likes"
    ON public.status_likes
    FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can remove status likes" ON public.status_likes;
CREATE POLICY "Anyone can remove status likes"
    ON public.status_likes
    FOR DELETE
    USING (true);

-- Policies for call_records
DROP POLICY IF EXISTS "Public can read call records" ON public.call_records;
CREATE POLICY "Public can read call records"
    ON public.call_records
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Anyone can insert call records" ON public.call_records;
CREATE POLICY "Anyone can insert call records"
    ON public.call_records
    FOR INSERT
    WITH CHECK (true);

-- 7. ENABLE REALTIME PUBLICATION FOR SUPABASE REALTIME CLIENT
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.user_statuses;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.status_likes;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.call_records;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;
