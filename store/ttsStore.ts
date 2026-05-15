import { create } from 'zustand';
import * as Speech from 'expo-speech';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { AppState, Platform } from 'react-native';

type TTSStatus = 'idle' | 'playing' | 'paused' | 'loading';
type TTSMode = 'native' | 'audio';

interface TTSState {
  isVisible: boolean;
  status: TTSStatus;
  mode: TTSMode;
  title: string;
  categoryLabel: string;
  chunks: string[];
  currentIndex: number;
  startedAt: number | null;
  elapsedSec: number;
  totalSecEst: number;
  speakingRate: number;
  language: string;

  start: (params: {
    title: string;
    categoryLabel?: string;
    chunks: string[];
    speakingRate?: number;
    language?: string;
    /** When set, play this prerecorded ElevenLabs lektor file instead of native TTS. */
    audioUrl?: string;
  }) => void;
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
// Held outside Zustand state — Sound is non-serializable + we never read it from
// the UI, only call methods on it.
let audioSound: Audio.Sound | null = null;

const unloadAudio = async () => {
  if (audioSound) {
    try { await audioSound.unloadAsync(); } catch {}
    audioSound = null;
  }
};

export const useTTSStore = create<TTSState>((set, get) => ({
  isVisible: false,
  status: 'idle',
  mode: 'native',
  title: '',
  categoryLabel: 'Czytanie',
  chunks: [],
  currentIndex: 0,
  startedAt: null,
  elapsedSec: 0,
  totalSecEst: 0,
  speakingRate: 1.0,
  language: 'pl-PL',

  start: async ({ title, categoryLabel = 'Czytanie', chunks, speakingRate = 0.95, language = 'pl-PL', audioUrl }) => {
    console.log('[TTS] Starting TTS...', audioUrl ? '(audio mode)' : '(native mode)');

    // Zatrzymaj poprzednie odtwarzanie i wyczyść timer
    try { Speech.stop(); } catch {}
    await unloadAudio();
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }

    // AppState listener: pause both audio and native TTS when app backgrounds.
    // Set up once for the lifetime of the store (handler reads `get().status`
    // and calls `get().pause()` which is mode-aware).
    if (!appStateSub) {
      const handler = (state: string) => {
        if (state !== 'active' && get().status === 'playing') {
          get().pause();
        }
      };
      const sub = AppState.addEventListener('change', handler);
      appStateSub = () => sub.remove();
    }

    // ─── Audio mode ─────────────────────────────────────────────────────────
    // Pre-recorded ElevenLabs lektor (article meta.plik-dzwiekowy). Plays the
    // single MP3 instead of synthesising native TTS — better quality, predictable
    // pronunciation. Falls back to native TTS on load failure.
    if (audioUrl) {
      try {
        // Allow audio playback when the device is in silent mode — same UX as a
        // podcast app, since the user explicitly tapped "play". Without this,
        // iOS muted-switch silences playback.
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });

        set({
          isVisible: true,
          status: 'loading',
          mode: 'audio',
          title,
          categoryLabel,
          chunks: [],
          currentIndex: 0,
          startedAt: Date.now(),
          elapsedSec: 0,
          totalSecEst: 0,
          speakingRate,
          language,
        });

        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true, rate: speakingRate, shouldCorrectPitch: true },
          (status: AVPlaybackStatus) => {
            if (!status.isLoaded) return;
            const elapsed = Math.round((status.positionMillis || 0) / 1000);
            const total = Math.round((status.durationMillis || 0) / 1000);
            const cur = get();
            if (cur.elapsedSec !== elapsed || cur.totalSecEst !== total) {
              set({ elapsedSec: elapsed, totalSecEst: total });
            }
            if (status.didJustFinish) {
              get().stop();
            }
          },
        );
        audioSound = sound;
        set({ status: 'playing' });
        return;
      } catch (e) {
        console.warn('[TTS] Audio mode failed, falling back to native TTS:', e);
        await unloadAudio();
        // fall through to native synth below
      }
    }
    set({ mode: 'native' });
    
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
    if (get().mode === 'audio') {
      audioSound?.pauseAsync().catch(() => {});
    } else {
      try { Speech.pause(); } catch {}
    }
    set({ status: 'paused' });
  },

  resume: () => {
    const s = get();
    if (s.status !== 'paused') return;

    console.log('[TTS] Resuming TTS');
    if (s.mode === 'audio') {
      audioSound?.playAsync().catch(() => {});
    } else {
      try { Speech.resume(); } catch {}
    }
    set({ status: 'playing' });
  },

  stop: () => {
    console.log('[TTS] Stopping TTS');
    try { Speech.stop(); } catch {}
    void unloadAudio();

    // Zatrzymaj timer
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }

    // Resetuj wszystkie wartości
    set({
      status: 'idle',
      isVisible: false,
      mode: 'native',
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
    const { startedAt, status, currentIndex, chunks, mode } = get();
    if (mode === 'audio') return; // audio uses onPlaybackStatusUpdate for elapsed
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
    await unloadAudio();

    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }

    set({
      status: 'idle',
      isVisible: false,
      mode: 'native',
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
