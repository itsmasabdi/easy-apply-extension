import { StorageEnum } from '../base/enums';
import { createStorage } from '../base/base';
import type { BaseStorage } from '../base/types';

type Theme = 'light' | 'dark';

type Document = {
  id: string;
  name: string;
};

type StorageData = {
  theme: Theme;
  userId: string | null;
  selectedDocuments: string[];
  documents: Document[];
};

type MyStorage = BaseStorage<StorageData> & {
  toggle: () => Promise<void>;
  setUserId: (userId: string) => Promise<void>;
  getUserId: () => Promise<string | null>;
  fetchDocuments: () => Promise<Document[]>;
  setSelectedDocuments: (selectedDocuments: string[]) => Promise<void>;
  getSelectedDocuments: () => Promise<string[]>;
};

const initialValue: StorageData = {
  theme: 'dark',
  userId: null,
  selectedDocuments: [],
  documents: [],
};

const storage = createStorage<StorageData>('storage-key', initialValue, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

const BACKEND_URL = 'http://localhost:8080';

export const myStorage: MyStorage = {
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
      userId,
    }));
  },
  getUserId: async () => {
    const data = await storage.get();
    return data.userId;
  },
  fetchDocuments: async () => {
    const userId = await myStorage.getUserId();
    if (!userId) {
      throw new Error('User is not authenticated');
    }

    const response = await fetch(`${BACKEND_URL}/documents?user_id=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch documents');
    }

    const documents: Document[] = await response.json();
    console.log('documents', documents);
    await myStorage.set(currentData => ({
      ...currentData,
      documents: documents?.docs || [],
    }));
    return documents;
  },
  setSelectedDocuments: async (selectedDocuments: string[]) => {
    await storage.set(currentData => ({
      ...currentData,
      selectedDocuments,
    }));
  },
  getSelectedDocuments: async () => {
    const data = await storage.get();
    return data.selectedDocuments;
  },
};
