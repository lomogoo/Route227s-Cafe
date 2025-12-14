/**
 * Toast Component
 * =================
 * トースト通知
 */

import { $ } from '../utils/helpers.js';

class Toast {
  constructor() {
    this.container = $('#toast-container');
    this.timeout = null;
  }

  show(message, type = 'default', duration = 3000) {
    // 既存のトーストをクリア
    this.hide();

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <span>${message}</span>
    `;

    this.container.appendChild(toast);

    // アニメーション用に少し遅延
    requestAnimationFrame(() => {
      toast.classList.add('is-active');
    });

    // 自動で消える
    this.timeout = setTimeout(() => {
      this.hide();
    }, duration);

    return toast;
  }

  hide() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    const toast = this.container.querySelector('.toast');
    if (toast) {
      toast.classList.remove('is-active');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }
  }

  success(message, duration) {
    return this.show(message, 'success', duration);
  }

  error(message, duration) {
    return this.show(message, 'error', duration);
  }

  info(message, duration) {
    return this.show(message, 'default', duration);
  }
}

export const toast = new Toast();
export default toast;
