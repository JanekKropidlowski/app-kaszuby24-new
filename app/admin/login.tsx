import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Lock, Mail, ArrowLeft } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { useAdminStore } from '@/store/adminStore';
import { login } from '@/services/adminApi';

export default function AdminLoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useThemeStore();
  const setAuth = useAdminStore((s) => s.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Błąd', 'Podaj email i hasło');
      return;
    }
    setLoading(true);
    try {
      const res = await login(email.trim(), password);
      if (res.data.success) {
        setAuth(res.data.token, res.data.user);
        router.replace('/admin');
      } else {
        Alert.alert('Błąd logowania', res.data.message || 'Nieprawidłowe dane');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Błąd połączenia z serwerem';
      Alert.alert('Błąd logowania', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary }]}>
            <Lock size={28} color="#fff" />
          </View>
          <Text style={[styles.title, { color: theme.colors.text, fontFamily: 'Poppins_SemiBold' }]}>
            Panel admina
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary, fontFamily: 'Poppins_Regular' }]}>
            Zaloguj się danymi z panel.kaszuby24.pl
          </Text>
        </View>

        <View style={styles.form}>
          <View style={[styles.inputWrapper, { backgroundColor: theme.colors.subtle, borderColor: theme.colors.border }]}>
            <Mail size={18} color={theme.colors.textSecondary} />
            <TextInput
              style={[styles.input, { color: theme.colors.text, fontFamily: 'Poppins_Regular' }]}
              placeholder="Email lub nazwa użytkownika"
              placeholderTextColor={theme.colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
          </View>

          <View style={[styles.inputWrapper, { backgroundColor: theme.colors.subtle, borderColor: theme.colors.border }]}>
            <Lock size={18} color={theme.colors.textSecondary} />
            <TextInput
              style={[styles.input, { color: theme.colors.text, fontFamily: 'Poppins_Regular' }]}
              placeholder="Hasło"
              placeholderTextColor={theme.colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: theme.colors.primary, opacity: loading ? 0.7 : 1 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.loginBtnText, { fontFamily: 'Poppins_SemiBold' }]}>Zaloguj się</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24 },
  backBtn: { alignSelf: 'flex-start', padding: 4, marginBottom: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  title: { fontSize: 22, marginBottom: 6 },
  subtitle: { fontSize: 13, textAlign: 'center' },
  form: { gap: 14 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
  },
  input: { flex: 1, fontSize: 15 },
  loginBtn: {
    borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  loginBtnText: { color: '#fff', fontSize: 16 },
});
