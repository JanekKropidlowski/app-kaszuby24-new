import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Article } from '@/types/article';

interface ArticlesState {
  savedArticles: Article[];
  recentArticles: Article[];
  saveArticle: (article: Article) => void;
  removeArticle: (articleId: number) => void;
  addRecentArticle: (article: Article) => void;
  clearRecentArticles: () => void;
  isArticleSaved: (articleId: number) => boolean;
}

export const useArticlesStore = create<ArticlesState>()(
  persist(
    (set, get) => ({
      savedArticles: [],
      recentArticles: [],
      saveArticle: (article: Article) => 
        set((state) => {
          // Don't add if already exists
          if (state.savedArticles.some(a => a.id === article.id)) {
            return state;
          }
          return { savedArticles: [article, ...state.savedArticles] };
        }),
      removeArticle: (articleId: number) => 
        set((state) => ({
          savedArticles: state.savedArticles.filter(article => article.id !== articleId)
        })),
      addRecentArticle: (article: Article) => 
        set((state) => {
          // Remove if already exists to avoid duplicates
          const filtered = state.recentArticles.filter(a => a.id !== article.id);
          // Keep only the last 20 articles
          return { 
            recentArticles: [article, ...filtered].slice(0, 20)
          };
        }),
      clearRecentArticles: () => set({ recentArticles: [] }),
      isArticleSaved: (articleId: number) => {
        return get().savedArticles.some(article => article.id === articleId);
      },
    }),
    {
      name: 'articles-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);