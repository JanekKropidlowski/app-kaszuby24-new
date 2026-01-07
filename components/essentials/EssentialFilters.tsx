import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import {
    Stethoscope,
    Moon,
    Zap,
    Hospital,
    Heart,
    Battery,
    Home,
    Bus,
    LucideIcon
} from 'lucide-react-native';
import { Theme } from '@/store/themeStore';

type FilterType = 'ALL' | 'SOR' | 'NISP' | 'HOSPITAL' | 'AED' | 'SHELTER' | 'CHARGING' | 'PKS';

interface FilterOption {
    key: FilterType;
    label: string;
    icon: LucideIcon;
    color: string;
}

interface EssentialFiltersProps {
    activeFilter: FilterType;
    setActiveFilter: (filter: FilterType) => void;
    theme: Theme;
    triggerHaptic: () => void;
}

const FILTER_OPTIONS: FilterOption[] = [
    { key: 'ALL', label: 'Wszystkie', icon: Heart, color: '#EF4444' },
    { key: 'SOR', label: 'SOR', icon: Stethoscope, color: '#DC2626' },
    { key: 'NISP', label: 'NISP', icon: Moon, color: '#7C3AED' },
    { key: 'HOSPITAL', label: 'Szpitale', icon: Hospital, color: '#2563EB' },
    { key: 'AED', label: 'AED', icon: Zap, color: '#F59E0B' },
    { key: 'SHELTER', label: 'Schrony', icon: Home, color: '#059669' },
    { key: 'CHARGING', label: 'Ładowarki', icon: Battery, color: '#10B981' },
    { key: 'PKS', label: 'PKS', icon: Bus, color: '#EC4899' },
];

export const EssentialFilters: React.FC<EssentialFiltersProps> = ({
    activeFilter,
    setActiveFilter,
    theme,
    triggerHaptic
}) => {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterTabsScroll}
        >
            {FILTER_OPTIONS.map(({ key, label, icon: IconComponent, color }) => (
                <TouchableOpacity
                    key={key}
                    activeOpacity={0.7}
                    style={[
                        styles.filterButton,
                        {
                            backgroundColor: activeFilter === key ? color : theme.colors.card,
                            borderColor: activeFilter === key ? color : theme.colors.border,
                            shadowColor: activeFilter === key ? color : '#000',
                        },
                        activeFilter === key && styles.activeFilterShadow
                    ]}
                    onPress={() => {
                        triggerHaptic();
                        setActiveFilter(key);
                    }}
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
        minWidth: 90,
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
