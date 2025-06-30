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
  
  // Add necessary styles for web view
  const webStyles = `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        line-height: 1.8;
        color: #212529;
        padding: 0;
        margin: 0;
        font-size: 16px;
        background-color: transparent;
      }
      
      p {
        margin-bottom: 16px;
      }
      
      img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 16px 0;
        border-radius: 12px;
      }
      
      a {
        color: #224A96;
        text-decoration: none;
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
      }
      
      blockquote {
        position: relative;
        margin: 24px 0;
        padding: 20px 24px 20px 60px;
        background: linear-gradient(135deg, rgba(34, 74, 150, 0.08) 0%, rgba(254, 204, 0, 0.08) 100%);
        border-radius: 16px;
        border-left: 4px solid #224A96;
        font-style: italic;
        font-size: 17px;
        line-height: 1.6;
        color: #475569;
        box-shadow: 0 4px 20px rgba(34, 74, 150, 0.1);
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
      }
      
      blockquote p {
        margin: 0;
        position: relative;
        z-index: 1;
      }
      
      ul, ol {
        padding-left: 24px;
      }
      
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