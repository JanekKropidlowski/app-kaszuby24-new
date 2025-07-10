import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { AlertTriangle, ChevronDown } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const getWarningStyles = (theme, level) => {
    const baseColor = level > 1 ? theme.colors.error : theme.colors.warning;
    return StyleSheet.create({
        container: {
            backgroundColor: `${baseColor}20`, // e.g., #ffab0020
            borderRadius: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: `${baseColor}50`,
            overflow: 'hidden',
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
        },
        iconContainer: {
            marginRight: 12,
        },
        headerTextContainer: {
            flex: 1,
        },
        headerTitle: {
            fontFamily: theme.fontFamily.bold,
            fontSize: 16,
            color: theme.colors.text,
        },
        headerSubtitle: {
            fontFamily: theme.fontFamily.regular,
            fontSize: 13,
            color: theme.colors.textSecondary,
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
        },
        content: {
            fontFamily: theme.fontFamily.regular,
            fontSize: 14,
            color: theme.colors.textSecondary,
            lineHeight: 21,
        },
    });
};

const WarningItem = ({ title, subtitle, content, level }) => {
    const { theme } = useThemeStore();
    const [isExpanded, setIsExpanded] = useState(false);
    const styles = getWarningStyles(theme, level);

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsExpanded(!isExpanded);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={toggleExpand} style={styles.header}>
                <View style={styles.iconContainer}>
                    <AlertTriangle size={24} color={level > 1 ? theme.colors.error : theme.colors.warning} />
                </View>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>{title}</Text>
                    <Text style={styles.headerSubtitle}>{subtitle}</Text>
                </View>
                <ChevronDown size={24} color={theme.colors.textSecondary} style={isExpanded ? styles.chevronExpanded : styles.chevron} />
            </TouchableOpacity>

            {isExpanded && (
                <View style={styles.body}>
                    <Text style={styles.content}>{content.replace(/<br\s*\/?>/gi, "\n")}</Text>
                </View>
            )}
        </View>
    );
};

export const WeatherWarnings = ({ warnings }) => {
    const meteoWarnings = (warnings.meteo || []).map(w => ({
        id: `meteo-${w.ID}`,
        title: w.Name,
        subtitle: `Poziom ${w.level}, ważne do ${w.valid_do}`,
        content: w.tresc,
        level: w.level,
    }));

    const hydroWarnings = (warnings.hydro || []).map(w => ({
        id: `hydro-${w.ID}`,
        title: `Ostrzeżenie hydrologiczne`,
        subtitle: `Poziom ${w.Stopien}, ważne do ${w.valid_do}`,
        content: w.tresc,
        level: w.Stopien,
    }));

    const allWarnings = [...meteoWarnings, ...hydroWarnings];

    if (allWarnings.length === 0) return null;

    return (
        <View>
            {allWarnings.map(warning => <WarningItem key={warning.id} {...warning} />)}
        </View>
    );
}; 