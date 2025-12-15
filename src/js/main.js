/**
 * Route 227s' Cafe - Main Application
 * =====================================
 * メインアプリケーションエントリーポイント
 */

import {
  supabase,
  getCurrentUser,
  getSession,
  signUp,
  signIn,
  signInWithMagicLink,
  signOut,
  onAuthStateChange,
  getProfile,
  updateProfile
} from './services/supabase.js';

import {
  getUserStampSummary,
  getStampHistory,
  redeemReward
} from './services/stamps.js';

import {
  getPublishedArticles,
  getArticleWithPages,
  addBookmark,
  removeBookmark,
  isBookmarked,
  getUserBookmarks,
  getRandomArticle
} from './services/articles.js';

import {
  getPosts,
  createPost,
  reportPost,
  getUserPosts,
  getOrCreateDailyMission,
  submitReview,
  completeMissionIfReady,
  getTodayMissionStatus,
  getCoinBalance,
  getReputation,
  REVIEW_CRITERIA
} from './services/posts.js';

import {
  getScheduleImage,
  getScheduleImageUrl,
  getTodayEvents,
  submitSurvey,
  hasRecentSurvey,
  submitCateringRequest,
  hasRecentCateringRequest,
  getNotificationSettings,
  updateNotificationSettings
} from './services/events.js';

import {
  $, $$,
  show, hide, toggle,
  addClass, removeClass,
  formatDate, formatShortDate, formatRelativeTime,
  formatNumber, formatGrams, formatYearMonth, formatYearMonthJa,
  isValidEmail,
  setLocal, getLocal, removeLocal,
  animateCount, animate,
  debounce, getCurrentPosition,
  VEGGIE_EMOJIS, getRandomVeggies
} from './utils/helpers.js';

import { toast } from './components/toast.js';
import { modal, confirm } from './components/modal.js';

// ============================================
// Application State
// ============================================
const assetPath = (path) => new URL(path, import.meta.env.BASE_URL).href;
const state = {
  user: null,
  profile: null,
  currentPage: 'home',
  scheduleMonth: formatYearMonth(new Date()),
  boardMap: null,
  postLocationMap: null,
  articles: [],
  currentArticleIndex: 0,
  missionItems: [],
  currentMissionIndex: 0
};

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Route 227s\' Cafe PWA Initializing...');

  // オンライン/オフライン検出
  setupOfflineDetection();

  // 認証状態の監視
  setupAuthListener();

  // ナビゲーション設定
  setupNavigation();

  // モーダル設定
  setupModals();

  // フォーム設定
  setupForms();

  // 初期認証チェック
  const session = await getSession();
  if (session?.user) {
    await handleUserLogin(session.user);
  } else {
    handleUserLogout();
  }

  // 初期ページ読み込み
  await loadPage(state.currentPage);
});

// ============================================
// Offline Detection
// ============================================
function setupOfflineDetection() {
  const banner = $('#offline-banner');

  const updateOnlineStatus = () => {
    if (navigator.onLine) {
      banner.classList.remove('is-active');
    } else {
      banner.classList.add('is-active');
    }
  };

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();
}

// ============================================
// Auth Listener
// ============================================
function setupAuthListener() {
  let previousUserId = null;

  onAuthStateChange(async (event, session) => {
    console.log('Auth state changed:', event);

    // INITIAL_SESSION, TOKEN_REFRESHED, USER_UPDATED などのイベントは通知しない
    const shouldNotify = event === 'SIGNED_IN' || event === 'SIGNED_OUT';
    const currentUserId = session?.user?.id || null;

    // ユーザーIDが実際に変わった場合のみ処理
    const userChanged = previousUserId !== currentUserId;

    if (event === 'SIGNED_IN' && session?.user && userChanged) {
      await handleUserLogin(session.user);
      modal.close('auth-modal');
      toast.success('ログインしました');
      await loadPage(state.currentPage);
      previousUserId = currentUserId;
    } else if (event === 'SIGNED_OUT' && userChanged) {
      handleUserLogout();
      await loadPage(state.currentPage);
      previousUserId = null;
    } else if (event === 'SIGNED_IN' && session?.user && !userChanged) {
      // セッション復元時（ユーザーは変わっていない）
      await handleUserLogin(session.user);
      // トーストは表示しない
    }
  });
}

async function handleUserLogin(user) {
  state.user = user;
  try {
    state.profile = await getProfile(user.id);
  } catch (e) {
    console.error('Error loading profile:', e);
    state.profile = { display_name: 'ユーザー' };
  }
  updateUIForLoggedIn();
}

function handleUserLogout() {
  state.user = null;
  state.profile = null;
  updateUIForLoggedOut();
}

function updateUIForLoggedIn() {
  // ホーム
  hide($('#home-guest'));
  hide($('#home-loading'));
  show($('#home-content'));

  // プロフィール
  hide($('#profile-guest'));
  show($('#profile-content'));

  // QRボタン
  show($('#qr-btn'));
}

function updateUIForLoggedOut() {
  // ホーム
  show($('#home-guest'));
  hide($('#home-loading'));
  hide($('#home-content'));

  // プロフィール
  show($('#profile-guest'));
  hide($('#profile-content'));

  // QRボタン
  hide($('#qr-btn'));
}

