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
// Kiểm tra xem một URL có thực sự khả dụng và không phải là trang lỗi XML của Amazon S3
async function checkUrlValidity(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (!res.ok) return false;
    
    const contentType = res.headers.get('content-type') || '';
    // Nếu máy chủ trả về XML (như Access Denied của S3), đó là URL lỗi
    if (contentType.toLowerCase().includes('xml')) {
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

// Tạo danh sách các URL ứng viên từ luồng HLS m3u8 để thử nghiệm độ phân giải và định dạng
function getMp4CandidatesFromHls(hlsUrl: string): string[] {
  const candidates: string[] = [];
  try {
    // 1. Dạng expMp4 HD 720p mới nhất (ví dụ: .../expMp4/..._720w.mp4)
    if (hlsUrl.includes('/hls/')) {
      const expMp4 = hlsUrl.replace('/hls/', '/expMp4/').replace('.m3u8', '_720w.mp4');
      candidates.push(expMp4);
    }
    
    // 2. Dạng 720p HD thông thường (ví dụ: .../720p/... .mp4)
    const p720 = hlsUrl.replace('/hls/', '/720p/').replace('.m3u8', '.mp4');
    candidates.push(p720);
    
    // 3. Dạng h264 chất lượng trung bình (ví dụ: .../h264/... .mp4)
    const h264 = hlsUrl.replace('/hls/', '/h264/').replace('.m3u8', '.mp4');
    candidates.push(h264);
  } catch (e) {}
  return candidates;
}

// Trích xuất tags tự động từ tag list, annotations, title và description của Pinterest
function extractTagsFromHtmlAndJson(html: string, pinId: string): string[] {
  const tagsSet = new Set<string>();
  
  // 1. Tìm trong __PWS_DATA__ (Chứa database sạch của Pinterest cho Pin này)
  const scriptMatch = html.match(/<script id="__PWS_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (scriptMatch && scriptMatch[1]) {
    try {
      const jsonData = JSON.parse(scriptMatch[1]);
      const pinData = jsonData?.props?.initialReduxState?.pins?.[pinId];
      
      if (pinData) {
        // Lấy từ mảng tags phân loại chính thức của Pinterest
        if (Array.isArray(pinData.tags)) {
          pinData.tags.forEach((t: any) => {
            if (t && t.name) tagsSet.add(t.name);
          });
        }
        
        // Lấy từ Visual Annotations (Từ khóa do AI của Pinterest tự nhận diện hình ảnh của video)
        if (pinData.visual_annotation_keywords && Array.isArray(pinData.visual_annotation_keywords)) {
          pinData.visual_annotation_keywords.forEach((keyword: string) => {
            if (keyword) tagsSet.add(keyword);
          });
        }
        
        // Lấy từ Hashtags trong description
        if (pinData.description) {
          const hashtags = pinData.description.match(/#[a-zA-Z0-9_À-ỹ]+/g);
          if (hashtags) {
            hashtags.forEach((h: string) => tagsSet.add(h.substring(1)));
          }
        }
      }
    } catch (e) {}
  }

  // Làm sạch tags: đổi sang chữ thường, thay khoảng trắng thành gạch dưới, loại bỏ ký tự lạ
  return Array.from(tagsSet)
    .map(tag => tag.toLowerCase().trim().replace(/[^a-z0-9_à-ỹ]/g, '_').replace(/_+/g, '_'))
    .filter(tag => tag.length > 2 && tag !== 'pinterest');
}

// Fetch trang chi tiết Pin ngầm và trích xuất URL video .mp4 chất lượng cao nhất bằng 6 lớp kiên cố kết hợp kiểm tra tính khả dụng HEAD
async function extractMp4FromPinPage(pinId: string, fallbackUrl: string): Promise<string> {
  try {
    const pageUrl = `https://www.pinterest.com/pin/${pinId}/`;
    
    // Fetch kèm cookie của người dùng đang đăng nhập (credentials: 'include') và giả lập headers trình duyệt thực
    const response = await fetch(pageUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Not/A)Brand";v="8", "Chromium";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      console.warn(`[video-ext] Fetch Pin ${pinId} thất bại với status: ${response.status}`);
      return fallbackUrl;
    }
    
    const html = await response.text();
    const potentialUrls: string[] = [];
    
    // Tự động bóc tách tags từ AI Pinterest và Hashtags
    const autoTags = extractTagsFromHtmlAndJson(html, pinId);
    console.log(`[video-ext] Tự động tìm thấy ${autoTags.length} tags cho Pin ${pinId}:`, autoTags);
    await chrome.storage.local.set({ [`auto_tags_${pinId}`]: autoTags });
    
    // Cách 1: Parse tag script __PWS_DATA__ (chính xác và an toàn nhất)
    const scriptMatch = html.match(/<script id="__PWS_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (scriptMatch && scriptMatch[1]) {
      try {
        const jsonData = JSON.parse(scriptMatch[1]);
        const pinData = jsonData?.props?.initialReduxState?.pins?.[pinId];
        if (pinData?.videos?.video_list) {
          const videoList = pinData.videos.video_list;
          
          // Thêm các link MP4 trực tiếp vào danh sách thử nghiệm
          if (videoList.V_720P?.url) potentialUrls.push(videoList.V_720P.url);
          if (videoList.V_H264?.url) potentialUrls.push(videoList.V_H264.url);
          if (videoList.V_720p?.url) potentialUrls.push(videoList.V_720p.url);
          if (videoList.V_H264_IPHONE?.url) potentialUrls.push(videoList.V_H264_IPHONE.url);
          
          // Lấy HLS và tạo danh sách convert
          if (videoList.V_HLS?.url) {
            potentialUrls.push(...getMp4CandidatesFromHls(videoList.V_HLS.url));
          }
        }
      } catch (e) {
        console.error('[video-ext] Lỗi parse JSON __PWS_DATA__:', e);
      }
    }
    
    // Cách 2: Quét Regex các URL bị escape dấu gạch chéo (\/) trong HTML thô
    // Lớp 2.1: Quét link MP4 trực tiếp bị escape
    const escapedMp4Matches = html.match(/https:\\\/\\\/v[12]\.pinimg\.com\\\/videos\\\/[a-zA-Z0-9_\\\/.-]+\.mp4/g);
    if (escapedMp4Matches && escapedMp4Matches.length > 0) {
      const uniqueUrls = Array.from(new Set(escapedMp4Matches)).map(url => url.replace(/\\\//g, '/'));
      potentialUrls.push(...uniqueUrls);
    }
    
    // Lớp 2.2: Quét luồng HLS .m3u8 bị escape và tạo danh sách convert
    const escapedM3u8Matches = html.match(/https:\\\/\\\/v[12]\.pinimg\.com\\\/videos\\\/[a-zA-Z0-9_\\\/.-]+\.m3u8/g);
    if (escapedM3u8Matches && escapedM3u8Matches.length > 0) {
      const uniqueUrls = Array.from(new Set(escapedM3u8Matches)).map(url => url.replace(/\\\//g, '/'));
      uniqueUrls.forEach(hls => potentialUrls.push(...getMp4CandidatesFromHls(hls)));
    }
    
    // Cách 3: Quét Regex các URL thông thường (không bị escape) nếu có
    // Lớp 3.1: Quét link MP4 thông thường
    const normalMp4Matches = html.match(/https:\/\/v[12]\.pinimg\.com\/videos\/[a-zA-Z0-9_/.-]+\.mp4/g);
    if (normalMp4Matches && normalMp4Matches.length > 0) {
      potentialUrls.push(...Array.from(new Set(normalMp4Matches)));
    }

    // Lớp 3.2: Quét link HLS m3u8 thông thường và tạo danh sách convert
    const normalM3u8Matches = html.match(/https:\/\/v[12]\.pinimg\.com\/videos\/[a-zA-Z0-9_/.-]+\.m3u8/g);
    if (normalM3u8Matches && normalM3u8Matches.length > 0) {
      const uniqueUrls = Array.from(new Set(normalM3u8Matches));
      uniqueUrls.forEach(hls => potentialUrls.push(...getMp4CandidatesFromHls(hls)));
    }

    // Lọc danh sách các URL hợp lệ duy nhất
    const uniquePotentialUrls = Array.from(new Set(potentialUrls));
    console.log(`[video-ext] Đang kiểm tra ${uniquePotentialUrls.length} ứng viên link MP4 cho Pin ID ${pinId}...`);
    
    // Thử nghiệm HEAD trên từng URL để tìm link thực sự hoạt động
    for (const url of uniquePotentialUrls) {
      const isValid = await checkUrlValidity(url);
      if (isValid) {
        console.log(`[video-ext] Tìm thấy video MP4 hợp lệ hoạt động 100%: ${url}`);
        return url;
      }
    }

    console.warn(`[video-ext] Không tìm thấy link MP4 hợp lệ nào trong ${uniquePotentialUrls.length} ứng viên!`);
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
      
      // Nếu sau khi trích xuất kiên cố mà vẫn không tìm thấy link MP4
      if (!finalUrl.toLowerCase().includes('.mp4')) {
        throw new Error('Không thể lấy link MP4 trực tiếp cho video này (Pinterest chặn hoặc luồng HLS đặc biệt).');
      }
    }

    if (!finalUrl || !finalUrl.startsWith('http')) {
      throw new Error(`URL không hợp lệ hoặc không tìm thấy video gốc: "${finalUrl || 'rỗng'}"`);
    }

    const safeName = getSafeFilename(finalUrl, item.id, item.type);
    const cleanTag = (item.tag || 'default').replace(/[^a-zA-Z0-9_-]/g, '');

    // Lấy tags tự động: Ưu tiên tags bóc sẵn từ DOM gửi kèm theo item, fallback lấy từ storage nếu tải ngầm
    const storageKey = `auto_tags_${item.id}`;
    const storageResult = await chrome.storage.local.get(storageKey);
    const autoTags: string[] = (item as any).tags || storageResult[storageKey] || [];
    
    // Xử lý tags thủ công (ngăn cách bằng dấu phẩy)
    const manualTags = (item.tag || '')
      .split(',')
      .map(t => t.trim().toLowerCase().replace(/[^a-z0-9_à-ỹ]/g, '_').replace(/_+/g, '_'))
      .filter(t => t.length > 0);

    // Gộp (merge) tags tự động và thủ công, loại bỏ trùng lặp
    const mergedTagsSet = new Set<string>([...autoTags, ...manualTags]);
    const finalTags = Array.from(mergedTagsSet).filter(t => t !== 'default' && t.trim() !== '');

    console.log(`[video-ext] Tags tổng hợp cho Pin ID ${item.id}:`, finalTags);

    // Tự động nhúng tags vào cuối tên file: pinterest_id_timestamp__tag1_tag2.mp4
    let taggedSafeName = safeName;
    if (finalTags.length > 0) {
      const tagsSuffix = finalTags.join('_');
      // Tách extension để nhúng tags vào trước đuôi .mp4 hoặc .jpg
      const extMatch = safeName.match(/\.([a-zA-Z0-9]+)$/);
      if (extMatch && extMatch[0]) {
        taggedSafeName = safeName.replace(extMatch[0], `__${tagsSuffix}${extMatch[0]}`);
      } else {
        taggedSafeName = `${safeName}__${tagsSuffix}`;
      }
    }
    // Lấy cấu hình settings để đọc đường dẫn thư mục tải
    const settingsData = await chrome.storage.local.get('video_ext_settings');
    const settings = settingsData.video_ext_settings || {};
    const rawFolder = settings.downloadFolder !== undefined ? settings.downloadFolder : 'discord-video-bot-broll';
    const downloadFolder = rawFolder.trim().replace(/\/+$/, ''); // Loại bỏ gạch chéo cuối nếu có

    let filename = '';
    if (downloadFolder) {
      filename = `${downloadFolder}/${cleanTag}/${taggedSafeName}`;
    } else {
      filename = `${cleanTag}/${taggedSafeName}`;
    }
    console.log(`[video-ext] Bắt đầu tải file có chứa tags: ${finalUrl} -> ${filename}`);

    // Tải file video duy nhất
    const downloadId = await chrome.downloads.download({
      url: finalUrl,
      filename: filename,
      conflictAction: 'uniquify',
      saveAs: false
    });

    // Xóa tạm dữ liệu tag tự động của ID này trong storage cho sạch
    chrome.storage.local.remove(storageKey).catch(() => {});

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
