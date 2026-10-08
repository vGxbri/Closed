/**
 * Creación de grupo privado
 * Flujo guiado por pasos para definir tipo, nombre, foto y crear un nuevo grupo en Closed.
 */
import { CTAButton } from "@/components/ui/CTAButton";
import {
  KEYBOARD_DISMISS_RIGHT,
  KEYBOARD_DISMISS_SIZE,
} from "@/components/ui/KeyboardDismissButton";
import { Ionicons } from "@expo/vector-icons";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";
import Animated, {
  FadeIn,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { ParallaxCarousel } from "@/components/premade/molecules/parallax-carousel";
import { groupsService } from "@/services";

const { width } = Dimensions.get("window");

// Liquid Glass solo existe en iOS 26+; en el resto los controles son superficies opacas.
const glassAvailable = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

const ITEMS = [
  {
    image: require("../assets/images/groups/standart.jpg"),
    title: "Estándar",
    description: "Para cualquier ocasión",
  },
  {
    image: require("../assets/images/groups/trip.jpg"),
    title: "Viaje",
    description: "Aventuras compartidas",
  },
  {
    image: require("../assets/images/groups/party.jpg"),
    title: "Fiesta",
    description: "Eventos y celebraciones",
  },
  {
    image: require("../assets/images/groups/pair.jpg"),
    title: "Pareja",
    description: "Gastos de dos",
  },
];

const TOTAL_STEPS = 3;

// Altura que el teclado ocupa en pantalla, animada a su mismo ritmo.
// Solo iOS: KeyboardAvoidingView mide mal dentro de un modal y Android ya redimensiona la ventana.
function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "ios") return;

    const subscription = Keyboard.addListener(
      "keyboardWillChangeFrame",
      (event) => {
        Keyboard.scheduleLayoutAnimation(event);
        setKeyboardHeight(
          Math.max(
            0,
            Dimensions.get("window").height - event.endCoordinates.screenY,
          ),
        );
      },
    );

    return () => subscription.remove();
  }, []);

  return keyboardHeight;
}

interface StepTitleProps {
  main: string;
  accent: string;
  subtitle?: string;
}

