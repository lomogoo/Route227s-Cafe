/**
 * Modal Component
 * ==================
 * モーダル表示制御
 */

import { $ } from '../utils/helpers.js';

class ModalManager {
  constructor() {
    this.activeModal = null;
    this.setupGlobalListeners();
  }

  setupGlobalListeners() {
    // バックドロップクリックで閉じる
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-backdrop') && this.activeModal) {
        this.close(this.activeModal.replace('-backdrop', ''));
      }
    });

    // ESCキーで閉じる
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModal) {
        this.close(this.activeModal.replace('-backdrop', ''));
      }
    });
  }

  open(modalId) {
    const backdrop = $(`#${modalId}-backdrop`);
    const modal = $(`#${modalId}`);

    if (!backdrop || !modal) {
      console.warn(`Modal not found: ${modalId}`);
      return;
    }

    // 前のモーダルを閉じる
    if (this.activeModal) {
      this.close(this.activeModal.replace('-backdrop', ''));
    }

    backdrop.classList.add('is-active');
    modal.classList.add('is-active');
    this.activeModal = `${modalId}-backdrop`;

    // スクロール無効化
    document.body.style.overflow = 'hidden';

    return modal;
  }

  close(modalId) {
    const backdrop = $(`#${modalId}-backdrop`);
    const modal = $(`#${modalId}`);

    if (!backdrop || !modal) return;

    backdrop.classList.remove('is-active');
    modal.classList.remove('is-active');
    this.activeModal = null;

    // スクロール復帰
    document.body.style.overflow = '';
  }

  isOpen(modalId) {
    return this.activeModal === `${modalId}-backdrop`;
  }
}

export const modal = new ModalManager();

// Confirm Modal
export function confirm(title, message) {
  return new Promise((resolve) => {
    const titleEl = $('#confirm-title');
    const messageEl = $('#confirm-message');
    const okBtn = $('#confirm-ok');
    const cancelBtn = $('#confirm-cancel');

    titleEl.textContent = title;
    messageEl.textContent = message;

    const cleanup = () => {
      okBtn.removeEventListener('click', handleOk);
      cancelBtn.removeEventListener('click', handleCancel);
      modal.close('confirm-modal');
    };

    const handleOk = () => {
      cleanup();
      resolve(true);
    };

    const handleCancel = () => {
      cleanup();
      resolve(false);
    };

    okBtn.addEventListener('click', handleOk);
    cancelBtn.addEventListener('click', handleCancel);

    modal.open('confirm-modal');
  });
}

export default modal;
