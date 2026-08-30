import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Hash } from 'lucide-react-native';

export interface ArticleTag {
  id: number;
  name: string;
  slug: string;
}

/**
 * Tagi artykułu. Dotknięcie otwiera wyszukiwarkę z nazwą tagu — apka nie ma
 * osobnych ekranów tagowych, a wyszukiwarka pokazuje te same materiały.
 */
export const ArticleTags = ({ tags, theme, isDarkMode }: { tags: ArticleTag[]; theme: any; isDarkMode: boolean }) => {
  const router = useRouter();
  if (!tags.length) return null;

  const chipBg = isDarkMode ? 'rgba(255,255,255,0.08)' : '#f2f2f7';
  const chipBorder = isDarkMode ? 'rgba(255,255,255,0.12)' : '#e6e6ee';

  return (
    <View style={styles.wrap}>
      <Text style={[styles.heading, { color: theme.colors.textSecondary }]}>Tematy</Text>
      <View style={styles.chips}>
        {tags.map((tag) => (
          <TouchableOpacity
            key={tag.id}
            activeOpacity={0.75}
            onPress={() => router.push(`/search?q=${encodeURIComponent(tag.name)}`)}
            style={[styles.chip, { backgroundColor: chipBg, borderColor: chipBorder }]}
            accessibilityRole="button"
            accessibilityLabel={`Szukaj: ${tag.name}`}
          >
            <Hash size={12} color={theme.colors.textSecondary} />
            <Text style={[styles.chipText, { color: theme.colors.text }]} numberOfLines={1}>
              {tag.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginTop: 18, marginBottom: 4 },
  heading: { fontFamily: 'Poppins_Medium', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: '100%',
  },
  chipText: { fontFamily: 'Poppins_Medium', fontSize: 12.5, flexShrink: 1 },
});

export default ArticleTags;
