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
- Un dispositivo Android o emulador (para `expo run:android`)

Para instalar pnpm:

```bash
npm install -g pnpm
```

---

## Instalación

```bash
pnpm install
```

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
