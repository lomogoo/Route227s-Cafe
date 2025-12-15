-- ============================================
-- Add News Scraping Fields to Articles Table
-- ============================================
-- ニュースソーストラッキングのためのフィールドを追加

-- ニュースソースタイプのENUM追加
CREATE TYPE article_source AS ENUM (
    'manual',              -- 手動作成
    'rss_nhk_sendai',      -- NHK仙台放送局
    'rss_kahoku',          -- 河北新報
    'rss_miyagi_pref',     -- 宮城県公式
    'rss_sendai_city',     -- 仙台市公式
    'google_news'          -- Googleニュース
);

-- articlesテーブルにフィールド追加
ALTER TABLE articles
    ADD COLUMN source_type article_source DEFAULT 'manual',
    ADD COLUMN source_url TEXT,                              -- 元記事URL
    ADD COLUMN published_date TIMESTAMPTZ,                   -- 元記事の公開日時
    ADD COLUMN is_auto_scraped BOOLEAN DEFAULT FALSE,        -- 自動取得フラグ
    ADD COLUMN author TEXT,                                  -- 記事の著者・ソース名
    ADD COLUMN external_id TEXT;                             -- 外部ソースのID（重複防止）

-- 重複記事防止のためのユニーク制約
CREATE UNIQUE INDEX idx_articles_external_id
    ON articles(source_type, external_id)
    WHERE external_id IS NOT NULL;

-- 自動取得記事のインデックス
CREATE INDEX idx_articles_auto_scraped
    ON articles(is_auto_scraped, published_date DESC);

-- ソースタイプごとのインデックス
CREATE INDEX idx_articles_source_type
    ON articles(source_type, created_at DESC);

-- コメント追加
COMMENT ON COLUMN articles.source_type IS 'ニュースソースのタイプ';
COMMENT ON COLUMN articles.source_url IS '元記事のURL';
COMMENT ON COLUMN articles.published_date IS '元記事の公開日時';
COMMENT ON COLUMN articles.is_auto_scraped IS '自動スクレイピングで取得された記事かどうか';
COMMENT ON COLUMN articles.author IS '記事の著者またはソース名';
COMMENT ON COLUMN articles.external_id IS '外部ソースでの記事ID（重複防止用）';
