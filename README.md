# Route 227s' Cafe - キッチンカー PWA アプリ

スタンプカードを核にしつつ、情報メディア（縦型リールUX）と、ローカル情報掲示板（地図連動 + 検証ミッション）を統合したPWAアプリケーション。

## 📁 リポジトリ構成

```
Route227s-Cafe/
├── index.html                 # メインアプリ
├── admin.html                 # スタッフ管理画面
├── package.json               # プロジェクト設定
├── vite.config.js             # Vite + PWA設定
├── .env.example               # 環境変数テンプレート
│
├── public/
│   ├── manifest.json          # PWA マニフェスト
│   └── icons/                 # PWA アイコン（要作成）
│
├── src/
│   ├── css/
│   │   ├── tokens.css         # デザイントークン
│   │   ├── layout.css         # レイアウト・ナビゲーション
│   │   ├── components.css     # UIコンポーネント
│   │   ├── animations.css     # アニメーション
│   │   └── style.css          # メインCSS（全インポート）
│   │
│   └── js/
│       ├── main.js            # メインアプリ
│       ├── admin.js           # 管理画面
│       ├── services/          # APIサービス層
│       │   ├── supabase.js    # Supabase クライアント
│       │   ├── stamps.js      # スタンプ関連
│       │   ├── articles.js    # 特集記事関連
│       │   ├── posts.js       # 掲示板関連
│       │   └── events.js      # イベント関連
│       ├── components/        # UIコンポーネント
│       │   ├── toast.js       # トースト通知
│       │   └── modal.js       # モーダル
│       └── utils/
│           └── helpers.js     # ユーティリティ関数
│
└── supabase/
    ├── migrations/
    │   └── 001_initial_schema.sql  # DB スキーマ
    └── functions/                   # Edge Functions
        ├── award-stamp/
        ├── redeem-reward/
        ├── get-daily-mission/
        ├── submit-review/
        └── complete-mission/
```

## 🛠 技術スタック

- **フロントエンド**: HTML, CSS, Vanilla JavaScript
- **ビルドツール**: Vite + vite-plugin-pwa
- **バックエンド**: Supabase (Auth, Database, Storage, Edge Functions)
- **地図**: Leaflet + OpenStreetMap
- **QRコード**: qrcode ライブラリ

## 🎨 UIデザインシステム

### カラー

| 用途 | CSS変数 | 値 |
|------|---------|------|
| プライマリ | `--color-primary` | `#FF6B35` (蛍光オレンジ) |
| プライマリダーク | `--color-primary-dark` | `#E55A2B` |
| 成功 | `--color-success` | `#34C759` |
| 警告 | `--color-warning` | `#FF9500` |
| エラー | `--color-error` | `#FF3B30` |

### タイポグラフィ

| サイズ | CSS変数 | 値 |
|--------|---------|------|
| XS | `--text-xs` | 0.75rem (12px) |
| SM | `--text-sm` | 0.875rem (14px) |
| Base | `--text-base` | 1rem (16px) |
| LG | `--text-lg` | 1.125rem (18px) |
| XL | `--text-xl` | 1.25rem (20px) |
| 2XL | `--text-2xl` | 1.5rem (24px) |
| 3XL | `--text-3xl` | 1.875rem (30px) |

### スペーシング

| サイズ | CSS変数 | 値 |
|--------|---------|------|
| 1 | `--space-1` | 0.25rem (4px) |
| 2 | `--space-2` | 0.5rem (8px) |
| 3 | `--space-3` | 0.75rem (12px) |
| 4 | `--space-4` | 1rem (16px) |
| 5 | `--space-5` | 1.25rem (20px) |
| 6 | `--space-6` | 1.5rem (24px) |
| 8 | `--space-8` | 2rem (32px) |

### 角丸

| サイズ | CSS変数 | 値 |
|--------|---------|------|
| SM | `--radius-sm` | 0.5rem (8px) |
| MD | `--radius-md` | 0.75rem (12px) |
| LG | `--radius-lg` | 1rem (16px) |
| XL | `--radius-xl` | 1.5rem (24px) |
| 2XL | `--radius-2xl` | 2rem (32px) |
| Full | `--radius-full` | 9999px (ピル型) |

## 📱 画面遷移図

