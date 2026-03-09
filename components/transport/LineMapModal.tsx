import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface LineMapModalProps {
    visible: boolean;
    onClose: () => void;
    lineNumber: string;
    lineName: string;
    agency: string;
}

interface Stop {
    stop_name: string;
    stop_lat: number;
    stop_lon: number;
    sequence?: number;
}

interface Shape {
    id: string;
    points: Array<{ lat: number; lon: number }>;
}

export const LineMapModal: React.FC<LineMapModalProps> = ({ visible, onClose, lineNumber, lineName, agency }) => {
    const [stops, setStops] = useState<Stop[]>([]);
    const [shapes, setShapes] = useState<Shape[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const mapRef = useRef<MapView>(null);
    const fitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (visible && lineNumber) {
            fetchLineData();
        }
        return () => {
            if (fitTimeoutRef.current) clearTimeout(fitTimeoutRef.current);
        };
    }, [visible, lineNumber]);

    const fetchLineData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Pobierz dane linii (przystanki)
            const lineUrl = `https://kaszuby24.pl/wp-json/kaszuby24/v2/mzk-line?line=${lineNumber}&day=today`;
            const lineRes = await fetch(lineUrl);
            if (!lineRes.ok) throw new Error('Błąd pobierania danych linii');

            const lineData = await lineRes.json();

            // Wyciągnij przystanki
            const stopsData: Stop[] = lineData.stops?.map((stop: any) => ({
                stop_name: stop.stop_name,
                stop_lat: stop.stop_lat,
                stop_lon: stop.stop_lon,
                sequence: stop.sequence || 0
            })) || [];

            setStops(stopsData);

            // Pobierz shapes
            const shapesUrl = `https://kaszuby24.pl/wp-json/kaszuby24/v2/shapes?agency=${agency}`;
            const shapesRes = await fetch(shapesUrl);
            if (shapesRes.ok) {
                const shapesData = await shapesRes.json();
                setShapes(shapesData || []);
            }

            // Wyśrodkuj mapę na przystankach
            if (stopsData.length > 0 && mapRef.current) {
                fitTimeoutRef.current = setTimeout(() => {
                    mapRef.current?.fitToCoordinates(
                        stopsData.map(s => ({ latitude: s.stop_lat, longitude: s.stop_lon })),
                        {
                            edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
                            animated: true
                        }
                    );
                }, 500);
            }

        } catch (e) {
            console.error('[LineMap] Error:', e);
            setError('Nie udało się pobrać danych trasy');
        } finally {
            setIsLoading(false);
        }
    };

    const getLineColor = () => {
        if (agency === 'mzk_wejherowo') return '#1A237E'; // Navy
        if (agency === 'skm') return '#FFD54F'; // Yellow
        return '#1A6ADD'; // Blue for others
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableOpacity 
                    style={styles.backdrop} 
                    onPress={onClose} 
                    activeOpacity={1}
                />
                <View style={styles.content}>
                    <View style={styles.handle} />

                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>Linia {lineNumber}</Text>
                            <Text style={styles.subtitle}>{lineName}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color="#718096" />
                        </TouchableOpacity>
                    </View>

                    {isLoading ? (
                        <View style={styles.centered}>
                            <ActivityIndicator size="large" color="#1A237E" />
                            <Text style={styles.loadingText}>Ładowanie mapy...</Text>
                        </View>
                    ) : error ? (
                        <View style={styles.centered}>
                            <MaterialCommunityIcons name="alert-circle-outline" size={40} color="#EF4444" />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : (
                        <MapView
                            ref={mapRef}
                            style={styles.map}
                            provider={PROVIDER_GOOGLE}
                            initialRegion={{
                                latitude: 54.6,
                                longitude: 18.4,
                                latitudeDelta: 0.3,
                                longitudeDelta: 0.3
                            }}
                        >
                            {/* SHAPES - Trasa linii */}
                            {shapes.map((shape, idx) => (
                                <Polyline
                                    key={`shape-${idx}`}
                                    coordinates={shape.points.map(p => ({
                                        latitude: p.lat,
                                        longitude: p.lon
                                    }))}
                                    strokeColor={getLineColor()}
                                    strokeWidth={6}
                                    lineCap="round"
                                    lineJoin="round"
                                />
                            ))}

                            {/* PRZYSTANKI */}
                            {stops.map((stop, idx) => {
                                const isFirst = idx === 0;
                                const isLast = idx === stops.length - 1;

                                return (
                                    <Marker
                                        key={`stop-${idx}`}
                                        coordinate={{
                                            latitude: stop.stop_lat,
                                            longitude: stop.stop_lon
                                        }}
                                        anchor={{ x: 0.5, y: 0.5 }}
                                        tracksViewChanges={false}
                                    >
                                        <View style={[
                                            styles.stopMarker,
                                            isFirst && styles.stopMarkerFirst,
                                            isLast && styles.stopMarkerLast
                                        ]}>
                                            {(isFirst || isLast) && (
                                                <Ionicons 
                                                    name={isFirst ? "play" : "stop"} 
                                                    size={12} 
                                                    color="#FFF" 
                                                />
                                            )}
                                        </View>
                                    </Marker>
                                );
                            })}
                        </MapView>
                    )}

                    <View style={styles.legend}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, styles.stopMarkerFirst]} />
                            <Text style={styles.legendText}>Początek</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, styles.stopMarker]} />
                            <Text style={styles.legendText}>Przystanek</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, styles.stopMarkerLast]} />
                            <Text style={styles.legendText}>Koniec</Text>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        justifyContent: 'flex-end' 
    },
    backdrop: { 
        ...StyleSheet.absoluteFillObject 
    },
    content: { 
        backgroundColor: '#FFF', 
        borderTopLeftRadius: 24, 
        borderTopRightRadius: 24, 
        height: '85%',
        overflow: 'hidden'
    },
    handle: { 
        width: 40, 
        height: 4, 
        backgroundColor: '#EDF2F7', 
        borderRadius: 2, 
        alignSelf: 'center', 
        marginTop: 12,
        marginBottom: 16 
    },
    header: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: 20,
        marginBottom: 16
    },
    title: { 
        fontSize: 20, 
        fontFamily: 'Poppins-Bold', 
        color: '#1A202C' 
    },
    subtitle: { 
        fontSize: 13, 
        fontFamily: 'Poppins-Medium', 
        color: '#718096',
        marginTop: 2
    },
    closeBtn: { 
        padding: 4 
    },
    map: {
        flex: 1
    },
    centered: { 
        flex: 1,
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: 40 
    },
    loadingText: { 
        marginTop: 10, 
        color: '#A0AEC0',
        fontFamily: 'Poppins-Medium'
    },
    errorText: { 
        marginTop: 10, 
        color: '#EF4444', 
        textAlign: 'center',
        fontFamily: 'Poppins-Medium'
    },
    stopMarker: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#FFF',
        borderWidth: 3,
        borderColor: '#1A237E',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5
    },
    stopMarkerFirst: {
        backgroundColor: '#48BB78',
        borderColor: '#48BB78',
        width: 24,
        height: 24,
        borderRadius: 12
    },
    stopMarkerLast: {
        backgroundColor: '#F56565',
        borderColor: '#F56565',
        width: 24,
        height: 24,
        borderRadius: 12
    },
    legend: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: '#F7FAFC',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0'
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 6
    },
    legendText: {
        fontSize: 11,
        fontFamily: 'Poppins-Medium',
        color: '#4A5568'
    }
});
