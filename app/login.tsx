import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { Body, Button, Input, Screen } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    const { error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { data: { username: username.trim() } },
          });
    setLoading(false);
    if (error) return Alert.alert('Error', error.message);
    if (mode === 'signup') Alert.alert('¡Listo!', 'Revisa tu correo si tu proyecto requiere confirmación.');
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <View style={{ alignItems: 'center', gap: 4, marginBottom: spacing }}>
          <Text style={styles.logo}>SkateSpot</Text>
          <Body muted>Encuentra parques. Arma la sesión. Sube tus trucos.</Body>
        </View>

        {mode === 'signup' && (
          <Input placeholder="Nombre de usuario" autoCapitalize="none" value={username} onChangeText={setUsername} />
        )}
        <Input
          placeholder="Correo"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Input placeholder="Contraseña" secureTextEntry value={password} onChangeText={setPassword} />

        <Button label={mode === 'login' ? 'Entrar' : 'Crear cuenta'} onPress={submit} loading={loading} />
        <Button
          variant="secondary"
          label={mode === 'login' ? '¿No tienes cuenta? Regístrate' : 'Ya tengo cuenta'}
          onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing * 1.5, gap: 12, width: '100%', maxWidth: 440, alignSelf: 'center' },
  logo: { color: colors.accent, fontSize: 40, fontWeight: '900', fontStyle: 'italic', letterSpacing: -1 },
});
