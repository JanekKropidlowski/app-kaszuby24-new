import { Platform } from 'react-native';

// Extract YouTube video ID from various YouTube URL formats
export const extractYouTubeId = (url: string): string | null => {
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
      videoUrls.push(match[1]);
    }
  }
  
  // Look for direct links to YouTube or Vimeo
  const linkRegex = /<a[^>]*href=["']([^"']*(?:youtube|vimeo)[^"']*)["'][^>]*>/gi;
  
  while ((match = linkRegex.exec(html)) !== null) {
    if (match[1]) {
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
  
  return videoUrls;
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

// Clean HTML content for rendering
export const cleanHtml = (html: string): string => {
  if (!html) return '';
  
  // Replace relative image URLs with absolute URLs
  let cleanedHtml = html.replace(
    /src=["']\/(.*?)["']/g, 
    'src="https://kaszuby24.pl/$1"'
  );
  
  // Enhanced styles for better rendering across platforms
  const webStyles = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
      
      * {
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        line-height: 1.6;
        padding: 0;
        margin: 0;
        font-size: ${Platform.OS === 'android' ? '15px' : '14px'};
        word-wrap: break-word;
        overflow-wrap: break-word;
        -webkit-text-size-adjust: 100%;
        text-size-adjust: 100%;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      
      p {
        margin-bottom: 14px;
        font-family: 'Poppins', sans-serif;
        line-height: 1.6;
        font-weight: 400;
      }
      
      img {
        max-width: 100% !important;
        height: auto !important;
        border-radius: 8px;
        margin: 16px 0;
        display: block;
      }
      
      a {
        text-decoration: none;
        word-break: break-word;
        font-weight: 500;
      }
      
      a:hover {
        text-decoration: underline;
      }
      
      h1, h2, h3, h4, h5, h6 {
        margin-top: 24px;
        margin-bottom: 14px;
        line-height: 1.3;
        font-weight: 600;
        font-family: 'Poppins', sans-serif;
        letter-spacing: -0.02em;
      }
      
      blockquote {
        position: relative;
        margin: 20px 0;
        padding: 18px 22px 18px 55px;
        border-radius: 16px;
        border-left: 4px solid;
        font-style: italic;
        font-size: ${Platform.OS === 'android' ? '16px' : '15px'};
        line-height: 1.5;
        font-family: 'Poppins', sans-serif;
        font-weight: 400;
      }
      
      blockquote::before {
        content: '"';
        position: absolute;
        left: 18px;
        top: 10px;
        font-size: 42px;
        font-weight: bold;
        opacity: 0.3;
        line-height: 1;
        font-family: 'Poppins', sans-serif;
      }
      
      blockquote p {
        margin: 0;
        position: relative;
        z-index: 1;
        font-family: 'Poppins', sans-serif;
      }
      
      ul, ol {
        padding-left: 22px;
        margin: 14px 0;
      }
      
      li {
        margin-bottom: 6px;
        font-family: 'Poppins', sans-serif;
        line-height: 1.5;
        font-weight: 400;
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 14px 0;
        font-size: ${Platform.OS === 'android' ? '14px' : '13px'};
      }
      
      th, td {
        border: 1px solid;
        padding: 10px 8px;
        text-align: left;
        font-family: 'Poppins', sans-serif;
      }
      
      th {
        font-weight: 600;
        font-family: 'Poppins', sans-serif;
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
        }
        
        h1, h2, h3, h4, h5, h6 {
          font-weight: 600;
          letter-spacing: -0.01em;
        }
      ` : ''}
    </style>
  `;
  
  // Add the styles to the HTML
  if (Platform.OS === 'web') {
    cleanedHtml = webStyles + cleanedHtml;
  } else {
    // For mobile, we'll inject the styles in the head
    cleanedHtml = cleanedHtml.replace(
      /<head>(.*?)<\/head>/s,
      `<head>$1${webStyles}</head>`
    );
    
    // If there's no head tag, add one
    if (!cleanedHtml.includes('<head>')) {
      cleanedHtml = `<head>${webStyles}</head>${cleanedHtml}`;
    }
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