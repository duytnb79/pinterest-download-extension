import { CartItem, ExtensionSettings, DEFAULT_PRESET_TAGS } from './types';

const STORAGE_KEYS = {
  CART: 'video_ext_cart',
  SETTINGS: 'video_ext_settings'
};

export async function getCartItems(): Promise<CartItem[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.CART);
  return result[STORAGE_KEYS.CART] || [];
}

export async function saveCartItems(items: CartItem[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.CART]: items });
}

export async function addToCart(media: {
  id: string;
  url: string;
  pageUrl: string;
  thumbnail: string;
  type: 'video' | 'image';
  title?: string;
}): Promise<CartItem[]> {
  const items = await getCartItems();
  const settings = await getSettings();
  
  // Tránh trùng lặp
  const exists = items.some(item => item.id === media.id);
  if (exists) {
    return items;
  }

  const newItem: CartItem = {
    ...media,
    tag: settings.defaultTag || 'default',
    addedAt: Date.now(),
    status: 'pending'
  };

  const updated = [newItem, ...items];
  await saveCartItems(updated);
  return updated;
}

export async function removeFromCart(id: string): Promise<CartItem[]> {
  const items = await getCartItems();
  const updated = items.filter(item => item.id !== id);
  await saveCartItems(updated);
  return updated;
}

export async function updateCartItemTag(id: string, tag: string): Promise<CartItem[]> {
  const items = await getCartItems();
  const updated = items.map(item => {
    if (item.id === id) {
      return { ...item, tag: tag.trim().toLowerCase() };
    }
    return item;
  });
  await saveCartItems(updated);
  return updated;
}

export async function updateCartItemStatus(
  id: string, 
  status: CartItem['status'], 
  progress?: number, 
  error?: string
): Promise<CartItem[]> {
  const items = await getCartItems();
  const updated = items.map(item => {
    if (item.id === id) {
      const updatedItem = { ...item, status };
      if (progress !== undefined) updatedItem.progress = progress;
      if (error !== undefined) updatedItem.error = error;
      return updatedItem;
    }
    return item;
  });
  await saveCartItems(updated);
  return updated;
}

export async function clearCart(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS.CART);
}

export async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  const defaultSettings: ExtensionSettings = {
    presetTags: DEFAULT_PRESET_TAGS,
    defaultTag: 'default'
  };
  return result[STORAGE_KEYS.SETTINGS] || defaultSettings;
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
}
