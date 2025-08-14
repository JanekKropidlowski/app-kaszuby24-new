import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '@/store/themeStore';
import { LucideIcon } from 'lucide-react-native';

interface WeatherSpecializedWidgetProps {
  type: 'humidity' | 'wind' | 'uv';
  value?: number;
  level?: string;
  color: string;
  icon: LucideIcon;
  title: string;
  unit: string;
}

export const WeatherSpecializedWidget: React.FC<WeatherSpecializedWidgetProps> = ({
  type,
  value,
  level,
  color,
  icon: IconComponent,
  title,
  unit,
}) => {
  const { theme } = useThemeStore();
  
  const colors = theme?.colors || {
    primary: '#224A96',
    secondary: '#FECC00',
    background: '#F8FAFC',
    card: '#F8FAFC',
    text: '#1E293B',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
  };

  const getLevelColor = (level?: string) => {
    if (!level) return colors.textSecondary;
    
    const lowerLevel = level.toLowerCase();
    if (lowerLevel.includes('niski') || lowerLevel.includes('słaby') || lowerLevel.includes('optymalna') || lowerLevel.includes('dobra') || lowerLevel.includes('normalne')) {
      return colors.success;
    } else if (lowerLevel.includes('średni') || lowerLevel.includes('umiarkowany') || lowerLevel.includes('umiarkowana')) {
      return colors.warning;
    } else if (lowerLevel.includes('wysoki') || lowerLevel.includes('silny') || lowerLevel.includes('ekstremalny') || lowerLevel.includes('wysokie')) {
      return colors.error;
    } else if (lowerLevel.includes('wysoka') || lowerLevel.includes('niska') || lowerLevel.includes('mroźna') || lowerLevel.includes('słaba') || lowerLevel.includes('niskie')) {
      return colors.info;
    }
    return colors.textSecondary;
  };

  const formatValue = (val?: number) => {
    if (val === undefined || val === null) return '--';
    if (type === 'humidity') return `${Math.round(val)}${unit}`;
    if (type === 'wind') return `${Math.round(val)}${unit}`;
    if (type === 'uv') return `${val}${unit}`;
    return `${val}${unit}`;
  };

  const getGradientColors = () => {
    const alpha20 = color + '20';
    const alpha05 = color + '05';
    return [alpha20, alpha05] as [string, string];
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={getGradientColors()}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
            <IconComponent size={24} color={color} fill={color} />
          </View>
          
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.text, fontFamily: theme?.fontFamily?.semibold || 'Poppins_SemiBold' }]} numberOfLines={1}>
              {title}
            </Text>
            
            <Text style={[styles.value, { color: color, fontFamily: theme?.fontFamily?.bold || 'Poppins_Bold' }]} numberOfLines={1}>
              {formatValue(value)}
            </Text>
            
            {level && (
              <View style={[styles.levelBadge, { backgroundColor: getLevelColor(level) + '20' }]}>
                <Text style={[styles.levelText, { color: getLevelColor(level), fontFamily: theme?.fontFamily?.semibold || 'Poppins_SemiBold' }]} numberOfLines={1}>
                  {level}
                </Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gradient: {
    padding: 16,
    minHeight: 100,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    marginBottom: 6,
  },
  value: {
    fontSize: 20,
    marginBottom: 6,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  levelText: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