```
┌─────────────────────────────────────────────────────────────┐
│                       ボトムナビゲーション                      │
├──────────┬──────────┬──────────┬──────────┬──────────────────┤
│  ホーム   │   出店   │   特集   │  掲示板  │   マイページ     │
│  (Tab A) │  (Tab B) │  (Tab C) │  (Tab D) │    (Tab E)      │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴────────┬────────┘
     │          │          │          │              │
     ▼          ▼          ▼          ▼              ▼
┌─────────┐┌─────────┐┌─────────┐┌─────────┐┌──────────────┐
│ダッシュ ││スケジュ ││縦リール ││  マップ ││プロフィール  │
│ボード   ││ール画像 ││フィード ││  表示   ││ 設定        │
├─────────┤├─────────┤├─────────┤├─────────┤├──────────────┤
│リワード ││本日の   ││横ページ ││リスト   ││保存記事一覧  │
│ 交換    ││イベント ││（記事内）││ 表示   ││              │
├─────────┤├─────────┤├─────────┤├─────────┤├──────────────┤
│QR表示   ││アンケ  ││ブック   ││投稿作成 ││通知設定      │
│         ││ート    ││マーク   ││         ││              │
├─────────┤├─────────┤└─────────┘├─────────┤├──────────────┤
│履歴     ││出店依頼│           │ミッション││投稿履歴      │
│         ││フォーム│           │  検証   ││              │
└─────────┘└─────────┘           └─────────┘└──────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Admin (/admin.html)                    │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ QRスキャン   │スケジュール  │イベント管理  │ 記事管理       │
│ スタンプ付与 │ 画像管理     │              │                │
│ リワード交換 │              │              │                │
└──────────────┴──────────────┴──────────────┴────────────────┘
```

## 🚀 ローカル実行手順

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

```bash
cp .env.example .env
```

`.env` ファイルを編集し、Supabaseの認証情報を設定：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Supabaseのセットアップ

#### データベース
1. Supabase ダッシュボードで新しいプロジェクトを作成
2. SQL Editor で `supabase/migrations/001_initial_schema.sql` を実行
3. Storage でバケットを作成:
   - `avatars` (public)
   - `schedules` (public)
   - `posts` (public)
   - `articles` (public)

#### Edge Functions
```bash
# Supabase CLI をインストール
npm install -g supabase

# ログイン
supabase login

# 関数をデプロイ
supabase functions deploy award-stamp
supabase functions deploy redeem-reward
supabase functions deploy get-daily-mission
supabase functions deploy submit-review
supabase functions deploy complete-mission
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開く

### 5. ビルド

```bash
npm run build
```

`dist/` ディレクトリに静的ファイルが生成される

## 🔒 セキュリティ要件

### RLS (Row Level Security)

| テーブル | ユーザー権限 | スタッフ権限 |
|---------|------------|-------------|
| stamps_ledger | SELECT(自分のみ) | SELECT(全て), INSERT |
| rewards_redemptions | SELECT(自分のみ) | SELECT(全て), INSERT |
| posts | SELECT, INSERT(自分), UPDATE(自分のpending), DELETE(自分) | 同左 |
| post_reviews | SELECT(自分のみ), INSERT | SELECT(全て) |
| reputation | SELECT(自分のみ) | SELECT(全て) |
| coins_ledger | SELECT(自分のみ) | - |
| articles | SELECT(公開のみ) | ALL |
| events | SELECT | ALL |

### 重要なセキュリティポイント

1. **スタンプ付与は Edge Function 経由のみ**
   - クライアントから直接 stamps_ledger に INSERT 不可
   - スタッフ認証 + 二重付与防止チェック

2. **リワード交換も Edge Function 経由**
   - 残高チェック後に原子的に処理

3. **ミッション報酬の原子性**
   - 5件回答完了時のみ +10 コイン付与
   - 重複付与防止

## ✅ テスト観点

### 不正防止

- [ ] 一般ユーザーがスタンプを自己付与できない
- [ ] 一般ユーザーが残高以上のリワードを交換できない
- [ ] 同一ユーザーから同一投稿への重複レビューを防止
- [ ] ミッション報酬の重複付与を防止

### 権限

- [ ] スタッフのみがスタンプ付与可能
- [ ] スタッフのみがスケジュール/イベント/記事を編集可能
- [ ] 一般ユーザーは自分のデータのみ閲覧可能

### レースコンディション

- [ ] 同時リワード交換時の残高整合性
- [ ] 同時ミッション完了時の報酬整合性

### 談合対策

- [ ] 新規ユーザーのレビュー重みが低い
- [ ] 短時間大量レビューで重み低下

### 期限/自動削除

- [ ] 投稿の7日後自動期限切れ
- [ ] 3報告での自動削除

## 📝 追加実装項目（将来）

- [ ] Web Push 通知
- [ ] ダークモード
- [ ] 記事詳細の横スワイプページ
- [ ] 投稿画像アップロード
- [ ] プロフィール画像変更
- [ ] レビュー精度によるreputation調整
- [ ] Curator特典（ミッション提示数増加）
- [ ] 管理者向け分析ダッシュボード

## 📄 ライセンス

Private - Route 227s' Cafe
