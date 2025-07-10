import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedEvent {
  id: number;
  title: { rendered: string };
  date: string;
  image?: string;
  meta?: {
    miasto?: string;
    cena?: string;
    'opis-wydarzenia'?: string;
    'link-do-wydarzenia'?: string;
  };
  categories?: string[];
  _embedded?: any;
}

interface EventsState {
  savedEvents: SavedEvent[];
  saveEvent: (event: SavedEvent) => void;
  removeEvent: (eventId: number) => void;
  isEventSaved: (eventId: number) => boolean;
  getSavedEventIds: () => Set<number>;
}

export const useEventsStore = create<EventsState>()(
  persist(
    (set, get) => ({
      savedEvents: [],
      
      saveEvent: (event: SavedEvent) => 
        set((state) => {
          // Don't add if already exists
          if (state.savedEvents.some(e => e.id === event.id)) {
            return state;
          }
          
          // Sort saved events by date (newest first) and limit to 100
          const newSavedEvents = [event, ...state.savedEvents]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 100);
          
          return { savedEvents: newSavedEvents };
        }),
        
      removeEvent: (eventId: number) => 
        set((state) => ({
          savedEvents: state.savedEvents.filter(event => event.id !== eventId)
        })),
        
      isEventSaved: (eventId: number) => {
        return get().savedEvents.some(event => event.id === eventId);
      },
      
      // Performance optimization method
      getSavedEventIds: () => {
        return new Set(get().savedEvents.map(event => event.id));
      },
    }),
    {
      name: 'events-storage',
      storage: createJSONStorage(() => AsyncStorage),
      
      // Selective persistence - only persist essential data
      partialize: (state) => ({
        savedEvents: state.savedEvents.slice(0, 50), // Limit persisted saved events
      }),
      
      // Ensure proper sorting after rehydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Sort by date (newest first)
          state.savedEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          // Ensure limits are respected after rehydration
          if (state.savedEvents.length > 100) {
            state.savedEvents = state.savedEvents.slice(0, 100);
          }
        }
      },
    }
  )
); 