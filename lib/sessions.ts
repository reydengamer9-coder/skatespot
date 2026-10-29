import { supabase } from './supabase';
import type { Meetup, SessionLevel, SessionType } from './types';

export const MEETUP_SELECT = '*, skateparks(name, lat, lng), profiles(username), meetup_attendees(user_id)';

export const SESSION_TYPES: { value: SessionType; label: string; emoji: string }[] = [
  { value: 'street', label: 'Street', emoji: '🛹' },
  { value: 'bowl', label: 'Bowl', emoji: '🥣' },
  { value: 'park', label: 'Park', emoji: '🏗️' },
  { value: 'principiantes', label: 'Principiantes', emoji: '🐣' },
  { value: 'game_of_skate', label: 'Game of SKATE', emoji: '🎯' },
  { value: 'filmacion', label: 'Filmación', emoji: '🎥' },
];

export const SESSION_LEVELS: { value: SessionLevel; label: string }[] = [
  { value: 'todos', label: 'Todos los niveles' },
  { value: 'principiante', label: 'Principiante' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzado', label: 'Avanzado' },
];

export const DURATIONS = [60, 120, 180, 240];

export const sessionTypeInfo = (t: SessionType) => SESSION_TYPES.find((s) => s.value === t) ?? SESSION_TYPES[0];
export const levelLabel = (l: SessionLevel) => SESSION_LEVELS.find((s) => s.value === l)?.label ?? l;

export const endsAt = (m: Pick<Meetup, 'starts_at' | 'duration_minutes'>) =>
  new Date(new Date(m.starts_at).getTime() + m.duration_minutes * 60000);

/** Una sesión está "en vivo" entre su inicio y su fin. */
export function isLive(m: Pick<Meetup, 'starts_at' | 'duration_minutes'>, now = new Date()) {
  return new Date(m.starts_at) <= now && endsAt(m) > now;
}

export function minutesLeft(m: Pick<Meetup, 'starts_at' | 'duration_minutes'>) {
  return Math.max(0, Math.round((endsAt(m).getTime() - Date.now()) / 60000));
}

/** Sesiones en vivo ahora y próximas (las que no han terminado), ordenadas por inicio. */
export async function fetchSessions(parkId?: string): Promise<{ live: Meetup[]; upcoming: Meetup[] }> {
  // Ninguna sesión dura más de 12 h, así que basta con mirar desde hace 12 h.
  let query = supabase
    .from('meetups')
    .select(MEETUP_SELECT)
    .gte('starts_at', new Date(Date.now() - 12 * 3600000).toISOString())
    .order('starts_at')
    .limit(100);
  if (parkId) query = query.eq('park_id', parkId);
  const { data } = await query;
  const now = new Date();
  const active = ((data ?? []) as Meetup[]).filter((m) => endsAt(m) > now);
  return {
    live: active.filter((m) => isLive(m, now)),
    upcoming: active.filter((m) => new Date(m.starts_at) > now),
  };
}

/** Apuntarse o salirse de una sesión. Devuelve la nueva lista de asistentes. */
export async function toggleAttendance(meetup: Meetup, userId: string, attendees: string[]) {
  const going = attendees.includes(userId);
  const { error } = going
    ? await supabase.from('meetup_attendees').delete().match({ meetup_id: meetup.id, user_id: userId })
    : await supabase.from('meetup_attendees').insert({ meetup_id: meetup.id, user_id: userId });
  if (error) throw error;
  return going ? attendees.filter((id) => id !== userId) : [...attendees, userId];
}