// ============================================
// Navigation
// ============================================
function setupNavigation() {
  const navItems = $$('.nav__item');

  navItems.forEach(item => {
    item.addEventListener('click', async () => {
      const page = item.dataset.nav;
      if (page === state.currentPage) return;

      // ナビゲーションの更新
      navItems.forEach(n => n.classList.remove('is-active'));
      item.classList.add('is-active');

      // ページ切り替え
      await switchPage(page);
    });
  });
}

async function switchPage(page) {
  const pages = $$('.page');
  pages.forEach(p => p.classList.remove('is-active'));

  const targetPage = $(`#page-${page}`);
  if (targetPage) {
    targetPage.classList.add('is-active');
    state.currentPage = page;
    await loadPage(page);
  }
}

async function loadPage(page) {
  switch (page) {
    case 'home':
      await loadHomePage();
      break;
    case 'schedule':
      await loadSchedulePage();
      break;
    case 'feature':
      await loadFeaturePage();
      break;
    case 'board':
      await loadBoardPage();
      break;
    case 'profile':
      await loadProfilePage();
      break;
  }
}

// ============================================
// Home Page
// ============================================
async function loadHomePage() {
  if (!state.user) return;

  try {
    const summary = await getUserStampSummary(state.user.id);

    // ユーザー名
    $('#user-name').textContent = state.profile?.display_name || 'ゲスト';

    // 現在スタンプ
    const currentEl = $('#current-stamps');
    animateCount(currentEl, 0, summary.balance, 800);

    // パーセンタイル
    $('#percentile').textContent = summary.percentile.toFixed(1);

    // 生涯累計
    $('#lifetime-stamps').textContent = formatNumber(summary.lifetime);

    // 野菜救済量
    const veggie = formatGrams(summary.veggieSaved);
    $('#veggie-saved').textContent = formatNumber(veggie.value);
    $('#veggie-unit').textContent = veggie.unit;

    // 野菜換算
    $('#veggie-equiv').textContent = `トマト約${summary.veggieEquiv.tomato}個分`;

    // 野菜アニメーション
    renderVeggieAnimation(summary.veggieEquiv.tomato);

    // リワード進捗
    $('#stamps-to-drink').textContent = summary.stampsToNextDrink || '達成！';
    $('#stamps-to-curry').textContent = summary.stampsToNextCurry || '達成！';

    // リワードボタン
    const drinkBtn = $('#redeem-drink-btn');
    const curryBtn = $('#redeem-curry-btn');
    drinkBtn.disabled = !summary.canRedeemDrink;
    curryBtn.disabled = !summary.canRedeemCurry;

    // リワード交換ハンドラ
    drinkBtn.onclick = () => handleRedeemReward('drink', summary.requirements.drink);
    curryBtn.onclick = () => handleRedeemReward('curry', summary.requirements.curry);

    // 週間おすすめ
    await loadWeeklyRecommend();

  } catch (error) {
    console.error('Error loading home page:', error);
    toast.error('データの読み込みに失敗しました');
  }
}

function renderVeggieAnimation(count) {
  const container = $('#veggie-animation');
  container.innerHTML = '';

  const displayCount = Math.min(count, 10); // 最大10個
  const veggies = getRandomVeggies(displayCount);

  veggies.forEach((emoji, i) => {
    const span = document.createElement('span');
    span.className = 'veggie-item';
    span.textContent = emoji;
    span.style.animationDelay = `${i * 80}ms`;
    container.appendChild(span);
  });
}

async function handleRedeemReward(type, stampsRequired) {
  const typeName = type === 'drink' ? 'ドリンク1杯無料' : 'カレー1杯無料';
  const confirmed = await confirm(
    'リワード交換',
    `${stampsRequired}スタンプを使って「${typeName}」と交換しますか？`
  );

  if (!confirmed) return;

  try {
    await redeemReward(state.user.id, type);
    toast.success('交換しました！スタッフに画面を見せてください');
    await loadHomePage(); // 再読み込み
  } catch (error) {
    console.error('Error redeeming reward:', error);
    toast.error('交換に失敗しました');
  }
}

async function loadWeeklyRecommend() {
  try {
    const article = await getRandomArticle();
    if (article) {
      $('#weekly-img').src = article.image_url || assetPath('icons/icon-192.png');
      $('#weekly-label').textContent = article.category || '特集';
      $('#weekly-title').textContent = article.title;
      $('#weekly-desc').textContent = article.summary || '';
    }
  } catch (error) {
    console.error('Error loading weekly recommend:', error);
  }
}

// ============================================
// Schedule Page
// ============================================
async function loadSchedulePage() {
  // タブ切り替え
  setupScheduleTabs();

  // スケジュール画像読み込み
  await loadScheduleImage();

  // 本日のイベント
  await loadTodayEvents();
}

function setupScheduleTabs() {
  const tabs = $$('#page-schedule .tab-filter');
  const contents = {
    schedule: $('#tab-schedule'),
    events: $('#tab-events'),
    survey: $('#tab-survey'),
    catering: $('#tab-catering')
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');

      Object.values(contents).forEach(c => c.classList.add('hidden'));
      contents[tab.dataset.tab]?.classList.remove('hidden');
    });
  });

  // 月切替ボタン
  $('#prev-month').addEventListener('click', () => {
    const [year, month] = state.scheduleMonth.split('-').map(Number);
    const date = new Date(year, month - 2, 1);
    state.scheduleMonth = formatYearMonth(date);
    loadScheduleImage();
  });

  $('#next-month').addEventListener('click', () => {
    const [year, month] = state.scheduleMonth.split('-').map(Number);
    const date = new Date(year, month, 1);
    state.scheduleMonth = formatYearMonth(date);
    loadScheduleImage();
  });
}

