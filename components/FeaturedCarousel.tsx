import React, { useRef, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions,
  Platform
} from 'react-native';
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, Eye, Clock, MapPin } from 'lucide-react-native';
import { Article } from '@/types/article';
import { useThemeStore } from '@/store/themeStore';
import { formatDateTime } from '@/utils/dateFormatter';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface FeaturedCarouselProps {
  articles: Article[];
  onArticlePress: (article: Article) => void;
}

const cleanTitle = (title: string): string => {
  return title
    .replace(/&#8211;/g, '–')
    .replace(/&#8217;/g, "'")
    .replace(/&#8230;/g, '...')
    .replace(/&#8216;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');
};

const getArticleRegion = (article: Article) => {
  if (!article.categories || article.categories.length === 0) return null;
  const regionCategories = [
    { id: 2583, name: 'Wejherowo' }, 
    { id: 7, name: 'Trójmiasto' }, 
    { id: 2128, name: 'Puck' },
    { id: 76797, name: 'Reda' }, 
    { id: 65546, name: 'Kościerzyna' }, 
    { id: 65545, name: 'Kartuzy' },
    { id: 65558, name: 'Lębork' },
  ];
  const regionCategoryId = article.categories.find(categoryId => 
    regionCategories.some(region => region.id === categoryId)
  );
  if (regionCategoryId) {
    const region = regionCategories.find(r => r.id === regionCategoryId);
    return region ? region.name : null;
  }
  return null;
};

const getViewCount = (article: Article) => {
  const views = parseInt(article.meta?.views || '0') * 10;
  return views > 1000 ? `${(views / 1000).toFixed(1)}k` : views.toString();
};

export const FeaturedCarousel: React.FC<FeaturedCarouselProps> = ({ 
  articles, 
  onArticlePress 
}) => {
  const { theme } = useThemeStore();
  const carouselRef = useRef<ICarouselInstance>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const baseOptions = {
    vertical: false,
    width: screenWidth, // Pełna szerokość ekranu
    height: screenHeight * 0.35,
    style: {
      width: screenWidth,
    },
    loop: true,
    autoPlay: true,
    autoPlayInterval: 4000,
    scrollAnimationDuration: 1000,
    mode: 'parallax' as const,
    modeConfig: {
      parallaxScrollingScale: 0.9,
      parallaxScrollingOffset: 50,
      parallaxAdjacentItemScale: 0.8,
    },
    data: articles,
    onScrollEnd: (index: number) => {
      setActiveIndex(index);
    },
    panGestureHandlerProps: {
      activeOffsetX: [-10, 10],
    },
  };

  const renderItem = ({ item, index }: { item: Article; index: number }) => {
    const region = getArticleRegion(item);
    const viewCount = getViewCount(item);

    return (
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={() => onArticlePress(item)}
        activeOpacity={0.95}
      >
        <View style={styles.imageContainer}>
          {item.featured_media_url ? (
            <Image
              source={{ uri: item.featured_media_url }}
              style={styles.image}
              contentFit="cover"
              transition={300}
              placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
              cachePolicy="memory-disk"
              priority="high"
            />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: theme.colors.subtle }]} />
          )}
          
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
            style={styles.gradient}
          />

          {/* Badges */}
          <View style={styles.badgeContainer}>
            <View style={styles.weeklyBadge}>
              <TrendingUp size={12} color="#FFFFFF" />
              <Text style={[styles.weeklyBadgeText, { fontFamily: theme.fontFamily.semibold }]}>
                Najpopularniejsze
              </Text>
            </View>

            <View style={styles.viewCounter}>
              <Eye size={12} color="#FFFFFF" />
              <Text style={[styles.viewCountText, { fontFamily: theme.fontFamily.medium }]}>
                {viewCount}
              </Text>
            </View>
          </View>

          {/* Content */}
          <View style={styles.contentContainer}>
            {region && (
              <View style={styles.regionBadge}>
                <MapPin size={10} color="#FFFFFF" />
                <Text style={[styles.regionText, { fontFamily: theme.fontFamily.medium }]}>
                  {region}
                </Text>
              </View>
            )}

            <Text 
              style={[styles.title, { fontFamily: theme.fontFamily.bold }]}
              numberOfLines={3}
            >
              {cleanTitle(item.title.rendered)}
            </Text>

            <View style={styles.metaContainer}>
              <Clock size={12} color="#FFFFFF" />
              <Text style={[styles.dateText, { fontFamily: theme.fontFamily.regular }]}>
                {formatDateTime(item.date)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!articles || articles.length === 0) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <Carousel
          ref={carouselRef}
          {...baseOptions}
          renderItem={renderItem}
        />
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    height: screenHeight * 0.35,
    marginBottom: 20,
    alignItems: 'center', // Centrowanie carousel
    justifyContent: 'center',
  },
  itemContainer: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 5, // Zmniejszone o połowę dla mniejszych odstępów
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
  },
  badgeContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weeklyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#224996', // Granatowy kolor zamiast czerwonego
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  weeklyBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  viewCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  viewCountText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  contentContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  regionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
    gap: 4,
  },
  regionText: {
    color: '#FFFFFF',
    fontSize: 11,
  },
  title: {
    fontSize: 20,
    color: '#FFFFFF',
    lineHeight: 26,
    marginBottom: 8,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
});