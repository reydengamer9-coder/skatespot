import { Link, Stack } from 'expo-router';

import { Screen, Title } from '@/components/ui';
import { colors } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Ups' }} />
      <Screen style={{ alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Title>Esta pantalla no existe</Title>
        <Link href="/" style={{ color: colors.accent, fontSize: 16 }}>
          Ir al inicio
        </Link>
      </Screen>
    </>
  );
}
