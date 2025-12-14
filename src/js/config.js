/**
 * Route 227s' Cafe Configuration
 * ================================
 * Supabase接続情報を設定してください
 *
 * 1. Supabaseプロジェクトを作成
 * 2. Project Settings > API から URL と anon key を取得
 * 3. 以下の値を置き換え
 */

export const CONFIG = {
  // Supabase Project URL (例: https://xxxxx.supabase.co)
  SUPABASE_URL: 'YOUR_SUPABASE_URL',

  // Supabase Anon Key (公開キー - クライアント側で使用可能)
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',

  // Edge Functions URL (通常は SUPABASE_URL + /functions/v1)
  get FUNCTIONS_URL() {
    return `${this.SUPABASE_URL}/functions/v1`;
  }
};

// 設定チェック
export function isConfigured() {
  return CONFIG.SUPABASE_URL !== 'YOUR_SUPABASE_URL' &&
         CONFIG.SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';
}
