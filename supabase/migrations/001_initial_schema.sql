-- ============================================
-- Route 227s' Cafe - Database Schema
-- ============================================
-- 全テーブル、インデックス、RLS、関数、トリガー

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUM Types
-- ============================================
CREATE TYPE user_role AS ENUM ('user', 'staff', 'admin');
CREATE TYPE post_status AS ENUM ('pending', 'verified', 'disputed', 'removed', 'expired');
CREATE TYPE review_verdict AS ENUM ('approve', 'reject', 'skip');
CREATE TYPE reward_type AS ENUM ('drink', 'curry');
CREATE TYPE stamp_reason AS ENUM ('purchase_curry', 'bonus', 'manual', 'adjustment');
CREATE TYPE coin_reason AS ENUM ('mission_complete', 'bonus', 'manual', 'adjustment');
CREATE TYPE curator_level AS ENUM ('beginner', 'regular', 'trusted', 'expert');

-- ============================================
-- Profiles Table
-- ============================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, display_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', 'ユーザー')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- Impact Settings Table
-- ============================================
CREATE TABLE impact_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default settings
INSERT INTO impact_settings (key, value, description) VALUES
    ('grams_saved_per_curry', '150', '1杯あたりの野菜救済量(g)'),
    ('veggie_equivalents', '{"tomato": 150, "carrot": 100, "onion": 120, "potato": 200}', '野菜1個あたりのg換算'),
    ('stamps_for_drink', '3', 'ドリンク交換に必要なスタンプ数'),
    ('stamps_for_curry', '6', 'カレー交換に必要なスタンプ数'),
    ('mission_reward_points', '10', 'デイリーミッション達成報酬'),
    ('mission_items_per_day', '5', '1日あたりのミッション件数'),
    ('post_expiry_days', '7', '投稿の有効期限(日)'),
    ('reports_for_removal', '3', '削除に必要な報告数'),
    ('verification_threshold', '10', '検証完了に必要な重み合計');

-- ============================================
-- Stamps Ledger Table
-- ============================================
CREATE TABLE stamps_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    delta INTEGER NOT NULL,
    reason stamp_reason NOT NULL,
    staff_id UUID REFERENCES profiles(id),
    meta JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stamps_ledger_user ON stamps_ledger(user_id);
CREATE INDEX idx_stamps_ledger_created ON stamps_ledger(created_at DESC);

-- ============================================
-- Rewards Redemptions Table
-- ============================================
CREATE TABLE rewards_redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type reward_type NOT NULL,
    stamps_used INTEGER NOT NULL,
    staff_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rewards_user ON rewards_redemptions(user_id);

-- ============================================
-- Schedule Assets Table (出店スケジュール画像)
-- ============================================
CREATE TABLE schedule_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year_month TEXT NOT NULL, -- 'YYYY-MM' format
    image_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(year_month)
);

-- ============================================
-- Events Table (本日のイベント)
-- ============================================
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_date DATE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_date ON events(event_date);

-- ============================================
-- Survey Tables (アンケート)
-- ============================================
CREATE TABLE survey_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    satisfaction INTEGER CHECK (satisfaction BETWEEN 1 AND 5),
    taste INTEGER CHECK (taste BETWEEN 1 AND 5),
    portion INTEGER CHECK (portion BETWEEN 1 AND 5),
    service INTEGER CHECK (service BETWEEN 1 AND 5),
    wait_time INTEGER CHECK (wait_time BETWEEN 1 AND 5),
    would_return TEXT CHECK (would_return IN ('yes', 'no', 'maybe')),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_survey_created ON survey_responses(created_at DESC);

-- ============================================
-- Catering Requests Table (出店依頼)
-- ============================================
CREATE TABLE catering_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    preferred_date TEXT,
    location TEXT,
    expected_visitors INTEGER,
    has_power BOOLEAN,
    has_water BOOLEAN,
    budget TEXT,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Articles Table (特集記事)
-- ============================================
CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT,
    title TEXT NOT NULL,
    summary TEXT,
    image_url TEXT,
    tags TEXT[],
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_articles_published ON articles(is_published, created_at DESC);

-- ============================================
-- Article Pages Table (記事ページ)
-- ============================================
CREATE TABLE article_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    page_index INTEGER NOT NULL,
    body TEXT NOT NULL,
    image_url TEXT,
    UNIQUE(article_id, page_index)
);