async function loadScheduleImage() {
  const loading = $('#schedule-loading');
  const image = $('#schedule-image');
  const empty = $('#schedule-empty');

  show(loading);
  hide(image);
  hide(empty);

  $('#schedule-month').textContent = formatYearMonthJa(state.scheduleMonth);

  try {
    const schedule = await getScheduleImage(state.scheduleMonth);

    if (schedule?.image_path) {
      const url = getScheduleImageUrl(schedule.image_path);
      image.src = url;
      image.onload = () => {
        hide(loading);
        show(image);
      };
      image.onerror = () => {
        hide(loading);
        show(empty);
      };

      // 画像クリックで拡大
      image.onclick = () => {
        $('#image-modal-img').src = url;
        modal.open('image-modal');
      };
    } else {
      hide(loading);
      show(empty);
    }
  } catch (error) {
    console.error('Error loading schedule:', error);
    hide(loading);
    show(empty);
  }
}

async function loadTodayEvents() {
  const loading = $('#events-loading');
  const list = $('#events-list');
  const empty = $('#events-empty');

  show(loading);
  hide(empty);
  list.innerHTML = '';

  try {
    const events = await getTodayEvents();

    hide(loading);

    if (events.length === 0) {
      show(empty);
      return;
    }

    events.forEach(event => {
      const card = document.createElement('div');
      card.className = 'event-card';
      card.innerHTML = `
        <div class="event-card__date">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          ${formatShortDate(event.event_date)}
        </div>
        <h3 class="event-card__title">${event.title}</h3>
        ${event.description ? `<p style="color:var(--color-gray-600);margin:var(--space-2) 0">${event.description}</p>` : ''}
        ${event.location ? `
          <div class="event-card__location">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
            </svg>
            ${event.location}
          </div>
        ` : ''}
      `;
      list.appendChild(card);
    });

  } catch (error) {
    console.error('Error loading events:', error);
    hide(loading);
    show(empty);
  }
}

// ============================================
// Feature Page (Mobbin-inspired Grid Layout)
// ============================================
let currentFeatureFilter = 'all';

async function loadFeaturePage() {
  const grid = $('#feature-grid');
  const loading = $('#feature-loading');
  const empty = $('#feature-empty');

  try {
    const articles = await getPublishedArticles(50);
    state.articles = articles;

    if (articles.length === 0) {
      hide(loading);
      show(empty);
      return;
    }

    // グリッドをクリア
    grid.innerHTML = '';

    // フィルタリングされた記事を表示
    renderFilteredArticles();

    // タブフィルターのイベントリスナーを設定
    setupFeatureFilters();

  } catch (error) {
    console.error('Error loading features:', error);
    hide(loading);
    show(empty);
  }
}

function setupFeatureFilters() {
  const filters = document.querySelectorAll('[data-feature-tab]');
  filters.forEach(filter => {
    filter.addEventListener('click', (e) => {
      const tab = e.currentTarget.dataset.featureTab;

      // アクティブなタブを更新
      filters.forEach(f => f.classList.remove('is-active'));
      e.currentTarget.classList.add('is-active');

      // フィルターを適用
      currentFeatureFilter = tab;
      renderFilteredArticles();
    });
  });
}

function renderFilteredArticles() {
  const grid = $('#feature-grid');
  grid.innerHTML = '';

  let filteredArticles = state.articles;

  // フィルターを適用
  if (currentFeatureFilter === 'news') {
    filteredArticles = state.articles.filter(a => a.is_auto_scraped);
  } else if (currentFeatureFilter === 'manual') {
    filteredArticles = state.articles.filter(a => !a.is_auto_scraped);
  }

  // 記事カードを追加
  filteredArticles.forEach((article, index) => {
    const card = createFeatureCard(article, index);
    grid.appendChild(card);
  });

  // 空の状態を表示
  const empty = $('#feature-empty');
  if (filteredArticles.length === 0) {
    show(empty);
  } else {
    hide(empty);
  }
}

