import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity 
} from 'react-native';
import { Bookmark } from 'lucide-react-native';
import ArticleCard from '@/components/ArticleCard';
import EmptyState from '@/components/EmptyState';
import { useArticlesStore } from '@/store/articlesStore';
import { useRouter } from 'expo-router';
import { useThemeStore } from '@/store/themeStore';

export default function SavedScreen() {
  const router = useRouter();
  const { savedArticles, recentArticles } = useArticlesStore();
  const { theme } = useThemeStore();
  
  const navigateToHome = () => {
    router.push('/');
  };
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={savedArticles}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.articleContainer}>
            <ArticleCard article={item} />
          </View>
        )}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              Zapisane artykuły
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              {savedArticles.length > 0 
                ? `Masz ${savedArticles.length} zapisanych artykułów`
                : 'Zapisz artykuły, aby czytać je później'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="Brak zapisanych artykułów"
            message="Artykuły, które zapiszesz, pojawią się tutaj do czytania offline."
            actionLabel="Przeglądaj artykuły"
            onAction={navigateToHome}
            icon={<Bookmark size={48} color={theme.colors.primary} />}
          />
        }
        ListFooterComponent={
          savedArticles.length > 0 && recentArticles.length > 0 ? (
            <View style={[styles.recentSection, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Ostatnio przeglądane
              </Text>
              
              <FlatList
                data={recentArticles.slice(0, 5)}
                keyExtractor={(item) => `recent-${item.id}`}
                renderItem={({ item }) => (
                  <ArticleCard article={item} compact />
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                scrollEnabled={false}
              />
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  articleContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  recentSection: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginHorizontal: 20,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  separator: {
    height: 12,
  },
});