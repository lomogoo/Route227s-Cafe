/**
 * Route 227s' Cafe - Admin Application
 * =====================================
 * スタッフ用管理画面
 */

import {
  supabase,
  getCurrentUser,
  getSession,
  signIn,
  signOut,
  onAuthStateChange,
  getProfile,
  isStaff
} from './services/supabase.js';

import { getStampBalance } from './services/stamps.js';

import {
  $, $$,
  show, hide,
  formatYearMonth, formatYearMonthJa,
  formatDate, formatShortDate
} from './utils/helpers.js';

import { toast } from './components/toast.js';
import { modal } from './components/modal.js';

// ============================================
// State
// ============================================
const state = {
  user: null,
  profile: null,
  isStaff: false,
  scannedUserId: null,
  videoStream: null
};

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Admin Panel Initializing...');

  setupAuthListener();
  setupNavigation();
  setupForms();

  const session = await getSession();
  if (session?.user) {
    await handleUserLogin(session.user);
  } else {
    showAuthRequired();
  }
});

// ============================================
// Auth
// ============================================
function setupAuthListener() {
  onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      await handleUserLogin(session.user);
      modal.close('auth-modal');
    } else if (event === 'SIGNED_OUT') {
      handleUserLogout();
    }
  });

  // ログインボタン
  $('#admin-login-btn')?.addEventListener('click', () => {
    modal.open('auth-modal');
  });

  // ログアウトボタン
  $('#logout-btn')?.addEventListener('click', async () => {
    await signOut();
    toast.success('ログアウトしました');
  });

  // 認証フォーム
  $('#auth-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#auth-email').value;
    const password = $('#auth-password').value;

    try {
      await signIn(email, password);
    } catch (error) {
      console.error('Auth error:', error);
      toast.error('ログインに失敗しました');
    }
  });
}

async function handleUserLogin(user) {
  state.user = user;
  state.profile = await getProfile(user.id);
  state.isStaff = await isStaff(user.id);

  if (!state.isStaff) {
    toast.error('スタッフ権限がありません');
    showAuthRequired();
    return;
  }

  showAdminContent();
  await loadInitialData();
}

function handleUserLogout() {
  state.user = null;
  state.profile = null;
  state.isStaff = false;
  showAuthRequired();
}

function showAuthRequired() {
  show($('#admin-auth-required'));
  hide($('#admin-content'));
}

function showAdminContent() {
  hide($('#admin-auth-required'));
  show($('#admin-content'));
}

// ============================================
// Navigation
// ============================================
function setupNavigation() {
  const tabs = $$('.admin-nav .tab-filter');
  const contents = {
    scan: $('#tab-scan'),
    schedule: $('#tab-schedule'),
    events: $('#tab-events'),
    articles: $('#tab-articles')
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');

      Object.values(contents).forEach(c => c.classList.add('hidden'));
      contents[tab.dataset.adminTab]?.classList.remove('hidden');
    });
  });
}

// ============================================
// QR Scanning
// ============================================
function setupQRScanner() {
  const startBtn = $('#start-scan-btn');
  const stopBtn = $('#stop-scan-btn');
  const video = $('#qr-video');

  startBtn?.addEventListener('click', async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      video.srcObject = stream;
      state.videoStream = stream;

      hide(startBtn);
      show(stopBtn);

      // QRスキャンループ開始
      scanQRCode();

    } catch (error) {
      console.error('Camera error:', error);
      toast.error('カメラを起動できません');
    }
  });

  stopBtn?.addEventListener('click', () => {
    stopScanning();
  });

  // 手動入力フォーム
  $('#manual-uid-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const uid = $('#manual-uid').value.trim();
    if (uid) {
      await lookupUser(uid);
    }
  });
}

function stopScanning() {
  if (state.videoStream) {
    state.videoStream.getTracks().forEach(track => track.stop());
    state.videoStream = null;
  }

  show($('#start-scan-btn'));
  hide($('#stop-scan-btn'));
}

async function scanQRCode() {
  const video = $('#qr-video');

  if (!state.videoStream || video.readyState !== video.HAVE_ENOUGH_DATA) {
    if (state.videoStream) {
      requestAnimationFrame(scanQRCode);
    }
    return;
  }

  try {
    // BarcodeDetector API を使用（対応ブラウザのみ）
    if ('BarcodeDetector' in window) {
      const barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
      const barcodes = await barcodeDetector.detect(video);

      if (barcodes.length > 0) {
        const data = barcodes[0].rawValue;
        await processQRData(data);
        stopScanning();
        return;
      }
    } else {
      // フォールバック：jsQRライブラリを使用（別途読み込み必要）
      console.log('BarcodeDetector not supported, use manual input');
    }
  } catch (error) {
    // スキャンエラーは無視して継続
  }

  if (state.videoStream) {
    requestAnimationFrame(scanQRCode);
  }
}

