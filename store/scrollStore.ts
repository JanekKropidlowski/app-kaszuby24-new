import { create } from 'zustand';

interface ScrollState {
  isScrollingUp: boolean;
  showLogo: boolean;
  showTabBar: boolean;
  readingProgress: number;
  setScrollDirection: (scrollY: number) => void;
  setReadingProgress: (progress: number) => void;
  resetScroll: () => void;
}

// Pozycja przewijania poza stanem Reacta – zmienia się przy każdym ruchu palcem,
// a nikt jej nie renderuje.
let lastScrollY = 0;

export const useScrollStore = create<ScrollState>((set, get) => ({
  isScrollingUp: false,
  showLogo: false, // Start with logo hidden
  showTabBar: true, // Tab bar always visible
  readingProgress: 0, // Track reading progress (0-1)
  
  setScrollDirection: (scrollY: number) => {
    const threshold = 8; // Minimum scroll distance to trigger change
    
    if (Math.abs(scrollY - lastScrollY) < threshold) {
      return; // Ignore small scroll movements
    }
    
    const isScrollingUp = scrollY < lastScrollY;
    lastScrollY = scrollY;
    
    // Show logo ONLY when scrolling up AND not at the very top
    // Hide logo when scrolling down or when at the top (scrollY < 50)
    const showLogo = isScrollingUp && scrollY > 50;
    
    // set() tylko gdy coś widocznego się zmieniło – inaczej każde 8 px przewinięcia
    // przerysowywało cały ekran główny i pasek zakładek.
    const prev = get();
    if (prev.isScrollingUp === isScrollingUp && prev.showLogo === showLogo) return;
    set({ isScrollingUp, showLogo });
  },
  
  setReadingProgress: (progress: number) => {
    set({ readingProgress: Math.max(0, Math.min(1, progress)) });
  },
  
  resetScroll: () => {
    lastScrollY = 0;
    set({
      isScrollingUp: false,
      showLogo: false, // Reset to hidden
      showTabBar: true,
      readingProgress: 0,
    });
  },
}));