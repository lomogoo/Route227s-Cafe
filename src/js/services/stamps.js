/**
 * Stamps Service
 * ===============
 * スタンプ関連のデータ取得・操作
 */

import { supabase, getSetting, getSettings } from './supabase.js';

// 現在のスタンプ残高を取得
export async function getStampBalance(userId) {
  const { data, error } = await supabase
    .rpc('get_stamp_balance', { p_user_id: userId });

  if (error) {
    console.error('Error getting stamp balance:', error);
    return 0;
  }
  return data || 0;
}

// 生涯累計スタンプを取得
export async function getLifetimeStamps(userId) {
  const { data, error } = await supabase
    .rpc('get_lifetime_stamps', { p_user_id: userId });

  if (error) {
    console.error('Error getting lifetime stamps:', error);
    return 0;
  }
  return data || 0;
}

// ユーザーのパーセンタイルを取得
export async function getUserPercentile(userId) {
  const { data, error } = await supabase
    .rpc('get_user_percentile', { p_user_id: userId });

  if (error) {
    console.error('Error getting percentile:', error);
    return 100;
  }
  return data || 100;
}

// スタンプ履歴を取得
export async function getStampHistory(userId, limit = 50) {
  const { data, error } = await supabase
    .from('stamps_ledger')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error getting stamp history:', error);
    return [];
  }
  return data || [];
}

// 交換履歴を取得
export async function getRedemptionHistory(userId, limit = 50) {
  const { data, error } = await supabase
    .from('rewards_redemptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error getting redemption history:', error);
    return [];
  }
  return data || [];
}

// 野菜救済量を計算
export async function calculateVeggieSaved(lifetimeStamps) {
  const gramsPerCurry = await getSetting('grams_saved_per_curry');
  const grams = lifetimeStamps * (parseInt(gramsPerCurry) || 150);
  return grams;
}

// 野菜換算（トマト何個分など）
export async function getVeggieEquivalent(grams) {
  const equivalents = await getSetting('veggie_equivalents');
  const parsed = typeof equivalents === 'string' ? JSON.parse(equivalents) : equivalents;

  // デフォルト値
  const veggieWeights = parsed || {
    tomato: 150,
    carrot: 100,
    onion: 120,
    potato: 200
  };

  // トマト換算（最もわかりやすい）
  const tomatoCount = Math.floor(grams / veggieWeights.tomato);
  return {
    tomato: tomatoCount,
    carrot: Math.floor(grams / veggieWeights.carrot),
    onion: Math.floor(grams / veggieWeights.onion),
    potato: Math.floor(grams / veggieWeights.potato)
  };
}

// リワード交換に必要なスタンプ数を取得
export async function getRewardRequirements() {
  const settings = await getSettings(['stamps_for_drink', 'stamps_for_curry']);
  return {
    drink: parseInt(settings.stamps_for_drink) || 3,
    curry: parseInt(settings.stamps_for_curry) || 6
  };
}

// リワード交換（Edge Function経由）
export async function redeemReward(userId, type) {
  const { data, error } = await supabase.functions.invoke('redeem-reward', {
    body: { user_id: userId, type }
  });

  if (error) throw error;
  return data;
}

// ユーザーのスタンプ概要を取得
export async function getUserStampSummary(userId) {
  const [balance, lifetime, percentile, requirements] = await Promise.all([
    getStampBalance(userId),
    getLifetimeStamps(userId),
    getUserPercentile(userId),
    getRewardRequirements()
  ]);

  const veggieSaved = await calculateVeggieSaved(lifetime);
  const veggieEquiv = await getVeggieEquivalent(veggieSaved);

  const stampsToNextDrink = requirements.drink - (balance % requirements.drink);
  const stampsToNextCurry = requirements.curry - (balance % requirements.curry);

  return {
    balance,
    lifetime,
    percentile,
    veggieSaved,
    veggieEquiv,
    stampsToNextDrink: stampsToNextDrink === requirements.drink ? 0 : stampsToNextDrink,
    stampsToNextCurry: stampsToNextCurry === requirements.curry ? 0 : stampsToNextCurry,
    canRedeemDrink: balance >= requirements.drink,
    canRedeemCurry: balance >= requirements.curry,
    requirements
  };
}

export default {
  getStampBalance,
  getLifetimeStamps,
  getUserPercentile,
  getStampHistory,
  getRedemptionHistory,
  calculateVeggieSaved,
  getVeggieEquivalent,
  getRewardRequirements,
  redeemReward,
  getUserStampSummary
};
