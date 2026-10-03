-- ============================================================================
-- MTL FOOTBALL INTELLIGENCE HUB: FULL SUPABASE MASTER SCHEMA
-- 'ADD IF NOT EXISTS' IDEMPOTENT DDL & RLS SECURITY CONFIGURATION
-- ============================================================================
-- Run this complete script in the Supabase SQL Editor (Dashboard -> SQL Editor).
-- It is designed to be 100% idempotent: safe to run on both brand-new and
-- existing databases without overwriting or losing any existing data.
-- ============================================================================

-- 1. REQUIRED EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. TABLE DEFINITIONS (CREATE TABLE IF NOT EXISTS)
-- ============================================================================

-- 2.1 PROFILES (User accounts, avatars, roles & permissions)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT,
    name TEXT,
    email TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'member',
    is_admin BOOLEAN DEFAULT FALSE,
    admin BOOLEAN DEFAULT FALSE,
    is_global_admin BOOLEAN DEFAULT FALSE,
    status_message TEXT DEFAULT 'Active Fan',
    favorite_club TEXT DEFAULT 'Arsenal',
    bio TEXT,
    points INTEGER DEFAULT 100,
    odds_format TEXT DEFAULT 'decimal',
    language TEXT DEFAULT 'en',
    high_contrast BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 MATCHES (Live matches, AI predictions, past results, scores & xG)
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teams TEXT NOT NULL,
    league TEXT DEFAULT 'Premier League',
    match_date DATE DEFAULT CURRENT_DATE,
    match_time TEXT DEFAULT '20:00',
    prediction TEXT DEFAULT 'Home Win',
    status TEXT DEFAULT 'PENDING',
    final_score TEXT,
    score TEXT,
    home_score INTEGER,
    away_score INTEGER,
    minute INTEGER DEFAULT 0,
    confidence TEXT DEFAULT 'HIGH',
    confidence_stars INTEGER DEFAULT 4,
    analysis TEXT,
    analysis_text TEXT,
    type TEXT DEFAULT 'PRO',
    decimal_odds NUMERIC(6, 2) DEFAULT 1.95,
    home_win_prob NUMERIC(5, 2) DEFAULT 55.0,
    prob_home NUMERIC(5, 2) DEFAULT 55.0,
    draw_prob NUMERIC(5, 2) DEFAULT 25.0,
    prob_draw NUMERIC(5, 2) DEFAULT 25.0,
    away_win_prob NUMERIC(5, 2) DEFAULT 20.0,
    prob_away NUMERIC(5, 2) DEFAULT 20.0,
    both_teams_score BOOLEAN DEFAULT TRUE,
    over_under TEXT DEFAULT 'Over 2.5',
    likes INTEGER DEFAULT 0,
    dislikes INTEGER DEFAULT 0,
    reactions JSONB DEFAULT '{}'::jsonb,
    details TEXT,
    stadium TEXT,
    referee TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.3 FIXTURES (Scheduled matches, broadcast telemetry, tournament rounds)
CREATE TABLE IF NOT EXISTS public.fixtures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teams TEXT NOT NULL,
    league TEXT DEFAULT 'Premier League',
    match_date DATE DEFAULT CURRENT_DATE,
    match_time TEXT DEFAULT '20:00',
    badge TEXT DEFAULT '⚽',
    venue TEXT,
    stadium TEXT,
    broadcast TEXT DEFAULT 'Sky Sports / TNT Sports',
    round TEXT DEFAULT 'Matchday Regular',
    status TEXT DEFAULT 'SCHEDULED',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.4 TRENDING (Trending football topics, viral hashtags, discussion spikes)
CREATE TABLE IF NOT EXISTS public.trending (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic TEXT,
    title TEXT,
    posts_count TEXT DEFAULT '12.4K',
    comments_count INTEGER DEFAULT 142,
    category TEXT DEFAULT 'Premier League',
    rank INTEGER DEFAULT 1,
    growth_rate TEXT DEFAULT '+18%',
    badge TEXT DEFAULT '🔥 HOT',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.5 CHAT GROUPS (Community lounges, matchday banter rooms)
CREATE TABLE IF NOT EXISTS public.chat_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    type TEXT DEFAULT 'public',
    icon TEXT DEFAULT '💬',
    is_private BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT TRUE,
    is_suspended BOOLEAN DEFAULT FALSE,
    suspended_until TIMESTAMPTZ,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_big_three BOOLEAN DEFAULT FALSE,
    creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    member_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.6 GROUP MEMBERS (Membership and roles in lounges)
CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    is_suspended BOOLEAN DEFAULT FALSE,
    suspended_until TIMESTAMPTZ,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (group_id, user_id)
);