function createFeatureCard(article, index) {
  const card = document.createElement('div');
  card.className = 'feature-card';
  card.dataset.articleId = article.id;

  // ソースバッジのテキスト
  const sourceText = article.is_auto_scraped
    ? (article.author || 'ニュース')
    : '特集';

  // 日付のフォーマット
  const date = article.published_date
    ? new Date(article.published_date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
    : new Date(article.created_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });

  card.innerHTML = `
    <div class="feature-card__image-container">
      <img class="feature-card__image" src="${article.image_url || assetPath('icons/icon-512.png')}" alt="${article.title}">
      <div class="feature-card__source-badge">
        ${article.is_auto_scraped ?
          '<svg class="feature-card__source-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>' :
          '<svg class="feature-card__source-icon" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'
        }
        ${sourceText}
      </div>
    </div>
    <div class="feature-card__content">
      <div class="feature-card__tags">
        ${article.category ? `<span class="feature-card__tag">${article.category}</span>` : ''}
        ${(article.tags || []).slice(0, 2).map(tag => `<span class="feature-card__tag">${tag}</span>`).join('')}
      </div>
      <h2 class="feature-card__title">${article.title}</h2>
      <p class="feature-card__summary">${article.summary || ''}</p>
      <div class="feature-card__meta">
        <div class="feature-card__author">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="feature-card__date">${date}</span>
        </div>
        <div class="feature-card__actions">
          <button class="feature-card__bookmark-btn bookmark-btn" data-id="${article.id}">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;

  // カード全体をクリックで記事を開く
  card.addEventListener('click', (e) => {
    // ブックマークボタンをクリックした場合は記事を開かない
    if (e.target.closest('.bookmark-btn')) return;
    openArticleDetail(article.id, article.source_url);
  });

  // ブックマークボタン
  const bookmarkBtn = card.querySelector('.bookmark-btn');
  bookmarkBtn.addEventListener('click', async (e) => {
    e.stopPropagation();

    if (!state.user) {
      toast.info('ブックマークにはログインが必要です');
      modal.open('auth-modal');
      return;
    }

    try {
      const bookmarked = await isBookmarked(state.user.id, article.id);
      if (bookmarked) {
        await removeBookmark(state.user.id, article.id);
        bookmarkBtn.classList.remove('is-bookmarked');
        toast.success('ブックマークを解除しました');
      } else {
        await addBookmark(state.user.id, article.id);
        bookmarkBtn.classList.add('is-bookmarked');
        toast.success('ブックマークしました');
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast.error('エラーが発生しました');
    }
  });

  // 既にブックマーク済みかチェック
  if (state.user) {
    isBookmarked(state.user.id, article.id).then(bookmarked => {
      if (bookmarked) {
        bookmarkBtn.classList.add('is-bookmarked');
      }
    });
  }

  return card;
}

async function openArticleDetail(articleId, sourceUrl) {
  // ニュース記事（外部ソース）の場合は外部リンクを開く
  if (sourceUrl) {
    window.open(sourceUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  // TODO: 手動作成記事の詳細モーダルまたは横スワイプページを実装
  console.log('Open article:', articleId);
  toast.info('記事詳細は準備中です');
}

// ============================================
// Board Page (掲示板)
// ============================================
async function loadBoardPage() {
  // タブ切り替え
  setupBoardTabs();

  // 地図初期化
  initBoardMap();

  // ミッションバナー
  await loadMissionBanner();

  // 投稿一覧
  await loadPosts();
}

function setupBoardTabs() {
  const tabs = $$('#page-board .tab-filter');
  const views = {
    map: $('#board-map-view'),
    list: $('#board-list-view'),
    post: $('#board-post-view')
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');

      Object.values(views).forEach(v => v.classList.add('hidden'));
      views[tab.dataset.boardTab]?.classList.remove('hidden');

      // 地図リサイズ
      if (tab.dataset.boardTab === 'map' && state.boardMap) {
        setTimeout(() => state.boardMap.invalidateSize(), 100);
      }

      // 投稿フォームの地図
      if (tab.dataset.boardTab === 'post') {
        initPostLocationMap();
      }
    });
  });
}

function initBoardMap() {
  if (state.boardMap) {
    state.boardMap.invalidateSize();
    return;
  }

  const container = $('#board-map');
  if (!container) return;

  // デフォルト位置（東京）
  const defaultLat = 35.6812;
  const defaultLng = 139.7671;

  state.boardMap = L.map(container).setView([defaultLat, defaultLng], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(state.boardMap);

  // 現在地を取得して表示
  getCurrentPosition()
    .then(pos => {
      state.boardMap.setView([pos.lat, pos.lng], 14);

      // 現在地マーカー（オレンジドット）を追加
      const currentLocationIcon = L.divIcon({
        className: 'map-marker-current-location',
        html: '<div class="current-location-dot"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      L.marker([pos.lat, pos.lng], { icon: currentLocationIcon })
        .addTo(state.boardMap)
        .bindPopup('現在地');
    })
    .catch(err => {
      console.log('Could not get current position:', err);
    });
}

async function loadPosts() {
  try {
    const posts = await getPosts({ status: ['pending', 'verified'] });

    // 地図にマーカーを追加
    if (state.boardMap) {
      posts.forEach(post => {
        const markerClass = `map-marker map-marker--${post.status}`;
        const icon = L.divIcon({
          className: markerClass,
          iconSize: [32, 32]
        });

        const marker = L.marker([post.lat, post.lng], { icon })
          .addTo(state.boardMap);

        marker.bindPopup(`
          <div style="min-width:200px">
            <div class="pill pill--${post.status === 'verified' ? 'success' : 'warning'}" style="margin-bottom:8px">
              ${post.status === 'verified' ? '検証済み' : '検証中'}
            </div>
            <p style="margin:0 0 8px">${post.body.substring(0, 100)}${post.body.length > 100 ? '...' : ''}</p>
            <small style="color:#666">${formatRelativeTime(post.created_at)}</small>
          </div>
        `);
      });
    }

    // リストビュー更新
    const listContainer = $('#posts-list');
    const empty = $('#posts-empty');
    const loading = $('#posts-loading');

    hide(loading);
    listContainer.innerHTML = '';

    if (posts.length === 0) {
      show(empty);
      return;
    }

    hide(empty);

    posts.forEach(post => {
      const card = createPostCard(post);
      listContainer.appendChild(card);
    });

  } catch (error) {
    console.error('Error loading posts:', error);
  }
}

function createPostCard(post) {
  const card = document.createElement('div');
  card.className = 'post-card';

  const statusClass = `post-card__status post-card__status--${post.status}`;

  card.innerHTML = `
    <div class="post-card__header">
      <div class="${statusClass}"></div>
      <div class="post-card__meta">
        <span class="post-card__category">${getCategoryLabel(post.category)}</span>
        <span class="post-card__time">${formatRelativeTime(post.created_at)}</span>
      </div>
    </div>
    ${post.image_url ? `<img class="post-card__image" src="${post.image_url}" alt="">` : ''}
    <p class="post-card__body">${post.body}</p>
    <div class="post-card__actions">
      <button class="btn btn--ghost btn--sm report-btn" data-id="${post.id}">
        報告する
      </button>
    </div>
  `;

  // 報告ボタン
  card.querySelector('.report-btn').addEventListener('click', () => {
    handleReportPost(post.id);
  });

  return card;
}

function getCategoryLabel(category) {
  const labels = {
    food: 'グルメ',
    event: 'イベント',
    shop: 'お店',
    nature: '自然',
    other: 'その他'
  };
  return labels[category] || category;
}

async function handleReportPost(postId) {
  if (!state.user) {
    toast.info('報告にはログインが必要です');
    modal.open('auth-modal');
    return;
  }

  const confirmed = await confirm('投稿を報告', 'この投稿を不適切として報告しますか？');
  if (!confirmed) return;

  try {
    const result = await reportPost(postId, state.user.id, '不適切な内容');
    if (result.alreadyReported) {
      toast.info('既に報告済みです');
    } else {
      toast.success('報告しました');
    }
  } catch (error) {
    console.error('Error reporting post:', error);
    toast.error('報告に失敗しました');
  }
}

async function loadMissionBanner() {
  if (!state.user) {
    hide($('#mission-banner'));
    return;
  }

  try {
    const missionStatus = await getTodayMissionStatus(state.user.id);
    const banner = $('#mission-banner');
    const progressContainer = $('#mission-progress');

    if (!missionStatus.hasStarted) {
      show(banner);
      progressContainer.innerHTML = `
        <span class="mission-banner__dot">1</span>
        <span class="mission-banner__dot">2</span>
        <span class="mission-banner__dot">3</span>
        <span class="mission-banner__dot">4</span>
        <span class="mission-banner__dot">5</span>
      `;
      $('#start-mission-btn').textContent = 'ミッション開始';
      $('#start-mission-btn').onclick = startMission;
    } else {
      show(banner);
      progressContainer.innerHTML = Array.from({ length: 5 }, (_, i) => `
        <span class="mission-banner__dot ${i < missionStatus.completed ? 'mission-banner__dot--done' : ''}">
          ${i < missionStatus.completed ? '✓' : i + 1}
        </span>
      `).join('');

      if (missionStatus.isComplete) {
        $('#start-mission-btn').textContent = missionStatus.rewarded ? '本日完了' : '報酬を受け取る';
        $('#start-mission-btn').disabled = missionStatus.rewarded;
        $('#start-mission-btn').onclick = missionStatus.rewarded ? null : claimMissionReward;
      } else {
        $('#start-mission-btn').textContent = 'ミッション続行';
        $('#start-mission-btn').onclick = continueMission;
      }
    }
  } catch (error) {
    console.error('Error loading mission banner:', error);
    hide($('#mission-banner'));
  }
}

async function startMission() {
  if (!state.user) {
    toast.info('ミッションにはログインが必要です');
    modal.open('auth-modal');
    return;
  }

  try {
    const pos = await getCurrentPosition().catch(() => ({ lat: 35.6812, lng: 139.7671 }));
    const mission = await getOrCreateDailyMission(state.user.id, pos.lat, pos.lng);

    if (mission.items && mission.items.length > 0) {
      state.missionItems = mission.items;
      state.currentMissionIndex = 0;
      openReviewModal();
    } else {
      toast.info('近くに検証できる投稿がありません');
    }
  } catch (error) {
    console.error('Error starting mission:', error);
    toast.error('ミッション開始に失敗しました');
  }
}

async function continueMission() {
  try {
    const status = await getTodayMissionStatus(state.user.id);
    const unanswered = status.items.filter(item => !item.answered_at);

    if (unanswered.length > 0) {
      state.missionItems = unanswered;
      state.currentMissionIndex = 0;
      openReviewModal();
    } else {
      toast.info('全ての投稿を検証済みです');
    }
  } catch (error) {
    console.error('Error continuing mission:', error);
    toast.error('エラーが発生しました');
  }
}

async function claimMissionReward() {
  try {
    const result = await completeMissionIfReady(state.user.id);
    if (result.rewarded) {
      toast.success('+10コイン獲得！');
      await loadMissionBanner();
    } else {
      toast.info('報酬は既に受け取り済みです');
    }
  } catch (error) {
    console.error('Error claiming reward:', error);
    toast.error('報酬の受け取りに失敗しました');
  }
}

function openReviewModal() {
  const item = state.missionItems[state.currentMissionIndex];
  if (!item) {
    modal.close('review-modal');
    loadMissionBanner();
    return;
  }

  const content = $('#review-content');
  content.innerHTML = `
    <div class="review-card">
      ${item.post?.image_url ? `<img class="review-card__image" src="${item.post.image_url}" alt="">` : ''}
      <div class="review-card__content">
        <span class="review-card__category">${getCategoryLabel(item.post?.category)}</span>
        <p class="review-card__body">${item.post?.body || '投稿内容'}</p>
        <div class="review-card__location">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
          </svg>
          付近
        </div>
        <div class="review-card__criteria">
          <strong>検証基準</strong><br>
          ${REVIEW_CRITERIA.map(c => `・${c}`).join('<br>')}
        </div>
        <div class="review-card__buttons">
          <button class="btn btn--success flex-1" id="approve-btn">承認</button>
          <button class="btn btn--error flex-1" id="reject-btn">否認</button>
          <button class="btn btn--secondary flex-1" id="skip-btn">スキップ</button>
        </div>
      </div>
    </div>
    <p class="text-center text-muted" style="margin-top:var(--space-4)">
      ${state.currentMissionIndex + 1} / ${state.missionItems.length}
    </p>
  `;

  $('#approve-btn').onclick = () => handleReviewVerdict(item.id, 'approve');
  $('#reject-btn').onclick = () => handleReviewVerdict(item.id, 'reject');
  $('#skip-btn').onclick = () => handleReviewVerdict(item.id, 'skip');

  modal.open('review-modal');
}

async function handleReviewVerdict(missionItemId, verdict) {
  try {
    await submitReview(missionItemId, verdict);

    state.currentMissionIndex++;

    if (state.currentMissionIndex < state.missionItems.length) {
      openReviewModal();
    } else {
      modal.close('review-modal');
      toast.success('検証完了！');
      await loadMissionBanner();
    }
  } catch (error) {
    console.error('Error submitting review:', error);
    toast.error('エラーが発生しました');
  }
}

function initPostLocationMap() {
  if (state.postLocationMap) return;

  const container = $('#post-location-map');
  if (!container) return;

  const defaultLat = 35.6812;
  const defaultLng = 139.7671;

  state.postLocationMap = L.map(container).setView([defaultLat, defaultLng], 15);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(state.postLocationMap);

  const marker = L.marker([defaultLat, defaultLng], { draggable: true })
    .addTo(state.postLocationMap);

  // 現在地に移動
  getCurrentPosition()
    .then(pos => {
      state.postLocationMap.setView([pos.lat, pos.lng], 16);
      marker.setLatLng([pos.lat, pos.lng]);
    })
    .catch(() => {});

  // マーカー移動時
  marker.on('dragend', () => {
    const pos = marker.getLatLng();
    console.log('New position:', pos);
  });

  // 地図クリック時
  state.postLocationMap.on('click', (e) => {
    marker.setLatLng(e.latlng);
  });

  // フォーム送信で位置を取得できるように保存
  state.postMarker = marker;
}

// ============================================
// Profile Page
// ============================================
async function loadProfilePage() {
  if (!state.user) return;

  try {
    const [summary, coins, reputation, settings] = await Promise.all([
      getUserStampSummary(state.user.id),
      getCoinBalance(state.user.id),
      getReputation(state.user.id),
      getNotificationSettings(state.user.id)
    ]);

    // プロフィール情報
    $('#profile-name').textContent = state.profile?.display_name || 'ユーザー';
    $('#avatar-initial').textContent = (state.profile?.display_name || 'U').charAt(0).toUpperCase();

    // Curatorレベル
    const levelLabels = {
      beginner: 'Beginner Curator',
      regular: 'Regular Curator',
      trusted: 'Trusted Curator',
      expert: 'Expert Curator'
    };
    $('#profile-level').textContent = levelLabels[reputation?.level] || 'Beginner Curator';

    // 統計
    $('#profile-stamps').textContent = summary.balance;
    $('#profile-coins').textContent = coins;
    $('#profile-percentile').textContent = summary.percentile.toFixed(0);

    // 通知設定
    $('#notification-toggle').checked = settings?.event_notifications ?? true;
    $('#notification-toggle').onchange = async (e) => {
      try {
        await updateNotificationSettings(state.user.id, {
          event_notifications: e.target.checked
        });
        toast.success('設定を保存しました');
      } catch (error) {
        console.error('Error updating notification settings:', error);
        toast.error('設定の保存に失敗しました');
      }
    };

  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

// ============================================
// Modals
// ============================================
function setupModals() {
  // QRモーダル
  $('#qr-btn')?.addEventListener('click', () => {
    if (!state.user) {
      toast.info('QRコードにはログインが必要です');
      modal.open('auth-modal');
      return;
    }
    generateQRCode();
    modal.open('qr-modal');
  });

  $('#close-qr-modal')?.addEventListener('click', () => {
    modal.close('qr-modal');
  });

  // 認証モーダル
  $('#login-btn-home')?.addEventListener('click', () => modal.open('auth-modal'));
  $('#login-btn-profile')?.addEventListener('click', () => modal.open('auth-modal'));

  // 認証モード切替
  let isSignUp = false;
  $('#toggle-auth-mode')?.addEventListener('click', () => {
    isSignUp = !isSignUp;
    const nicknameGroup = $('#auth-nickname-group');
    const passwordConfirmGroup = $('#auth-password-confirm-group');

    $('#auth-modal-title').textContent = isSignUp ? '新規登録' : 'ログイン';
    $('#auth-submit-btn').textContent = isSignUp ? '登録' : 'ログイン';
    $('#toggle-auth-mode').textContent = isSignUp ? 'ログインはこちら' : '新規登録はこちら';

    // 新規登録時のみ表示
    if (isSignUp) {
      nicknameGroup?.classList.remove('hidden');
      passwordConfirmGroup?.classList.remove('hidden');
      $('#auth-nickname').required = true;
      $('#auth-password-confirm').required = true;
    } else {
      nicknameGroup?.classList.add('hidden');
      passwordConfirmGroup?.classList.add('hidden');
      $('#auth-nickname').required = false;
      $('#auth-password-confirm').required = false;
    }
  });

  // マジックリンク
  $('#magic-link-btn')?.addEventListener('click', async () => {
    const email = $('#auth-email').value;
    if (!isValidEmail(email)) {
      toast.error('有効なメールアドレスを入力してください');
      return;
    }

    try {
      await signInWithMagicLink(email);
      toast.success('ログインリンクを送信しました。メールをご確認ください');
    } catch (error) {
      console.error('Magic link error:', error);
      toast.error('送信に失敗しました');
    }
  });

  // 履歴モーダル
  $('#view-history-btn')?.addEventListener('click', async () => {
    await loadStampHistory();
    modal.open('history-modal');
  });

  $('#close-history-modal')?.addEventListener('click', () => {
    modal.close('history-modal');
  });

  // 画像モーダル
  $('#close-image-modal')?.addEventListener('click', () => {
    modal.close('image-modal');
  });

  // ログアウト
  $('#logout-btn')?.addEventListener('click', async () => {
    const confirmed = await confirm('ログアウト', 'ログアウトしますか？');
    if (confirmed) {
      await signOut();
      toast.success('ログアウトしました');
    }
  });
}

async function generateQRCode() {
  const container = $('#qr-code');
  container.innerHTML = '<div class="spinner"></div>';

  try {
    // QRコードライブラリを動的にインポート
    const QRCode = await import('https://esm.sh/qrcode@1.5.3');

    // ユーザーIDとタイムスタンプでトークン生成
    const payload = JSON.stringify({
      uid: state.user.id,
      ts: Date.now()
    });

    const canvas = document.createElement('canvas');
    await QRCode.toCanvas(canvas, payload, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    container.innerHTML = '';
    container.appendChild(canvas);

  } catch (error) {
    console.error('Error generating QR code:', error);
    container.innerHTML = '<p class="text-error">QRコードの生成に失敗しました</p>';
  }
}

async function loadStampHistory() {
  const list = $('#history-list');
  list.innerHTML = '<div class="spinner" style="margin:auto"></div>';

  try {
    const history = await getStampHistory(state.user.id);

    if (history.length === 0) {
      list.innerHTML = '<p class="text-center text-muted">履歴がありません</p>';
      return;
    }

    list.innerHTML = history.map(item => {
      const isPositive = item.delta > 0;
      const reasonLabels = {
        purchase_curry: 'カレー購入',
        bonus: 'ボーナス',
        manual: '手動付与',
        adjustment: '調整'
      };

      return `
        <div class="list-item">
          <div class="list-item__icon" style="background:${isPositive ? 'var(--color-success-light)' : 'var(--color-error-light)'}">
            <span style="color:${isPositive ? 'var(--color-success)' : 'var(--color-error)'}">${isPositive ? '+' : ''}${item.delta}</span>
          </div>
          <div class="list-item__content">
            <p class="list-item__title">${reasonLabels[item.reason] || item.reason}</p>
            <p class="list-item__subtitle">${formatRelativeTime(item.created_at)}</p>
          </div>
        </div>
      `;
    }).join('');

    // フィルタボタン
    $$('#history-modal .tab-filter').forEach(btn => {
      btn.onclick = () => {
        $$('#history-modal .tab-filter').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');

        const filter = btn.dataset.history;
        const filtered = filter === 'all' ? history
          : filter === 'earn' ? history.filter(h => h.delta > 0)
          : history.filter(h => h.delta < 0);

        // 再描画（簡易版）
        if (filtered.length === 0) {
          list.innerHTML = '<p class="text-center text-muted">該当する履歴がありません</p>';
        }
      };
    });

  } catch (error) {
    console.error('Error loading history:', error);
    list.innerHTML = '<p class="text-center text-error">読み込みに失敗しました</p>';
  }
}

// ============================================
// Forms
// ============================================
function setupForms() {
  // 認証フォーム
  $('#auth-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = $('#auth-email').value.trim();
    const password = $('#auth-password').value;
    const nickname = $('#auth-nickname').value.trim();
    const passwordConfirm = $('#auth-password-confirm').value;
    const isSignUpMode = $('#auth-modal-title').textContent === '新規登録';

    // バリデーション
    if (!isValidEmail(email)) {
      toast.error('有効なメールアドレスを入力してください');
      return;
    }

    if (!password || password.length < 6) {
      toast.error('パスワードは6文字以上で入力してください');
      return;
    }

    if (isSignUpMode) {
      if (!nickname) {
        toast.error('ニックネームを入力してください');
        return;
      }

      if (password !== passwordConfirm) {
        toast.error('パスワードが一致しません');
        return;
      }
    }

    // 処理中ビューに切り替え
    const formView = $('#auth-form-view');
    const processingView = $('#auth-processing-view');
    const processingTitle = $('#auth-processing-title');
    const processingMessage = $('#auth-processing-message');

    formView?.classList.add('hidden');
    processingView?.classList.remove('hidden');

    try {
      if (isSignUpMode) {
        processingTitle.textContent = '登録処理中...';
        processingMessage.textContent = 'アカウントを作成しています';

        const result = await signUp(email, password, nickname || 'ユーザー');

        // メール確認が必要な場合、自動ログインされたセッションをクリアする
        if (result?.session) {
          await signOut();
        }

        processingTitle.textContent = '登録完了！';
        processingMessage.textContent = '確認メールを送信しました。メールをご確認ください。';

        // 5秒後にモーダルを閉じる
        setTimeout(() => {
          modal.close('auth-modal');
          formView?.classList.remove('hidden');
          processingView?.classList.add('hidden');
          $('#auth-form').reset();
        }, 5000);
      } else {
        processingTitle.textContent = 'ログイン中...';
        processingMessage.textContent = '認証情報を確認しています';

        await signIn(email, password);
        // ログイン成功時はonAuthStateChangeで処理される
      }
    } catch (error) {
      console.error('Auth error:', error);

      // エラー時はフォームに戻す
      formView?.classList.remove('hidden');
      processingView?.classList.add('hidden');

      // エラーメッセージを日本語化
      let errorMessage = '認証に失敗しました';
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'メールアドレスまたはパスワードが正しくありません';
      } else if (error.message?.includes('User already registered')) {
        errorMessage = 'このメールアドレスは既に登録されています';
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'メールアドレスが確認されていません。確認メールをご確認ください';
      }

      toast.error(errorMessage);
    }
  });

  // アンケートフォーム
  setupSurveyForm();

  // 出店依頼フォーム
  setupCateringForm();

  // 投稿フォーム
  setupPostForm();
}

function setupSurveyForm() {
  const form = $('#survey-form');
  if (!form) return;

  const ratingState = {
    satisfaction: 0,
    taste: 0,
    portion: 0,
    wouldReturn: null
  };

  // 星評価
  ['satisfaction', 'taste', 'portion'].forEach(field => {
    const container = $(`#rating-${field}`);
    if (!container) return;

    const stars = $$('.rating__star', container);
    stars.forEach((star, index) => {
      star.addEventListener('click', () => {
        ratingState[field] = index + 1;
        stars.forEach((s, i) => {
          s.classList.toggle('rating__star--active', i <= index);
        });
      });
    });
  });

  // また来たいか
  $$('[data-return]').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('[data-return]').forEach(b => b.classList.remove('pill--active'));
      btn.classList.add('pill--active');
      ratingState.wouldReturn = btn.dataset.return;
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!ratingState.satisfaction) {
      toast.error('総合満足度を選択してください');
      return;
    }

    // 連投チェック
    if (state.user) {
      const hasRecent = await hasRecentSurvey(state.user.id);
      if (hasRecent) {
        toast.info('アンケートは30分に1回までです');
        return;
      }
    }

    try {
      await submitSurvey({
        userId: state.user?.id,
        satisfaction: ratingState.satisfaction,
        taste: ratingState.taste,
        portion: ratingState.portion,
        wouldReturn: ratingState.wouldReturn,
        comment: $('#survey-comment').value
      });

      toast.success('アンケートを送信しました。ありがとうございます！');
      form.reset();

      // リセット
      $$('.rating__star').forEach(s => s.classList.remove('rating__star--active'));
      $$('[data-return]').forEach(b => b.classList.remove('pill--active'));
      Object.keys(ratingState).forEach(k => ratingState[k] = k === 'wouldReturn' ? null : 0);

    } catch (error) {
      console.error('Error submitting survey:', error);
      toast.error('送信に失敗しました');
    }
  });
}

