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

// Clean HTML content for rendering
export const cleanHtml = (html: string): string => {
  if (!html) return '';
  
  // Replace relative image URLs with absolute URLs
  let cleanedHtml = html.replace(
    /src=["']\/(.*?)["']/g, 
    'src="https://kaszuby24.pl/$1"'
  );
  
  // Remove any YouTube iframes to prevent conflicts with our custom player
  cleanedHtml = cleanedHtml.replace(
    /<iframe[^>]*(?:youtube|youtu\.be)[^>]*>.*?<\/iframe>/gi,
    ''
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
        text-align: justify;
      }
      
      p {
        font-family: 'Poppins', sans-serif;
        font-weight: 400;
        line-height: 1.7;
        margin-bottom: 1rem;
        text-align: justify;
      }
      
      h1, h2, h3, h4, h5, h6 {
        font-family: 'Poppins', sans-serif;
        font-weight: 600;
        line-height: 1.3;
        margin-bottom: 0.75rem;
        color: inherit;
      }
      
      strong, b {
        font-family: 'Poppins', sans-serif;
        font-weight: 600;
      }
      
      em, i {
        font-family: 'Poppins', sans-serif;
        font-style: italic;
        font-weight: 400;
      }
      
      blockquote {
        font-family: 'Poppins', sans-serif;
        font-style: italic;
        font-weight: 400;
        border-left: 4px solid #224A96;
        padding-left: 1rem;
        margin: 1rem 0;
        background-color: rgba(34, 74, 150, 0.05);
        padding: 1rem;
        border-radius: 8px;
      }
      
      ul, ol {
        font-family: 'Poppins', sans-serif;
        padding-left: 1.5rem;
        margin-bottom: 1rem;
      }
      
      li {
        font-family: 'Poppins', sans-serif;
        line-height: 1.6;
        margin-bottom: 0.5rem;
      }
      
      a {
        color: #224A96;
        text-decoration: underline;
        font-weight: 500;
      }
      
      code {
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        background-color: rgba(0, 0, 0, 0.05);
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.9em;
      }
      
      pre {
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        background-color: rgba(0, 0, 0, 0.05);
        padding: 1rem;
        border-radius: 8px;
        overflow-x: auto;
        margin: 1rem 0;
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