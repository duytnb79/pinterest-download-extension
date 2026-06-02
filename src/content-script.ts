import { findPinContainer, extractMediaFromPin } from './content/pinterest-detector';

// CSS chèn động vào Pinterest để định dạng overlay và animation
const OVERLAY_STYLE = `
  .video-ext-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    z-index: 9999;
    display: flex;
    gap: 8px;
    padding: 6px;
    border-radius: 9999px;
    background: rgba(15, 22, 36, 0.75);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    opacity: 0;
    transform: translate(-50%, calc(-50% - 5px)) scale(0.95);
    transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: auto;
  }
  
  .video-ext-overlay.visible {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  
  .video-ext-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    color: #ffffff;
    transition: all 0.2s ease;
    position: relative;
    outline: none;
  }
  
  .video-ext-btn-cart {
    background: rgba(255, 255, 255, 0.1);
  }
  
  .video-ext-btn-cart:hover {
    background: #5D5FEF;
    transform: scale(1.08);
  }
  
  .video-ext-btn-cart.added {
    background: #10B981 !important;
    animation: pulse-added 0.4s ease-in-out;
  }
  
  .video-ext-btn-dl {
    background: #E63946;
  }
  
  .video-ext-btn-dl:hover {
    background: #D62828;
    transform: scale(1.08);
  }
  
  @keyframes pulse-added {
    0% { transform: scale(1); }
    50% { transform: scale(1.25); }
    100% { transform: scale(1); }
  }
  
  .video-ext-btn::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: 125%;
    left: 50%;
    transform: translateX(-50%) translateY(4px);
    background: #0f1524;
    color: #ffffff;
    font-size: 11px;
    font-weight: 500;
    padding: 4px 8px;
    border-radius: 4px;
    white-space: nowrap;
    opacity: 0;
    visibility: hidden;
    transition: all 0.15s ease;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 4px 10px rgba(0,0,0,0.4);
    pointer-events: none;
  }
  
  .video-ext-btn:hover::after {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(0);
  }

  .video-ext-badge {
    position: absolute;
    bottom: 12px;
    left: 12px;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: rgba(15, 22, 36, 0.7);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #ffffff;
    pointer-events: none;
    z-index: 9998;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  [data-test-pin-id]:hover .video-ext-badge {
    opacity: 1;
  }
`;

const styleEl = document.createElement('style');
styleEl.textContent = OVERLAY_STYLE;
document.head.appendChild(styleEl);

const ICONS = {
  cart: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`,
  check: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  download: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`
};

interface OverlayState {
  overlay: HTMLElement;
  badge: HTMLElement;
  cartBtn: HTMLButtonElement;
  dlBtn: HTMLButtonElement;
  pollInterval?: ReturnType<typeof setInterval>;
  removeTimeout?: ReturnType<typeof setTimeout>;
  mediaInfo: any;
}

const overlayStateMap = new WeakMap<HTMLElement, OverlayState>();

