/**
 * Events Service
 * ================
 * 出店スケジュール、イベント、アンケート、出店依頼
 */

import { supabase } from './supabase.js';

// ============================================
// スケジュール
// ============================================

// 月別スケジュール画像を取得
export async function getScheduleImage(yearMonth) {
  const { data, error } = await supabase
    .from('schedule_assets')
    .select('*')
    .eq('year_month', yearMonth)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error getting schedule:', error);
    return null;
  }
  return data;
}

// スケジュール画像のURLを取得
export function getScheduleImageUrl(imagePath) {
  if (!imagePath) return null;
  const { data } = supabase.storage.from('schedules').getPublicUrl(imagePath);
  return data?.publicUrl;
}

// ============================================
// イベント
// ============================================

// 今日のイベントを取得
export async function getTodayEvents() {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('event_date', today)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error getting today events:', error);
    return [];
  }
  return data || [];
}

// 特定日のイベントを取得
export async function getEventsByDate(date) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('event_date', date)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error getting events:', error);
    return [];
  }
  return data || [];
}

// 今月のイベント一覧
export async function getMonthlyEvents(year, month) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .order('event_date', { ascending: true });

  if (error) {
    console.error('Error getting monthly events:', error);
    return [];
  }
  return data || [];
}

// ============================================
// アンケート
// ============================================

// アンケート送信
export async function submitSurvey(surveyData) {
  const {
    userId,
    satisfaction,
    taste,
    portion,
    service,
    waitTime,
    wouldReturn,
    comment
  } = surveyData;

  const { data, error } = await supabase
    .from('survey_responses')
    .insert({
      user_id: userId || null,
      satisfaction,
      taste,
      portion,
      service,
      wait_time: waitTime,
      would_return: wouldReturn,
      comment
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 最近のアンケート送信チェック（同一ユーザーの連投防止）
export async function hasRecentSurvey(userId, minutesAgo = 30) {
  if (!userId) return false;

  const cutoff = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from('survey_responses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', cutoff);

  if (error) {
    console.error('Error checking recent survey:', error);
    return false;
  }
  return count > 0;
}

// ============================================
// 出店依頼
// ============================================

// 出店依頼を送信
export async function submitCateringRequest(requestData) {
  const {
    organization,
    contactName,
    email,
    phone,
    preferredDate,
    location,
    expectedVisitors,
    hasPower,
    hasWater,
    budget,
    details
  } = requestData;

  const { data, error } = await supabase
    .from('catering_requests')
    .insert({
      organization,
      contact_name: contactName,
      email,
      phone,
      preferred_date: preferredDate,
      location,
      expected_visitors: expectedVisitors,
      has_power: hasPower,
      has_water: hasWater,
      budget,
      details
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 最近の出店依頼チェック（同一メールの連投防止）
export async function hasRecentCateringRequest(email, hoursAgo = 24) {
  const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from('catering_requests')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .gte('created_at', cutoff);

  if (error) {
    console.error('Error checking recent catering request:', error);
    return false;
  }
  return count > 0;
}

// ============================================
// 通知設定
// ============================================

// 通知設定を取得
export async function getNotificationSettings(userId) {
  const { data, error } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // 設定がない場合はデフォルトを返す
      return { event_notifications: true };
    }
    console.error('Error getting notification settings:', error);
    return null;
  }
  return data;
}

// 通知設定を更新
export async function updateNotificationSettings(userId, settings) {
  const { data, error } = await supabase
    .from('notification_settings')
    .upsert({
      user_id: userId,
      ...settings,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export default {
  getScheduleImage,
  getScheduleImageUrl,
  getTodayEvents,
  getEventsByDate,
  getMonthlyEvents,
  submitSurvey,
  hasRecentSurvey,
  submitCateringRequest,
  hasRecentCateringRequest,
  getNotificationSettings,
  updateNotificationSettings
};
