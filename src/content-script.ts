import { findPinContainer, extractMediaFromPin, PinterestMediaInfo, getPinIdFromUrl, extractTagsFromDOM } from './content/pinterest-detector';

// CSS chèn động vào Pinterest để định dạng overlay nổi và các nút
const OVERLAY_STYLE = `
  #video-ext-float {
    position: absolute;
    z-index: 999999;
    pointer-events: none;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.2s;
  }
  
  #video-ext-float.visible {
    opacity: 1;
    visibility: visible;
  }
  
  .video-ext-overlay {
    position: absolute;
    bottom: 12px;
    left: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 10px;
    border-radius: 9999px;
    background: rgba(15, 22, 36, 0.88);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    pointer-events: auto; /* Cho phép click */
  }
  
  .video-ext-badge-inline {
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 2.5px 7px;
    border-radius: 4px;
    color: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    transition: all 0.2s ease;
  }
  
  .video-ext-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    color: #ffffff;
    transition: all 0.2s ease;
    position: relative;
    outline: none;
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

  .video-ext-btn-dl.loading {
    background: #F59E0B !important; /* Màu vàng cam khi đang tải */
    pointer-events: none;
  }
  
  .video-ext-btn-dl.completed {
    background: #10B981 !important; /* Màu xanh lá khi hoàn thành */
    pointer-events: none;
    animation: pulse-added 0.4s ease-in-out;
  }
  
  .video-ext-spinner {
    animation: video-ext-spin 1s linear infinite;
  }
  
  @keyframes video-ext-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @keyframes pulse-added {
    0% { transform: scale(1); }
    50% { transform: scale(1.25); }
    100% { transform: scale(1); }
  }
  
  .video-ext-btn::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: 130%;
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
`;

// Chèn CSS vào trang
const styleEl = document.createElement('style');
styleEl.textContent = OVERLAY_STYLE;
document.head.appendChild(styleEl);

