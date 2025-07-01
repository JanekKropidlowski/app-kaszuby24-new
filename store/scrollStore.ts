import { create } from 'zustand';

interface ScrollState {
  isScrollingUp: boolean;
  showLogo: boolean;
  lastScrollY: number;
  setScrollDirection: (scrollY: number) => void;
  resetScroll: () => void;
}

export const useScrollStore = create<ScrollState>((set, get) => ({
  isScrollingUp: false,
  showLogo: true, // Start with logo visible
  lastScrollY: 0,
  
  setScrollDirection: (scrollY: number) => {
    const { lastScrollY } = get();
    const threshold = 5; // Minimum scroll distance to trigger change
    
    if (Math.abs(scrollY - lastScrollY) < threshold) {
      return; // Ignore small scroll movements
    }
    
    const isScrollingUp = scrollY < lastScrollY;
    const showLogo = scrollY < 50 || isScrollingUp; // Show logo when near top or scrolling up
    
    set({
      isScrollingUp,
      showLogo,
      lastScrollY: scrollY,
    });
  },
  
  resetScroll: () => {
    set({
      isScrollingUp: false,
      showLogo: true,
      lastScrollY: 0,
    });
  },
}));