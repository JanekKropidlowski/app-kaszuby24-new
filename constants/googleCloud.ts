// Konfiguracja Google Cloud Text-to-Speech API

export const GOOGLE_CLOUD_CONFIG = {
  API_KEY: '', // KLUCZ USUNIĘTY DLA BEZPIECZEŃSTWA GITHUB - WPISZ TUTAJ SWÓJ KLUCZ PO POBRANIU KODU
  DEFAULT_VOICE: 'pl-PL-Chirp3-HD-Enceladus',
  DEFAULT_LANGUAGE: 'pl-PL',
  DEFAULT_SPEAKING_RATE: 1.0,
  DEFAULT_PITCH: 0.0,
  DEFAULT_VOLUME_GAIN_DB: 0.0,
  POLISH_VOICES: [
    'pl-PL-Chirp3-HD-Enceladus',
    'pl-PL-Wavenet-A',
    'pl-PL-Wavenet-B',
    'pl-PL-Wavenet-C',
    'pl-PL-Wavenet-D',
    'pl-PL-Wavenet-E',
    'pl-PL-Wavenet-F',
    'pl-PL-Standard-A',
    'pl-PL-Standard-B',
    'pl-PL-Standard-C',
    'pl-PL-Standard-D',
    'pl-PL-Standard-E',
  ],
  AUDIO_EFFECTS: [
    'headphone-class-device',
    'large-home-entertainment-class-device',
    'small-bluetooth-speaker-class-device',
    'medium-bluetooth-speaker-class-device',
    'large-home-entertainment-class-device',
    'automotive-class-device',
  ],
};

export const setGoogleCloudApiKey = (apiKey: string) => {
  GOOGLE_CLOUD_CONFIG.API_KEY = apiKey;
};

export const getGoogleCloudApiKey = (): string => {
  return GOOGLE_CLOUD_CONFIG.API_KEY;
};

export const isGoogleCloudApiKeySet = (): boolean => {
  return !!GOOGLE_CLOUD_CONFIG.API_KEY;
}; 