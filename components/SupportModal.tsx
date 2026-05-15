import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Linking,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Image,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Image as ExpoImage } from 'expo-image';
import { X, Check, ArrowRight, ArrowRightLeft } from 'lucide-react-native';
import { useSupportStore } from '@/store/supportStore';

// Coffee illustration reused from Next.js CoffeeCTA — kółko + dwa kubki w jednym
// PNG, dokładnie ten sam asset co na kaszuby24.pl/_next/image/?url=%2Fkawa.png.
const KAWA_IMG = 'https://kaszuby24.pl/_next/image/?url=%2Fkawa.png&w=256&q=75';

// Payment-method logos serwowane z fundacja.twojewspomnienia.pl/public — te same
// pliki widać na webowym /wspieraj. ExpoImage obsługuje SVG natywnie od v3+.
const LOGO_BLIK = 'https://fundacja.twojewspomnienia.pl/logo-blik.png';
const LOGO_VISA = 'https://fundacja.twojewspomnienia.pl/logo-visa.svg';
const LOGO_MASTERCARD = 'https://fundacja.twojewspomnienia.pl/logo-mastercard.svg';

// Backend endpoint (server.js w `/root/apps/react/twojewspomnienia`). Tpay API
// auth & webhooks pozostają po stronie fundacji — apka tylko składa request
// z kwotą + metodą + danymi płatnika i albo (a) odpala BLIK bezpośrednio,
// albo (b) przekazuje redirectUrl Tpay-a do in-app browsera.
const API_BASE = 'https://fundacja.twojewspomnienia.pl';
const ACCENT = '#fecc00';
const ACCENT_DARK = '#e6b800';
const TEXT_PRIMARY = '#111827';
const TEXT_SECONDARY = '#6b7280';
const BORDER = '#e5e7eb';

type PayMode = 'one' | 'monthly';
type PayMethod = 'blik' | 'card' | 'bank' | 'mblik';

const AMOUNTS = [20, 50, 100, 200, 500];

// Method shown depends on mode: one-time → blik / card / bank; monthly → only
// recurring BLIK alias (Tpay groupId 150 with alias UID).
const oneTimeMethods: { value: PayMethod; label: string }[] = [
  { value: 'blik', label: 'BLIK' },
  { value: 'card', label: 'Karta' },
  { value: 'bank', label: 'Przelew' },
];

// Wycieliłem renderowanie logotypów żeby JSX dla metod płatności był czytelny.
// Każda metoda ma własną kompozycję — BLIK to jeden PNG, karta to dwa SVG
// (Visa + MC) obok siebie, przelew nie ma marki więc lucide-icon.
function MethodLogo({ value }: { value: PayMethod }) {
  if (value === 'blik' || value === 'mblik') {
    return (
      <ExpoImage
        source={LOGO_BLIK}
        style={{ width: 56, height: 28 }}
        contentFit="contain"
      />
    );
  }
  if (value === 'card') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 28 }}>
        <ExpoImage source={LOGO_VISA} style={{ width: 36, height: 20 }} contentFit="contain" />
        <ExpoImage source={LOGO_MASTERCARD} style={{ width: 28, height: 20 }} contentFit="contain" />
      </View>
    );
  }
  // bank / przelew
  return <ArrowRightLeft size={26} color="#9ca3af" strokeWidth={1.5} />;
}

