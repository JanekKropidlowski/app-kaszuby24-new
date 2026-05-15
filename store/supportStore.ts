import { create } from 'zustand';

interface SupportState {
  isOpen: boolean;
  show: () => void;
  hide: () => void;
}

// Global toggle for the in-app donation sheet (SupportModal). Any screen calls
// `useSupportStore.getState().show()` instead of `Linking.openURL(donate_url)`
// so we don't kick the user out to Safari/Chrome.
export const useSupportStore = create<SupportState>((set) => ({
  isOpen: false,
  show: () => set({ isOpen: true }),
  hide: () => set({ isOpen: false }),
}));
