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
};

/**
 * Filters out sponsored content from an array of articles
 * @param articles - Array of articles to filter
 * @returns Filtered array without sponsored content
 */
export const filterSponsoredArticles = (articles: Article[]): Article[] => {
  return articles.filter(article => !isSponsoredContent(article));
};

/**
 * Checks if a category is the sponsored category
 * @param category - The category to check
 * @returns true if the category is sponsored
 */
export const isSponsoredCategory = (category: Category): boolean => {
  return category.id === 554 || category.slug === 'sponsorowany';
};

/**
 * Filters out sponsored categories from an array of categories
 * @param categories - Array of categories to filter
 * @returns Filtered array without sponsored category
 */
export const filterSponsoredCategories = (categories: Category[]): Category[] => {
  return categories.filter(category => !isSponsoredCategory(category));
};