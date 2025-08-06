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
  
  // Remove any color styles that might cause white text
  cleanedHtml = cleanedHtml.replace(/color:\s*(?:white|#fff|#ffffff|rgb\(255,\s*255,\s*255\)|rgba\(255,\s*255,\s*255,\s*[^)]*\))/gi, 'color: #000000');
  cleanedHtml = cleanedHtml.replace(/color\s*=\s*["'](?:white|#fff|#ffffff)["']/gi, 'color="#000000"');
  
  // Ensure bold tags are properly formatted
  cleanedHtml = cleanedHtml.replace(/<strong([^>]*)>/gi, '<strong$1>');
  cleanedHtml = cleanedHtml.replace(/<\/strong>/gi, '</strong>');
  cleanedHtml = cleanedHtml.replace(/<b([^>]*)>/gi, '<b$1>');
  cleanedHtml = cleanedHtml.replace(/<\/b>/gi, '</b>');
  
  // Convert other bold-like tags to strong
  cleanedHtml = cleanedHtml.replace(/<span[^>]*style[^>]*font-weight:\s*bold[^>]*>/gi, '<strong>');
  cleanedHtml = cleanedHtml.replace(/<span[^>]*style[^>]*font-weight:\s*700[^>]*>/gi, '<strong>');
  cleanedHtml = cleanedHtml.replace(/<span[^>]*style[^>]*font-weight:\s*600[^>]*>/gi, '<strong>');
  cleanedHtml = cleanedHtml.replace(/<span[^>]*style[^>]*font-weight:\s*800[^>]*>/gi, '<strong>');
  cleanedHtml = cleanedHtml.replace(/<span[^>]*style[^>]*font-weight:\s*900[^>]*>/gi, '<strong>');
  cleanedHtml = cleanedHtml.replace(/<\/span>/gi, '</strong>');
  
  // Handle cases where font-weight is in a different format (without spaces)
  cleanedHtml = cleanedHtml.replace(/<span[^>]*style[^>]*font-weight:bold[^>]*>/gi, '<strong>');
  cleanedHtml = cleanedHtml.replace(/<span[^>]*style[^>]*font-weight:700[^>]*>/gi, '<strong>');
  cleanedHtml = cleanedHtml.replace(/<span[^>]*style[^>]*font-weight:600[^>]*>/gi, '<strong>');
  cleanedHtml = cleanedHtml.replace(/<span[^>]*style[^>]*font-weight:800[^>]*>/gi, '<strong>');
  cleanedHtml = cleanedHtml.replace(/<span[^>]*style[^>]*font-weight:900[^>]*>/gi, '<strong>');
  
  // Handle cases with quotes around font-weight values
  cleanedHtml = cleanedHtml.replace(/<span[^>]*style[^>]*font-weight:\s*["']bold["'][^>]*>/gi, '<strong>');
  cleanedHtml = cleanedHtml.replace(/<span[^>]*style[^>]*font-weight:\s*["']700["'][^>]*>/gi, '<strong>');
  
  // Handle cases where there might be other styles mixed in
  cleanedHtml = cleanedHtml.replace(/<span[^>]*style[^>]*[^>]*font-weight:\s*bold[^>]*>/gi, '<strong>');
  cleanedHtml = cleanedHtml.replace(/<span[^>]*style[^>]*[^>]*font-weight:\s*700[^>]*>/gi, '<strong>');
  

  

  
  // Also convert <em> tags that might be used for emphasis to <strong>
  cleanedHtml = cleanedHtml.replace(/<em[^>]*>/gi, '<strong>');
  cleanedHtml = cleanedHtml.replace(/<\/em>/gi, '</strong>');
  
  // Debug: sprawdź czy są tagi pogrubienia po konwersji
  const strongCount = (cleanedHtml.match(/<strong>/gi) || []).length;
  const bCount = (cleanedHtml.match(/<b>/gi) || []).length;
  console.log('[HTML_PARSER_DEBUG] Strong tags count:', strongCount);
  console.log('[HTML_PARSER_DEBUG] B tags count:', bCount);
  
  // Handle any remaining span tags that might have bold styling
  cleanedHtml = cleanedHtml.replace(/<span[^>]*style[^>]*[^>]*font-weight[^>]*>/gi, (match) => {
    if (match.includes('bold') || match.includes('700') || match.includes('600') || match.includes('800') || match.includes('900')) {
      return '<strong>';
    }
    return match;
  });
  

  
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
  


  
  // Enhanced styles for better rendering across platforms
  const textColor = isDarkMode ? '#F1F5F9' : '#1E293B';
  const backgroundColor = isDarkMode ? '#1E293B' : '#F8FAFC';
  const borderColor = isDarkMode ? '#334155' : '#E2E8F0';
  
  const webStyles = `
    <style>
      
      * {
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Poppins_Regular', sans-serif;
        line-height: ${Platform.OS === 'android' ? '1.7' : '1.6'};
        padding: 0;
        margin: 0;
        font-size: ${Platform.OS === 'android' ? '15px' : '14px'}; // Zmniejszone dla lepszej czytelności
        word-wrap: break-word;
        overflow-wrap: break-word;
        -webkit-text-size-adjust: 100%;
        text-size-adjust: 100%;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-align: justify;
        color: ${textColor};
        background-color: ${backgroundColor};
        letter-spacing: ${Platform.OS === 'android' ? '0.01em' : 'normal'}; // Better letter spacing on Android
      }
      
      p {
        font-family: 'Poppins_Regular', sans-serif;
        font-weight: 400;
        line-height: ${Platform.OS === 'android' ? '1.8' : '1.7'}; // Increased line height on Android
        margin-bottom: ${Platform.OS === 'android' ? '1.2rem' : '1rem'}; // More spacing on Android
        text-align: justify;
        color: ${textColor};
        font-size: ${Platform.OS === 'android' ? '15px' : '14px'}; // Zmniejszone dla lepszej czytelności
      }
      
      h1, h2, h3, h4, h5, h6 {
        font-family: 'Poppins_Bold', sans-serif;
        font-weight: 700;
        line-height: ${Platform.OS === 'android' ? '1.4' : '1.3'}; // Increased line height on Android
        margin-bottom: ${Platform.OS === 'android' ? '0.9rem' : '0.75rem'}; // More spacing on Android
        color: ${textColor};
        letter-spacing: ${Platform.OS === 'android' ? '-0.01em' : 'normal'}; // Better letter spacing on Android
      }
      
      h1 {
        font-size: ${Platform.OS === 'android' ? '2.2rem' : '2rem'}; // Larger on Android
        margin-top: ${Platform.OS === 'android' ? '2.2rem' : '2rem'}; // More spacing on Android
        margin-bottom: ${Platform.OS === 'android' ? '1.2rem' : '1rem'}; // More spacing on Android
      }
      
      h2 {
        font-family: 'Poppins_SemiBold', sans-serif;
        font-weight: 600;
        font-size: ${Platform.OS === 'android' ? '1.5rem' : '1.375rem'}; // Larger on Android
        margin-top: ${Platform.OS === 'android' ? '1.4rem' : '1.25rem'}; // More spacing on Android
        margin-bottom: ${Platform.OS === 'android' ? '1.1rem' : '1rem'}; // More spacing on Android
      }
      
      h3 {
        font-family: 'Poppins_SemiBold', sans-serif;
        font-weight: 600;
        font-size: ${Platform.OS === 'android' ? '1.3rem' : '1.1875rem'}; // Larger on Android
        margin-top: ${Platform.OS === 'android' ? '1.1rem' : '1rem'}; // More spacing on Android
        margin-bottom: ${Platform.OS === 'android' ? '0.85rem' : '0.75rem'}; // More spacing on Android
      }
      
      strong, b {
        font-family: 'Poppins_Bold', sans-serif !important;
        font-weight: 700 !important;
        color: ${textColor} !important;
        -webkit-font-smoothing: antialiased !important;
        text-shadow: 0.5px 0 0 currentColor !important;
        font-size: ${Platform.OS === 'android' ? '15px' : '14px'} !important;
        line-height: ${Platform.OS === 'android' ? '1.8' : '1.7'} !important;
      }
      
      /* Force bold on any element with font-weight: bold */
      [style*="font-weight: bold"], [style*="font-weight:bold"] {
        font-weight: 700 !important;
        font-family: 'Poppins_Bold', sans-serif !important;
        color: ${textColor} !important;
      }
      
      /* Additional bold selectors for different formats */
      [style*="font-weight: 700"], [style*="font-weight:700"] {
        font-weight: 700 !important;
        font-family: 'Poppins_Bold', sans-serif !important;
        color: ${textColor} !important;
      }
      
      [style*="font-weight: 600"], [style*="font-weight:600"] {
        font-weight: 600 !important;
        font-family: 'Poppins_SemiBold', sans-serif !important;
        color: ${textColor} !important;
      }
      
      [style*="font-weight: 800"], [style*="font-weight:800"] {
        font-weight: 800 !important;
        font-family: 'Poppins_ExtraBold', sans-serif !important;
        color: ${textColor} !important;
      }
      
      [style*="font-weight: 900"], [style*="font-weight:900"] {
        font-weight: 900 !important;
        font-family: 'Poppins_Black', sans-serif !important;
        color: ${textColor} !important;
      }
      
      /* Support for span tags with font-weight */
      span[style*="font-weight"] {
        color: ${textColor} !important;
      }
      

      
      /* Force bold on any element with bold-related classes */
      .bold, .strong, .b, .emphasized, .highlight {
        font-weight: 700 !important;
        font-family: 'Poppins_Bold', sans-serif !important;
        color: ${textColor} !important;
      }
      
      /* Additional support for different bold formats */
      [class*="bold"], [class*="strong"], [class*="emphasized"] {
        font-weight: 700 !important;
        font-family: 'Poppins_Bold', sans-serif !important;
        color: ${textColor} !important;
      }
      
      em, i {
        font-family: 'Poppins_Regular', sans-serif;
        font-style: italic;
        font-weight: 400;
        color: ${textColor};
      }
      
      blockquote {
        font-family: 'Poppins_Regular', sans-serif;
        font-style: italic;
        font-weight: 400;
        border-left: 4px solid #224A96;
        padding-left: ${Platform.OS === 'android' ? '1.2rem' : '1rem'}; // More padding on Android
        margin: ${Platform.OS === 'android' ? '1.2rem 0' : '1rem 0'}; // More spacing on Android
        background-color: rgba(34, 74, 150, 0.05);
        padding: ${Platform.OS === 'android' ? '1.2rem' : '1rem'}; // More padding on Android
        border-radius: 8px;
        color: ${textColor};
        font-size: ${Platform.OS === 'android' ? '15px' : '14px'}; // Zmniejszone dla lepszej czytelności
      }
      
      ul, ol {
        font-family: 'Poppins_Regular', sans-serif;
        padding-left: ${Platform.OS === 'android' ? '1.8rem' : '1.5rem'}; // More padding on Android
        margin-bottom: ${Platform.OS === 'android' ? '1.2rem' : '1rem'}; // More spacing on Android
        color: ${textColor};
        font-size: ${Platform.OS === 'android' ? '15px' : '14px'}; // Zmniejszone dla lepszej czytelności
      }
      
      li {
        font-family: 'Poppins_Regular', sans-serif;
        line-height: ${Platform.OS === 'android' ? '1.7' : '1.6'}; // Increased line height on Android
        margin-bottom: ${Platform.OS === 'android' ? '0.6rem' : '0.5rem'}; // More spacing on Android
        color: ${textColor};
        font-size: ${Platform.OS === 'android' ? '15px' : '14px'}; // Zmniejszone dla lepszej czytelności
      }
      
      a {
        color: #224A96;
        text-decoration: underline;
        font-weight: 500;
        font-size: ${Platform.OS === 'android' ? '15px' : '14px'}; // Zmniejszone dla lepszej czytelności
      }
      
      code {
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        background-color: rgba(0, 0, 0, 0.05);
        padding: ${Platform.OS === 'android' ? '0.3rem 0.6rem' : '0.25rem 0.5rem'}; // More padding on Android
        border-radius: 4px;
        font-size: ${Platform.OS === 'android' ? '0.95em' : '0.9em'}; // Larger font on Android
      }
      
      pre {
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        background-color: rgba(0, 0, 0, 0.05);
        padding: ${Platform.OS === 'android' ? '1.2rem' : '1rem'}; // More padding on Android
        border-radius: 8px;
        overflow-x: auto;
        margin: ${Platform.OS === 'android' ? '1.2rem 0' : '1rem 0'}; // More spacing on Android
        font-size: ${Platform.OS === 'android' ? '15px' : '14px'}; // Larger font on Android
      }
      
      table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        margin: ${Platform.OS === 'android' ? '2.4em 0' : '2em 0'}; // More spacing on Android
        font-size: ${Platform.OS === 'android' ? '15px' : '0.95em'}; // Larger font on Android
        font-family: 'Poppins_Regular', sans-serif;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        border-radius: 12px;
        overflow: hidden;
        border: 2px solid ${borderColor};
        background-color: ${backgroundColor};
      }

      th, td {
        padding: ${Platform.OS === 'android' ? '18px 20px' : '16px 18px'}; // More padding on Android
        text-align: left;
        color: ${textColor};
        font-family: 'Poppins_Regular', sans-serif;
        border-right: 1px solid ${borderColor};
        vertical-align: top;
        font-size: ${Platform.OS === 'android' ? '15px' : '14px'}; // Larger font on Android
      }

      th:last-child, td:last-child {
        border-right: none;
      }

      thead th {
        background-color: #224A96;
        color: #ffffff;
        font-family: 'Poppins_Bold', sans-serif;
        font-weight: 700;
        font-size: ${Platform.OS === 'android' ? '16px' : '0.95em'}; // Larger font on Android
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 2px solid #1a3d7a;
      }

      tbody td {
        border-bottom: 1px solid ${borderColor};
        font-size: ${Platform.OS === 'android' ? '15px' : '0.9em'}; // Larger font on Android
        line-height: ${Platform.OS === 'android' ? '1.6' : '1.5'}; // Increased line height on Android
      }

      tbody tr:nth-of-type(even) {
        background-color: ${isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(34, 74, 150, 0.02)'};
      }

      tbody tr:hover {
        background-color: ${isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(34, 74, 150, 0.05)'};
      }

      tbody tr:last-of-type td {
        border-bottom: none;
      }
      
      /* Remove any video/iframe elements to prevent conflicts */
      iframe, video, embed, object {
        display: none !important;
      }
      
      /* iOS specific optimizations */
      @supports (-webkit-touch-callout: none) {
        body {
          -webkit-text-size-adjust: 100%;
          -webkit-font-smoothing: antialiased;
        }
        
        * {
          -webkit-font-smoothing: antialiased;
        }
      }
      
      /* Android-specific optimizations */
      ${Platform.OS === 'android' ? `
        * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        body {
          font-weight: 400;
          letter-spacing: 0.01em;
          line-height: 1.7;
        }
        
        h1, h2, h3, h4, h5, h6 {
          font-weight: 600;
          letter-spacing: -0.01em;
          line-height: 1.4;
        }
        
        p {
          line-height: 1.8;
          margin-bottom: 1.2rem;
        }
        
        li {
          line-height: 1.7;
          margin-bottom: 0.6rem;
        }
      ` : ''}
    </style>
  `;
  
  // For mobile, we'll inject the styles in the head
  cleanedHtml = cleanedHtml.replace(
    /<head>(.*?)<\/head>/s,
    `<head>$1${webStyles}</head>`
  );
  
  // If there's no head tag, add one
  if (!cleanedHtml.includes('<head>')) {
    cleanedHtml = `<head>${webStyles}</head>${cleanedHtml}`;
  }
  
  return cleanedHtml;
};

// Process gallery IDs to ensure they are strings
export const processGalleryIds = (galeria: string[] | undefined): string[] => {
  if (!galeria || !Array.isArray(galeria)) {
    return [];
  }
  
  return galeria
    .map(id => String(id).trim())
    .filter(id => id && id !== '0' && !isNaN(Number(id)));
};