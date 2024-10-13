import { StorageEnum } from '../base/enums';
import { createStorage } from '../base/base';
import type { BaseStorage } from '../base/types';

type Theme = 'light' | 'dark';

type ThemeStorageData = {
  theme: Theme;
  user_id: string | null;
  actions: Array<{
    selector: string;
    value: string;
    status: string;
  }>;
};

type ThemeStorage = BaseStorage<ThemeStorageData> & {
  toggle: () => Promise<void>;
  setUserId: (userId: string) => Promise<void>;
  getUserId: () => Promise<string | null>;
  addAction: (selector: string, value: string, status: string) => Promise<void>;
  clearActions: () => Promise<void>;
};

const initialValue: ThemeStorageData = {
  theme: 'light',
  user_id: null,
  actions: [],
};

const storage = createStorage<ThemeStorageData>('theme-storage-key', initialValue, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

export const exampleThemeStorage: ThemeStorage = {
  ...storage,
  toggle: async () => {
    await storage.set(currentData => ({
      ...currentData,
      theme: currentData.theme === 'light' ? 'dark' : 'light',
    }));
  },
  setUserId: async (userId: string) => {
    await storage.set(currentData => ({
      ...currentData,
      user_id: userId,
    }));
  },
  getUserId: async () => {
    const data = await storage.get();
    return data.user_id;
  },
  addAction: async (selector: string, value: string, status: string) => {
    await storage.set(currentData => ({
      ...currentData,
      actions: [...currentData.actions, { selector, value, status }],
    }));
  },
  clearActions: async () => {
    await storage.set(currentData => ({
      ...currentData,
      actions: [],
    }));
  },
};
