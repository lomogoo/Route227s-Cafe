/**
 * Supabase Client Service
 * ========================
 * Supabase初期化と認証機能
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CONFIG, isConfigured } from '../config.js';

// 設定チェック
if (!isConfigured()) {
  console.warn('⚠️ Supabaseが設定されていません。src/js/config.js を編集してください。');
}

// Supabase Client
export const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// 現在のユーザーを取得
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting user:', error);
    return null;
  }
  return user;
}

// セッションを取得
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error getting session:', error);
    return null;
  }
  return session;
}

// メール+パスワードでサインアップ
export async function signUp(email, password, displayName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName }
    }
  });

  if (error) throw error;
  return data;
}

// メール+パスワードでログイン
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
}

// マジックリンクでログイン
export async function signInWithMagicLink(email) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin
    }
  });

  if (error) throw error;
  return data;
}

// ログアウト
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// 認証状態の変更を監視
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

// プロフィールを取得
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

// プロフィールを更新
export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ユーザーがスタッフかどうか確認
export async function isStaff(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error) return false;
  return data?.role === 'staff' || data?.role === 'admin';
}

// 設定を取得
export async function getSetting(key) {
  const { data, error } = await supabase
    .from('impact_settings')
    .select('value')
    .eq('key', key)
    .single();

  if (error) {
    console.error('Error getting setting:', error);
    return null;
  }
  return data?.value;
}

// 複数の設定を取得
export async function getSettings(keys) {
  const { data, error } = await supabase
    .from('impact_settings')
    .select('key, value')
    .in('key', keys);

  if (error) {
    console.error('Error getting settings:', error);
    return {};
  }

  return data.reduce((acc, item) => {
    acc[item.key] = item.value;
    return acc;
  }, {});
}

export default supabase;
