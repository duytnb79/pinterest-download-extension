import React, { useEffect, useState } from 'react';
// @ts-ignore
import logoIcon from '../assets/icon48.png';
import { 
  FolderIcon, 
  Settings, 
  Trash2, 
  Download, 
  Plus, 
  ShoppingCart, 
  Layers 
} from 'lucide-react';
import { 
  getCartItems, 
  getSettings, 
  removeFromCart, 
  updateCartItemTag, 
  clearCart, 
  saveCartItems 
} from '../shared/storage';
import { CartItem } from '../shared/types';
import { CartList } from './components/CartList';
import { BulkOperations } from './components/BulkOperations';
import { ProgressBar } from './components/ProgressBar';

export const PopupApp: React.FC = () => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [presetTags, setPresetTags] = useState<string[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // Khởi tạo và đồng bộ dữ liệu
  useEffect(() => {
    const initData = async () => {
      const cart = await getCartItems();
      const settings = await getSettings();
      setItems(cart);
      setPresetTags(settings.presetTags);
    };
    void initData();

    // Lắng nghe thay đổi storage từ background script
    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>, 
      areaName: string
    ) => {
      if (areaName === 'local' && changes.video_ext_cart) {
        const newVal = changes.video_ext_cart.newValue || [];
        setItems(newVal);
      }
      if (areaName === 'local' && changes.video_ext_settings) {
        const settings = changes.video_ext_settings.newValue;
        if (settings?.presetTags) {
          setPresetTags(settings.presetTags);
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  // Tính toán tiến trình tải (Đảm bảo tuyến tính đi lên mượt mà, không bao giờ bị giật lùi)
  useEffect(() => {
    const calculateProgress = async () => {
      const downloadingItems = items.filter(item => item.status === 'downloading');
      const completedItems = items.filter(item => item.status === 'completed');
      const failedItems = items.filter(item => item.status === 'failed');
      const pendingItems = items.filter(item => item.status === 'pending');
      
      if (downloadingItems.length > 0) {
        setIsDownloading(true);
        
        // Đọc tổng số lượng file trong phiên tải hiện tại từ storage
        const storageData = await chrome.storage.local.get('video_ext_bulk_total');
        const bulkTotal = storageData.video_ext_bulk_total || (downloadingItems.length + completedItems.length);
        
        // Số file thực sự đã hoàn thành tải trong phiên này:
        // Lấy bulkTotal trừ đi số lượng file còn đang chờ và đang tải
        const completedInSession = Math.max(0, bulkTotal - pendingItems.length - downloadingItems.length - failedItems.length);
        
        // Tiến trình thô = (số lượng file hoàn thành * 100) + (số lượng file đang tải * 50% tiến trình ước tính để tạo cảm giác mượt)
        const progressSum = (completedInSession * 100) + (downloadingItems.length * 50);
        const finalProgress = Math.min(99, Math.max(5, Math.round(progressSum / bulkTotal)));
        
        setDownloadProgress(finalProgress);
      } else {
        setIsDownloading(false);
        setDownloadProgress(0);
      }
    };
    
    void calculateProgress();
  }, [items]);

  const handleRemove = async (id: string) => {
    const updated = await removeFromCart(id);
    setItems(updated);
    // Cập nhật badge
    void chrome.runtime.sendMessage({ type: 'UPDATE_BADGE' });
  };

  const handleUpdateTag = async (id: string, tag: string) => {
    const updated = await updateCartItemTag(id, tag);
    setItems(updated);
  };

  const handleBulkTag = async (tag: string) => {
    const updated = items.map(item => {
      if (item.status === 'pending' || item.status === 'failed') {
        return { ...item, tag: tag.trim().toLowerCase() };
      }
      return item;
    });
    setItems(updated);
    await saveCartItems(updated);
  };

  const handleDownloadItem = (item: CartItem) => {
    chrome.runtime.sendMessage({
      type: 'DOWNLOAD_SINGLE_ITEM',
      item
    });
  };

  const handleDownloadAll = async () => {
    const pending = items.filter(item => item.status === 'pending' || item.status === 'failed');
    if (pending.length === 0) return;

    // Lưu tổng số lượng file cần tải của phiên này vào storage làm mốc cố định
    await chrome.storage.local.set({ video_ext_bulk_total: pending.length });

    chrome.runtime.sendMessage({
      type: 'START_DOWNLOAD_ALL',
      items: pending
    });
  };

  const handleClearCart = async () => {
    if (window.confirm('Are you sure you want to clear the download queue?')) {
      await clearCart();
      setItems([]);
      void chrome.runtime.sendMessage({ type: 'UPDATE_BADGE' });
    }
  };

  const handleOpenOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  const pendingCount = items.filter(item => item.status === 'pending').length;
  const totalCount = items.length;

  return (
    <div className="flex flex-col h-full text-app-text select-none">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-app-bg-card border-b border-app-border/60">
        <div className="flex items-center gap-2">
          <img 
            src={logoIcon} 
            alt="Logo" 
            className="w-7 h-7 rounded-lg shadow-md shadow-app-primary/10 object-contain" 
          />
          <div>
            <h1 className="text-xs font-bold tracking-wide">SOCIAL DOWNLOADER</h1>
            <p className="text-[9px] text-app-text-muted">Compact Video Downloader</p>
          </div>
        </div>

        <button
          onClick={handleOpenOptions}
          className="p-1.5 bg-app-bg-hover hover:bg-app-border text-app-text-muted hover:text-app-text rounded-lg border border-app-border/40 hover:border-app-border transition-all duration-200"
          title="Configuration & Folder Settings"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-3 overflow-y-auto min-h-[360px]">
        {/* Bulk Tagging - Chỉ hiển thị khi có item có thể tag */}
        {totalCount > 0 && pendingCount > 0 && (
          <BulkOperations 
            presetTags={presetTags} 
            onApplyTag={handleBulkTag} 
            disabled={isDownloading}
          />
        )}

        {/* Media Queue List */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-2 px-1 text-[11px] font-bold text-app-text-muted uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3 text-app-accent" />
              Download Queue ({totalCount})
            </span>
            {pendingCount > 0 && (
              <span className="text-[10px] text-app-accent lowercase font-medium">
                ({pendingCount} pending)
              </span>
            )}
          </div>
          
          <CartList
            items={items}
            presetTags={presetTags}
            onRemove={handleRemove}
            onUpdateTag={handleUpdateTag}
            onDownloadItem={handleDownloadItem}
          />
        </div>

        {/* Global Progress Bar */}
        {isDownloading && (
          <div className="mt-3 px-1">
            <ProgressBar progress={downloadProgress} label="Downloading queue..." />
          </div>
        )}
      </main>

      {/* Footer */}
      {totalCount > 0 && (
        <footer className="px-3 py-3 bg-app-bg-card border-t border-app-border/60 flex gap-2">
          <button
            onClick={handleClearCart}
            disabled={isDownloading}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-app-bg-hover hover:bg-app-danger/10 text-app-text-muted hover:text-app-danger disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold rounded-xl border border-app-border/50 hover:border-app-danger/30 transition-all duration-200"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Queue</span>
          </button>

          <button
            onClick={handleDownloadAll}
            disabled={isDownloading || pendingCount === 0}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-app-accent to-app-accent-hover disabled:from-app-border disabled:to-app-border hover:shadow-lg hover:shadow-app-accent/20 text-white disabled:text-app-text-muted/50 disabled:cursor-not-allowed text-xs font-bold rounded-xl transition-all duration-200"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Batch ({pendingCount})</span>
          </button>
        </footer>
      )}
    </div>
  );
};
