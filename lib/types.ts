export type Profile = {
  id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
};

export type Skatepark = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  lat: number;
  lng: number;
  photo_url: string | null;
  distance_km?: number;
};

export type Message = {
  id: number;
  park_id: string | null;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: Pick<Profile, 'username' | 'avatar_url'> | null;
};

export type SessionType = 'street' | 'bowl' | 'park' | 'principiantes' | 'game_of_skate' | 'filmacion';
export type SessionLevel = 'todos' | 'principiante' | 'intermedio' | 'avanzado';

export type Meetup = {
  id: string;
  park_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  duration_minutes: number;
  session_type: SessionType;
  level: SessionLevel;
  created_by: string;
  skateparks?: Pick<Skatepark, 'name' | 'lat' | 'lng'> | null;
  profiles?: Pick<Profile, 'username'> | null;
  meetup_attendees?: { user_id: string }[];
};

export type MediaType = 'image' | 'video';

export type Post = {
  id: string;
  user_id: string;
  park_id: string | null;
  caption: string | null;
  media_url: string;
  media_type: MediaType;
  created_at: string;
  profiles?: Pick<Profile, 'username' | 'avatar_url'> | null;
  skateparks?: Pick<Skatepark, 'name'> | null;
  post_likes?: { user_id: string }[];
};
