import React, { useState } from 'react';
import { Tag, FolderInput } from 'lucide-react';

interface BulkOperationsProps {
  presetTags: string[];
  onApplyTag: (tag: string) => void;
  disabled?: boolean;
}

export const BulkOperations: React.FC<BulkOperationsProps> = ({
  presetTags,
  onApplyTag,
  disabled = false
}) => {
  const [selectedTag, setSelectedTag] = useState('');
  const [customTag, setCustomTag] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const handleApply = () => {
    const finalTag = isCustom ? customTag.trim() : selectedTag;
    if (!finalTag) return;
    onApplyTag(finalTag);
    setCustomTag('');
  };

  return (
    <div className="glass-effect p-3 rounded-xl border border-app-border/60 mb-3">
      <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-app-text-muted">
        <FolderInput className="w-3.5 h-3.5 text-app-accent" />
        <span>Gán Tag Hàng Loạt (Bulk Tagging)</span>
      </div>
      
      <div className="flex gap-2">
        <div className="flex-1 flex gap-1">
          {isCustom ? (
            <input
              type="text"
              placeholder="Nhập tag mới..."
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              className="flex-1 bg-app-bg-card border border-app-border rounded-lg px-2.5 py-1 text-xs text-app-text focus:outline-none focus:border-app-accent/80 transition-colors"
            />
          ) : (
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="flex-1 bg-app-bg-card border border-app-border rounded-lg px-2.5 py-1 text-xs text-app-text focus:outline-none focus:border-app-accent/80 transition-colors"
            >
              <option value="">-- Chọn hashtag/tag --</option>
              {presetTags.map(tag => (
                <option key={tag} value={tag}>#{tag}</option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => setIsCustom(!isCustom)}
            className="px-2 py-1 text-[10px] bg-app-bg-hover hover:bg-app-border border border-app-border text-app-text-muted hover:text-app-text rounded-lg transition-colors"
          >
            {isCustom ? 'Chọn có sẵn' : 'Tự gõ'}
          </button>
        </div>

        <button
          type="button"
          onClick={handleApply}
          disabled={disabled || (isCustom ? !customTag.trim() : !selectedTag)}
          className="px-3 py-1 bg-gradient-to-r from-app-accent to-app-accent-hover disabled:from-app-border disabled:to-app-border disabled:text-app-text-muted/50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-app-accent/15 text-white font-medium text-xs rounded-lg transition-all flex items-center gap-1"
        >
          <Tag className="w-3 h-3" />
          <span>Gán</span>
        </button>
      </div>
    </div>
  );
};
