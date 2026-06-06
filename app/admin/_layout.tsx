import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAdminStore } from '@/store/adminStore';

export default function AdminLayout() {
  const router = useRouter();
  const segments = useSegments();
  const token = useAdminStore((s) => s.token);

  useEffect(() => {
    const onLoginScreen = segments[segments.length - 1] === 'login';
    if (!token && !onLoginScreen) {
      router.replace('/admin/login');
    }
  }, [token, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="index" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="calendar" />
      <Stack.Screen name="fb" />
      <Stack.Screen name="push" />
      <Stack.Screen name="articles/index" />
      <Stack.Screen name="articles/[id]" />
      <Stack.Screen name="articles/new" />
    </Stack>
  );
}
