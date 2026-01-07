import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Train, Bus, Car, LucideIcon } from 'lucide-react-native';
import { Theme } from '@/store/themeStore';

interface FilterOption {
    key: string;
    label: string;
    icon: LucideIcon;
}

interface TransportFiltersProps {
    activeFilter: string;
    setActiveFilter: (filter: any) => void;
    theme: Theme;
}

const FILTER_OPTIONS: FilterOption[] = [
    { key: 'ALL', label: 'Wszystkie', icon: Train },
    { key: 'GDANSK', label: 'ZTM Gdańsk', icon: Train },
    { key: 'GDYNIA', label: 'ZKM Gdynia', icon: Bus },
    { key: 'PKS', label: 'PKS Gdynia', icon: Bus },
    { key: 'WEJHEROWO', label: 'MZK Wejherowo', icon: Bus },
    { key: 'PKP', label: 'PKP/Intercity', icon: Train },
    { key: 'POLREGIO', label: 'Polregio', icon: Train },
];

export const TransportFilters: React.FC<TransportFiltersProps> = ({
    activeFilter,
    setActiveFilter,
    theme
}) => {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterTabsScroll}
        >
            {FILTER_OPTIONS.map(({ key, label, icon: IconComponent }) => (
                <TouchableOpacity
                    key={key}
                    activeOpacity={0.7}
                    style={[
                        styles.filterButton,
                        {
                            backgroundColor: activeFilter === key ? theme.colors.primary : theme.colors.card,
                            borderColor: activeFilter === key ? theme.colors.primary : theme.colors.border,
                            shadowColor: activeFilter === key ? theme.colors.primary : '#000',
                        },
                        activeFilter === key && styles.activeFilterShadow
                    ]}
                    onPress={() => setActiveFilter(key)}
                >
                    <IconComponent
                        size={16}
                        color={activeFilter === key ? 'white' : theme.colors.text}
                        strokeWidth={2.5}
                    />
                    <Text style={[
                        styles.filterButtonText,
                        { color: activeFilter === key ? 'white' : theme.colors.text }
                    ]}>
                        {label}
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    filterTabsScroll: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 10,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 25,
        borderWidth: 1.5,
        minWidth: 100,
        justifyContent: 'center',
        elevation: 3,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3.84,
    },
    activeFilterShadow: {
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
    filterButtonText: {
        fontSize: 13,
        fontFamily: 'Poppins_SemiBold',
        marginLeft: 8,
    },
});
