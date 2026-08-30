import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { List, ChevronDown } from 'lucide-react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface TocItem {
  id: string;
  title: string;
}

interface Props {
  items: TocItem[];
  theme: any;
  isDarkMode: boolean;
  onSelect: (id: string) => void;
}

/**
 * Spis treści dla długich materiałów — dotknięcie przewija do sekcji.
 * Domyślnie zwinięty, żeby nie odsuwać początku tekstu.
 */
export const ArticleTOC = ({ items, theme, isDarkMode, onSelect }: Props) => {
  const [open, setOpen] = useState(false);
  if (items.length < 3) return null;

  const bg = isDarkMode ? 'rgba(255,255,255,0.06)' : '#f7f7fb';
  const border = isDarkMode ? 'rgba(255,255,255,0.1)' : '#e8e8ee';

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <View style={[styles.box, { backgroundColor: bg, borderColor: border }]}>
      <TouchableOpacity onPress={toggle} activeOpacity={0.75} style={styles.header} accessibilityRole="button">
        <List size={16} color={theme.colors.text} />
        <Text style={[styles.headerText, { color: theme.colors.text }]}>W tym artykule</Text>
        <Text style={[styles.count, { color: theme.colors.textSecondary }]}>{items.length}</Text>
        <ChevronDown
          size={16}
          color={theme.colors.textSecondary}
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </TouchableOpacity>

      {open && (
        <View style={styles.list}>
          {items.map((item, i) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => onSelect(item.id)}
              activeOpacity={0.7}
              style={[styles.item, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: border }]}
              accessibilityRole="button"
              accessibilityLabel={`Przejdź do: ${item.title}`}
            >
              <Text style={[styles.index, { color: theme.colors.textSecondary }]}>{i + 1}</Text>
              <Text style={[styles.itemText, { color: theme.colors.text }]} numberOfLines={2}>
                {item.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  box: { borderRadius: 14, borderWidth: 1, marginBottom: 18, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12 },
  headerText: { fontFamily: 'Poppins_SemiBold', fontSize: 14, flex: 1 },
  count: { fontFamily: 'Poppins_Regular', fontSize: 12 },
  list: { paddingHorizontal: 14, paddingBottom: 6 },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10 },
  index: { fontFamily: 'Poppins_SemiBold', fontSize: 12, minWidth: 16, lineHeight: 19 },
  itemText: { fontFamily: 'Poppins_Regular', fontSize: 14, lineHeight: 19, flex: 1 },
});

export default ArticleTOC;