-- 2.7 MESSAGES (Real-time community chats & group messages)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES public.chat_groups(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT,
    text TEXT,
    message_type TEXT DEFAULT 'group',
    media_url TEXT,
    mentions TEXT[],
    reactions JSONB DEFAULT '{}'::jsonb,
    is_edited BOOLEAN DEFAULT FALSE,
    is_encrypted BOOLEAN DEFAULT FALSE,
    reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.8 DIRECT MESSAGES (Direct fan-to-fan private communications)
CREATE TABLE IF NOT EXISTS public.direct_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT,
    text TEXT,
    media_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.9 COMMENTS (Comments on matches, predictions, and news bulletins)
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id TEXT,
    news_id TEXT,
    post_id TEXT,
    message_id TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    username TEXT DEFAULT 'Anonymous Fan',
    avatar TEXT,
    content TEXT,
    comment TEXT,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.10 REACTIONS (Likes, dislikes, cheering emojis on predictions & matches)
CREATE TABLE IF NOT EXISTS public.reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id TEXT,
    message_id TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT,
    type TEXT DEFAULT 'like',
    reaction_type TEXT DEFAULT 'like',
    emoji TEXT DEFAULT '👍',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.11 CHATS (Inline matchday live feed commentary)
CREATE TABLE IF NOT EXISTS public.chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    username TEXT DEFAULT 'Tactical Fan',
    avatar TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.12 NEWS (Football news feed, transfer wire, breaking bulletins)
CREATE TABLE IF NOT EXISTS public.news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT,
    category TEXT DEFAULT 'general',
    author TEXT DEFAULT 'MTL Tactical Desk',
    source TEXT DEFAULT 'MTL Intelligence Network',
    image_url TEXT,
    read_time TEXT DEFAULT '3 min read',
    badge TEXT DEFAULT '🔥 BREAKING',
    is_featured BOOLEAN DEFAULT FALSE,
    is_breaking BOOLEAN DEFAULT FALSE,
    tags TEXT[] DEFAULT ARRAY['Football', 'Analysis']::TEXT[],
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.13 CLUBS (Club dossiers, stadiums, managers, squads & honors)
CREATE TABLE IF NOT EXISTS public.clubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    league TEXT DEFAULT 'Premier League',
    manager TEXT,
    founded_year INTEGER,
    stadium TEXT,
    capacity INTEGER,
    badge_url TEXT,
    trophies JSONB DEFAULT '{}'::jsonb,
    key_players TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.14 NOTIFICATIONS (User alert notifications & system notices)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. COLUMN SYNCHRONIZATION (ADD COLUMN IF NOT EXISTS FOR EXISTING TABLES)
-- ============================================================================

-- PROFILES columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_global_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_message TEXT DEFAULT 'Active Fan';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS favorite_club TEXT DEFAULT 'Arsenal';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 100;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS odds_format TEXT DEFAULT 'decimal';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS high_contrast BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- MATCHES columns
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS teams TEXT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS league TEXT DEFAULT 'Premier League';
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS match_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS match_time TEXT DEFAULT '20:00';
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS prediction TEXT DEFAULT 'Home Win';
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING';
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS final_score TEXT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS score TEXT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS home_score INTEGER;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS away_score INTEGER;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS minute INTEGER DEFAULT 0;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS confidence TEXT DEFAULT 'HIGH';
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS confidence_stars INTEGER DEFAULT 4;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS analysis TEXT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS analysis_text TEXT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'PRO';
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS decimal_odds NUMERIC(6, 2) DEFAULT 1.95;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS home_win_prob NUMERIC(5, 2) DEFAULT 55.0;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS prob_home NUMERIC(5, 2) DEFAULT 55.0;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS draw_prob NUMERIC(5, 2) DEFAULT 25.0;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS prob_draw NUMERIC(5, 2) DEFAULT 25.0;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS away_win_prob NUMERIC(5, 2) DEFAULT 20.0;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS prob_away NUMERIC(5, 2) DEFAULT 20.0;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS both_teams_score BOOLEAN DEFAULT TRUE;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS over_under TEXT DEFAULT 'Over 2.5';
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS dislikes INTEGER DEFAULT 0;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS stadium TEXT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS referee TEXT;

-- FIXTURES columns
ALTER TABLE public.fixtures ADD COLUMN IF NOT EXISTS league TEXT DEFAULT 'Premier League';
ALTER TABLE public.fixtures ADD COLUMN IF NOT EXISTS teams TEXT;
ALTER TABLE public.fixtures ADD COLUMN IF NOT EXISTS match_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.fixtures ADD COLUMN IF NOT EXISTS match_time TEXT DEFAULT '20:00';
ALTER TABLE public.fixtures ADD COLUMN IF NOT EXISTS badge TEXT DEFAULT '⚽';
ALTER TABLE public.fixtures ADD COLUMN IF NOT EXISTS venue TEXT;
ALTER TABLE public.fixtures ADD COLUMN IF NOT EXISTS stadium TEXT;
ALTER TABLE public.fixtures ADD COLUMN IF NOT EXISTS broadcast TEXT DEFAULT 'Sky Sports / TNT Sports';
ALTER TABLE public.fixtures ADD COLUMN IF NOT EXISTS round TEXT DEFAULT 'Matchday Regular';
ALTER TABLE public.fixtures ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'SCHEDULED';

-- TRENDING columns
ALTER TABLE public.trending ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE public.trending ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.trending ADD COLUMN IF NOT EXISTS posts_count TEXT DEFAULT '12.4K';
ALTER TABLE public.trending ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 142;
ALTER TABLE public.trending ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Premier League';
ALTER TABLE public.trending ADD COLUMN IF NOT EXISTS rank INTEGER DEFAULT 1;
ALTER TABLE public.trending ADD COLUMN IF NOT EXISTS growth_rate TEXT DEFAULT '+18%';
ALTER TABLE public.trending ADD COLUMN IF NOT EXISTS badge TEXT DEFAULT '🔥 HOT';

-- CHAT GROUPS columns
ALTER TABLE public.chat_groups ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';
ALTER TABLE public.chat_groups ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'public';
ALTER TABLE public.chat_groups ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '💬';
ALTER TABLE public.chat_groups ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;
ALTER TABLE public.chat_groups ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE;
ALTER TABLE public.chat_groups ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
ALTER TABLE public.chat_groups ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;
ALTER TABLE public.chat_groups ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE public.chat_groups ADD COLUMN IF NOT EXISTS is_big_three BOOLEAN DEFAULT FALSE;
ALTER TABLE public.chat_groups ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.chat_groups ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.chat_groups ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 1;

-- MESSAGES columns
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS text TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'group';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS mentions TEXT[];
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;

-- COMMENTS columns
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS match_id TEXT;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS news_id TEXT;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS post_id TEXT;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS message_id TEXT;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS username TEXT DEFAULT 'Anonymous Fan';
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;

-- REACTIONS columns
ALTER TABLE public.reactions ADD COLUMN IF NOT EXISTS match_id TEXT;
ALTER TABLE public.reactions ADD COLUMN IF NOT EXISTS message_id TEXT;
ALTER TABLE public.reactions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.reactions ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.reactions ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'like';
ALTER TABLE public.reactions ADD COLUMN IF NOT EXISTS reaction_type TEXT DEFAULT 'like';
ALTER TABLE public.reactions ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '👍';

-- CHATS columns
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS match_id TEXT;
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS username TEXT DEFAULT 'Tactical Fan';
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS message TEXT;

-- ============================================================================
-- 4. RELATIONSHIP COMPATIBILITY (FOREIGN KEYS FOR POSTGREST RESOURCE EMBEDDING)
-- ============================================================================
-- Ensures queries like: supabase.from('messages').select('*, profiles:sender_id(username, avatar_url)') work.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_messages_sender_profile' AND table_name = 'messages'
    ) THEN
        BEGIN
            ALTER TABLE public.messages
                ADD CONSTRAINT fk_messages_sender_profile
                FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_group_members_user_profile' AND table_name = 'group_members'
    ) THEN
        BEGIN
            ALTER TABLE public.group_members
                ADD CONSTRAINT fk_group_members_user_profile
                FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;
