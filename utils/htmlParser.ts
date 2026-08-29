import { Platform } from 'react-native';

// Extract YouTube video ID from various YouTube URL formats
export const getYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  
  // Regular expression to match YouTube URLs and extract video ID
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  
  return (match && match[7].length === 11) ? match[7] : null;
};

// Extract Vimeo video ID from Vimeo URL
export const extractVimeoId = (url: string): string | null => {
  if (!url) return null;
  
  // Regular expression to match Vimeo URLs and extract video ID
  const regExp = /vimeo\.com\/(?:video\/)?([0-9]+)/;
  const match = url.match(regExp);
  
  return match ? match[1] : null;
};

// Extract video URLs from HTML content - enhanced to find more video links
export const extractVideoUrls = (html: string): string[] => {
  if (!html) return [];
  
  const videoUrls: string[] = [];
  
  // Match iframe src attributes that contain YouTube or Vimeo
  const iframeRegex = /<iframe[^>]*src=["']([^"']*(?:youtube|vimeo)[^"']*)["'][^>]*>/gi;
  let match;
  
  while ((match = iframeRegex.exec(html)) !== null) {
    if (match[1]) {
      // Convert embed URLs to watch URLs for consistency
      const url = match[1].replace('youtube.com/embed/', 'youtube.com/watch?v=');
      videoUrls.push(url);
    }
  }
  
  // Look for direct links to YouTube or Vimeo
  const linkRegex = /<a[^>]*href=["']([^"']*(?:youtube|vimeo)[^"']*)["'][^>]*>/gi;
  
  while ((match = linkRegex.exec(html)) !== null) {
    if (match[1] && !videoUrls.includes(match[1])) {
      videoUrls.push(match[1]);
    }
  }
  
  // Also look for YouTube links in text content
  const youtubeUrlRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11})/g;
  const textContent = html.replace(/<[^>]+>/g, ' ');
  let urlMatch;
  
  while ((urlMatch = youtubeUrlRegex.exec(textContent)) !== null) {
    if (urlMatch[1] && !videoUrls.includes(urlMatch[1])) {
      videoUrls.push(urlMatch[1]);
    }
  }
  
  // Remove duplicates and ensure all URLs are properly formatted
  return [...new Set(videoUrls)].map(url => {
    // Convert youtu.be links to youtube.com/watch?v= format
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1].split('?')[0].split('&')[0];
      return `https://www.youtube.com/watch?v=${videoId}`;
    }
    return url;
  });
};

