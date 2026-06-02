import React, { useState } from 'react';
import { 
  Trash2, 
  Download, 
  Clock, 
  Loader2, 
  CheckCircle, 
  AlertTriangle, 
  FileVideo, 
  FileImage,
  Tag
} from 'lucide-react';
import { CartItem } from '../../shared/types';

interface CartListProps {
  items: CartItem[];
  presetTags: string[];
  onRemove: (id: string) => void;
  onUpdateTag: (id: string, tag: string) => void;
  onDownloadItem: (item: CartItem) => void;
}

export const CartList: React.FC<CartListProps> = ({
  items,
  presetTags,
  onRemove,
  onUpdateTag,
  onDownloadItem
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customTagInput, setCustomTagInput] = useState('');

  const handleCustomTagSubmit = (id: string) => {
    if (customTagInput.trim()) {
      onUpdateTag(id, customTagInput.trim());
      setEditingId(null);
      setCustomTagInput('');
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-app-bg-hover border border-app-border flex items-center justify-center mb-3">
          <Clock className="w-6 h-6 text-app-text-muted/60" />
        </div>
        <p className="text-xs font-semibold text-app-text mb-1">Giỏ hàng đang trống</p>
        <p className="text-[11px] text-app-text-muted max-w-[280px]">
          Hãy truy cập Pinterest, rê chuột lên các video hoặc hình ảnh và nhấn nút để thêm vào giỏ hàng.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
      {items.map((item) => (
        <div 
          key={item.id}
          className="flex items-center gap-3 bg-app-bg-card border border-app-border/40 hover:border-app-border/80 rounded-xl p-2.5 transition-all duration-200"
        >
          {/* Thumbnail */}
          <div className="relative w-11 h-11 rounded-lg overflow-hidden border border-app-border bg-app-bg flex-shrink-0">
            {item.thumbnail ? (
              <img 
                src={item.thumbnail} 
                alt="thumbnail" 
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-app-bg-hover">
                {item.type === 'video' ? (
                  <FileVideo className="w-5 h-5 text-app-text-muted" />
                ) : (
                  <FileImage className="w-5 h-5 text-app-text-muted" />
                )}
              </div>
            )}
            
            {/* Format badge overlay */}
            <div className={`absolute top-0.5 left-0.5 rounded px-1 py-0.5 text-[8px] font-extrabold uppercase text-white ${
              item.type === 'video' ? 'bg-app-primary' : 'bg-app-accent'
            }`}>
              {item.type === 'video' ? 'MP4' : 'IMG'}
            </div>
          </div>

          {/* Details & Tag selection */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-app-text-muted truncate mb-1" title={item.title}>
              {item.title || `${item.type === 'video' ? 'Pinterest Video' : 'Pinterest Image'} (${item.id})`}
            </p>
            
            <div className="flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-app-text-muted" />
              
              {editingId === item.id ? (
                <div className="flex items-center gap-1 flex-1">
                  <input
                    type="text"
                    placeholder="Tag..."
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    className="w-full max-w-[90px] bg-app-bg border border-app-border rounded px-1.5 py-0.5 text-[10px] text-app-text focus:outline-none"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCustomTagSubmit(item.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                  <button
                    onClick={() => handleCustomTagSubmit(item.id)}
                    className="px-1.5 py-0.5 text-[9px] bg-app-accent text-white rounded font-medium"
                  >
                    Lưu
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <select
                    value={item.tag}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setEditingId(item.id);
                        setCustomTagInput(item.tag);
                      } else {
                        onUpdateTag(item.id, e.target.value);
                      }
                    }}
                    className="bg-transparent text-[11px] text-app-accent hover:text-app-accent-hover font-semibold border-none outline-none p-0 cursor-pointer"
                  >
                    <option value={item.tag}>#{item.tag}</option>
                    {presetTags.filter(t => t !== item.tag).map(t => (
                      <option key={t} value={t}>#{t}</option>
                    ))}
                    <option value="__custom__">+ Tag mới...</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Status Indicators */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {item.status === 'pending' && (
              <div className="tooltip-container">
                <Clock className="w-4 h-4 text-app-text-muted/60" />
                <span className="tooltip-text">Chờ tải xuống</span>
              </div>
            )}
            {item.status === 'downloading' && (
              <div className="tooltip-container">
                <Loader2 className="w-4 h-4 text-app-accent animate-spin" />
                <span className="tooltip-text">Đang tải...</span>
              </div>
            )}
            {item.status === 'completed' && (
              <div className="tooltip-container">
                <CheckCircle className="w-4 h-4 text-app-success" />
                <span className="tooltip-text">Tải thành công!</span>
              </div>
            )}
            {item.status === 'failed' && (
              <div className="tooltip-container">
                <AlertTriangle className="w-4 h-4 text-app-danger" />
                <span className="tooltip-text">{item.error || 'Tải thất bại'}</span>
              </div>
            )}

            {/* Individual Actions */}
            <div className="flex items-center gap-1 border-l border-app-border/40 pl-2">
              {item.status !== 'downloading' && item.status !== 'completed' && (
                <button
                  onClick={() => onDownloadItem(item)}
                  className="p-1 hover:bg-app-bg-hover text-app-text-muted hover:text-app-text rounded-lg transition-colors"
                  title="Tải riêng mục này"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}
              
              <button
                onClick={() => onRemove(item.id)}
                disabled={item.status === 'downloading'}
                className="p-1 hover:bg-app-bg-hover text-app-text-muted hover:text-app-danger disabled:opacity-30 disabled:pointer-events-none rounded-lg transition-colors"
                title="Xóa khỏi giỏ"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
