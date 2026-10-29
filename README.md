# 🛹 SkateSpot

App móvil (Android/iOS) **y** página web para encontrar skateparks cercanos y hacer comunidad:

- 🗺️ **Mapa oscuro** con todos los skateparks (agrupados al alejar el zoom) y lista por radio (10 / 50 / 200 km), con "Cómo llegar" en Google Maps
- 🇺🇸 **Todos los skateparks de EE. UU.** precargados desde OpenStreetMap, y los de otras zonas al navegar el mapa
- ➕ **Agregar skateparks** con foto, desde el propio parque
- 💬 **Chat en tiempo real**: canal general + un chat por cada skatepark
- 🔴 **Sesiones en vivo**: burbuja con quién patina ahora y botón Unirse; programa sesiones por tipo, nivel y duración
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
4. En **Project Settings → API** copia la *Project URL* y la *anon public key* y pégalas en [`lib/config.ts`](lib/config.ts).

## 3. Correr el proyecto en tu computadora

```bash
git clone https://github.com/TU-USUARIO/skatespot.git
cd skatespot
npm install
npm run web            # abre la web en el navegador
npm start              # escanea el QR con Expo Go en tu celular
```

## 4. Publicar la web en Vercel

1. Sube el código a GitHub.
2. En [vercel.com/new](https://vercel.com/new) importa el repositorio `skatespot`.
3. **Deploy** (no hacen falta variables de entorno: la configuración pública está en `lib/config.ts`). `vercel.json` ya define el build (`npx expo export -p web`) y la carpeta `dist`.
4. En Supabase → **Authentication → URL Configuration** pon tu dominio de Vercel como *Site URL*.

## 5. Usar SkateSpot como app en el celular

**Opción A — Instalar la web (Android y iPhone, al instante)**
- **Android (Chrome):** abre la web → menú ⋮ → **Instalar app** (o *Agregar a pantalla de inicio*).
- **iPhone (Safari):** abre la web → botón **Compartir** → **Agregar a inicio**.

Queda con su icono, abre a pantalla completa y se actualiza sola con cada `git push`.

**Opción B — Probar la app nativa con Expo Go**
Instala **Expo Go** en el celular, corre `npm start` en la computadora y escanea el QR
(el celular y la computadora deben estar en la misma red Wi-Fi).

**Opción C — APK de Android (app nativa instalable)**
```bash
npx eas-cli@latest login
```
```bash
npx eas-cli@latest build -p android --profile preview
```
La primera vez pregunta si crear el proyecto en Expo y la clave de firma: responde que sí a todo.
Al terminar (10–20 min) da un enlace/QR para descargar el `.apk` e instalarlo.
Gratis con límite mensual de builds. Play Store: 25 USD (pago único). App Store: 99 USD/año.

## 6. Importar todos los skateparks de Estados Unidos

Una GitHub Action descarga de OpenStreetMap todos los skateparks de EE. UU. (estado por estado)
y los guarda en Supabase, para que el mapa los muestre al instante. Se repite sola cada mes.

1. En Supabase → **Project Settings → API Keys** copia la **service_role** key (o una *secret key*).
   ⚠️ Es privada: no la pegues en el código ni la compartas.
2. En GitHub → tu repo → **Settings → Secrets and variables → Actions → New repository secret**:
   nombre `SUPABASE_SERVICE_ROLE_KEY`, valor la clave del paso 1.
3. En GitHub → **Actions → Importar skateparks → Run workflow**. Deja *states* vacío para todos los
   estados o escribe algunos, por ejemplo `CA NY TX`. Tarda unos minutos.

También se puede correr en tu computadora: `SUPABASE_SERVICE_ROLE_KEY=... npm run import:skateparks -- CA`
(añade `--dry-run` para ver cuántos encontraría sin guardar nada).

## Estructura

```
app/                  Pantallas (cada archivo es una ruta)
  (tabs)/             Parques · Trucos · Sesiones · Chat · Perfil
  park/[id].tsx       Detalle del skatepark
  park/new.tsx        Registrar skatepark
  chat/[room].tsx     Chat de un parque
  meetup/new.tsx      Crear sesión
  post/new.tsx        Subir truco
  login.tsx           Entrar / registrarse
components/           UI reutilizable (tarjetas, chat, video, selector de parque)
lib/                  Supabase, sesión, ubicación, subida de archivos
supabase/schema.sql   Base de datos completa
scripts/              Importación masiva de skateparks desde OpenStreetMap
```

## Límites del plan gratis

- **Supabase:** 500 MB de base de datos y 1 GB de archivos. Los videos llenan rápido el espacio; al crecer conviene comprimirlos o usar Cloudflare Stream / Mux.
- **Vercel Hobby:** gratis para proyectos personales, no comerciales.

## Próximas ideas

- Notificaciones push (mensajes, recordatorio de encuentros)
- Seguir a otros skaters
- Reportar contenido / moderación

## Créditos de datos

- Skateparks importados de [OpenStreetMap](https://www.openstreetmap.org/copyright) © colaboradores de OpenStreetMap, licencia ODbL, consultados con la [Overpass API](https://overpass-api.de).
- Mapa: [MapLibre GL](https://maplibre.org) + [OpenFreeMap](https://openfreemap.org).
- ¿Falta un skatepark? Agrégalo en la app o directamente en OpenStreetMap (etiqueta `leisure=pitch` + `sport=skateboard`) y le sirve a todo el mundo.