// Extract YouTube URL from meta field - improved to handle more formats
export const extractYouTubeUrl = (youtubeField: string): string | null => {
  if (!youtubeField) return null;
  
  // If it's already a full URL, return it
  if (youtubeField.includes('youtube.com') || youtubeField.includes('youtu.be')) {
    return youtubeField;
  }
  
  // If it's just a video ID, construct the URL
  if (youtubeField.length === 11 && /^[a-zA-Z0-9_-]+$/.test(youtubeField)) {
    return `https://www.youtube.com/watch?v=${youtubeField}`;
  }
  
  // Try to extract a video ID if it's embedded in HTML
  const iframeMatch = youtubeField.match(/<iframe[^>]*src=["']([^"']*(?:youtube)[^"']*)["'][^>]*>/i);
  if (iframeMatch && iframeMatch[1]) {
    return iframeMatch[1];
  }
  
  // Try to extract a video ID if it's a partial URL
  const partialUrlMatch = youtubeField.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (partialUrlMatch && partialUrlMatch[1]) {
    return `https://www.youtube.com/watch?v=${partialUrlMatch[1]}`;
  }
  
  return null;
};

// Clean HTML content for rendering - with theme support
export const cleanHtml = (html: string, isDarkMode: boolean = false): string => {
  if (!html) return '';
  
  // Debug: sprawdź oryginalny HTML
  const originalStrongCount = (html.match(/<strong>/gi) || []).length;
  const originalBCount = (html.match(/<b>/gi) || []).length;
  const originalSpanBoldCount = (html.match(/<span[^>]*style[^>]*font-weight[^>]*>/gi) || []).length;
  console.log('[HTML_PARSER_DEBUG] Original HTML - Strong tags:', originalStrongCount);
  console.log('[HTML_PARSER_DEBUG] Original HTML - B tags:', originalBCount);
  console.log('[HTML_PARSER_DEBUG] Original HTML - Span with font-weight:', originalSpanBoldCount);
  
  // Debug: log a sample of the original HTML for inspection
  if (originalSpanBoldCount > 0) {
    const spanMatches = html.match(/<span[^>]*style[^>]*font-weight[^>]*>.*?<\/span>/gi);
    if (spanMatches) {
      console.log('[HTML_PARSER_DEBUG] Sample span with font-weight:', spanMatches[0]);
    }
  }
  
  // Decode HTML entities first
  let cleanedHtml = html
    .replace(/\\u003C/g, '<')
    .replace(/\\u003E/g, '>')
    .replace(/\\u0026/g, '&')
    .replace(/\\u0022/g, '"')
    .replace(/\\u0027/g, "'")
    .replace(/\\u003D/g, '=')
    .replace(/\\u0020/g, ' ')
    .replace(/\\u0021/g, '!')
    .replace(/\\u0023/g, '#')
    .replace(/\\u0024/g, '$')
    .replace(/\\u0025/g, '%')
    .replace(/\\u0028/g, '(')
    .replace(/\\u0029/g, ')')
    .replace(/\\u002A/g, '*')
    .replace(/\\u002B/g, '+')
    .replace(/\\u002C/g, ',')
    .replace(/\\u002D/g, '-')
    .replace(/\\u002E/g, '.')
    .replace(/\\u002F/g, '/')
    .replace(/\\u0030/g, '0')
    .replace(/\\u0031/g, '1')
    .replace(/\\u0032/g, '2')
    .replace(/\\u0033/g, '3')
    .replace(/\\u0034/g, '4')
    .replace(/\\u0035/g, '5')
    .replace(/\\u0036/g, '6')
    .replace(/\\u0037/g, '7')
    .replace(/\\u0038/g, '8')
    .replace(/\\u0039/g, '9')
    .replace(/\\u003A/g, ':')
    .replace(/\\u003B/g, ';')
    .replace(/\\u003C/g, '<')
    .replace(/\\u003D/g, '=')
    .replace(/\\u003E/g, '>')
    .replace(/\\u003F/g, '?')
    .replace(/\\u0040/g, '@')
    .replace(/\\u0041/g, 'A')
    .replace(/\\u0042/g, 'B')
    .replace(/\\u0043/g, 'C')
    .replace(/\\u0044/g, 'D')
    .replace(/\\u0045/g, 'E')
    .replace(/\\u0046/g, 'F')
    .replace(/\\u0047/g, 'G')
    .replace(/\\u0048/g, 'H')
    .replace(/\\u0049/g, 'I')
    .replace(/\\u004A/g, 'J')
    .replace(/\\u004B/g, 'K')
    .replace(/\\u004C/g, 'L')
    .replace(/\\u004D/g, 'M')
    .replace(/\\u004E/g, 'N')
    .replace(/\\u004F/g, 'O')
    .replace(/\\u0050/g, 'P')
    .replace(/\\u0051/g, 'Q')
    .replace(/\\u0052/g, 'R')
    .replace(/\\u0053/g, 'S')
    .replace(/\\u0054/g, 'T')
    .replace(/\\u0055/g, 'U')
    .replace(/\\u0056/g, 'V')
    .replace(/\\u0057/g, 'W')
    .replace(/\\u0058/g, 'X')
    .replace(/\\u0059/g, 'Y')
    .replace(/\\u005A/g, 'Z')
    .replace(/\\u005B/g, '[')
    .replace(/\\u005C/g, '\\')
    .replace(/\\u005D/g, ']')
    .replace(/\\u005E/g, '^')
    .replace(/\\u005F/g, '_')
    .replace(/\\u0060/g, '`')
    .replace(/\\u0061/g, 'a')
    .replace(/\\u0062/g, 'b')
    .replace(/\\u0063/g, 'c')
    .replace(/\\u0064/g, 'd')
    .replace(/\\u0065/g, 'e')
    .replace(/\\u0066/g, 'f')
    .replace(/\\u0067/g, 'g')
    .replace(/\\u0068/g, 'h')
    .replace(/\\u0069/g, 'i')
    .replace(/\\u006A/g, 'j')
    .replace(/\\u006B/g, 'k')
    .replace(/\\u006C/g, 'l')
    .replace(/\\u006D/g, 'm')
    .replace(/\\u006E/g, 'n')
    .replace(/\\u006F/g, 'o')
    .replace(/\\u0070/g, 'p')
    .replace(/\\u0071/g, 'q')
    .replace(/\\u0072/g, 'r')
    .replace(/\\u0073/g, 's')
    .replace(/\\u0074/g, 't')
    .replace(/\\u0075/g, 'u')
    .replace(/\\u0076/g, 'v')
    .replace(/\\u0077/g, 'w')
    .replace(/\\u0078/g, 'x')
    .replace(/\\u0079/g, 'y')
    .replace(/\\u007A/g, 'z')
    .replace(/\\u007B/g, '{')
    .replace(/\\u007C/g, '|')
    .replace(/\\u007D/g, '}')
    .replace(/\\u007E/g, '~')
    // Decode other common HTML entities
    .replace(/&#8211;/g, '–')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8230;/g, '…')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');
  

  
  // Replace relative image URLs with absolute URLs
  cleanedHtml = cleanedHtml.replace(
    /src=["']\/(.*?)["']/g, 
    'src="https://kaszuby24.pl/$1"'
  );
  
  // Remove any YouTube iframes to prevent conflicts with our custom player
  cleanedHtml = cleanedHtml.replace(
    /<iframe[^>]*(?:youtube|youtu\.be)[^>]*>.*?<\/iframe>/gi,
    ''
  );
  
  // Normalize inline colors and backgrounds for theme contrast
  if (isDarkMode) {
    // In dark mode: force very light text instead of white-specific or white backgrounds
    cleanedHtml = cleanedHtml.replace(
      /color:\s*(?:white|#fff|#ffffff|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)|rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*[^)]*\))/gi,
      'color: #F1F5F9'
    );
    cleanedHtml = cleanedHtml.replace(
      /color\s*=\s*["'](?:white|#fff|#ffffff)["']/gi,
      'color="#F1F5F9"'
    );
    // Remove white backgrounds that create white-on-white blocks in dark mode
    cleanedHtml = cleanedHtml.replace(
      /background-color:\s*(?:white|#fff|#ffffff|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)|rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*[^)]*\))/gi,
      'background-color: transparent'
    );
    cleanedHtml = cleanedHtml.replace(
      /bgcolor\s*=\s*["'](?:white|#fff|#ffffff)["']/gi,
      'bgcolor="transparent"'
    );
    // Also neutralize shorthand background declarations that set white
    cleanedHtml = cleanedHtml.replace(
      /background:\s*(?:white|#fff|#ffffff|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)|rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*[^)]*\))/gi,
      'background: transparent'
    );
  } else {
    // In light mode: force dark text when explicit white is encountered
    cleanedHtml = cleanedHtml.replace(
      /color:\s*(?:white|#fff|#ffffff|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)|rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*[^)]*\))/gi,
      'color: #000000'
    );
    cleanedHtml = cleanedHtml.replace(
      /color\s*=\s*["'](?:white|#fff|#ffffff)["']/gi,
      'color="#000000"'
    );
  }
  
  // Ensure bold tags are properly formatted
  cleanedHtml = cleanedHtml.replace(/<strong([^>]*)>/gi, '<strong$1>');
  cleanedHtml = cleanedHtml.replace(/<\/strong>/gi, '</strong>');
  cleanedHtml = cleanedHtml.replace(/<b([^>]*)>/gi, '<b$1>');
  cleanedHtml = cleanedHtml.replace(/<\/b>/gi, '</b>');
  
  // Convert only spans with bold-like font-weight to <strong> preserving inner content
  cleanedHtml = cleanedHtml.replace(
    /<span([^>]*)style=["'][^"']*font-weight\s*:\s*(?:bold|[6-9]00)[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi,
    '<strong>$2</strong>'
  );
  // Normalize nested strong tags
  cleanedHtml = cleanedHtml.replace(/<strong>\s*<strong>/gi, '<strong>');
  cleanedHtml = cleanedHtml.replace(/<\/strong>\s*<\/strong>/gi, '</strong>');
  

  

  
  // Keep <em> tags as italics (do not force to <strong>) to preserve formatting
  
  // Debug: sprawdź czy są tagi pogrubienia po konwersji
  const strongCount = (cleanedHtml.match(/<strong>/gi) || []).length;
  const bCount = (cleanedHtml.match(/<b>/gi) || []).length;
  console.log('[HTML_PARSER_DEBUG] Strong tags count:', strongCount);
  console.log('[HTML_PARSER_DEBUG] B tags count:', bCount);
  
  // Debug: log final HTML sample if strong tags are present
  if (strongCount > 0) {
    const strongMatches = cleanedHtml.match(/<strong>.*?<\/strong>/gi);
    if (strongMatches) {
      console.log('[HTML_PARSER_DEBUG] Sample strong tag:', strongMatches[0]);
    }
  }
  
  // Handle any remaining spans with bold style in a single-pass robust way
  cleanedHtml = cleanedHtml.replace(
    /<span([^>]*)style=(["'])([\s\S]*?)\2([^>]*)>([\s\S]*?)<\/span>/gi,
    (full, before, quote, style, after, inner) => {
      const s = style.toLowerCase();
      if (/(font-weight\s*:\s*(bold|[6-9]00))/.test(s)) {
        return `<strong>${inner}</strong>`;
      }
      return full;
    }
  );
  
  // Additional conversion for spans with font-weight that might have been missed
  cleanedHtml = cleanedHtml.replace(
    /<span[^>]*style=["'][^"']*font-weight\s*:\s*(bold|[6-9]00)[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi,
    '<strong>$2</strong>'
  );
  

  
  // Auto-detect and make bold important information like dates, times, locations
  // This is a fallback since WordPress doesn't seem to send bold tags
  cleanedHtml = cleanedHtml.replace(
    /(\d{1,2}\s+(?:stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|września|października|listopada|grudnia)\s+\d{4})/g,
    '<strong>$1</strong>'
  );
  
  // Make times bold (like "o godzinie 15:38")
  cleanedHtml = cleanedHtml.replace(
    /(o\s+godzinie\s+\d{1,2}:\d{2})/g,
    '<strong>$1</strong>'
  );
  
  // Make locations bold (like "w miejscowości", "na skrzyżowaniu")
  cleanedHtml = cleanedHtml.replace(
    /(w\s+miejscowości|na\s+skrzyżowaniu|w\s+okolicy)/g,
    '<strong>$1</strong>'
  );
  
  // Make service names bold (like "JRG Puck", "OSP Żarnowiec")
  cleanedHtml = cleanedHtml.replace(
    /(JRG\s+[A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ]+|OSP\s+[A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ]+)/g,
    '<strong>$1</strong>'
  );
  
  // Make numbers bold (like road numbers "nr 213")
  cleanedHtml = cleanedHtml.replace(
    /(nr\s+\d+)/g,
    '<strong>$1</strong>'
  );
  
  // If no explicit strong/b tags are present, convert markdown-style **bold** and __bold__ to <strong>
  if (!/(<strong>|<b>)/i.test(cleanedHtml)) {
    cleanedHtml = cleanedHtml
      .replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__([\s\S]*?)__/g, '<strong>$1</strong>');
  }



  
  // Do not inject <head> or additional CSS here. The hosting renderer (WebView/RenderHtml)
  // is responsible for providing styles. Returning a clean HTML fragment preserves
  // original tags like <strong>, <b>, <em>, enabling correct formatting.
  return cleanedHtml;
};

// Process gallery IDs to ensure they are strings (numeric WP media IDs only)
export const processGalleryIds = (galeria: string[] | undefined): string[] => {
  if (!galeria || !Array.isArray(galeria)) {
    return [];
  }

  return galeria
    .map(id => String(id).trim())
    .filter(id => id && id !== '0' && !isNaN(Number(id)));
};

const SUPABASE_STORAGE_BASE = 'https://panel.kaszuby24.pl/storage/v1/object/public/media/';

// Parse galeria field — 3 formats:
//   1. numeric WP media IDs → returned as string IDs for fetchMediaByIds
//   2. JSON string "[123,456]" → same
//   3. Supabase Storage paths "articles/x.webp" → returned as direct URLs
export const parseGaleriaField = (
  galeria: string[] | string | undefined
): { ids: string[]; urls: string[] } => {
  const ids: string[] = [];
  const urls: string[] = [];

  if (!galeria) return { ids, urls };

  let entries: string[] = [];
  if (Array.isArray(galeria)) {
    entries = galeria.map(s => String(s).trim()).filter(Boolean);
  } else if (typeof galeria === 'string') {
    const trimmed = galeria.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) entries = parsed.map(s => String(s).trim()).filter(Boolean);
      } catch { /* invalid JSON */ }
    } else {
      entries = trimmed.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  for (const entry of entries) {
    if (!entry || entry === '0') continue;
    if (!isNaN(Number(entry))) {
      ids.push(entry);
    } else {
      // Supabase Storage path — build direct URL
      urls.push(`${SUPABASE_STORAGE_BASE}${entry}`);
    }
  }

  return { ids, urls };
};