import { getCartItems, updateCartItemStatus, saveCartItems } from './shared/storage';
import { CartItem } from './shared/types';

// Update action badge showing the number of pending items in the Cart
export async function updateBadge() {
  const items = await getCartItems();
  const pendingCount = items.filter(item => item.status === 'pending').length;

  if (pendingCount > 0) {
    await chrome.action.setBadgeText({ text: pendingCount.toString() });
    await chrome.action.setBadgeBackgroundColor({ color: '#E63946' }); // Premium coral red color
  } else {
    await chrome.action.setBadgeText({ text: '' });
  }
}

// Clean filename for Windows file system
function getSafeFilename(url: string, id: string, type: 'video' | 'image'): string {
  const timestamp = Date.now();
  const ext = type === 'video' ? 'mp4' : 'jpg';

  // Sanitize ID, removing any special characters including slashes
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');

  // Extract actual file extension if present
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    const matchedExt = pathname.match(/\.([a-zA-Z0-9]+)$/);
    if (matchedExt && matchedExt[1]) {
      const detectedExt = matchedExt[1].toLowerCase();
      // Allow only common media extensions
      if (['mp4', 'webm', 'mov', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(detectedExt)) {
        return `pinterest_${safeId}_${timestamp}.${detectedExt}`;
      }
    }
  } catch (e) {
    // Fallback if URL parsing fails
  }

  return `pinterest_${safeId}_${timestamp}.${ext}`;
}

