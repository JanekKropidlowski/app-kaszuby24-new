import { Article, Category } from '@/types/article';

// Interface for embedded category objects from API
interface EmbeddedCategory {
  id: number;
  name: string;
  slug: string;
}

/**
 * Checks if an article is sponsored content that should be filtered out
 * @param article - The article to check
 * @returns true if the article is sponsored and should be filtered out
 */
export const isSponsoredContent = (article: Article): boolean => {
  try {
    // Check if article has embedded categories
    if (article._embedded && article._embedded["wp:term"]) {
      const categories = article._embedded["wp:term"][0];
      if (categories && Array.isArray(categories)) {
        return categories.some((category: EmbeddedCategory) => 
          category.id === 554 || 
          category.slug === 'sponsorowany'
        );
      }
    }
    
    // Check if article has categories array directly
    if (article.categories && Array.isArray(article.categories)) {
      return article.categories.includes(554);
    }
    
    return false;
  } catch (error) {
    console.warn('Error checking sponsored content:', error);
    // If there's an error, don't filter out the article
    return false;
  }
};

/**
 * Filters out sponsored content from an array of articles
 * @param articles - Array of articles to filter
 * @returns Filtered array without sponsored content
 */
export const filterSponsoredArticles = (articles: Article[]): Article[] => {
  try {
    if (!Array.isArray(articles)) {
      console.warn('filterSponsoredArticles: articles is not an array:', articles);
      return [];
    }
    
    return articles.filter(article => {
      if (!article || typeof article !== 'object') {
        console.warn('Invalid article object:', article);
        return false;
      }
      
      return !isSponsoredContent(article);
    });
  } catch (error) {
    console.warn('Error filtering sponsored articles:', error);
    // If there's an error, return the original array
    return Array.isArray(articles) ? articles : [];
  }
};

/**
 * Checks if a category is the sponsored category
 * @param category - The category to check
 * @returns true if the category is sponsored
 */
export const isSponsoredCategory = (category: Category): boolean => {
  try {
    return category.id === 554 || category.slug === 'sponsorowany';
  } catch (error) {
    console.warn('Error checking sponsored category:', error);
    return false;
  }
};

/**
 * Filters out sponsored categories from an array of categories
 * @param categories - Array of categories to filter
 * @returns Filtered array without sponsored category
 */
export const filterSponsoredCategories = (categories: Category[]): Category[] => {
  try {
    if (!Array.isArray(categories)) {
      console.warn('filterSponsoredCategories: categories is not an array:', categories);
      return [];
    }
    
    return categories.filter(category => {
      if (!category || typeof category !== 'object') {
        console.warn('Invalid category object:', category);
        return false;
      }
      
      return !isSponsoredCategory(category);
    });
  } catch (error) {
    console.warn('Error filtering sponsored categories:', error);
    // If there's an error, return the original array
    return Array.isArray(categories) ? categories : [];
  }
};