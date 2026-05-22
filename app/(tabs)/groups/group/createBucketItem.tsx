import { Ionicons } from "@expo/vector-icons";
import { BlurTargetView } from "expo-blur";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfirmDialog, DialogType } from "@/components/ui/ConfirmDialog";
import { CustomHeader } from "@/components/ui/CustomHeader";
import { bucketListService } from "@/services/bucketList.service";
import { BucketListCategory } from "@/types/database";

const CATEGORY_OPTIONS: { key: BucketListCategory; label: string; icon: string }[] = [
  { key: "restaurants", label: "Restaurantes", icon: "restaurant-outline" },
  { key: "travel", label: "Viajes", icon: "airplane-outline" },
  { key: "movies", label: "Pelis/Series", icon: "film-outline" },
  { key: "gifts", label: "Regalos", icon: "gift-outline" },
  { key: "other", label: "Ideas", icon: "bulb-outline" },
];

export default function CreateBucketItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const backgroundRef = React.useRef(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<BucketListCategory>("other");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: DialogType;
  }>({ visible: false, title: "", message: "", type: "info" });
  const hideDialog = () => setDialogConfig((prev) => ({ ...prev, visible: false }));

  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      setDialogConfig({
        visible: true,
        title: "Título requerido",
        message: "Escribe qué queréis hacer juntos.",
        type: "warning",
      });
      return;
    }
    if (!id) return;

    try {
      setIsSaving(true);
      Keyboard.dismiss();

      let uploadedImageUrl: string | undefined;
      if (imageUri) {
        uploadedImageUrl = await bucketListService.uploadItemImage(id, imageUri);
      }

      await bucketListService.createItem({
        group_id: id,
        title: title.trim(),
        description: description.trim() || undefined,
        category: selectedCategory,
        image_url: uploadedImageUrl,
      });

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.back();
    } catch (e) {
      console.error("Error creating plan:", e);
      setDialogConfig({
        visible: true,
        title: "Error",
        message: "No se pudo guardar el plan. Inténtalo de nuevo.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }, [title, description, selectedCategory, imageUri, id, router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <BlurTargetView
        ref={backgroundRef}
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <CustomHeader title="" showBackButton />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeIn.duration(500)} style={styles.titleBlock}>
            <Text style={[styles.screenTitle, { color: theme.colors.primary }]}>
              Nuevo plan
            </Text>
            <Text style={[styles.screenSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              Añade algo que queréis hacer en grupo
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeIn.duration(400).delay(50)}
            style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]}
          />

          <Animated.View entering={FadeInDown.duration(300).delay(80)} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
              Imagen (opcional)
            </Text>
            <Pressable
              onPress={handlePickImage}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            >
              <SquircleView
                style={[
                  styles.imagePicker,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant,
                    borderWidth: 1,
                  },
                ]}
                cornerSmoothing={1}
              >
                {imageUri ? (
                  <>
                    <Image
                      source={{ uri: imageUri }}
                      style={StyleSheet.absoluteFillObject}
                      contentFit="cover"
                      transition={200}
                    />
                    <View style={styles.imageOverlay}>
                      <Ionicons name="camera-outline" size={24} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.imagePickerTextLight}>Cambiar imagen</Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.imagePickerEmpty}>
                    <Ionicons
                      name="image-outline"
                      size={28}
                      color={theme.colors.onSurfaceVariant}
                    />
                    <Text
                      style={[
                        styles.imagePickerText,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      Toca para elegir una foto
                    </Text>
                  </View>
                )}
              </SquircleView>
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(300).delay(120)} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
              Título *
            </Text>
            <SquircleView
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant,
                  borderWidth: 1,
                },
              ]}
              cornerSmoothing={1}
            >
              <TextInput
                style={[styles.input, { color: theme.colors.onSurface }]}
                placeholder="¿Qué queréis hacer juntos?"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                value={title}
                onChangeText={setTitle}
                maxLength={100}
                autoFocus
              />
            </SquircleView>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(300).delay(160)} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
              Notas (opcional)
            </Text>
            <SquircleView
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant,
                  borderWidth: 1,
                },
              ]}
              cornerSmoothing={1}
            >
              <TextInput
                style={[styles.input, styles.inputMultiline, { color: theme.colors.onSurface }]}
                placeholder="Detalles, enlaces, ideas..."
                placeholderTextColor={theme.colors.onSurfaceVariant}
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={300}
              />
            </SquircleView>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(300).delay(200)} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
              Categoría
            </Text>
            <View style={styles.categoryGrid}>
              {CATEGORY_OPTIONS.map((cat) => {
                const isActive = selectedCategory === cat.key;
                return (
                  <Pressable
                    key={cat.key}
                    onPress={() => setSelectedCategory(cat.key)}
                    style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                  >
                    <SquircleView
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor: isActive
                            ? theme.colors.primary
                            : theme.colors.surfaceVariant,
                          borderColor: isActive
                            ? theme.colors.primary
                            : theme.colors.outlineVariant,
                          borderWidth: 1,
                        },
                      ]}
                      cornerSmoothing={1}
                    >
                      <Ionicons
                        name={cat.icon as keyof typeof Ionicons.glyphMap}
                        size={15}
                        color={
                          isActive
                            ? theme.colors.onPrimary
                            : theme.colors.onSurfaceVariant
                        }
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          {
                            color: isActive
                              ? theme.colors.onPrimary
                              : theme.colors.onSurfaceVariant,
                          },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </SquircleView>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        </ScrollView>

        <Animated.View
          entering={FadeIn.duration(400).delay(300)}
          style={[
            styles.footer,
            {
              paddingBottom: insets.bottom + 16,
              borderTopColor: theme.colors.outlineVariant,
            },
          ]}
        >
          <Pressable
            onPress={handleSave}
            disabled={isSaving || !title.trim()}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.9 : isSaving || !title.trim() ? 0.5 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <SquircleView
              style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
              cornerSmoothing={1}
            >
              {isSaving ? (
                <Text style={[styles.createButtonText, { color: theme.colors.onPrimary }]}>
                  Guardando...
                </Text>
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color={theme.colors.onPrimary} />
                  <Text style={[styles.createButtonText, { color: theme.colors.onPrimary }]}>
                    Añadir plan
                  </Text>
                </>
              )}
            </SquircleView>
          </Pressable>
        </Animated.View>

        <ConfirmDialog
          visible={dialogConfig.visible}
          title={dialogConfig.title}
          message={dialogConfig.message}
          type={dialogConfig.type}
          onConfirm={hideDialog}
          onCancel={hideDialog}
          confirmText="Entendido"
          showCancel={false}
          blurTargetRef={backgroundRef}
        />
      </BlurTargetView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 0 },
  titleBlock: { marginTop: 4, marginBottom: 4 },
  screenTitle: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 38,
    letterSpacing: 0.5,
    lineHeight: 44,
  },
  screenSubtitle: {
    fontFamily: "Archivo-Medium",
    fontSize: 14,
    letterSpacing: 0.3,
    marginTop: 2,
  },
  divider: { height: 1, marginTop: 16, marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionLabel: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 13,
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  imagePicker: {
    height: 140,
    borderRadius: 16,
    overflow: "hidden",
  },
  imagePickerEmpty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  imagePickerText: { fontFamily: "Archivo-Medium", fontSize: 13 },
  imagePickerTextLight: {
    fontFamily: "Archivo-Medium",
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    marginTop: 4,
  },
  inputContainer: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    fontFamily: "Archivo-Medium",
    fontSize: 15,
    padding: 0,
  },
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  categoryChipText: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 13,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  createButton: {
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  createButtonText: {
    fontFamily: "Archivo-Bold",
    fontSize: 16,
    letterSpacing: 0.3,
  },
});
