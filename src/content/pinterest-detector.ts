export interface PinterestMediaInfo {
  id: string;
  url: string;
  thumbnail: string;
  type: 'video' | 'image';
  pageUrl: string;
  title?: string;
  tags?: string[]; // Bổ sung tags bóc tách trực tiếp từ DOM
}

// Trích xuất ID pin từ URL trang hoặc thuộc tính DOM
export function getPinIdFromUrl(url: string): string | null {
  const match = url.match(/\/pin\/(\d+)/);
  return match ? match[1] : null;
}

// Chuyển đổi link ảnh Pinterest thành link gốc chất lượng cao nhất (Originals)
export function getOriginalImageUrl(srcUrl: string): string {
  if (!srcUrl) return '';
  return srcUrl.replace(/\/(?:236x|474x|564x|736x)\//, '/originals/');
}

// Trích xuất tags phân loại và Visual Annotations trực tiếp từ DOM trên tab người dùng
export function extractTagsFromDOM(pinId: string): string[] {
  const tagsSet = new Set<string>();
  
  try {
    // 1. Lấy dữ liệu từ script __PWS_DATA__ có sẵn trên DOM
    const pwsScript = document.getElementById('__PWS_DATA__');
    if (pwsScript && pwsScript.textContent) {
      const jsonData = JSON.parse(pwsScript.textContent);
      const pinData = jsonData?.props?.initialReduxState?.pins?.[pinId];
      if (pinData) {
        // Lấy từ danh mục tags phân loại
        if (Array.isArray(pinData.tags)) {
          pinData.tags.forEach((t: any) => {
            if (t && t.name) tagsSet.add(t.name);
          });
        }
        // Lấy từ Visual Annotations do AI của Pinterest tự động nhận diện hình ảnh
        if (pinData.visual_annotation_keywords && Array.isArray(pinData.visual_annotation_keywords)) {
          pinData.visual_annotation_keywords.forEach((keyword: string) => {
            if (keyword) tagsSet.add(keyword);
          });
        }
        // Lấy từ hashtags trong mô tả
        if (pinData.description) {
          const hashtags = pinData.description.match(/#[a-zA-Z0-9_À-ỹ]+/g);
          if (hashtags) {
            hashtags.forEach((h: string) => tagsSet.add(h.substring(1)));
          }
        }
      }
    }
  } catch (e) {}

  try {
    // 2. Dự phòng: Đọc trực tiếp thẻ mô tả hiển thị trên DOM
    const descEl = document.querySelector('[data-test-id="pin-description-text"]');
    if (descEl && descEl.textContent) {
      const hashtags = descEl.textContent.match(/#[a-zA-Z0-9_À-ỹ]+/g);
      if (hashtags) {
        hashtags.forEach((h: string) => tagsSet.add(h.substring(1)));
      }
    }
  } catch (e) {}

  // Làm sạch tags
  return Array.from(tagsSet)
    .map(tag => tag.toLowerCase().trim().replace(/[^a-z0-9_à-ỹ]/g, '_').replace(/_+/g, '_'))
    .filter(tag => tag.length > 2 && tag !== 'pinterest');
}

// Tìm container Pin gần nhất từ một element
export function findPinContainer(el: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = el;
  while (current && current !== document.body) {
    if (current.nodeType === 1 && typeof current.hasAttribute === 'function' && current.hasAttribute('data-test-pin-id')) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

// Trích xuất thông tin media từ container của Pin
export function extractMediaFromPin(pinEl: HTMLElement): PinterestMediaInfo | null {
  // 1. Trích xuất ID Pin
  let pinId = pinEl.getAttribute('data-test-pin-id');
  let pinLinkEl = pinEl.querySelector('a[href^="/pin/"]') as HTMLAnchorElement | null;
  
  if (!pinId && pinLinkEl) {
    pinId = getPinIdFromUrl(pinLinkEl.href);
  }
 
  if (!pinId) {
    const img = pinEl.querySelector('img');
    if (img && img.src) {
      const match = img.src.match(/\/([a-f0-9]+)\.jpg/i);
      pinId = match ? match[1] : `pin_${Date.now()}`;
    } else {
      return null;
    }
  }

  const pageUrl = pinLinkEl ? pinLinkEl.href : `https://www.pinterest.com/pin/${pinId}/`;

  // 2. Trích xuất Tiêu đề (nếu có)
  let title = '';
  const imgEl = pinEl.querySelector('img') as HTMLImageElement | null;
  if (imgEl) {
    title = imgEl.alt || imgEl.title || '';
  }

  // 3. Phát hiện Video
  const videoEl = pinEl.querySelector('video') as HTMLVideoElement | null;
  const hasVideoTag = pinEl.querySelector('video') !== null;
  const hasPlayIcon = pinEl.querySelector('svg[aria-label="Play"], [data-test-id="video-snippet"], svg path[d*="M8 5v14l11-7z"]') !== null;
  const hasDurationBadge = pinEl.textContent ? /\d+:\d+/.test(pinEl.textContent) : false;
  const isVideo = hasVideoTag || hasPlayIcon || hasDurationBadge;

  const originalUrl = imgEl && imgEl.src ? getOriginalImageUrl(imgEl.src) : '';
  const tags = extractTagsFromDOM(pinId);

  if (isVideo) {
    let videoUrl = '';
    if (videoEl) {
      videoUrl = videoEl.src || videoEl.getAttribute('data-src') || '';
      if (!videoUrl || videoUrl.startsWith('blob:')) {
        const sourceEl = videoEl.querySelector('source') as HTMLSourceElement | null;
        if (sourceEl) {
          videoUrl = sourceEl.src || sourceEl.getAttribute('data-src') || videoUrl;
        }
      }
    }

    if (videoUrl && !videoUrl.startsWith('blob:')) {
      return {
        id: pinId,
        url: videoUrl,
        thumbnail: imgEl ? imgEl.src : '',
        type: 'video',
        pageUrl,
        title: title || 'Pinterest Video',
        tags
      };
    }

    return {
      id: pinId,
      url: originalUrl || (imgEl ? imgEl.src : ''),
      thumbnail: imgEl ? imgEl.src : '',
      type: 'video',
      pageUrl,
      title: title || 'Pinterest Video',
      tags
    };
  }

  if (imgEl && imgEl.src) {
    return {
      id: pinId,
      url: originalUrl || imgEl.src,
      thumbnail: imgEl.src,
      type: 'image',
      pageUrl,
      title: title || 'Pinterest Image',
      tags
    };
  }

  return null;
}
