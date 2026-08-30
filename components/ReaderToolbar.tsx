import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Minus, Plus, Type } from 'lucide-react-native';
import { useReaderStore, FONT_SCALES, FONT_SCALE_LABELS } from '@/store/readerStore';

/**
 * Regulacja wielkości tekstu artykułu. Ustawienie jest pamiętane, więc
 * czytelnik ustawia je raz — kolejne artykuły otwierają się już powiększone.
 */
export const ReaderToolbar = ({ theme, isDarkMode }: { theme: any; isDarkMode: boolean }) => {
  const { fontScaleIndex, increase, decrease } = useReaderStore();
  const atMin = fontScaleIndex <= 0;
  const atMax = fontScaleIndex >= FONT_SCALES.length - 1;

  const bg = isDarkMode ? 'rgba(255,255,255,0.07)' : '#f4f4f8';
  const btnBg = isDarkMode ? 'rgba(255,255,255,0.1)' : '#fff';

  return (
    <View style={[styles.bar, { backgroundColor: bg }]}>
      <View style={styles.labelRow}>
        <Type size={15} color={theme.colors.textSecondary} />
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Wielkość tekstu</Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          onPress={decrease}
          disabled={atMin}
          style={[styles.btn, { backgroundColor: btnBg, opacity: atMin ? 0.4 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Zmniejsz tekst"
        >
          <Minus size={16} color={theme.colors.text} />
        </TouchableOpacity>

        <Text style={[styles.scale, { color: theme.colors.text }]}>{FONT_SCALE_LABELS[fontScaleIndex]}</Text>

        <TouchableOpacity
          onPress={increase}
          disabled={atMax}
          style={[styles.btn, { backgroundColor: btnBg, opacity: atMax ? 0.4 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Powiększ tekst"
        >
          <Plus size={16} color={theme.colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontFamily: 'Poppins_Medium', fontSize: 13 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scale: { fontFamily: 'Poppins_SemiBold', fontSize: 13, minWidth: 30, textAlign: 'center' },
});

export default ReaderToolbar;
