# 仙台ニュース自動取得機能 セットアップガイド

## 📰 概要

このアプリは、以下のニュースソースから仙台・宮城・東北に関連するニュースを自動的に取得します：

- 🔴 NHK仙台放送局のRSSフィード
- 📰 河北新報のRSSフィード
- 🏛️ 宮城県公式の新着情報（準備中）
- 🌆 仙台市の公式お知らせ（準備中）
- 🔍 Googleニュース RSS

**更新頻度**: 1日3回（6:00, 12:00, 18:00 JST）
**記事数**: 各ソースから最新5件（合計約15-25件/日）
**保存期間**: 30日間（古い記事は自動削除）

## 🚀 セットアップ手順

### 1. データベースマイグレーションの実行

Supabase CLIを使用してマイグレーションを実行：

```bash
# ローカル開発環境の場合
npx supabase db reset

# 本番環境の場合
npx supabase db push
```

または、Supabase Dashboardから各マイグレーションファイルを実行：
1. `003_add_news_scraping_fields.sql`
2. `004_setup_news_cron.sql`

### 2. Edge Functionのデプロイ

```bash
# fetch-sendai-news関数をデプロイ
npx supabase functions deploy fetch-sendai-news
```

### 3. Cronジョブの設定

#### オプション A: Supabase pg_cron（推奨）

マイグレーション`004_setup_news_cron.sql`が自動的にCronジョブを設定します。

**設定内容確認**:
```sql
SELECT * FROM cron_jobs_status;
```

**注意**: Supabase Proプラン以上が必要な場合があります。

#### オプション B: Supabase Dashboard（手動設定）

1. Supabase Dashboard → Database → Cron Jobs
2. 以下の3つのジョブを作成：

**朝のニュース取得（6:00 JST）**
```
Schedule: 0 21 * * * (UTC)
Command: SELECT net.http_post(...) -- マイグレーションファイル参照
```

**昼のニュース取得（12:00 JST）**
```
Schedule: 0 3 * * * (UTC)
Command: SELECT net.http_post(...) -- マイグレーションファイル参照
```

**夕方のニュース取得（18:00 JST）**
```
Schedule: 0 9 * * * (UTC)
Command: SELECT net.http_post(...) -- マイグレーションファイル参照
```

#### オプション C: 外部Cronサービス（GitHub Actions等）

Supabaseでpg_cronが使用できない場合、GitHub Actionsを使用：

`.github/workflows/fetch-news.yml`:
```yaml
name: Fetch Sendai News
on:
  schedule:
    - cron: '0 21 * * *'  # 6:00 JST
    - cron: '0 3 * * *'   # 12:00 JST
    - cron: '0 9 * * *'   # 18:00 JST

jobs:
  fetch:
    runs-on: ubuntu-latest
    steps:
      - name: Call Edge Function
        run: |
          curl -X POST "${{ secrets.SUPABASE_URL }}/functions/v1/fetch-sendai-news" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json"
```

### 4. 環境変数の設定

Supabase Dashboardで以下の設定を確認：

- `SUPABASE_URL`: プロジェクトURL
- `SUPABASE_SERVICE_ROLE_KEY`: サービスロールキー（シークレット）

## 🧪 テスト実行

手動でニュース取得をテストする：

```bash
# ローカル
npx supabase functions serve fetch-sendai-news

# 別のターミナルから
curl -X POST "http://localhost:54321/functions/v1/fetch-sendai-news" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

```bash
# 本番環境
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/fetch-sendai-news" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

## 📊 動作確認

### 取得されたニュース記事の確認

```sql
-- 自動取得された記事を表示
SELECT
  title,
  source_type,
  author,
  published_date,
  created_at
FROM articles
WHERE is_auto_scraped = true
ORDER BY published_date DESC
LIMIT 20;
```

### ソース別の記事数

```sql
SELECT
  source_type,
  COUNT(*) as article_count,
  MAX(published_date) as latest_article
FROM articles
WHERE is_auto_scraped = true
GROUP BY source_type;
```

### Cronジョブの実行履歴

```sql
-- pg_cronの場合
SELECT * FROM cron.job_run_details
WHERE jobid IN (
  SELECT jobid FROM cron.job
  WHERE jobname LIKE 'fetch-sendai-news%'
)
ORDER BY start_time DESC
LIMIT 10;
```

## 🔧 トラブルシューティング

### ニュースが取得されない場合

1. **Edge Functionのログを確認**:
   ```bash
   npx supabase functions logs fetch-sendai-news
   ```

2. **Cronジョブが実行されているか確認**:
   ```sql
   SELECT * FROM cron_jobs_status;
   ```

3. **手動実行でテスト**（上記のcurlコマンドを使用）

### RSS URLが変更された場合

`supabase/functions/fetch-sendai-news/index.ts`の`NEWS_SOURCES`配列を更新：

```typescript
const NEWS_SOURCES: NewsSource[] = [
  {
    name: 'NHK仙台放送局',
    type: 'rss_nhk_sendai',
    url: '新しいURL',  // ← ここを更新
    category: 'ニュース',
  },
  // ...
];
```

更新後、再デプロイ：
```bash
npx supabase functions deploy fetch-sendai-news
```

## 📝 ニュースソースの追加方法

1. `003_add_news_scraping_fields.sql`の`article_source` ENUMに新しいタイプを追加
2. `fetch-sendai-news/index.ts`の`NEWS_SOURCES`配列に新しいソースを追加
3. マイグレーションとEdge Functionを再デプロイ

例：
```typescript
{
  name: '東北大学ニュース',
  type: 'rss_tohoku_univ',  // ENUMに追加必要
  url: 'https://example.com/rss',
  category: '教育',
}
```

## 🎨 UIカスタマイズ

取得したニュース記事は、アプリの「Feature」タブに自動的に表示されます。

### フィルタリング

手動記事とニュース記事を区別：

```javascript
// 自動取得されたニュースのみ表示
const newsArticles = await supabase
  .from('articles')
  .select('*')
  .eq('is_auto_scraped', true)
  .eq('is_published', true)
  .order('published_date', { ascending: false });

// 手動作成の記事のみ表示
const manualArticles = await supabase
  .from('articles')
  .select('*')
  .eq('is_auto_scraped', false)
  .eq('is_published', true);
```

## 💡 今後の拡張案

- [ ] ユーザーがニュースカテゴリーをカスタマイズ
- [ ] AIによる記事要約生成
- [ ] プッシュ通知機能
- [ ] ニュースのブックマークとシェア機能
- [ ] 記事の全文スクレイピング（合法性確認が必要）

## 📚 参考リンク

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase pg_cron](https://supabase.com/docs/guides/database/extensions/pg_cron)
- [RSS 2.0 Specification](https://www.rssboard.org/rss-specification)
