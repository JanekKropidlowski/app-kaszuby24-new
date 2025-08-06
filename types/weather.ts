// Dane synoptyczne (istniejące)
export interface SynopData {
  id_stacji: string;
  stacja: string;
  data_pomiaru: string;
  godzina_pomiaru: string;
  temperatura: string;
  predkosc_wiatru: string;
  kierunek_wiatru: string;
  wilgotnosc_wzgledna: string;
  suma_opadu: string;
  cisnienie: string;
}

// Dane hydrologiczne (nowe)
export interface HydroData {
  id_stacji: string;
  stacja: string;
  rzeka: string;
  wojewodztwo: string;
  lon: string;
  lat: string;
  stan_wody: string;
  stan_wody_data_pomiaru: string;
  temperatura_wody: string | null;
  temperatura_wody_data_pomiaru: string | null;
  przeplyw: string | null;
  przeplyw_data: string | null;
  zjawisko_lodowe: string;
  zjawisko_lodowe_data_pomiaru: string;
  zjawisko_zarastania: string;
  zjawisko_zarastania_data_pomiaru: string;
}

// Dane meteorologiczne (nowe)
export interface MeteoData {
  kod_stacji: string;
  nazwa_stacji: string;
  lon: string;
  lat: string;
  temperatura_gruntu: string | null;
  temperatura_gruntu_data: string | null;
  temperatura_powietrza: string | null;
  temperatura_powietrza_data: string | null;
  wiatr_kierunek: string | null;
  wiatr_kierunek_data: string | null;
  wiatr_srednia_predkosc: string | null;
  wiatr_srednia_predkosc_data: string | null;
  wiatr_predkosc_maksymalna: string | null;
  wiatr_predkosc_maksymalna_data: string | null;
  wilgotnosc_wzgledna: string | null;
  wilgotnosc_wzgledna_data: string | null;
  wiatr_poryw_10min: string | null;
  wiatr_poryw_10min_data: string | null;
  opad_10min: string;
  opad_10min_data: string;
}

// Ostrzeżenia (rozszerzone)
export interface WarningData {
  id: string;
  type: 'meteo' | 'hydro';
  level: number;
  title: string;
  description: string;
  validFrom: string;
  validTo: string;
  validUntil?: string; // For backward compatibility
  regions: string[];
  probability?: number;
  comment?: string;
  // Pola specyficzne dla ostrzeżeń hydro
  obszary?: Array<{
    wojewodztwo: string;
    opis: string;
    kod_zlewni: string[];
  }>;
}

// Typy dla stacji, aby ujednolicić obsługę
export type StationType = 'synop' | 'hydro' | 'meteo';

export interface StationInfo {
    id: string;
    name: string;
    type: StationType;
    lat: number;
    lon: number;
    region?: string;
    river?: string;
}
