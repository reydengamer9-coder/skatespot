// Configuración pública de Supabase.
// La anon key es pública por diseño (viaja en la app de cada usuario); los datos
// están protegidos por las políticas RLS de supabase/schema.sql.
// NUNCA pongas aquí la service_role key ni la secret key.
export const SUPABASE_URL = 'https://xsqunbpeevrtraspqjqw.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcXVuYnBlZXZydHJhc3BxanF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMjk4NjMsImV4cCI6MjEwODgwNTg2M30.q8cPQ4mOCRy4z3riCmJj4t6FDlV4GCr3f74yWRUxkFk';

// Key de CARTO para las teselas del mapa (pública: va en la URL de cada tesela).
// Se gestiona en https://dashboard.basemaps.carto.com
export const CARTO_BASEMAPS_KEY = 'cb1_4xb2_1_3d34de0f677ae3833ac493f8';
