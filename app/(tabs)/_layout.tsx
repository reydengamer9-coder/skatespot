import { Tabs } from 'expo-router';

import { Icon } from '@/components/ui';
import { colors } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Parques',
          tabBarIcon: ({ color }) => <Icon ios="map" material="map" color={color} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Trucos',
          tabBarIcon: ({ color }) => <Icon ios="play.rectangle" material="video_library" color={color} />,
        }}
      />
      <Tabs.Screen
        name="meetups"
        options={{
          title: 'Sesiones',
          tabBarIcon: ({ color }) => <Icon ios="calendar" material="event" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => <Icon ios="bubble.left.and.bubble.right" material="forum" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <Icon ios="person.crop.circle" material="account_circle" color={color} />,
        }}
      />
    </Tabs>
  );
}
