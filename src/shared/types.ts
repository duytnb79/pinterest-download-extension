export interface CartItem {
  id: string;        // Pinterest Pin ID hoặc hash URL
  url: string;       // URL tải trực tiếp (video hoặc ảnh chất lượng cao)
  pageUrl: string;   // URL trang Pinterest nguồn
  thumbnail: string; // Ảnh thu nhỏ để hiển thị trong giỏ hàng
  type: 'video' | 'image';
  tag: string;       // Tag phân loại thư mục (vd: anime, lofi, motivation...)
  title?: string;    // Tiêu đề Pin nếu có
  addedAt: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  progress?: number; // Tiến trình tải (0 - 100)
  error?: string;    // Lỗi nếu tải thất bại
}

export interface ExtensionSettings {
  presetTags: string[];
  defaultTag: string;
  videoOnly: boolean; // Chỉ hiển thị nút tải và giỏ hàng cho video, bỏ qua ảnh hoàn toàn
}

export const DEFAULT_PRESET_TAGS = [
  'motivation',
  'lofi',
  'anime',
  'nature',
  'cyberpunk',
  'cinematic',
  'dark_aesthetic'
];