CREATE INDEX idx_article_pages ON article_pages(article_id, page_index);

-- ============================================
-- Bookmarks Table
-- ============================================
CREATE TABLE bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, article_id)
);

CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);

-- ============================================
-- Posts Table (掲示板投稿)
-- ============================================
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    category TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    image_url TEXT,
    status post_status DEFAULT 'pending',
    approve_weight NUMERIC DEFAULT 0,
    reject_weight NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_location ON posts(lat, lng);
CREATE INDEX idx_posts_expires ON posts(expires_at);
CREATE INDEX idx_posts_user ON posts(user_id);

-- Set default expiry on insert
CREATE OR REPLACE FUNCTION set_post_expiry()
RETURNS TRIGGER AS $$
DECLARE
    expiry_days INTEGER;
BEGIN
    SELECT (value::INTEGER) INTO expiry_days
    FROM impact_settings WHERE key = 'post_expiry_days';

    NEW.expires_at := NOW() + (COALESCE(expiry_days, 7) || ' days')::INTERVAL;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_post_insert
    BEFORE INSERT ON posts
    FOR EACH ROW EXECUTE FUNCTION set_post_expiry();

-- ============================================
-- Post Reviews Table (検証投票)
-- ============================================
CREATE TABLE post_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    verdict review_verdict NOT NULL,
    weight NUMERIC DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, reviewer_id)
);

CREATE INDEX idx_post_reviews_post ON post_reviews(post_id);
CREATE INDEX idx_post_reviews_reviewer ON post_reviews(reviewer_id);

-- ============================================
-- Post Reports Table (不適切報告)
-- ============================================
CREATE TABLE post_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, reporter_id)
);

CREATE INDEX idx_post_reports_post ON post_reports(post_id);

-- ============================================
-- Reputation Table
-- ============================================
CREATE TABLE reputation (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    score NUMERIC DEFAULT 10.0,
    level curator_level DEFAULT 'beginner',
    total_reviews INTEGER DEFAULT 0,
    accurate_reviews INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create reputation on profile creation
CREATE OR REPLACE FUNCTION handle_new_profile_reputation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO reputation (user_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created
    AFTER INSERT ON profiles
    FOR EACH ROW EXECUTE FUNCTION handle_new_profile_reputation();

-- ============================================
-- Coins Ledger Table (掲示板ポイント)
-- ============================================
CREATE TABLE coins_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    delta INTEGER NOT NULL,
    reason coin_reason NOT NULL,
    meta JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coins_ledger_user ON coins_ledger(user_id);

-- ============================================
-- Daily Missions Table
-- ============================================
CREATE TABLE daily_missions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    mission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completed BOOLEAN DEFAULT FALSE,
    rewarded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, mission_date)
);

CREATE INDEX idx_daily_missions_user_date ON daily_missions(user_id, mission_date);

-- ============================================
-- Mission Items Table
-- ============================================
CREATE TABLE mission_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mission_id UUID NOT NULL REFERENCES daily_missions(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    served_at TIMESTAMPTZ DEFAULT NOW(),
    answered_at TIMESTAMPTZ,
    verdict review_verdict
);

CREATE INDEX idx_mission_items_mission ON mission_items(mission_id);

