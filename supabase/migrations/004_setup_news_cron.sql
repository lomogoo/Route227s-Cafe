-- ============================================
-- Setup Cron Job for News Fetching
-- ============================================
-- ニュース取得を1日3回実行するCronジョブを設定
-- 実行時刻: 6:00, 12:00, 18:00 (JST)

-- pg_cron拡張を有効化
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 既存のジョブを削除（あれば）
SELECT cron.unschedule('fetch-sendai-news-morning');
SELECT cron.unschedule('fetch-sendai-news-noon');
SELECT cron.unschedule('fetch-sendai-news-evening');

-- 朝6時（JST）にニュース取得
-- UTC時刻で設定（JST-9時間 = UTC 21:00前日）
SELECT cron.schedule(
    'fetch-sendai-news-morning',
    '0 21 * * *', -- 毎日21:00 UTC (翌日6:00 JST)
    $$
    SELECT
      net.http_post(
        url := concat(
          current_setting('app.settings.supabase_url'),
          '/functions/v1/fetch-sendai-news'
        ),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', concat('Bearer ', current_setting('app.settings.service_role_key'))
        ),
        body := '{}'::jsonb
      ) as request_id;
    $$
);

-- 昼12時（JST）にニュース取得
-- UTC時刻で設定（JST-9時間 = UTC 3:00）
SELECT cron.schedule(
    'fetch-sendai-news-noon',
    '0 3 * * *', -- 毎日3:00 UTC (12:00 JST)
    $$
    SELECT
      net.http_post(
        url := concat(
          current_setting('app.settings.supabase_url'),
          '/functions/v1/fetch-sendai-news'
        ),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', concat('Bearer ', current_setting('app.settings.service_role_key'))
        ),
        body := '{}'::jsonb
      ) as request_id;
    $$
);

-- 夕方18時（JST）にニュース取得
-- UTC時刻で設定（JST-9時間 = UTC 9:00）
SELECT cron.schedule(
    'fetch-sendai-news-evening',
    '0 9 * * *', -- 毎日9:00 UTC (18:00 JST)
    $$
    SELECT
      net.http_post(
        url := concat(
          current_setting('app.settings.supabase_url'),
          '/functions/v1/fetch-sendai-news'
        ),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', concat('Bearer ', current_setting('app.settings.service_role_key'))
        ),
        body := '{}'::jsonb
      ) as request_id;
    $$
);

-- Cronジョブの状態を確認するビューを作成
CREATE OR REPLACE VIEW cron_jobs_status AS
SELECT
    jobid,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active,
    jobname
FROM cron.job
WHERE jobname LIKE 'fetch-sendai-news%'
ORDER BY jobname;

-- コメント
COMMENT ON VIEW cron_jobs_status IS 'ニュース取得Cronジョブの状態を確認';
