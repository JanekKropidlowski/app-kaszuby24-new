import { create } from 'zustand';

interface ScrollState {
  isScrollingUp: boolean;
  showLogo: boolean;
  showTabBar: boolean;
  lastScrollY: number;
  readingProgress: number;
  setScrollDirection: (scrollY: number) => void;
  setReadingProgress: (progress: number) => void;
  resetScroll: () => void;
}

export const useScrollStore = create<ScrollState>((set, get) => ({
  isScrollingUp: false,
  showLogo: false, // Start with logo hidden
  showTabBar: true, // Tab bar always visible
  lastScrollY: 0,
  readingProgress: 0, // Track reading progress (0-1)
  
  setScrollDirection: (scrollY: number) => {
    const { lastScrollY } = get();
    const threshold = 8; // Minimum scroll distance to trigger change
    
    if (Math.abs(scrollY - lastScrollY) < threshold) {
      return; // Ignore small scroll movements
    }
    
    const isScrollingUp = scrollY < lastScrollY;
    
    // Show logo ONLY when scrolling up AND not at the very top
    // Hide logo when scrolling down or when at the top (scrollY < 50)
    const showLogo = isScrollingUp && scrollY > 50;
    
    set({
      isScrollingUp,
      showLogo,
      lastScrollY: scrollY,
    });
  },
  
  setReadingProgress: (progress: number) => {
    set({ readingProgress: Math.max(0, Math.min(1, progress)) });
  },
  
  resetScroll: () => {
    set({
      isScrollingUp: false,
      showLogo: false, // Reset to hidden
      showTabBar: true,
      lastScrollY: 0,
      readingProgress: 0,
    });
  },
}));