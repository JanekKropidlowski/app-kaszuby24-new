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
      p {
        margin: 16px 0;
      }
      h1, h2, h3, h4, h5, h6 {
        margin-top: 28px;
        margin-bottom: 16px;
        line-height: 1.3;
        font-weight: 600;
      }
      @media (prefers-color-scheme: dark) {
        body {
          color: #f8f9fa;
          background-color: #121212;
        }
        a {
          color: #3A62B0;
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