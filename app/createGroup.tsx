import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, TextInput, useTheme } from "react-native-paper";
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { ParallaxCarousel } from "../components/premade/molecules/parallax-carousel";
import { groupsService } from "../services";

const { height, width } = Dimensions.get("window");

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

export default function CreateGroupScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState("");
  const [name, setName] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [maxStepReached, setMaxStepReached] = useState(1);

  React.useEffect(() => {
    if (step > maxStepReached) {
      setMaxStepReached(step);
    }
  }, [step, maxStepReached]);

  const handleTypeSelect = useCallback((type: string) => {
    setSelectedType(type);
    setStep(2);
  }, []);

  const handleBack = useCallback(() => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.back();
    }
  }, [step, router]);

  const handleForward = useCallback(() => {
    if (step < maxStepReached) {
      setStep(step + 1);
    }
  }, [step, maxStepReached]);

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
        description: `Un grupo de tipo ${groupType}`,
        icon: "home",
      });

      if (newGroup) {
        router.replace({
          pathname: "/(tabs)/home",
          params: { groupId: newGroup.id },
        });
      }
    } catch (error) {
      console.error("Error creating group:", error);
    } finally {
      setLoading(false);
    }
  }, [name, selectedType, router]);

  const renderStepOne = () => (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      style={[
        styles.stepContainer,
        { justifyContent: "flex-end", paddingBottom: 0 },
      ]}
    >
      <View style={styles.stepTitleBlock}>
        <Text style={[styles.stepMainTitle, { color: theme.colors.onSurface }]}>
          Elige tu
        </Text>
        <Text style={[styles.stepAccentTitle, { color: theme.colors.primary }]}>
          tipo de grupo
        </Text>
        <View
          style={[
            styles.titleDivider,
            { borderBottomColor: theme.colors.outlineVariant },
          ]}
        />
      </View>

      <View style={styles.carouselContainer}>
        <ParallaxCarousel
          data={ITEMS}
          renderItem={({ item, index }) => (
            <Pressable
              onPress={() => handleTypeSelect(item.title)}
              style={StyleSheet.absoluteFill}
            >
              <View style={[styles.cardContent, { width: width - 40 }]}>
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
                  style={[styles.cardTitle, { color: theme.colors.onPrimary }]}
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
                <View
                  style={[
                    styles.actionIndicator,
                    { borderColor: theme.colors.onPrimary },
                  ]}
                >
                  <Ionicons
                    name="arrow-forward"
                    size={24}
                    color={theme.colors.onPrimary}
                  />
                </View>
              </View>
            </Pressable>
          )}
          parallaxIntensity={1}
          itemHeight={height * 0.7}
        />
      </View>
    </Animated.View>
  );

  const renderStepTwo = () => (
    <Animated.View
      entering={FadeInDown.duration(400)}
      exiting={FadeOut}
      style={styles.stepContainer}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.formContainer}
        >
          <View style={styles.formContent}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.colors.primary }]}>
                Dale un nombre
              </Text>
              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.colors.outlineVariant },
                ]}
              />
              <Text
                style={[
                  styles.subtitle,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Has elegido &quot;{selectedType}&quot;. Ahora ponle un nombre
                único a tu grupo.
              </Text>
            </View>

            <View style={styles.form}>
              <TextInput
                label="Nombre del grupo"
                placeholder="Ej. Viaje a Bali"
                value={name}
                onChangeText={setName}
                mode="outlined"
                left={<TextInput.Icon icon="account-group-outline" />}
                style={styles.input}
                outlineStyle={{
                  borderColor: theme.colors.outlineVariant,
                  borderRadius: 20,
                  borderWidth: 1,
                }}
                contentStyle={styles.inputContent}
                returnKeyType="done"
                autoFocus
              />

              <Pressable
                onPress={() => {
                  if (name.trim()) setStep(3);
                }}
                disabled={!name.trim()}
                style={({ pressed }) => [
                  styles.ctaContainer,
                  {
                    opacity: !name.trim() ? 0.6 : pressed ? 0.9 : 1,
                    transform: [{ scale: pressed && name.trim() ? 0.98 : 1 }],
                  },
                ]}
              >
                <SquircleView
                  style={[
                    styles.ctaCard,
                    {
                      backgroundColor: name.trim()
                        ? theme.colors.primary
                        : theme.colors.surfaceVariant,
                    },
                  ]}
                  cornerSmoothing={1}
                >
                  <View style={styles.ctaContent}>
                    <Text
                      style={[
                        styles.ctaText,
                        {
                          color: name.trim()
                            ? theme.colors.onPrimary
                            : theme.colors.onSurfaceVariant,
                        },
                      ]}
                    >
                      Continuar
                    </Text>
                    <SquircleView
                      style={[
                        styles.ctaIcon,
                        {
                          backgroundColor: "rgba(255,255,255,0.15)",
                          borderColor: name.trim()
                            ? "rgba(255,255,255,0.3)"
                            : theme.colors.outline,
                          borderWidth: 1,
                        },
                      ]}
                      cornerSmoothing={1}
                    >
                      <Ionicons
                        name="arrow-forward"
                        size={20}
                        color={
                          name.trim()
                            ? theme.colors.onPrimary
                            : theme.colors.onSurfaceVariant
                        }
                      />
                    </SquircleView>
                  </View>
                </SquircleView>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Animated.View>
  );

  const renderStepThree = () => (
    <Animated.View
      entering={FadeInDown.duration(400)}
      exiting={FadeOut}
      style={styles.stepContainer}
    >
      <View style={styles.formContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.primary }]}>
            Ponle una foto
          </Text>
          <View
            style={[
              styles.divider,
              { backgroundColor: theme.colors.outlineVariant },
            ]}
          />
          <Text
            style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
          >
            Una imagen para identificar &quot;{name}&quot; al instante.
          </Text>
        </View>

        <View style={styles.photoContainer}>
          <Pressable
            onPress={handlePickPhoto}
            style={({ pressed }) => [
              styles.photoPicker,
              {
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            <SquircleView
              style={[
                styles.photoSquircle,
                {
                  borderColor: photoUri
                    ? theme.colors.primary
                    : theme.colors.outlineVariant,
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
          </Pressable>

          {photoUri && (
            <Pressable
              onPress={handlePickPhoto}
              style={styles.changePhotoButton}
            >
              <Text
                style={[
                  styles.changePhotoText,
                  { color: theme.colors.tertiary },
                ]}
              >
                Cambiar foto
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.footerActions}>
          <Pressable
            onPress={handleCreate}
            disabled={loading}
            style={({ pressed }) => [
              styles.ctaContainer,
              {
                opacity: loading ? 0.6 : pressed ? 0.9 : 1,
                transform: [{ scale: pressed && !loading ? 0.98 : 1 }],
              },
            ]}
          >
            <SquircleView
              style={[
                styles.ctaCard,
                {
                  backgroundColor: theme.colors.primary,
                },
              ]}
              cornerSmoothing={1}
            >
              <View style={styles.ctaContent}>
                <Text
                  style={[styles.ctaText, { color: theme.colors.onPrimary }]}
                >
                  {loading ? "Creando..." : "Crear grupo"}
                </Text>
                <SquircleView
                  style={[
                    styles.ctaIcon,
                    {
                      backgroundColor: "rgba(255,255,255,0.15)",
                      borderColor: "rgba(255,255,255,0.3)",
                      borderWidth: 1,
                    },
                  ]}
                  cornerSmoothing={1}
                >
                  <Ionicons
                    name={loading ? "refresh" : "checkmark"}
                    size={20}
                    color={theme.colors.onPrimary}
                  />
                </SquircleView>
              </View>
            </SquircleView>
          </Pressable>

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
      <SafeAreaView
        style={styles.safeArea}
        edges={["top", "left", "right", "bottom"]}
      >
        {/* Stepper Indicator */}
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

        {/* Navigation Controls */}
        <View style={styles.navigationContainer}>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.navButton,
              {
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons
              name="chevron-back"
              size={28}
              color={theme.colors.onSurfaceVariant}
            />
          </Pressable>

          <Pressable
            onPress={handleForward}
            disabled={step >= maxStepReached}
            style={({ pressed }) => [
              styles.navButton,
              {
                opacity: step >= maxStepReached ? 0.3 : pressed ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons
              name="chevron-forward"
              size={28}
              color={theme.colors.onSurfaceVariant}
            />
          </Pressable>
        </View>

        <View style={styles.content}>
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
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
  },
  stepperContainer: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 8,
    marginBottom: 8,
    marginTop: 20,
    zIndex: 10,
  },
  stepIndicator: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
  },
  navigationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 8,
    gap: 10,
    zIndex: 10,
  },
  navButton: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },

  // Shared title block
  stepTitleBlock: {
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

  // Premium Header
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoContainer: {
    width: 88,
    height: 88,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderRadius: 24,
  },
  title: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 42,
    letterSpacing: 1,
    textAlign: "center",
    paddingVertical: 5,
  },
  divider: {
    width: "60%",
    height: 1,
    marginTop: 0,
    marginBottom: 0,
  },
  subtitle: {
    fontSize: 16,
    letterSpacing: 0.5,
    textAlign: "center",
    lineHeight: 22,
    marginTop: 8,
  },

  // Step 1 — Carousel
  carouselContainer: {
    justifyContent: "center",
    paddingBottom: 0,
  },
  cardContent: {
    height: height * 0.7 - 40,
    position: "absolute",
    top: 20,
    left: 20,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  textOverlay: {
    ...StyleSheet.absoluteFillObject,
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
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
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

  // Premium Form
  formContainer: {
    flex: 1,
  },
  formContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "flex-start",
    alignItems: "center",
  },
  form: {
    width: "100%",
    marginTop: 24,
  },
  input: {
    marginBottom: 16,
    backgroundColor: "transparent",
  },
  inputContent: {
    fontFamily: "Archivo-Medium",
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

  // Photo Step
  photoContainer: {
    alignItems: "center",
    width: "100%",
    marginVertical: 32,
  },
  photoPicker: {
    width: 200,
    height: 200,
  },
  photoSquircle: {
    width: 200,
    height: 200,
    borderRadius: 40,
    borderWidth: 2,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
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
  changePhotoButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  changePhotoText: {
    fontFamily: "Archivo-Bold",
    fontSize: 15,
  },
  footerActions: {
    width: "100%",
    gap: 16,
    alignItems: "center",
  },
  skipLink: {
    fontFamily: "Archivo-Bold",
    fontSize: 15,
    paddingVertical: 8,
  },
});
