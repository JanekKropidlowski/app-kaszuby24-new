import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { GOOGLE_CLOUD_CONFIG, setGoogleCloudApiKey, getGoogleCloudApiKey, isGoogleCloudApiKeySet } from '@/constants/googleCloud';

// Konfiguracja Google Cloud Text-to-Speech
const GOOGLE_CLOUD_TTS_API_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const TTS_TIMEOUT = 15000; // 15 sekund timeout
const MAX_TTS_RETRIES = 2;

// Interfejsy
export interface TTSOptions {
  language?: string;
  voice?: string;
  speakingRate?: number;
  pitch?: number;
  volumeGainDb?: number;
  effectsProfileId?: string[];
}

export interface TTSResponse {
  audioContent: string;
}

export interface TTSVoice {
  languageCodes: string[];
  name: string;
  ssmlGender: string;
  naturalSampleRateHertz: number;
}

export interface TTSVoiceList {
  voices: TTSVoice[];
}

class TextToSpeechService {
  private apiKey: string | null = null;
  private sound: Audio.Sound | null = null;
  private isPlaying: boolean = false;
  private currentText: string = '';
  private abortController: AbortController | null = null;

  constructor() {
    this.initializeAudio();
    // Inicjalizuj z API key z konfiguracji
    this.apiKey = GOOGLE_CLOUD_CONFIG.API_KEY;
  }

