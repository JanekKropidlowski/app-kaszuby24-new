import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager, Animated } from 'react-native';
import { AlertTriangle, ChevronDown, AlertCircle, AlertOctagon, Info } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';

interface WarningLevel {
  level: string;
  color: string;
  icon: React.ReactNode;
}

interface WarningItemProps {
  title: string;
  subtitle: string;
  content: string;
  level: string;
  validUntil: string;
}

interface WeatherWarningsProps {
  warnings: {
    meteo?: Array<{
      title: string;
      subtitle: string;
      content: string;
      level: string;
      validUntil: string;
    }>;
    hydro?: Array<{
      title: string;
      subtitle: string;
      content: string;
      level: string;
      validUntil: string;
    }>;
  };
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const getWarningStyles = (theme: any, level: string) => {
    const getWarningColor = (level: string) => {
        switch (level.toLowerCase()) {
            case 'extreme': return '#dc2626';
            case 'severe': return '#ea580c';
            case 'moderate': return '#d97706';
            case 'minor': return '#059669';
            default: return '#6b7280';
        }
    };

    const getWarningIcon = (level: string) => {
        switch (level.toLowerCase()) {
            case 'extreme':
            case 'severe':
                return <AlertTriangle size={24} color={getWarningColor(level)} />;
            case 'moderate':
                return <AlertCircle size={24} color={getWarningColor(level)} />;
            default:
                return <Info size={24} color={getWarningColor(level)} />;
        }
    };

    const baseColor = getWarningColor(level);
    const IconComponent = getWarningIcon(level);
    
    return StyleSheet.create({
        container: {
            backgroundColor: `${baseColor}10`,
            borderRadius: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: `${baseColor}30`,
            overflow: 'hidden',
            shadowColor: baseColor,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
        },
        iconContainer: {
            marginRight: 12,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: `${baseColor}20`,
            alignItems: 'center',
            justifyContent: 'center',
        },
        headerTextContainer: {
            flex: 1,
        },
        headerTitle: {
            fontFamily: theme.fontFamily.bold,
            fontSize: 16,
            color: theme.colors.text,
            marginBottom: 2,
        },
        headerSubtitle: {
            fontFamily: theme.fontFamily.medium,
            fontSize: 13,
            color: theme.colors.textSecondary,
        },
        levelBadge: {
            backgroundColor: baseColor,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
            marginLeft: 8,
        },
        levelText: {
            color: 'white',
            fontFamily: theme.fontFamily.bold,
            fontSize: 11,
        },
        chevron: {
            transform: [{ rotate: '0deg' }],
        },
        chevronExpanded: {
            transform: [{ rotate: '180deg' }],
        },
        body: {
            padding: 16,
            paddingTop: 0,
            borderTopWidth: 1,
            borderTopColor: `${baseColor}20`,
        },
        content: {
            fontFamily: theme.fontFamily.regular,
            fontSize: 14,
            color: theme.colors.textSecondary,
            lineHeight: 21,
        },
        timestamp: {
            fontFamily: theme.fontFamily.medium,
            fontSize: 12,
            color: theme.colors.textSecondary,
            marginTop: 8,
            fontStyle: 'italic',
        },
    });
};

const WarningItem: React.FC<WarningItemProps> = ({ title, subtitle, content, level, validUntil }) => {
    const { theme } = useThemeStore();
    const [isExpanded, setIsExpanded] = useState(false);
    const [rotateAnim] = useState(new Animated.Value(0));
    const styles = getWarningStyles(theme, level);
    
    const getWarningIcon = (level: string) => {
        switch (level.toLowerCase()) {
            case 'extreme':
            case 'severe':
                return <AlertTriangle size={24} color={getWarningColor(level)} />;
            case 'moderate':
                return <AlertCircle size={24} color={getWarningColor(level)} />;
            default:
                return <Info size={24} color={getWarningColor(level)} />;
        }
    };
    
    const IconComponent = getWarningIcon(level);
    
    const getWarningColor = (level: string) => {
        switch (level.toLowerCase()) {
            case 'extreme': return '#dc2626';
            case 'severe': return '#ea580c';
            case 'moderate': return '#d97706';
            case 'minor': return '#059669';
            default: return '#6b7280';
        }
    };

    const toggleExpand = () => {
        const toValue = isExpanded ? 0 : 1;
        
        Animated.timing(rotateAnim, {
            toValue,
            duration: 200,
            useNativeDriver: true,
        }).start();

        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsExpanded(!isExpanded);
    };

    const getLevelText = (level: string) => {
        switch (level.toLowerCase()) {
            case 'extreme': return 'EKSTREMALNE';
            case 'severe': return 'SILNE';
            case 'moderate': return 'ŚREDNIE';
            case 'minor': return 'NISKIE';
            default: return 'NISKIE';
        }
    };

    const rotate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
    });

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={toggleExpand} style={styles.header} activeOpacity={0.7}>
                <View style={styles.iconContainer}>
                  {IconComponent}
                </View>
                <View style={styles.headerTextContainer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.headerTitle}>{title}</Text>
                        <View style={styles.levelBadge}>
                            <Text style={styles.levelText}>{getLevelText(level)}</Text>
                        </View>
                    </View>
                    <Text style={styles.headerSubtitle}>{subtitle}</Text>
                </View>
                <Animated.View style={{ transform: [{ rotate }] }}>
                    <ChevronDown size={20} color={theme.colors.textSecondary} />
                </Animated.View>
            </TouchableOpacity>

            {isExpanded && (
                <View style={styles.body}>
                    <Text style={styles.content}>{content.replace(/<br\s*\/?>/gi, "\n")}</Text>
                    {validUntil && (
                        <Text style={styles.timestamp}>Ważne do: {validUntil}</Text>
                    )}
                </View>
            )}
        </View>
    );
};

export const WeatherWarnings: React.FC<WeatherWarningsProps> = ({ warnings }) => {
    const meteoWarnings = (warnings.meteo || []).map((w: any) => ({
        id: `meteo-${w.ID}`,
        title: w.Name,
        subtitle: `Ostrzeżenie meteorologiczne`,
        content: w.tresc,
        level: w.level,
        validUntil: w.valid_do,
    }));

    const hydroWarnings = (warnings.hydro || []).map((w: any) => ({
        id: `hydro-${w.ID}`,
        title: `Ostrzeżenie hydrologiczne`,
        subtitle: `Poziom ${w.Stopien}`,
        content: w.tresc,
        level: w.Stopien,
        validUntil: w.valid_do,
    }));

    const allWarnings = [...meteoWarnings, ...hydroWarnings];

    if (allWarnings.length === 0) return null;

    // Sort warnings by level (highest first)
    const sortedWarnings = allWarnings.sort((a, b) => b.level - a.level);

    return (
        <View style={{ marginBottom: 20 }}>
            {sortedWarnings.map(warning => (
                <WarningItem key={warning.id} {...warning} />
            ))}
        </View>
    );
}; 