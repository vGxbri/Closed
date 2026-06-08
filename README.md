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

## Requisitos

- Node.js
- Expo CLI
- Una cuenta de Supabase con el esquema configurado

## Instalación

```bash
npm install
```

Crea un archivo `.env` en la raíz con tus credenciales de Supabase:

```
EXPO_PUBLIC_SUPABASE_URL=tu_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

## Arrancar

```bash
npx expo start
```