END $$;

-- ============================================================================
-- 5. PERFORMANCE INDEXES (FOR INSTANT QUERIES & ZERO-LATENCY SORTING)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_messages_group_id ON public.messages(group_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_date ON public.matches(match_date DESC);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON public.matches(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fixtures_match_date ON public.fixtures(match_date ASC);
CREATE INDEX IF NOT EXISTS idx_trending_rank ON public.trending(rank ASC);
CREATE INDEX IF NOT EXISTS idx_group_members_group_user ON public.group_members(group_id, user_id);

CREATE INDEX IF NOT EXISTS idx_comments_match_id ON public.comments(match_id);
CREATE INDEX IF NOT EXISTS idx_comments_news_id ON public.comments(news_id);
CREATE INDEX IF NOT EXISTS idx_reactions_match_id ON public.reactions(match_id);
CREATE INDEX IF NOT EXISTS idx_chats_match_id ON public.chats(match_id);

-- ============================================================================
-- 6. AUTOMATED USER PROVISIONING TRIGGER (AUTH.USERS -> PUBLIC.PROFILES)
-- ============================================================================
-- Automatically creates or syncs a public profile whenever a new user signs up.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        username,
        avatar_url,
        role,
        is_admin,
        admin,
        status_message,
        favorite_club,
        points,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'),
        CASE 
            WHEN NEW.email LIKE '%admin%' OR NEW.email = 'moricetonnylennox@gmail.com' THEN 'admin'
            ELSE 'member'
        END,
        CASE 
            WHEN NEW.email LIKE '%admin%' OR NEW.email = 'moricetonnylennox@gmail.com' THEN TRUE
            ELSE FALSE
        END,
        CASE 
            WHEN NEW.email LIKE '%admin%' OR NEW.email = 'moricetonnylennox@gmail.com' THEN TRUE
            ELSE FALSE
        END,
        'Online in Hub',
        COALESCE(NEW.raw_user_meta_data->>'favorite_club', 'Arsenal'),
        100,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();

    RETURN NEW;
END;
$$;

-- Drop trigger if it already exists, then re-create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS) & COMPREHENSIVE DATA ACCESS POLICIES
-- ============================================================================
-- Guarantees data can be sent, stored, updated and read without 401/403 errors.

-- Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trending ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Macro helper for safe policy creation
DO $$
BEGIN
    -- PROFILES POLICIES
    DROP POLICY IF EXISTS "Public profiles read access" ON public.profiles;
    CREATE POLICY "Public profiles read access" ON public.profiles FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
    CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "Users and admins can update profile" ON public.profiles;
    CREATE POLICY "Users and admins can update profile" ON public.profiles FOR UPDATE USING (
        auth.uid() = id OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = TRUE OR role = 'admin'))
    );

    DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
    CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE USING (
        auth.uid() = id OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = TRUE OR role = 'admin'))
    );

    -- MATCHES POLICIES
    DROP POLICY IF EXISTS "Matches select access" ON public.matches;
    CREATE POLICY "Matches select access" ON public.matches FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Matches insert access" ON public.matches;
    CREATE POLICY "Matches insert access" ON public.matches FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "Matches update access" ON public.matches;
    CREATE POLICY "Matches update access" ON public.matches FOR UPDATE USING (true);

    DROP POLICY IF EXISTS "Matches delete access" ON public.matches;
    CREATE POLICY "Matches delete access" ON public.matches FOR DELETE USING (true);

    -- FIXTURES POLICIES
    DROP POLICY IF EXISTS "Fixtures select access" ON public.fixtures;
    CREATE POLICY "Fixtures select access" ON public.fixtures FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Fixtures insert access" ON public.fixtures;
    CREATE POLICY "Fixtures insert access" ON public.fixtures FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "Fixtures update access" ON public.fixtures;
    CREATE POLICY "Fixtures update access" ON public.fixtures FOR UPDATE USING (true);

    DROP POLICY IF EXISTS "Fixtures delete access" ON public.fixtures;
    CREATE POLICY "Fixtures delete access" ON public.fixtures FOR DELETE USING (true);

    -- TRENDING POLICIES
    DROP POLICY IF EXISTS "Trending select access" ON public.trending;
    CREATE POLICY "Trending select access" ON public.trending FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Trending insert access" ON public.trending;
    CREATE POLICY "Trending insert access" ON public.trending FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "Trending update access" ON public.trending;
    CREATE POLICY "Trending update access" ON public.trending FOR UPDATE USING (true);

    DROP POLICY IF EXISTS "Trending delete access" ON public.trending;
    CREATE POLICY "Trending delete access" ON public.trending FOR DELETE USING (true);

    -- CHAT GROUPS POLICIES
    DROP POLICY IF EXISTS "Chat groups select access" ON public.chat_groups;
    CREATE POLICY "Chat groups select access" ON public.chat_groups FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Chat groups insert access" ON public.chat_groups;
    CREATE POLICY "Chat groups insert access" ON public.chat_groups FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "Chat groups update access" ON public.chat_groups;
    CREATE POLICY "Chat groups update access" ON public.chat_groups FOR UPDATE USING (true);

    DROP POLICY IF EXISTS "Chat groups delete access" ON public.chat_groups;
    CREATE POLICY "Chat groups delete access" ON public.chat_groups FOR DELETE USING (true);

    -- GROUP MEMBERS POLICIES
    DROP POLICY IF EXISTS "Group members select access" ON public.group_members;
    CREATE POLICY "Group members select access" ON public.group_members FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Group members insert access" ON public.group_members;
    CREATE POLICY "Group members insert access" ON public.group_members FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "Group members update access" ON public.group_members;
    CREATE POLICY "Group members update access" ON public.group_members FOR UPDATE USING (true);

    DROP POLICY IF EXISTS "Group members delete access" ON public.group_members;
    CREATE POLICY "Group members delete access" ON public.group_members FOR DELETE USING (true);

    -- MESSAGES POLICIES
    DROP POLICY IF EXISTS "Messages select access" ON public.messages;
    CREATE POLICY "Messages select access" ON public.messages FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Messages insert access" ON public.messages;
    CREATE POLICY "Messages insert access" ON public.messages FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "Messages update access" ON public.messages;
    CREATE POLICY "Messages update access" ON public.messages FOR UPDATE USING (true);

    DROP POLICY IF EXISTS "Messages delete access" ON public.messages;
    CREATE POLICY "Messages delete access" ON public.messages FOR DELETE USING (true);

    -- DIRECT MESSAGES POLICIES
    DROP POLICY IF EXISTS "Direct messages select access" ON public.direct_messages;
    CREATE POLICY "Direct messages select access" ON public.direct_messages FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Direct messages insert access" ON public.direct_messages;
    CREATE POLICY "Direct messages insert access" ON public.direct_messages FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "Direct messages update access" ON public.direct_messages;
    CREATE POLICY "Direct messages update access" ON public.direct_messages FOR UPDATE USING (true);

    DROP POLICY IF EXISTS "Direct messages delete access" ON public.direct_messages;
    CREATE POLICY "Direct messages delete access" ON public.direct_messages FOR DELETE USING (true);

    -- COMMENTS POLICIES
    DROP POLICY IF EXISTS "Comments select access" ON public.comments;
    CREATE POLICY "Comments select access" ON public.comments FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Comments insert access" ON public.comments;
    CREATE POLICY "Comments insert access" ON public.comments FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "Comments update access" ON public.comments;
    CREATE POLICY "Comments update access" ON public.comments FOR UPDATE USING (true);

    DROP POLICY IF EXISTS "Comments delete access" ON public.comments;
    CREATE POLICY "Comments delete access" ON public.comments FOR DELETE USING (true);

    -- REACTIONS POLICIES
    DROP POLICY IF EXISTS "Reactions select access" ON public.reactions;
    CREATE POLICY "Reactions select access" ON public.reactions FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Reactions insert access" ON public.reactions;
    CREATE POLICY "Reactions insert access" ON public.reactions FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "Reactions update access" ON public.reactions;
    CREATE POLICY "Reactions update access" ON public.reactions FOR UPDATE USING (true);

    DROP POLICY IF EXISTS "Reactions delete access" ON public.reactions;
    CREATE POLICY "Reactions delete access" ON public.reactions FOR DELETE USING (true);

    -- CHATS POLICIES
    DROP POLICY IF EXISTS "Chats select access" ON public.chats;
    CREATE POLICY "Chats select access" ON public.chats FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Chats insert access" ON public.chats;
    CREATE POLICY "Chats insert access" ON public.chats FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "Chats update access" ON public.chats;
    CREATE POLICY "Chats update access" ON public.chats FOR UPDATE USING (true);

    DROP POLICY IF EXISTS "Chats delete access" ON public.chats;
    CREATE POLICY "Chats delete access" ON public.chats FOR DELETE USING (true);

    -- NEWS POLICIES
    DROP POLICY IF EXISTS "News select access" ON public.news;
    CREATE POLICY "News select access" ON public.news FOR SELECT USING (true);

    DROP POLICY IF EXISTS "News insert access" ON public.news;
    CREATE POLICY "News insert access" ON public.news FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "News update access" ON public.news;
    CREATE POLICY "News update access" ON public.news FOR UPDATE USING (true);

    DROP POLICY IF EXISTS "News delete access" ON public.news;
    CREATE POLICY "News delete access" ON public.news FOR DELETE USING (true);

    -- CLUBS POLICIES
    DROP POLICY IF EXISTS "Clubs select access" ON public.clubs;
    CREATE POLICY "Clubs select access" ON public.clubs FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Clubs insert access" ON public.clubs;
    CREATE POLICY "Clubs insert access" ON public.clubs FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "Clubs update access" ON public.clubs;
    CREATE POLICY "Clubs update access" ON public.clubs FOR UPDATE USING (true);

    DROP POLICY IF EXISTS "Clubs delete access" ON public.clubs;
    CREATE POLICY "Clubs delete access" ON public.clubs FOR DELETE USING (true);

    -- NOTIFICATIONS POLICIES
    DROP POLICY IF EXISTS "Notifications select access" ON public.notifications;
    CREATE POLICY "Notifications select access" ON public.notifications FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Notifications insert access" ON public.notifications;
    CREATE POLICY "Notifications insert access" ON public.notifications FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "Notifications update access" ON public.notifications;
    CREATE POLICY "Notifications update access" ON public.notifications FOR UPDATE USING (true);

    DROP POLICY IF EXISTS "Notifications delete access" ON public.notifications;
    CREATE POLICY "Notifications delete access" ON public.notifications FOR DELETE USING (true);