function setupCateringForm() {
  const form = $('#catering-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = $('#catering-email').value;

    // 連投チェック
    const hasRecent = await hasRecentCateringRequest(email);
    if (hasRecent) {
      toast.info('同一メールアドレスでの依頼は24時間に1回までです');
      return;
    }

    try {
      await submitCateringRequest({
        organization: $('#catering-org').value,
        contactName: $('#catering-name').value,
        email: email,
        phone: $('#catering-phone').value,
        preferredDate: $('#catering-date').value,
        location: $('#catering-location').value,
        expectedVisitors: parseInt($('#catering-visitors').value) || null,
        hasPower: $('#catering-power').checked,
        hasWater: $('#catering-water').checked,
        details: $('#catering-details').value
      });

      toast.success('出店依頼を送信しました。3営業日以内にご連絡いたします');
      form.reset();

    } catch (error) {
      console.error('Error submitting catering request:', error);
      toast.error('送信に失敗しました');
    }
  });
}

function setupPostForm() {
  const form = $('#post-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!state.user) {
      toast.info('投稿にはログインが必要です');
      modal.open('auth-modal');
      return;
    }

    const category = $('#post-category').value;
    const body = $('#post-body').value;

    if (!category || !body) {
      toast.error('カテゴリと内容は必須です');
      return;
    }

    // 位置情報
    let lat, lng;
    if (state.postMarker) {
      const pos = state.postMarker.getLatLng();
      lat = pos.lat;
      lng = pos.lng;
    } else {
      try {
        const pos = await getCurrentPosition();
        lat = pos.lat;
        lng = pos.lng;
      } catch {
        toast.error('位置情報を取得できません');
        return;
      }
    }

    try {
      // TODO: 画像アップロード処理
      await createPost(state.user.id, {
        body,
        category,
        lat,
        lng
      });

      toast.success('投稿しました！検証が完了すると公開されます');
      form.reset();

      // リストを更新
      await loadPosts();

      // マップタブに切り替え
      $$('#page-board .tab-filter')[0].click();

    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('投稿に失敗しました');
    }
  });
}

// ============================================
// Export for debugging
// ============================================
window.__APP_STATE__ = state;
