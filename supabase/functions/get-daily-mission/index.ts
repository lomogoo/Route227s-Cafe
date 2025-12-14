/**
 * Get Daily Mission Edge Function
 * =================================
 * デイリーミッション取得または作成
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

    const { user_id, lat, lng } = await req.json();
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

    // 既存のミッションをチェック
    const { data: existingMission } = await supabaseAdmin
      .from('daily_missions')
      .select('*, mission_items(*, posts(*))')
      .eq('user_id', targetUserId)
      .eq('mission_date', today)
      .single();

    if (existingMission) {
      return new Response(
        JSON.stringify({
          mission: existingMission,
          items: existingMission.mission_items,
          isNew: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 設定を取得
    const { data: itemsPerDaySetting } = await supabaseAdmin
      .from('impact_settings')
      .select('value')
      .eq('key', 'mission_items_per_day')
      .single();

    const itemsPerDay = parseInt(itemsPerDaySetting?.value || '5');

    // ユーザーが既に回答した投稿を除外
    const { data: reviewedPostIds } = await supabaseAdmin
      .from('post_reviews')
      .select('post_id')
      .eq('reviewer_id', targetUserId);

    const excludeIds = (reviewedPostIds || []).map(r => r.post_id);

    // 自分の投稿も除外
    const { data: ownPostIds } = await supabaseAdmin
      .from('posts')
      .select('id')
      .eq('user_id', targetUserId);

    const ownIds = (ownPostIds || []).map(p => p.id);
    const allExcludeIds = [...excludeIds, ...ownIds];

    // pending の投稿を取得（位置情報があれば近い順）
    let query = supabaseAdmin
      .from('posts')
      .select('*')
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString());

    if (allExcludeIds.length > 0) {
      query = query.not('id', 'in', `(${allExcludeIds.join(',')})`);
    }

    const { data: availablePosts, error: postsError } = await query.limit(50);

    if (postsError) {
      throw postsError;
    }

    // 位置が提供されていれば距離でソート
    let selectedPosts = availablePosts || [];

    if (lat && lng && selectedPosts.length > 0) {
      selectedPosts = selectedPosts
        .map(post => ({
          ...post,
          distance: calculateDistance(lat, lng, post.lat, post.lng)
        }))
        .sort((a, b) => a.distance - b.distance);
    }

    // ランダム性を加えつつ選択
    const shuffled = selectedPosts
      .slice(0, 20)
      .sort(() => Math.random() - 0.5)
      .slice(0, itemsPerDay);

    if (shuffled.length === 0) {
      return new Response(
        JSON.stringify({
          mission: null,
          items: [],
          message: 'No available posts for mission'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ミッションを作成
    const { data: newMission, error: missionError } = await supabaseAdmin
      .from('daily_missions')
      .insert({
        user_id: targetUserId,
        mission_date: today
      })
      .select()
      .single();

    if (missionError) {
      throw missionError;
    }

    // ミッションアイテムを作成
    const missionItems = shuffled.map(post => ({
      mission_id: newMission.id,
      post_id: post.id
    }));

    const { data: createdItems, error: itemsError } = await supabaseAdmin
      .from('mission_items')
      .insert(missionItems)
      .select('*, posts(*)');

    if (itemsError) {
      throw itemsError;
    }

    return new Response(
      JSON.stringify({
        mission: newMission,
        items: createdItems,
        isNew: true
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

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
