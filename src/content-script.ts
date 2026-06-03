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
  
  .video-ext-btn-cart.added:hover {
    background: #EF4444 !important;
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

// Dynamically inject CSS styles into Pinterest page
const styleEl = document.createElement('style');
styleEl.textContent = OVERLAY_STYLE;
document.head.appendChild(styleEl);

// SVG code for UI icons
const ICONS = {
  cart: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`,
  check: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  remove: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
  download: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
  spinner: `<svg class="video-ext-spinner" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>`
};

// Safe check to verify if the Extension Context is still valid (prevents Uncaught TypeError after extension reload without refreshing page)
function isExtensionContextValid(): boolean {
  return typeof chrome !== 'undefined' && chrome.runtime !== undefined && chrome.storage !== undefined && chrome.storage.local !== undefined;
}

// Create and inject download overlay directly into the media container element
async function injectDownloadOverlay(containerEl: HTMLElement, media: PinterestMediaInfo) {
  if (containerEl.querySelector('.video-ext-overlay')) return;

  // Ensure parent container is positioned relatively/absolutely to place overlay at bottom-left
  const style = window.getComputedStyle(containerEl);
  if (style.position !== 'relative' && style.position !== 'absolute' && style.position !== 'fixed') {
    containerEl.style.position = 'relative';
  }

  const overlay = document.createElement('div');
  overlay.className = 'video-ext-overlay';
  overlay.style.pointerEvents = 'auto';
  overlay.style.zIndex = '9999';

  const badge = document.createElement('span');
  badge.className = 'video-ext-badge-inline';
  badge.textContent = media.type === 'video' ? 'MP4' : 'IMG';
  badge.style.background = media.type === 'video' ? '#E63946' : '#5D5FEF';

  const cartBtn = document.createElement('button');
  cartBtn.className = 'video-ext-btn video-ext-btn-cart';
  cartBtn.setAttribute('data-tooltip', 'Add to Queue');
  cartBtn.innerHTML = ICONS.cart;

  const dlBtn = document.createElement('button');
  dlBtn.className = 'video-ext-btn video-ext-btn-dl';
  dlBtn.setAttribute('data-tooltip', media.type === 'video' ? 'Download Video' : 'Download Image');
  dlBtn.innerHTML = ICONS.download;

  overlay.appendChild(badge);
  overlay.appendChild(cartBtn);
  overlay.appendChild(dlBtn);
  containerEl.appendChild(overlay);

  // Update the visual status of overlay buttons
  const updateBtnUI = async () => {
    if (!isExtensionContextValid()) return;
    try {
      const cartData = await chrome.storage.local.get('video_ext_cart');
      const items = cartData.video_ext_cart || [];
      const isAlreadyInCart = items.some((item: any) => item.id === media.id);

      if (isAlreadyInCart) {
        cartBtn.classList.add('added');
        cartBtn.innerHTML = ICONS.check;
        cartBtn.setAttribute('data-tooltip', 'Remove from Queue');
      } else {
        cartBtn.classList.remove('added');
        cartBtn.innerHTML = ICONS.cart;
        cartBtn.setAttribute('data-tooltip', 'Add to Queue');
      }
    } catch (e) { }

    try {
      const activeData = await chrome.storage.local.get('video_ext_active_downloads');
      const activeDownloads = activeData.video_ext_active_downloads || [];
      const isCurrentlyDownloading = activeDownloads.includes(media.id);

      const data = await chrome.storage.local.get('video_ext_downloaded_ids');
      const downloadedIds = data.video_ext_downloaded_ids || [];
      const isDownloaded = downloadedIds.includes(media.id);

      if (isCurrentlyDownloading) {
        dlBtn.classList.add('loading');
        dlBtn.classList.remove('completed');
        dlBtn.innerHTML = ICONS.spinner;
        dlBtn.setAttribute('data-tooltip', 'Downloading...');
      } else if (isDownloaded) {
        dlBtn.classList.add('completed');
        dlBtn.classList.remove('loading');
        dlBtn.innerHTML = ICONS.check;
        dlBtn.setAttribute('data-tooltip', 'Downloaded successfully!');
      } else {
        dlBtn.classList.remove('completed', 'loading');
        dlBtn.innerHTML = ICONS.download;
        dlBtn.setAttribute('data-tooltip', media.type === 'video' ? 'Download Video' : 'Download Image');
      }
    } catch (e) { }
  };
  void updateBtnUI();

  // Nút thêm vào giỏ
  cartBtn.addEventListener('click', async (evt) => {
    evt.preventDefault();
    evt.stopPropagation();

    if (!isExtensionContextValid()) return;

    const isAdded = cartBtn.classList.contains('added');

    try {
      const currentCart = await chrome.storage.local.get('video_ext_cart');
      let itemsList = currentCart.video_ext_cart || [];

      if (isAdded) {
        // Xóa khỏi giỏ
        itemsList = itemsList.filter((item: any) => item.id !== media.id);
        await chrome.storage.local.set({ video_ext_cart: itemsList });
        void chrome.runtime.sendMessage({ type: 'UPDATE_BADGE' });

        cartBtn.classList.remove('added');
        cartBtn.innerHTML = ICONS.cart;
        cartBtn.setAttribute('data-tooltip', 'Add to Queue');
      } else {
        // Thêm vào giỏ
        const settingsData = await chrome.storage.local.get('video_ext_settings');
        const defaultTag = settingsData.video_ext_settings?.defaultTag || 'default';

        const exists = itemsList.some((item: any) => item.id === media.id);
        if (!exists) {
          const newItem = {
            ...media,
            tag: defaultTag,
            addedAt: Date.now(),
            status: 'pending'
          };
          await chrome.storage.local.set({ video_ext_cart: [newItem, ...itemsList] });
          void chrome.runtime.sendMessage({ type: 'ADD_TO_CART_SUCCESS' });
        }

        cartBtn.classList.add('added');
        cartBtn.innerHTML = ICONS.remove;
        cartBtn.setAttribute('data-tooltip', 'Remove from Queue');
      }

      // Synchronize state across cards sharing the same ID (e.g. grid vs closeup panels)
      window.dispatchEvent(new CustomEvent('video-ext-sync-ui', { detail: { id: media.id } }));
    } catch (err) {
      console.error('[video-ext] Error processing cart:', err);
    }
  });

  // Mouse hover event for added state to show dynamic change
  cartBtn.addEventListener('mouseenter', () => {
    if (cartBtn.classList.contains('added')) {
      cartBtn.innerHTML = ICONS.remove;
    }
  });

  cartBtn.addEventListener('mouseleave', () => {
    if (cartBtn.classList.contains('added')) {
      cartBtn.innerHTML = ICONS.check;
    }
  });

  // Direct Download button
  dlBtn.addEventListener('click', async (evt) => {
    evt.preventDefault();
    evt.stopPropagation();

    if (!isExtensionContextValid()) return;
    if (dlBtn.classList.contains('loading') || dlBtn.classList.contains('completed')) return;

    let defaultTag = 'default';
    try {
      const settingsData = await chrome.storage.local.get('video_ext_settings');
      defaultTag = settingsData.video_ext_settings?.defaultTag || 'default';
    } catch (e) { }

    chrome.runtime.sendMessage({
      type: 'DOWNLOAD_SINGLE_ITEM',
      item: {
        ...media,
        tag: defaultTag,
        addedAt: Date.now(),
        status: 'pending'
      }
    });

    dlBtn.classList.add('loading');
    dlBtn.innerHTML = ICONS.spinner;
    dlBtn.setAttribute('data-tooltip', 'Downloading...');
  });

  // Listen to global UI sync events
  const syncHandler = (e: Event) => {
    if (!overlay.isConnected) {
      window.removeEventListener('video-ext-sync-ui', syncHandler);
      return;
    }
    const detail = (e as CustomEvent).detail;
    if (detail && detail.id === media.id) {
      void updateBtnUI();
    }
  };
  window.addEventListener('video-ext-sync-ui', syncHandler);
}

// Scan full page and inject download overlays onto media items
async function scanAndInjectOverlays() {
  if (!isExtensionContextValid()) return;

  let videoOnly = true;
  try {
    const settingsData = await chrome.storage.local.get('video_ext_settings');
    videoOnly = settingsData.video_ext_settings?.videoOnly ?? true;
  } catch (e) { }

  // 1. Scan all Pin containers (grid cards)
  const pinContainers = document.querySelectorAll('[data-test-pin-id]');
  pinContainers.forEach((pinEl) => {
    try {
      const el = pinEl as HTMLElement;
      if (el.querySelector('.video-ext-overlay')) return;

      const media = extractMediaFromPin(el);
      if (!media) return;

      // Skip image items if videoOnly optimization is active
      if (videoOnly && media.type === 'image') return;

      void injectDownloadOverlay(el, media);
    } catch (e) { }
  });

  // 2. Scan <video> tags outside grid (such as closeup details panel)
  const videos = document.querySelectorAll('video');
  videos.forEach((video) => {
    try {
      const parent = video.parentElement;
      if (!parent || parent.querySelector('.video-ext-overlay')) return;

      // Skip if this video is nested within a grid card processed in step 1
      if (video.closest('[data-test-pin-id]')) return;

      const pinId = getPinIdFromUrl(window.location.href);
      if (!pinId) return;

      const media: PinterestMediaInfo = {
        id: pinId,
        url: video.src || video.getAttribute('data-src') || '',
        thumbnail: video.getAttribute('poster') || video.poster || '',
        type: 'video',
        pageUrl: `https://www.pinterest.com/pin/${pinId}/`,
        title: document.querySelector('h1')?.textContent || 'Pinterest Video',
        tags: extractTagsFromDOM(pinId)
      };

      void injectDownloadOverlay(parent, media);
    } catch (e) { }
  });
}

