/**
 * Posts Service
 * ===============
 * 掲示板投稿・検証ミッション関連
 */

import { supabase, getSetting, getSettings } from './supabase.js';

// 投稿一覧を取得（位置情報でフィルタ可能）
export async function getPosts(options = {}) {
  const {
    status,
    lat,
    lng,
    radiusKm = 10,
    limit = 50,
    excludeExpired = true
  } = options;

  let query = supabase
    .from('posts')
    .select('*, profiles(display_name, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) {
    if (Array.isArray(status)) {
      query = query.in('status', status);
    } else {
      query = query.eq('status', status);
    }
  } else if (excludeExpired) {
    query = query.not('status', 'in', '("removed","expired")');
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error getting posts:', error);
    return [];
  }

  // 位置フィルタ（クライアント側で実行）
  if (lat && lng) {
    return (data || []).filter(post => {
      const distance = calculateDistance(lat, lng, post.lat, post.lng);
      return distance <= radiusKm;
    });
  }

  return data || [];
}

// 投稿を作成
export async function createPost(userId, postData) {
  const { body, category, lat, lng, imageUrl } = postData;

  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: userId,
      body,
      category,
      lat,
      lng,
      image_url: imageUrl
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 投稿を更新
export async function updatePost(postId, userId, updates) {
  const { data, error } = await supabase
    .from('posts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', postId)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 投稿を削除
export async function deletePost(postId, userId) {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', userId);

  if (error) throw error;
}

// 投稿を報告
export async function reportPost(postId, reporterId, reason) {
  const { data, error } = await supabase
    .from('post_reports')
    .insert({
      post_id: postId,
      reporter_id: reporterId,
      reason
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { alreadyReported: true };
    }
    throw error;
  }

  // 報告数チェック＆自動削除（Edge Functionで行うのが理想だが簡易版）
  await supabase.rpc('recalc_post_status', { p_post_id: postId });

  return data;
}

// ユーザーの投稿一覧を取得
export async function getUserPosts(userId) {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting user posts:', error);
    return [];
  }
  return data || [];
}

// ============================================
// デイリーミッション関連
// ============================================

// 今日のミッションを取得または作成
export async function getOrCreateDailyMission(userId, lat, lng) {
  const { data, error } = await supabase.functions.invoke('get-daily-mission', {
    body: { user_id: userId, lat, lng }
  });

  if (error) throw error;
  return data;
}

// ミッションアイテムに回答
export async function submitReview(missionItemId, verdict) {
  const { data, error } = await supabase.functions.invoke('submit-review', {
    body: { mission_item_id: missionItemId, verdict }
  });

  if (error) throw error;
  return data;
}

// ミッション完了チェック＆報酬付与
export async function completeMissionIfReady(userId) {
  const { data, error } = await supabase.functions.invoke('complete-mission', {
    body: { user_id: userId }
  });

  if (error) throw error;
  return data;
}

// 今日のミッション状態を取得
export async function getTodayMissionStatus(userId) {
  const today = new Date().toISOString().split('T')[0];

  const { data: mission, error: missionError } = await supabase
    .from('daily_missions')
    .select('*, mission_items(*)')
    .eq('user_id', userId)
    .eq('mission_date', today)
    .single();

  if (missionError) {
    if (missionError.code === 'PGRST116') {
      return { hasStarted: false };
    }
    console.error('Error getting mission status:', missionError);
    return null;
  }

  const items = mission.mission_items || [];
  const completed = items.filter(item => item.answered_at).length;
  const total = items.length;

  return {
    hasStarted: true,
    completed,
    total,
    isComplete: completed >= 5,
    rewarded: mission.rewarded,
    items
  };
}

// コイン残高を取得
export async function getCoinBalance(userId) {
  const { data, error } = await supabase
    .rpc('get_coin_balance', { p_user_id: userId });

  if (error) {
    console.error('Error getting coin balance:', error);
    return 0;
  }
  return data || 0;
}

// Reputation情報を取得
export async function getReputation(userId) {
  const { data, error } = await supabase
    .from('reputation')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return { score: 10, level: 'beginner', total_reviews: 0, accurate_reviews: 0 };
    }
    console.error('Error getting reputation:', error);
    return null;
  }
  return data;
}

// ============================================
// ユーティリティ
// ============================================

// 2点間の距離を計算（km）
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // 地球の半径（km）
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

// 検証基準テキスト
export const REVIEW_CRITERIA = [
  'A. 位置情報が妥当である',
  'B. 内容が具体的である',
  'C. 危険・差別・誹謗中傷・個人情報がない',
  'D. 虚偽・釣り・宣伝スパムでない',
  'E. 期限切れでない'
];

export default {
  getPosts,
  createPost,
  updatePost,
  deletePost,
  reportPost,
  getUserPosts,
  getOrCreateDailyMission,
  submitReview,
  completeMissionIfReady,
  getTodayMissionStatus,
  getCoinBalance,
  getReputation,
  REVIEW_CRITERIA
};
