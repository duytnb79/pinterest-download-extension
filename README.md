# Pinterest Video & Image Downloader Extension

A modern, premium Chrome Extension to easily download high-quality videos and images from Pinterest directly into custom predefined folders, automatically organized and categorized by tags/hashtags.

Developed and maintained by **[Duy Trần (duytnb79)](https://github.com/duytnb79)**.

---

## 🌟 Key Features

- **Organized Directory Downloads**: Categorize your downloaded media into specific subfolders automatically based on tags/hashtags.
- **Direct Download Controls**: Automatically embeds control widgets (`MP4/IMG` format badges, queue cart, and direct download buttons) on top of media cards without requiring hover.
- **Auto Hashtag & Metadata Extraction**: Automatically extracts hashtags and metadata from Pinterest's DOM to include in the downloaded filenames for easy organization.
- **Batch Download Queue (Cart)**: Add multiple items to a queue, assign specific or batch tags, and download everything at once with a single click.
- **Custom Download Path Settings**: Configure custom subfolders (default: `pinterest-downloads`) within Chrome's default Downloads directory.
- **Smart Media Filter**: Hide static image pins and automatically rearrange Pinterest's Masonry grid layout for a video-only browsing experience.
- **Closeup View Integration**: Fully supports closeup pin pages, allowing direct downloads on main video players that use Blob streaming URLs.

---

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Vanilla CSS.
- **Bundler**: Vite.
- **API**: Chrome Extension Manifest V3 (Background Service Workers, Content Scripts, Storage API).
- **Icons**: Lucide Icons.

---

## 🚀 Installation Guide

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

For security, Google Chrome restricts downloads to the local `Downloads` directory. Files downloaded by this extension are organized into the following tree structure:

```
📁 Downloads/
 └── 📁 [Custom Download Folder]/      <-- Configured in Options (Default: pinterest-downloads)
      └── 📁 [Media Tag]/              <-- E.g. dance, motivation, lofi, etc.
           └── 🎥 pinterest_id_timestamp__[tags].mp4
```

### Configuring Settings:
1. Right-click the extension icon in Chrome -> select **Options**.
2. Enter your desired base download directory. Leave blank to save files directly into your default Downloads folder.
3. Click **Save Settings**.

---

## 📄 License & Compliance

This project is developed **strictly for private, educational, and personal backup purposes (Private & Educational Use Only)**. Public redistribution or commercial use is not recommended to ensure compliance with third-party copyright terms and conditions.

Developed by **Duy Trần** - [github.com/duytnb79](https://github.com/duytnb79)
