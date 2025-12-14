/**
 * Award Stamp Edge Function
 * ==========================
 * スタッフがユーザーにスタンプを付与する
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS
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

    // スタッフ権限チェック
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['staff', 'admin'].includes(profile.role)) {
      throw new Error('Staff access required');
    }

    // リクエストボディ
    const { user_id, reason = 'purchase_curry', meta = {} } = await req.json();

    if (!user_id) {
      throw new Error('user_id is required');
    }

    // 対象ユーザーの存在確認
    const { data: targetUser, error: targetError } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('id', user_id)
      .single();

    if (targetError || !targetUser) {
      throw new Error('Target user not found');
    }

    // 二重付与防止（同一スタッフから同一ユーザーへの直近1分以内の付与をチェック）
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { data: recentStamp } = await supabaseClient
      .from('stamps_ledger')
      .select('id')
      .eq('user_id', user_id)
      .eq('staff_id', user.id)
      .gte('created_at', oneMinuteAgo)
      .single();

    if (recentStamp) {
      return new Response(
        JSON.stringify({ error: 'Duplicate stamp detected', code: 'DUPLICATE' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // サービスロールクライアントでスタンプ付与
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: stamp, error: stampError } = await supabaseAdmin
      .from('stamps_ledger')
      .insert({
        user_id,
        delta: 1,
        reason,
        staff_id: user.id,
        meta
      })
      .select()
      .single();

    if (stampError) {
      throw stampError;
    }

    // 新しい残高を取得
    const { data: balance } = await supabaseAdmin
      .rpc('get_stamp_balance', { p_user_id: user_id });

    return new Response(
      JSON.stringify({
        success: true,
        stamp,
        new_balance: balance
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