// Verify if a URL is valid and not an S3/Amazon error page
async function checkUrlValidity(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (!res.ok) return false;

    const contentType = res.headers.get('content-type') || '';
    // If the server returns XML (e.g. Access Denied from S3), it's a dead URL
    if (contentType.toLowerCase().includes('xml')) {
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

// Extract MP4 download candidates from HLS stream playlist URL
function getMp4CandidatesFromHls(hlsUrl: string): string[] {
  const candidates: string[] = [];
  try {
    // 1. HD 720p expMp4 format (e.g., .../expMp4/..._720w.mp4)
    if (hlsUrl.includes('/hls/')) {
      const expMp4 = hlsUrl.replace('/hls/', '/expMp4/').replace('.m3u8', '_720w.mp4');
      candidates.push(expMp4);
    }

    // 2. Regular 720p HD format (e.g., .../720p/... .mp4)
    const p720 = hlsUrl.replace('/hls/', '/720p/').replace('.m3u8', '.mp4');
    candidates.push(p720);

    // 3. Medium quality h264 format (e.g., .../h264/... .mp4)
    const h264 = hlsUrl.replace('/hls/', '/h264/').replace('.m3u8', '.mp4');
    candidates.push(h264);
  } catch (e) { }
  return candidates;
}

// Extract tags automatically from Pinterest script, annotations, title, and description
function extractTagsFromHtmlAndJson(html: string, pinId: string): string[] {
  const tagsSet = new Set<string>();

  // 1. Find in __PWS_DATA__ script block
  const scriptMatch = html.match(/<script id="__PWS_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (scriptMatch && scriptMatch[1]) {
    try {
      const jsonData = JSON.parse(scriptMatch[1]);
      const pinData = jsonData?.props?.initialReduxState?.pins?.[pinId];

      if (pinData) {
        // Extract official tags
        if (Array.isArray(pinData.tags)) {
          pinData.tags.forEach((t: any) => {
            if (t && t.name) tagsSet.add(t.name);
          });
        }

        // Extract Visual Annotations keywords (AI detected image terms)
        if (pinData.visual_annotation_keywords && Array.isArray(pinData.visual_annotation_keywords)) {
          pinData.visual_annotation_keywords.forEach((keyword: string) => {
            if (keyword) tagsSet.add(keyword);
          });
        }

        // Extract hashtags from description
        if (pinData.description) {
          const hashtags = pinData.description.match(/#[a-zA-Z0-9_À-ỹ]+/g);
          if (hashtags) {
            hashtags.forEach((h: string) => tagsSet.add(h.substring(1)));
          }
        }
      }
    } catch (e) { }
  }

  // Clean tags: lowercase, substitute spaces with underscores, drop special chars
  return Array.from(tagsSet)
    .map(tag => tag.toLowerCase().trim().replace(/[^a-z0-9_à-ỹ]/g, '_').replace(/_+/g, '_'))
    .filter(tag => tag.length > 2 && tag !== 'pinterest');
}

// Fetch closeup Pin detail page and extract high resolution MP4 video link using fallbacks
async function extractMp4FromPinPage(pinId: string, fallbackUrl: string): Promise<string> {
  try {
    const pageUrl = `https://www.pinterest.com/pin/${pinId}/`;

    // Fetch page with user cookies and realistic browser headers
    const response = await fetch(pageUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
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
      console.warn(`[video-ext] Fetch Pin ${pinId} failed with status: ${response.status}`);
      return fallbackUrl;
    }

    const html = await response.text();
    const potentialUrls: string[] = [];

    // Automatically parse tags
    const autoTags = extractTagsFromHtmlAndJson(html, pinId);
    console.log(`[video-ext] Automatically found ${autoTags.length} tags for Pin ${pinId}:`, autoTags);
    await chrome.storage.local.set({ [`auto_tags_${pinId}`]: autoTags });

    // Method 1: Parse __PWS_DATA__ JSON script block
    const scriptMatch = html.match(/<script id="__PWS_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (scriptMatch && scriptMatch[1]) {
      try {
        const jsonData = JSON.parse(scriptMatch[1]);
        const pinData = jsonData?.props?.initialReduxState?.pins?.[pinId];
        if (pinData?.videos?.video_list) {
          const videoList = pinData.videos.video_list;

          // Add direct MP4 links
          if (videoList.V_720P?.url) potentialUrls.push(videoList.V_720P.url);
          if (videoList.V_H264?.url) potentialUrls.push(videoList.V_H264.url);
          if (videoList.V_720p?.url) potentialUrls.push(videoList.V_720p.url);
          if (videoList.V_H264_IPHONE?.url) potentialUrls.push(videoList.V_H264_IPHONE.url);

          // Add HLS candidates converted to MP4
          if (videoList.V_HLS?.url) {
            potentialUrls.push(...getMp4CandidatesFromHls(videoList.V_HLS.url));
          }
        }
      } catch (e) {
        console.error('[video-ext] Error parsing JSON __PWS_DATA__:', e);
      }
    }

    // Method 2: Regex search escaped URLs in HTML output
    const escapedMp4Matches = html.match(/https:\\\/\\\/v[12]\.pinimg\.com\\\/videos\\\/[a-zA-Z0-9_\\\/.-]+\.mp4/g);
    if (escapedMp4Matches && escapedMp4Matches.length > 0) {
      const uniqueUrls = Array.from(new Set(escapedMp4Matches)).map(url => url.replace(/\\\//g, '/'));
      potentialUrls.push(...uniqueUrls);
    }

    const escapedM3u8Matches = html.match(/https:\\\/\\\/v[12]\.pinimg\.com\\\/videos\\\/[a-zA-Z0-9_\\\/.-]+\.m3u8/g);
    if (escapedM3u8Matches && escapedM3u8Matches.length > 0) {
      const uniqueUrls = Array.from(new Set(escapedM3u8Matches)).map(url => url.replace(/\\\//g, '/'));
      uniqueUrls.forEach(hls => potentialUrls.push(...getMp4CandidatesFromHls(hls)));
    }

    // Method 3: Regex search unescaped URLs
    const normalMp4Matches = html.match(/https:\/\/v[12]\.pinimg\.com\/videos\/[a-zA-Z0-9_/.-]+\.mp4/g);
    if (normalMp4Matches && normalMp4Matches.length > 0) {
      potentialUrls.push(...Array.from(new Set(normalMp4Matches)));
    }

    const normalM3u8Matches = html.match(/https:\/\/v[12]\.pinimg\.com\/videos\/[a-zA-Z0-9_/.-]+\.m3u8/g);
    if (normalM3u8Matches && normalM3u8Matches.length > 0) {
      const uniqueUrls = Array.from(new Set(normalM3u8Matches));
      uniqueUrls.forEach(hls => potentialUrls.push(...getMp4CandidatesFromHls(hls)));
    }

    const uniquePotentialUrls = Array.from(new Set(potentialUrls));
    console.log(`[video-ext] Checking ${uniquePotentialUrls.length} candidate MP4 URLs for Pin ID ${pinId}...`);

    // Verify HEAD request response validity
    for (const url of uniquePotentialUrls) {
      const isValid = await checkUrlValidity(url);
      if (isValid) {
        console.log(`[video-ext] Found valid working MP4 video: ${url}`);
        return url;
      }
    }

    console.warn(`[video-ext] No valid MP4 link found among the ${uniquePotentialUrls.length} candidates!`);
  } catch (err) {
    console.error(`[video-ext] Error fetching Pin details ${pinId}:`, err);
  }
  return fallbackUrl;
}

// Broadcast download status back to content scripts for UI updates
async function broadcastDownloadStatus(itemId: string, status: 'downloading' | 'completed' | 'failed') {
  try {
    const tabs = await chrome.tabs.query({ url: '*://*.pinterest.com/*' });
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'DOWNLOAD_STATUS_UPDATE',
          itemId,
          status
        }).catch(() => { });
      }
    }
  } catch (e) { }
}

// Download a single CartItem
async function downloadItem(item: CartItem): Promise<void> {
  try {
    await updateCartItemStatus(item.id, 'downloading', 0);
    void broadcastDownloadStatus(item.id, 'downloading');

    let finalUrl = item.url;

    // If media type is video but URL points to thumbnail image (e.g. from lazy list)
    if (item.type === 'video' && !finalUrl.toLowerCase().includes('.mp4')) {
      console.log(`[video-ext] Fetching official MP4 link for video Pin ID: ${item.id}`);
      finalUrl = await extractMp4FromPinPage(item.id, item.url);

      if (!finalUrl.toLowerCase().includes('.mp4')) {
        throw new Error('Unable to fetch direct MP4 link for this video (Pinterest restriction or special HLS stream).');
      }
    }

    if (!finalUrl || !finalUrl.startsWith('http')) {
      throw new Error(`Invalid URL or original video not found: "${finalUrl || 'empty'}"`);
    }

    const safeName = getSafeFilename(finalUrl, item.id, item.type);
    const cleanTag = (item.tag || 'default').replace(/[^a-zA-Z0-9_-]/g, '');

    // Extract tags: prioritize pre-extracted tags, fallback to chrome storage
    const storageKey = `auto_tags_${item.id}`;
    const storageResult = await chrome.storage.local.get(storageKey);
    const autoTags: string[] = (item as any).tags || storageResult[storageKey] || [];

    // Parse manual tags separated by commas
    const manualTags = (item.tag || '')
      .split(',')
      .map(t => t.trim().toLowerCase().replace(/[^a-z0-9_à-ỹ]/g, '_').replace(/_+/g, '_'))
      .filter(t => t.length > 0);

    // Merge auto and manual tags
    const mergedTagsSet = new Set<string>([...autoTags, ...manualTags]);
    const finalTags = Array.from(mergedTagsSet).filter(t => t !== 'default' && t.trim() !== '');

    console.log(`[video-ext] Merged tags for Pin ID ${item.id}:`, finalTags);

    // Append tags to filename suffix: pinterest_id_timestamp__tag1_tag2.mp4
    let taggedSafeName = safeName;
    if (finalTags.length > 0) {
      const tagsSuffix = finalTags.join('_');
      const extMatch = safeName.match(/\.([a-zA-Z0-9]+)$/);
      if (extMatch && extMatch[0]) {
        taggedSafeName = safeName.replace(extMatch[0], `__${tagsSuffix}${extMatch[0]}`);
      } else {
        taggedSafeName = `${safeName}__${tagsSuffix}`;
      }
    }

    // Read download folder options
    const settingsData = await chrome.storage.local.get('video_ext_settings');
    const settings = settingsData.video_ext_settings || {};
    const rawFolder = settings.downloadFolder !== undefined ? settings.downloadFolder : 'pinterest-downloads';
    const downloadFolder = rawFolder.trim().replace(/\/+$/, '');

    let filename = '';
    if (downloadFolder) {
      filename = `${downloadFolder}/${cleanTag}/${taggedSafeName}`;
    } else {
      filename = `${cleanTag}/${taggedSafeName}`;
    }
    console.log(`[video-ext] Started downloading file with tags: ${finalUrl} -> ${filename}`);

    const downloadId = await chrome.downloads.download({
      url: finalUrl,
      filename: filename,
      conflictAction: 'uniquify',
      saveAs: false
    });

    // Clear auto tags storage cache
    chrome.storage.local.remove(storageKey).catch(() => { });

    // Store mapping between downloadId and itemId
    await chrome.storage.local.set({ [`dl_${downloadId}`]: item.id });
  } catch (err: any) {
    console.error(`[video-ext] Error downloading file ${item.id}:`, err);
    await updateCartItemStatus(item.id, 'failed', undefined, err.message || 'Download failed');
    void broadcastDownloadStatus(item.id, 'failed');
    await updateBadge();
  }
}

// Track Chrome Downloads events
chrome.downloads.onChanged.addListener(async (delta) => {
  const key = `dl_${delta.id}`;
  const result = await chrome.storage.local.get(key);
  const itemId = result[key];

  if (!itemId) return;

  if (delta.state) {
    if (delta.state.current === 'complete') {
      console.log(`[video-ext] Download completed: itemId=${itemId}`);
      await updateCartItemStatus(itemId, 'completed', 100);
      void broadcastDownloadStatus(itemId, 'completed');
      await chrome.storage.local.remove(key);
      await updateBadge();

      // Store download ID to cache completed items and display check badge
      try {
        const data = await chrome.storage.local.get('video_ext_downloaded_ids');
        const downloadedIds = data.video_ext_downloaded_ids || [];
        if (!downloadedIds.includes(itemId)) {
          await chrome.storage.local.set({ video_ext_downloaded_ids: [...downloadedIds, itemId] });
        }
      } catch (e) { }
    } else if (delta.state.current === 'interrupted') {
      console.error(`[video-ext] Download failed: itemId=${itemId}, reason=${delta.error?.current}`);
      await updateCartItemStatus(itemId, 'failed', undefined, `Interrupted: ${delta.error?.current || 'unknown'}`);
      void broadcastDownloadStatus(itemId, 'failed');
      await chrome.storage.local.remove(key);
      await updateBadge();
    }
  }
});

// Runtime message listener
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'ADD_TO_CART_SUCCESS') {
    void updateBadge();
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === 'START_DOWNLOAD_ALL') {
    const itemsToDownload = message.items as CartItem[];
    console.log(`[video-ext] Started downloading batch of ${itemsToDownload.length} items`);

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

// Initialization tasks on setup or startup
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[video-ext] Extension installed successfully!');
  await updateBadge();
});

chrome.runtime.onStartup.addListener(async () => {
  await updateBadge();
});
