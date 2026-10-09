# Closed

App de grupos de amigos hecha con Expo Router y React Native. Responde siempre en español.

## Entorno

- Expo SDK 57, React Native 0.86, expo-router 57, Reanimated 4.5, TypeScript 6, pnpm, Supabase.
- expo-router 57 no usa `@react-navigation`: se importa de `expo-router/react-navigation`, `expo-router/js-tabs` y `expo-router/unstable-native-tabs`.
- Se desarrolla en Windows, sin Mac y con Apple ID gratuito. Dispositivo de pruebas: iPhone 15 Pro, iOS 27, modo oscuro. Android está sin probar desde la subida de SDK y los rediseños.
- Build de iOS: `.github/workflows/ios-dev-build.yml` genera un `.ipa` de dev client sin firmar que se instala con SideStore. Se lanza a mano o al tocar el workflow, `app.json` o `pnpm-lock.yaml`.
- Cambiar dependencias nativas o `app.json` exige recompilar y reinstalar; los cambios solo de JS llegan por Fast Refresh.
- No hay `gh` CLI: las ejecuciones de Actions se consultan por la API pública de GitHub (repo `vGxbri/Closed`).

## Flujo de trabajo

1. Cada cambio va en una rama propia creada desde `main`.
2. Gabriel prueba en el iPhone con Fast Refresh. No se hace commit hasta que lo pide ("haz commit y fusiona").
3. Entonces: commits lógicos en español, fast-forward de `main`, push y borrar la rama.

Antes de dar un cambio por terminado:

```bash
npx prettier@3 --end-of-line auto --write <archivos>
npx tsc --noEmit
npx expo lint <archivos>
npx expo export --platform ios --platform android --output-dir <carpeta temporal>
```

`tsc` tiene 4 errores conocidos en `circle-loader` y el lint arrastra errores antiguos (`set-state-in-effect`, mutaciones de `.value` de Reanimated). No se tocan salvo que se pida.

Los archivos usan CRLF.

## Lenguaje de diseño

iOS primero; Android se mejora donde ayude. Accesibilidad en todo: roles, etiquetas, un único encabezado por título, áreas táctiles de 44 px.

- Verde de marca `#2A8A70`. Tipografía Archivo (`Archivo-Bold/SemiBold/Medium/Regular`) y acentos en `InstrumentSerif-Italic`.
- Tarjetas con `SquircleView`, radio 22–24, borde fino `outlineVariant` sobre `surface`.
- Listas en bloques agrupados, con separadores que empiezan después del icono o avatar. Los roles van como texto gris, no como pastillas de color.
- Fichas tintadas con `${color}1F`. Botones en cápsula. Relleno neutro: `theme.dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"`.
- Widgets: tarjeta neutra, icono grande translúcido y girado de fondo en el color del widget, contenido real encima (`components/widgets/visuals.tsx`).
- El desenfoque de fondo de diálogos y hojas se queda: gusta tal como está.
- Al rediseñar, conservar lo que ya funciona y listar siempre lo que se quita.

### Liquid Glass

- `GlassView` de `expo-glass-effect`, siempre tras `isLiquidGlassAvailable() && isGlassEffectAPIAvailable()`, con alternativa opaca.
- Cristal para controles y barras, no para tarjetas de contenido.
- Nunca animar la opacidad de un `GlassView` ni de sus padres: animar `transform` y desvanecer solo el contenido interior.
- El `Pressable` va dentro del `GlassView` interactivo.

## Trampas de iOS ya resueltas

- **Cabecera en modales**: la visibilidad de la cabecera se fija en el layout. Cambiarla desde la pantalla con `<Stack.Screen options={{ headerShown: false }} />` provoca un bucle de remontado en pantallas `presentation: "modal"`.
- **Capas sobre modales nativos**: diálogos, avisos y hojas se montan en `FullWindowOverlay` de `react-native-screens`; si no, quedan debajo del modal.
- **expo-image**: recarga la imagen en cada cambio de props. No aplicarle estilos animados; envolverla en `Animated.View`.
- **Teclado**: `KeyboardAvoidingView` calcula mal si no está en lo alto de la ventana. Usar `hooks/useKeyboardHeight` con pie fijo, o `automaticallyAdjustKeyboardInsets` en el `ScrollView`. No usar `keyboardDismissMode="on-drag"`.
- **Borde discontinuo** en `SquircleView`: no se dibuja.

## Componentes compartidos

En `components/ui/`: `CircleButton`, `FloatingTopBar`, `StepTitle`, `GroupCover`, `StatusView`, `GroupedFields`, `CTAButton`, `ConfirmDialog`, `SnackbarContext`, `BottomSheetModal`, `OptionsMenu`, `KeyboardDismissButton`, `UserAvatar`. Reutilizarlos antes de crear otros.

Los nombres de miembro son distintos en cada grupo: usar `getMemberDisplayName` de `lib/memberProfile`.

## Pendiente

- Eliminar cuenta desde la app (requisito 5.1.1 del App Store).
- Iniciar sesión con Apple: necesita cuenta de desarrollador de pago.
- Probar Android.
- Pantallas internas del grupo aún con el diseño antiguo (`createExpense` y otras).
