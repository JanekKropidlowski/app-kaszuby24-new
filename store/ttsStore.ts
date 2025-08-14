import { create } from 'zustand';
import * as Speech from 'expo-speech';
import { AppState, Platform, Alert } from 'react-native';

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
    voiceId?: string | null;
  sessionId: number;
  useAlertsFallback: boolean;

  start: (params: { title: string; categoryLabel?: string; chunks: string[]; speakingRate?: number; language?: string; useAlertsFallback?: boolean }) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  tick: () => void;
  startFallbackMode: (params: { title: string; categoryLabel?: string; chunks: string[]; speakingRate?: number; language?: string }) => void;
  showNextChunk: (sessionId: number) => void;
}

const estimateSeconds = (text: string, rate: number) => {
  const words = (text.trim().match(/\S+/g)?.length ?? 1);
  const wpm = 160 * rate;
  return Math.max(1, Math.round((words / wpm) * 60));
};

// Funkcje fallback będą dodane wewnątrz store

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
  sessionId: 0,
  voiceId: null,
  useAlertsFallback: true,

  // Funkcja fallback - używa alertów zamiast syntezy mowy
  startFallbackMode: ({ title, categoryLabel = 'Czytanie', chunks, speakingRate = 0.95, language = 'pl-PL' }: {
    title: string;
    categoryLabel?: string;
    chunks: string[];
    speakingRate?: number;
    language?: string;
  }) => {
    console.log('[TTS FALLBACK] Starting fallback mode with alerts');
    
    const newSession = Date.now();
    const totalSecEst = chunks.reduce((s, c) => s + estimateSeconds(c, speakingRate), 0);
    
    set({
      isVisible: true,
      status: 'playing',
      title,
      categoryLabel,
      chunks,
      currentIndex: 0,
      startedAt: Date.now(),
      elapsedSec: 0,
      totalSecEst,
      speakingRate,
      language,
      sessionId: newSession,
    });
    
    // Start timer
    tickTimer = setInterval(() => get().tick(), 1000);
    
    // Pokaż pierwszy chunk
    get().showNextChunk(newSession);
  },

  // Pokaż następny chunk w trybie fallback
  showNextChunk: (sessionId: number) => {
    const s = get();
    if (s.sessionId !== sessionId) return;
    
    if (s.currentIndex >= s.chunks.length) {
      console.log('[TTS FALLBACK] All chunks completed');
      set({ status: 'idle' });
      if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
      setTimeout(() => set({ isVisible: false }), 3000);
      return;
    }
    
    const text = s.chunks[s.currentIndex];
    console.log('[TTS FALLBACK] Showing chunk:', s.currentIndex + 1, 'of', s.chunks.length);
    
    Alert.alert(
      `Czytanie tekstu (${s.currentIndex + 1}/${s.chunks.length})`,
      `${text.substring(0, 300)}${text.length > 300 ? '...' : ''}`,
      [
        {
          text: 'Następny',
          onPress: () => {
            if (get().sessionId !== sessionId) return;
            set({ currentIndex: get().currentIndex + 1 });
            setTimeout(() => get().showNextChunk(sessionId), 100);
          }
        },
        {
          text: 'Zatrzymaj',
          onPress: () => {
            get().stop();
          }
        }
      ]
    );
    
    // Automatycznie przejdź do następnego chunka po 5 sekundach
    setTimeout(() => {
      if (get().sessionId === sessionId && get().status === 'playing') {
        set({ currentIndex: get().currentIndex + 1 });
        setTimeout(() => get().showNextChunk(sessionId), 100);
      }
    }, 5000);
  },

  start: async ({ title, categoryLabel = 'Czytanie', chunks, speakingRate = 0.95, language = 'pl-PL', useAlertsFallback = true }) => {
    console.log('[TTS START] Starting TTS...');
    
    // Sprawdź czy expo-speech jest dostępny
    try {
      console.log('[TTS START] Checking speech availability...');
      
      // Sprawdź czy Speech jest dostępny
      if (typeof Speech === 'undefined' || !Speech.speak) {
        throw new Error('Speech module not available');
      }
      
      // Prosty test TTS
      console.log('[TTS START] Testing basic speech...');
      try {
        let testTimeout: NodeJS.Timeout;
        let testCompleted = false;
        
        Speech.speak('Test', {
          language: 'pl-PL',
          rate: 1.0,
          onDone: () => {
            console.log('[TTS START] Test speech completed');
            testCompleted = true;
            if (testTimeout) clearTimeout(testTimeout);
          },
          onError: (error: any) => {
            console.log('[TTS START] Test speech error:', error);
            testCompleted = true;
            if (testTimeout) clearTimeout(testTimeout);
          },
        });
        console.log('[TTS START] Test TTS started');
        
        // Timeout dla testu
        testTimeout = setTimeout(() => {
          if (!testCompleted) {
            console.log('[TTS START] Test TTS timeout - callbacks not working');
            if (useAlertsFallback) {
              console.log('[TTS START] Using fallback mode - text alerts only');
              // Uruchom w trybie fallback
              get().startFallbackMode({ title, categoryLabel, chunks, speakingRate, language });
            } else {
              console.log('[TTS START] Fallback disabled; aborting without popups');
              set({ status: 'idle', isVisible: false });
            }
            return;
          }
        }, 5000);
        
      } catch (error) {
        console.error('[TTS START] Test TTS failed:', error);
        if (useAlertsFallback) {
          console.log('[TTS START] Using fallback mode - text alerts only');
          // Uruchom w trybie fallback
          get().startFallbackMode({ title, categoryLabel, chunks, speakingRate, language });
        } else {
          console.log('[TTS START] Fallback disabled; aborting without popups');
          set({ status: 'idle', isVisible: false });
        }
        return;
      }
      
    } catch (error) {
      console.error('[TTS START] Speech check failed:', error);
      if (useAlertsFallback) {
        console.log('[TTS START] Using fallback mode - text alerts only');
        // Uruchom w trybie fallback
        get().startFallbackMode({ title, categoryLabel, chunks, speakingRate, language });
      } else {
        console.log('[TTS START] Fallback disabled; aborting without popups');
        set({ status: 'idle', isVisible: false });
      }
      return;
    }

    // twardy reset
    try { Speech.stop(); } catch {}
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }

    // sanity: filtr pustych
    const cleanChunks = chunks
      .map(c => c.replace(/\s+/g, ' ').trim())
      .filter(c => c.length > 0 && /[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ0-9]/.test(c));

    // wybór najbardziej naturalnego głosu (pl-PL) jeśli dostępny
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      console.log('[TTS START] Available voices count:', voices.length);
      const plVoices = voices.filter((v: any) => (v as any).language?.toLowerCase().startsWith('pl'));
      console.log('[TTS START] Polish voices count:', plVoices.length);
      const enhanced = plVoices.find((v: any) => (v as any).quality === 'Enhanced') || plVoices[0];
      if (enhanced?.identifier) {
        console.log('[TTS START] Selected voice:', enhanced.identifier);
        set({ voiceId: enhanced.identifier });
      } else {
        console.log('[TTS START] No Polish voice found, using default');
      }
    } catch (error) {
      console.error('[TTS START] Error getting voices:', error);
    }

    const newSession = Date.now();
    const totalSecEst = cleanChunks.reduce((s, c) => s + estimateSeconds(c, speakingRate), 0);

    console.log('[TTS START] Starting new session:', newSession);
    console.log('[TTS START] Total chunks:', cleanChunks.length);
    console.log('[TTS START] Estimated duration:', totalSecEst, 'seconds');

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
      sessionId: newSession,
      useAlertsFallback,
    });

    // pauza w tle tylko gdy playing
    if (!appStateSub) {
      const handler = (state: string) => {
        if (state !== 'active' && get().status === 'playing') get().pause();
      };
      const sub = AppState.addEventListener('change', handler);
      appStateSub = () => sub.remove();
    }

    // Start timer immediately for accurate time tracking
    tickTimer = setInterval(() => get().tick(), 1000);
    console.log('[TTS START] Timer started');

    const playNext = () => {
      const s = get();
      const mySession = newSession;
      if (s.sessionId !== mySession) {
        // stare callbacki – ignoruj
        console.log('[TTS PLAY] Session mismatch, ignoring');
        return;
      }

      if (s.currentIndex >= s.chunks.length) {
        console.log('[TTS PLAY] All chunks completed');
        try { Speech.stop(); } catch {}
        set({ status: 'idle' });
        if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
        setTimeout(() => set({ isVisible: false }), 3000);
        return;
      }

      const text = s.chunks[s.currentIndex];
      console.log('[TTS PLAY] Playing chunk:', s.currentIndex + 1, 'of', s.chunks.length);
      console.log('[TTS PLAY] Text to speak:', text.substring(0, 100) + '...');
      set({ status: 'playing' });

      try {
        console.log('[TTS PLAY] Calling Speech.speak...');
        
        // Dodaj timeout dla Speech.speak
        let speechTimeout: NodeJS.Timeout;
        let speechCompleted = false;
        
        const speechOptions = {
          language,
          rate: speakingRate,
          pitch: 1.0,
          voice: get().voiceId || undefined,
          onDone: () => {
            console.log('[TTS PLAY] onDone callback triggered');
            speechCompleted = true;
            if (speechTimeout) clearTimeout(speechTimeout);
            // zabezpieczenie sesji
            if (get().sessionId !== mySession) return;
            console.log('[TTS PLAY] Chunk completed, moving to next');
            set({ currentIndex: get().currentIndex + 1 });
            setTimeout(playNext, 60);
          },
          onStopped: () => {
            console.log('[TTS PLAY] onStopped callback triggered');
            speechCompleted = true;
            if (speechTimeout) clearTimeout(speechTimeout);
            // może przyjść na Androidzie po stop()
            if (get().sessionId !== mySession) return;
            console.log('[TTS PLAY] Speech stopped');
            // zostaw status jaki jest (stop/pause go zmienią)
          },
          onError: (error: any) => {
            console.error('[TTS PLAY] onError callback triggered:', error);
            speechCompleted = true;
            if (speechTimeout) clearTimeout(speechTimeout);
            if (get().sessionId !== mySession) return;
            console.log('[TTS PLAY] Speech error, skipping chunk');
            // przeskocz problematyczny chunk
            set({ currentIndex: get().currentIndex + 1 });
            setTimeout(playNext, 60);
          },
        };
        
        Speech.speak(text, speechOptions);
        console.log('[TTS PLAY] Speech.speak called successfully');
        
        // Timeout - jeśli callbacki nie działają, przejdź do następnego chunka
        speechTimeout = setTimeout(() => {
          if (!speechCompleted && get().sessionId === mySession) {
            console.log('[TTS PLAY] Speech timeout - callbacks not working, moving to next chunk');
            set({ currentIndex: get().currentIndex + 1 });
            setTimeout(playNext, 60);
          }
        }, 10000); // 10 sekund timeout
        
      } catch (error) {
        console.error('[TTS PLAY] Error calling Speech.speak:', error);
        
        if (get().useAlertsFallback) {
          // Fallback - pokaż alert z tekstem do przeczytania
          console.log('[TTS PLAY] Using fallback - showing text alert');
          Alert.alert(
            'Czytanie tekstu',
            `Chunk ${s.currentIndex + 1} z ${s.chunks.length}:\n\n${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`,
            [
              {
                text: 'Następny',
                onPress: () => {
                  if (get().sessionId !== mySession) return;
                  set({ currentIndex: get().currentIndex + 1 });
                  setTimeout(playNext, 60);
                }
              },
              {
                text: 'Zatrzymaj',
                onPress: () => {
                  get().stop();
                }
              }
            ]
          );
          // Przejdź do następnego chunka po 3 sekundach
          setTimeout(() => {
            if (get().sessionId !== mySession) return;
            set({ currentIndex: get().currentIndex + 1 });
            setTimeout(playNext, 60);
          }, 3000);
        } else {
          console.log('[TTS PLAY] Fallback alerts disabled; skipping to next chunk silently');
          set({ currentIndex: get().currentIndex + 1 });
          setTimeout(playNext, 60);
        }
      }
    };

    // mała pauza na pojawienie się UI
    setTimeout(playNext, 120);
  },

  pause: () => {
    console.log('[TTS PAUSE] Pausing TTS');
    if (Platform.OS === 'android') {
      // brak native pause – zamień na soft stop
      try { Speech.stop(); } catch {}
      set({ status: 'paused' });
      return;
    }
    try { Speech.pause(); } catch {}
    set({ status: 'paused' });
  },

  resume: () => {
    const s = get();
    if (s.status !== 'paused') return;

    console.log('[TTS RESUME] Resuming TTS');
    // odśwież bazę czasu - adjust for paused time
    const now = Date.now();
    const pausedDuration = now - (s.startedAt || now);
    const newStartedAt = now - pausedDuration;
    
    set({ startedAt: newStartedAt });

    if (Platform.OS === 'android') {
      // kontynuacja od bieżącego chunku
      const mySession = s.sessionId;
      const { language, speakingRate } = s;
      const playCurrent = () => {
        const st = get();
        if (st.sessionId !== mySession || st.status !== 'paused') return;
        set({ status: 'playing' });
        
        const text = st.chunks[st.currentIndex];
        console.log('[TTS RESUME] Resuming chunk:', st.currentIndex + 1, 'of', st.chunks.length);
        
        try {
          Speech.speak(text, {
            language,
            rate: speakingRate,
            pitch: 1.0,
            voice: get().voiceId || undefined,
            onDone: () => {
              if (get().sessionId !== mySession) return;
              console.log('[TTS RESUME] Chunk completed, moving to next');
              set({ currentIndex: get().currentIndex + 1 });
              // wznów normalny pipeline przez start małego „playNext"
              // tu zawołamy mini rekurencję:
              const again = () => {
                const cur = get();
                if (cur.sessionId !== mySession) return;
                if (cur.status !== 'playing') return;
                if (cur.currentIndex >= cur.chunks.length) {
                  try { Speech.stop(); } catch {}
                  set({ status: 'idle' });
                  if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
                  setTimeout(() => set({ isVisible: false }), 3000);
                  return;
                }
                 Speech.speak(cur.chunks[cur.currentIndex], {
                  language,
                  rate: speakingRate,
                  pitch: 1.0,
                   voice: get().voiceId || undefined,
                  onDone: () => {
                    if (get().sessionId !== mySession) return;
                    set({ currentIndex: get().currentIndex + 1 });
                    setTimeout(again, 60);
                  },
                  onError: () => {
                    if (get().sessionId !== mySession) return;
                    set({ currentIndex: get().currentIndex + 1 });
                    setTimeout(again, 60);
                  },
                });
              };
              setTimeout(again, 60);
            },
            onError: (error: any) => {
              console.error('[TTS RESUME] Speech error:', error);
              if (get().sessionId !== mySession) return;
              set({ currentIndex: get().currentIndex + 1 });
              setTimeout(playCurrent, 60);
            },
          });
          
          // Timeout dla resume
          setTimeout(() => {
            if (get().sessionId === mySession && get().status === 'playing') {
              console.log('[TTS RESUME] Resume timeout - moving to next chunk');
              set({ currentIndex: get().currentIndex + 1 });
              setTimeout(playCurrent, 60);
            }
          }, 10000);
          
        } catch (error) {
          console.error('[TTS RESUME] Error calling Speech.speak:', error);
          
          // Fallback - pokaż alert z tekstem do przeczytania
          console.log('[TTS RESUME] Using fallback - showing text alert');
          Alert.alert(
            'Czytanie tekstu (wznowione)',
            `Chunk ${st.currentIndex + 1} z ${st.chunks.length}:\n\n${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`,
            [
              {
                text: 'Następny',
                onPress: () => {
                  if (get().sessionId !== mySession) return;
                  set({ currentIndex: get().currentIndex + 1 });
                  setTimeout(playCurrent, 60);
                }
              },
              {
                text: 'Zatrzymaj',
                onPress: () => {
                  get().stop();
                }
              }
            ]
          );
          
          // Przejdź do następnego chunka po 3 sekundach
          setTimeout(() => {
            if (get().sessionId !== mySession) return;
            set({ currentIndex: get().currentIndex + 1 });
            setTimeout(playCurrent, 60);
          }, 3000);
        }
      };
      setTimeout(playCurrent, 60);
      return;
    }

    try { Speech.resume(); } catch {}
    set({ status: 'playing' });
  },

  stop: () => {
    console.log('[TTS STOP] Stopping TTS');
    try { Speech.stop(); } catch {}
    if (tickTimer) { 
      clearInterval(tickTimer); 
      tickTimer = null; 
      console.log('[TTS STOP] Timer cleared');
    }
    set({ 
      status: 'idle', 
      isVisible: false, 
      chunks: [], 
      currentIndex: 0, 
      sessionId: Date.now(), 
      startedAt: null, 
      elapsedSec: 0 
    });
  },

  tick: () => {
    const { startedAt, status, elapsedSec } = get();
    if (!startedAt) return;
    
    // Count time during both loading and playing states
    if (status === 'idle' || status === 'paused') return;
    
    const now = Math.round((Date.now() - startedAt) / 1000);
    if (now !== elapsedSec) {
      console.log('[TTS TICK] Status:', status, 'Elapsed:', now, 's');
      set({ elapsedSec: now });
    }
  },
}));
