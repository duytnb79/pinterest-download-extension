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
  FolderOpen
} from 'lucide-react';
import { getSettings, saveSettings } from '../shared/storage';
import { ExtensionSettings } from '../shared/types';

export const OptionsApp: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings>({ presetTags: [], defaultTag: 'default' });
  const [newTag, setNewTag] = useState('');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  // Khởi tạo settings
  useEffect(() => {
    const loadData = async () => {
      const data = await getSettings();
      setSettings(data);
    };
    void loadData();
  }, []);

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

    const updatedSettings = { presetTags: updatedTags, defaultTag };
    setSettings(updatedSettings);
    await saveSettings(updatedSettings);
  };

  const handleSetDefaultTag = async (tag: string) => {
    const updatedSettings = { ...settings, defaultTag: tag };
    setSettings(updatedSettings);
    await saveSettings(updatedSettings);
  };

  const handleCopyCmd = (cmd: string, key: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(key);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const symlinkCmd1 = `cmd /c mklink /d "C:\\Users\\trann\\Downloads\\discord-video-bot-broll" "D:\\videos\\broll"`;
  const symlinkCmd2 = `cmd /c mklink /d "c:\\Users\\trann\\Desktop\\Learning\\discord-video-bot\\broll" "D:\\videos\\broll"`;

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
          
          {/* Left Column: Tag Management */}
          <div className="lg:col-span-1 space-y-6">
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

          {/* Right Column: Symlink Instructions */}
          <div className="lg:col-span-2 space-y-6">
            <section className="glass-effect p-6 rounded-2xl border border-app-border/40 space-y-6">
              
              {/* Title */}
              <div className="flex items-center gap-2 text-sm font-bold border-b border-app-border/30 pb-3">
                <Terminal className="w-4.5 h-4.5 text-app-primary" />
                <span>Hướng dẫn liên kết Symlink 2 chiều sang Ổ D</span>
              </div>

              {/* Alert context */}
              <div className="bg-app-accent/10 border border-app-accent/20 rounded-xl p-4 flex gap-3 text-xs text-app-text-muted leading-relaxed">
                <AlertCircle className="w-5 h-5 text-app-accent flex-shrink-0" />
                <div>
                  <span className="font-bold text-app-text">Tại sao phải tạo Symlink? </span> 
                  Trình duyệt Chrome chỉ cho phép lưu file tải xuống trong thư mục <b>Downloads</b> do cơ chế Sandbox bảo mật. 
                  Để video tự động tải về <b>ổ D</b> (tiết kiệm ổ C) và lập tức xuất hiện trong thư mục của <b>Discord Bot</b>, 
                  chúng ta chỉ cần thiết lập Symlink <b>1 lần duy nhất</b> trên Windows!
                </div>
              </div>

              {/* Step By Step */}
              <div className="space-y-6">
                
                {/* Step 1 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-app-text">
                    <span className="w-5 h-5 rounded-full bg-app-bg-hover border border-app-border flex items-center justify-center text-app-accent text-[10px]">1</span>
                    <span>Tạo thư mục tài nguyên chính trên ổ D</span>
                  </div>
                  <p className="text-xs text-app-text-muted pl-7">
                    Mở <b>File Explorer</b> trên Windows và tạo một thư mục trống tại đường dẫn: 
                    <code className="mx-1 bg-app-bg-card px-1.5 py-0.5 rounded border border-app-border text-app-accent font-semibold">D:\videos\broll</code>
                  </p>
                </div>

                {/* Step 2 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-app-text">
                    <span className="w-5 h-5 rounded-full bg-app-bg-hover border border-app-border flex items-center justify-center text-app-accent text-[10px]">2</span>
                    <span>Tạo liên kết từ Chrome Downloads sang Ổ D</span>
                  </div>
                  <p className="text-xs text-app-text-muted pl-7">
                    Nhấp nút tìm kiếm trên Windows, gõ <b>CMD</b>, nhấp chuột phải và chọn <b>Run as Administrator</b> (Chạy với quyền Admin). 
                    Sao chép dòng lệnh dưới đây và chạy trong CMD:
                  </p>
                  
                  {/* Code box 1 */}
                  <div className="pl-7">
                    <div className="relative bg-app-bg-card border border-app-border rounded-xl p-3.5 font-mono text-[11px] leading-relaxed group">
                      <code className="text-app-accent block pr-12 select-all">{symlinkCmd1}</code>
                      <button
                        onClick={() => handleCopyCmd(symlinkCmd1, 'cmd1')}
                        className="absolute right-3 top-3 p-1.5 bg-app-bg-hover hover:bg-app-border text-app-text-muted hover:text-app-text rounded-lg border border-app-border/40 transition-colors"
                        title="Copy command"
                      >
                        {copiedCmd === 'cmd1' ? <Check className="w-3.5 h-3.5 text-app-success" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-app-text">
                    <span className="w-5 h-5 rounded-full bg-app-bg-hover border border-app-border flex items-center justify-center text-app-accent text-[10px]">3</span>
                    <span>Tạo liên kết từ Discord Bot sang Ổ D</span>
                  </div>
                  <p className="text-xs text-app-text-muted pl-7">
                    Tiếp tục chạy dòng lệnh sau trong CMD (quyền Admin) để liên kết thư mục tài nguyên của Discord Bot tới cùng thư mục ổ D:
                  </p>
                  
                  {/* Code box 2 */}
                  <div className="pl-7">
                    <div className="relative bg-app-bg-card border border-app-border rounded-xl p-3.5 font-mono text-[11px] leading-relaxed group">
                      <code className="text-app-accent block pr-12 select-all">{symlinkCmd2}</code>
                      <button
                        onClick={() => handleCopyCmd(symlinkCmd2, 'cmd2')}
                        className="absolute right-3 top-3 p-1.5 bg-app-bg-hover hover:bg-app-border text-app-text-muted hover:text-app-text rounded-lg border border-app-border/40 transition-colors"
                        title="Copy command"
                      >
                        {copiedCmd === 'cmd2' ? <Check className="w-3.5 h-3.5 text-app-success" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Architecture visualization */}
                <div className="pl-7 pt-2">
                  <div className="bg-app-bg-card/30 border border-app-border/40 rounded-xl p-4 space-y-3">
                    <div className="text-[11px] font-bold text-app-text-muted uppercase tracking-wider flex items-center gap-1">
                      <FolderOpen className="w-3.5 h-3.5 text-app-accent" />
                      Sơ đồ hoạt động sau khi cấu hình
                    </div>
                    
                    <div className="flex items-center justify-between text-[11px] font-medium text-app-text-muted py-2 px-1">
                      <div className="flex flex-col items-center gap-1.5 bg-app-bg-card border border-app-border px-3 py-2 rounded-lg">
                        <span className="text-app-text">1. Pinterest Ext</span>
                        <span className="text-[9px]">Tải file vào folder tag</span>
                      </div>
                      
                      <ArrowRight className="w-4 h-4 text-app-accent" />
                      
                      <div className="flex flex-col items-center gap-1.5 bg-gradient-to-r from-app-accent/15 to-app-primary/15 border border-app-accent/30 px-3.5 py-2.5 rounded-xl text-center">
                        <span className="text-app-text font-bold">2. Lưu ở Ổ D (D:\\videos\\broll)</span>
                        <span className="text-[9px]">Video phân cấp theo hashtag</span>
                      </div>
                      
                      <ArrowRight className="w-4 h-4 text-app-accent" />
                      
                      <div className="flex flex-col items-center gap-1.5 bg-app-bg-card border border-app-border px-3 py-2 rounded-lg">
                        <span className="text-app-text">3. Discord Video Bot</span>
                        <span className="text-[9px]">Tự động đọc video dựng phim</span>
                      </div>
                    </div>
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