// Sync download status updates broadcasted from the background script
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message) => {
    if (!isExtensionContextValid()) return;

    if (message.type === 'DOWNLOAD_STATUS_UPDATE') {
      const { itemId, status } = message;
      // Dispatch custom event to trigger card overlay UI updates
      window.dispatchEvent(new CustomEvent('video-ext-sync-ui', { detail: { id: itemId } }));
    }
  });
}

// Rearrange Masonry grid items to fill empty spaces caused by hidden static image cards
function rearrangeGrid(videoOnly: boolean) {
  const pinContainers = document.querySelectorAll('[data-test-pin-id]');
  if (pinContainers.length === 0) return;

  // Group Pin wrappers by columns based on left position coordinate
  const columns: Record<number, HTMLElement[]> = {};

  pinContainers.forEach((pinEl) => {
    const el = pinEl as HTMLElement;

    // Find the absolute positioned parent wrapper of the Pin card
    const wrapper = el.closest('[style*="position: absolute"]') as HTMLElement;
    if (!wrapper) return;

    if (el.style.display === 'none') {
      // If Pin card is hidden
      wrapper.style.opacity = '0';
      wrapper.style.pointerEvents = 'none';
      wrapper.style.height = '0px';
      wrapper.style.transform = 'scale(0)'; // Hide smoothly
      return;
    } else {
      wrapper.style.opacity = '1';
      wrapper.style.pointerEvents = 'auto';
      wrapper.style.height = '';
      wrapper.style.transform = ''; // Restore
    }

    const leftMatch = wrapper.style.left.match(/(-?\d+(\.\d+)?)/);
    if (!leftMatch) return;
    const leftVal = Math.round(parseFloat(leftMatch[1]));

    if (!columns[leftVal]) {
      columns[leftVal] = [];
    }
    columns[leftVal].push(wrapper);
  });

  // Pinterest vertical gap (defaults to 16px)
  const gap = 16;

  // Rearrange top coordinates column by column
  Object.keys(columns).forEach((leftKey) => {
    const leftVal = parseInt(leftKey);
    const wrappers = columns[leftVal];

    // Sort cards in column based on original top coordinates
    wrappers.sort((a, b) => {
      const topA = parseFloat(a.getAttribute('data-orig-top') || a.style.top || '0');
      const topB = parseFloat(b.getAttribute('data-orig-top') || b.style.top || '0');
      return topA - topB;
    });

    let currentTop = -1;

    wrappers.forEach((wrapper) => {
      // Cache original Pinterest top style to use as reference
      if (!wrapper.hasAttribute('data-orig-top')) {
        wrapper.setAttribute('data-orig-top', wrapper.style.top || '0');
      }

      const origTop = parseFloat(wrapper.getAttribute('data-orig-top') || '0');

      if (currentTop === -1) {
        // First card in column aligns to its original top
        currentTop = origTop;
      }

      if (videoOnly) {
        wrapper.style.top = `${currentTop}px`;
        // Calculate next top coordinate = currentTop + element offset height + gap
        const cardHeight = wrapper.offsetHeight || 300;
        currentTop += cardHeight + gap;
      } else {
        // Restore original coordinates if user disabled image filter
        wrapper.style.top = `${origTop}px`;
      }
    });
  });
}

// Filter/hide static image cards based on videoOnly optimization setting
async function filterPins() {
  if (!isExtensionContextValid()) return;
  try {
    const settingsData = await chrome.storage.local.get('video_ext_settings');
    const videoOnly = settingsData.video_ext_settings?.videoOnly ?? true; // Defaults to enabling B-Roll optimization

    const pinContainers = document.querySelectorAll('[data-test-pin-id]');
    pinContainers.forEach((pinEl) => {
      const el = pinEl as HTMLElement;

      // Read media type cache to prevent layout performance drops
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
          el.style.display = 'none'; // Hide image card completely
        } else {
          el.style.display = ''; // Restore image card display if disabled
        }
      }
    });

    // Rearrange layout to fill empty gaps
    rearrangeGrid(videoOnly);
  } catch (e) { }
}

// Run scanning loops and inject overlays every 300ms
setInterval(() => {
  void filterPins();
  void scanAndInjectOverlays();
}, 300);

// Apply layout filter changes immediately when user toggles settings
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.video_ext_settings) {
      void filterPins();
      void scanAndInjectOverlays();
    }
  });
}
