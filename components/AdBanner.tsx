import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { AdService, Ad } from '@/services/AdService';

interface AdBannerProps {
    position: 'home_feed' | 'article_top' | 'article_middle' | 'article_bottom';
    style?: any;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

import { Dimensions, ScrollView } from 'react-native';

export const AdBanner: React.FC<AdBannerProps> = ({ position, style }) => {
    const [ads, setAds] = useState<Ad[]>([]);
    const [mode, setMode] = useState<'random' | 'slider'>('random');
    const [aspectRatio, setAspectRatio] = useState(3);
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            try {
                const [fetchedAds, settings] = await Promise.all([
                    AdService.getAdsByPosition(position),
                    AdService.getAdSettings()
                ]);

                if (isMounted) {
                    setAds(fetchedAds);
                    setMode(settings.rotation_mode);
                }
            } catch (e) {
                // Silently fail - ads are optional
            }
        };

        fetchData();

        return () => { isMounted = false; };
    }, [position]);

    // Auto-play for slider
    useEffect(() => {
        if (mode === 'slider' && ads.length > 1) {
            const interval = setInterval(() => {
                setActiveIndex(current => (current + 1) % ads.length);
            }, 5000); // 5s slide
            return () => clearInterval(interval);
        }
    }, [mode, ads.length]);

    // Memoize the random ad unconditionally
    const randomAd = React.useMemo(() => {
        if (ads.length === 0) return null;
        return ads[Math.floor(Math.random() * ads.length)];
    }, [ads]);

    if (ads.length === 0) return null;

    if (mode === 'random') {
        if (!randomAd) return null;

        return (
            <View style={[styles.container, style]}>
                <SingleAdView ad={randomAd} aspectRatio={aspectRatio} onAspectRatio={(r) => setAspectRatio(r)} />
            </View>
        );
    } else {
        // Slider Mode
        return (
            <View style={[styles.container, style]}>
                {/* We render just the active index for simplicity, or we could use a real ScrollView. 
                    Given "Slider" implies movement, a fading transition or simple switch is easiest without complex libs.
                    The user said "Slider", usually implies movement. 
                    Let's use a simple View that switches content based on timer. 
                    To make it act like a real slider we would need Paging, but handling dynamic aspect ratios in a slider is tricky.
                    Simple "Slideshow" (fading/switching) acts like a Slider for ads usually.
                */}
                <SingleAdView
                    ad={ads[activeIndex]}
                    aspectRatio={aspectRatio}
                    onAspectRatio={(r) => setAspectRatio(r)}
                />

                {/* Dots indicator */}
                {ads.length > 1 && (
                    <View style={styles.dotsContainer}>
                        {ads.map((_, i) => (
                            <View
                                key={i}
                                style={[styles.dot, i === activeIndex && styles.activeDot]}
                            />
                        ))}
                    </View>
                )}
            </View>
        );
    }
};

const SingleAdView = ({ ad, aspectRatio, onAspectRatio }: { ad: Ad, aspectRatio: number, onAspectRatio: (r: number) => void }) => {
    const handlePress = () => {
        if (ad.linkUrl) {
            Linking.openURL(ad.linkUrl).catch(err => console.error('Failed to open ad link:', err));
        }
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.9}
            accessibilityLabel="Reklama"
            accessibilityRole="link"
            style={{ width: '100%' }}
        >
            <ExpoImage
                source={{ uri: ad.imageUrl }}
                style={[styles.image, { aspectRatio }]}
                contentFit="cover"
                transition={500}
                onLoad={(e) => {
                    const { width, height } = e.source;
                    if (width && height) {
                        onAspectRatio(width / height);
                    }
                }}
            />
            <View style={styles.adLabelContainer}>
                <Text style={styles.adLabel}>Reklama</Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        alignSelf: 'stretch',
        marginVertical: 12,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#f1f5f9',
        elevation: 1,
        position: 'relative' // for dots
    },
    image: {
        width: '100%',
        borderRadius: 12,
    },
    adLabelContainer: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    adLabel: {
        fontSize: 8,
        color: '#fff',
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    dotsContainer: {
        position: 'absolute',
        bottom: 8,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.5)'
    },
    activeDot: {
        backgroundColor: '#fff',
        width: 8,
        height: 8,
        borderRadius: 4
    }
});