async function processQRData(data) {
  try {
    const parsed = JSON.parse(data);
    if (parsed.uid) {
      await lookupUser(parsed.uid);
    }
  } catch {
    // JSONでない場合、そのままUIDとして扱う
    await lookupUser(data);
  }
}

async function lookupUser(userId) {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      toast.error('ユーザーが見つかりません');
      return;
    }

    const balance = await getStampBalance(userId);

    state.scannedUserId = userId;

    $('#result-name').textContent = profile.display_name || 'ユーザー';
    $('#result-stamps').textContent = balance;
    $('#result-uid').textContent = userId;

    show($('#scan-result'));
    toast.success('ユーザーを検出しました');

  } catch (error) {
    console.error('Lookup error:', error);
    toast.error('検索に失敗しました');
  }
}

function setupStampActions() {
  // スタンプ付与
  $('#award-stamp-btn')?.addEventListener('click', async () => {
    if (!state.scannedUserId) return;

    try {
      const { data, error } = await supabase.functions.invoke('award-stamp', {
        body: {
          user_id: state.scannedUserId,
          reason: 'purchase_curry'
        }
      });

      if (error) throw error;

      if (data.error === 'DUPLICATE') {
        toast.error('短時間での重複付与はできません');
        return;
      }

      $('#result-stamps').textContent = data.new_balance;
      toast.success('+1 スタンプを付与しました');

    } catch (error) {
      console.error('Award stamp error:', error);
      toast.error('付与に失敗しました');
    }
  });

  // ドリンク交換
  $('#redeem-drink-btn')?.addEventListener('click', async () => {
    await redeemReward('drink');
  });

  // カレー交換
  $('#redeem-curry-btn')?.addEventListener('click', async () => {
    await redeemReward('curry');
  });
}

async function redeemReward(type) {
  if (!state.scannedUserId) return;

  const typeName = type === 'drink' ? 'ドリンク' : 'カレー';
  if (!confirm(`${typeName}と交換しますか？`)) return;

  try {
    const { data, error } = await supabase.functions.invoke('redeem-reward', {
      body: {
        user_id: state.scannedUserId,
        type,
        staff_id: state.user.id
      }
    });

    if (error) throw error;

    if (data.error) {
      toast.error(data.error);
      return;
    }

    $('#result-stamps').textContent = data.new_balance;
    toast.success(`${typeName}と交換しました`);

  } catch (error) {
    console.error('Redeem error:', error);
    toast.error('交換に失敗しました');
  }
}

// ============================================
// Schedule Management
// ============================================
async function loadSchedules() {
  const list = $('#schedule-list');

  try {
    const { data, error } = await supabase
      .from('schedule_assets')
      .select('*')
      .order('year_month', { ascending: false })
      .limit(12);

    if (error) throw error;

    if (!data || data.length === 0) {
      list.innerHTML = '<p class="text-muted">登録されたスケジュールはありません</p>';
      return;
    }

    list.innerHTML = data.map(item => `
      <div class="list-item" style="margin-bottom:var(--space-2)">
        <div class="list-item__content">
          <p class="list-item__title">${formatYearMonthJa(item.year_month)}</p>
          <p class="list-item__subtitle">${formatDate(item.updated_at)}</p>
        </div>
        <button class="btn btn--ghost btn--sm delete-schedule-btn" data-id="${item.id}">削除</button>
      </div>
    `).join('');

    // 削除ボタン
    $$('.delete-schedule-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('このスケジュールを削除しますか？')) return;
        await deleteSchedule(btn.dataset.id);
      });
    });

  } catch (error) {
    console.error('Load schedules error:', error);
    list.innerHTML = '<p class="text-error">読み込みに失敗しました</p>';
  }
}