function StepTitle({ main, accent, subtitle }: StepTitleProps) {
  const theme = useTheme();

  return (
    <View style={styles.stepTitleBlock}>
      <Text style={[styles.stepMainTitle, { color: theme.colors.onSurface }]}>
        {main}
      </Text>
      <Text style={[styles.stepAccentTitle, { color: theme.colors.primary }]}>
        {accent}
      </Text>
      <View
        style={[
          styles.titleDivider,
          { borderBottomColor: theme.colors.outlineVariant },
        ]}
      />
      {subtitle && (
        <Text
          style={[
            styles.stepSubtitle,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}

interface CircleButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  hidden?: boolean;
}

function CircleButton({ icon, label, onPress, hidden }: CircleButtonProps) {
  const theme = useTheme();

  // Se conserva el hueco para que la barra de progreso no cambie de ancho
  if (hidden) return <View style={styles.circleButton} />;

  const button = (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={styles.circleButtonPressable}
    >
      <Ionicons name={icon} size={22} color={theme.colors.onSurface} />
    </Pressable>
  );

  if (glassAvailable) {
    return (
      <GlassView style={styles.circleButton} isInteractive>
        {button}
      </GlassView>
    );
  }

  return (
    <View
      style={[
        styles.circleButton,
        styles.circleButtonSolid,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
    >
      {button}
    </View>
  );
}

export default function CreateGroupScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [maxStepReached, setMaxStepReached] = useState(1);

  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [isAnimating, setIsAnimating] = useState(false);

  const descriptionRef = useRef<TextInput>(null);
  const formScrollRef = useRef<ScrollView>(null);
  const descriptionFocused = useRef(false);

  // Mantiene la descripción a la vista mientras se escribe en ella
  const revealDescription = useCallback(() => {
    if (!descriptionFocused.current) return;
    requestAnimationFrame(() =>
      formScrollRef.current?.scrollToEnd({ animated: true }),
    );
  }, []);
  const insets = useSafeAreaInsets();
  // Alto disponible bajo el título del paso 1; el carrusel se ajusta a ese hueco
  const [carouselHeight, setCarouselHeight] = useState(0);
  const keyboardHeight = useKeyboardHeight();

  React.useEffect(() => {
    if (step > maxStepReached) {
      setMaxStepReached(step);
    }
  }, [step, maxStepReached]);

  const changeStep = useCallback(
    (newStep: number, dir: "forward" | "backward") => {
      if (isAnimating || newStep === step) return;

      setIsAnimating(true);

      setDirection(dir);

      setTimeout(() => {
        setStep(newStep);
      }, 15);

      setTimeout(() => setIsAnimating(false), 400);
    },
    [isAnimating, step],
  );

  const handleTypeSelect = useCallback(
    (type: string) => {
      setSelectedType(type);
      changeStep(2, "forward");
    },
    [changeStep],
  );

  const handleBack = useCallback(() => {
    if (step > 1) {
      changeStep(step - 1, "backward");
    } else {
      router.back();
    }
  }, [step, router, changeStep]);

  const handleForward = useCallback(() => {
    if (step < maxStepReached) {
      changeStep(step + 1, "forward");
    }
  }, [step, maxStepReached, changeStep]);

  const handlePickPhoto = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }, []);

  const handleCreate = useCallback(async () => {
    if (!name.trim()) return;

    try {
      setLoading(true);
      const groupType = selectedType || "Estándar";

      const newGroup = await groupsService.createGroup({
        name: name.trim(),
        description: description.trim() || `Un grupo de tipo ${groupType}`,
        category: groupType,
      });

      if (newGroup && photoUri) {
        const publicUrl = await groupsService.uploadGroupCover(
          newGroup.id,
          photoUri,
        );
        await groupsService.updateGroup(newGroup.id, {
          cover_image_url: publicUrl,
        });
      }

      if (newGroup) {
        router.replace({
          pathname: "/groups/group/[id]",
          params: { id: newGroup.id },
        });
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [name, description, photoUri, selectedType, router]);

  const renderStepOne = () => (
    <Animated.View
      key="step-1"
      entering={direction === "backward" ? SlideInLeft : FadeIn}
      exiting={SlideOutLeft}
      style={StyleSheet.absoluteFill}
    >
      <View style={styles.stepContainer}>
        <StepTitle main="Elige tu" accent="tipo de grupo" />

        <View
          style={styles.carouselContainer}
          onLayout={(event) =>
            setCarouselHeight(event.nativeEvent.layout.height)
          }
        >
          {carouselHeight > 0 && (
            <ParallaxCarousel
              data={ITEMS}
              renderItem={({ item, index }) => (
                <Pressable
                  onPress={() => handleTypeSelect(item.title)}
                  style={StyleSheet.absoluteFill}
                >
                  <View
                    style={[
                      styles.cardContent,
                      { width: width - 40, height: carouselHeight - 40 },
                    ]}
                  >
                    <View style={styles.indicatorContainer}>
                      {ITEMS.map((_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.indicatorDot,
                            {
                              backgroundColor:
                                i === index
                                  ? "rgba(255, 255, 255, 1)"
                                  : "rgba(255, 255, 255, 0.5)",
                              width: i === index ? 8 : 6,
                              height: i === index ? 8 : 6,
                            },
                          ]}
                        />
                      ))}
                    </View>

                    <View style={styles.textOverlay} />
                    <Text
                      style={[
                        styles.cardTitle,
                        { color: theme.colors.onPrimary },
                      ]}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={[
                        styles.cardDescription,
                        { color: theme.colors.onPrimary },
                      ]}
                    >
                      {item.description}
                    </Text>
                    {glassAvailable ? (
                      <GlassView
                        style={styles.actionIndicator}
                        glassEffectStyle="clear"
                        colorScheme="dark"
                      >
                        <Ionicons
                          name="arrow-forward"
                          size={24}
                          color={theme.colors.onPrimary}
                        />
                      </GlassView>
                    ) : (
                      <View
                        style={[
                          styles.actionIndicator,
                          styles.actionIndicatorSolid,
                          { borderColor: theme.colors.onPrimary },
                        ]}
                      >
                        <Ionicons
                          name="arrow-forward"
                          size={24}
                          color={theme.colors.onPrimary}
                        />
                      </View>
                    )}
                  </View>
                </Pressable>
              )}
              parallaxIntensity={1}
              itemHeight={carouselHeight}
            />
          )}
        </View>
      </View>
    </Animated.View>
  );

  const renderStepTwo = () => (
    <Animated.View
      key="step-2"
      entering={direction === "forward" ? SlideInRight : SlideInLeft}
      exiting={direction === "forward" ? SlideOutLeft : SlideOutRight}
      style={StyleSheet.absoluteFill}
    >
      <KeyboardAvoidingView
        behavior="height"
        enabled={Platform.OS === "android"}
        style={styles.stepContainer}
      >
        <ScrollView
          ref={formScrollRef}
          keyboardShouldPersistTaps="handled"
          onLayout={revealDescription}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.formScrollContent}
        >
          <StepTitle
            main="Dale un"
            accent="nombre"
            subtitle={`Has elegido "${selectedType}". Ahora ponle un nombre único a tu grupo.`}
          />

          <View style={styles.form}>
            <SquircleView
              style={[
                styles.fieldsCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
              cornerSmoothing={1}
            >
              <TextInput
                placeholder="Nombre del grupo"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                value={name}
                onChangeText={setName}
                style={[styles.nameInput, { color: theme.colors.onSurface }]}
                selectionColor={theme.colors.primary}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => descriptionRef.current?.focus()}
              />
              <View
                style={[
                  styles.fieldSeparator,
                  { backgroundColor: theme.colors.outlineVariant },
                ]}
              />
              <TextInput
                ref={descriptionRef}
                placeholder="Descripción (opcional)"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                value={description}
                onChangeText={setDescription}
                style={[
                  styles.descriptionInput,
                  { color: theme.colors.onSurface },
                ]}
                selectionColor={theme.colors.primary}
                multiline
                onFocus={() => {
                  descriptionFocused.current = true;
                  revealDescription();
                }}
                onBlur={() => {
                  descriptionFocused.current = false;
                }}
                onContentSizeChange={revealDescription}
              />
            </SquircleView>
          </View>
        </ScrollView>

        {/* El botón se queda pegado encima del teclado; lo de arriba se desplaza si no cabe */}
        <View
          style={[
            styles.stickyFooter,
            {
              paddingBottom: 12 + Math.max(0, keyboardHeight - insets.bottom),
            },
            // Con el teclado abierto, hueco a la derecha para el botón de ocultarlo
            keyboardHeight > 0 && {
              paddingRight: KEYBOARD_DISMISS_RIGHT + KEYBOARD_DISMISS_SIZE + 10,
            },
          ]}
        >
          <CTAButton
            title="Continuar"
            onPress={() => {
              if (name.trim()) changeStep(3, "forward");
            }}
            disabled={!name.trim()}
            backgroundColor={
              name.trim() ? theme.colors.primary : theme.colors.surfaceVariant
            }
            textColor={
              name.trim()
                ? theme.colors.onPrimary
                : theme.colors.onSurfaceVariant
            }
            iconBorderColor={
              name.trim() ? "rgba(255,255,255,0.3)" : theme.colors.outline
            }
          />
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );

  const renderStepThree = () => (
    <Animated.View
      key="step-3"
      entering={direction === "forward" ? SlideInRight : SlideInLeft}
      exiting={direction === "forward" ? SlideOutLeft : SlideOutRight}
      style={StyleSheet.absoluteFill}
    >
      <View style={styles.stepContainer}>
        <StepTitle
          main="Ponle una"
          accent="foto"
          subtitle={`Una imagen para identificar "${name}" al instante.`}
        />

        <View style={styles.photoContainer}>
          <Pressable
            onPress={handlePickPhoto}
            accessibilityRole="button"
            accessibilityLabel={photoUri ? "Cambiar foto" : "Elegir foto"}
            style={({ pressed }) => [
              styles.photoPicker,
              { transform: [{ scale: pressed ? 0.97 : 1 }] },
            ]}
          >
            <SquircleView
              style={[
                styles.photoSquircle,
                !photoUri && styles.photoSquircleEmpty,
                {
                  borderColor: theme.colors.outlineVariant,
                  backgroundColor: theme.colors.surfaceVariant,
                },
              ]}
              cornerSmoothing={1}
            >
              {photoUri ? (
                <Image
                  source={{ uri: photoUri }}
                  style={styles.photoPreview}
                  contentFit="cover"
                  transition={300}
                />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons
                    name="image-outline"
                    size={48}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      styles.photoPlaceholderText,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    Toca para elegir
                  </Text>
                </View>
              )}
            </SquircleView>

            {photoUri &&
              (glassAvailable ? (
                <GlassView style={styles.photoBadge}>
                  <Ionicons
                    name="camera"
                    size={20}
                    color={theme.colors.onSurface}
                  />
                </GlassView>
              ) : (
                <View
                  style={[
                    styles.photoBadge,
                    styles.photoBadgeSolid,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.outlineVariant,
                    },
                  ]}
                >
                  <Ionicons
                    name="camera"
                    size={20}
                    color={theme.colors.onSurface}
                  />
                </View>
              ))}
          </Pressable>
        </View>

        <View style={styles.footerActions}>
          <CTAButton
            title="Crear grupo"
            loadingText="Creando..."
            iconName="checkmark"
            onPress={handleCreate}
            loading={loading}
          />
          <Pressable onPress={handleCreate} disabled={loading}>
            <Text
              style={[
                styles.skipLink,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Saltar por ahora
            </Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.topBar}>
          <CircleButton
            icon={step === 1 ? "close" : "chevron-back"}
            label={step === 1 ? "Cerrar" : "Atrás"}
            onPress={handleBack}
          />

          <View style={styles.stepperContainer}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.stepIndicator,
                  {
                    backgroundColor:
                      step >= i + 1
                        ? theme.colors.primary
                        : theme.colors.surfaceVariant,
                  },
                ]}
              />
            ))}
          </View>

          <CircleButton
            icon="chevron-forward"
            label="Siguiente"
            onPress={handleForward}
            hidden={step >= maxStepReached}
          />
        </View>

        {/* El margen inferior se aplica aquí y no en SafeAreaView: el botón del paso 2
            lo descuenta al subir con el teclado y los dos valores deben coincidir */}
        <View style={[styles.content, { marginBottom: insets.bottom }]}>
          {step === 1 && renderStepOne()}
          {step === 2 && renderStepTwo()}
          {step === 3 && renderStepThree()}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFill,
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    zIndex: 10,
  },
  stepperContainer: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
  },
  stepIndicator: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  circleButtonSolid: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  circleButtonPressable: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
  },

  stepTitleBlock: {
    marginTop: 12,
    marginBottom: 10,
    paddingHorizontal: 24,
  },
  stepMainTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 36,
  },
  stepAccentTitle: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 42,
    marginTop: -20,
    letterSpacing: 2,
    paddingVertical: 5,
  },
  titleDivider: {
    borderBottomWidth: 1,
    width: "90%",
    marginTop: 5,
  },
  stepSubtitle: {
    fontFamily: "Archivo-Regular",
    fontSize: 15,
    lineHeight: 21,
    marginTop: 14,
  },

  logoContainer: {
    width: 88,
    height: 88,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderRadius: 24,
  },

  carouselContainer: {
    flex: 1,
  },
  cardContent: {
    position: "absolute",
    top: 20,
    left: 20,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  textOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 20,
  },
  cardTitle: {
    fontSize: 56,
    fontFamily: "InstrumentSerif-Italic",
    marginBottom: 8,
    textAlign: "center",
    paddingVertical: 5,
  },
  cardDescription: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.9,
    marginTop: -10,
  },
  actionIndicator: {
    marginTop: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  actionIndicatorSolid: {
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  indicatorContainer: {
    position: "absolute",
    top: 20,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
    zIndex: 20,
    alignItems: "center",
  },
  indicatorDot: {
    borderRadius: 4,
  },

  formScrollContent: {
    paddingBottom: 16,
  },
  form: {
    paddingHorizontal: 24,
    marginTop: 14,
  },
  stickyFooter: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  fieldsCard: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  nameInput: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  fieldSeparator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 18,
  },
  descriptionInput: {
    fontFamily: "Archivo-Regular",
    fontSize: 16,
    lineHeight: 22,
    minHeight: 84,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    textAlignVertical: "top",
  },
  ctaContainer: {
    marginTop: 14,
    width: "100%",
  },
  ctaCard: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderColor: "rgba(255,255,255,0.3)",
    borderWidth: 1,
  },
  ctaContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ctaText: {
    fontFamily: "Archivo-Bold",
    fontSize: 18,
    letterSpacing: 0.5,
  },
  ctaIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  photoContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  photoPicker: {
    width: 220,
    height: 220,
  },
  photoSquircle: {
    width: 220,
    height: 220,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  photoSquircleEmpty: {
    borderWidth: 2,
    borderStyle: "dashed",
  },
  photoPreview: {
    width: "100%",
    height: "100%",
  },
  photoPlaceholder: {
    alignItems: "center",
    gap: 8,
  },
  photoPlaceholderText: {
    fontSize: 14,
    fontFamily: "Archivo-Medium",
  },
  photoBadge: {
    position: "absolute",
    right: -8,
    bottom: -8,
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
  },
  photoBadgeSolid: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  footerActions: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    gap: 16,
    alignItems: "center",
  },
  skipLink: {
    fontFamily: "Archivo-Bold",
    fontSize: 15,
    paddingVertical: 8,
  },
});
