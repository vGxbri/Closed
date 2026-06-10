# Closed

Closed es una aplicación móvil para grupos cerrados. La idea es tener un espacio privado donde tu grupo de amigos, pareja o familia pueda organizarse sin necesidad de saltar entre mil apps distintas.

Cada grupo tiene acceso a un conjunto de widgets que se pueden activar o desactivar según lo que necesite:

- **Archivo** — Galería compartida de fotos y vídeos
- **Mensajes** — Chat en tiempo real
- **Agenda** — Calendario de eventos compartido
- **Gastos** — Gestión de gastos compartidos con liquidación automática
- **Premios** — Sistema de votaciones y trofeos entre miembros
- **Flashback** — Cámara desechable compartida con revelado diferido
- **Bloc** — Bloc de notas compartido con editor por bloques
- **Planes** — Lista de deseos compartida (bucket list)

Desarrollado con **React Native** y **Expo**, con **Supabase** como backend (base de datos, autenticación, almacenamiento y tiempo real).

---

## Formas de probar la aplicación

Hay tres maneras de evaluar el proyecto:

| Método | Qué necesitas | Ideal para |
|--------|---------------|------------|
| **1. Instalar el APK** | El archivo `.apk` proporcionado + un móvil Android | Probar la app tal como funciona en producción, sin compilar |
| **2. Compilar desde el código** | Este repositorio + el archivo `.env` | Revisar el código, modificarlo o ejecutarlo en desarrollo |
| **3. Consultar la base de datos** | El archivo `database/schema.sql` | Ver tablas, relaciones, funciones, triggers y políticas RLS |

---

## Requisitos (para compilar desde el código)

- **Node.js** (LTS recomendado)
- **pnpm** — el proyecto usa pnpm, no npm
- **Expo CLI** (se invoca con `npx expo`)
- **EAS CLI** (solo si quieres generar un APK tú mismo): `npm install -g eas-cli`
- Un dispositivo Android o emulador (para `expo run:android`)
- Opcional: cuenta de [Expo](https://expo.dev) si vas a usar EAS Build

Para instalar pnpm:

```bash
npm install -g pnpm
```

---

## Instalación

```bash
pnpm install
```

### Variables de entorno

Copia el archivo `.env` que se te ha proporcionado a la raíz del proyecto. Si no lo tienes, créalo con este formato:

```
EXPO_PUBLIC_SUPABASE_URL=tu_url_de_supabase
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=tu_google_web_client_id
```

> **Importante:** Sin el `.env` la app no podrá conectarse a la base de datos. El archivo `.env` no está en el repositorio por seguridad.

---

## Arrancar en desarrollo

```bash
pnpm start
```

Esto abre el servidor de desarrollo de Expo. Desde ahí puedes:

- Escanear el QR con **Expo Go** (funcionalidad limitada; algunos módulos nativos requieren dev client)
- Pulsar `a` para abrir en emulador Android (si tienes uno configurado)

Para compilar y ejecutar directamente en Android (dev client):

```bash
pnpm android
```

---

## Generar un APK con EAS Build

El proyecto ya tiene configurado el perfil `preview` en `eas.json` para generar un APK instalable en Android.

### Requisitos

1. Tener EAS CLI instalado y sesión iniciada:

```bash
npm install -g eas-cli
eas login
```

2. Configurar las variables de entorno en EAS (solo la primera vez, o si cambian):

```bash
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "tu_url"
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "tu_anon_key"
eas secret:create --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value "tu_client_id"
```

3. Lanzar el build:

```bash
eas build --profile preview --platform android
```

El build se ejecuta en los servidores de Expo. Al terminar (unos 10–15 minutos), recibirás un enlace para descargar el `.apk`. Ese archivo se puede instalar directamente en cualquier Android (habilitando "Instalar apps de orígenes desconocidos" si hace falta).

> **Nota:** Las variables `EXPO_PUBLIC_*` se incluyen en el binario en el momento del build. Si cambias credenciales, hay que generar un APK nuevo.

---

## Base de datos

El esquema completo de la base de datos está en [`database/schema.sql`](database/schema.sql). Incluye:

- 21 tablas (perfiles, grupos, widgets, mensajes, eventos, gastos, premios, flashback, etc.)
- Tipos enum, índices y relaciones
- 3 vistas (`group_members_view`, `awards_with_stats`, `messages_view`)
- Funciones y triggers (creación automática de perfil, widgets por defecto, conteo de votos, etc.)
- Políticas de Row Level Security (RLS)
- Buckets de Storage y sus políticas
- Datos semilla de los 7 widgets

La base de datos en producción está desplegada en **Supabase**. Para compilar y ejecutar la app solo necesitas las credenciales del `.env`; no hace falta levantar la BD localmente.

---

## Estructura del proyecto

```
app/           → Pantallas (Expo Router)
components/    → Componentes de UI
services/      → Capa de acceso a datos (Supabase)
hooks/         → Lógica de estado React
lib/           → Cliente Supabase, utilidades
types/         → Tipos TypeScript
database/      → Esquema SQL de referencia
```

---

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `pnpm start` | Servidor de desarrollo Expo |
| `pnpm android` | Compilar y ejecutar en Android |
| `pnpm ios` | Compilar y ejecutar en iOS (macOS) |
| `pnpm lint` | Ejecutar ESLint |
