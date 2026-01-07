/**
 * Comprehensive function to clean HTML entities from text
 * Handles common HTML entities including quotes, dashes, ellipsis, and more
 */
export const cleanHtmlEntities = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return text || '';
  }

  return text
    // Common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    
    // Quotes
    .replace(/&#8216;/g, "'")  // left single quotation mark
    .replace(/&#8217;/g, "'")  // right single quotation mark
    .replace(/&#8220;/g, '"')  // left double quotation mark
    .replace(/&#8221;/g, '"')  // right double quotation mark
    .replace(/&#8222;/g, '"')  // left double quotation mark (German/Polish)
    .replace(/&ldquo;/g, '"')  // left double quotation mark
    .replace(/&rdquo;/g, '"')  // right double quotation mark
    .replace(/&lsquo;/g, "'")  // left single quotation mark
    .replace(/&rsquo;/g, "'")  // right single quotation mark
    
    // Dashes and hyphens
    .replace(/&#8211;/g, '–')  // en dash
    .replace(/&#8212;/g, '—')  // em dash
    .replace(/&ndash;/g, '–')  // en dash
    .replace(/&mdash;/g, '—')  // em dash
    
    // Ellipsis
    .replace(/&#8230;/g, '...') // horizontal ellipsis
    .replace(/&hellip;/g, '…')  // horizontal ellipsis
    
    // Additional spaces
    .replace(/&#160;/g, ' ')   // non-breaking space
    .replace(/&#xa0;/g, ' ')   // non-breaking space
    
    // Hex encoded entities
    .replace(/&#x27;/g, "'")   // apostrophe
    .replace(/&#x22;/g, '"')   // quotation mark
    .replace(/&#x26;/g, '&')   // ampersand
    .replace(/&#x3C;/g, '<')   // less than
    .replace(/&#x3E;/g, '>')   // greater than
    
    // Additional common entities
    .replace(/&#x2013;/g, '–') // en dash
    .replace(/&#x2014;/g, '—') // em dash
    .replace(/&#x2018;/g, "'") // left single quotation mark
    .replace(/&#x2019;/g, "'") // right single quotation mark
    .replace(/&#x201C;/g, '"') // left double quotation mark
    .replace(/&#x201D;/g, '"') // right double quotation mark
    .replace(/&#x201E;/g, '"') // double low-9 quotation mark (German/Polish)
    .replace(/&#x2026;/g, '...'); // horizontal ellipsis
};

/**
 * Clean HTML entities specifically for article titles
 * This is a more focused version for titles that commonly have specific entities
 */
export const cleanArticleTitle = (title: string): string => {
  if (!title || typeof title !== 'string') {
    return title || 'Brak tytułu';
  }

  return cleanHtmlEntities(title);
};
