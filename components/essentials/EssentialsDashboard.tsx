import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ServiceCard } from './ServiceCard';
import { Building2, Ambulance, Shield, Zap, Bus } from 'lucide-react-native';

interface EssentialsDashboardProps {
    onNavigate: (module: string) => void;
}

export const EssentialsDashboard: React.FC<EssentialsDashboardProps> = ({ onNavigate }) => {
    return (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            <Text style={styles.header}>Niezbędnik</Text>
            <Text style={styles.subHeader}>Wybierz usługę, której potrzebujesz</Text>

            <View style={styles.grid}>
                <ServiceCard
                    title="Komunikacja"
                    subtitle="Rozkłady, opóźnienia"
                    icon={Bus}
                    color="#8B5CF6"
                    onPress={() => onNavigate('transport')}
                />
                <ServiceCard
                    title="Zdrowie (SOR)"
                    subtitle="Szpitale, czas oczekiwania"
                    icon={Ambulance}
                    color="#EF4444"
                    stat="LIVE"
                    statColor="#EF4444"
                    onPress={() => onNavigate('medical')}
                />
                <ServiceCard
                    title="Szukaj Schronienia"
                    subtitle="Schrony, ukrycia"
                    icon={Shield}
                    color="#10B981"
                    onPress={() => onNavigate('safety')}
                />
                <ServiceCard
                    title="Stacje Ładowania"
                    subtitle="Pojazdy elektryczne"
                    icon={Zap}
                    color="#F59E0B"
                    onPress={() => onNavigate('ev')}
                />
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        paddingBottom: 100,
    },
    header: {
        fontSize: 32,
        fontWeight: '800',
        color: '#111827',
        fontFamily: 'Poppins_Bold',
        marginBottom: 8,
    },
    subHeader: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 24,
        fontFamily: 'Poppins_Regular',
    },
    grid: {
        gap: 16,
    }
});