  private async initializeAudio() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        // Dodatkowe ustawienia dla Android
        ...(Platform.OS === 'android' && {
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        }),
      });
      console.log('Audio initialized successfully');
    } catch (error) {
      console.error('Błąd inicjalizacji audio:', error);
    }
  }

  // Ustaw API key dla Google Cloud
  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    setGoogleCloudApiKey(apiKey);
  }

  // Pobierz dostępne głosy dla języka polskiego
  async getAvailableVoices(): Promise<TTSVoice[]> {
    if (!this.apiKey) {
      throw new Error('API key nie został ustawiony');
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TTS_TIMEOUT);

      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/voices?languageCode=pl-PL`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Błąd pobierania głosów: ${response.status}`);
      }

      const data: TTSVoiceList = await response.json();
      return data.voices || [];
    } catch (error) {
      console.error('Błąd pobierania głosów:', error);
      throw error;
    }
  }

  // Konwertuj tekst na mowę z retry logic
  async synthesizeSpeech(text: string, options: TTSOptions = {}, retryCount = 0): Promise<string> {
    console.log('synthesizeSpeech wywołane z tekstem:', text.substring(0, 50) + '...');
    console.log('API key:', this.apiKey ? 'ustawiony' : 'brak');
    
    if (!this.apiKey) {
      throw new Error('API key nie został ustawiony');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Tekst nie może być pusty');
    }

    const defaultOptions: TTSOptions = {
      language: GOOGLE_CLOUD_CONFIG.DEFAULT_LANGUAGE,
      voice: GOOGLE_CLOUD_CONFIG.DEFAULT_VOICE,
      speakingRate: GOOGLE_CLOUD_CONFIG.DEFAULT_SPEAKING_RATE,
      pitch: GOOGLE_CLOUD_CONFIG.DEFAULT_PITCH,
      volumeGainDb: GOOGLE_CLOUD_CONFIG.DEFAULT_VOLUME_GAIN_DB,
      effectsProfileId: [GOOGLE_CLOUD_CONFIG.AUDIO_EFFECTS[0]],
    };

    const finalOptions = { ...defaultOptions, ...options };

    try {
      // Anuluj poprzednie żądanie jeśli istnieje
      if (this.abortController) {
        this.abortController.abort();
      }
      
      this.abortController = new AbortController();
      const timeout = setTimeout(() => {
        console.log('TTS request timeout');
        this.abortController?.abort();
      }, TTS_TIMEOUT);

      const requestBody = {
        input: {
          text: text,
        },
        voice: {
          languageCode: finalOptions.language,
          name: finalOptions.voice,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: finalOptions.speakingRate,
          pitch: finalOptions.pitch,
          volumeGainDb: finalOptions.volumeGainDb,
          effectsProfileId: finalOptions.effectsProfileId,
        },
      };

      // Poprawka: klucz API jako parametr w URL
      const url = GOOGLE_CLOUD_TTS_API_URL + '?key=' + this.apiKey;
      console.log('Wysyłam żądanie do Google Cloud TTS na URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: this.abortController.signal,
      });

      clearTimeout(timeout);
      console.log('Odpowiedź z Google Cloud TTS:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Błąd Google Cloud TTS:', errorData);
        throw new Error(`Błąd syntezy mowy: ${response.status} - ${errorData.error?.message || 'Nieznany błąd'}`);
      }

      const data: TTSResponse = await response.json();
      console.log('Synteza zakończona pomyślnie');
      return data.audioContent;
    } catch (error: any) {
      console.error('Błąd syntezy mowy:', error);
      
      // Retry logic dla błędów sieciowych
      if (retryCount < MAX_TTS_RETRIES && (
        error.name === 'AbortError' ||
        error.message?.includes('Network request failed') ||
        error.message?.includes('fetch')
      )) {
        console.log(`Retrying TTS synthesis (${retryCount + 1}/${MAX_TTS_RETRIES})...`);
        const delay = Math.min(1000 * Math.pow(2, retryCount), 3000);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.synthesizeSpeech(text, options, retryCount + 1);
      }
      
      throw error;
    }
  }

  // Odtwórz audio z base64 z lepszą obsługą błędów
  async playAudio(audioBase64: string): Promise<void> {
    try {
      // Zatrzymaj obecne odtwarzanie
      await this.stop();

      // Konwertuj base64 na URI
      const audioUri = `data:audio/mp3;base64,${audioBase64}`;

      // Załaduj i odtwórz audio z timeout
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            if (status.didJustFinish) {
              this.isPlaying = false;
              this.sound = null;
            } else if (status.error) {
              console.error('Audio playback error:', status.error);
              this.isPlaying = false;
              this.sound = null;
            }
          }
        }
      );

      this.sound = sound;
      this.isPlaying = true;

    } catch (error) {
      console.error('Błąd odtwarzania audio:', error);
      this.isPlaying = false;
      throw error;
    }
  }

  // Odtwórz tekst (kombinacja syntezy i odtwarzania)
  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    try {
      this.currentText = text;
      
      // Syntezuj mowę
      const audioBase64 = await this.synthesizeSpeech(text, options);
      
      // Odtwórz audio
      await this.playAudio(audioBase64);
    } catch (error) {
      console.error('Błąd odtwarzania tekstu:', error);
      this.isPlaying = false;
      throw error;
    }
  }

  // Zatrzymaj odtwarzanie
  async stop(): Promise<void> {
    try {
      // Anuluj żądanie TTS jeśli trwa
      if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
      }

      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
      }
      this.isPlaying = false;
      this.currentText = '';
    } catch (error) {
      console.error('Błąd zatrzymywania audio:', error);
    }
  }

  // Sprawdź czy odtwarza
  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  // Pobierz obecny tekst
  getCurrentText(): string {
    return this.currentText;
  }

  // Pause/Resume (dla przyszłego rozszerzenia)
  async pause(): Promise<void> {
    if (this.sound && this.isPlaying) {
      await this.sound.pauseAsync();
      this.isPlaying = false;
    }
  }

  async resume(): Promise<void> {
    if (this.sound && !this.isPlaying) {
      await this.sound.playAsync();
      this.isPlaying = true;
    }
  }

  // Wyczyść zasoby
  async cleanup(): Promise<void> {
    await this.stop();
  }
}

// Eksportuj singleton
export const textToSpeechService = new TextToSpeechService();

// Eksportuj również klasę dla przypadków gdy potrzebujesz wielu instancji
export { TextToSpeechService }; 