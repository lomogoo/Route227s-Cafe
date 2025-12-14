/**
 * Submit Review Edge Function
 * ============================
 * ミッションアイテムに対する検証回答
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

    const { mission_item_id, verdict } = await req.json();

    if (!mission_item_id || !['approve', 'reject', 'skip'].includes(verdict)) {
      throw new Error('Invalid parameters');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ミッションアイテムの所有者確認
    const { data: missionItem, error: itemError } = await supabaseAdmin
      .from('mission_items')
      .select('*, daily_missions!inner(*)')
      .eq('id', mission_item_id)
      .single();

    if (itemError || !missionItem) {
      throw new Error('Mission item not found');
    }

    if (missionItem.daily_missions.user_id !== user.id) {
      throw new Error('Unauthorized');
    }

    if (missionItem.answered_at) {
      throw new Error('Already answered');
    }

    // ミッションアイテムを更新
    const { error: updateError } = await supabaseAdmin
      .from('mission_items')
      .update({
        answered_at: new Date().toISOString(),
        verdict
      })
      .eq('id', mission_item_id);

    if (updateError) {
      throw updateError;
    }

    // skip以外の場合、post_reviewsにも記録
    if (verdict !== 'skip') {
      // レビュー重みを計算
      const { data: weight } = await supabaseAdmin
        .rpc('get_review_weight', { p_user_id: user.id });

      const { error: reviewError } = await supabaseAdmin
        .from('post_reviews')
        .insert({
          post_id: missionItem.post_id,
          reviewer_id: user.id,
          verdict,
          weight: weight || 1.0
        });

      // 重複エラーは無視（既にレビュー済み）
      if (reviewError && reviewError.code !== '23505') {
        throw reviewError;
      }

      // 投稿のステータスを再計算
      await supabaseAdmin.rpc('recalc_post_status', { p_post_id: missionItem.post_id });
    }

    return new Response(
      JSON.stringify({
        success: true,
        verdict
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
