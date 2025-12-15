/**
 * Fetch Sendai News Edge Function
 * =================================
 * 仙台・宮城・東北に関連するニュースを自動取得してarticlesテーブルに保存
 * 1日3回実行を想定
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ニュースソースの定義
interface NewsSource {
  name: string;
  type: 'rss_nhk_sendai' | 'rss_kahoku' | 'rss_miyagi_pref' | 'rss_sendai_city' | 'google_news';
  url: string;
  category: string;
  keywords?: string[];
}

const NEWS_SOURCES: NewsSource[] = [
  {
    name: 'NHK仙台放送局',
    type: 'rss_nhk_sendai',
    url: 'https://www3.nhk.or.jp/lnews/sendai/index.rdf',
    category: 'ニュース',
  },
  {
    name: '河北新報',
    type: 'rss_kahoku',
    url: 'https://kahoku.news/rss/index.rss',
    category: 'ニュース',
  },
  {
    name: 'Googleニュース（仙台）',
    type: 'google_news',
    url: 'https://news.google.com/rss/search?q=仙台+OR+宮城+OR+東北&hl=ja&gl=JP&ceid=JP:ja',
    category: 'ニュース',
    keywords: ['仙台', '宮城', '東北'],
  },
];

// 1ソースあたりの最大取得件数（Supabaseの負荷を考慮）
const MAX_ITEMS_PER_SOURCE = 5;

interface ParsedArticle {
  title: string;
  summary: string;
  url: string;
  published_date: Date;
  external_id: string;
  author: string;
  category: string;
  source_type: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Cronジョブまたは管理者のみ実行可能
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.includes('Bearer')) {
      throw new Error('Unauthorized - This function requires authentication');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting news fetch from', NEWS_SOURCES.length, 'sources');

    let totalFetched = 0;
    let totalSaved = 0;
    const errors: string[] = [];

    // 各ソースからニュースを取得
    for (const source of NEWS_SOURCES) {
      try {
        console.log(`Fetching from ${source.name}...`);
        const articles = await fetchRSSFeed(source);
        console.log(`Fetched ${articles.length} articles from ${source.name}`);
        totalFetched += articles.length;

        // データベースに保存（重複チェック）
        for (const article of articles) {
          try {
            const { error } = await supabaseAdmin.from('articles').insert({
              title: article.title,
              summary: article.summary,
              category: article.category,
              source_type: article.source_type,
              source_url: article.url,
              published_date: article.published_date.toISOString(),
              external_id: article.external_id,
              author: article.author,
              is_auto_scraped: true,
              is_published: true, // 自動的にフィードに表示
              tags: ['仙台', 'ニュース'],
            });

            if (!error) {
              totalSaved++;
              console.log(`Saved: ${article.title}`);
            } else if (error.code === '23505') {
              // 重複エラーは無視（既に存在する記事）
              console.log(`Skipped duplicate: ${article.title}`);
            } else {
              throw error;
            }
          } catch (err) {
            console.error(`Error saving article: ${article.title}`, err);
            errors.push(`Failed to save "${article.title}": ${err.message}`);
          }
        }
      } catch (err) {
        console.error(`Error fetching from ${source.name}:`, err);
        errors.push(`Failed to fetch from ${source.name}: ${err.message}`);
      }
    }

    // 古い自動取得記事を削除（30日以上前のもの）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { error: deleteError } = await supabaseAdmin
      .from('articles')
      .delete()
      .eq('is_auto_scraped', true)
      .lt('published_date', thirtyDaysAgo.toISOString());

    if (deleteError) {
      console.error('Error deleting old articles:', deleteError);
    }

    const result = {
      success: true,
      totalFetched,
      totalSaved,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    };

    console.log('News fetch completed:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * RSSフィードを取得してパース
 */
async function fetchRSSFeed(source: NewsSource): Promise<ParsedArticle[]> {
  try {
    const response = await fetch(source.url, {
      headers: {
        'User-Agent': 'Route227s-Cafe-NewsBot/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const xmlText = await response.text();
    return parseRSS(xmlText, source);
  } catch (error) {
    console.error(`Error fetching RSS from ${source.name}:`, error);
    throw error;
  }
}

/**
 * RSS XMLをパースして記事配列に変換
 */
function parseRSS(xmlText: string, source: NewsSource): ParsedArticle[] {
  const articles: ParsedArticle[] = [];

  try {
    const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
    if (!doc) {
      throw new Error('Failed to parse XML');
    }

    // RSS 2.0 形式
    let items = doc.querySelectorAll('item');

    // Atom形式の場合
    if (items.length === 0) {
      items = doc.querySelectorAll('entry');
    }

    let count = 0;
    for (const item of items) {
      if (count >= MAX_ITEMS_PER_SOURCE) break;

      try {
        // RSS 2.0
        let title = item.querySelector('title')?.textContent?.trim();
        let link = item.querySelector('link')?.textContent?.trim();
        let description = item.querySelector('description')?.textContent?.trim();
        let pubDate = item.querySelector('pubDate')?.textContent?.trim();

        // Atom形式の場合
        if (!title) {
          title = item.querySelector('title')?.textContent?.trim();
          const linkElem = item.querySelector('link');
          link = linkElem?.getAttribute('href') || linkElem?.textContent?.trim();
          description = item.querySelector('summary')?.textContent?.trim() ||
                       item.querySelector('content')?.textContent?.trim();
          pubDate = item.querySelector('published')?.textContent?.trim() ||
                   item.querySelector('updated')?.textContent?.trim();
        }

        if (!title || !link) continue;

        // キーワードフィルタリング
        if (source.keywords && source.keywords.length > 0) {
          const content = (title + ' ' + (description || '')).toLowerCase();
          const hasKeyword = source.keywords.some(keyword =>
            content.includes(keyword.toLowerCase())
          );
          if (!hasKeyword) continue;
        }

        // HTMLタグを除去
        description = description ? stripHtmlTags(description) : '';

        // 要約を生成（最初の200文字）
        const summary = description.length > 200
          ? description.substring(0, 200) + '...'
          : description || title;

        // 公開日をパース
        let publishedDate = new Date();
        if (pubDate) {
          const parsed = new Date(pubDate);
          if (!isNaN(parsed.getTime())) {
            publishedDate = parsed;
          }
        }

        // 外部IDを生成（URLのハッシュ）
        const external_id = await generateHash(link);

        articles.push({
          title,
          summary,
          url: link,
          published_date: publishedDate,
          external_id,
          author: source.name,
          category: source.category,
          source_type: source.type,
        });

        count++;
      } catch (err) {
        console.error('Error parsing item:', err);
      }
    }

    return articles;
  } catch (error) {
    console.error('Error parsing RSS:', error);
    throw error;
  }
}

/**
 * HTMLタグを除去
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 文字列からハッシュを生成
 */
async function generateHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 16); // 16文字に短縮
}
