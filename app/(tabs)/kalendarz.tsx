import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Platform,
  Dimensions,
  Share,
  Linking,
  TextInput,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  Share2,
  Search,
  Filter,
  ChevronRight,
  Plus,
  Minus,
  Home,
  Settings,
  Bookmark,
  X,
  Tag,
  Heart,
  Star,
  TrendingUp,
  ChevronDown,
  Zap,
  Navigation,
  AlertTriangle,
  Shield
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as he from 'he';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useThemeStore } from '@/store/themeStore';
import { useEventsStore, SavedEvent } from '@/store/eventsStore';
import LoadingIndicator from '@/components/LoadingIndicator';
import SkeletonLoader from '@/components/SkeletonLoader';
import EmptyState from '@/components/EmptyState';
import InlineCalendar from '@/components/InlineCalendar';
import ModernEventList from '@/components/ModernEventList';
import { formatDateTime, formatDate, formatTime, safeDateParse, safeFormatDate, safeFormatTime } from '@/utils/dateFormatter';
import * as Haptics from 'expo-haptics';
import calendarService from '@/services/calendarService';
import { Event } from '@/types/article';

// EventCategory type definition
interface EventCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count?: number;
  description?: string;
}

// City type definition
interface City {
  id: number;
  name: string;
  slug: string;
  parent?: number;
  count?: number;
}

// Object type definition
interface Object {
  id: number;
  name: string;
  slug: string;
  parent?: number;
  count?: number;
}

const BASE_URL = 'https://kaszuby24.pl/wp-json/kaszuby24/v1/events/mobile';

// Helper: safely parse JSON response, tolerating HTML warnings/prefixes
const safeParseJsonResponse = async (res: Response) => {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }

  // Try to parse text and extract JSON if HTML wrappers present
  const text = await res.text();
  const trimmed = text.trim();
  // If response starts with < it's likely HTML wrapper; try to find first JSON char
  const firstBrace = Math.min(
    trimmed.indexOf('{') !== -1 ? trimmed.indexOf('{') : Infinity,
    trimmed.indexOf('[') !== -1 ? trimmed.indexOf('[') : Infinity
  );

  if (firstBrace === Infinity) {
    // No JSON content found, return empty placeholder depending on what caller expects
    console.warn('No JSON content in response, might be PHP error. Raw:', text.substring(0, 100));
    return { success: false, data: null, error: 'No JSON content' };
  }

  const jsonPart = trimmed.substring(firstBrace);
  try {
    return JSON.parse(jsonPart);
  } catch (e) {
    console.error('safeParseJsonResponse: failed to parse extracted JSON:', e, '\njsonPart:', jsonPart.substring(0, 500));
    return { success: false, data: null, error: 'Invalid JSON' };
  }
};

