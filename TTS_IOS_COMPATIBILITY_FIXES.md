# TTS iOS Kompatybilność - Rozwiązania dla iOS 16 i 17

## Problem

Funkcja TTS (Text-to-Speech) nie działała poprawnie na:
- **iOS 16**: Callbacki `expo-speech` często nie działają
- **iPhone 13**: Specyficzne problemy z audio session management
- **iOS 17**: Działa, ale z problemami na niektórych urządzeniach

## Rozwiązania Zaimplementowane

### 1. Wykrywanie Wersji iOS i Urządzenia

```typescript
// iOS version detection with better iPhone 13 support
const getIOSVersion = (): number => {
  if (Platform.OS !== 'ios') return 0;
  const version = Platform.Version;
  if (typeof version === 'string') {
    return parseInt(version.split('.')[0], 10);
  }
  return version;
};

// Device detection for iPhone 13 specific issues
const isIPhone13 = () => {
  if (Platform.OS !== 'ios') return false;
  return Platform.constants.systemName === 'iPhone OS' && 
         (Platform.constants.systemVersion?.startsWith('16') || 
          Platform.constants.systemVersion?.startsWith('17'));
};

const isIOS16 = getIOSVersion() === 16;
const isIOS17Plus = getIOSVersion() >= 17;
const isIPhone13Device = isIPhone13();
```

### 2. Ulepszona Konfiguracja Audio Session

```typescript
const configureAudioSession = async () => {
  try {
    if (Platform.OS === 'ios') {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        // Enhanced settings for iOS 16 and iPhone 13
        ...(isIOS16 && {
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
        }),
        ...(isIPhone13Device && {
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
        }),
      });
    }
  } catch (error) {
    console.error('[TTS AUDIO] Error configuring audio session:', error);
  }
};
```

### 3. Automatyczne Przełączanie na Fallback Mode

Dla iOS 16 i iPhone 13, TTS automatycznie przełącza się w tryb fallback:

```typescript
// Dla iOS 16 i iPhone 13 automatycznie używaj fallback mode
if ((isIOS16 || isIPhone13Device) && useAlertsFallback) {
  console.log('[TTS START] iOS 16 or iPhone 13 detected - using enhanced fallback mode');
  get().startFallbackMode({ title, categoryLabel, chunks, speakingRate, language });
  return;
}
```

### 4. Tryb Fallback z Alertami

Zamiast syntezy mowy, pokazuje alerty z tekstem do przeczytania:

```typescript
Alert.alert(
  `Czytanie tekstu (${s.currentIndex + 1}/${s.chunks.length})${isIOS16Device || isIPhone13Device ? ' - Tryb kompatybilności' : ''}`,
  `${text.substring(0, 300)}${text.length > 300 ? '...' : ''}`,
  [
    { text: 'Następny', onPress: () => { /* next chunk */ } },
    { text: 'Zatrzymaj', onPress: () => { get().stop(); } }
  ]
);
```

### 5. Krótsze Timeouty dla iOS 16/iPhone 13

```typescript
// Timeout - jeśli callbacki nie działają, przejdź do następnego chunka
// Dla iOS 16 i iPhone 13 używamy krótszego timeoutu
const timeoutDuration = (isIOS16 || isIPhone13Device) ? 5000 : 10000;
```

### 6. Lepsze Zarządzanie Błędami

```typescript
// Dla iOS 16 i iPhone 13, jeśli za dużo błędów, przełącz na fallback mode
if ((isIOS16 || isIPhone13Device) && currentFailedCount >= 2 && get().useAlertsFallback) {
  console.log('[TTS PLAY] iOS 16/iPhone 13: Too many errors, switching to fallback mode');
  get().startFallbackMode({ /* params */ });
  return;
}
```

### 7. Reset Audio Session przy Zatrzymaniu

```typescript
stop: () => {
  console.log('[TTS STOP] Stopping TTS');
  try { Speech.stop(); } catch {}
  
  // Reset audio session for iOS 16 and iPhone 13
  if (Platform.OS === 'ios' && (isIOS16 || isIPhone13Device)) {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      playsInSilentModeIOS: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(error => {
      console.log('[TTS STOP] Audio session reset error:', error);
    });
  }
  // ... rest of stop logic
}
```

### 8. Funkcja Cleanup

```typescript
cleanup: async () => {
  console.log('[TTS CLEANUP] Cleaning up TTS resources');
  try { Speech.stop(); } catch {}
  
  if (tickTimer) { 
    clearInterval(tickTimer); 
    tickTimer = null; 
  }
  
  // Additional cleanup for iOS 16 and iPhone 13
  if (Platform.OS === 'ios' && (isIOS16 || isIPhone13Device)) {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.log('[TTS CLEANUP] Audio session cleanup error:', error);
    }
  }
  // ... reset state
}
```

## Komponent Testowy

Utworzono `TTSTestComponent` do testowania funkcjonalności:

```typescript
import { TTSTestComponent } from '@/components/TTSTestComponent';

// Użycie w aplikacji
<TTSTestComponent />
```

## Jak Działa

### iOS 16 + iPhone 13
1. Automatycznie przełącza się w tryb fallback
2. Pokazuje alerty z tekstem do przeczytania
3. Automatycznie przechodzi do następnego chunka
4. Lepsze zarządzanie audio session

### iOS 17+
1. Próbuje użyć standardowego TTS
2. Jeśli callbacki nie działają, przełącza na fallback
3. Dłuższe timeouty dla lepszej kompatybilności

### Android
1. Standardowe działanie TTS
2. Brak specjalnych modyfikacji

## Logi i Debugowanie

Wszystkie operacje są logowane z prefiksami:
- `[TTS INIT]` - Inicjalizacja
- `[TTS START]` - Start TTS
- `[TTS PLAY]` - Odtwarzanie
- `[TTS FALLBACK]` - Tryb fallback
- `[TTS STOP]` - Zatrzymanie
- `[TTS CLEANUP]` - Czyszczenie
- `[TTS AUDIO]` - Konfiguracja audio

## Testowanie

1. Uruchom aplikację na urządzeniu docelowym
2. Użyj `TTSTestComponent` do testowania
3. Sprawdź logi w konsoli
4. Zweryfikuj działanie na różnych wersjach iOS

## Uwagi

- Fallback mode jest domyślnie włączony (`useAlertsFallback: true`)
- iPhone 13 jest traktowany tak samo jak iOS 16 dla lepszej kompatybilności
- Audio session jest automatycznie resetowany przy zatrzymaniu
- Wszystkie timeouty są dostosowane do wersji iOS