-- ============================================
-- Notification Settings Table
-- ============================================
CREATE TABLE notification_settings (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    event_notifications BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Get current stamp balance
CREATE OR REPLACE FUNCTION get_stamp_balance(p_user_id UUID)
RETURNS INTEGER AS $$
    SELECT COALESCE(SUM(delta), 0)::INTEGER
    FROM stamps_ledger
    WHERE user_id = p_user_id;
$$ LANGUAGE SQL STABLE;

-- Get lifetime stamps (positive only)
CREATE OR REPLACE FUNCTION get_lifetime_stamps(p_user_id UUID)
RETURNS INTEGER AS $$
    SELECT COALESCE(SUM(delta), 0)::INTEGER
    FROM stamps_ledger
    WHERE user_id = p_user_id AND delta > 0;
$$ LANGUAGE SQL STABLE;

-- Get user percentile rank
CREATE OR REPLACE FUNCTION get_user_percentile(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    user_total INTEGER;
    percentile NUMERIC;
BEGIN
    SELECT get_lifetime_stamps(p_user_id) INTO user_total;

    SELECT (1.0 - (COUNT(*) FILTER (WHERE total > user_total)::NUMERIC / GREATEST(COUNT(*), 1))) * 100
    INTO percentile
    FROM (
        SELECT user_id, COALESCE(SUM(delta) FILTER (WHERE delta > 0), 0) as total
        FROM stamps_ledger
        GROUP BY user_id
    ) totals;

    RETURN COALESCE(ROUND(percentile, 1), 100);
END;
$$ LANGUAGE plpgsql STABLE;

-- Get coin balance
CREATE OR REPLACE FUNCTION get_coin_balance(p_user_id UUID)
RETURNS INTEGER AS $$
    SELECT COALESCE(SUM(delta), 0)::INTEGER
    FROM coins_ledger
    WHERE user_id = p_user_id;
$$ LANGUAGE SQL STABLE;

-- Calculate review weight based on reputation
CREATE OR REPLACE FUNCTION get_review_weight(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    rep RECORD;
    weight NUMERIC;
BEGIN
    SELECT * INTO rep FROM reputation WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN 1.0;
    END IF;

    -- Base weight from level
    weight := CASE rep.level
        WHEN 'beginner' THEN 1.0
        WHEN 'regular' THEN 1.5
        WHEN 'trusted' THEN 2.0
        WHEN 'expert' THEN 3.0
        ELSE 1.0
    END;

    -- Adjust by accuracy (if enough data)
    IF rep.total_reviews >= 10 THEN
        weight := weight * (0.5 + 0.5 * (rep.accurate_reviews::NUMERIC / rep.total_reviews));
    END IF;

    RETURN ROUND(weight, 2);
END;
$$ LANGUAGE plpgsql STABLE;

-- Recalculate post status based on reviews
CREATE OR REPLACE FUNCTION recalc_post_status(p_post_id UUID)
RETURNS post_status AS $$
DECLARE
    threshold INTEGER;
    total_approve NUMERIC;
    total_reject NUMERIC;
    report_count INTEGER;
    removal_threshold INTEGER;
    new_status post_status;
BEGIN
    -- Get thresholds
    SELECT (value::INTEGER) INTO threshold
    FROM impact_settings WHERE key = 'verification_threshold';

    SELECT (value::INTEGER) INTO removal_threshold
    FROM impact_settings WHERE key = 'reports_for_removal';

    threshold := COALESCE(threshold, 10);
    removal_threshold := COALESCE(removal_threshold, 3);

    -- Check reports first
    SELECT COUNT(*) INTO report_count FROM post_reports WHERE post_id = p_post_id;
    IF report_count >= removal_threshold THEN
        new_status := 'removed';
    ELSE
        -- Calculate weighted votes
        SELECT
            COALESCE(SUM(weight) FILTER (WHERE verdict = 'approve'), 0),
            COALESCE(SUM(weight) FILTER (WHERE verdict = 'reject'), 0)
        INTO total_approve, total_reject
        FROM post_reviews
        WHERE post_id = p_post_id;

        -- Determine status
        IF total_approve >= threshold AND total_approve > total_reject * 2 THEN
            new_status := 'verified';
        ELSIF total_reject >= threshold AND total_reject > total_approve * 2 THEN
            new_status := 'disputed';
        ELSE
            new_status := 'pending';
        END IF;
    END IF;

    -- Update post
    UPDATE posts
    SET status = new_status,
        approve_weight = total_approve,
        reject_weight = total_reject,
        updated_at = NOW()
    WHERE id = p_post_id;

    RETURN new_status;
END;
$$ LANGUAGE plpgsql;

-- Expire old posts
CREATE OR REPLACE FUNCTION expire_old_posts()
RETURNS INTEGER AS $$
DECLARE
    affected INTEGER;
BEGIN
    UPDATE posts
    SET status = 'expired', updated_at = NOW()
    WHERE expires_at < NOW() AND status NOT IN ('removed', 'expired');

    GET DIAGNOSTICS affected = ROW_COUNT;
    RETURN affected;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stamps_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE catering_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE coins_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE impact_settings ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is staff
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role IN ('staff', 'admin')
    );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================
-- POLICIES
-- ============================================

-- Profiles
CREATE POLICY "Users can view all profiles"
    ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE USING (auth.uid() = id);

-- Stamps Ledger (重要: ユーザーはINSERT不可)
CREATE POLICY "Users can view own stamps"
    ON stamps_ledger FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all stamps"
    ON stamps_ledger FOR SELECT USING (is_staff());

CREATE POLICY "Only staff can insert stamps"
    ON stamps_ledger FOR INSERT WITH CHECK (is_staff());

-- Rewards Redemptions
CREATE POLICY "Users can view own redemptions"
    ON rewards_redemptions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all redemptions"
    ON rewards_redemptions FOR SELECT USING (is_staff());

CREATE POLICY "Only staff can insert redemptions"
    ON rewards_redemptions FOR INSERT WITH CHECK (is_staff());

-- Schedule Assets
CREATE POLICY "Anyone can view schedules"
    ON schedule_assets FOR SELECT USING (true);

CREATE POLICY "Staff can manage schedules"
    ON schedule_assets FOR ALL USING (is_staff());

-- Events
CREATE POLICY "Anyone can view events"
    ON events FOR SELECT USING (true);

CREATE POLICY "Staff can manage events"
    ON events FOR ALL USING (is_staff());

-- Survey Responses
CREATE POLICY "Users can insert surveys"
    ON survey_responses FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can view surveys"
    ON survey_responses FOR SELECT USING (is_staff());

-- Catering Requests
CREATE POLICY "Anyone can submit catering requests"
    ON catering_requests FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can view catering requests"
    ON catering_requests FOR SELECT USING (is_staff());

-- Articles
CREATE POLICY "Anyone can view published articles"
    ON articles FOR SELECT USING (is_published = true OR is_staff());

CREATE POLICY "Staff can manage articles"
    ON articles FOR ALL USING (is_staff());

-- Article Pages
CREATE POLICY "Anyone can view article pages"
    ON article_pages FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM articles
            WHERE id = article_pages.article_id
            AND (is_published = true OR is_staff())
        )
    );

