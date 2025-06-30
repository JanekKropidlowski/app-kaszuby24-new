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

// Extract video URLs from HTML content
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
  
  // Also look for direct links to YouTube or Vimeo
  const linkRegex = /<a[^>]*href=["']([^"']*(?:youtube|vimeo)[^"']*)["'][^>]*>/gi;
  
  while ((match = linkRegex.exec(html)) !== null) {
    if (match[1]) {
      videoUrls.push(match[1]);
    }
  }
  
  return videoUrls;
};

// Extract YouTube URL from meta field
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
  
  // Enhanced styles for better Android rendering
  const webStyles = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
      
      body {
        font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        line-height: 1.8;
        color: #212529;
        padding: 0;
        margin: 0;
        font-size: ${Platform.OS === 'android' ? '17px' : '16px'};
        background-color: transparent;
        word-wrap: break-word;
        overflow-wrap: break-word;
        -webkit-text-size-adjust: 100%;
        text-size-adjust: 100%;
      }
      
      p {
        margin-bottom: 16px;
        font-family: 'Poppins', sans-serif;
        line-height: 1.8;
      }
      
      img {
        max-width: 100% !important;
        height: auto !important;
        border-radius: 8px;
        margin: 16px 0;
        display: block;
      }
      
      a {
        color: #224A96;
        text-decoration: none;
        word-break: break-word;
      }
      
      a:hover {
        text-decoration: underline;
      }
      
      h1, h2, h3, h4, h5, h6 {
        color: #212529;
        margin-top: 28px;
        margin-bottom: 16px;
        line-height: 1.3;
        font-weight: 600;
        font-family: 'Poppins', sans-serif;
      }
      
      blockquote {
        position: relative;
        margin: 24px 0;
        padding: 20px 24px 20px 60px;
        background: linear-gradient(135deg, rgba(34, 74, 150, 0.08) 0%, rgba(254, 204, 0, 0.08) 100%);
        border-radius: 16px;
        border-left: 4px solid #224A96;
        font-style: italic;
        font-size: ${Platform.OS === 'android' ? '18px' : '17px'};
        line-height: 1.6;
        color: #475569;
        box-shadow: 0 4px 20px rgba(34, 74, 150, 0.1);
        font-family: 'Poppins', sans-serif;
      }
      
      blockquote::before {
        content: '"';
        position: absolute;
        left: 20px;
        top: 12px;
        font-size: 48px;
        font-weight: bold;
        color: #224A96;
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
        padding-left: 24px;
        margin: 16px 0;
      }
      
      li {
        margin-bottom: 8px;
        font-family: 'Poppins', sans-serif;
        line-height: 1.6;
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 16px 0;
        font-size: ${Platform.OS === 'android' ? '15px' : '14px'};
      }
      
      th, td {
        border: 1px solid rgba(0,0,0,0.2);
        padding: 12px 8px;
        text-align: left;
        font-family: 'Poppins', sans-serif;
      }
      
      th {
        background-color: rgba(0,0,0,0.1);
        font-weight: 600;
        font-family: 'Poppins', sans-serif;
      }
      
      /* Remove any video/iframe elements to prevent conflicts */
      iframe, video, embed, object {
        display: none !important;
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
      
      @media (prefers-color-scheme: dark) {
        body {
          color: #f8f9fa;
          background-color: transparent;
        }
        
        h1, h2, h3, h4, h5, h6 {
          color: #f8f9fa;
        }
        
        a {
          color: #4A7BC8;
        }
        
        blockquote {
          background: linear-gradient(135deg, rgba(74, 123, 200, 0.1) 0%, rgba(254, 204, 0, 0.05) 100%);
          color: #E2E8F0;
          border-left-color: #4A7BC8;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        
        blockquote::before {
          color: #4A7BC8;
        }
        
        th, td {
          border-color: rgba(255,255,255,0.2);
        }
        
        th {
          background-color: rgba(255,255,255,0.1);
        }
      }
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