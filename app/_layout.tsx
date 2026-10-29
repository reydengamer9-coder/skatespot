import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Loading } from '@/components/ui';
import { colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/lib/auth';

export { ErrorBoundary } from 'expo-router';

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.card, primary: colors.accent, border: colors.border },
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider value={theme}>
        <StatusBar style="light" />
        <RootNav />
      </ThemeProvider>
    </AuthProvider>
  );
}

function RootNav() {
  const { session, loading } = useAuth();
  if (loading) return <Loading />;
  const signedIn = !!session;

  return (
    <Stack screenOptions={{ headerTintColor: colors.text, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="park/[id]" options={{ title: 'Skatepark' }} />
        <Stack.Screen name="park/new" options={{ title: 'Nuevo skatepark', presentation: 'modal' }} />
        <Stack.Screen name="chat/[room]" options={{ title: 'Chat' }} />
        <Stack.Screen name="meetup/new" options={{ title: 'Nueva sesión', presentation: 'modal' }} />
        <Stack.Screen name="post/new" options={{ title: 'Subir truco', presentation: 'modal' }} />
      </Stack.Protected>
    </Stack>
  );
}
