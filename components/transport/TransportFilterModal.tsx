import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Animated, Dimensions, Switch, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { height } = Dimensions.get('window');

interface TransportFilterModalProps {
    visible: boolean;
    onClose: () => void;
    onApply: (filters: SearchFilters) => void;
    currentFilters: SearchFilters;
}

const tfs = (size: number) => (Platform.OS === 'android' ? Math.max(9, size - 3) : size);

export interface SearchFilters {
    sortMode: 'convenience' | 'optimal' | 'fast'; // Wygodne, Optymalne, Szybkie
    noTransfers: boolean; // Unikaj przesiadek
    transportModes: {
        tram: boolean;
        bus: boolean;
        trolley: boolean;
        rail: boolean;
    };
}

export const TransportFilterModal = ({ visible, onClose, onApply, currentFilters }: TransportFilterModalProps) => {
    const [filters, setFilters] = useState<SearchFilters>(currentFilters);
    const slideAnim = useRef(new Animated.Value(height)).current;

    // Sync internal state when modal opens
    useEffect(() => {
        if (visible) {
            setFilters(currentFilters);
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                damping: 20,
                stiffness: 90
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: height,
                duration: 250,
                useNativeDriver: true
            }).start();
        }
    }, [visible]);

    const handleApply = () => {
        onApply(filters);
        onClose();
    };

    const toggleMode = (mode: keyof SearchFilters['transportModes']) => {
        setFilters(prev => ({
            ...prev,
            transportModes: {
                ...prev.transportModes,
                [mode]: !prev.transportModes[mode]
            }
        }));
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                {/* Backdrop */}
                <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1}>
                    <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
                </TouchableOpacity>

                {/* Modal Content */}
                <Animated.View style={[styles.modalContainer, { transform: [{ translateY: slideAnim }] }]}>
                    <View style={styles.header}>
                        <View style={styles.dragHandle} />
                        <View style={styles.headerRow}>
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close" size={24} color="#1A202C" />
                            </TouchableOpacity>
                            <Text style={styles.title}>Połączenie</Text>
                            <TouchableOpacity onPress={() => setFilters(currentFilters)}>
                                <Text style={styles.resetText}>Resetuj</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.content}>
                        {/* Sort Mode Cards */}
                        <View style={styles.modeRow}>
                            <TouchableOpacity
                                style={[styles.modeCard, filters.sortMode === 'convenience' && styles.modeCardActive]}
                                onPress={() => setFilters(prev => ({ ...prev, sortMode: 'convenience' }))}
                            >
                                <Ionicons name="accessibility" size={24} color={filters.sortMode === 'convenience' ? '#1A202C' : '#718096'} />
                                <Text style={[styles.modeText, filters.sortMode === 'convenience' && styles.modeTextActive]}>Wygodne</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modeCard, filters.sortMode === 'optimal' && styles.modeCardActive]}
                                onPress={() => setFilters(prev => ({ ...prev, sortMode: 'optimal' }))}
                            >
                                <Ionicons name="walk" size={24} color={filters.sortMode === 'optimal' ? '#1A202C' : '#718096'} />
                                <Text style={[styles.modeText, filters.sortMode === 'optimal' && styles.modeTextActive]}>Optymalne</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modeCard, filters.sortMode === 'fast' && styles.modeCardActive]}
                                onPress={() => setFilters(prev => ({ ...prev, sortMode: 'fast' }))}
                            >
                                <Ionicons name="flash" size={24} color={filters.sortMode === 'fast' ? '#1A202C' : '#718096'} />
                                <Text style={[styles.modeText, filters.sortMode === 'fast' && styles.modeTextActive]}>Szybkie</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.description}>
                            {filters.sortMode === 'convenience' && 'Mniej przesiadek i chodzenia'}
                            {filters.sortMode === 'optimal' && 'Zbalansowane połączenie'}
                            {filters.sortMode === 'fast' && 'Najszybsze dotarcie do celu'}
                        </Text>

                        {/* Toggle: Avoid transfers */}
                        <View style={styles.toggleRow}>
                            <Text style={styles.sectionTitle}>Unikaj przesiadek</Text>
                            <Switch
                                value={filters.noTransfers}
                                onValueChange={(val) => setFilters(prev => ({ ...prev, noTransfers: val }))}
                                trackColor={{ false: '#E2E8F0', true: '#FFB300' }}
                            />
                        </View>

                        {/* Transport Modes Grid */}
                        <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>Środki transportu</Text>
                        <View style={styles.transportGrid}>
                            <TransportToggle
                                label="Tramwaje"
                                icon="tram"
                                active={filters.transportModes.tram}
                                onPress={() => toggleMode('tram')}
                            />
                            <TransportToggle
                                label="Autobusy"
                                icon="bus"
                                active={filters.transportModes.bus}
                                onPress={() => toggleMode('bus')}
                            />
                            <TransportToggle
                                label="Trolejbusy"
                                icon="bus-outline" // Proxy
                                active={filters.transportModes.trolley}
                                onPress={() => toggleMode('trolley')}
                            />
                            <TransportToggle
                                label="Pociągi"
                                icon="train"
                                active={filters.transportModes.rail}
                                onPress={() => toggleMode('rail')}
                            />
                        </View>

                        <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
                            <Text style={styles.applyButtonText}>Gotowe</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const TransportToggle = ({ label, icon, active, onPress }: { label: string, icon: any, active: boolean, onPress: () => void }) => (
    <TouchableOpacity style={[styles.transportToggle, active && styles.transportToggleActive]} onPress={onPress}>
        <Ionicons name={icon} size={28} color="#2D3748" />
        <Text style={styles.transportLabel}>{label}</Text>
        <View style={[styles.checkbox, active && styles.checkboxActive]}>
            {active && <Ionicons name="checkmark" size={14} color="white" />}
        </View>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContainer: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 40, // Safe area
        elevation: 20,
        shadowColor: 'black',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        height: '80%', // Occupy most of screen like screenshot
    },
    header: {
        padding: 16,
        paddingBottom: 8
    },
    dragHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#E2E8F0',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    title: {
        fontSize: tfs(18),
        fontFamily: 'Poppins-Bold',
        color: '#1A202C'
    },
    resetText: {
        fontSize: tfs(14),
        fontFamily: 'Poppins-Medium',
        color: '#718096'
    },
    content: {
        padding: 16
    },
    modeRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12
    },
    modeCard: {
        flex: 1,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        gap: 8,
        height: 90,
        justifyContent: 'center'
    },
    modeCardActive: {
        backgroundColor: '#FFD700', // Yellow
        borderColor: '#FFD700'
    },
    modeText: {
        fontSize: tfs(13),
        fontFamily: 'Poppins-Medium',
        color: '#4A5568'
    },
    modeTextActive: {
        color: '#1A202C',
        fontFamily: 'Poppins-SemiBold'
    },
    description: {
        fontSize: tfs(13),
        color: '#718096',
        textAlign: 'center',
        marginBottom: 24
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    sectionTitle: {
        fontSize: tfs(18),
        fontFamily: 'Poppins-SemiBold',
        color: '#1A202C'
    },
    transportGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12
    },
    transportToggle: {
        width: '30%',
        flexGrow: 1,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        gap: 8
    },
    transportToggleActive: {
        borderColor: '#CBD5E0',
        backgroundColor: '#F7FAFC'
    },
    transportLabel: {
        fontSize: tfs(14),
        fontFamily: 'Poppins-Regular',
        color: '#4A5568'
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        backgroundColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4
    },
    checkboxActive: {
        backgroundColor: '#FFB300'
    },
    applyButton: {
        backgroundColor: '#FFD700',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 32
    },
    applyButtonText: {
        fontSize: tfs(16),
        fontFamily: 'Poppins-Bold',
        color: '#1A202C'
    }
});
