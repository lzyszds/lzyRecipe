import { create } from 'zustand';

interface UIState {
  isImportOpen: boolean;
  openImportModal: () => void;
  closeImportModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isImportOpen: false,
  openImportModal: () => set({ isImportOpen: true }),
  closeImportModal: () => set({ isImportOpen: false }),
}));
