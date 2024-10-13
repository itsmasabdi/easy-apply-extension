import { StorageEnum } from '../base/enums';
import { createStorage } from '../base/base';
import type { BaseStorage } from '../base/types';

type Theme = 'light' | 'dark';

// Update the storage type to include user_id
type ThemeStorageData = {
  theme: Theme;
  user_id: string | null;
  actions: Array<{
    selector: string;
    value: string;
    status: string;
  }>;
};

// Update ThemeStorage type
type ThemeStorage = BaseStorage<ThemeStorageData> & {
  toggle: () => Promise<void>;
  setUserId: (userId: string) => Promise<void>;
  addAction: (selector: string, value: string, status: string) => Promise<void>;
  clearActions: () => Promise<void>;
};

const initialValue: ThemeStorageData = {
  theme: 'light',
  user_id: '66bb3bbff2b62c6928f0c94a',
  actions: [], // Initialize with an empty array
};

const storage = createStorage<ThemeStorageData>('theme-storage-key', initialValue, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

// You can extend it with your own methods
export const exampleThemeStorage: ThemeStorage = {
  ...storage,
  toggle: async () => {
    await storage.set(currentData => ({
      ...currentData,
      theme: currentData.theme === 'light' ? 'dark' : 'light',
    }));
  },
  // Add a new method to set the user_id
  setUserId: async (userId: string) => {
    await storage.set(currentData => ({
      ...currentData,
      user_id: userId,
    }));
  },
  // Add a new method to add an action
  addAction: async (selector: string, value: string, status: string) => {
    await storage.set(currentData => ({
      ...currentData,
      actions: [...currentData.actions, { selector, value, status }],
    }));
  },
  // Add a method to clear all actions
  clearActions: async () => {
    await storage.set(currentData => ({
      ...currentData,
      actions: [],
    }));
  },
};
