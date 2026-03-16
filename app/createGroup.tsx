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
import { Text, TextInput, useTheme } from "react-native-paper";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
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

  const handleTypeSelect = useCallback((type: string) => {
    setSelectedType(type);
    setStep(2);
  }, []);

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
      entering={FadeIn}
      exiting={FadeOut}
      style={styles.stepContainer}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.formView}
        >
          <View style={styles.formHeader}>
            <Text
              style={[styles.stepMainTitle, { color: theme.colors.onSurface }]}
            >
              Dale un
            </Text>
            <Text
              style={[styles.stepAccentTitle, { color: theme.colors.primary }]}
            >
              nombre
            </Text>
            <View
              style={[
                styles.titleDivider,
                { borderBottomColor: theme.colors.outlineVariant },
              ]}
            />
            <Text
              style={[
                styles.formSubtitle,
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
              style={styles.input}
              outlineStyle={{ borderRadius: 16 }}
              returnKeyType="done"
              autoFocus
            />

            <Pressable
              onPress={() => {
                if (name.trim()) setStep(3);
              }}
              disabled={!name.trim()}
              style={({ pressed }) => [
                styles.continueButton,
                {
                  backgroundColor: name.trim()
                    ? theme.colors.primary
                    : theme.colors.surfaceVariant,
                  opacity: pressed && name.trim() ? 0.9 : 1,
                  transform: [{ scale: pressed && name.trim() ? 0.98 : 1 }],
                },
              ]}
            >
              <Text
                style={[
                  styles.continueButtonText,
                  {
                    color: name.trim()
                      ? theme.colors.onPrimary
                      : theme.colors.onSurfaceVariant,
                  },
                ]}
              >
                Continuar
              </Text>
              <View
                style={[
                  styles.continueButtonIcon,
                  {
                    borderColor: name.trim()
                      ? "rgba(255,255,255,0.3)"
                      : theme.colors.outline,
                  },
                ]}
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
              </View>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Animated.View>
  );

  const renderStepThree = () => (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      style={styles.stepContainer}
    >
      <View style={styles.photoContent}>
        <View style={[styles.formHeader, { paddingHorizontal: 24 }]}>
          <Text
            style={[styles.stepMainTitle, { color: theme.colors.onSurface }]}
          >
            Ponle una
          </Text>
          <Text
            style={[styles.stepAccentTitle, { color: theme.colors.primary }]}
          >
            foto
          </Text>
          <View
            style={[
              styles.titleDivider,
              { borderBottomColor: theme.colors.outlineVariant },
            ]}
          />
          <Text
            style={[
              styles.formSubtitle,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            Una imagen para identificar &quot;{name}&quot; al instante.
          </Text>
        </View>

        <View style={styles.photoSection}>
          <Pressable
            onPress={handlePickPhoto}
            style={({ pressed }) => [
              styles.photoPickerCircle,
              {
                borderColor: photoUri
                  ? theme.colors.primary
                  : theme.colors.outlineVariant,
                backgroundColor: photoUri
                  ? "transparent"
                  : theme.colors.surfaceVariant,
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
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
                  name="camera-outline"
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
          </Pressable>

          {photoUri && (
            <Pressable onPress={handlePickPhoto} style={styles.changePhotoLink}>
              <Text
                style={[
                  styles.changePhotoText,
                  { color: theme.colors.primary },
                ]}
              >
                Cambiar foto
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.photoActions}>
          <Pressable
            onPress={handleCreate}
            disabled={loading}
            style={({ pressed }) => [
              styles.continueButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: pressed && !loading ? 0.9 : loading ? 0.6 : 1,
                transform: [{ scale: pressed && !loading ? 0.98 : 1 }],
              },
            ]}
          >
            <Text
              style={[
                styles.continueButtonText,
                { color: theme.colors.onPrimary },
              ]}
            >
              {loading ? "Creando..." : "Crear grupo"}
            </Text>
            {!loading && (
              <View
                style={[
                  styles.continueButtonIcon,
                  { borderColor: "rgba(255,255,255,0.3)" },
                ]}
              >
                <Ionicons
                  name="checkmark"
                  size={20}
                  color={theme.colors.onPrimary}
                />
              </View>
            )}
          </Pressable>

          <Pressable onPress={handleCreate} disabled={loading}>
            <Text
              style={[
                styles.skipText,
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
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
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

      <View style={styles.content}>
        {step === 1 && renderStepOne()}
        {step === 2 && renderStepTwo()}
        {step === 3 && renderStepThree()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stepperContainer: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 8,
    marginBottom: 8,
    marginTop: 20,
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
  },
  titleDivider: {
    borderBottomWidth: 1,
    width: "90%",
    marginTop: 5,
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

  // Step 2 — Name
  formView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  formHeader: {
    marginBottom: 32,
  },
  formSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 16,
  },
  form: {
    paddingHorizontal: 24,
    gap: 20,
  },
  input: {
    backgroundColor: "transparent",
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  continueButtonText: {
    fontFamily: "Archivo-Bold",
    fontSize: 18,
  },
  continueButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },

  // Step 3 — Photo
  photoContent: {
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: 40,
  },
  photoSection: {
    alignItems: "center",
    gap: 16,
  },
  photoPickerCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2.5,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  photoPreview: {
    width: "100%",
    height: "100%",
    borderRadius: 90,
  },
  photoPlaceholder: {
    alignItems: "center",
    gap: 8,
  },
  photoPlaceholderText: {
    fontSize: 13,
  },
  changePhotoLink: {
    paddingVertical: 8,
  },
  changePhotoText: {
    fontFamily: "Archivo-Medium",
    fontSize: 14,
    letterSpacing: 0.5,
  },
  photoActions: {
    paddingHorizontal: 24,
    gap: 16,
    alignItems: "center",
  },
  skipText: {
    fontSize: 14,
    letterSpacing: 0.5,
    paddingVertical: 8,
  },
});
