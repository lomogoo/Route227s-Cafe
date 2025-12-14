/**
 * Articles Service
 * ==================
 * 特集記事関連のデータ取得
 */

import { supabase } from './supabase.js';

// 公開記事一覧を取得
export async function getPublishedArticles(limit = 20, excludeIds = []) {
  let query = supabase
    .from('articles')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error getting articles:', error);
    return [];
  }
  return data || [];
}

// 記事詳細を取得（ページ含む）
export async function getArticleWithPages(articleId) {
  const [articleResult, pagesResult] = await Promise.all([
    supabase
      .from('articles')
      .select('*')
      .eq('id', articleId)
      .single(),
    supabase
      .from('article_pages')
      .select('*')
      .eq('article_id', articleId)
      .order('page_index', { ascending: true })
  ]);

  if (articleResult.error) {
    console.error('Error getting article:', articleResult.error);
    return null;
  }

  return {
    ...articleResult.data,
    pages: pagesResult.data || []
  };
}

// カテゴリ別記事を取得
export async function getArticlesByCategory(category, limit = 10) {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('is_published', true)
    .eq('category', category)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error getting articles by category:', error);
    return [];
  }
  return data || [];
}

// タグで記事を検索
export async function getArticlesByTag(tag, limit = 10) {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('is_published', true)
    .contains('tags', [tag])
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error getting articles by tag:', error);
    return [];
  }
  return data || [];
}

// ブックマークを追加
export async function addBookmark(userId, articleId) {
  const { data, error } = await supabase
    .from('bookmarks')
    .insert({ user_id: userId, article_id: articleId })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      // 重複エラー（既にブックマーク済み）
      return { alreadyExists: true };
    }
    throw error;
  }
  return data;
}

// ブックマークを削除
export async function removeBookmark(userId, articleId) {
  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('user_id', userId)
    .eq('article_id', articleId);

  if (error) throw error;
}

// ブックマーク状態を確認
export async function isBookmarked(userId, articleId) {
  const { data, error } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', userId)
    .eq('article_id', articleId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return false; // Not found
    console.error('Error checking bookmark:', error);
    return false;
  }
  return !!data;
}

// ユーザーのブックマーク一覧を取得
export async function getUserBookmarks(userId) {
  const { data, error } = await supabase
    .from('bookmarks')
    .select(`
      id,
      created_at,
      articles (
        id,
        title,
        summary,
        image_url,
        category,
        tags
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting bookmarks:', error);
    return [];
  }
  return data || [];
}

// ランダムな記事を取得（週間おすすめ用）
export async function getRandomArticle(excludeIds = []) {
  // まず全件取得してランダム選択（小規模想定）
  let query = supabase
    .from('articles')
    .select('*')
    .eq('is_published', true);

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * data.length);
  return data[randomIndex];
}

export default {
  getPublishedArticles,
  getArticleWithPages,
  getArticlesByCategory,
  getArticlesByTag,
  addBookmark,
  removeBookmark,
  isBookmarked,
  getUserBookmarks,
  getRandomArticle
};
