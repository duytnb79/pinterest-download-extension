import { getCartItems, updateCartItemStatus, saveCartItems } from './shared/storage';
import { CartItem } from './shared/types';

// Cập nhật Badge hiển thị số lượng item trong Cart
export async function updateBadge() {
  const items = await getCartItems();
  const pendingCount = items.filter(item => item.status === 'pending').length;
  
  if (pendingCount > 0) {
    await chrome.action.setBadgeText({ text: pendingCount.toString() });
    await chrome.action.setBadgeBackgroundColor({ color: '#E63946' }); // Màu đỏ san hô sang chảnh
  } else {
    await chrome.action.setBadgeText({ text: '' });
  }
}

// Làm sạch tên file cho Windows
function getSafeFilename(url: string, id: string, type: 'video' | 'image'): string {
  const timestamp = Date.now();
  const ext = type === 'video' ? 'mp4' : 'jpg';
  
  // Trích xuất phần đuôi mở rộng thực tế nếu có
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    const matchedExt = pathname.match(/\.([a-zA-Z0-9]+)$/);
    if (matchedExt && matchedExt[1]) {
      const detectedExt = matchedExt[1].toLowerCase();
      // Chỉ chấp nhận một số đuôi file phổ biến
      if (['mp4', 'webm', 'mov', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(detectedExt)) {
        return `pinterest_${id}_${timestamp}.${detectedExt}`;
      }
    }
  } catch (e) {
    // Fallback nếu URL lỗi
  }

  return `pinterest_${id}_${timestamp}.${ext}`;
}

// Khởi chạy tải xuống một CartItem
async function downloadItem(item: CartItem): Promise<void> {
  try {
    await updateCartItemStatus(item.id, 'downloading', 0);

    const safeName = getSafeFilename(item.url, item.id, item.type);
    const tagFolder = item.tag || 'default';
    // Đường dẫn tương đối lưu trữ
    const filename = `discord-video-bot-broll/${tagFolder}/${safeName}`;

    console.log(`[video-ext] Bắt đầu tải file: ${item.url} -> ${filename}`);

    const downloadId = await chrome.downloads.download({
      url: item.url,
      filename: filename,
      conflictAction: 'uniquify',
      saveAs: false
    });

    // Lưu trữ mapping giữa downloadId và item.id để theo dõi tiến trình
    await chrome.storage.local.set({ [`dl_${downloadId}`]: item.id });
  } catch (err: any) {
    console.error(`[video-ext] Lỗi tải file ${item.id}:`, err);
    await updateCartItemStatus(item.id, 'failed', undefined, err.message || 'Lỗi tải file');
    await updateBadge();
  }
}

// Lắng nghe thay đổi trạng thái của Downloads
chrome.downloads.onChanged.addListener(async (delta) => {
  const key = `dl_${delta.id}`;
  const result = await chrome.storage.local.get(key);
  const itemId = result[key];

  if (!itemId) return;

  if (delta.state) {
    if (delta.state.current === 'complete') {
      console.log(`[video-ext] Tải hoàn thành: itemId=${itemId}`);
      await updateCartItemStatus(itemId, 'completed', 100);
      await chrome.storage.local.remove(key);
      await updateBadge();
    } else if (delta.state.current === 'interrupted') {
      console.error(`[video-ext] Tải thất bại: itemId=${itemId}, reason=${delta.error?.current}`);
      await updateCartItemStatus(itemId, 'failed', undefined, `Interrupted: ${delta.error?.current || 'unknown'}`);
      await chrome.storage.local.remove(key);
      await updateBadge();
    }
  }

  // Theo dõi tiến trình tải
  if (delta.totalBytes && delta.totalBytes.current !== undefined && delta.totalBytes.current > 0) {
    // Hủy bỏ vì ta theo dõi tiến trình qua số lượng file
  }
});

// Lắng nghe tin nhắn
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'ADD_TO_CART_SUCCESS') {
    void updateBadge();
    sendResponse({ ok: true });
    return true;
  }
  
  if (message.type === 'START_DOWNLOAD_ALL') {
    const itemsToDownload = message.items as CartItem[];
    console.log(`[video-ext] Bắt đầu tải hàng loạt ${itemsToDownload.length} items`);
    
    // Tải tuần tự hoặc song song
    void (async () => {
      for (const item of itemsToDownload) {
        await downloadItem(item);
      }
    })();
    
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === 'DOWNLOAD_SINGLE_ITEM') {
    const item = message.item as CartItem;
    void downloadItem(item);
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === 'UPDATE_BADGE') {
    void updateBadge();
    sendResponse({ ok: true });
    return true;
  }
});

// Khởi chạy khi cài đặt hoặc bật Chrome
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[video-ext] Extension đã được cài đặt thành công!');
  await updateBadge();
});

chrome.runtime.onStartup.addListener(async () => {
  await updateBadge();
});
