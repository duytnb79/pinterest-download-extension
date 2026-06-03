import React, { useEffect, useState } from 'react';
import { 
  Tag as TagIcon, 
  Terminal, 
  Copy, 
  Check, 
  Plus, 
  Trash2, 
  Settings, 
  AlertCircle, 
  ArrowRight,
  ExternalLink,
  FolderOpen,
  Video
} from 'lucide-react';
import { getSettings, saveSettings } from '../shared/storage';
import { ExtensionSettings } from '../shared/types';

export const OptionsApp: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings>({ presetTags: [], defaultTag: 'default', videoOnly: true, downloadFolder: 'discord-video-bot-broll' });
  const [newTag, setNewTag] = useState('');
  const [downloadFolderInput, setDownloadFolderInput] = useState('');
  const [saveStatus, setSaveStatus] = useState<boolean | null>(null);

  // Khởi tạo settings
  useEffect(() => {
    const loadData = async () => {
      const data = await getSettings();
      setSettings(data);
      setDownloadFolderInput(data.downloadFolder || '');
    };
    void loadData();
  }, []);

  const handleToggleVideoOnly = async () => {
    const updated = { ...settings, videoOnly: !settings.videoOnly };
    setSettings(updated);
    await saveSettings(updated);
  };

  const handleAddTag = async () => {
    const tag = newTag.trim().toLowerCase();
    if (!tag) return;
    if (settings.presetTags.includes(tag)) {
      alert('Tag này đã tồn tại!');
      return;
    }

    const updatedTags = [...settings.presetTags, tag];
    const updatedSettings = { ...settings, presetTags: updatedTags };
    setSettings(updatedSettings);
    await saveSettings(updatedSettings);
    setNewTag('');
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (tagToRemove === 'default') {
      alert('Không thể xóa tag "default" mặc định!');
      return;
    }

    const updatedTags = settings.presetTags.filter(t => t !== tagToRemove);
    let defaultTag = settings.defaultTag;
    if (defaultTag === tagToRemove) {
      defaultTag = 'default';
    }

    const updatedSettings = { ...settings, presetTags: updatedTags, defaultTag };
    setSettings(updatedSettings);
    await saveSettings(updatedSettings);
  };

  const handleSetDefaultTag = async (tag: string) => {
    const updatedSettings = { ...settings, defaultTag: tag };
    setSettings(updatedSettings);
    await saveSettings(updatedSettings);
  };

  const handleSaveDownloadFolder = async () => {
    const updatedSettings = { ...settings, downloadFolder: downloadFolderInput.trim() };
    setSettings(updatedSettings);
    await saveSettings(updatedSettings);
    setSaveStatus(true);
    setTimeout(() => setSaveStatus(null), 2000);
  };

  return (
    <div className="min-h-screen bg-app-bg text-app-text py-10 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-app-border/40 pb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-app-primary to-app-accent flex items-center justify-center shadow-lg shadow-app-primary/10">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide uppercase">Cấu hình Pinterest Manager</h1>
            <p className="text-xs text-app-text-muted">Quản lý phân cấp thư mục B-Roll và tự động hóa đồng bộ với Discord Bot</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Tag Management & Settings */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Bộ Lọc Media */}
            <section className="glass-effect p-5 rounded-2xl border border-app-border/40 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold border-b border-app-border/30 pb-2">
                <Video className="w-4 h-4 text-app-primary" />
                <span>Bộ Lọc Media (Tối ưu B-Roll)</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold">Ẩn bài viết hình ảnh</span>
                  <span className="text-[10px] text-app-text-muted">Ẩn hoàn toàn các bài viết ảnh tĩnh trên Pinterest, chỉ giữ lại video</span>
                </div>
                <button
                  onClick={handleToggleVideoOnly}
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-all duration-300 ${settings.videoOnly ? 'bg-app-accent justify-end' : 'bg-app-border justify-start'}`}
                >
                  <span className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ${settings.videoOnly ? 'translate-x-0' : ''}`} />
                </button>
              </div>
            </section>

            <section className="glass-effect p-5 rounded-2xl border border-app-border/40 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold border-b border-app-border/30 pb-2">
                <TagIcon className="w-4 h-4 text-app-accent" />
                <span>Quản Lý Thẻ (Tags / Hashtags)</span>
              </div>

              {/* Add tag */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Thêm tag mới..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void handleAddTag()}
                  className="flex-1 bg-app-bg-card border border-app-border rounded-xl px-3 py-2 text-xs text-app-text focus:outline-none focus:border-app-accent/80 transition-colors"
                />
                <button
                  onClick={handleAddTag}
                  className="p-2 bg-app-accent hover:bg-app-accent-hover text-white rounded-xl transition-all flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Tag list */}
              <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1">
                {/* Default tag */}
                <div className="flex items-center justify-between bg-app-bg-card/40 border border-app-border/20 rounded-xl px-3 py-2 text-xs">
                  <span className="font-semibold text-app-text-muted">#default</span>
                  <div className="flex items-center gap-2">
                    {settings.defaultTag === 'default' ? (
                      <span className="text-[10px] bg-app-accent/20 text-app-accent px-2 py-0.5 rounded-full font-bold">Mặc định</span>
                    ) : (
                      <button
                        onClick={() => void handleSetDefaultTag('default')}
                        className="text-[10px] text-app-text-muted hover:text-app-accent transition-colors font-medium"
                      >
                        Đặt mặc định
                      </button>
                    )}
                  </div>
                </div>

                {/* Preset tags */}
                {settings.presetTags.map(tag => (
                  <div 
                    key={tag}
                    className="flex items-center justify-between bg-app-bg-card hover:bg-app-bg-hover border border-app-border/30 rounded-xl px-3 py-2 text-xs transition-colors"
                  >
                    <span className="font-medium">#{tag}</span>
                    <div className="flex items-center gap-2.5">
                      {settings.defaultTag === tag ? (
                        <span className="text-[10px] bg-app-accent/20 text-app-accent px-2 py-0.5 rounded-full font-bold">Mặc định</span>
                      ) : (
                        <button
                          onClick={() => void handleSetDefaultTag(tag)}
                          className="text-[10px] text-app-text-muted hover:text-app-accent transition-colors font-medium"
                        >
                          Đặt mặc định
                        </button>
                      )}
                      <button
                        onClick={() => void handleRemoveTag(tag)}
                        className="text-app-text-muted hover:text-app-danger transition-colors"
                        title="Xóa tag này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column: Download Folder Config */}
          <div className="lg:col-span-2 space-y-6">
            <section className="glass-effect p-6 rounded-2xl border border-app-border/40 space-y-6">
              
              {/* Title */}
              <div className="flex items-center gap-2 text-sm font-bold border-b border-app-border/30 pb-3">
                <FolderOpen className="w-4.5 h-4.5 text-app-primary" />
                <span>Cấu Hình Thư Mục Tải Xuống (Download Folder)</span>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-app-text">Đường dẫn thư mục gốc tải xuống</label>
                  <p className="text-[11px] text-app-text-muted leading-relaxed">
                    Chrome chỉ cho phép tải xuống vào thư mục <b>Downloads</b>. 
                    Nhập tên thư mục con ở đây làm thư mục lưu trữ (hoặc liên kết Symlink). 
                    Để trống nếu muốn tải trực tiếp vào thư mục Downloads gốc.
                  </p>
                </div>

                <div className="flex gap-2.5 items-center">
                  <input
                    type="text"
                    placeholder="discord-video-bot-broll"
                    value={downloadFolderInput}
                    onChange={(e) => setDownloadFolderInput(e.target.value)}
                    className="flex-1 bg-app-bg-card border border-app-border rounded-xl px-3 py-2.5 text-xs text-app-text focus:outline-none focus:border-app-accent/80 transition-colors font-mono"
                  />
                  <button
                    onClick={handleSaveDownloadFolder}
                    className="px-4 py-2.5 bg-app-accent hover:bg-app-accent-hover text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0"
                  >
                    {saveStatus ? <Check className="w-3.5 h-3.5" /> : null}
                    {saveStatus ? 'Đã lưu!' : 'Lưu cấu hình'}
                  </button>
                </div>

                {/* Path Visualizer */}
                <div className="bg-app-bg-card/30 border border-app-border/40 rounded-xl p-4.5 mt-2 space-y-3">
                  <div className="text-[11px] font-bold text-app-text-muted uppercase tracking-wider">
                    Sơ đồ đường dẫn lưu trữ thực tế trên máy tính
                  </div>
                  
                  <div className="font-mono text-xs text-app-text-muted leading-relaxed space-y-1 pl-1 bg-app-bg-card/50 p-3 rounded-lg border border-app-border/20">
                    <div className="text-app-text">📁 Downloads/</div>
                    {downloadFolderInput.trim() && (
                      <div className="pl-4 text-app-accent">
                        └── 📁 {downloadFolderInput.trim()}/ <span className="text-[10px] text-app-text-muted font-sans font-medium">(Thư mục gốc bạn cài đặt)</span>
                      </div>
                    )}
                    <div className={downloadFolderInput.trim() ? "pl-8 text-app-primary" : "pl-4 text-app-primary"}>
                      └── 📁 [tag] / <span className="text-[10px] text-app-text-muted font-sans font-medium">(Tên tag, vd: dance, motivation, lofi...)</span>
                    </div>
                    <div className={downloadFolderInput.trim() ? "pl-12 text-app-text" : "pl-8 text-app-text"}>
                      └── 🎥 pinterest_id_timestamp__[tags].mp4
                    </div>
                  </div>
                </div>

                <div className="bg-app-accent/10 border border-app-accent/20 rounded-xl p-4 flex gap-3 text-xs text-app-text-muted leading-relaxed">
                  <AlertCircle className="w-5 h-5 text-app-accent flex-shrink-0" />
                  <div>
                    <span className="font-bold text-app-text">Lưu ý về đồng bộ Discord Bot: </span> 
                    Để tự động đưa video vào Discord Bot của bạn, bạn có thể tạo Symlink trỏ thư mục trên của Chrome sang thư mục broll của bot. Mặc định nếu không thiết lập, thư mục gốc sẽ là <code>discord-video-bot-broll</code>.
                  </div>
                </div>
              </div>

            </section>
          </div>

        </div>

      </div>
    </div>
  );
};
