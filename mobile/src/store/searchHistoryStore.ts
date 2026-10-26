import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeAsyncStorage } from '@/lib/safeStorage';

interface SearchHistoryState {
  history: string[];
  addSearch: (keyword: string) => void;
  removeSearch: (keyword: string) => void;
  clearHistory: () => void;
}

const MAX_HISTORY = 8;

export const useSearchHistoryStore = create<SearchHistoryState>()(
  persist(
    (set) => ({
      history: [],
      addSearch: (keyword) =>
        set((state) => {
          const value = String(keyword || '').trim().replace(/\s+/g, ' ');
          if (!value) return state;
          return {
            history: [
              value,
              ...state.history.filter((item) => item !== value),
            ].slice(0, MAX_HISTORY),
          };
        }),
      removeSearch: (keyword) =>
        set((state) => ({
          history: state.history.filter((item) => item !== keyword),
        })),
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'search-history-storage-v1',
      storage: createJSONStorage(() => safeAsyncStorage),
      partialize: (state) => ({ history: state.history }),
    }
  )
);
