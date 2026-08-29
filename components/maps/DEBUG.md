# Debug Guide - Brak Markerów/Klastrów

## Problem: "Nie widać ani klastrów, ani markerów"

### Przyczyny i Rozwiązania

#### 1. **Współrzędne jako String zamiast Number**

**Problem:**
```typescript
// ❌ ZŁE - lat/lng jako string
{ lat: "54.372", lng: "18.638" }

// ✅ DOBRE - lat/lng jako number
{ lat: 54.372, lng: 18.638 }
```

**Rozwiązanie:**
```typescript
// Parse do number przed użyciem
const lat = typeof h.lat === 'string' ? parseFloat(h.lat) : h.lat;
const lng = typeof h.lng === 'string' ? parseFloat(h.lng) : h.lng;

// Sprawdź czy valid
if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
  // OK, użyj
}
```

#### 2. **Null/Undefined Współrzędne**

**Problem:**
```typescript
// ❌ ZŁE
{ lat: null, lng: undefined }
{ lat: 0, lng: 0 }  // 0 to też problem!
```

**Rozwiązanie:**
```typescript
// Użyj != null zamiast ||
if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
  // lat może być 0 (teoretycznie) i nie zamieni się na null
}
```

#### 3. **Duplikaty ID**

**Problem:**
```typescript
// ❌ ZŁE - te same ID
hospitals.map(h => ({ id: h.id_gsl_miej, ... }))
generalHospitals.map(h => ({ id: h.id_gsl_miej, ... }))
// Jeśli ID się powtarzają, React/MapView może renderować tylko jeden
```

**Rozwiązanie:**
```typescript
// ✅ DOBRE - prefix dla unique ID
hospitals.map(h => ({ id: `sor-${h.id_gsl_miej}`, ... }))
generalHospitals.map(h => ({ id: `general-${h.nip}`, ... }))
```

#### 4. **Region Poza Współrzędnymi**

**Problem:**
```typescript
// Mapa pokazuje Warszawę (52.2, 21.0)
// Ale punkty są w Gdańsku (54.4, 18.6)
// Efekt: Nie widać markerów bo są poza ekranem
```

**Rozwiązanie:**
```typescript
const DEFAULT_REGION: Region = {
  latitude: 54.372,    // Środek Trójmiasta
  longitude: 18.638,
  latitudeDelta: 0.4,  // Duży zoom out żeby zobaczyć wszystko
  longitudeDelta: 0.4,
};
```

### Debug Console Logs

Sprawdź console logs w Metro/Expo:

```bash
# Powinno być:
[Niezbednik2Screen] Converted 150 hospitals
[Niezbednik2Screen] Sample hospital: {id: "sor-123", lat: 54.37, lng: 18.64, ...}
[Niezbednik2Map] Loaded 150 points (Filter: ALL)
[Niezbednik2Map] Sample point: {id: "sor-123", latitude: 54.37, longitude: 18.64, ...}
[useMapClustering] Creating 45 clusters at zoom 10

# Jeśli widzisz:
[Niezbednik2Map] WARNING: No points loaded!
# To znaczy że filtrowanie wyrzuciło wszystkie punkty (złe lat/lng)
```

### Jak Debugować

#### Krok 1: Sprawdź Raw Data

```typescript
console.log('Raw hospitals:', hospitals.slice(0, 2));
console.log('First hospital lat type:', typeof hospitals[0]?.lat);
console.log('First hospital lng type:', typeof hospitals[0]?.lng);
```

#### Krok 2: Sprawdź Po Konwersji

```typescript
console.log('Converted hospitals:', convertedHospitals.slice(0, 2));
console.log('First converted lat:', convertedHospitals[0]?.lat);
console.log('First converted lng:', convertedHospitals[0]?.lng);
```

#### Krok 3: Sprawdź MapPoints

```typescript
console.log('Map points count:', mapPoints.length);
console.log('Sample map point:', mapPoints[0]);
```

#### Krok 4: Sprawdź Clusters

```typescript
console.log('Clusters count:', clusters.length);
console.log('Sample cluster:', clusters[0]);
```

### Quick Fix Checklist

- [ ] Współrzędne są typu `number` (nie `string`, nie `null`)
- [ ] ID są unikalne (użyj prefixów)
- [ ] Region mapy obejmuje punkty
- [ ] Console logi pokazują punkty > 0
- [ ] Supercluster dostaje valid GeoJSON
- [ ] MapView ma `provider={PROVIDER_GOOGLE}`

### Typowe Błędy

```typescript
// ❌ Źle - 0 zamieni się na null
const lat = h.lat || null;
if (lat === 0) return null; // Usuwa valid punkt!

// ✅ Dobrze
const lat = h.lat ?? null;
if (lat === null) return null;

// ❌ Źle - nie sprawdza NaN
const lat = parseFloat(h.lat);
if (lat) { ... } // NaN jest falsy!

// ✅ Dobrze
const lat = parseFloat(h.lat);
if (!isNaN(lat)) { ... }
```

### Testowanie

```typescript
// Dodaj fake point dla testu
const testPoint = {
  id: 'test-1',
  latitude: 54.372,
  longitude: 18.638,
  type: 'HOSPITAL',
  name: 'Test Szpital',
};

// Jeśli ten punkt się pokazuje, problem jest w danych
// Jeśli nie pokazuje - problem w komponencie
```

### React Native Maps Specific

```typescript
// Marker wymaga:
coordinate={{
  latitude: number,  // ← MUSI być number
  longitude: number  // ← MUSI być number
}}

// Supercluster wymaga GeoJSON:
{
  type: 'Feature',
  geometry: {
    type: 'Point',
    coordinates: [lng, lat]  // ← [longitude, latitude] !!
  }
}
```

## Stałe Rozwiązania

Wszystkie te poprawki są już zaimplementowane w:
- [app/essentials/niezbednik2.tsx](app/essentials/niezbednik2.tsx:23-48)
- [components/maps/Niezbednik2Map.tsx](components/maps/Niezbednik2Map.tsx:81-145)
- [components/maps/MevoMap2.tsx](components/maps/MevoMap2.tsx:79-130)

Jeśli nadal nie widać markerów, sprawdź console logi!
