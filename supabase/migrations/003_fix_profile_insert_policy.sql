-- ============================================
-- Fix: Add INSERT policies for auto-created tables
-- ============================================
-- 問題: 新規ユーザー登録時にINSERTが失敗する
-- 原因: profiles, reputationテーブルにINSERTポリシーが設定されていない
-- 解決: トリガー関数がINSERTできるようポリシーを追加

-- 1. profilesテーブル: auth.users作成時に自動作成される
CREATE POLICY "System can insert profiles during signup"
    ON profiles FOR INSERT
    WITH CHECK (true);

-- 2. reputationテーブル: profiles作成時に自動作成される
CREATE POLICY "System can insert reputation during signup"
    ON reputation FOR INSERT
    WITH CHECK (true);
