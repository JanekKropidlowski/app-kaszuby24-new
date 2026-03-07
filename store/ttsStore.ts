import { create } from 'zustand';
import * as Speech from 'expo-speech';
import { AppState, Platform } from 'react-native';

type TTSStatus = 'idle' | 'playing' | 'paused' | 'loading';

interface TTSState {
  isVisible: boolean;
  status: TTSStatus;
  title: string;
  categoryLabel: string;
  chunks: string[];
  currentIndex: number;
  startedAt: number | null;
  elapsedSec: number;
  totalSecEst: number;
  speakingRate: number;
  language: string;

  start: (params: { title: string; categoryLabel?: string; chunks: string[]; speakingRate?: number; language?: string }) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  tick: () => void;
  cleanup: () => Promise<void>;
}

const estimateSeconds = (text: string, rate: number) => {
  const words = (text.trim().match(/\S+/g)?.length ?? 1);
  const wpm = 160 * rate;
  return Math.max(1, Math.round((words / wpm) * 60));
};

let appStateSub: (() => void) | null = null;
let tickTimer: NodeJS.Timeout | null = null;

export const useTTSStore = create<TTSState>((set, get) => ({
  isVisible: false,
  status: 'idle',
  title: '',
  categoryLabel: 'Czytanie',
  chunks: [],
  currentIndex: 0,
  startedAt: null,
  elapsedSec: 0,
  totalSecEst: 0,
  speakingRate: 1.0,
  language: 'pl-PL',

  start: async ({ title, categoryLabel = 'Czytanie', chunks, speakingRate = 0.95, language = 'pl-PL' }) => {
    console.log('[TTS] Starting TTS...');
    
    // Zatrzymaj poprzednie odtwarzanie i wyczyść timer
    try { Speech.stop(); } catch {}
    if (tickTimer) { 
      clearInterval(tickTimer); 
      tickTimer = null; 
    }
    
    // Wyczyść chunki
    const cleanChunks = chunks
      .map(c => c.replace(/\s+/g, ' ').trim())
      .filter(c => c.length > 0);

    if (cleanChunks.length === 0) {
      console.log('[TTS] No valid chunks');
      return;
    }

    const totalSecEst = cleanChunks.reduce((s, c) => s + estimateSeconds(c, speakingRate), 0);
    console.log(`[TTS] Starting with ${cleanChunks.length} chunks, estimated time: ${totalSecEst}s`);

    set({
      isVisible: true,
      status: 'loading',
      title,
      categoryLabel,
      chunks: cleanChunks,
      currentIndex: 0,
      startedAt: Date.now(),
      elapsedSec: 0,
      totalSecEst,
      speakingRate,
      language,
    });

    // Timer dla śledzenia czasu
    tickTimer = setInterval(() => get().tick(), 1000);

    // Listener dla stanu aplikacji
    if (!appStateSub) {
      const handler = (state: string) => {
        if (state !== 'active' && get().status === 'playing') {
          get().pause();
        }
      };
      const sub = AppState.addEventListener('change', handler);
      appStateSub = () => sub.remove();
    }

    // Rozpocznij odtwarzanie
    const playNext = () => {
      const s = get();
      if (s.currentIndex >= s.chunks.length) {
        console.log('[TTS] All chunks completed');
        try { Speech.stop(); } catch {}
        
        // Zatrzymaj timer i ukryj player
        if (tickTimer) { 
          clearInterval(tickTimer); 
          tickTimer = null; 
        }
        
        set({ 
          status: 'idle',
          isVisible: false,
          elapsedSec: 0,
          totalSecEst: 0
        });
        return;
      }

      const text = s.chunks[s.currentIndex];
      console.log('[TTS] Playing chunk:', s.currentIndex + 1, 'of', s.chunks.length);
      set({ status: 'playing' });

      try {
        Speech.speak(text, {
          language,
          rate: speakingRate,
          pitch: 1.0,
          onDone: () => {
            console.log('[TTS] Chunk completed');
            set({ currentIndex: get().currentIndex + 1 });
            setTimeout(playNext, 100);
          },
          onStopped: () => {
            console.log('[TTS] Speech stopped');
          },
          onError: (error: any) => {
            console.error('[TTS] Speech error:', error);
            set({ currentIndex: get().currentIndex + 1 });
            setTimeout(playNext, 100);
          },
        });
      } catch (error) {
        console.error('[TTS] Error calling Speech.speak:', error);
        set({ currentIndex: get().currentIndex + 1 });
        setTimeout(playNext, 100);
      }
    };

    setTimeout(playNext, 100);
  },

  pause: () => {
    console.log('[TTS] Pausing TTS');
    try { Speech.pause(); } catch {}
    set({ status: 'paused' });
  },

  resume: () => {
    const s = get();
    if (s.status !== 'paused') return;

    console.log('[TTS] Resuming TTS');
    try { Speech.resume(); } catch {}
    set({ status: 'playing' });
  },

  stop: () => {
    console.log('[TTS] Stopping TTS');
    try { Speech.stop(); } catch {}
    
    // Zatrzymaj timer
    if (tickTimer) { 
      clearInterval(tickTimer); 
      tickTimer = null; 
    }
    
    // Resetuj wszystkie wartości
    set({ 
      status: 'idle', 
      isVisible: false, 
      chunks: [], 
      currentIndex: 0, 
      startedAt: null, 
      elapsedSec: 0,
      totalSecEst: 0,
      title: '',
      categoryLabel: 'Czytanie',
    });
  },

  tick: () => {
    const { startedAt, status, currentIndex, chunks } = get();
    if (!startedAt || status === 'idle' || status === 'paused') return;
    
    const now = Math.round((Date.now() - startedAt) / 1000);
    set({ elapsedSec: now });
    
    // Loguj postęp co 10 sekund
    if (now % 10 === 0) {
      console.log(`[TTS] Progress: ${currentIndex}/${chunks.length} chunks, elapsed: ${now}s`);
    }
    
    // Sprawdź czy wszystkie chunki zostały odczytane
    if (currentIndex >= chunks.length && status === 'playing') {
      console.log('[TTS] All chunks completed, stopping TTS');
      get().stop();
    }
  },

  cleanup: async () => {
    console.log('[TTS] Cleaning up TTS');
    try { Speech.stop(); } catch {}
    
    if (tickTimer) { 
      clearInterval(tickTimer); 
      tickTimer = null; 
    }
    
    set({ 
      status: 'idle', 
      isVisible: false, 
      chunks: [], 
      currentIndex: 0, 
      startedAt: null, 
      elapsedSec: 0,
      totalSecEst: 0,
      title: '',
      categoryLabel: 'Czytanie',
    });
  },
}));