export default function SupportModal() {
  const isOpen = useSupportStore((s) => s.isOpen);
  const hide = useSupportStore((s) => s.hide);

  const [type, setType] = useState<PayMode>('one');
  const [amount, setAmount] = useState<number>(50);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [showCustom, setShowCustom] = useState(false);
  const [method, setMethod] = useState<PayMethod>('blik');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [blikCode, setBlikCode] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Method auto-select when switching mode: monthly only supports BLIK alias.
  useEffect(() => {
    if (type === 'monthly') setMethod('mblik');
    else if (method === 'mblik') setMethod('blik');
  }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveAmount = useMemo(() => {
    if (showCustom) {
      const n = parseFloat(customAmount.replace(',', '.'));
      return isFinite(n) && n > 0 ? n : 0;
    }
    return amount;
  }, [amount, customAmount, showCustom]);

  const resetForm = () => {
    setType('one');
    setAmount(50);
    setCustomAmount('');
    setShowCustom(false);
    setMethod('blik');
    setName('');
    setEmail('');
    setBlikCode('');
    setConsent(false);
    setErrorMsg(null);
    setSubmitting(false);
  };

  const handleClose = () => {
    if (submitting) return; // nie ucinaj transakcji w trakcie
    hide();
    // Reset zostawiamy do następnego otwarcia — user pewnie poprawi błąd.
  };

  const formatBlik = (raw: string) => raw.replace(/\D/g, '').slice(0, 6);
  const displayBlik = (digits: string) =>
    digits.length > 3 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : digits;

  const validate = (): string | null => {
    if (!effectiveAmount || effectiveAmount <= 0) return 'Podaj kwotę wsparcia.';
    if (effectiveAmount < 5) return 'Minimalna kwota to 5 zł.';
    if (!consent) return 'Zaakceptuj regulamin Tpay i politykę prywatności.';
    if (!name.trim()) return 'Podaj imię i nazwisko.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Podaj poprawny adres e-mail.';
    if ((method === 'blik' || method === 'mblik') && blikCode.length !== 6) return 'Wpisz 6-cyfrowy kod BLIK.';
    return null;
  };

  const submit = async () => {
    setErrorMsg(null);
    const err = validate();
    if (err) {
      setErrorMsg(err);
      return;
    }
    setSubmitting(true);

    try {
      // Server akceptuje payment.type === 'monthly' | 'one-time'. paymentMethod
      // dla monthly to wciąż 'blik' (alias rejestrowany w pierwszej transakcji).
      const apiMethod: 'blik' | 'card' | 'bank' = method === 'mblik' ? 'blik' : method;
      const apiType = type === 'monthly' ? 'monthly' : 'one-time';

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(`${API_BASE}/api/create-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          amount: effectiveAmount,
          type: apiType,
          paymentMethod: apiMethod,
          payer: { name: name.trim(), email: email.trim() },
          blikCode: apiMethod === 'blik' ? blikCode : undefined,
        }),
      });
      clearTimeout(timeout);

      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        setErrorMsg(data?.error || 'Błąd serwera. Spróbuj ponownie.');
        setSubmitting(false);
        return;
      }

      // Karta / przelew → Tpay paywall (3DS, bank picker). Otwieramy in-app
      // Safari VC / Chrome Custom Tab — user nie wychodzi do natywnej przeglądarki.
      if (data.redirectUrl) {
        hide();
        try {
          await WebBrowser.openAuthSessionAsync(
            data.redirectUrl,
            `${API_BASE}/wspieraj?status=success`,
          );
        } catch {
          // fallback do system browsera jeśli z jakiegoś powodu się nie udało
          Linking.openURL(data.redirectUrl).catch(() => {});
        }
        resetForm();
        return;
      }

      // BLIK z kodem — Tpay przyjął i czeka na potwierdzenie w aplikacji bankowej.
      hide();
      Alert.alert(
        'Potwierdź w aplikacji bankowej',
        'Otwórz aplikację swojego banku i zatwierdź płatność BLIK. Dziękujemy za wsparcie!',
        [{ text: 'OK' }],
      );
      resetForm();
    } catch (e: any) {
      const msg =
        e?.name === 'AbortError'
          ? 'Serwer nie odpowiada. Spróbuj ponownie za chwilę.'
          : 'Błąd połączenia. Sprawdź internet i spróbuj ponownie.';
      setErrorMsg(msg);
      setSubmitting(false);
    }
  };

  const blikDisplay = displayBlik(blikCode);

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Image
              source={{ uri: KAWA_IMG }}
              style={styles.headerLogo}
              resizeMode="contain"
              accessibilityLabel="Kawa redakcji"
            />
            <Text style={styles.title}>Wesprzyj nas</Text>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn} hitSlop={12}>
            <X size={24} color={TEXT_PRIMARY} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.intro}>
              Pomagasz nam tworzyć portale, filmy dokumentalne i wspierać lokalne inicjatywy.
              Darowizna odliczalna od podatku.
            </Text>

            {/* One-time / monthly */}
            <View style={styles.toggleRow}>
              {(['one', 'monthly'] as PayMode[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.toggleBtn, type === t && styles.toggleBtnActive]}
                  onPress={() => setType(t)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.toggleLabel, type === t && styles.toggleLabelActive]}>
                    {t === 'one' ? 'Jednorazowo' : 'Co miesiąc'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Amount */}
            <Text style={styles.label}>Kwota wsparcia</Text>
            <View style={styles.amountGrid}>
              {AMOUNTS.map((a) => {
                const active = !showCustom && amount === a;
                return (
                  <TouchableOpacity
                    key={a}
                    style={[styles.amountBtn, active && styles.amountBtnActive]}
                    onPress={() => {
                      setShowCustom(false);
                      setAmount(a);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.amountText, active && styles.amountTextActive]}>{a} zł</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[styles.amountBtn, showCustom && styles.amountBtnActive]}
                onPress={() => setShowCustom(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.amountText, showCustom && styles.amountTextActive]}>Inna</Text>
              </TouchableOpacity>
            </View>
            {showCustom && (
              <View style={styles.customAmountWrap}>
                <TextInput
                  style={styles.customAmountInput}
                  placeholder="Wpisz kwotę"
                  placeholderTextColor={TEXT_SECONDARY}
                  keyboardType="number-pad"
                  value={customAmount}
                  onChangeText={(v) => setCustomAmount(v.replace(/[^\d.,]/g, ''))}
                  editable={!submitting}
                />
                <Text style={styles.currencySuffix}>zł</Text>
              </View>
            )}

            {/* Method */}
            <Text style={styles.label}>Metoda płatności</Text>
            {type === 'one' ? (
              <View style={styles.methodRow}>
                {oneTimeMethods.map((m) => {
                  const active = method === m.value;
                  return (
                    <TouchableOpacity
                      key={m.value}
                      style={[styles.methodBtn, active && styles.methodBtnActive]}
                      onPress={() => setMethod(m.value)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.methodLogoSlot}>
                        <MethodLogo value={m.value} />
                      </View>
                      <Text style={[styles.methodLabel, active && styles.methodLabelActive]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View>
                <View
                  style={[
                    styles.methodBtn,
                    styles.methodBtnActive,
                    { width: '100%' },
                  ]}
                >
                  <View style={styles.methodLogoSlot}>
                    <MethodLogo value="mblik" />
                  </View>
                  <Text style={[styles.methodLabel, styles.methodLabelActive]}>BLIK cykliczny</Text>
                </View>
                <Text style={styles.hint}>
                  Wpisz kod BLIK – w aplikacji bankowej zatwierdzisz płatność i wyrazisz zgodę
                  na pobieranie kolejnych miesięcznych wpłat bez wpisywania kodu.
                </Text>
              </View>
            )}

            {/* BLIK code */}
            {(method === 'blik' || method === 'mblik') && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.label}>Kod BLIK</Text>
                <TextInput
                  style={styles.blikInput}
                  placeholder="000 000"
                  placeholderTextColor="#cbd5e1"
                  keyboardType="number-pad"
                  maxLength={7}
                  value={blikDisplay}
                  onChangeText={(v) => setBlikCode(formatBlik(v))}
                  editable={!submitting}
                />
              </View>
            )}

            {/* Payer */}
            <Text style={[styles.label, { marginTop: 16 }]}>Imię i nazwisko</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Jan Kowalski"
              placeholderTextColor={TEXT_SECONDARY}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!submitting}
            />

            <Text style={[styles.label, { marginTop: 12 }]}>E-mail</Text>
            <TextInput
              style={styles.textInput}
              placeholder="jan@example.pl"
              placeholderTextColor={TEXT_SECONDARY}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!submitting}
            />

            {/* Consent */}
            <TouchableOpacity
              style={styles.consentRow}
              onPress={() => setConsent((c) => !c)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, consent && styles.checkboxActive]}>
                {consent && <Check size={14} color={TEXT_PRIMARY} strokeWidth={3} />}
              </View>
              <Text style={styles.consentText}>
                Akceptuję{' '}
                <Text style={styles.link} onPress={() => Linking.openURL('https://tpay.com/regulamin')}>
                  Regulamin serwisu Tpay
                </Text>
                {' '}oraz{' '}
                <Text style={styles.link} onPress={() => Linking.openURL(`${API_BASE}/polityka-prywatnosci.html`)}>
                  Politykę prywatności
                </Text>
                {' '}Fundacji „Twoje Wspomnienia".
              </Text>
            </TouchableOpacity>

            {errorMsg && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.payBtn, submitting && styles.payBtnDisabled]}
              onPress={submit}
              disabled={submitting}
              activeOpacity={0.9}
            >
              {submitting ? (
                <>
                  <ActivityIndicator size="small" color={TEXT_PRIMARY} />
                  <Text style={styles.payBtnLabel}>Przetwarzanie…</Text>
                </>
              ) : (
                <>
                  <Text style={styles.payBtnLabel}>
                    Wesprzyj{effectiveAmount ? ` kwotą ${effectiveAmount} zł` : ''}
                  </Text>
                  <ArrowRight size={18} color={TEXT_PRIMARY} />
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.footer}>
              Płatności obsługuje <Text style={{ fontWeight: '700' }}>Tpay</Text> · SSL · bezpieczna transmisja
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogo: { width: 36, height: 36 },
  title: { fontFamily: 'Poppins_SemiBold', fontSize: 18, color: TEXT_PRIMARY },
  closeBtn: { padding: 8, marginRight: -8 },
  scroll: { padding: 20, paddingBottom: 40 },
  intro: {
    fontFamily: 'Poppins_Regular',
    fontSize: 13,
    color: TEXT_SECONDARY,
    lineHeight: 20,
    marginBottom: 20,
  },

  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleLabel: { fontFamily: 'Poppins_SemiBold', fontSize: 13, color: TEXT_SECONDARY },
  toggleLabelActive: { color: TEXT_PRIMARY },

  label: { fontFamily: 'Poppins_SemiBold', fontSize: 13, color: '#1f2937', marginBottom: 10 },

  amountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  amountBtn: {
    width: '31%',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: BORDER,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  amountBtnActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  amountText: { fontFamily: 'Poppins_SemiBold', fontSize: 13, color: '#374151' },
  amountTextActive: { color: TEXT_PRIMARY, fontFamily: 'Poppins_Bold' },

  customAmountWrap: {
    position: 'relative',
    marginTop: 4,
    marginBottom: 12,
  },
  customAmountInput: {
    borderWidth: 2,
    borderColor: ACCENT,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingRight: 40,
    fontFamily: 'Poppins_SemiBold',
    fontSize: 14,
    color: TEXT_PRIMARY,
  },
  currencySuffix: {
    position: 'absolute',
    right: 14,
    top: 14,
    fontFamily: 'Poppins_Medium',
    fontSize: 13,
    color: TEXT_SECONDARY,
  },

  methodRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  methodBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    gap: 6,
    minHeight: 78,
  },
  methodBtnActive: {
    borderColor: ACCENT,
    backgroundColor: '#fffbeb',
  },
  methodLogoSlot: {
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodLabel: { fontFamily: 'Poppins_Medium', fontSize: 11, color: TEXT_SECONDARY },
  methodLabelActive: { color: TEXT_PRIMARY },
  hint: {
    fontFamily: 'Poppins_Regular',
    fontSize: 11,
    color: TEXT_SECONDARY,
    marginTop: 8,
    lineHeight: 16,
  },

  blikInput: {
    borderWidth: 2,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: 'Poppins_SemiBold',
    fontSize: 22,
    color: TEXT_PRIMARY,
    textAlign: 'center',
    letterSpacing: 6,
  },

  textInput: {
    borderWidth: 2,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Poppins_Regular',
    fontSize: 14,
    color: TEXT_PRIMARY,
  },

  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 16,
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxActive: { borderColor: ACCENT, backgroundColor: ACCENT },
  consentText: {
    flex: 1,
    fontFamily: 'Poppins_Regular',
    fontSize: 12,
    color: TEXT_SECONDARY,
    lineHeight: 18,
  },
  link: { color: '#374151', textDecorationLine: 'underline' },

  errorBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  errorText: { fontFamily: 'Poppins_Medium', fontSize: 13, color: '#991b1b' },

  payBtn: {
    marginTop: 20,
    backgroundColor: ACCENT,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  payBtnDisabled: { opacity: 0.7 },
  payBtnLabel: { fontFamily: 'Poppins_Bold', fontSize: 15, color: TEXT_PRIMARY },

  footer: {
    fontFamily: 'Poppins_Regular',
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 16,
  },
});
