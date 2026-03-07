/**
 * Maps Module - Ultra-lightweight maps with clustering
 * Optimized for performance on low-end devices
 */

export { Niezbednik2Map } from './Niezbednik2Map';
export { MevoMap2 } from './MevoMap2';
export { ClusterMarker } from './ClusterMarker';
export { useMapClustering } from './hooks/useMapClustering';

// Icons
export { HospitalIcon } from './icons/HospitalIcon';
export { PharmacyIcon } from './icons/PharmacyIcon';
export { AedIcon } from './icons/AedIcon';
export { BikeIcon } from './icons/BikeIcon';

// Types
export type { MapPoint, ClusterFeature } from './hooks/useMapClustering';
export type { Hospital, Pharmacy, AED, FilterType } from './Niezbednik2Map';
export type { MevoBike, MevoStation, MevoFilterType } from './MevoMap2';
