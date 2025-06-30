import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Article } from '@/types/article';
import { filterSponsoredArticles } from '@/utils/contentFilter';

interface ArticlesState {
  savedArticles: Article[];
  recentArticles: Article[];
  saveArticle: (article: Article) => void;
  removeArticle: (articleId: number) => void;
  addRecentArticle: (article: Article) => void;
  clearRecentArticles: () => void;
  isArticleSaved: (articleId: number) => boolean;
  // Performance optimization methods
  getSavedArticleIds: () => Set<number>;
  getRecentArticleIds: () => Set<number>;
}

export const useArticlesStore = create<ArticlesState>()(
  persist(
    (set, get) => ({
      savedArticles: [],
      recentArticles: [],
      
      saveArticle: (article: Article) => 
        set((state) => {
          // Don't save sponsored content
          if (filterSponsoredArticles([article]).length === 0) {
            return state;
          }
          
          // Don't add if already exists
          if (state.savedArticles.some(a => a.id === article.id)) {
            return state;
          }
          
          // Limit saved articles to prevent memory issues (max 100)
          const newSavedArticles = [article, ...state.savedArticles];
          if (newSavedArticles.length > 100) {
            newSavedArticles.splice(100);
          }
          
          return { savedArticles: newSavedArticles };
        }),
        
      removeArticle: (articleId: number) => 
        set((state) => ({
          savedArticles: state.savedArticles.filter(article => article.id !== articleId)
        })),
        
      addRecentArticle: (article: Article) => 
        set((state) => {
          // Don't add sponsored content to recent articles
          if (filterSponsoredArticles([article]).length === 0) {
            return state;
          }
          
          // Remove if already exists to avoid duplicates
          const filtered = state.recentArticles.filter(a => a.id !== article.id);
          // Keep only the last 20 articles to prevent memory issues
          const newRecentArticles = [article, ...filtered].slice(0, 20);
          
          return { 
            recentArticles: newRecentArticles
          };
        }),
        
      clearRecentArticles: () => set({ recentArticles: [] }),
      
      isArticleSaved: (articleId: number) => {
        return get().savedArticles.some(article => article.id === articleId);
      },
      
      // Performance optimization methods
      getSavedArticleIds: () => {
        return new Set(get().savedArticles.map(article => article.id));
      },
      
      getRecentArticleIds: () => {
        return new Set(get().recentArticles.map(article => article.id));
      },
    }),
    {
      name: 'articles-storage',
      storage: createJSONStorage(() => AsyncStorage),
      
      // Selective persistence - only persist essential data
      partialize: (state) => ({
        savedArticles: state.savedArticles.slice(0, 50), // Limit persisted saved articles
        recentArticles: state.recentArticles.slice(0, 10), // Limit persisted recent articles
      }),
      
      // Filter out any sponsored content that might have been saved before this update
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.savedArticles = filterSponsoredArticles(state.savedArticles);
          state.recentArticles = filterSponsoredArticles(state.recentArticles);
          
          // Ensure limits are respected after rehydration
          if (state.savedArticles.length > 100) {
            state.savedArticles = state.savedArticles.slice(0, 100);
          }
          if (state.recentArticles.length > 20) {
            state.recentArticles = state.recentArticles.slice(0, 20);
          }
        }
      },
    }
  )
);