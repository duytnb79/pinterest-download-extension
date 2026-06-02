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
  
  // Làm sạch ID, loại bỏ mọi ký tự đặc biệt bao gồm dấu gạch chéo /
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');
  
  // Trích xuất phần đuôi mở rộng thực tế nếu có
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    const matchedExt = pathname.match(/\.([a-zA-Z0-9]+)$/);
    if (matchedExt && matchedExt[1]) {
      const detectedExt = matchedExt[1].toLowerCase();
      // Chỉ chấp nhận một số đuôi file phổ biến
      if (['mp4', 'webm', 'mov', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(detectedExt)) {
        return `pinterest_${safeId}_${timestamp}.${detectedExt}`;
      }
    }
  } catch (e) {
    // Fallback nếu URL lỗi
  }

  return `pinterest_${safeId}_${timestamp}.${ext}`;
}

// Khởi chạy tải xuống một CartItem
// Fetch trang chi tiết Pin ngầm và trích xuất URL video .mp4 chất lượng cao nhất bằng 3 lớp kiên cố
async function extractMp4FromPinPage(pinId: string, fallbackUrl: string): Promise<string> {
  try {
    const pageUrl = `https://www.pinterest.com/pin/${pinId}/`;
    const response = await fetch(pageUrl);
    if (!response.ok) return fallbackUrl;
    
    const html = await response.text();
    
    // Cách 1: Parse tag script __PWS_DATA__ (chính xác và an toàn nhất)
    const scriptMatch = html.match(/<script id="__PWS_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (scriptMatch && scriptMatch[1]) {
      try {
        const jsonData = JSON.parse(scriptMatch[1]);
        const pinData = jsonData?.props?.initialReduxState?.pins?.[pinId];
        if (pinData?.videos?.video_list) {
          const videoList = pinData.videos.video_list;
          const bestVideo = videoList.V_720P?.url || videoList.V_H264?.url || videoList.V_720p?.url || videoList.V_H264_IPHONE?.url;
          if (bestVideo) {
            console.log(`[video-ext] Tìm thấy video MP4 chất lượng cao từ JSON: ${bestVideo}`);
            return bestVideo;
          }
        }
      } catch (e) {
        console.error('[video-ext] Lỗi parse JSON __PWS_DATA__:', e);
      }
    }
    
    // Cách 2: Quét Regex các URL bị escape dấu gạch chéo (\/) trong HTML thô (Cực kỳ phổ biến trong JSON nhúng)
    const escapedMp4Matches = html.match(/https:\\\/\\\/v[12]\.pinimg\.com\\\/videos\\\/[a-zA-Z0-9_\\\/.-]+\.mp4/g);
    if (escapedMp4Matches && escapedMp4Matches.length > 0) {
      const uniqueUrls = Array.from(new Set(escapedMp4Matches)).map(url => url.replace(/\\\//g, '/'));
      const bestUrl = uniqueUrls.find(url => url.includes('720p') || url.includes('h264')) || uniqueUrls[0];
      console.log(`[video-ext] Tìm thấy video MP4 qua Regex escaped: ${bestUrl}`);
      return bestUrl;
    }
    
    // Cách 3: Quét Regex các URL .mp4 thông thường (không bị escape) nếu có
    const normalMp4Matches = html.match(/https:\/\/v[12]\.pinimg\.com\/videos\/[a-zA-Z0-9_/.-]+\.mp4/g);
    if (normalMp4Matches && normalMp4Matches.length > 0) {
      const uniqueUrls = Array.from(new Set(normalMp4Matches));
      const bestUrl = uniqueUrls.find(url => url.includes('720p') || url.includes('h264')) || uniqueUrls[0];
      console.log(`[video-ext] Tìm thấy video MP4 qua Regex bình thường: ${bestUrl}`);
      return bestUrl;
    }
  } catch (err) {
    console.error(`[video-ext] Lỗi fetch chi tiết Pin ${pinId}:`, err);
  }
  return fallbackUrl;
}

// Broadcast trạng thái tải file về cho Content Scripts hiển thị hiệu ứng xoay loading và đã tải xong
async function broadcastDownloadStatus(itemId: string, status: 'downloading' | 'completed' | 'failed') {
  try {
    const tabs = await chrome.tabs.query({ url: '*://*.pinterest.com/*' });
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'DOWNLOAD_STATUS_UPDATE',
          itemId,
          status
        }).catch(() => {}); // Tránh lỗi tab bị ngắt kết nối
      }
    }
  } catch (e) {}
}

// Khởi chạy tải xuống một CartItem
async function downloadItem(item: CartItem): Promise<void> {
  try {
    await updateCartItemStatus(item.id, 'downloading', 0);
    void broadcastDownloadStatus(item.id, 'downloading');

    let finalUrl = item.url;
    
    // Nếu item là video và url hiện tại chưa phải là mp4 (đang là link ảnh gốc thumbnail do grid lazy)
    if (item.type === 'video' && !finalUrl.toLowerCase().includes('.mp4')) {
      console.log(`[video-ext] Đang lấy link MP4 chính thức cho video Pin ID: ${item.id}`);
      finalUrl = await extractMp4FromPinPage(item.id, item.url);
    }

    if (!finalUrl || !finalUrl.startsWith('http')) {
      throw new Error(`URL không hợp lệ hoặc không tìm thấy video gốc: "${finalUrl || 'rỗng'}"`);
    }

    const safeName = getSafeFilename(finalUrl, item.id, item.type);
    const tagFolder = item.tag || 'default';
    // Đường dẫn tương đối lưu trữ
    const filename = `discord-video-bot-broll/${tagFolder}/${safeName}`;

    console.log(`[video-ext] Bắt đầu tải file: ${finalUrl} -> ${filename}`);

    const downloadId = await chrome.downloads.download({
      url: finalUrl,
      filename: filename,
      conflictAction: 'uniquify',
      saveAs: false
    });

    // Lưu trữ mapping giữa downloadId và item.id để theo dõi tiến trình
    await chrome.storage.local.set({ [`dl_${downloadId}`]: item.id });
  } catch (err: any) {
    console.error(`[video-ext] Lỗi tải file ${item.id}:`, err);
    await updateCartItemStatus(item.id, 'failed', undefined, err.message || 'Lỗi tải file');
    void broadcastDownloadStatus(item.id, 'failed');
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
      void broadcastDownloadStatus(itemId, 'completed');
      await chrome.storage.local.remove(key);
      await updateBadge();
      
      // Lưu ID vào danh sách đã tải thành công để hiển thị nút check vĩnh viễn trên trang
      try {
        const data = await chrome.storage.local.get('video_ext_downloaded_ids');
        const downloadedIds = data.video_ext_downloaded_ids || [];
        if (!downloadedIds.includes(itemId)) {
          await chrome.storage.local.set({ video_ext_downloaded_ids: [...downloadedIds, itemId] });
        }
      } catch (e) {}
    } else if (delta.state.current === 'interrupted') {
      console.error(`[video-ext] Tải thất bại: itemId=${itemId}, reason=${delta.error?.current}`);
      await updateCartItemStatus(itemId, 'failed', undefined, `Interrupted: ${delta.error?.current || 'unknown'}`);
      void broadcastDownloadStatus(itemId, 'failed');
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
