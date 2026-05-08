import React, { useEffect, useMemo, useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ActivityIndicator,
    Alert, FlatList, StyleSheet, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Home, Building2, ChevronRight, Search, X as CloseIcon, MapPin } from 'lucide-react-native';
import { wasteScheduleService, BuildingResult } from '@/services/WasteScheduleService';

type Theme = {
    colors: {
        primary: string; primaryDark?: string; accent?: string;
        background: string; card: string; text: string;
        textSecondary: string; border: string;
    };
};

type Props = {
    citySlug: string;
    cityName: string;
    theme: Theme;
    onPicked: (regionId: number, label: { dzielnica: string; ulica: string; numer: string; zabudowa: string }) => void;
};

// Font family wrapper — Poppins is loaded globally in _layout.tsx but Text
// elements don't auto-inherit. Use these as base styles for all text.
const FONT_REGULAR = { fontFamily: 'Poppins_Regular' as const };
const FONT_MEDIUM = { fontFamily: 'Poppins_Medium' as const };
const FONT_SEMIBOLD = { fontFamily: 'Poppins_SemiBold' as const };
const FONT_BOLD = { fontFamily: 'Poppins_Bold' as const };

// Cascade picker for "search" mode cities (Gdynia).
// Each field is a tappable button that opens a fullscreen modal with search +
// FlatList — no inline autocomplete, no keyboard occlusion.
export default function WasteCascadePicker({ citySlug, cityName, theme, onPicked }: Props) {
    const [dzielnice, setDzielnice] = useState<string[]>([]);
    const [streets, setStreets] = useState<string[]>([]);
    const [numbers, setNumbers] = useState<string[]>([]);
    const [buildings, setBuildings] = useState<BuildingResult[]>([]);

    const [selDzielnica, setSelDzielnica] = useState('');
    const [selStreet, setSelStreet] = useState('');
    const [selNumber, setSelNumber] = useState('');

    const [pickerOpen, setPickerOpen] = useState<null | 'dzielnica' | 'ulica' | 'numer'>(null);
    const [pickerQuery, setPickerQuery] = useState('');

    const [loading, setLoading] = useState(false);
    const [gpsLoading, setGpsLoading] = useState(false);

    useEffect(() => { wasteScheduleService.getDzielnice(citySlug).then(setDzielnice); }, [citySlug]);

    useEffect(() => {
        if (!selDzielnica) {
            setStreets([]); setSelStreet(''); setNumbers([]); setSelNumber(''); setBuildings([]);
            return;
        }
        setLoading(true);
        wasteScheduleService.getStreetsInDzielnica(citySlug, selDzielnica)
            .then(setStreets).finally(() => setLoading(false));
        setSelStreet(''); setNumbers([]); setSelNumber(''); setBuildings([]);
    }, [citySlug, selDzielnica]);

    useEffect(() => {
        if (!selStreet) { setNumbers([]); setSelNumber(''); setBuildings([]); return; }
        setLoading(true);
        wasteScheduleService.getNumbers(citySlug, selDzielnica, selStreet)
            .then(setNumbers).finally(() => setLoading(false));
        setSelNumber(''); setBuildings([]);
    }, [citySlug, selDzielnica, selStreet]);

    useEffect(() => {
        if (!selNumber) { setBuildings([]); return; }
        setLoading(true);
        wasteScheduleService.getBuildings(citySlug, selDzielnica, selStreet, selNumber)
            .then((b) => {
                setBuildings(b);
                if (b.length === 1) {
                    onPicked(b[0].region_id, {
                        dzielnica: selDzielnica, ulica: selStreet, numer: selNumber,
                        zabudowa: b[0].zabudowa,
                    });
                }
            })
            .finally(() => setLoading(false));
    }, [citySlug, selDzielnica, selStreet, selNumber]);

    const modalData = useMemo(() => {
        const q = pickerQuery.trim().toLowerCase();
        let list: string[] = [];
        if (pickerOpen === 'dzielnica') list = dzielnice;
        else if (pickerOpen === 'ulica') list = streets;
        else if (pickerOpen === 'numer') list = numbers;
        if (!q) return list;
        if (pickerOpen === 'numer') return list.filter((n) => n.toLowerCase().startsWith(q));
        return list.filter((s) => s.toLowerCase().includes(q));
    }, [pickerOpen, pickerQuery, dzielnice, streets, numbers]);

    function openPicker(which: 'dzielnica' | 'ulica' | 'numer') {
        setPickerOpen(which); setPickerQuery('');
    }
    function closePicker() { setPickerOpen(null); setPickerQuery(''); }
    function applyPicked(value: string) {
        if (pickerOpen === 'dzielnica') setSelDzielnica(value);
        else if (pickerOpen === 'ulica') setSelStreet(value);
        else if (pickerOpen === 'numer') setSelNumber(value);
        closePicker();
    }

    const useMyLocation = async () => {
        setGpsLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Brak uprawnień', 'Musisz zezwolić na dostęp do lokalizacji.');
                setGpsLoading(false); return;
            }
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const reverse = await Location.reverseGeocodeAsync({
                latitude: loc.coords.latitude, longitude: loc.coords.longitude,
            });
            if (!reverse?.length) {
                Alert.alert('Nie znaleziono', 'Nie udało się ustalić Twojego adresu.');
                setGpsLoading(false); return;
            }
            const r = reverse[0];
            const cityFromGps = (r.city || r.subregion || '').toLowerCase();
            if (!cityFromGps.includes('gdyni')) {
                Alert.alert('Inne miasto', `GPS wskazuje "${r.city}". Wybierz adres ręcznie.`);
                setGpsLoading(false); return;
            }
            const districtRaw = (r.district || r.subregion || '').toUpperCase();
            const matchDz = dzielnice.find((d) => districtRaw.includes(d) || d.includes(districtRaw));
            if (matchDz) {
                setSelDzielnica(matchDz);
                if (r.street) {
                    setTimeout(async () => {
                        const ss = await wasteScheduleService.getStreetsInDzielnica(citySlug, matchDz);
                        const matchSt = ss.find((s) => s.toLowerCase().includes((r.street || '').toLowerCase()));
                        if (matchSt) {
                            setStreets(ss); setSelStreet(matchSt);
                            if (r.streetNumber) {
                                const nn = await wasteScheduleService.getNumbers(citySlug, matchDz, matchSt);
                                setNumbers(nn);
                                const matchNr = nn.find((n) => n === r.streetNumber);
                                if (matchNr) setSelNumber(matchNr);
                            }
                        }
                    }, 300);
                }
            } else {
                Alert.alert('Wykryto pozycję', `GPS: ${r.district || r.city}. Wybierz dzielnicę z listy.`);
            }
        } catch (e: any) {
            console.error('[Cascade GPS]', e.message);
            Alert.alert('Błąd', 'Nie udało się pobrać lokalizacji.');
        } finally {
            setGpsLoading(false);
        }
    };

    const FieldButton = ({ label, value, placeholder, disabled, onPress, idx }: {
        label: string; value: string; placeholder: string;
        disabled?: boolean; onPress: () => void; idx: number;
    }) => (
        <View>
            <Text style={[styles.label, FONT_BOLD, { color: theme.colors.text, opacity: disabled ? 0.4 : 1 }]}>
                {idx}. {label}
            </Text>
            <TouchableOpacity
                disabled={disabled}
                onPress={onPress}
                style={[styles.field, {
                    backgroundColor: theme.colors.card,
                    borderColor: value ? theme.colors.primary : theme.colors.border,
                    borderWidth: value ? 1.5 : 1,
                    opacity: disabled ? 0.5 : 1,
                }]}
            >
                <Text style={[
                    value ? FONT_SEMIBOLD : FONT_REGULAR,
                    {
                        color: value ? theme.colors.text : theme.colors.textSecondary,
                        fontSize: 15, flex: 1,
                    },
                ]}>
                    {value || placeholder}
                </Text>
                <ChevronRight size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
        </View>
    );

    return (
        <View>
            <TouchableOpacity
                onPress={useMyLocation}
                disabled={gpsLoading}
                style={[styles.gpsBtn, { backgroundColor: theme.colors.primary + '12', borderColor: theme.colors.primary }]}
            >
                {gpsLoading
                    ? <ActivityIndicator size="small" color={theme.colors.primary} />
                    : <MapPin size={18} color={theme.colors.primary} />}
                <Text style={[FONT_SEMIBOLD, { color: theme.colors.primary, fontSize: 14 }]}>
                    {gpsLoading ? 'Lokalizuję...' : 'Użyj mojej lokalizacji (GPS)'}
                </Text>
            </TouchableOpacity>

            <Text style={[styles.helpText, FONT_REGULAR, { color: theme.colors.textSecondary }]}>
                {cityName} ma 715 rejonów — wpisz adres aby zobaczyć właściwy harmonogram.
            </Text>

            <FieldButton
                idx={1} label="Dzielnica"
                value={selDzielnica} placeholder="— wybierz dzielnicę —"
                onPress={() => openPicker('dzielnica')}
            />
            <FieldButton
                idx={2} label="Ulica"
                value={selStreet} placeholder={selDzielnica ? 'wybierz ulicę' : '— najpierw dzielnica —'}
                disabled={!selDzielnica}
                onPress={() => openPicker('ulica')}
            />
            <FieldButton
                idx={3} label="Numer"
                value={selNumber} placeholder={selStreet ? 'wybierz numer' : '— najpierw ulica —'}
                disabled={!selStreet || numbers.length === 0}
                onPress={() => openPicker('numer')}
            />

            {/* 4. Zabudowa — only when 2+ available */}
            {selNumber && buildings.length > 1 && (
                <>
                    <Text style={[styles.label, FONT_BOLD, { color: theme.colors.text }]}>4. Zabudowa</Text>
                    {buildings.map((b) => {
                        const isMulti = b.zabudowa === 'wielorodzinna';
                        const Icon = isMulti ? Building2 : Home;
                        return (
                            <TouchableOpacity
                                key={b.region_id}
                                onPress={() => onPicked(b.region_id, { dzielnica: selDzielnica, ulica: selStreet, numer: selNumber, zabudowa: b.zabudowa })}
                                style={[styles.zabudowaBtn, {
                                    backgroundColor: theme.colors.card,
                                    borderColor: isMulti ? '#F59E0B' : '#10B981',
                                }]}
                            >
                                <View style={[styles.zabudowaIcon, { backgroundColor: (isMulti ? '#F59E0B' : '#10B981') + '20' }]}>
                                    <Icon size={26} color={isMulti ? '#D97706' : '#059669'} strokeWidth={2.2} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[FONT_BOLD, { fontSize: 15, color: theme.colors.text }]}>
                                        {isMulti ? 'Wielorodzinna' : 'Jednorodzinna'}
                                    </Text>
                                    <Text style={[FONT_REGULAR, { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }]}>
                                        {isMulti ? '5 i więcej lokali w budynku' : 'Dom prywatny / segment'}
                                    </Text>
                                    <Text style={[FONT_MEDIUM, { fontSize: 11, color: theme.colors.primary, marginTop: 4 }]}>
                                        {b.region_name}
                                    </Text>
                                </View>
                                <ChevronRight size={20} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        );
                    })}
                </>
            )}

            {loading && <View style={{ padding: 16, alignItems: 'center' }}><ActivityIndicator size="small" color={theme.colors.primary} /></View>}

            {/* Universal picker modal */}
            <Modal
                visible={pickerOpen !== null}
                animationType="slide"
                onRequestClose={closePicker}
                presentationStyle="pageSheet"
            >
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.colors.background }}>
                    <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
                        <TouchableOpacity onPress={closePicker} style={{ padding: 4 }}>
                            <Text style={[FONT_SEMIBOLD, { fontSize: 16, color: theme.colors.primary }]}>Anuluj</Text>
                        </TouchableOpacity>
                        <Text style={[FONT_BOLD, { fontSize: 16, color: theme.colors.text }]}>
                            {pickerOpen === 'dzielnica' ? 'Wybierz dzielnicę' : pickerOpen === 'ulica' ? 'Wybierz ulicę' : 'Wybierz numer'}
                        </Text>
                        <View style={{ width: 56 }} />
                    </View>

                    <View style={[styles.searchBar, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
                        <Search size={20} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
                        <TextInput
                            autoFocus
                            value={pickerQuery}
                            onChangeText={setPickerQuery}
                            placeholder={pickerOpen === 'numer' ? 'np. 5, 12, 90A...' : 'Wpisz aby szukać...'}
                            placeholderTextColor={theme.colors.textSecondary}
                            keyboardType={pickerOpen === 'numer' && Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                            autoCorrect={false}
                            style={[FONT_REGULAR, { flex: 1, fontSize: 16, color: theme.colors.text, paddingVertical: 6 }]}
                        />
                        {pickerQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setPickerQuery('')}>
                                <CloseIcon size={20} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <FlatList
                        data={modalData}
                        keyExtractor={(item) => item}
                        keyboardShouldPersistTaps="handled"
                        ListHeaderComponent={() => (
                            <Text style={[FONT_REGULAR, { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, fontSize: 12, color: theme.colors.textSecondary }]}>
                                {modalData.length} {modalData.length === 1 ? 'wynik' : modalData.length < 5 ? 'wyniki' : 'wyników'}
                            </Text>
                        )}
                        renderItem={({ item }) => {
                            const isSelected = (pickerOpen === 'dzielnica' && selDzielnica === item) ||
                                (pickerOpen === 'ulica' && selStreet === item) ||
                                (pickerOpen === 'numer' && selNumber === item);
                            return (
                                <TouchableOpacity
                                    onPress={() => applyPicked(item)}
                                    style={[styles.modalItem, { borderBottomColor: theme.colors.border }]}
                                >
                                    <Text style={[isSelected ? FONT_SEMIBOLD : FONT_REGULAR, { flex: 1, fontSize: 15, color: theme.colors.text }]}>
                                        {item}
                                    </Text>
                                    {isSelected && <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />}
                                </TouchableOpacity>
                            );
                        }}
                        ListEmptyComponent={() => (
                            <View style={{ padding: 32, alignItems: 'center' }}>
                                <Text style={[FONT_REGULAR, { color: theme.colors.textSecondary, fontSize: 14, textAlign: 'center' }]}>
                                    {pickerQuery ? `Brak wyników dla "${pickerQuery}"` : 'Wpisz aby zobaczyć wyniki'}
                                </Text>
                            </View>
                        )}
                    />
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    gpsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1.5, marginBottom: 12, gap: 8 },
    helpText: { fontSize: 12, lineHeight: 18, marginBottom: 16 },
    label: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 14, marginBottom: 6 },
    field: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 14, borderRadius: 10 },
    zabudowaBtn: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1.5, marginTop: 10, gap: 12 },
    zabudowaIcon: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
    searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
    modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
});
