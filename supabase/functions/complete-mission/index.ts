/**
 * Complete Mission Edge Function
 * ================================
 * ミッション完了チェック＆報酬付与
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // 認証チェック
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { user_id } = await req.json();
    const targetUserId = user_id || user.id;

    // 本人のみ
    if (targetUserId !== user.id) {
      throw new Error('Unauthorized');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const today = new Date().toISOString().split('T')[0];

    // 今日のミッションを取得
    const { data: mission, error: missionError } = await supabaseAdmin
      .from('daily_missions')
      .select('*, mission_items(*)')
      .eq('user_id', targetUserId)
      .eq('mission_date', today)
      .single();

    if (missionError || !mission) {
      throw new Error('Mission not found');
    }

    // 既に報酬付与済み
    if (mission.rewarded) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Already rewarded',
          rewarded: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 回答数チェック
    const answeredCount = mission.mission_items.filter(
      (item: any) => item.answered_at
    ).length;

    // 設定を取得
    const { data: itemsPerDaySetting } = await supabaseAdmin
      .from('impact_settings')
      .select('value')
      .eq('key', 'mission_items_per_day')
      .single();

    const requiredItems = parseInt(itemsPerDaySetting?.value || '5');

    if (answeredCount < requiredItems) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Mission not complete',
          answered: answeredCount,
          required: requiredItems
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 報酬ポイント設定
    const { data: rewardSetting } = await supabaseAdmin
      .from('impact_settings')
      .select('value')
      .eq('key', 'mission_reward_points')
      .single();

    const rewardPoints = parseInt(rewardSetting?.value || '10');

    // トランザクション的に処理
    // 1. ミッションを完了＆報酬済みにマーク
    const { error: updateError } = await supabaseAdmin
      .from('daily_missions')
      .update({
        completed: true,
        rewarded: true
      })
      .eq('id', mission.id);

    if (updateError) {
      throw updateError;
    }

    // 2. コインを付与
    const { error: coinError } = await supabaseAdmin
      .from('coins_ledger')
      .insert({
        user_id: targetUserId,
        delta: rewardPoints,
        reason: 'mission_complete',
        meta: { mission_id: mission.id, date: today }
      });

    if (coinError) {
      throw coinError;
    }

    // 3. reputation を更新（回答数を増やす）
    const { data: currentRep } = await supabaseAdmin
      .from('reputation')
      .select('*')
      .eq('user_id', targetUserId)
      .single();

    if (currentRep) {
      const newTotalReviews = (currentRep.total_reviews || 0) + answeredCount;
      let newLevel = currentRep.level;

      // レベルアップ判定（簡易版）
      if (newTotalReviews >= 100) {
        newLevel = 'expert';
      } else if (newTotalReviews >= 50) {
        newLevel = 'trusted';
      } else if (newTotalReviews >= 20) {
        newLevel = 'regular';
      }

      await supabaseAdmin
        .from('reputation')
        .update({
          total_reviews: newTotalReviews,
          level: newLevel,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', targetUserId);
    }

    // 新しいコイン残高
    const { data: newBalance } = await supabaseAdmin
      .rpc('get_coin_balance', { p_user_id: targetUserId });

    return new Response(
      JSON.stringify({
        success: true,
        rewarded: true,
        points_awarded: rewardPoints,
        new_coin_balance: newBalance
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