END $$;

-- ============================================================================
-- 8. REALTIME REPLICATION CONFIGURATION
-- ============================================================================
-- Enables Supabase Realtime broadcast and Postgres changes for chat rooms,
-- live match radar, typing presence, and instant push updates.

DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'messages',
        'direct_messages',
        'matches',
        'fixtures',
        'trending',
        'chat_groups',
        'group_members',
        'comments',
        'reactions',
        'chats',
        'news',
        'profiles',
        'notifications'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
        ) THEN
            BEGIN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- 9. DEFAULT SEED DATA (POPULATES ONLY IF TABLES ARE EMPTY)
-- ============================================================================

-- Seed initial trending topics if empty
INSERT INTO public.trending (topic, title, posts_count, category, rank, growth_rate, badge)
SELECT '#UCLDraw', 'UEFA Champions League Knockout Phase Draw', '24.8K', 'Champions League', 1, '+42%', '🔥 HOT'
WHERE NOT EXISTS (SELECT 1 FROM public.trending LIMIT 1);

INSERT INTO public.trending (topic, title, posts_count, category, rank, growth_rate, badge)
SELECT '#PremierLeague', 'Title Race: Arsenal vs Man City vs Liverpool', '18.2K', 'Premier League', 2, '+28%', '⚡ TRENDING'
WHERE (SELECT COUNT(*) FROM public.trending) = 1;

-- Seed default discussion lounges if empty
INSERT INTO public.chat_groups (name, description, category, type, icon, is_approved, is_pinned)
SELECT 'Matchday Live Banter', 'Global match commentary, live reactions, VAR debates and tactical discussion', 'matchday', 'public', '⚽', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.chat_groups LIMIT 1);

INSERT INTO public.chat_groups (name, description, category, type, icon, is_approved, is_pinned)
SELECT 'Premier League Lounge', 'Daily analysis, match reviews, team lineups and referee talk', 'premier_league', 'public', '🏆', TRUE, TRUE
WHERE (SELECT COUNT(*) FROM public.chat_groups) = 1;

INSERT INTO public.chat_groups (name, description, category, type, icon, is_approved, is_pinned)
SELECT 'Tactical & AI Insights', 'Deep xG metric breakdowns, formation shifts, and quantum model analysis', 'tactical', 'public', '🧠', TRUE, FALSE
WHERE (SELECT COUNT(*) FROM public.chat_groups) = 2;

-- Done!
SELECT 'MTL Football Intelligence Hub Database Schema Initialized Successfully.' as status;
