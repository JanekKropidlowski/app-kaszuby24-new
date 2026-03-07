import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LucideIcon } from 'lucide-react-native';

interface ServiceCardProps {
    title: string;
    subtitle?: string;
    icon: LucideIcon | any;
    onPress: () => void;
    color?: string;
    stat?: string;
    statColor?: string;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
    title,
    subtitle,
    icon: Icon,
    onPress,
    color = '#4B5563',
    stat,
    statColor = '#10B981'
}) => {
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.cardContainer}>
            <BlurView intensity={30} tint="light" style={styles.blurContainer}>
                <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
                    <Icon size={24} color={color} />
                </View>

                <View style={styles.textContainer}>
                    <Text style={styles.title}>{title}</Text>
                    {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                </View>

                {stat && (
                    <View style={[styles.statBadge, { backgroundColor: `${statColor}20` }]}>
                        <Text style={[styles.statText, { color: statColor }]}>{stat}</Text>
                    </View>
                )}
            </BlurView>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    blurContainer: {
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
        fontFamily: 'Poppins_Bold',
    },
    subtitle: {
        fontSize: 12,
        color: '#6B7280',
        fontFamily: 'Poppins_Regular',
        marginTop: 2,
    },
    statBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statText: {
        fontSize: 12,
        fontWeight: '600',
        fontFamily: 'Poppins_SemiBold',
    }
});