// SVGs cho các icon chuyên nghiệp
const ICONS = {
  cart: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`,
  check: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  download: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
  spinner: `<svg class="video-ext-spinner" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>`
};

// Tạo Floating Overlay Container duy nhất và chèn vào document.body
const floatContainer = document.createElement('div');
floatContainer.id = 'video-ext-float';

const overlayEl = document.createElement('div');
overlayEl.className = 'video-ext-overlay';

// Badge dạng chữ nằm chung trong thanh công cụ
const badgeInlineEl = document.createElement('span');
badgeInlineEl.className = 'video-ext-badge-inline';
badgeInlineEl.textContent = 'IMG';

const cartBtn = document.createElement('button');
cartBtn.className = 'video-ext-btn video-ext-btn-cart';
cartBtn.setAttribute('data-tooltip', 'Thêm vào giỏ hàng');
cartBtn.innerHTML = ICONS.cart;

const dlBtn = document.createElement('button');
dlBtn.className = 'video-ext-btn video-ext-btn-dl';
dlBtn.setAttribute('data-tooltip', 'Tải ngay');
dlBtn.innerHTML = ICONS.download;

overlayEl.appendChild(badgeInlineEl);
overlayEl.appendChild(cartBtn);
overlayEl.appendChild(dlBtn);
floatContainer.appendChild(overlayEl);
document.body.appendChild(floatContainer);

// State quản lý Pin hiện tại đang được hover
let currentPinElement: HTMLElement | null = null;
let currentMediaInfo: PinterestMediaInfo | null = null;
let pollInterval: ReturnType<typeof setInterval> | null = null;
let hideTimeout: ReturnType<typeof setTimeout> | null = null;

// Kiểm tra an toàn xem Extension Context có còn hợp lệ hay không (tránh lỗi Uncaught TypeError do reload extension mà chưa F5 tab)
function isExtensionContextValid(): boolean {
  return typeof chrome !== 'undefined' && chrome.runtime !== undefined && chrome.storage !== undefined && chrome.storage.local !== undefined;
}

// Hàm cập nhật UI theo MediaInfo
function updateFloatingUI(media: PinterestMediaInfo) {
  if (!isExtensionContextValid()) return;

  badgeInlineEl.textContent = media.type === 'video' ? 'MP4' : 'IMG';
  if (media.type === 'video') {
    badgeInlineEl.style.background = '#E63946'; // Đỏ tươi cho video
    dlBtn.setAttribute('data-tooltip', 'Tải ngay (Video)');
  } else {
    badgeInlineEl.style.background = '#5D5FEF'; // Tím cho ảnh
    dlBtn.setAttribute('data-tooltip', 'Tải ngay (Ảnh gốc)');
  }
  
  // Kiểm tra xem đã có trong giỏ hàng chưa
  void (async () => {
    try {
      if (!isExtensionContextValid()) return;
      const cartData = await chrome.storage.local.get('video_ext_cart');
      const items = cartData.video_ext_cart || [];
      const isAlreadyInCart = items.some((item: any) => item.id === media.id);
      
      if (isAlreadyInCart) {
        cartBtn.classList.add('added');
        cartBtn.innerHTML = ICONS.check;
        cartBtn.setAttribute('data-tooltip', 'Đã trong giỏ hàng');
      } else {
        cartBtn.classList.remove('added');
        cartBtn.innerHTML = ICONS.cart;
        cartBtn.setAttribute('data-tooltip', 'Thêm vào giỏ hàng');
      }
    } catch (e) {}
  })();

  // Kiểm tra xem đã tải xuống thành công chưa
  void (async () => {
    try {
      if (!isExtensionContextValid()) return;
      const data = await chrome.storage.local.get('video_ext_downloaded_ids');
      const downloadedIds = data.video_ext_downloaded_ids || [];
      const isDownloaded = downloadedIds.includes(media.id);
      
      if (isDownloaded) {
        dlBtn.classList.add('completed');
        dlBtn.classList.remove('loading');
        dlBtn.innerHTML = ICONS.check;
        dlBtn.setAttribute('data-tooltip', 'Đã tải xuống thành công!');
      } else {
        dlBtn.classList.remove('completed', 'loading');
        dlBtn.innerHTML = ICONS.download;
        dlBtn.setAttribute('data-tooltip', media.type === 'video' ? 'Tải ngay (Video)' : 'Tải ngay (Ảnh gốc)');
      }
    } catch (e) {}
  })();
}

// Xử lý Thêm vào giỏ
cartBtn.addEventListener('click', async (evt) => {
  evt.preventDefault();
  evt.stopPropagation();
  
  if (!isExtensionContextValid()) {
    console.warn('[video-ext] Extension context bị ngắt kết nối. Vui lòng F5 reload trang Pinterest!');
    return;
  }
  
  if (!currentMediaInfo || cartBtn.classList.contains('added')) return;
  
  try {
    const currentCart = await chrome.storage.local.get('video_ext_cart');
    const itemsList = currentCart.video_ext_cart || [];
    const settingsData = await chrome.storage.local.get('video_ext_settings');
    const defaultTag = settingsData.video_ext_settings?.defaultTag || 'default';
    
    const exists = itemsList.some((item: any) => item.id === currentMediaInfo!.id);
    if (!exists) {
      const newItem = {
        ...currentMediaInfo,
        tag: defaultTag,
        addedAt: Date.now(),
        status: 'pending'
      };
      await chrome.storage.local.set({ video_ext_cart: [newItem, ...itemsList] });
      void chrome.runtime.sendMessage({ type: 'ADD_TO_CART_SUCCESS' });
    }
    
    cartBtn.classList.add('added');
    cartBtn.innerHTML = ICONS.check;
    cartBtn.setAttribute('data-tooltip', 'Đã thêm thành công!');
  } catch (err) {
    console.error('[video-ext] Lỗi thêm vào giỏ:', err);
  }
});

// Xử lý Tải ngay
dlBtn.addEventListener('click', (evt) => {
  evt.preventDefault();
  evt.stopPropagation();
  
  if (!isExtensionContextValid()) {
    console.warn('[video-ext] Extension context bị ngắt kết nối. Vui lòng F5 reload trang Pinterest!');
    return;
  }
  
  if (!currentMediaInfo) return;
  
  chrome.runtime.sendMessage({
    type: 'DOWNLOAD_SINGLE_ITEM',
    item: {
      ...currentMediaInfo,
      tag: 'default',
      addedAt: Date.now(),
      status: 'pending'
    }
  });
  
  dlBtn.style.transform = 'scale(0.85)';
  setTimeout(() => {
    dlBtn.style.transform = '';
  }, 150);
});

// Hàm hiển thị Floating Overlay đè lên đúng tọa độ Pin
async function showFloatingOverlay(pinEl: HTMLElement, media: PinterestMediaInfo) {
  if (!isExtensionContextValid()) return;

  // 1. Kiểm tra cấu hình videoOnly để tự động lọc Ảnh
  try {
    const settingsData = await chrome.storage.local.get('video_ext_settings');
    const videoOnly = settingsData.video_ext_settings?.videoOnly ?? true; // Mặc định bật tối ưu B-Roll
    if (videoOnly && media.type === 'image') {
      hideFloatingOverlay();
      return;
    }
  } catch (e) {}

  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }
  
  currentPinElement = pinEl;
  currentMediaInfo = media;
  
  // Tính toán tọa độ tuyệt đối so với tài liệu
  const rect = pinEl.getBoundingClientRect();
  const top = rect.top + window.scrollY;
  const left = rect.left + window.scrollX;
  
  // Áp dụng tọa độ và kích thước khớp chính xác với Pin card
  floatContainer.style.top = `${top}px`;
  floatContainer.style.left = `${left}px`;
  floatContainer.style.width = `${rect.width}px`;
  floatContainer.style.height = `${rect.height}px`;
  
  updateFloatingUI(media);
  
  floatContainer.classList.add('visible');
  
  // Bắt đầu polling để theo dõi lazy load video
  if (pollInterval) clearInterval(pollInterval);
  let pollCount = 0;
  pollInterval = setInterval(() => {
    pollCount++;
    if (pollCount > 10 || currentPinElement !== pinEl) {
      if (pollInterval) clearInterval(pollInterval);
      return;
    }
    
    const newInfo = extractMediaFromPin(pinEl);
    if (newInfo && newInfo.type === 'video' && currentMediaInfo) {
      if (currentMediaInfo.type !== 'video') {
        currentMediaInfo = newInfo;
        updateFloatingUI(newInfo);
      } else if (newInfo.url && newInfo.url !== currentMediaInfo.url) {
        currentMediaInfo.url = newInfo.url;
      }
      
      if (newInfo.url && !newInfo.url.startsWith('blob:')) {
        if (pollInterval) clearInterval(pollInterval);
      }
    }
  }, 250);
}

// Hàm ẩn Floating Overlay
function hideFloatingOverlay() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  
  floatContainer.classList.remove('visible');
  currentPinElement = null;
  currentMediaInfo = null;
}

// Lắng nghe di chuột toàn trang tối ưu bằng mouseover bong bóng tự nhiên
document.addEventListener('mouseover', (e) => {
  if (!isExtensionContextValid()) return;
  const target = e.target as HTMLElement;
  if (!target) return;
  
  // Rê chuột lên chính cụm nút overlay nổi của chúng ta, giữ nguyên overlay
  if (floatContainer.contains(target)) {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    return;
  }

  // 1. PHÁT HIỆN VIDEO CHÍNH ĐANG PHÁT TRÊN TRANG CHI TIẾT (Closeup Video)
  let isCloseupVideo = false;
  let videoTarget: HTMLVideoElement | null = null;
  
  if (target.tagName === 'VIDEO') {
    videoTarget = target as HTMLVideoElement;
    isCloseupVideo = true;
  } else if (target.querySelector('video')) {
    videoTarget = target.querySelector('video') as HTMLVideoElement;
    isCloseupVideo = true;
  } else if (target.closest('[data-test-id="visual-content-container"]') || target.closest('[data-test-id="closeup-image"]')) {
    // Có thể hover lên lớp overlay trong suốt của Pinterest phủ lên video chính
    const parentContainer = target.closest('[data-test-id="visual-content-container"]') || target.closest('[data-test-id="closeup-image"]');
    const v = parentContainer?.querySelector('video');
    if (v) {
      videoTarget = v as HTMLVideoElement;
      isCloseupVideo = true;
    }
  }

  if (isCloseupVideo && videoTarget) {
    const pinId = getPinIdFromUrl(window.location.href);
    if (pinId) {
      const videoUrl = videoTarget.src || '';
      if (videoUrl && !videoUrl.startsWith('blob:')) {
        const videoContainer = videoTarget.parentElement || videoTarget;
        
        // Hủy timeout ẩn nếu di chuyển trong vùng video chính
        if (hideTimeout) {
          clearTimeout(hideTimeout);
          hideTimeout = null;
        }

        if (currentPinElement !== videoContainer) {
          const media: PinterestMediaInfo = {
            id: pinId,
            url: videoUrl,
            thumbnail: '',
            type: 'video',
            pageUrl: window.location.href,
            title: document.querySelector('h1')?.textContent || 'Pinterest Video',
            tags: extractTagsFromDOM(pinId) // Bóc tag sạch tự động từ DOM thật của tab
          };
          showFloatingOverlay(videoContainer, media);
        }
        return;
      }
    }
  }
  
  const pinContainer = findPinContainer(target);
  if (pinContainer) {
    // Nếu chuột đi vào Pin mới
    if (currentPinElement !== pinContainer) {
      const media = extractMediaFromPin(pinContainer);
      if (media) {
        showFloatingOverlay(pinContainer, media);
      }
    } else {
      // Nếu vẫn ở Pin cũ, hủy timeout ẩn
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
    }
  } else {
    // Chuột rời khỏi mọi Pin và không nằm trên overlay nổi, đếm ngược để ẩn đi mượt mà
    if (currentPinElement && !hideTimeout) {
      hideTimeout = setTimeout(() => {
        hideFloatingOverlay();
      }, 400); // 400ms đủ lâu để di chuyển chuột mượt mà không bị tắt bất ngờ
    }
  }
});

// Hàm cập nhật trạng thái hiển thị của nút Download (Normal, Xoay loading, Hoàn thành check)
function updateDownloadButtonState(status: 'downloading' | 'completed' | 'failed') {
  if (status === 'downloading') {
    dlBtn.classList.add('loading');
    dlBtn.classList.remove('completed');
    dlBtn.innerHTML = ICONS.spinner;
    dlBtn.setAttribute('data-tooltip', 'Đang tải file xuống...');
  } else if (status === 'completed') {
    dlBtn.classList.remove('loading');
    dlBtn.classList.add('completed');
    dlBtn.innerHTML = ICONS.check;
    dlBtn.setAttribute('data-tooltip', 'Đã tải xuống thành công!');
  } else {
    // Thất bại hoặc khôi phục
    dlBtn.classList.remove('loading', 'completed');
    dlBtn.innerHTML = ICONS.download;
    dlBtn.setAttribute('data-tooltip', currentMediaInfo?.type === 'video' ? 'Tải ngay (Video)' : 'Tải ngay (Ảnh gốc)');
  }
}

// Lắng nghe tin nhắn broadcast từ Background để cập nhật trạng thái download theo thời gian thực
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message) => {
    if (!isExtensionContextValid()) return;
    
    if (message.type === 'DOWNLOAD_STATUS_UPDATE') {
      const { itemId, status } = message;
      if (currentMediaInfo && currentMediaInfo.id === itemId) {
        updateDownloadButtonState(status);
      }
    }
  });
}

// Hàm lọc ẩn/hiện các bài viết hình ảnh dựa trên cài đặt videoOnly (Chỉ giữ lại video B-Roll)
async function filterPins() {
  if (!isExtensionContextValid()) return;
  try {
    const settingsData = await chrome.storage.local.get('video_ext_settings');
    const videoOnly = settingsData.video_ext_settings?.videoOnly ?? true; // Mặc định bật tối ưu B-Roll
    
    const pinContainers = document.querySelectorAll('[data-test-pin-id]');
    pinContainers.forEach((pinEl) => {
      const el = pinEl as HTMLElement;
      
      // Đọc cache loại media để tối ưu hiệu năng tuyệt đối không gây giật lag trang
      let mediaType = el.getAttribute('data-media-detected');
      
      if (!mediaType) {
        const media = extractMediaFromPin(el);
        if (media) {
          mediaType = media.type;
          el.setAttribute('data-media-detected', media.type);
        }
      }
      
      if (mediaType === 'image') {
        if (videoOnly) {
          el.style.display = 'none'; // Ẩn biến mất tăm bài viết là hình ảnh!
        } else {
          el.style.display = ''; // Khôi phục hiển thị nếu người dùng tắt cài đặt
        }
      }
    });
  } catch (e) {}
}

// Khởi chạy vòng quét lọc Pin mỗi 300ms để bắt kịp tốc độ cuộn chuột tải trang của Pinterest
setInterval(filterPins, 300);
setTimeout(filterPins, 1000);

// Lập tức áp dụng thay đổi khi người dùng bật/tắt Toggle trong trang cấu hình
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.video_ext_settings) {
      void filterPins();
    }
  });
}
