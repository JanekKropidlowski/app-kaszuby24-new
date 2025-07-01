import { create } from 'zustand';

interface ScrollState {
  isScrollingUp: boolean;
  showLogo: boolean;
  lastScrollY: number;
  readingProgress: number;
  setScrollDirection: (scrollY: number) => void;
  setReadingProgress: (progress: number) => void;
  resetScroll: () => void;
}

export const useScrollStore = create<ScrollState>((set, get) => ({
  isScrollingUp: false,
  showLogo: true, // Start with logo visible
  lastScrollY: 0,
  readingProgress: 0, // Track reading progress (0-1)
  
  setScrollDirection: (scrollY: number) => {
    const { lastScrollY } = get();
    const threshold = 5; // Minimum scroll distance to trigger change
    
    if (Math.abs(scrollY - lastScrollY) < threshold) {
      return; // Ignore small scroll movements
    }
    
    const isScrollingUp = scrollY < lastScrollY;
    
    // Show logo when near top (scrollY < 30) or when scrolling up
    // This makes the header more responsive to scroll direction
    const showLogo = scrollY < 30 || isScrollingUp;
    
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
      showLogo: true,
      lastScrollY: 0,
      readingProgress: 0,
    });
  },
}));