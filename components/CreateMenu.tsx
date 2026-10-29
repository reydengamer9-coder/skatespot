import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';

type Option = { emoji: string; title: string; subtitle: string; href: Href };

/** Botón "+" flotante que abre el menú para crear sesiones, parques o trucos. */
export function CreateMenu({ parkId }: { parkId?: string | null }) {
  const [open, setOpen] = useState(false);
  const park = parkId ? { parkId } : {};

  const options: Option[] = [
    {
      emoji: '🔴',
      title: 'Empezar sesión ahora',
      subtitle: 'Avisa que estás patinando y que se unan',
      href: { pathname: '/meetup/new', params: { mode: 'now', ...park } },
    },
    {
      emoji: '📅',
      title: 'Programar sesión',
      subtitle: 'Elige día, hora, tipo y nivel',
      href: { pathname: '/meetup/new', params: { mode: 'later', ...park } },
    },
    { emoji: '📍', title: 'Agregar skatepark', subtitle: 'Registra el parque donde estás', href: '/park/new' },
    {
      emoji: '🎥',
      title: 'Subir truco',
      subtitle: 'Foto o video de hasta 60 s',
      href: { pathname: '/post/new', params: park },
    },
  ];

  return (
    <>
      <Pressable style={styles.fab} onPress={() => setOpen(true)}>
        <Icon ios="plus" material="add" color={colors.accentText} size={30} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.heading}>¿Qué quieres crear?</Text>
            {options.map((o) => (
              <Pressable
                key={o.title}
                style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.border }]}
                onPress={() => {
                  setOpen(false);
                  router.push(o.href);
                }}>
                <Text style={styles.emoji}>{o.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{o.title}</Text>
                  <Text style={styles.subtitle}>{o.subtitle}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing,
    bottom: spacing,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing,
    paddingBottom: spacing * 2,
    gap: 6,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  heading: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 6 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: radius },
  emoji: { fontSize: 26 },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 13 },
});
