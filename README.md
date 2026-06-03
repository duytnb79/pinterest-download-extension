# Pinterest Video & Image Downloader Extension

Một Chrome Extension hiện đại, trực quan giúp tải video và hình ảnh chất lượng cao từ Pinterest, quản lý giỏ hàng tải hàng loạt, lọc bài viết thông minh, và hỗ trợ cấu hình thư mục lưu trữ tùy chỉnh (tối ưu hóa làm tài nguyên B-Roll cho các Discord Video Bot).

Được phát triển và duy trì bởi **[Duy Trần (duytnb79)](https://github.com/duytnb79)**.

---

## 🌟 Các Tính Năng Nổi Bật

- **Hiển Thị Nút Tải Trực Tiếp:** Tự động nhúng cụm nút điều khiển chuyên nghiệp (`MP4/IMG` Badge, Nút Giỏ Hàng, Nút Tải Ngay) trực tiếp lên từng video/ảnh trên Pinterest mà không cần phải hover chuột.
- **Tự Động Bóc Tách Tags (Hashtags):** Tự động phát hiện và trích xuất các hashtag, từ khóa mô tả và thông tin AI Visual Annotations từ DOM của Pinterest để lưu kèm tên file.
- **Giỏ Hàng Tải Hàng Loạt (Batch Cart):** Thêm hàng chục video vào giỏ hàng, gán tag phân loại tùy chỉnh cho từng file hoặc hàng loạt, sau đó tải xuống chỉ với một cú click.
- **Cấu Hình Thư Mục Tùy Chỉnh:** Cho phép tùy biến thư mục con trong Downloads (Ví dụ: `discord-video-bot-broll`), hỗ trợ tạo liên kết Symlink đồng bộ trực tiếp sang ổ D hoặc thư mục của Discord Bot.
- **Bộ Lọc Media Thông Minh:** Tự động ẩn toàn bộ bài viết dạng hình ảnh tĩnh và sắp xếp, lấp đầy các khoảng trống trên lưới Pinterest (Masonry Grid Layout) để tối ưu việc tìm kiếm video B-Roll.
- **Hỗ Trợ Video Chi Tiết (Closeup Video):** Hỗ trợ đầy đủ việc hiển thị nút tải và bóc tách link gốc chất lượng cao đối với video chính đang phát (kể cả khi sử dụng Blob Streaming URL).

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend:** React, TypeScript, TailwindCSS / CSS Vanilla.
- **Bundler:** Vite.
- **API:** Chrome Extension Manifest V3 (Background Service Workers, Content Scripts, Storage API).
- **Icons:** Lucide Icons.

---

## 🚀 Hướng Dẫn Cài Đặt (Cho Nhà Phát Triển)

### 1. Tải Mã Nguồn
```bash
git clone https://github.com/duytnb79/pinterest-download-extension.git
cd pinterest-download-extension
```

### 2. Cài Đặt Thư Viện Dependencies
```bash
npm install
```

### 3. Build Dự Án
```bash
npm run build
```
Thư mục `dist/` chứa mã nguồn đã biên dịch sẵn sàng để nạp vào trình duyệt.

### 4. Nạp vào Trình Duyệt Chrome
1. Mở Chrome và truy cập đường dẫn: `chrome://extensions/`
2. Bật chế độ **Developer mode** ở góc phía trên bên phải.
3. Kéo thả thư mục `dist/` vào trang quản lý tiện ích (hoặc chọn **Load unpacked** và trỏ đến thư mục `dist/`).

---

## 📖 Hướng Dẫn Sử Dụng & Đường Dẫn Lưu Trữ

Trình duyệt Chrome chạy dưới cơ chế bảo mật Sandbox nên mọi file tải xuống luôn nằm trong thư mục gốc `Downloads` của máy tính.

Đường dẫn lưu tệp tin thực tế sẽ được phân cấp như sau:
```
📁 Downloads/
 └── 📁 [Thư mục tải xuống tùy chỉnh]/    <-- Cài đặt trong mục Options (Mặc định: discord-video-bot-broll)
      └── 📁 [Tag của video]/             <-- Ví dụ: dance, motivation, lofi...
           └── 🎥 pinterest_id_timestamp__[tags].mp4
```

### Cách Cấu Hình Options (Tùy Chọn):
1. Nhấp chuột phải vào biểu tượng Extension trên thanh công cụ trình duyệt -> Chọn **Options** (Tùy chọn).
2. Nhập tên thư mục lưu trữ mong muốn. Bạn có thể để trống nếu muốn tải trực tiếp vào thư mục Downloads gốc.
3. Nhấp **Lưu cấu hình**.

---

## 📄 Bản Quyền & Giấy Phép

Dự án này được phát hành dưới Giấy phép MIT. Xem tệp `LICENSE` để biết thêm chi tiết.

Phát triển bởi **Duy Trần** - [github.com/duytnb79](https://github.com/duytnb79)
