export interface PinterestMediaInfo {
  id: string;
  url: string;
  thumbnail: string;
  type: 'video' | 'image';
  pageUrl: string;
  title?: string;
}

// Trích xuất ID pin từ URL trang hoặc thuộc tính DOM
export function getPinIdFromUrl(url: string): string | null {
  const match = url.match(/\/pin\/(\d+)/);
  return match ? match[1] : null;
}

// Chuyển đổi link ảnh Pinterest thành link gốc chất lượng cao nhất (Originals)
export function getOriginalImageUrl(srcUrl: string): string {
  if (!srcUrl) return '';
  // Ví dụ: https://i.pinimg.com/564x/a1/b2/c3/a1b2c3.jpg
  // Chuyển đổi thành: https://i.pinimg.com/originals/a1/b2/c3/a1b2c3.jpg
  return srcUrl.replace(/\/(?:236x|474x|564x|736x)\//, '/originals/');
}

// Tìm container Pin gần nhất từ một element
export function findPinContainer(el: HTMLElement): HTMLElement | null {
  // Chỉ tìm div có data-test-pin-id. Đảm bảo current là Element thực sự (nodeType === 1) để tránh lỗi 'hasAttribute is not a function' trên Text/SVG nodes.
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
    // Không tìm thấy ID pin, tạo ID ngẫu nhiên hoặc hash dựa trên link ảnh
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
  // Grid Pinterest đôi khi phát video khi hover. Ta quét thẻ video
  const videoEl = pinEl.querySelector('video') as HTMLVideoElement | null;
  // 3. Kiểm tra dấu hiệu Video (Play icon, text thời lượng dạng 0:15, hoặc thẻ video)
  const hasVideoTag = pinEl.querySelector('video') !== null;
  const hasPlayIcon = pinEl.querySelector('svg[aria-label="Play"], [data-test-id="video-snippet"], svg path[d*="M8 5v14l11-7z"]') !== null;
  const hasDurationBadge = pinEl.textContent ? /\d+:\d+/.test(pinEl.textContent) : false;
  const isVideo = hasVideoTag || hasPlayIcon || hasDurationBadge;

  const originalUrl = imgEl && imgEl.src ? getOriginalImageUrl(imgEl.src) : '';

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

    // Nếu tìm được URL video thực tế không phải blob
    if (videoUrl && !videoUrl.startsWith('blob:')) {
      return {
        id: pinId,
        url: videoUrl,
        thumbnail: imgEl ? imgEl.src : '',
        type: 'video',
        pageUrl,
        title: title || 'Pinterest Video'
      };
    }

    // Nếu là video nhưng chưa lấy được URL thật (chỉ có blob hoặc lazy load), ta vẫn trả về type: video
    // Background script sẽ fetch ngầm trang chi tiết Pin để parse link MP4 thật khi tải/thêm giỏ hàng!
    return {
      id: pinId,
      url: originalUrl || (imgEl ? imgEl.src : ''), // Lưu tạm url ảnh làm dự phòng
      thumbnail: imgEl ? imgEl.src : '',
      type: 'video',
      pageUrl,
      title: title || 'Pinterest Video'
    };
  }

  // 4. Phát hiện Ảnh (nếu không phải Video)
  if (imgEl && imgEl.src) {
    return {
      id: pinId,
      url: originalUrl || imgEl.src,
      thumbnail: imgEl.src,
      type: 'image',
      pageUrl,
      title: title || 'Pinterest Image'
    };
  }

  return null;
}
