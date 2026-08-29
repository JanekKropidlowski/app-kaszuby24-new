import React from 'react';
import {
    Modal, View, Text, TouchableOpacity, StyleSheet, Image,
} from 'react-native';
import { useSupportStore } from '@/store/supportStore';
import { EngagementService } from '@/services/EngagementService';

const KAWA_IMG = 'https://kaszuby24.pl/_next/image/?url=%2Fkawa.png&w=256&q=75';

type Props = {
    visible: boolean;
    onClose: () => void;
};

export default function SupportPromptModal({ visible, onClose }: Props) {
    const showSupport = useSupportStore((s) => s.show);

    const handleSupport = async () => {
        await EngagementService.markSupported();
        onClose();
        // Small delay so prompt closes before payment sheet opens.
        setTimeout(() => showSupport(), 250);
    };

    const handleLater = async () => {
        await EngagementService.snooze();
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleLater}
            statusBarTranslucent
        >
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    <Image
                        source={{ uri: KAWA_IMG }}
                        style={styles.image}
                        resizeMode="contain"
                    />

                    <Text style={styles.heading}>Podoba Ci się to, co robimy?</Text>

                    <Text style={styles.body}>
                        Tworzymy lokalne media bez reklam. Jeśli nasze artykuły są dla
                        Ciebie wartościowe — postaw nam wirtualną kawę. To ogromna
                        motywacja!
                    </Text>

                    <TouchableOpacity style={styles.primaryBtn} onPress={handleSupport} activeOpacity={0.85}>
                        <Text style={styles.primaryLabel}>Postaw kawę ☕</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.secondaryBtn} onPress={handleLater} activeOpacity={0.7}>
                        <Text style={styles.secondaryLabel}>Może później</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const ACCENT = '#fecc00';
const TEXT = '#111827';
const MUTED = '#6b7280';

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        width: '100%',
        maxWidth: 380,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
        elevation: 10,
    },
    image: {
        width: 80,
        height: 80,
        marginBottom: 16,
    },
    heading: {
        fontFamily: 'Poppins_Bold',
        fontSize: 18,
        color: TEXT,
        textAlign: 'center',
        marginBottom: 10,
        lineHeight: 24,
    },
    body: {
        fontFamily: 'Poppins_Regular',
        fontSize: 13,
        color: MUTED,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    primaryBtn: {
        width: '100%',
        backgroundColor: ACCENT,
        paddingVertical: 15,
        borderRadius: 14,
        alignItems: 'center',
        marginBottom: 10,
    },
    primaryLabel: {
        fontFamily: 'Poppins_Bold',
        fontSize: 15,
        color: TEXT,
    },
    secondaryBtn: {
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    secondaryLabel: {
        fontFamily: 'Poppins_Regular',
        fontSize: 14,
        color: MUTED,
    },
});
