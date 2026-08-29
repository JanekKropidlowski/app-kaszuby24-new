import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import { TransportLine } from '@/services/transport';

interface TransportOverlayProps {
    visible: boolean;
    data: TransportLine[];
    onClose: () => void;
}

export const TransportOverlay: React.FC<TransportOverlayProps> = ({ visible, data, onClose }) => {
    if (!visible) return null;

    return (
        <View style={styles.transportOverlay}>
            <View style={styles.transportHeader}>
                <Text style={styles.transportTitle}>Tablica Odjazdów</Text>
                <TouchableOpacity onPress={onClose}>
                    <X size={20} color="#64748B" />
                </TouchableOpacity>
            </View>
            <ScrollView style={styles.transportList} nestedScrollEnabled={true}>
                {data.map((line, i) => (
                    <View key={i} style={styles.transportItem}>
                        <View style={[styles.lineBadge, { backgroundColor: line.type === 'train' ? '#3B82F6' : '#8B5CF6' }]}>
                            <Text style={styles.lineText}>{line.line}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.lineDest}>{line.direction}</Text>
                            <Text style={styles.lineOp}>{line.operator}</Text>
                        </View>
                        <Text style={styles.lineTime}>{line.nextDepartures[0]}</Text>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    transportOverlay: {
        position: 'absolute',
        top: 110,
        left: 20,
        right: 20,
        maxHeight: 250,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
        zIndex: 5,
    },
    transportHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    transportTitle: { fontWeight: 'bold', color: '#1E293B' },
    transportList: {},
    transportItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    lineBadge: {
        width: 40,
        height: 24,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    lineText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    lineDest: { fontWeight: '600', fontSize: 13, color: '#1E293B' },
    lineOp: { fontSize: 10, color: '#64748B' },
    lineTime: { fontWeight: 'bold', fontSize: 14, color: '#1E293B' },
});
