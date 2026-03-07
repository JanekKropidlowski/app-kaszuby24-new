import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { Heart, Shield, Bus, Zap } from 'lucide-react-native';

export type EssentialLayer = 'medical' | 'safety' | 'transport' | 'ev';

interface FilterBarProps {
    activeLayers: Set<string>;
    toggleLayer: (layer: EssentialLayer) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ activeLayers, toggleLayer }) => {
    const renderFilterBtn = (layer: EssentialLayer, label: string, icon: any, color: string) => {
        const isActive = activeLayers.has(layer);
        return (
            <TouchableOpacity
                style={[
                    styles.filterBtn,
                    isActive && { backgroundColor: color, borderColor: color }
                ]}
                onPress={() => toggleLayer(layer)}
                activeOpacity={0.7}
            >
                {icon}
                <Text style={[styles.filterText, isActive && { color: 'white' }]}>{label}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <BlurView intensity={90} tint="light" style={styles.filterBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                {renderFilterBtn('medical', 'Zdrowie', <Heart size={16} color={activeLayers.has('medical') ? 'white' : '#EF4444'} />, '#EF4444')}
                {renderFilterBtn('safety', 'Schrony/AED', <Shield size={16} color={activeLayers.has('safety') ? 'white' : '#10B981'} />, '#10B981')}
                {renderFilterBtn('transport', 'Komunikacja', <Bus size={16} color={activeLayers.has('transport') ? 'white' : '#8B5CF6'} />, '#8B5CF6')}
                {renderFilterBtn('ev', 'Ładowarki', <Zap size={16} color={activeLayers.has('ev') ? 'white' : '#F59E0B'} />, '#F59E0B')}
            </ScrollView>
        </BlurView>
    );
};

const styles = StyleSheet.create({
    filterBar: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        borderRadius: 24,
        overflow: 'hidden',
        paddingVertical: 10,
        backgroundColor: 'rgba(255,255,255,0.9)',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    filterScroll: {
        paddingHorizontal: 10,
        gap: 10,
    },
    filterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 6,
    },
    filterText: {
        fontWeight: '600',
        color: '#1E293B',
        fontSize: 12,
        fontFamily: 'Poppins_SemiBold',
    },
});
