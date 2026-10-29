# 🛹 SkateSpot

App móvil (Android/iOS) **y** página web para encontrar skateparks cercanos y hacer comunidad:

- 📍 **Parques cercanos** según tu ubicación (5 / 25 / 100 km), con "Cómo llegar" en Google Maps
- ➕ **Agregar skateparks** con foto, desde el propio parque
- 💬 **Chat en tiempo real**: canal general + un chat por cada skatepark
- 📅 **Encuentros**: arma sesiones en un parque, apúntate o sal
- 🎥 **Trucos**: sube fotos y videos (máx. 60 s) y da likes
- 👤 **Perfil** con avatar, bio y tus trucos

Un solo código para las tres plataformas.

## Stack (todo gratis para empezar)

| Pieza | Herramienta | Para qué |
|---|---|---|
| Editor | [VS Code](https://code.visualstudio.com/) | Escribir el código |
| App | [Expo](https://expo.dev) (React Native + Expo Router) | Móvil y web con el mismo código |
| Backend | [Supabase](https://supabase.com) | Login, base de datos (PostGIS), chat en tiempo real, fotos/videos |
| Código | [GitHub](https://github.com) | Guardar y versionar el proyecto |
| Web | [Vercel](https://vercel.com) | Publicar la web; se vuelve a publicar con cada `git push` |
| Celular | [Expo Go](https://expo.dev/go) / EAS Build | Probar en tu teléfono y generar el APK |

## 1. Requisitos

- [Node.js 22+](https://nodejs.org), [Git](https://git-scm.com) y [VS Code](https://code.visualstudio.com/)
- Cuentas gratis en GitHub, Supabase y Vercel

## 2. Configurar Supabase (backend)

1. Crea un proyecto en [supabase.com/dashboard](https://supabase.com/dashboard).
2. Ve a **SQL Editor → New query**, pega todo [`supabase/schema.sql`](supabase/schema.sql) y pulsa **Run**.
   Crea las tablas, la seguridad (RLS), el chat en tiempo real y el bucket `media` para fotos/videos.
3. (Opcional, para pruebas) En **Authentication → Providers → Email** desactiva *Confirm email*.
4. En **Project Settings → API** copia la *Project URL* y la *anon public key*.

## 3. Correr el proyecto en tu computadora

```bash
git clone https://github.com/TU-USUARIO/skatespot.git
cd skatespot
npm install
cp .env.example .env   # pega ahí tu URL y anon key de Supabase
npm run web            # abre la web en el navegador
npm start              # escanea el QR con Expo Go en tu celular
```

## 4. Publicar la web en Vercel

1. Sube el código a GitHub.
2. En [vercel.com/new](https://vercel.com/new) importa el repositorio `skatespot`.
3. En **Environment Variables** agrega `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
4. **Deploy**. `vercel.json` ya define el build (`npx expo export -p web`) y la carpeta `dist`.
5. En Supabase → **Authentication → URL Configuration** pon tu dominio de Vercel como *Site URL*.

## 5. App para Android / iOS

- **Probar:** `npm start` y escanea el QR con **Expo Go**.
- **Generar APK** (gratis con límites mensuales):
  ```bash
  npx eas-cli@latest build -p android --profile preview
  ```
  Publicar en Play Store cuesta 25 USD (pago único); App Store 99 USD/año.

## Estructura

```
app/                  Pantallas (cada archivo es una ruta)
  (tabs)/             Parques · Trucos · Encuentros · Chat · Perfil
  park/[id].tsx       Detalle del skatepark
  park/new.tsx        Registrar skatepark
  chat/[room].tsx     Chat de un parque
  meetup/new.tsx      Crear encuentro
  post/new.tsx        Subir truco
  login.tsx           Entrar / registrarse
components/           UI reutilizable (tarjetas, chat, video, selector de parque)
lib/                  Supabase, sesión, ubicación, subida de archivos
supabase/schema.sql   Base de datos completa
```

## Límites del plan gratis

- **Supabase:** 500 MB de base de datos y 1 GB de archivos. Los videos llenan rápido el espacio; al crecer conviene comprimirlos o usar Cloudflare Stream / Mux.
- **Vercel Hobby:** gratis para proyectos personales, no comerciales.

## Próximas ideas

- Mapa interactivo de skateparks
- Notificaciones push (mensajes, recordatorio de encuentros)
- Seguir a otros skaters
- Reportar contenido / moderación