function setupScheduleUpload() {
  const input = $('#schedule-image-input');
  const preview = $('#schedule-preview');
  const previewImg = $('#schedule-preview-img');

  // 今月をデフォルトに
  $('#schedule-month-input').value = formatYearMonth(new Date());

  input?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImg.src = e.target.result;
        show(preview);
      };
      reader.readAsDataURL(file);
    }
  });

  $('#upload-schedule-btn')?.addEventListener('click', async () => {
    const month = $('#schedule-month-input').value;
    const file = input?.files[0];

    if (!month || !file) {
      toast.error('月と画像を選択してください');
      return;
    }

    try {
      // Storageにアップロード
      const filePath = `${month}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('schedules')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // DBに登録（既存があれば更新）
      const { error: dbError } = await supabase
        .from('schedule_assets')
        .upsert({
          year_month: month,
          image_path: filePath,
          updated_at: new Date().toISOString()
        }, { onConflict: 'year_month' });

      if (dbError) throw dbError;

      toast.success('スケジュールを登録しました');
      input.value = '';
      hide(preview);
      await loadSchedules();

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('アップロードに失敗しました');
    }
  });
}

async function deleteSchedule(id) {
  try {
    const { error } = await supabase
      .from('schedule_assets')
      .delete()
      .eq('id', id);

    if (error) throw error;

    toast.success('削除しました');
    await loadSchedules();

  } catch (error) {
    console.error('Delete error:', error);
    toast.error('削除に失敗しました');
  }
}

// ============================================
// Events Management
// ============================================
async function loadEvents() {
  const list = $('#events-list');

  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('event_date', new Date().toISOString().split('T')[0])
      .order('event_date', { ascending: true })
      .limit(20);

    if (error) throw error;

    if (!data || data.length === 0) {
      list.innerHTML = '<p class="text-muted">登録されたイベントはありません</p>';
      return;
    }

    list.innerHTML = data.map(event => `
      <div class="event-card" style="margin-bottom:var(--space-3)">
        <div class="event-card__date">${formatShortDate(event.event_date)}</div>
        <h4 class="event-card__title">${event.title}</h4>
        ${event.location ? `<p class="text-muted">${event.location}</p>` : ''}
        <button class="btn btn--ghost btn--sm delete-event-btn" data-id="${event.id}" style="margin-top:var(--space-2)">削除</button>
      </div>
    `).join('');

    $$('.delete-event-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('このイベントを削除しますか？')) return;
        await deleteEvent(btn.dataset.id);
      });
    });

  } catch (error) {
    console.error('Load events error:', error);
    list.innerHTML = '<p class="text-error">読み込みに失敗しました</p>';
  }
}

function setupEventForm() {
  $('#event-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const eventData = {
      event_date: $('#event-date').value,
      title: $('#event-title').value,
      description: $('#event-description').value || null,
      location: $('#event-location').value || null,
      url: $('#event-url').value || null
    };

    try {
      const { error } = await supabase
        .from('events')
        .insert(eventData);

      if (error) throw error;

      toast.success('イベントを登録しました');
      e.target.reset();
      await loadEvents();

    } catch (error) {
      console.error('Create event error:', error);
      toast.error('登録に失敗しました');
    }
  });
}

async function deleteEvent(id) {
  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) throw error;

    toast.success('削除しました');
    await loadEvents();

  } catch (error) {
    console.error('Delete error:', error);
    toast.error('削除に失敗しました');
  }
}

// ============================================
// Articles Management
// ============================================
async function loadArticles() {
  const list = $('#articles-list');

  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    if (!data || data.length === 0) {
      list.innerHTML = '<p class="text-muted">登録された記事はありません</p>';
      return;
    }

    list.innerHTML = data.map(article => `
      <div class="card" style="margin-bottom:var(--space-3);padding:var(--space-4)">
        <div class="flex items-center gap-2" style="margin-bottom:var(--space-2)">
          <span class="pill pill--${article.is_published ? 'success' : 'default'}">${article.is_published ? '公開中' : '下書き'}</span>
          ${article.category ? `<span class="pill pill--primary">${article.category}</span>` : ''}
        </div>
        <h4 style="margin-bottom:var(--space-2)">${article.title}</h4>
        <p class="text-muted text-sm">${article.summary || ''}</p>
        <button class="btn btn--ghost btn--sm delete-article-btn" data-id="${article.id}" style="margin-top:var(--space-2)">削除</button>
      </div>
    `).join('');

    $$('.delete-article-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('この記事を削除しますか？')) return;
        await deleteArticle(btn.dataset.id);
      });
    });

  } catch (error) {
    console.error('Load articles error:', error);
    list.innerHTML = '<p class="text-error">読み込みに失敗しました</p>';
  }
}

function setupArticleForm() {
  $('#article-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const tagsInput = $('#article-tags').value;
    const tags = tagsInput
      ? tagsInput.split(',').map(t => t.trim()).filter(Boolean)
      : [];

    const articleData = {
      title: $('#article-title').value,
      category: $('#article-category').value || null,
      summary: $('#article-summary').value || null,
      image_url: $('#article-image').value || null,
      tags,
      is_published: $('#article-published').checked
    };

    try {
      const { error } = await supabase
        .from('articles')
        .insert(articleData);

      if (error) throw error;

      toast.success('記事を登録しました');
      e.target.reset();
      await loadArticles();

    } catch (error) {
      console.error('Create article error:', error);
      toast.error('登録に失敗しました');
    }
  });
}

async function deleteArticle(id) {
  try {
    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', id);

    if (error) throw error;

    toast.success('削除しました');
    await loadArticles();

  } catch (error) {
    console.error('Delete error:', error);
    toast.error('削除に失敗しました');
  }
}

// ============================================
// Forms Setup
// ============================================
function setupForms() {
  setupQRScanner();
  setupStampActions();
  setupScheduleUpload();
  setupEventForm();
  setupArticleForm();
}

// ============================================
// Initial Data Load
// ============================================
async function loadInitialData() {
  await Promise.all([
    loadSchedules(),
    loadEvents(),
    loadArticles()
  ]);
}