document.addEventListener('mouseenter', async (e) => {
  const target = e.target as HTMLElement;
  if (!target) return;

  const pinContainer = findPinContainer(target);
  if (!pinContainer) return;

  if (window.getComputedStyle(pinContainer).position === 'static') {
    pinContainer.style.position = 'relative';
  }

  // Khôi phục nếu đã có overlay
  const existingState = overlayStateMap.get(pinContainer);
  if (existingState) {
    if (existingState.removeTimeout) {
      clearTimeout(existingState.removeTimeout);
      existingState.removeTimeout = undefined;
    }
    existingState.overlay.classList.add('visible');
    existingState.badge.style.opacity = '1';
    return;
  }

  // Trích xuất media ban đầu
  let mediaInfo = extractMediaFromPin(pinContainer);
  if (!mediaInfo) return;

  const badge = document.createElement('div');
  badge.className = 'video-ext-badge';
  badge.textContent = mediaInfo.type;
  if (mediaInfo.type === 'video') {
    badge.style.borderLeft = '3px solid #E63946';
  } else {
    badge.style.borderLeft = '3px solid #5D5FEF';
  }

  const overlay = document.createElement('div');
  overlay.className = 'video-ext-overlay';

  const cartBtn = document.createElement('button');
  cartBtn.className = 'video-ext-btn video-ext-btn-cart';
  cartBtn.setAttribute('data-tooltip', 'Thêm vào giỏ hàng');
  cartBtn.innerHTML = ICONS.cart;

  const dlBtn = document.createElement('button');
  dlBtn.className = 'video-ext-btn video-ext-btn-dl';
  dlBtn.setAttribute('data-tooltip', `Tải ngay (${mediaInfo.type === 'video' ? 'Video' : 'Ảnh gốc'})`);
  dlBtn.innerHTML = ICONS.download;

  const state: OverlayState = {
    overlay,
    badge,
    cartBtn,
    dlBtn,
    mediaInfo
  };
  overlayStateMap.set(pinContainer, state);

  // Khởi tạo trạng thái Added
  try {
    const cartData = await chrome.storage.local.get('video_ext_cart');
    const items = cartData.video_ext_cart || [];
    if (items.some((item: any) => item.id === state.mediaInfo.id)) {
      cartBtn.classList.add('added');
      cartBtn.innerHTML = ICONS.check;
      cartBtn.setAttribute('data-tooltip', 'Đã trong giỏ hàng');
    }
  } catch (err) {}

  // Gán sự kiện Click
  cartBtn.addEventListener('click', async (evt) => {
    evt.preventDefault();
    evt.stopPropagation();
    if (cartBtn.classList.contains('added')) return;
    try {
      const currentCart = await chrome.storage.local.get('video_ext_cart');
      const itemsList = currentCart.video_ext_cart || [];
      const settingsData = await chrome.storage.local.get('video_ext_settings');
      const defaultTag = settingsData.video_ext_settings?.defaultTag || 'default';

      if (!itemsList.some((item: any) => item.id === state.mediaInfo.id)) {
        const newItem = {
          ...state.mediaInfo,
          tag: defaultTag,
          addedAt: Date.now(),
          status: 'pending'
        };
        await chrome.storage.local.set({ video_ext_cart: [newItem, ...itemsList] });
        chrome.runtime.sendMessage({ type: 'ADD_TO_CART_SUCCESS' });
      }
      cartBtn.classList.add('added');
      cartBtn.innerHTML = ICONS.check;
      cartBtn.setAttribute('data-tooltip', 'Đã thêm thành công!');
    } catch (err) {}
  });

  dlBtn.addEventListener('click', (evt) => {
    evt.preventDefault();
    evt.stopPropagation();
    chrome.runtime.sendMessage({
      type: 'DOWNLOAD_SINGLE_ITEM',
      item: {
        ...state.mediaInfo,
        tag: 'default',
        addedAt: Date.now(),
        status: 'pending'
      }
    });
    dlBtn.style.transform = 'scale(0.85)';
    setTimeout(() => dlBtn.style.transform = '', 150);
  });

  // Gắn vào DOM
  overlay.appendChild(cartBtn);
  overlay.appendChild(dlBtn);
  pinContainer.appendChild(badge);
  pinContainer.appendChild(overlay);

  setTimeout(() => overlay.classList.add('visible'), 10);

  // Polling để cập nhật Video
  let pollCount = 0;
  state.pollInterval = setInterval(() => {
    pollCount++;
    if (pollCount > 10) { 
      clearInterval(state.pollInterval);
      state.pollInterval = undefined;
      return;
    }
    const newInfo = extractMediaFromPin(pinContainer);
    if (newInfo && newInfo.type === 'video') {
      if (state.mediaInfo.type !== 'video') {
        state.mediaInfo = newInfo;
        badge.textContent = 'video';
        badge.style.borderLeft = '3px solid #E63946';
        dlBtn.setAttribute('data-tooltip', 'Tải ngay (Video)');
      } else if (newInfo.url && newInfo.url !== state.mediaInfo.url) {
        state.mediaInfo.url = newInfo.url;
      }
      if (newInfo.url && !newInfo.url.startsWith('blob:')) {
        clearInterval(state.pollInterval);
        state.pollInterval = undefined;
      }
    }
  }, 200);

  // Xử lý Mouseleave với Timeout
  const handleMouseLeave = () => {
    overlay.classList.remove('visible');
    badge.style.opacity = '0';
    
    if (state.pollInterval) {
      clearInterval(state.pollInterval);
      state.pollInterval = undefined;
    }

    state.removeTimeout = setTimeout(() => {
      overlay.remove();
      badge.remove();
      overlayStateMap.delete(pinContainer);
      pinContainer.removeEventListener('mouseleave', handleMouseLeave);
    }, 250);
  };
  
  pinContainer.addEventListener('mouseleave', handleMouseLeave);

}, true);
