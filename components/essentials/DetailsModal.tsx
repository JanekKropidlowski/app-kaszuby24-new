import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { BlurView } from 'expo-blur';
import { X } from 'lucide-react-native';

interface DetailsModalProps {
    selectedItem: any;
    selectedType: string | null;
    onClose: () => void;
}

export const DetailsModal: React.FC<DetailsModalProps> = ({ selectedItem, selectedType, onClose }) => {
    return (
        <Modal visible={!!selectedItem} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <BlurView intensity={100} tint="light" style={styles.modalContent}>
                    <TouchableOpacity style={styles.closeModal} onPress={onClose}>
                        <X size={24} color="#000" />
                    </TouchableOpacity>
                    <ScrollView>
                        {selectedItem && (
                            <>
                                <Text style={styles.modalTitle}>
                                    {selectedItem.nazwa_swd || selectedItem.nazwa_schronu || selectedItem.name || 'Szczegóły'}
                                </Text>

                                {/* Medical Details */}
                                {selectedType === 'medical' && (
                                    <View>
                                        <Text style={styles.modalSub}>{selectedItem.adr_lok_miejsc}, {selectedItem.adr_lok_ulica}</Text>
                                        <View style={styles.infoBox}>
                                            <Text style={styles.infoLabel}>Czas oczekiwania (Triaż):</Text>
                                            <Text style={styles.infoValue}>~45 min (Mock)</Text>
                                        </View>
                                    </View>
                                )}

                                {/* Shelter Details */}
                                {selectedType === 'shelter' && (
                                    <View>
                                        <Text style={styles.modalSub}>{selectedItem.adres}</Text>
                                        <View style={styles.tagRow}>
                                            <View style={styles.tag}><Text style={styles.tagText}>{selectedItem.typ_obiektu}</Text></View>
                                            <View style={styles.tag}><Text style={styles.tagText}>Pojemność: {selectedItem.pojemnosc}</Text></View>
                                        </View>
                                        <Text style={[styles.modalSub, { marginTop: 10 }]}>Wyposażenie:</Text>
                                        <Text style={styles.desc}>
                                            {selectedItem.wyposazenie ? selectedItem.wyposazenie.join(', ') : 'Brak danych'}
                                        </Text>
                                    </View>
                                )}

                                {/* AED Details */}
                                {selectedType === 'aed' && (
                                    <View>
                                        <Text style={styles.modalSub}>Defibrylator AED</Text>
                                        <Text style={styles.desc}>Dostępny publicznie. W razie nagłego zatrzymania krążenia użyj natychmiast.</Text>
                                    </View>
                                )}
                            </>
                        )}
                    </ScrollView>
                </BlurView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        minHeight: 300,
        maxHeight: '60%',
    },
    closeModal: {
        alignSelf: 'flex-end',
        marginBottom: 10,
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
    modalSub: { fontSize: 14, color: '#64748B', marginBottom: 10 },
    desc: { fontSize: 13, color: '#334155' },
    infoBox: { padding: 12, backgroundColor: '#F1F5F9', borderRadius: 12 },
    infoLabel: { fontSize: 12, color: '#64748B' },
    infoValue: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
    tagRow: { flexDirection: 'row', gap: 10 },
    tag: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#E0F2FE', borderRadius: 8 },
    tagText: { fontSize: 12, color: '#0369A1', fontWeight: '600' }
});
