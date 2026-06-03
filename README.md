# Pinterest Video & Image Downloader Extension

A modern, intuitive Chrome Extension to easily download high-quality videos and images from Pinterest. Features a batch collection cart, smart media filtering, and custom base download paths (perfect for managing B-Roll assets for Discord video bots).

Developed and maintained by **[Duy Trần (duytnb79)](https://github.com/duytnb79)**.

---

## 🌟 Key Features

- **Direct Download Buttons**: Automatically embeds control widgets (`MP4/IMG` badges, cart, and direct download buttons) on top of media containers. No hover required to view download options.
- **Auto Hashtag & Keyword Extraction**: Extracts hashtags, descriptions, and AI visual annotations directly from Pinterest's DOM metadata, automatically appending them to filenames for easy search.
- **Batch Download Queue (Cart)**: Add multiple videos to a queue, assign specific or batch tags, and download all files at once with a single click.
- **Custom Download Path Settings**: Configure custom subfolders (default: `discord-video-bot-broll`) within Chrome's default downloads directory. Fully compatible with local directory symlinks.
- **Smart Media Grid Filter**: Instantly hides static images and automatically rearranges Pinterest's Masonry grid layout to provide a clean video-only browsing experience.
- **Closeup Player Support**: Seamlessly supports closeup pages, allowing download overlays on main video players that use Blob streaming URLs, with automatic thumbnail poster recovery.

---

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Vanilla CSS.
- **Bundler**: Vite.
- **API**: Chrome Extension Manifest V3 (Background Service Workers, Content Scripts, Storage API).
- **Icons**: Lucide Icons.

---

## 🚀 Installation Guide (For Development)

### 1. Clone the Repository
```bash
git clone https://github.com/duytnb79/pinterest-download-extension.git
cd pinterest-download-extension
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Build the Project
```bash
npm run build
```
This compiles the extension files into the `dist/` directory.

### 4. Load the Extension in Google Chrome
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked** and select the built `dist/` folder.

---

## 📖 Storage Hierarchy & Usage

Google Chrome downloads are restricted to the local `Downloads` directory for security purposes. 

Files downloaded by this extension will be organized according to the following tree:
```
📁 Downloads/
 └── 📁 [Custom Download Folder]/      <-- Configured in Options (Default: discord-video-bot-broll)
      └── 📁 [Media Tag]/              <-- E.g. dance, motivation, lofi, etc.
           └── 🎥 pinterest_id_timestamp__[tags].mp4
```

### Configuring Settings:
1. Right-click the extension icon in Chrome -> select **Options**.
2. Enter your desired base download directory. Leave blank to save files directly into your default Downloads folder.
3. Click **Save Configuration**.

---

## 📄 License & Compliance

This project is developed **strictly for private, educational, and personal backup purposes (Private & Educational Use Only)**. Commercial distribution or public redistribution is not recommended to ensure compliance with third-party copyright terms and conditions.

Developed by **Duy Trần** - [github.com/duytnb79](https://github.com/duytnb79)
