-- ============================================
-- Fix: Add INSERT policy for profiles table
-- ============================================
-- 問題: 新規ユーザー登録時にprofilesテーブルへのINSERTが失敗する
-- 原因: profilesテーブルにINSERTポリシーが設定されていない
-- 解決: トリガー関数がprofilesにINSERTできるようポリシーを追加

-- トリガー関数がプロフィールを作成できるようにする
-- SECURITY DEFINERで実行されるため、このポリシーが適用される
CREATE POLICY "System can insert profiles during signup"
    ON profiles FOR INSERT
    WITH CHECK (true);
