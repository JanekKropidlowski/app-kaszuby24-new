export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return 'Nieznana data';
  }
  
  // Format: "25 czerwca 2023" - Polish format
  const months = [
    'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
    'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'
  ];
  
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return 'Nieznana data';
  }
  
  // Format: "25 czerwca 2023, 14:30" - Polish format
  const months = [
    'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
    'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'
  ];
  
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}, ${hours}:${minutes}`;
};

export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return 'Nieznana godzina';
  }
  
  return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
};

// Bezpieczna funkcja do parsowania dat
export const safeDateParse = (dateInput: string | number | null | undefined): Date | null => {
  if (!dateInput) return null;
  
  try {
    // Jeśli to string, sprawdź czy to timestamp
    if (typeof dateInput === 'string') {
      const timestamp = parseInt(dateInput, 10);
      if (!isNaN(timestamp)) {
        // Jeśli timestamp jest w sekundach (10 cyfr), konwertuj na milisekundy
        if (timestamp.toString().length === 10) {
          return new Date(timestamp * 1000);
        }
        // Jeśli timestamp jest w milisekundach (13 cyfr)
        if (timestamp.toString().length === 13) {
          return new Date(timestamp);
        }
      }
      
      // Spróbuj standardowe parsowanie daty
      const date = new Date(dateInput);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // Jeśli to number, sprawdź czy to timestamp
    if (typeof dateInput === 'number') {
      const timestamp = dateInput;
      // Jeśli timestamp jest w sekundach (10 cyfr), konwertuj na milisekundy
      if (timestamp.toString().length === 10) {
        return new Date(timestamp * 1000);
      }
      // Jeśli timestamp jest w milisekundach (13 cyfr)
      if (timestamp.toString().length === 13) {
        return new Date(timestamp);
      }
      
      // Spróbuj jako milisekundy
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    return null;
  } catch (error) {
    console.warn('Błąd parsowania daty:', dateInput, error);
    return null;
  }
};

// Bezpieczna funkcja do formatowania daty z fallbackiem
export const safeFormatDate = (dateInput: string | number | null | undefined): string => {
  const date = safeDateParse(dateInput);
  if (!date) {
    return 'Nieznana data';
  }
  
  try {
    return formatDate(date.toISOString());
  } catch (error) {
    console.warn('Błąd formatowania daty:', dateInput, error);
    return 'Nieznana data';
  }
};

// Bezpieczna funkcja do formatowania czasu z fallbackiem
export const safeFormatTime = (dateInput: string | number | null | undefined): string => {
  const date = safeDateParse(dateInput);
  if (!date) {
    return 'Nieznana godzina';
  }
  
  try {
    return formatTime(date.toISOString());
  } catch (error) {
    console.warn('Błąd formatowania godziny:', dateInput, error);
    return 'Nieznana godzina';
  }
};

export const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Nieznana data';
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'przed chwilą';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} min temu`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} godz. temu`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} dni temu`;
  }
  
  return formatDate(dateString);
};