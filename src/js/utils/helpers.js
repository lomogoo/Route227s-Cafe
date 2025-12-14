/**
 * Utility Helpers
 * =================
 * 汎用ユーティリティ関数
 */

// ============================================
// DOM Helpers
// ============================================

// 要素を取得
export function $(selector, parent = document) {
  return parent.querySelector(selector);
}

export function $$(selector, parent = document) {
  return [...parent.querySelectorAll(selector)];
}

// 要素の表示/非表示
export function show(element) {
  if (!element) return;
  element.classList.remove('hidden');
}

export function hide(element) {
  if (!element) return;
  element.classList.add('hidden');
}

export function toggle(element, visible) {
  if (!element) return;
  if (visible === undefined) {
    element.classList.toggle('hidden');
  } else {
    element.classList.toggle('hidden', !visible);
  }
}

// クラスの追加/削除
export function addClass(element, ...classes) {
  if (!element) return;
  element.classList.add(...classes);
}

export function removeClass(element, ...classes) {
  if (!element) return;
  element.classList.remove(...classes);
}

// ============================================
// Format Helpers
// ============================================

// 日付フォーマット
export function formatDate(dateStr, options = {}) {
  const date = new Date(dateStr);
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  };
  return date.toLocaleDateString('ja-JP', defaultOptions);
}

// 短い日付
export function formatShortDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric'
  });
}

// 時刻フォーマット
export function formatTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// 相対時間
export function formatRelativeTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'たった今';
  if (diffMins < 60) return `${diffMins}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 7) return `${diffDays}日前`;
  return formatShortDate(dateStr);
}

// 数値フォーマット
export function formatNumber(num) {
  return new Intl.NumberFormat('ja-JP').format(num);
}

// グラム表示（g/kg自動切替）
export function formatGrams(grams) {
  if (grams >= 1000) {
    return { value: (grams / 1000).toFixed(1), unit: 'kg' };
  }
  return { value: grams, unit: 'g' };
}

// 年月フォーマット（YYYY-MM）
export function formatYearMonth(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// 年月表示（日本語）
export function formatYearMonthJa(yearMonth) {
  const [year, month] = yearMonth.split('-');
  return `${year}年${parseInt(month)}月`;
}

// ============================================
// Validation Helpers
// ============================================

// メールアドレス検証
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// 電話番号検証（日本）
export function isValidPhone(phone) {
  return /^[\d-]{10,13}$/.test(phone.replace(/\s/g, ''));
}

// ============================================
// Storage Helpers
// ============================================

// localStorage
export function setLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('localStorage not available:', e);
  }
}

export function getLocal(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

export function removeLocal(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn('localStorage not available:', e);
  }
}

// ============================================
// Animation Helpers
// ============================================

// カウントアップアニメーション
export function animateCount(element, from, to, duration = 1000) {
  const startTime = performance.now();
  const diff = to - from;

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // イージング
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(from + diff * easeOut);
    element.textContent = formatNumber(current);

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

// 要素にアニメーションクラスを追加
export function animate(element, animationClass, duration = 500) {
  return new Promise(resolve => {
    element.classList.add(animationClass);
    setTimeout(() => {
      element.classList.remove(animationClass);
      resolve();
    }, duration);
  });
}

// ============================================
// Misc Helpers
// ============================================

// デバウンス
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// スロットル
export function throttle(func, limit = 300) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// UUIDの先頭部分を取得（表示用）
export function shortId(uuid) {
  return uuid?.substring(0, 8) || '';
}

// URLパラメータを取得
export function getUrlParams() {
  return Object.fromEntries(new URLSearchParams(window.location.search));
}

// スリープ
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 現在位置を取得
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      error => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  });
}

// 野菜絵文字配列
export const VEGGIE_EMOJIS = ['🥕', '🍅', '🥬', '🧅', '🥔', '🌽', '🥦', '🍆', '🌶️', '🥒'];

// 野菜絵文字をランダムに取得
export function getRandomVeggies(count) {
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(VEGGIE_EMOJIS[Math.floor(Math.random() * VEGGIE_EMOJIS.length)]);
  }
  return result;
}

export default {
  $, $$,
  show, hide, toggle,
  addClass, removeClass,
  formatDate, formatShortDate, formatTime, formatRelativeTime,
  formatNumber, formatGrams, formatYearMonth, formatYearMonthJa,
  isValidEmail, isValidPhone,
  setLocal, getLocal, removeLocal,
  animateCount, animate,
  debounce, throttle,
  shortId, getUrlParams, sleep, getCurrentPosition,
  VEGGIE_EMOJIS, getRandomVeggies
};
