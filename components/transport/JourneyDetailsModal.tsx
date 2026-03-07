import React, { useState } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteOption } from '../../services/TransportRoutingEngine';
import { RouteMapView } from './RouteMapView';
import { LegDetail } from './LegDetail';

interface JourneyDetailsModalProps {
    journey: RouteOption | null;
    visible: boolean;
    onClose: () => void;
}

type TabType = 'DETAILS' | 'MAP';

const tfs = (size: number) => (Platform.OS === 'android' ? Math.max(9, size - 3) : size);

export const JourneyDetailsModal = ({ journey, visible, onClose }: JourneyDetailsModalProps) => {
    const [activeTab, setActiveTab] = useState<TabType>('DETAILS');

    if (!journey) return null;

    const walkingLegs = journey.legs.filter(l => l.mode === 'WALK');
    const totalWalkingTime = walkingLegs.reduce((sum, l) => sum + l.duration, 0);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container} edges={['top']}>
                {/* HEADER */}
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <TouchableOpacity style={styles.backButton} onPress={onClose}>
                            <Ionicons name="arrow-back" size={24} color="#1A202C" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Szczegóły podróży</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    {/* SUMMARY CARD */}
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryRow}>
                            <View style={styles.summaryItem}>
                                <Ionicons name="time-outline" size={20} color="#0066CC" />
                                <Text style={styles.summaryLabel}>Czas</Text>
                                <Text style={styles.summaryValue}>{journey.totalDuration} min</Text>
                            </View>
                            <View style={styles.summaryDivider} />
                            <View style={styles.summaryItem}>
                                <Ionicons name="swap-horizontal" size={20} color="#0066CC" />
                                <Text style={styles.summaryLabel}>Przesiadki</Text>
                                <Text style={styles.summaryValue}>{journey.changes}</Text>
                            </View>
                            <View style={styles.summaryDivider} />
                            <View style={styles.summaryItem}>
                                <Ionicons name="walk" size={20} color="#0066CC" />
                                <Text style={styles.summaryLabel}>Pieszo</Text>
                                <Text style={styles.summaryValue}>{totalWalkingTime} min</Text>
                            </View>
                        </View>
                    </View>

                    {/* TABS */}
                    <View style={styles.tabsContainer}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'DETAILS' && styles.activeTab]}
                            onPress={() => setActiveTab('DETAILS')}
                        >
                            <Ionicons
                                name="list"
                                size={18}
                                color={activeTab === 'DETAILS' ? '#0066CC' : '#718096'}
                            />
                            <Text style={[styles.tabText, activeTab === 'DETAILS' && styles.activeTabText]}>
                                Lista
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'MAP' && styles.activeTab]}
                            onPress={() => setActiveTab('MAP')}
                        >
                            <Ionicons
                                name="map"
                                size={18}
                                color={activeTab === 'MAP' ? '#0066CC' : '#718096'}
                            />
                            <Text style={[styles.tabText, activeTab === 'MAP' && styles.activeTabText]}>
                                Mapa
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* CONTENT */}
                <View style={styles.content}>
                    {activeTab === 'DETAILS' ? (
                        <ScrollView style={styles.detailsScroll} contentContainerStyle={styles.detailsContent}>
                            {journey.legs
                                .filter((leg, legIdx) => {
                                    // Filter out last WALK leg if it's just walking around destination station
                                    if (legIdx === journey.legs.length - 1 && leg.mode === 'WALK') {
                                        // If last leg is WALK with very short distance (<100m), it's likely just "arriving at destination"
                                        const walkDistance = leg.distance || 0;
                                        if (walkDistance < 100) return false; // Skip this leg
                                    }
                                    return true;
                                })
                                .map((leg, idx, filteredLegs) => (
                                    <LegDetail
                                        key={idx}
                                        leg={leg}
                                        isLast={idx === filteredLegs.length - 1}
                                    />
                                ))
                            }
                        </ScrollView>
                    ) : (
                        <View style={styles.mapContainer}>
                            <RouteMapView
                                journey={journey}
                                showIntermediateStops={true}
                            />
                        </View>
                    )}
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7FAFC',
    },
    header: {
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        paddingBottom: 16,
        paddingTop: Platform.OS === 'ios' ? 50 : 0,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerTitle: {
        fontSize: tfs(18),
        fontFamily: 'Poppins-Bold',
        color: '#1A202C',
        flex: 1,
        textAlign: 'center',
    },
    backButton: {
        padding: 8,
        width: 40,
    },
    summaryCard: {
        backgroundColor: '#F7FAFC',
        marginHorizontal: 16,
        marginVertical: 12,
        borderRadius: 12,
        padding: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    summaryItem: {
        alignItems: 'center',
        gap: 4,
    },
    summaryLabel: {
        fontSize: tfs(11),
        fontFamily: 'Poppins-Medium',
        color: '#718096',
        textTransform: 'uppercase',
    },
    summaryValue: {
        fontSize: tfs(16),
        fontFamily: 'Poppins-Bold',
        color: '#1A202C',
    },
    summaryDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#E2E8F0',
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingBottom: 0,
        justifyContent: 'center',
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginRight: 16,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#0066CC',
    },
    tabText: {
        fontSize: tfs(15),
        fontWeight: '600',
        color: '#718096',
        marginLeft: 6,
    },
    activeTabText: {
        color: '#0066CC',
    },
    content: {
        flex: 1,
    },
    detailsScroll: {
        flex: 1,
    },
    detailsContent: {
        padding: 16,
        paddingBottom: 40,
    },
    mapContainer: {
        flex: 1,
        backgroundColor: '#E2E8F0',
    }
});
