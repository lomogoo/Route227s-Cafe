/**
 * Redeem Reward Edge Function
 * ============================
 * リワード交換（ドリンク/カレー）
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

    const { user_id, type, staff_id } = await req.json();

    // ユーザー本人またはスタッフのみ
    const targetUserId = user_id || user.id;
    const isStaffAction = !!staff_id;

    if (isStaffAction) {
      // スタッフ権限チェック
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || !['staff', 'admin'].includes(profile.role)) {
        throw new Error('Staff access required');
      }
    } else if (targetUserId !== user.id) {
      throw new Error('Unauthorized');
    }

    // 交換タイプの検証
    if (!['drink', 'curry'].includes(type)) {
      throw new Error('Invalid reward type');
    }

    // 設定を取得
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: drinkSetting } = await supabaseAdmin
      .from('impact_settings')
      .select('value')
      .eq('key', 'stamps_for_drink')
      .single();

    const { data: currySetting } = await supabaseAdmin
      .from('impact_settings')
      .select('value')
      .eq('key', 'stamps_for_curry')
      .single();

    const stampsRequired = type === 'drink'
      ? parseInt(drinkSetting?.value || '3')
      : parseInt(currySetting?.value || '6');

    // 現在の残高チェック
    const { data: currentBalance } = await supabaseAdmin
      .rpc('get_stamp_balance', { p_user_id: targetUserId });

    if (currentBalance < stampsRequired) {
      return new Response(
        JSON.stringify({
          error: 'Insufficient stamps',
          required: stampsRequired,
          current: currentBalance
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // トランザクション的に処理
    // 1. スタンプを減算
    const { error: ledgerError } = await supabaseAdmin
      .from('stamps_ledger')
      .insert({
        user_id: targetUserId,
        delta: -stampsRequired,
        reason: 'adjustment',
        staff_id: isStaffAction ? user.id : null,
        meta: { redeem_type: type }
      });

    if (ledgerError) {
      throw ledgerError;
    }

    // 2. 交換履歴を記録
    const { data: redemption, error: redemptionError } = await supabaseAdmin
      .from('rewards_redemptions')
      .insert({
        user_id: targetUserId,
        type,
        stamps_used: stampsRequired,
        staff_id: isStaffAction ? user.id : null
      })
      .select()
      .single();

    if (redemptionError) {
      throw redemptionError;
    }

    // 新しい残高
    const { data: newBalance } = await supabaseAdmin
      .rpc('get_stamp_balance', { p_user_id: targetUserId });

    return new Response(
      JSON.stringify({
        success: true,
        redemption,
        stamps_used: stampsRequired,
        new_balance: newBalance
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
