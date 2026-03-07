# Konfiguracja Google Cloud Text-to-Speech

## Wymagania

1. **Konto Google Cloud Platform** - musisz mieć aktywne konto GCP
2. **Włączone API Text-to-Speech** - w konsoli Google Cloud
3. **API Key** - klucz do autoryzacji zapytań

## Kroki konfiguracji

### 1. Utwórz projekt w Google Cloud Console

1. Przejdź do [Google Cloud Console](https://console.cloud.google.com/)
2. Utwórz nowy projekt lub wybierz istniejący
3. Zapisz **Project ID** - będzie potrzebny później

### 2. Włącz Text-to-Speech API

1. W konsoli Google Cloud przejdź do **APIs & Services** > **Library**
2. Wyszukaj "Text-to-Speech API"
3. Kliknij na "Cloud Text-to-Speech API"
4. Kliknij **Enable**

### 3. Utwórz API Key

1. Przejdź do **APIs & Services** > **Credentials**
2. Kliknij **+ CREATE CREDENTIALS** > **API key**
3. Skopiuj wygenerowany klucz
4. (Opcjonalnie) Kliknij **RESTRICT KEY** aby ograniczyć dostęp tylko do Text-to-Speech API

### 4. Skonfiguruj aplikację

#### Opcja A: Bezpośrednio w kodzie (tylko do testów)

Edytuj plik `constants/googleCloud.ts`:

```typescript
export const GOOGLE_CLOUD_CONFIG = {
  API_KEY: 'YOUR_API_KEY_HERE', // Wstaw swój API key tutaj
  // ... reszta konfiguracji
};
```

#### Opcja B: Bezpieczne przechowywanie (zalecane dla produkcji)

1. Zainstaluj `expo-constants` (już zainstalowane)
2. Utwórz plik `.env` w głównym katalogu:

```env
GOOGLE_CLOUD_TTS_API_KEY=your_api_key_here
```

3. Dodaj `.env` do `.gitignore`:

```gitignore
# Google Cloud API Keys
.env
```

4. Zaktualizuj `constants/googleCloud.ts`:

```typescript
import Constants from 'expo-constants';

export const GOOGLE_CLOUD_CONFIG = {
  API_KEY: Constants.expoConfig?.extra?.googleCloudTtsApiKey || '',
  // ... reszta konfiguracji
};
```

5. Zaktualizuj `app.json`:

```json
{
  "expo": {
    "extra": {
      "googleCloudTtsApiKey": process.env.GOOGLE_CLOUD_TTS_API_KEY
    }
  }
}
```

### 5. Inicjalizacja w aplikacji

W głównym pliku aplikacji (np. `app/_layout.tsx`) dodaj:

```typescript
import { textToSpeechService } from '@/services/textToSpeech';
import { getGoogleCloudApiKey } from '@/constants/googleCloud';

// W funkcji inicjalizacyjnej
const initializeTTS = () => {
  const apiKey = getGoogleCloudApiKey();
  if (apiKey) {
    textToSpeechService.setApiKey(apiKey);
  }
};
```

## Dostępne głosy polskie

Google Cloud TTS oferuje następujące głosy dla języka polskiego:

### Wavenet (wyższa jakość)
- `pl-PL-Wavenet-A` - Kobieta
- `pl-PL-Wavenet-B` - Mężczyzna  
- `pl-PL-Wavenet-C` - Kobieta
- `pl-PL-Wavenet-D` - Mężczyzna
- `pl-PL-Wavenet-E` - Kobieta
- `pl-PL-Wavenet-F` - Mężczyzna

### Standard (szybsze, tańsze)
- `pl-PL-Standard-A` - Kobieta
- `pl-PL-Standard-B` - Mężczyzna
- `pl-PL-Standard-C` - Kobieta
- `pl-PL-Standard-D` - Mężczyzna
- `pl-PL-Standard-E` - Kobieta

## Koszty

- **Standard**: ~$4.00 za 1 milion znaków
- **Wavenet**: ~$16.00 za 1 milion znaków

## Bezpieczeństwo

⚠️ **WAŻNE**: Nigdy nie commituj API key do repozytorium!

1. Używaj zmiennych środowiskowych
2. Dodaj `.env` do `.gitignore`
3. W produkcji używaj bezpiecznego storage
4. Ogranicz API key tylko do potrzebnych usług

## Testowanie

Po skonfigurowaniu możesz przetestować TTS w artykule:

1. Otwórz dowolny artykuł
2. Kliknij przycisk lektora (ikona głośnika)
3. Tekst powinien być odczytany przez Google Cloud TTS

## Rozwiązywanie problemów

### Błąd: "API key nie został ustawiony"
- Sprawdź czy API key jest poprawnie skonfigurowany
- Upewnij się, że `textToSpeechService.setApiKey()` zostało wywołane

### Błąd: "Błąd syntezy mowy: 403"
- Sprawdź czy API key jest poprawny
- Upewnij się, że Text-to-Speech API jest włączone
- Sprawdź czy API key ma odpowiednie uprawnienia

### Błąd: "Błąd syntezy mowy: 400"
- Sprawdź czy tekst nie jest pusty
- Upewnij się, że głos jest dostępny dla wybranego języka

## Dodatkowe funkcje

### Zmiana głosu

```typescript
await textToSpeechService.speak(text, {
  voice: 'pl-PL-Wavenet-B', // Zmień na inny głos
  speakingRate: 0.8, // Wolniejsze odtwarzanie
  pitch: 2.0, // Wyższy ton
});
```

### Pobieranie dostępnych głosów

```typescript
const voices = await textToSpeechService.getAvailableVoices();
console.log('Dostępne głosy:', voices);
``` 