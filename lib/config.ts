// Configuración pública de Supabase.
// La anon key es pública por diseño (viaja en la app de cada usuario); los datos
// están protegidos por las políticas RLS de supabase/schema.sql.
// NUNCA pongas aquí la service_role key ni la secret key.
export const SUPABASE_URL = 'https://xsqunbpeevrtraspqjqw.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcXVuYnBlZXZydHJhc3BxanF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMjk4NjMsImV4cCI6MjEwODgwNTg2M30.q8cPQ4mOCRy4z3riCmJj4t6FDlV4GCr3f74yWRUxkFk';


// Estilo del mapa (OpenFreeMap: gratis, código abierto, sin key ni límites).
// Otros estilos: liberty (tipo Google Maps), bright, positron, fiord → https://openfreemap.org/quick_start/
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';