export default function EventCalendarScreen() {
  const { theme } = useThemeStore();
  const { isEventSaved, saveEvent, removeEvent } = useEventsStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [objectFilter, setObjectFilter] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedObjects, setExpandedObjects] = useState<Set<string>>(new Set());
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());
  const [categorySearchText, setCategorySearchText] = useState('');
  const [objectSearchText, setObjectSearchText] = useState('');
  const [citySearchText, setCitySearchText] = useState('');

  // Modal states
  const [catModal, setCatModal] = useState(false);
  const [objectModal, setObjectModal] = useState(false);
  const [cityModal, setCityModal] = useState(false);

  // Nowe funkcjonalności
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: Date, end: Date } | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);

  // Nowy stan dla wyboru konkretnego dnia (bez zakresu)
  const [selectedSpecificDate, setSelectedSpecificDate] = useState<Date | null>(null);
  const [showSpecificDatePicker, setShowSpecificDatePicker] = useState(false);

  // Filter data states
  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [objects, setObjects] = useState<Object[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);

  // Build hierarchical category tree
  const categoryTree = useMemo(() => {
    const categoryMap = new Map<number, any>();
    const rootCategories: any[] = [];
    const categoriesWithoutParent: any[] = [];

    // First pass: create map with empty children arrays
    categories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    // Second pass: build hierarchy
    categories.forEach(cat => {
      if (cat.parent === 0) {
        // Root category
        rootCategories.push(categoryMap.get(cat.id));
      } else {
        // Child category
        const parent = categoryMap.get(cat.parent);
        if (parent && cat.parent) {
          parent.children.push(categoryMap.get(cat.id));
        } else {
          // Category with parent that doesn't exist - add to bottom
          categoriesWithoutParent.push(categoryMap.get(cat.id));
        }
      }
    });

    return { rootCategories, categoriesWithoutParent };
  }, [categories]);



  // Build hierarchical object tree
  const objectTree = useMemo(() => {
    const objectMap = new Map<number, any>();
    const rootObjects: any[] = [];
    const objectsWithoutParent: any[] = [];

    // First pass: create map with empty children arrays
    objects.forEach(obj => {
      objectMap.set(obj.id, { ...obj, children: [] });
    });

    // Second pass: build hierarchy
    objects.forEach(obj => {
      if (obj.parent === 0) {
        // Root object
        rootObjects.push(objectMap.get(obj.id));
      } else {
        // Child object
        if (obj.parent !== undefined) {
          const parent = objectMap.get(obj.parent);
          if (parent) {
            parent.children.push(objectMap.get(obj.id));
          } else {
            // Object with parent that doesn't exist - add to bottom
            objectsWithoutParent.push(objectMap.get(obj.id));
          }
        } else {
          // Object with undefined parent - add to bottom
          objectsWithoutParent.push(objectMap.get(obj.id));
        }
      }
    });

    return { rootObjects, objectsWithoutParent };
  }, [objects]);

  // Filter categories by search text
  const filteredCategoryTree = useMemo(() => {
    if (!categorySearchText.trim()) {
      return categoryTree;
    }

    const searchLower = categorySearchText.toLowerCase();
    const filterCategory = (cat: any): any => {
      const matchesSearch = cat.name.toLowerCase().includes(searchLower);
      const hasMatchingChildren = cat.children && cat.children.some((child: any) =>
        child.name.toLowerCase().includes(searchLower) || filterCategory(child)
      );

      if (matchesSearch || hasMatchingChildren) {
        return {
          ...cat,
          children: cat.children ? cat.children.map(filterCategory).filter(Boolean) : []
        };
      }
      return null;
    };

    const filteredRoots = categoryTree.rootCategories.map(filterCategory).filter(Boolean);
    const filteredWithoutParent = categoryTree.categoriesWithoutParent.filter(cat =>
      cat.name.toLowerCase().includes(searchLower)
    );

    return { rootCategories: filteredRoots, categoriesWithoutParent: filteredWithoutParent };
  }, [categoryTree, categorySearchText]);



  // Filter objects by search text
  const filteredObjectTree = useMemo(() => {
    if (!objectSearchText.trim()) {
      return objectTree;
    }

    const searchLower = objectSearchText.toLowerCase();
    const filterObject = (obj: any): any => {
      const matchesSearch = obj.name.toLowerCase().includes(searchLower);
      const hasMatchingChildren = obj.children && obj.children.some((child: any) =>
        child.name.toLowerCase().includes(searchLower) || filterObject(child)
      );

      if (matchesSearch || hasMatchingChildren) {
        return {
          ...obj,
          children: obj.children ? obj.children.map(filterObject).filter(Boolean) : []
        };
      }
      return null;
    };

    const filteredRoots = objectTree.rootObjects.map(filterObject).filter(Boolean);
    const filteredWithoutParent = objectTree.objectsWithoutParent.filter(obj =>
      obj.name.toLowerCase().includes(searchLower)
    );

    return { rootObjects: filteredRoots, objectsWithoutParent: filteredWithoutParent };
  }, [objectTree, objectSearchText]);

  // Toggle category expansion
  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };



  // Toggle object expansion
  const toggleObjectExpansion = (objectId: string) => {
    setExpandedObjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(objectId)) {
        newSet.delete(objectId);
      } else {
        newSet.add(objectId);
      }
      return newSet;
    });
  };



  // Get all children IDs recursively for categories
  const getAllChildrenIds = (category: any): number[] => {
    const childrenIds: number[] = [];
    if (category.children && category.children.length > 0) {
      category.children.forEach((child: any) => {
        if (child.id) {
          childrenIds.push(child.id);
          childrenIds.push(...getAllChildrenIds(child));
        }
      });
    }
    return childrenIds;
  };

  // Get all children IDs recursively for objects
  const getAllObjectChildrenIds = (object: any): string[] => {
    const childrenIds: string[] = [];
    if (object.children && object.children.length > 0) {
      object.children.forEach((child: any) => {
        if (child.id) {
          childrenIds.push(child.id.toString());
          childrenIds.push(...getAllObjectChildrenIds(child));
        }
      });
    }
    return childrenIds;
  };

  // Find category in categoryTree by ID
  const findCategoryInTree = (categoryId: string): any => {
    // Search directly in categories array first (more reliable)
    const foundInCategories = categories.find(cat => cat.id.toString() === categoryId);
    if (foundInCategories) return foundInCategories;

    // Fallback: search in categoryTree
    const searchInCategories = (cats: any[]): any => {
      for (const cat of cats) {
        if (cat.id.toString() === categoryId) {
          return cat;
        }
        if (cat.children && cat.children.length > 0) {
          const found = searchInCategories(cat.children);
          if (found) return found;
        }
      }
      return null;
    };

    // Search in root categories
    const foundInRoot = searchInCategories(categoryTree.rootCategories);
    if (foundInRoot) return foundInRoot;

    // Search in categories without parent
    const foundInWithoutParent = categoryTree.categoriesWithoutParent.find(cat => cat.id.toString() === categoryId);
    if (foundInWithoutParent) return foundInWithoutParent;

    return null;
  };



  // Handle category selection with automatic child selection
  const handleCategoryToggle = (categoryId: number) => {
    setSelectedCategories(prev => {
      const category = findCategoryInTree(categoryId.toString());
      if (!category) return prev;

      if (prev.includes(categoryId)) {
        // Deselect category and all its children
        const childrenIds = getAllChildrenIds(category);
        return prev.filter(id => id !== categoryId && !childrenIds.includes(id));
      } else {
        // Select category and all its children
        const childrenIds = getAllChildrenIds(category);
        const newSelection = [...prev, categoryId, ...childrenIds];
        return Array.from(new Set(newSelection)); // Remove duplicates
      }
    });
  };

  // Handle category filter apply
  const handleCategoryFilterApply = () => {
    if (selectedCategories.length === 0) {
      setCategoryFilter(null);
    } else {
      // API oczekuje integer, nie string - wysyłamy pierwsze ID
      const categoryFilterValue = selectedCategories[0].toString();
      setCategoryFilter(categoryFilterValue);
    }

    setCatModal(false);
    // reloadEvents will be called automatically by useEffect when categoryFilter changes
  };

  // Handle category filter clear
  const handleCategoryFilterClear = () => {
    setSelectedCategories([]);
    setCategoryFilter(null);
    setCatModal(false);
    // reloadEvents will be called automatically by useEffect when categoryFilter changes
  };

  // Handle object selection with automatic child selection
  const handleObjectToggle = (objectId: string) => {
    setSelectedObjects(prev => {
      const object = findObjectInTree(objectId);
      if (!object) return prev;

      if (prev.includes(objectId)) {
        // Deselect object and all its children
        const childrenIds = getAllObjectChildrenIds(object);
        return prev.filter(id => id !== objectId && !childrenIds.includes(id));
      } else {
        // Select object and all its children
        const childrenIds = getAllObjectChildrenIds(object);
        const newSelection = [...prev, objectId, ...childrenIds];
        return Array.from(new Set(newSelection)); // Remove duplicates
      }
    });
  };

  // Find object in objectTree by ID
  const findObjectInTree = (objectId: string): any => {
    // Search directly in objects array first (more reliable)
    const foundInObjects = objects.find(obj => obj.id.toString() === objectId);
    if (foundInObjects) return foundInObjects;

    // Fallback: search in objectTree
    const searchInObjects = (objs: any[]): any => {
      for (const obj of objs) {
        if (obj.id.toString() === objectId) {
          return obj;
        }
        if (obj.children && obj.children.length > 0) {
          const found = searchInObjects(obj.children);
          if (found) return found;
        }
      }
      return null;
    };

    // Search in root objects
    const foundInRoot = searchInObjects(objectTree.rootObjects);
    if (foundInRoot) return foundInRoot;

    // Search in objects without parent
    const foundInWithoutParent = objectTree.objectsWithoutParent.find(obj => obj.id.toString() === objectId);
    if (foundInWithoutParent) return foundInWithoutParent;

    return null;
  };

  // Handle object filter apply
  const handleObjectFilterApply = () => {
    if (selectedObjects.length === 0) {
      setObjectFilter(null);
    } else {
      // API oczekuje integer, nie string - wysyłamy pierwsze ID
      const objectFilterValue = selectedObjects[0].toString();
      setObjectFilter(objectFilterValue);
    }

    setObjectModal(false);
    // reloadEvents will be called automatically by useEffect when objectFilter changes
  };

  // Handle object filter clear
  const handleObjectFilterClear = () => {
    setSelectedObjects([]);
    setObjectFilter(null);
    setObjectModal(false);
    // reloadEvents will be called automatically by useEffect when objectFilter changes
  };

  // Handle city selection
  const handleCityToggle = (cityName: string) => {
    setSelectedCities(prev => {
      if (prev.includes(cityName)) {
        return prev.filter(city => city !== cityName);
      } else {
        return [...prev, cityName];
      }
    });
  };

  // Handle city filter apply
  const handleCityFilterApply = () => {
    if (selectedCities.length === 0) {
      setCityFilter(null);
    } else if (selectedCities.length === 1) {
      // Pojedyncze miasto - ustaw jako string
      setCityFilter(selectedCities[0]);
    } else {
      // Wiele miast - ustaw jako string z przecinkami (API może obsłużyć)
      const cityFilterValue = selectedCities.join(',');
      setCityFilter(cityFilterValue);
    }

    setCityModal(false);

    // reloadEvents will be called automatically by useEffect when cityFilter changes
    // No need for setTimeout since we're using useEffect with cityFilter dependency
  };

  // Handle city filter clear
  const handleCityFilterClear = () => {
    setSelectedCities([]);
    setCityFilter(null);
    setCityModal(false);
    // reloadEvents will be called automatically by useEffect when cityFilter changes
  };

  // Fetch filter data from API - using improved endpoints that show only active categories/objects
  const fetchFilterData = useCallback(async () => {
    setLoadingFilters(true);

    try {
      // Try to fetch all filters at once using the new combined endpoint
      const combinedFiltersResponse = await fetch('https://kaszuby24.pl/wp-json/kaszuby24/v1/events/filters/active');

      if (combinedFiltersResponse.ok) {
        const combinedData = await safeParseJsonResponse(combinedFiltersResponse);

        if (combinedData.success && (Array.isArray(combinedData.categories) || Array.isArray(combinedData.objects))) {

          // Set categories from combined endpoint
          if (Array.isArray(combinedData.categories)) {
            const mappedCategories = combinedData.categories.map((cat: any) => ({
              id: cat.id,
              name: he.decode(cat.name),
              slug: cat.slug,
              parent: cat.parent || 0,
              count: cat.count || 0,
              description: cat.description || ''
            }));
            setCategories(mappedCategories);
          }

          // Set objects from combined endpoint
          if (Array.isArray(combinedData.objects)) {
            const mappedObjects = combinedData.objects.map((obj: any) => ({
              id: obj.id,
              name: he.decode(obj.name),
              slug: obj.slug,
              parent: obj.parent || 0,
              count: obj.count || 0
            }));
            setObjects(mappedObjects);
          }

          // Set cities from combined endpoint
          if (Array.isArray(combinedData.cities)) {
            const mappedCities = combinedData.cities.map((city: any) => ({
              id: city.id,
              name: he.decode(city.name),
              slug: city.slug,
              parent: city.parent || 0,
              count: city.count || 0
            }));
            setCities(mappedCities);
          }
        } else {
          // Fallback to individual endpoints if combined endpoint fails
          await fetchIndividualFilters();
        }
      } else {
        // Fallback to individual endpoints if combined endpoint fails
        await fetchIndividualFilters();
      }


    } catch (error) {
      console.error('❌ Error fetching filter data:', error);
      // Fallback to individual endpoints on error
      try {
        await fetchIndividualFilters();
      } catch (fallbackError) {
        console.error('❌ Error in fallback filter fetch:', fallbackError);
      }

      // Ostateczny fallback - pobierz miasta z WordPress endpoint
      if (cities.length === 0) {
        try {
          const citiesResponse = await fetch('https://kaszuby24.pl/wp-json/wp/v2/miasto?per_page=100&hide_empty=true');
          if (citiesResponse.ok) {
            const citiesData = await safeParseJsonResponse(citiesResponse);
            if (!Array.isArray(citiesData)) throw new Error('Invalid cities data');
            const mappedCities = citiesData.map((city: any) => ({
              id: city.id,
              name: he.decode(city.name),
              slug: city.slug,
              parent: city.parent || 0,
              count: city.count || 0
            }));

            setCities(mappedCities);

          } else {
          }
        } catch (finalError) {
          console.error('❌ Final fallback error:', finalError);
        }
      }
    } finally {
      setLoadingFilters(false);
    }
  }, []); // Usunięto cities.length z dependency - powodowało pętlę

  // Fallback function to fetch individual filters
  const fetchIndividualFilters = async () => {

    // Fetch active categories with upcoming events using our improved API
    const categoriesResponse = await fetch('https://kaszuby24.pl/wp-json/kaszuby24/v1/events/categories/active');
    if (categoriesResponse.ok) {
      const categoriesData = await safeParseJsonResponse(categoriesResponse);
      if (Array.isArray(categoriesData.categories) && categoriesData.categories.length > 0) {
        const mappedCategories = categoriesData.categories.map((cat: any) => ({
          id: cat.id,
          name: he.decode(cat.name),
          slug: cat.slug,
          parent: cat.parent || 0,
          count: cat.count || 0, // API zwraca 'count', nie 'events_count'
          description: cat.description || ''
        }));
        setCategories(mappedCategories);

      }
    } else {
    }

    // Fetch active objects with upcoming events using our improved API
    const objectsResponse = await fetch('https://kaszuby24.pl/wp-json/kaszuby24/v1/events/objects/active');
    if (objectsResponse.ok) {
      const objectsData = await safeParseJsonResponse(objectsResponse);
      if (Array.isArray(objectsData.objects) && objectsData.objects.length > 0) {
        const mappedObjects = objectsData.objects.map((obj: any) => ({
          id: obj.id,
          name: he.decode(obj.name),
          slug: obj.slug,
          parent: obj.parent || 0,
          count: obj.count || 0 // API zwraca 'count', nie 'events_count'
        }));
        setObjects(mappedObjects);

      }
    } else {
    }

    // Fetch active cities with upcoming events using our improved API
    const citiesResponse = await fetch('https://kaszuby24.pl/wp-json/kaszuby24/v1/events/cities/active');
    if (citiesResponse.ok) {
      const citiesData = await safeParseJsonResponse(citiesResponse);
      if (Array.isArray(citiesData.cities) && citiesData.cities.length > 0) {
        const mappedCities = citiesData.cities.map((city: any) => ({
          id: city.id,
          name: he.decode(city.name),
          slug: city.slug,
          parent: city.parent || 0,
          count: city.count || 0
        }));

        setCities(mappedCities);

      } else {
      }
    } else {
    }
  };

  // Load filter data on component mount
  useEffect(() => {
    fetchFilterData();
  }, [fetchFilterData]);



  // Function to refresh filters
  const refreshFilters = useCallback(async () => {
    await fetchFilterData();
  }, [fetchFilterData]);



  // Unikalne miasta i kategorie do filtrów
  const citiesForFilters = useMemo(() => {
    const all = events.map(e => e.meta?.miasto).filter(Boolean);
    return Array.from(new Set(all));
  }, [events]);
  const categoriesForFilters = useMemo(() => {
    const all = events.flatMap((e: any) => {
      const terms = e._embedded?.['wp:term']?.flat() || [];
      return terms
        .filter((t: any) => t.taxonomy === 'kategoria-wydarzenia')
        .map((t: any) => ({
          id: t.id.toString(),
          name: he.decode(t.name)      // Dekodujemy nazwy kategorii
        }));
    });
    const uniq: { id: string, name: string }[] = [];
    const ids = new Set<string>();
    all.forEach(c => { if (!ids.has(c.id)) { ids.add(c.id); uniq.push(c); } });
    return uniq;
  }, [events]);

  const fetchPage = useCallback(async (pageNum: number, append = false) => {
    try {
      // Build URL with filters for server-side filtering
      const params = new URLSearchParams();
      params.append('page', pageNum.toString());
      params.append('per_page', '20');

      // Add server-side filters
      if (selectedFilters.length > 0) {
        // Use the first filter for server-side filtering
        // Send all selected filters for server-side filtering
        selectedFilters.forEach(filter => {
          params.append('filter', filter);
        });


      }

      // Ensure WP exposes taxonomies - request embeds
      params.append('_embed', '1');

      // Add category filter to URL parameters
      if (categoryFilter) {
        params.append('category', categoryFilter);
      }

      // Add object filter to URL parameters
      if (objectFilter) {
        params.append('object', objectFilter);
      }

      // Add city filter to URL parameters
      if (cityFilter) {
        params.append('city', cityFilter);
      }

      // Debug removed for production performance
      if (__DEV__) console.log('🔍 fetchPage params:', {
        params: params.toString(),
        cityFilter,
        categoryFilter,
        objectFilter,
        selectedFilters
      });



      const url = `${BASE_URL}?${params.toString()}`;

      const res = await fetch(url);
      const data = await safeParseJsonResponse(res);


      // API zwraca obiekt {events: [...], total: 216}, nie tablicę
      let filteredData: any[] = [];
      if (data && data.events && Array.isArray(data.events)) {
        filteredData = data.events;


      } else if (Array.isArray(data)) {
        // Fallback dla starszej wersji API
        filteredData = data;
      } else {
        console.error('❌ Invalid events response structure:', data);
        filteredData = [];
      }





      // Użyj total z odpowiedzi API lub nagłówka jako fallback
      const total = data?.total_pages || parseInt(res.headers.get('X-WP-TotalPages') || '1', 10);
      setTotalPages(total);

      if (append) {
        setEvents(prev => [...prev, ...filteredData]);
      } else {
        setEvents(filteredData);
      }
    } catch (e) {
      console.error('❌ Error fetching events:', e);
      setError('Błąd ładowania wydarzeń.');
      // Ustaw puste wydarzenia w przypadku błędu
      setEvents([]);
    }
  }, [selectedFilters, categoryFilter, objectFilter, cityFilter]);

  // Nowy stan dla wydarzeń kalendarza
  const [calendarEventsData, setCalendarEventsData] = useState<any[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  // Funkcja do pobierania wydarzeń dla kalendarza (niezależnie od głównej listy)
  const fetchCalendarEvents = useCallback(async () => {
    setCalendarLoading(true);
    try {
      // Pobierz wydarzenia dla całego zakresu kalendarza (90 dni)
      const params = new URLSearchParams();
      params.append('per_page', '100'); // Więcej wydarzeń na stronę dla kalendarza
      params.append('date_from', new Date().toISOString().split('T')[0]);
      params.append('date_to', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      // Dodaj filtry jeśli są aktywne
      if (categoryFilter) {
        params.append('category', categoryFilter);
      }
      if (objectFilter) {
        params.append('object', objectFilter);
      }
      if (cityFilter) {
        params.append('city', cityFilter);
      }

      const url = `${BASE_URL}?${params.toString()}`;

      const res = await fetch(url);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ API Error Response:', res.status, errorText);
        setCalendarEventsData([]);
        return;
      }

      const data = await safeParseJsonResponse(res);

      // API zwraca obiekt {events: [...], total: 216}, nie tablicę
      if (data && data.events && Array.isArray(data.events)) {
        setCalendarEventsData(data.events);
      } else if (Array.isArray(data)) {
        // Fallback dla starszej wersji API
        setCalendarEventsData(data);
      } else {
        setCalendarEventsData([]);
        console.error('❌ Invalid calendar events response structure:', data);
      }
    } catch (error) {
      console.error('❌ Error fetching calendar events:', error);
      setCalendarEventsData([]);
    } finally {
      setCalendarLoading(false);
    }
  }, [categoryFilter, objectFilter, cityFilter]);

  const reloadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPage(1);
    // Run both in parallel - they are independent requests
    await Promise.all([fetchPage(1, false), fetchCalendarEvents()]);
    setLoading(false);
    setRefreshing(false);
  }, [fetchPage, fetchCalendarEvents]);



  useEffect(() => {
    reloadEvents();
  }, [reloadEvents]);

  // Stan dla liczb wydarzeń
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({
    'today': 0,
    'this-weekend': 0,
    'this-week': 0,
    'nearby': 0,
    'saved': 0
  });

  // fetchCalendarEvents is already called inside reloadEvents (via Promise.all)
  // so no separate useEffect needed here

  // Usunięto fetchEventCounts - endpoint /event-counts nie istnieje w API
  // Liczby wydarzeń są liczone lokalnie w useEffect poniżej

  // Aktualizuj liczbę zapisanych wydarzeń
  useEffect(() => {
    const savedCount = events.filter(event => isEventSaved(event.id) === true).length;
    setEventCounts(prev => ({
      ...prev,
      'saved': savedCount
    }));
  }, [events, isEventSaved]);

  // Filtruj wydarzenia po stronie klienta
  // Note: cityFilter, categoryFilter, and objectFilter are handled server-side in fetchPage
  // but we include them in dependencies to ensure this memo recalculates when they change
  const filteredEvents = useMemo(() => {
    let filtered = events.filter(e => {
      // Handle selectedDate, selectedDateRange, selectedSpecificDate, saved events, and backup filtering for city/category/object

      // Check selected date or date range
      let dateOk = true;
      if (selectedDate) {
        const eventDate = safeDateParse(e.date); // Convert timestamp to Date
        if (!eventDate) {
          dateOk = false;
        } else {
          const selectedDateStr = selectedDate.toISOString().split('T')[0];
          const eventDateStr = eventDate.toISOString().split('T')[0];
          dateOk = selectedDateStr === eventDateStr;
        }
      } else if (selectedDateRange) {
        const eventDate = safeDateParse(e.date);
        if (!eventDate) {
          dateOk = false;
        } else {
          dateOk = eventDate >= selectedDateRange.start && eventDate <= selectedDateRange.end;
        }
      } else if (selectedSpecificDate) {
        // Nowy filtr: konkretny dzień - pokazuje wszystkie wydarzenia z tego dnia (nawet starsze)
        const eventDate = safeDateParse(e.date);
        if (!eventDate) {
          dateOk = false;
        } else {
          const selectedDateStr = selectedSpecificDate.toISOString().split('T')[0];
          const eventDateStr = eventDate.toISOString().split('T')[0];
          dateOk = selectedDateStr === eventDateStr;
        }
      }

      // Check saved events (client-side only)
      let savedOk = true;
      if (selectedFilters.includes('saved')) {
        savedOk = isEventSaved(e.id) === true;
      }

      // Backup client-side filtering for city, category, and object (in case server-side filtering fails)
      let cityOk = true;
      if (cityFilter) {
        const eventCity = e.location || e.miasto || e.meta?.miasto || '';
        cityOk = eventCity.toLowerCase().includes(cityFilter.toLowerCase());
      }

      let categoryOk = true;
      if (categoryFilter) {
        const embeddedTerms = e._embedded?.['wp:term']?.flat() || [];
        const embeddedCategoryIds = embeddedTerms
          .filter((t: any) => t.taxonomy === 'kategoria-wydarzenia')
          .map((t: any) => t.id);

        const eventCategories: number[] = (e['kategoria-wydarzenia'] || e.categories || embeddedCategoryIds || []).map((v: any) => parseInt(v, 10));
        categoryOk = eventCategories.includes(parseInt(categoryFilter, 10));
      }

      let objectOk = true;
      if (objectFilter) {
        const embeddedTerms = e._embedded?.['wp:term']?.flat() || [];
        const objectTaxonomies = ['obiekt', 'objects', 'obiekty'];
        const embeddedObjectIds = embeddedTerms
          .filter((t: any) => objectTaxonomies.includes(t.taxonomy))
          .map((t: any) => t.id.toString());

        const eventObjects: string[] = (e.objects || e.meta?.objects || embeddedObjectIds || []).map((v: any) => v.toString());
        objectOk = eventObjects.includes(objectFilter.toString());
      }

      return dateOk && savedOk && cityOk && categoryOk && objectOk;
    });

    return filtered.sort((a, b) => {
      const dateA = safeDateParse(a.date);
      const dateB = safeDateParse(b.date);
      if (!dateA || !dateB) return 0;
      return dateA.getTime() - dateB.getTime();
    });
  }, [events, selectedDate, selectedDateRange, selectedSpecificDate, selectedFilters, isEventSaved, cityFilter, categoryFilter, objectFilter]);

  // Weekend events for slider - z calendarEventsData (100 wydarzeń, pełny zasięg)
  const weekendEvents = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = today.getDay(); // 0=nd, 1=pn, ..., 6=sb
    const daysToSaturday = dayOfWeek === 6 ? 0 : dayOfWeek === 0 ? 6 : 6 - dayOfWeek;
    const thisSaturday = new Date(today.getTime() + daysToSaturday * 24 * 60 * 60 * 1000);
    const nextMonday = new Date(thisSaturday.getTime() + 2 * 24 * 60 * 60 * 1000);

    // calendarEventsData ma 100 wydarzeń od dziś - dużo większa szansa że znajdzie weekendowe
    const source = calendarEventsData.length > 0 ? calendarEventsData : events;
    return source.filter(event => {
      const eventDate = safeDateParse(event.date);
      if (!eventDate) return false;
      return eventDate >= thisSaturday && eventDate < nextMonday;
    }).slice(0, 10);
  }, [calendarEventsData, events]);

  const loadMore = async () => {
    if (loadingMore || loading || page >= totalPages) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    await fetchPage(nextPage, true);
    setPage(nextPage);
    setLoadingMore(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    reloadEvents();
  };

  const handleFilterChange = (filters: string[]) => {
    setSelectedFilters(filters);
    // reloadEvents will be called automatically by useEffect when selectedFilters changes
  };



  const handleCategoryFilterChange = (category: string | null) => {
    setCategoryFilter(category);
    // reloadEvents will be called automatically by useEffect when categoryFilter changes
  };



  const handleFilterPress = (filterId: string) => {
    // Define time-based filters that are mutually exclusive
    const timeFilters = ['today', 'this-weekend', 'this-week'];

    // Special handling for 'saved' filter - it's client-side only
    if (filterId === 'saved') {
      const newFilters = selectedFilters.includes(filterId)
        ? selectedFilters.filter(id => id !== filterId)
        : [...selectedFilters, filterId];

      setSelectedFilters(newFilters);
      // For saved filter, we don't reload from server since it's client-side
      return;
    }

    // For time-based filters, ensure only one is active at a time
    if (timeFilters.includes(filterId)) {
      // If clicking on already selected filter, deselect it
      if (selectedFilters.includes(filterId)) {
        const newFilters = selectedFilters.filter(id => !timeFilters.includes(id));
        setSelectedFilters(newFilters);
      } else {
        // Remove other time filters and add this one
        const filteredWithoutTime = selectedFilters.filter(id => !timeFilters.includes(id));
        const newFilters = [...filteredWithoutTime, filterId];
        setSelectedFilters(newFilters);
      }
    } else {
      // For other filters, toggle normally
      const newFilters = selectedFilters.includes(filterId)
        ? selectedFilters.filter(id => id !== filterId)
        : [...selectedFilters, filterId];

      setSelectedFilters(newFilters);
    }

    // reloadEvents will be called automatically by useEffect when selectedFilters changes
  };

  const handleClearFilters = () => {
    setSelectedFilters([]);
    setCategoryFilter(null);
    setObjectFilter(null);
    setCityFilter(null);
    setSelectedDate(null);
    setSelectedDateRange(null);
    setSelectedSpecificDate(null); // Clear specific date filter
    setSelectedCategories([]);
    setSelectedObjects([]);
    setSelectedCities([]);
    setCategorySearchText('');
    setObjectSearchText('');
    setCitySearchText('');

    // reloadEvents will be called automatically by useEffect when filters change
  };

  const handleDateSelect = (date: Date | null) => {
    setSelectedDate(date);
    setSelectedDateRange(null);
    setSelectedSpecificDate(null);

    if (date) {
      const filteredEvents = calendarEventsData.filter(event => {
        if (!event.date) return false;
        const eventDate = safeDateParse(event.date);
        if (!eventDate) return false;
        return eventDate.toDateString() === date.toDateString();
      });
      setEvents(filteredEvents);
      setPage(1);
      setTotalPages(1);
    }
  };

  const handleDateRangeSelect = (startDate: Date, endDate: Date) => {
    setSelectedDateRange({ start: startDate, end: endDate });
    setSelectedDate(null); // Clear single date when range is selected
    setSelectedSpecificDate(null); // Clear specific date when range is selected
    // reloadEvents will be called automatically by useEffect when selectedDateRange changes
    // Odśwież dane kalendarza po wyborze zakresu dat
    fetchCalendarEvents();
  };

  // Nowa funkcja do obsługi wyboru konkretnego dnia
  const handleSpecificDateSelect = (date: Date | null) => {
    setSelectedSpecificDate(date);
    setSelectedDate(null); // Clear single date when specific date is selected
    setSelectedDateRange(null); // Clear range when specific date is selected
    // reloadEvents will be called automatically by useEffect when selectedSpecificDate changes
    // Odśwież dane kalendarza po wyborze konkretnego dnia
    fetchCalendarEvents();
  };

  // Przygotowanie danych dla kalendarza
  const calendarEvents = useMemo(() => {
    const eventCounts: Record<string, number> = {};

    // Użyj calendarEventsData zamiast events dla dokładniejszych liczb
    const eventsToProcess = calendarEventsData.length > 0 ? calendarEventsData : events;

    eventsToProcess.forEach(event => {
      const eventDate = safeDateParse(event.date);
      if (!eventDate) return;

      const dateStr = eventDate.toISOString().split('T')[0];

      if (!eventCounts[dateStr]) {
        eventCounts[dateStr] = 0;
      }
      eventCounts[dateStr]++;
    });

    return Object.entries(eventCounts).map(([date, count]) => ({
      date,
      count
    }));
  }, [calendarEventsData, events]);

  const handleEventPress = (event: Event) => {
    router.push(`/event/${event.id}`);
  };

  // Helper function to safely get event title
  const getEventTitle = (event: Event): string => {
    if (typeof event.title === 'string') {
      return event.title;
    } else if (event.title?.rendered) {
      return event.title.rendered;
    }
    return 'Brak tytułu';
  };

  const handleShare = async (event: Event) => {
    try {
      const eventDate = safeDateParse(event.date);
      if (!eventDate) return;

      const eventTitle = getEventTitle(event);

      await Share.share({
        message: `${he.decode(eventTitle)}\n\nData: ${safeFormatDate(eventDate.toISOString())} ${safeFormatTime(eventDate.toISOString())}\n${event.meta?.miasto ? `Miasto: ${event.meta.miasto}\n` : ''}${event.meta?.cena ? `Cena: ${event.meta.cena} zł\n` : ''}${event.meta?.['link-do-wydarzenia'] ? `\nSzczegóły: ${event.meta['link-do-wydarzenia']}` : ''}`,
        title: he.decode(eventTitle),
      });
    } catch (error) {
    }
  };

  const handleAddToCalendar = async (event: any) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Use the calendar service to add event
      const calendarEvent = calendarService.createEventFromEventData(event);
      const success = await calendarService.addEventToCalendar(calendarEvent);

      if (!success) {
        Alert.alert('Błąd', 'Nie udało się dodać wydarzenia do kalendarza');
      }
    } catch (error) {
      console.error('Error adding to calendar:', error);
      Alert.alert('Błąd', 'Nie udało się dodać wydarzenia do kalendarza');
    }
  };



  // Render calendar and filters component
  const renderCalendarAndFilters = () => (
    <View style={[styles.calendarFiltersSection, { backgroundColor: theme.colors.background }]}>
      {/* Kalendarz */}
      <InlineCalendar
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        onDateRangeSelect={handleDateRangeSelect}
        events={calendarEvents}
        startDate={new Date()}
        endDate={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)} // +90 dni
      />

      {/* Wszystkie Filtry w Jednej Linii */}
      <View style={styles.filtersInSection}>

        {/* JEDNA LINIA - Wszystkie filtry równej wielkości */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.singleLineFiltersContainer}
          style={styles.filtersScroll}
        >


          {/* Kategoria */}
          <TouchableOpacity
            style={[
              styles.uniformFilterButton,
              {
                backgroundColor: categoryFilter ? theme.colors.primary : theme.colors.subtle,
                borderColor: categoryFilter ? theme.colors.primary : theme.colors.border,
                opacity: loadingFilters ? 0.7 : 1
              }
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setCatModal(true);
            }}
            disabled={loadingFilters}
          >
            {loadingFilters ? (
              <ActivityIndicator size={16} color={categoryFilter ? '#fff' : theme.colors.text} />
            ) : (
              <Tag size={16} color={categoryFilter ? '#fff' : theme.colors.text} />
            )}
            <Text style={[
              styles.uniformFilterText,
              {
                color: categoryFilter ? '#fff' : theme.colors.text,
                fontFamily: theme.fontFamily.medium
              }
            ]}>
              {loadingFilters ? 'Ładowanie...' :
                (categoryFilter ?
                  (categoryFilter.includes(',') ?
                    `${categoryFilter.split(',').length} kategorii` :
                    (() => {
                      const categoryId = categoryFilter;
                      const category = findCategoryInTree(categoryId);
                      return category ? category.name : 'Kategoria';
                    })()
                  ) :
                  `Kategoria${categories.length > 0 ? ` (${categories.length})` : ''}`
                )
              }
            </Text>
            {!loadingFilters && <ChevronDown size={14} color={categoryFilter ? '#fff' : theme.colors.text} />}
          </TouchableOpacity>

          {/* Obiekt */}
          <TouchableOpacity
            style={[
              styles.uniformFilterButton,
              {
                backgroundColor: objectFilter ? theme.colors.primary : theme.colors.subtle,
                borderColor: objectFilter ? theme.colors.primary : theme.colors.border,
                opacity: loadingFilters ? 0.7 : 1
              }
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setObjectModal(true);
            }}
            disabled={loadingFilters}
          >
            {loadingFilters ? (
              <ActivityIndicator size={16} color={objectFilter ? '#fff' : theme.colors.text} />
            ) : (
              <Home size={16} color={objectFilter ? '#fff' : theme.colors.text} />
            )}
            <Text style={[
              styles.uniformFilterText,
              {
                color: objectFilter ? '#fff' : theme.colors.text,
                fontFamily: theme.fontFamily.medium
              }
            ]}>
              {loadingFilters ? 'Ładowanie...' :
                (objectFilter ?
                  (objectFilter.includes(',') ?
                    `${objectFilter.split(',').length} obiektów` :
                    (() => {
                      const objectId = objectFilter;
                      const object = findObjectInTree(objectId);
                      return object ? object.name : 'Obiekt';
                    })()
                  ) :
                  `Obiekt${objects.length > 0 ? ` (${objects.length})` : ''}`
                )
              }
            </Text>
            {!loadingFilters && <ChevronDown size={14} color={objectFilter ? '#fff' : theme.colors.text} />}
          </TouchableOpacity>

          {/* Miasto */}
          <TouchableOpacity
            style={[
              styles.uniformFilterButton,
              {
                backgroundColor: cityFilter ? theme.colors.primary : theme.colors.subtle,
                borderColor: cityFilter ? theme.colors.primary : theme.colors.border,
                opacity: loadingFilters ? 0.7 : 1
              }
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

              setCityModal(true);
            }}
            disabled={loadingFilters}
          >
            {loadingFilters ? (
              <ActivityIndicator size={16} color={cityFilter ? '#fff' : theme.colors.text} />
            ) : (
              <MapPin size={16} color={cityFilter ? '#fff' : theme.colors.text} />
            )}
            <Text style={[
              styles.uniformFilterText,
              {
                color: cityFilter ? '#fff' : theme.colors.text,
                fontFamily: theme.fontFamily.medium
              }
            ]}>
              {loadingFilters ? 'Ładowanie...' :
                (cityFilter ?
                  (() => {
                    if (cityFilter.includes(',')) {
                      const cityCount = cityFilter.split(',').length;
                      return `${cityCount} miast`;
                    } else {
                      return cityFilter;
                    }
                  })()
                  :
                  `Miasto${cities.length > 0 ? ` (${cities.length})` : ''}`
                )
              }
            </Text>
            {!loadingFilters && <ChevronDown size={14} color={cityFilter ? '#fff' : theme.colors.text} />}
          </TouchableOpacity>



          {/* Weekend */}
          <TouchableOpacity
            style={[
              styles.uniformFilterButton,
              {
                backgroundColor: selectedFilters.includes('this-weekend') ? theme.colors.primary : theme.colors.subtle,
                borderColor: selectedFilters.includes('this-weekend') ? theme.colors.primary : theme.colors.border,
              }
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleFilterPress('this-weekend');
            }}
          >
            <CalendarIcon size={16} color={selectedFilters.includes('this-weekend') ? '#fff' : theme.colors.text} />
            <Text style={[
              styles.uniformFilterText,
              {
                color: selectedFilters.includes('this-weekend') ? '#fff' : theme.colors.text,
                fontFamily: theme.fontFamily.medium
              }
            ]}>
              Weekend
            </Text>

          </TouchableOpacity>

          {/* Tydzień */}
          <TouchableOpacity
            style={[
              styles.uniformFilterButton,
              {
                backgroundColor: selectedFilters.includes('this-week') ? theme.colors.primary : theme.colors.subtle,
                borderColor: selectedFilters.includes('this-week') ? theme.colors.primary : theme.colors.border,
              }
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleFilterPress('this-week');
            }}
          >
            <CalendarIcon size={16} color={selectedFilters.includes('this-week') ? '#fff' : theme.colors.text} />
            <Text style={[
              styles.uniformFilterText,
              {
                color: selectedFilters.includes('this-week') ? '#fff' : theme.colors.text,
                fontFamily: theme.fontFamily.medium
              }
            ]}>
              Tydzień
            </Text>

          </TouchableOpacity>



          {/* Zapisane */}
          <TouchableOpacity
            style={[
              styles.uniformFilterButton,
              {
                backgroundColor: selectedFilters.includes('saved') ? theme.colors.primary : theme.colors.subtle,
                borderColor: selectedFilters.includes('saved') ? theme.colors.primary : theme.colors.border,
              }
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleFilterPress('saved');
            }}
          >
            <Heart size={16} color={selectedFilters.includes('saved') ? '#fff' : theme.colors.text} />
            <Text style={[
              styles.uniformFilterText,
              {
                color: selectedFilters.includes('saved') ? '#fff' : theme.colors.text,
                fontFamily: theme.fontFamily.medium
              }
            ]}>
              Zapisane
            </Text>

          </TouchableOpacity>

          {/* Odśwież filtry */}
          <TouchableOpacity
            style={[styles.uniformFilterButton, {
              backgroundColor: loadingFilters ? theme.colors.primary : theme.colors.subtle,
              borderColor: loadingFilters ? theme.colors.primary : theme.colors.border,
              opacity: loadingFilters ? 0.7 : 1
            }]}
            onPress={refreshFilters}
            disabled={loadingFilters}
          >
            {loadingFilters ? (
              <ActivityIndicator size={16} color="#fff" />
            ) : (
              <Filter size={16} color={loadingFilters ? '#fff' : theme.colors.text} />
            )}
            <Text style={[
              styles.uniformFilterText,
              {
                color: loadingFilters ? '#fff' : theme.colors.text,
                fontFamily: theme.fontFamily.medium
              }
            ]}>
              {loadingFilters ? 'Ładowanie...' : 'Odśwież'}
            </Text>
          </TouchableOpacity>

          {/* Wyczyść filtry */}
          {(selectedFilters.length > 0 || categoryFilter || objectFilter || cityFilter || selectedSpecificDate) && (
            <TouchableOpacity
              style={[styles.uniformClearButton]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                handleClearFilters();
              }}
            >
              <X size={16} color={theme.colors.error} />
              <Text style={[styles.uniformFilterText, { color: theme.colors.error, fontFamily: theme.fontFamily.medium }]}>
                Wyczyść
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </View>
  );

  const clearAllFilters = () => {
    setSelectedFilters([]);
    setSelectedDate(null);
    setSelectedDateRange(null);
    setSelectedSpecificDate(null); // Clear specific date filter
    setCategoryFilter(null);
    setObjectFilter(null);
    setCityFilter(null);
    setSelectedCategories([]);
    setSelectedObjects([]);
    setSelectedCities([]);
    setCategorySearchText('');
    setObjectSearchText('');
    setCitySearchText('');

    // reloadEvents will be called automatically by useEffect when filters change
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header with logo */}
        <View style={[styles.header, {
          backgroundColor: theme.colors.background,
          paddingTop: insets.top // Dodany bezpieczny margines od góry
        }]}>
          <Image
            source={{
              uri: theme.isDarkMode
                ? 'https://kaszuby24.pl/wp-content/uploads/2025/07/Bez-nazwy-2-01-1-scaled.png'
                : 'https://kaszuby24.pl/wp-content/uploads/2025/07/Bez-nazwy-2-01-scaled.png'
            }}
            style={styles.logo}
            contentFit="contain"
            transition={200}
            placeholder="Kaszuby24"
            onError={() => {
              // Fallback do tekstu jeśli grafika się nie załaduje
              console.warn('Calendar logo image failed to load');
            }}
          />
        </View>


        {/* Combined Calendar and Filters Section */}
        {renderCalendarAndFilters()}

        {/* Modern Events List - z własnym scrolling */}
        {loading ? (
          <SkeletonLoader type="home" count={5} immediate={true} />
        ) : error ? (
          <View style={styles.center}><Text style={{ color: theme.colors.error }}>{error}</Text></View>
        ) : (
          <ModernEventList
            events={filteredEvents}
            weekendEvents={weekendEvents}
            loading={loading}
            refreshing={refreshing}
            loadingMore={loadingMore}
            onEventPress={handleEventPress}
            onShare={handleShare}
            onAddToCalendar={handleAddToCalendar}
            onRefresh={handleRefresh}
            onLoadMore={loadMore}
            scrollEnabled={true}
            hideSlider={(() => {
              const shouldHide = selectedFilters.length > 0 || !!selectedDate || !!selectedDateRange || !!selectedSpecificDate || !!categoryFilter || !!objectFilter || !!cityFilter;

              return shouldHide;
            })()}
          />
        )}

        {/* Category Picker Sheet Modal */}
        <Modal visible={catModal} transparent animationType="slide" onRequestClose={() => setCatModal(false)}>
          <TouchableOpacity
            style={styles.modalOverlay}
            onPress={() => setCatModal(false)}
            activeOpacity={1}
          >
            <View style={[styles.sheetModal, {
              backgroundColor: theme.colors.card,
              height: '80%',
              maxHeight: 600
            }]}>
              <View style={styles.sheetHandle} />
              <View style={styles.filterHeader}>
                <Text style={[styles.sheetTitle, {
                  color: theme.colors.text,
                  fontFamily: theme.fontFamily.bold,
                  marginBottom: 0
                }]}>
                  Wybierz kategorie
                </Text>
                <View style={styles.filterIcon}>
                  <Tag size={20} color={theme.colors.textSecondary} />
                </View>
              </View>
              {selectedCategories.length > 0 && (
                <Text style={[styles.filterCount, { color: theme.colors.textSecondary }]}>
                  Wybrane: {selectedCategories.length}
                </Text>
              )}

              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <Search size={20} color={theme.colors.textSecondary} />
                <TextInput
                  style={[styles.searchInput, {
                    color: theme.colors.text,
                    fontFamily: theme.fontFamily.medium
                  }]}
                  placeholder="Szukaj kategorii..."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={categorySearchText}
                  onChangeText={setCategorySearchText}
                />
                {categorySearchText.length > 0 && (
                  <TouchableOpacity onPress={() => setCategorySearchText('')}>
                    <X size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {loadingFilters ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={[styles.loadingText, {
                    color: theme.colors.textSecondary,
                    fontFamily: theme.fontFamily.medium
                  }]}>
                    Ładowanie kategorii...
                  </Text>
                </View>
              ) : (
                <>
                  <ScrollView style={styles.sheetContent} showsVerticalScrollIndicator={false}>
                    <TouchableOpacity
                      style={[
                        styles.sheetItem,
                        selectedCategories.length === 0 && !categoryFilter && styles.sheetItemSelected
                      ]}
                      onPress={() => {
                        setSelectedCategories([]);
                        setCategoryFilter(null);
                        setCatModal(false);
                        // reloadEvents will be called automatically by useEffect when categoryFilter changes
                      }}
                    >
                      <View style={styles.categoryItemContent}>
                        <View style={styles.categoryItemLeft}>
                          <View style={[
                            styles.categoryCheckbox,
                            {
                              backgroundColor: selectedCategories.length === 0 && !categoryFilter ? theme.colors.primary : 'transparent',
                              borderColor: selectedCategories.length === 0 && !categoryFilter ? theme.colors.primary : theme.colors.border
                            }
                          ]}>
                            {selectedCategories.length === 0 && !categoryFilter && (
                              <Text style={[styles.checkmark, { color: '#fff' }]}>✓</Text>
                            )}
                          </View>
                          <Text style={[
                            styles.sheetItemText,
                            {
                              color: selectedCategories.length === 0 && !categoryFilter ? theme.colors.primary : theme.colors.text,
                              fontFamily: theme.fontFamily.medium,
                              marginLeft: 12
                            }
                          ]}>
                            Wszystkie kategorie
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* Root categories with expand/collapse */}
                    {filteredCategoryTree.rootCategories.map(cat => (
                      <View key={cat.id}>
                        <TouchableOpacity
                          style={[
                            styles.sheetItem,
                            selectedCategories.includes(cat.id) && styles.sheetItemSelected
                          ]}
                          onPress={() => {
                            if (cat.children && cat.children.length > 0) {
                              toggleCategoryExpansion(cat.id.toString());
                            } else {
                              handleCategoryToggle(cat.id.toString());
                            }
                          }}
                        >
                          <View style={styles.categoryItemContent}>
                            <View style={styles.categoryItemLeft}>
                              <TouchableOpacity
                                onPress={() => handleCategoryToggle(cat.id)}
                                style={{ marginRight: 8 }}
                              >
                                <View style={[
                                  styles.categoryCheckbox,
                                  {
                                    backgroundColor: selectedCategories.includes(cat.id) ? theme.colors.primary : 'transparent',
                                    borderColor: selectedCategories.includes(cat.id) ? theme.colors.primary : theme.colors.border
                                  }
                                ]}>
                                  {selectedCategories.includes(cat.id) && (
                                    <Text style={[styles.checkmark, { color: '#fff' }]}>✓</Text>
                                  )}
                                </View>
                              </TouchableOpacity>
                              <Text style={[
                                styles.sheetItemText,
                                {
                                  color: selectedCategories.includes(cat.id) ? theme.colors.primary : theme.colors.text,
                                  fontFamily: theme.fontFamily.medium,
                                  marginLeft: 4
                                }
                              ]}>
                                {cat.name}
                              </Text>
                            </View>
                            <View style={styles.categoryItemRight}>
                              {cat.count && cat.count > 0 && (
                                <View style={[styles.categoryCount, { backgroundColor: theme.colors.subtle }]}>
                                  <Text style={[styles.categoryCountText, {
                                    color: theme.colors.textSecondary,
                                    fontFamily: theme.fontFamily.semibold
                                  }]}>
                                    {cat.count}
                                  </Text>
                                </View>
                              )}
                              {cat.children && cat.children.length > 0 && (
                                <TouchableOpacity
                                  onPress={() => toggleCategoryExpansion(cat.id.toString())}
                                  style={styles.expandButton}
                                >
                                  {expandedCategories.has(cat.id.toString()) ? (
                                    <ChevronDown size={14} color={theme.colors.textSecondary} />
                                  ) : (
                                    <ChevronRight size={14} color={theme.colors.textSecondary} />
                                  )}
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        </TouchableOpacity>

                        {/* Render children if expanded */}
                        {expandedCategories.has(cat.id.toString()) && cat.children && cat.children.map((child: any) => (
                          <TouchableOpacity
                            key={child.id}
                            style={[
                              styles.sheetItem,
                              { paddingLeft: 32 },
                              selectedCategories.includes(child.id) && styles.sheetItemSelected
                            ]}
                            onPress={() => handleCategoryToggle(child.id)}
                          >
                            <View style={styles.categoryItemContent}>
                              <View style={styles.categoryItemLeft}>
                                <View style={[
                                  styles.categoryCheckbox,
                                  {
                                    backgroundColor: selectedCategories.includes(child.id) ? theme.colors.primary : 'transparent',
                                    borderColor: selectedCategories.includes(child.id) ? theme.colors.primary : theme.colors.border
                                  }
                                ]}>
                                  {selectedCategories.includes(child.id) && (
                                    <Text style={[styles.checkmark, { color: '#fff' }]}>✓</Text>
                                  )}
                                </View>
                                <Text style={[
                                  styles.sheetItemText,
                                  {
                                    color: selectedCategories.includes(child.id) ? theme.colors.primary : theme.colors.text,
                                    fontFamily: theme.fontFamily.medium,
                                    marginLeft: 12
                                  }
                                ]}>
                                  {child.name}
                                </Text>
                              </View>
                              {child.count && child.count > 0 && (
                                <View style={[styles.categoryCount, { backgroundColor: theme.colors.subtle }]}>
                                  <Text style={[styles.categoryCountText, {
                                    color: theme.colors.textSecondary,
                                    fontFamily: theme.fontFamily.semibold
                                  }]}>
                                    {child.count}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ))}

                    {/* Categories without parent at the bottom */}
                    {filteredCategoryTree.categoriesWithoutParent.map(cat => (
                      <TouchableOpacity
                        key={cat.id}
                        style={styles.sheetItem}
                        onPress={() => handleCategoryToggle(cat.id)}
                      >
                        <View style={styles.categoryItemContent}>
                          <View style={styles.categoryItemLeft}>
                            <View style={[
                              styles.categoryCheckbox,
                              {
                                backgroundColor: selectedCategories.includes(cat.id) ? theme.colors.primary : 'transparent',
                                borderColor: selectedCategories.includes(cat.id) ? theme.colors.primary : theme.colors.border
                              }
                            ]}>
                              {selectedCategories.includes(cat.id) && (
                                <Text style={[styles.checkmark, { color: '#fff' }]}>✓</Text>
                              )}
                            </View>
                            {selectedCategories.includes(cat.id) && (
                              <View style={styles.selectedItemIndicator} />
                            )}
                            <Text style={[
                              styles.sheetItemText,
                              {
                                color: selectedCategories.includes(cat.id) ? theme.colors.primary : theme.colors.text,
                                fontFamily: theme.fontFamily.medium,
                                marginLeft: 12
                              }
                            ]}>
                              {cat.name}
                            </Text>
                          </View>
                          {cat.count && cat.count > 0 && (
                            <View style={[styles.categoryCount, { backgroundColor: theme.colors.subtle }]}>
                              <Text style={[styles.categoryCountText, {
                                color: theme.colors.textSecondary,
                                fontFamily: theme.fontFamily.semibold
                              }]}>
                                {cat.count}
                              </Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, {
                        backgroundColor: theme.colors.subtle,
                        borderColor: theme.colors.border
                      }]}
                      onPress={handleCategoryFilterClear}
                    >
                      <Text style={[styles.actionText, {
                        color: theme.colors.textSecondary,
                        fontFamily: theme.fontFamily.medium
                      }]}>
                        Wyczyść
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, {
                        backgroundColor: theme.colors.primary,
                        borderColor: theme.colors.primary
                      }]}
                      onPress={handleCategoryFilterApply}
                    >
                      <Text style={[styles.actionText, {
                        color: '#fff',
                        fontFamily: theme.fontFamily.medium
                      }]}>
                        Zastosuj ({selectedCategories.length})
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Object Picker Sheet Modal */}
        <Modal visible={objectModal} transparent animationType="slide" onRequestClose={() => setObjectModal(false)}>
          <TouchableOpacity
            style={styles.modalOverlay}
            onPress={() => setObjectModal(false)}
            activeOpacity={1}
          >
            <View style={[styles.sheetModal, {
              backgroundColor: theme.colors.card,
              height: '80%', // Stała wysokość
              maxHeight: 600 // Maksymalna wysokość
            }]}>
              <View style={styles.sheetHandle} />
              <View style={styles.filterHeader}>
                <Text style={[styles.sheetTitle, {
                  color: theme.colors.text,
                  fontFamily: theme.fontFamily.bold,
                  marginBottom: 0
                }]}>
                  Wybierz obiekt
                </Text>
                <View style={styles.filterIcon}>
                  <Home size={20} color={theme.colors.textSecondary} />
                </View>
              </View>
              {selectedObjects.length > 0 && (
                <Text style={[styles.filterCount, { color: theme.colors.textSecondary }]}>
                  Wybrane: {selectedObjects.length}
                </Text>
              )}

              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <Search size={20} color={theme.colors.textSecondary} />
                <TextInput
                  style={[styles.searchInput, {
                    color: theme.colors.text,
                    fontFamily: theme.fontFamily.medium
                  }]}
                  placeholder="Szukaj obiektu..."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={objectSearchText}
                  onChangeText={setObjectSearchText}
                />
                {objectSearchText.length > 0 && (
                  <TouchableOpacity onPress={() => setObjectSearchText('')}>
                    <X size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {loadingFilters ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={[styles.loadingText, {
                    color: theme.colors.textSecondary,
                    fontFamily: theme.fontFamily.medium
                  }]}>
                    Ładowanie obiektów...
                  </Text>
                </View>
              ) : (
                <>
                  <ScrollView style={styles.sheetContent} showsVerticalScrollIndicator={false}>
                    <TouchableOpacity
                      style={styles.sheetItem}
                      onPress={() => {
                        setSelectedObjects([]);
                        setObjectFilter(null);
                        setObjectModal(false);
                        // reloadEvents will be called automatically by useEffect when objectFilter changes
                      }}
                    >
                      <View style={styles.categoryItemContent}>
                        <View style={styles.categoryItemLeft}>
                          <View style={[
                            styles.categoryCheckbox,
                            {
                              backgroundColor: !objectFilter ? theme.colors.primary : 'transparent',
                              borderColor: !objectFilter ? theme.colors.primary : theme.colors.border
                            }
                          ]}>
                            {!objectFilter && (
                              <Text style={[styles.checkmark, { color: '#fff' }]}>✓</Text>
                            )}
                          </View>
                          <Text style={[
                            styles.sheetItemText,
                            {
                              color: !objectFilter ? theme.colors.primary : theme.colors.text,
                              fontFamily: theme.fontFamily.medium,
                              marginLeft: 12
                            }
                          ]}>
                            Wszystkie obiekty
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* Root objects with expand/collapse */}
                    {filteredObjectTree.rootObjects.map(obj => (
                      <View key={obj.id}>
                        <TouchableOpacity
                          style={styles.sheetItem}
                          onPress={() => {
                            if (obj.children && obj.children.length > 0) {
                              toggleObjectExpansion(obj.id.toString());
                            } else {
                              handleObjectToggle(obj.id.toString());
                            }
                          }}
                        >
                          <View style={styles.categoryItemContent}>
                            <View style={styles.categoryItemLeft}>
                              <TouchableOpacity
                                onPress={() => handleObjectToggle(obj.id.toString())}
                                style={{ marginRight: 8 }}
                              >
                                <View style={[
                                  styles.categoryCheckbox,
                                  {
                                    backgroundColor: selectedObjects.includes(obj.id.toString()) ? theme.colors.primary : 'transparent',
                                    borderColor: selectedObjects.includes(obj.id.toString()) ? theme.colors.primary : theme.colors.border
                                  }
                                ]}>
                                  {selectedObjects.includes(obj.id.toString()) && (
                                    <Text style={[styles.checkmark, { color: '#fff' }]}>✓</Text>
                                  )}
                                </View>
                                {selectedObjects.includes(obj.id.toString()) && (
                                  <View style={styles.selectedItemIndicator} />
                                )}
                              </TouchableOpacity>
                              <Text style={[
                                styles.sheetItemText,
                                {
                                  color: selectedObjects.includes(obj.id.toString()) ? theme.colors.primary : theme.colors.text,
                                  fontFamily: theme.fontFamily.medium,
                                  marginLeft: 4
                                }
                              ]}>
                                {obj.name}
                              </Text>
                            </View>
                            <View style={styles.categoryItemRight}>
                              {obj.count && obj.count > 0 && (
                                <View style={[styles.categoryCount, { backgroundColor: theme.colors.subtle }]}>
                                  <Text style={[styles.categoryCountText, {
                                    color: theme.colors.textSecondary,
                                    fontFamily: theme.fontFamily.semibold
                                  }]}>
                                    {obj.count}
                                  </Text>
                                </View>
                              )}
                              {obj.children && obj.children.length > 0 && (
                                <TouchableOpacity
                                  onPress={() => toggleObjectExpansion(obj.id.toString())}
                                  style={styles.expandButton}
                                >
                                  {expandedObjects.has(obj.id.toString()) ? (
                                    <ChevronDown size={14} color={theme.colors.textSecondary} />
                                  ) : (
                                    <ChevronRight size={14} color={theme.colors.textSecondary} />
                                  )}
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        </TouchableOpacity>

                        {/* Render children if expanded */}
                        {expandedObjects.has(obj.id.toString()) && obj.children && obj.children.map((child: any) => (
                          <TouchableOpacity
                            key={child.id}
                            style={[styles.sheetItem, { paddingLeft: 32 }]}
                            onPress={() => handleObjectToggle(child.id.toString())}
                          >
                            <View style={styles.categoryItemContent}>
                              <View style={styles.categoryItemLeft}>
                                <View style={[
                                  styles.categoryCheckbox,
                                  {
                                    backgroundColor: selectedObjects.includes(child.id.toString()) ? theme.colors.primary : 'transparent',
                                    borderColor: selectedObjects.includes(child.id.toString()) ? theme.colors.primary : theme.colors.border
                                  }
                                ]}>
                                  {selectedObjects.includes(child.id.toString()) && (
                                    <Text style={[styles.checkmark, { color: '#fff' }]}>✓</Text>
                                  )}
                                </View>
                                <Text style={[
                                  styles.sheetItemText,
                                  {
                                    color: selectedObjects.includes(child.id.toString()) ? theme.colors.primary : theme.colors.text,
                                    fontFamily: theme.fontFamily.medium,
                                    marginLeft: 12
                                  }
                                ]}>
                                  {child.name}
                                </Text>
                              </View>
                              {child.count && child.count > 0 && (
                                <View style={[styles.categoryCount, { backgroundColor: theme.colors.subtle }]}>
                                  <Text style={[styles.categoryCountText, {
                                    color: theme.colors.textSecondary,
                                    fontFamily: theme.fontFamily.semibold
                                  }]}>
                                    {child.count}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ))}

                    {/* Objects without parent at the bottom */}
                    {filteredObjectTree.objectsWithoutParent.map(obj => (
                      <TouchableOpacity
                        key={obj.id}
                        style={styles.sheetItem}
                        onPress={() => handleObjectToggle(obj.id.toString())}
                      >
                        <View style={styles.categoryItemContent}>
                          <View style={styles.categoryItemLeft}>
                            <View style={[
                              styles.categoryCheckbox,
                              {
                                backgroundColor: selectedObjects.includes(obj.id.toString()) ? theme.colors.primary : 'transparent',
                                borderColor: selectedObjects.includes(obj.id.toString()) ? theme.colors.primary : theme.colors.border
                              }
                            ]}>
                              {selectedObjects.includes(obj.id.toString()) && (
                                <Text style={[styles.checkmark, { color: '#fff' }]}>✓</Text>
                              )}
                            </View>
                            <Text style={[
                              styles.sheetItemText,
                              {
                                color: selectedObjects.includes(obj.id.toString()) ? theme.colors.primary : theme.colors.text,
                                fontFamily: theme.fontFamily.medium,
                                marginLeft: 12
                              }
                            ]}>
                              {obj.name}
                            </Text>
                          </View>
                          {obj.count && obj.count > 0 && (
                            <View style={[styles.categoryCount, { backgroundColor: theme.colors.subtle }]}>
                              <Text style={[styles.categoryCountText, {
                                color: theme.colors.textSecondary,
                                fontFamily: theme.fontFamily.semibold
                              }]}>
                                {obj.count}
                              </Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, {
                        backgroundColor: theme.colors.subtle,
                        borderColor: theme.colors.border
                      }]}
                      onPress={handleObjectFilterClear}
                    >
                      <Text style={[styles.actionText, {
                        color: theme.colors.textSecondary,
                        fontFamily: theme.fontFamily.medium
                      }]}>
                        Wyczyść
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, {
                        backgroundColor: theme.colors.primary,
                        borderColor: theme.colors.primary
                      }]}
                      onPress={handleObjectFilterApply}
                    >
                      <Text style={[styles.actionText, {
                        color: '#fff',
                        fontFamily: theme.fontFamily.medium
                      }]}>
                        Zastosuj ({selectedObjects.length})
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* City Picker Sheet Modal */}
        <Modal visible={cityModal} transparent animationType="slide" onRequestClose={() => setCityModal(false)}>
          <TouchableOpacity
            style={styles.modalOverlay}
            onPress={() => setCityModal(false)}
            activeOpacity={1}
          >
            <View style={[styles.sheetModal, {
              backgroundColor: theme.colors.card,
              height: '80%',
              maxHeight: 600
            }]}>
              <View style={styles.sheetHandle} />
              <View style={styles.filterHeader}>
                <Text style={[styles.sheetTitle, {
                  color: theme.colors.text,
                  fontFamily: theme.fontFamily.bold,
                  marginBottom: 0
                }]}>
                  Wybierz miasto
                </Text>
                <View style={styles.filterIcon}>
                  <MapPin size={20} color={theme.colors.textSecondary} />
                </View>
              </View>
              {selectedCities.length > 0 && (
                <Text style={[styles.filterCount, { color: theme.colors.textSecondary }]}>
                  Wybrane: {selectedCities.length}
                </Text>
              )}



              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <Search size={20} color={theme.colors.textSecondary} />
                <TextInput
                  style={[styles.searchInput, {
                    color: theme.colors.text,
                    fontFamily: theme.fontFamily.medium
                  }]}
                  placeholder="Szukaj miasta..."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={citySearchText}
                  onChangeText={setCitySearchText}
                />
                {citySearchText.length > 0 && (
                  <TouchableOpacity onPress={() => setCitySearchText('')}>
                    <X size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {loadingFilters ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={[styles.loadingText, {
                    color: theme.colors.textSecondary,
                    fontFamily: theme.fontFamily.medium
                  }]}>
                    Ładowanie miast...
                  </Text>
                </View>
              ) : (
                <>
                  <ScrollView style={styles.sheetContent} showsVerticalScrollIndicator={false}>
                    <TouchableOpacity
                      style={styles.sheetItem}
                      onPress={() => {
                        setSelectedCities([]);
                        setCityFilter(null);
                        setCityModal(false);
                        // reloadEvents will be called automatically by useEffect when cityFilter changes
                      }}
                    >
                      <View style={styles.categoryItemContent}>
                        <View style={styles.categoryItemLeft}>
                          <View style={[
                            styles.categoryCheckbox,
                            {
                              backgroundColor: !cityFilter ? theme.colors.primary : 'transparent',
                              borderColor: !cityFilter ? theme.colors.primary : theme.colors.border
                            }
                          ]}>
                            {!cityFilter && (
                              <Text style={[styles.checkmark, { color: '#fff' }]}>✓</Text>
                            )}
                          </View>
                          <Text style={[
                            styles.sheetItemText,
                            {
                              color: !cityFilter ? theme.colors.primary : theme.colors.text,
                              fontFamily: theme.fontFamily.medium,
                              marginLeft: 12
                            }
                          ]}>
                            Wszystkie miasta
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* Cities list */}
                    {cities
                      .filter(city =>
                        !citySearchText.trim() ||
                        city.name.toLowerCase().includes(citySearchText.toLowerCase())
                      )
                      .map(city => (
                        <TouchableOpacity
                          key={city.id}
                          style={styles.sheetItem}
                          onPress={() => {

                            handleCityToggle(city.name);
                          }}
                        >
                          <View style={styles.categoryItemContent}>
                            <View style={styles.categoryItemLeft}>
                              <View style={[
                                styles.categoryCheckbox,
                                {
                                  backgroundColor: selectedCities.includes(city.name) ? theme.colors.primary : 'transparent',
                                  borderColor: selectedCities.includes(city.name) ? theme.colors.primary : theme.colors.border
                                }
                              ]}>
                                {selectedCities.includes(city.name) && (
                                  <Text style={[styles.checkmark, { color: '#fff' }]}>✓</Text>
                                )}
                              </View>
                              {selectedCities.includes(city.name) && (
                                <View style={styles.selectedItemIndicator} />
                              )}
                              <Text style={[
                                styles.sheetItemText,
                                {
                                  color: selectedCities.includes(city.name) ? theme.colors.primary : theme.colors.text,
                                  fontFamily: theme.fontFamily.medium,
                                  marginLeft: 12
                                }
                              ]}>
                                {city.name}
                              </Text>
                            </View>
                            {city.count && city.count > 0 && (
                              <View style={[styles.categoryCount, { backgroundColor: theme.colors.subtle }]}>
                                <Text style={[styles.categoryCountText, {
                                  color: theme.colors.textSecondary,
                                  fontFamily: theme.fontFamily.semibold
                                }]}>
                                  {city.count}
                                </Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, {
                        backgroundColor: theme.colors.subtle,
                        borderColor: theme.colors.border
                      }]}
                      onPress={handleCityFilterClear}
                    >
                      <Text style={[styles.actionText, {
                        color: theme.colors.textSecondary,
                        fontFamily: theme.fontFamily.medium
                      }]}>
                        Wyczyść
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, {
                        backgroundColor: theme.colors.primary,
                        borderColor: theme.colors.primary
                      }]}
                      onPress={handleCityFilterApply}
                    >
                      <Text style={[styles.actionText, {
                        color: '#fff',
                        fontFamily: theme.fontFamily.medium
                      }]}>
                        Zastosuj ({selectedCities.length})
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Specific Date Picker Modal */}
        <Modal visible={showSpecificDatePicker} transparent animationType="slide" onRequestClose={() => setShowSpecificDatePicker(false)}>
          <TouchableOpacity
            style={styles.modalOverlay}
            onPress={() => setShowSpecificDatePicker(false)}
            activeOpacity={1}
          >
            <View style={[styles.sheetModal, {
              backgroundColor: theme.colors.card,
              height: '60%', // Mniejsza wysokość dla pickera daty
              maxHeight: 500
            }]}>
              <View style={styles.sheetHandle} />
              <Text style={[styles.sheetTitle, {
                color: theme.colors.text,
                fontFamily: theme.fontFamily.bold
              }]}>
                Wybierz konkretny dzień
              </Text>

              <Text style={[styles.rangeInfo, {
                color: theme.colors.textSecondary,
                fontFamily: theme.fontFamily.medium,
                textAlign: 'center',
                marginBottom: 20
              }]}>
                Zobacz wszystkie wydarzenia z wybranego dnia (nawet te starsze)
              </Text>

              {/* Simple Date Picker */}
              <View style={styles.datePickerContainer}>
                <TouchableOpacity
                  style={[styles.datePickerButton, {
                    backgroundColor: theme.colors.subtle,
                    borderColor: theme.colors.border
                  }]}
                  onPress={() => {
                    // Tutaj można dodać DatePickerAndroid lub DatePickerIOS
                    // Na razie używam prostego wyboru daty
                    const today = new Date();
                    const selectedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    handleSpecificDateSelect(selectedDate);
                    setShowSpecificDatePicker(false);
                  }}
                >
                  <CalendarIcon size={20} color={theme.colors.primary} />
                  <Text style={[styles.datePickerText, {
                    color: theme.colors.text,
                    fontFamily: theme.fontFamily.medium,
                    marginLeft: 8
                  }]}>
                    Dzisiaj
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.datePickerButton, {
                    backgroundColor: theme.colors.subtle,
                    borderColor: theme.colors.border
                  }]}
                  onPress={() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    handleSpecificDateSelect(yesterday);
                    setShowSpecificDatePicker(false);
                  }}
                >
                  <CalendarIcon size={20} color={theme.colors.primary} />
                  <Text style={[styles.datePickerText, {
                    color: theme.colors.text,
                    fontFamily: theme.fontFamily.medium,
                    marginLeft: 8
                  }]}>
                    Wczoraj
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.datePickerButton, {
                    backgroundColor: theme.colors.subtle,
                    borderColor: theme.colors.border
                  }]}
                  onPress={() => {
                    const lastWeek = new Date();
                    lastWeek.setDate(lastWeek.getDate() - 7);
                    handleSpecificDateSelect(lastWeek);
                    setShowSpecificDatePicker(false);
                  }}
                >
                  <CalendarIcon size={20} color={theme.colors.primary} />
                  <Text style={[styles.datePickerText, {
                    color: theme.colors.text,
                    fontFamily: theme.fontFamily.medium,
                    marginLeft: 8
                  }]}>
                    Tydzień temu
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.datePickerButton, {
                    backgroundColor: theme.colors.subtle,
                    borderColor: theme.colors.border
                  }]}
                  onPress={() => {
                    const lastMonth = new Date();
                    lastMonth.setMonth(lastMonth.getMonth() - 1);
                    handleSpecificDateSelect(lastMonth);
                    setShowSpecificDatePicker(false);
                  }}
                >
                  <CalendarIcon size={20} color={theme.colors.primary} />
                  <Text style={[styles.datePickerText, {
                    color: theme.colors.text,
                    fontFamily: theme.fontFamily.medium,
                    marginLeft: 8
                  }]}>
                    Miesiąc temu
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.colors.subtle }]}
                  onPress={() => {
                    setShowSpecificDatePicker(false);
                    handleSpecificDateSelect(null);
                  }}
                >
                  <Text style={[styles.actionText, {
                    color: theme.colors.textSecondary,
                    fontFamily: theme.fontFamily.medium
                  }]}>
                    Wyczyść
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
                  onPress={() => setShowSpecificDatePicker(false)}
                >
                  <Text style={[styles.actionText, {
                    color: '#fff',
                    fontFamily: theme.fontFamily.medium
                  }]}>
                    Zamknij
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Header styles
  header: {
    paddingTop: 0, // Usunięty niepotrzebny padding dla status bara
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  logo: {
    width: Platform.OS === 'ios' ? 100 : 110, // Slightly larger on Android
    height: Platform.OS === 'ios' ? 28 : 32, // Slightly taller on Android
    alignSelf: 'center',
    marginBottom: 12,
  },
  filtersBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    zIndex: 10,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.04)',
    flex: 1,
    marginRight: 8,
  },
  filterText: {
    fontSize: 14,
    fontFamily: 'Poppins_Medium',
    marginLeft: 6,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  clearText: {
    fontSize: 13,
    marginLeft: 4,
  },
  card: {
    borderRadius: 18,
    marginHorizontal: 14,
    marginVertical: 8,
    padding: 14,
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  image: {
    width: 70,
    height: 70,
    borderRadius: 12,
    marginRight: 14,
    backgroundColor: '#eee',
  },
  cardContent: { flex: 1 },
  title: {
    fontSize: 16,
    fontFamily: 'Poppins_Bold',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 6,
  },
  meta: {
    fontSize: 13,
    marginLeft: 6,
  },
  price: {
    fontSize: 14,
    fontFamily: 'Poppins_SemiBold',
    marginTop: 4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '90%',
    borderRadius: 16,
    padding: 16,
  },
  modalClose: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  desc: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  ticketBtn: {
    marginTop: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.02)',
    alignItems: 'center',
  },
  ticketText: {
    fontSize: 14,
    fontFamily: 'Poppins_Bold',
  },

  pickerModal: {
    width: '90%',
    borderRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
  pickerTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_Bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  pickerItem: {
    paddingVertical: 10,
  },
  pickerText: {
    fontSize: 14,
    fontFamily: 'Poppins_Medium',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingHorizontal: 4,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.06)',
    minHeight: 44,
  },
  actionText: {
    fontSize: 14,
    fontFamily: 'Poppins_SemiBold',
    textAlign: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  saveButton: {
    padding: 4,
    marginLeft: 8,
  },
  filtersContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    zIndex: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.04)',
    flex: 1,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  filterButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_SemiBold',
    marginLeft: 8,
  },
  clearFilterButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
  clearAllText: {
    fontSize: 13,
    marginLeft: 4,
  },
  // Combined Calendar and Filters Section
  calendarFiltersSection: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },

  filtersInSection: {
    paddingVertical: 12,
  },

  filtersScroll: {
    flexGrow: 0,
  },
  filtersScrollContainer: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  simpleFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  simpleFilterText: {
    fontSize: 13,
    fontFamily: 'Poppins_Medium',
  },
  clearFiltersButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearInScroll: {
    backgroundColor: 'rgba(255,0,0,0.1)',
    borderRadius: 20,
    minWidth: 60,
  },
  clearFiltersText: {
    fontSize: 12,
    fontFamily: 'Poppins_Medium',
  },

  // Nowe style dla ulepszonych filtrów
  enhancedFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  enhancedFilterText: {
    fontSize: 14,
    fontFamily: 'Poppins_SemiBold',
    marginLeft: 6,
    marginRight: 6,
  },
  filterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 11,
    fontFamily: 'Poppins_Bold',
  },
  secondaryFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  secondaryFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 8,
    borderWidth: 1,
    maxWidth: 150,
  },
  secondaryFilterText: {
    fontSize: 13,
    fontFamily: 'Poppins_Medium',
    marginLeft: 6,
    marginRight: 4,
    flex: 1,
  },
  clearFiltersButtonEnhanced: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,0,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,0,0,0.2)',
  },
  clearFiltersTextEnhanced: {
    fontSize: 12,
    fontFamily: 'Poppins_SemiBold',
    marginLeft: 4,
  },

  // Style dla równych filtrów w jednej linii
  singleLineFiltersContainer: {
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  uniformFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1.5,
    minWidth: 80,
    height: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  uniformFilterText: {
    fontSize: 11,
    fontFamily: 'Poppins_SemiBold',
    marginLeft: 5,
    marginRight: 3,
    textAlign: 'center',
    flex: 1,
  },
  uniformFilterBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 3,
  },
  uniformClearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,0,0,0.3)',
    backgroundColor: 'rgba(255,0,0,0.1)',
    minWidth: 80,
    height: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },

  // Sheet Modal Styles
  sheetModal: {
    width: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '80%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  sheetHandle: {
    width: 40,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 1.5,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_Bold',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 2,
  },
  sheetItem: {
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.03)',
    borderRadius: 8,
    marginBottom: 2,
    backgroundColor: 'transparent',
  },
  sheetItemSelected: {
    backgroundColor: 'rgba(34, 74, 150, 0.04)',
    borderLeftWidth: 2,
    borderLeftColor: '#224A96',
    borderRadius: 8,
  },
  sheetItemText: {
    fontSize: 14,
    fontFamily: 'Poppins_Medium',
    letterSpacing: -0.1,
    lineHeight: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: 'rgba(0,0,0,0.01)',
    borderRadius: 12,
    marginHorizontal: -4,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    letterSpacing: -0.1,
    fontFamily: 'Poppins_Medium',
    color: 'rgba(0,0,0,0.5)',
  },

  // New styles for category tree rendering
  categoryItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  categoryItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 6,
  },
  categoryCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkmark: {
    fontSize: 11,
    fontFamily: 'Poppins_Bold',
    color: '#fff',
  },
  categoryItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 6,
  },
  categoryCount: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  categoryCountText: {
    fontSize: 11,
    fontFamily: 'Poppins_SemiBold',
    letterSpacing: -0.1,
    color: 'rgba(0,0,0,0.6)',
  },
  expandButton: {
    padding: 6,
    marginLeft: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },

  // Search Container
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 14,
    fontFamily: 'Poppins_Medium',
  },

  // Date Picker Styles
  datePickerContainer: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 16,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  datePickerText: {
    fontSize: 13,
    fontFamily: 'Poppins_Medium',
    marginLeft: 6,
  },
  rangeInfo: {
    fontSize: 12,
    fontFamily: 'Poppins_Medium',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 12,
    lineHeight: 16,
  },


  // New enhanced styles
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.01)',
    borderRadius: 12,
    marginHorizontal: -4,
    paddingHorizontal: 12,
  },
  filterCount: {
    fontSize: 13,
    fontFamily: 'Poppins_Medium',
    color: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  filterIcon: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  selectedItemIndicator: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#224A96',
  },
}); 