CREATE POLICY "Staff can manage article pages"
    ON article_pages FOR ALL USING (is_staff());

-- Bookmarks
CREATE POLICY "Users can manage own bookmarks"
    ON bookmarks FOR ALL USING (auth.uid() = user_id);

-- Posts
CREATE POLICY "Anyone can view non-removed posts"
    ON posts FOR SELECT USING (status != 'removed' OR auth.uid() = user_id);

CREATE POLICY "Authenticated users can create posts"
    ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending posts"
    ON posts FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Users can delete own posts"
    ON posts FOR DELETE USING (auth.uid() = user_id);

-- Post Reviews
CREATE POLICY "Users can view reviews"
    ON post_reviews FOR SELECT USING (auth.uid() = reviewer_id OR is_staff());

CREATE POLICY "Authenticated users can submit reviews"
    ON post_reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- Post Reports
CREATE POLICY "Authenticated users can report"
    ON post_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Staff can view reports"
    ON post_reports FOR SELECT USING (is_staff());

-- Reputation
CREATE POLICY "Users can view own reputation"
    ON reputation FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all reputation"
    ON reputation FOR SELECT USING (is_staff());

-- Coins Ledger
CREATE POLICY "Users can view own coins"
    ON coins_ledger FOR SELECT USING (auth.uid() = user_id);

-- Daily Missions
CREATE POLICY "Users can view own missions"
    ON daily_missions FOR SELECT USING (auth.uid() = user_id);

-- Mission Items
CREATE POLICY "Users can view own mission items"
    ON mission_items FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM daily_missions
            WHERE id = mission_items.mission_id AND user_id = auth.uid()
        )
    );

-- Notification Settings
CREATE POLICY "Users can manage own settings"
    ON notification_settings FOR ALL USING (auth.uid() = user_id);

-- Impact Settings
CREATE POLICY "Anyone can read settings"
    ON impact_settings FOR SELECT USING (true);

CREATE POLICY "Only staff can update settings"
    ON impact_settings FOR UPDATE USING (is_staff());

-- ============================================
-- Storage Buckets
-- ============================================
-- Note: Run these in Supabase dashboard or via API

-- INSERT INTO storage.buckets (id, name, public)
-- VALUES
--     ('avatars', 'avatars', true),
--     ('schedules', 'schedules', true),
--     ('posts', 'posts', true),
--     ('articles', 'articles', true);

-- ============================================
-- Scheduled Jobs (using pg_cron if available)
-- ============================================
-- SELECT cron.schedule('expire-posts', '0 * * * *', $$SELECT expire_old_posts()$$);
