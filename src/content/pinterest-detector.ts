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
  // Pinterest sắp xếp grid bằng các thẻ div. Ta tìm div có data-test-pin-id hoặc class đặc thù
  let current: HTMLElement | null = el;
  while (current && current !== document.body) {
    if (current.hasAttribute('data-test-pin-id')) {
      return current;
    }
    // Fallback: Tìm div có class chứa cấu trúc của Pin hoặc có thẻ a trỏ đến /pin/
    if (current.tagName === 'DIV') {
      const pinLink = current.querySelector('a[href^="/pin/"]');
      if (pinLink && current.querySelector('img')) {
        // Đây có thể là Pin container
        return current;
      }
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
  if (videoEl) {
    let videoUrl = videoEl.src || videoEl.getAttribute('data-src') || '';
    
    // Nếu src rỗng hoặc là blob, hãy tìm thẻ <source> bên trong
    if (!videoUrl || videoUrl.startsWith('blob:')) {
      const sourceEl = videoEl.querySelector('source') as HTMLSourceElement | null;
      if (sourceEl) {
        videoUrl = sourceEl.src || sourceEl.getAttribute('data-src') || videoUrl;
      }
    }

    // Nếu tìm được URL video thực tế
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
  }

  // Dự phòng: Tìm dấu hiệu pin này là video (nút play hoặc thời lượng)
  // Nếu có dấu hiệu nhưng thẻ video chưa load, ta vẫn tạm gọi là video (để content-script poll)
  const isVideoPin = pinEl.querySelector('[data-test-id="pin-visual-wrapper"] svg[aria-label="Play"]') || 
                     pinEl.textContent?.match(/\d+:\d+/);


  // 4. Phát hiện Ảnh (nếu không có Video)
  if (imgEl && imgEl.src) {
    const originalUrl = getOriginalImageUrl(imgEl.src);
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
