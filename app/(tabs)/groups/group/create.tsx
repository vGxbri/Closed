import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import SquircleView from "react-native-fast-squircle";
import {
  Button,
  Surface,
  ActivityIndicator,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { groupsService } from "../../../../services";
import { CustomHeader } from "../../../../components/ui/CustomHeader";
import { useSnackbar } from "../../../../components/ui/SnackbarContext";
import { ConfirmDialog, DialogType } from "../../../../components/ui/ConfirmDialog";
import { BlurTargetView } from "expo-blur";

// ─── Group Categories ──────────────────────────────────────────────────
interface CategoryOption {
  id: string;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const GROUP_CATEGORIES: CategoryOption[] = [
  {
    id: "Estándar",
    label: "Estándar",
    description: "Para cualquier ocasión",
    icon: "people-outline",
  },
  {
    id: "Viaje",
    label: "Viaje",
    description: "Aventuras compartidas",
    icon: "airplane-outline",
  },
  {
    id: "Fiesta",
    label: "Fiesta",
    description: "Eventos y celebraciones",
    icon: "musical-notes-outline",
  },
  {
    id: "Pareja",
    label: "Pareja",
    description: "Tu otra mitad",
    icon: "heart-outline",
  },
];

// ─── Main Screen ────────────────────────────────────────────────────────
export default function CreateGroupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUri, setCoverImageUri] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("Estándar");
  const [loading, setLoading] = useState(false);

  const backgroundRef = React.useRef(null);
  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: DialogType;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }>({
    visible: false,
    title: "",
    message: "",
    type: "info",
    onConfirm: () => {},
  });

  const hideDialog = () =>
    setDialogConfig((prev) => ({ ...prev, visible: false }));

  const hasUnsavedChanges = 
    name.trim() !== "" || 
    description.trim() !== "" || 
    coverImageUri !== null || 
    selectedCategory !== "Estándar";

  const handlePickPhoto = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setCoverImageUri(result.assets[0].uri);
    }
  }, []);

  const handleBack = useCallback(() => {
    if (hasUnsavedChanges && !loading) {
      setDialogConfig({
        visible: true,
        title: "Descartar cambios",
        message: "¿Estás seguro de que quieres salir? Los datos introducidos se perderán.",
        type: "warning",
        confirmText: "Salir",
        cancelText: "Cancelar",
        onConfirm: () => {
          hideDialog();
          router.back();
        },
      });
    } else {
      router.back();
    }
  }, [hasUnsavedChanges, loading, router]);

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      showSnackbar("El nombre del grupo es obligatorio", "error");
      return;
    }

    try {
      setLoading(true);

      const newGroup = await groupsService.createGroup({
        name: name.trim(),
        description: description.trim(),
        category: selectedCategory,
      });

      if (coverImageUri) {
        const publicUrl = await groupsService.uploadGroupCover(newGroup.id, coverImageUri);
        await groupsService.updateGroup(newGroup.id, { cover_image_url: publicUrl });
      }

      showSnackbar("Grupo creado con éxito", "success");
      router.replace({
        pathname: "/groups/group/[id]",
        params: { id: newGroup.id },
      });
    } catch (err) {
      console.error("Error creating group:", err);
      const message =
        err instanceof Error ? err.message : "Error al crear el grupo";
      showSnackbar(message, "error");
    } finally {
      setLoading(false);
    }
  }, [name, description, coverImageUri, selectedCategory, showSnackbar, router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <BlurTargetView
        ref={backgroundRef}
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <CustomHeader
          title=""
          showBackButton={true}
          onBackPress={handleBack}
          rightAction={
            <TouchableOpacity
              onPress={handleCreate}
              disabled={!name.trim() || loading}
              style={{
                width: 40,
                height: 40,
                justifyContent: "center",
                alignItems: "flex-end",
                opacity: !name.trim() || loading ? 0.5 : 1,
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.onSurface}
                  style={{ transform: [{ scale: 0.7 }] }}
                />
              ) : (
                <Ionicons
                  name="checkmark-circle"
                  size={26}
                  color={
                    name.trim()
                      ? theme.colors.primary
                      : theme.colors.onSurfaceVariant
                  }
                />
              )}
            </TouchableOpacity>
          }
        />

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: 120 + insets.bottom },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ─── Title ─── */}
            <Animated.View
              entering={FadeInUp.duration(500)}
              style={styles.titleBlock}
            >
              <Text
                style={[styles.screenTitle, { color: theme.colors.primary }]}
              >
                Nuevo grupo
              </Text>
              <Text
                style={[
                  styles.screenSubtitle,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Crea un espacio para organizaros
              </Text>
            </Animated.View>

            {/* ─── Divider ─── */}
            <Animated.View
              entering={FadeIn.duration(400).delay(50)}
              style={[
                styles.divider,
                { backgroundColor: theme.colors.outlineVariant },
              ]}
            />

            {/* ─── Preview Card ─── */}
            <Animated.View entering={FadeInDown.duration(400).delay(80)}>
              <SquircleView
                style={[
                  styles.previewCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant,
                    borderWidth: 1,
                  },
                ]}
                cornerSmoothing={1}
              >
                <Pressable onPress={handlePickPhoto} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
                  <SquircleView
                    style={[
                      styles.previewIconContainer,
                      {
                        backgroundColor: coverImageUri 
                          ? "transparent" 
                          : (theme.dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"),
                      },
                    ]}
                    cornerSmoothing={1}
                  >
                    {coverImageUri ? (
                      <Image
                        source={{ uri: coverImageUri }}
                        style={{ width: "100%", height: "100%", borderRadius: 16 }}
                        contentFit="cover"
                        transition={200}
                      />
                    ) : (
                      <Ionicons
                        name="camera-outline"
                        size={28}
                        color={theme.colors.onSurfaceVariant}
                      />
                    )}
                  </SquircleView>
                </Pressable>
                <Text
                  style={[
                    styles.previewName,
                    { color: theme.colors.onSurface },
                  ]}
                  numberOfLines={1}
                >
                  {name.trim() || "Nombre del grupo"}
                </Text>
                {description.trim() ? (
                  <Text
                    style={[
                      styles.previewDescription,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                    numberOfLines={2}
                  >
                    {description}
                  </Text>
                ) : null}
                <View
                  style={[
                    styles.previewBadge,
                    {
                      backgroundColor: theme.dark
                        ? "rgba(42,138,112,0.15)"
                        : "rgba(42,138,112,0.08)",
                      borderColor: theme.colors.primary,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      GROUP_CATEGORIES.find((c) => c.id === selectedCategory)
                        ?.icon || "people-outline"
                    }
                    size={12}
                    color={theme.colors.primary}
                  />
                  <Text
                    style={[
                      styles.previewBadgeText,
                      { color: theme.colors.primary },
                    ]}
                  >
                    {selectedCategory}
                  </Text>
                </View>
              </SquircleView>
            </Animated.View>

            {/* ─── Section: Category Selector ─── */}
            <Animated.View
              entering={FadeInDown.duration(400).delay(120)}
              style={styles.section}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.onSurface },
                ]}
              >
                Tipo de grupo
              </Text>
              <SquircleView
                style={[
                  styles.categoryCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant,
                    borderWidth: 1,
                  },
                ]}
                cornerSmoothing={1}
              >
                {GROUP_CATEGORIES.map((cat, index) => {
                  const isSelected = selectedCategory === cat.id;
                  const isLast = index === GROUP_CATEGORIES.length - 1;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => setSelectedCategory(cat.id)}
                      style={({ pressed }) => [
                        styles.categoryRow,
                        !isLast && {
                          borderBottomWidth: 1,
                          borderBottomColor: theme.colors.surfaceVariant,
                        },
                        { opacity: pressed ? 0.85 : 1 },
                      ]}
                    >
                      <SquircleView
                        style={[
                          styles.categoryIconContainer,
                          {
                            backgroundColor: isSelected
                              ? theme.dark
                                ? "rgba(42,138,112,0.2)"
                                : "rgba(42,138,112,0.1)"
                              : theme.colors.surfaceVariant,
                            borderColor: isSelected
                              ? theme.colors.primary
                              : theme.colors.outlineVariant,
                            borderWidth: 1,
                          },
                        ]}
                        cornerSmoothing={1}
                      >
                        <Ionicons
                          name={cat.icon}
                          size={18}
                          color={
                            isSelected
                              ? theme.colors.primary
                              : theme.colors.onSurfaceVariant
                          }
                        />
                      </SquircleView>
                      <View style={styles.categoryInfo}>
                        <Text
                          style={[
                            styles.categoryLabel,
                            { color: theme.colors.onSurface },
                          ]}
                        >
                          {cat.label}
                        </Text>
                        <Text
                          style={[
                            styles.categoryDescription,
                            { color: theme.colors.onSurfaceVariant },
                          ]}
                        >
                          {cat.description}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.radioOuter,
                          {
                            borderColor: isSelected
                              ? theme.colors.primary
                              : theme.colors.outline,
                          },
                        ]}
                      >
                        {isSelected && (
                          <View
                            style={[
                              styles.radioInner,
                              { backgroundColor: theme.colors.primary },
                            ]}
                          />
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </SquircleView>
            </Animated.View>



            {/* ─── Section: Details ─── */}
            <Animated.View
              entering={FadeInDown.duration(400).delay(200)}
              style={styles.section}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.onSurface },
                ]}
              >
                Detalles
              </Text>

              <TextInput
                label="Nombre del grupo"
                placeholder="ej. Los Cracks"
                value={name}
                onChangeText={setName}
                mode="outlined"
                maxLength={30}
                style={styles.input}
                outlineStyle={{ borderRadius: 16 }}
                left={<TextInput.Icon icon="account-group" />}
              />

              <TextInput
                label="Descripción (opcional)"
                placeholder="Describe tu grupo..."
                value={description}
                onChangeText={setDescription}
                mode="outlined"
                multiline
                numberOfLines={2}
                style={styles.input}
                outlineStyle={{ borderRadius: 16 }}
                left={<TextInput.Icon icon="text" />}
              />
            </Animated.View>

            {/* ─── Info Tip ─── */}
            <Animated.View entering={FadeInDown.duration(400).delay(240)}>
              <SquircleView
                style={[
                  styles.infoCard,
                  {
                    backgroundColor: theme.dark
                      ? "rgba(42,138,112,0.1)"
                      : "rgba(42,138,112,0.06)",
                    borderColor: theme.colors.primary,
                    borderWidth: 1,
                  },
                ]}
                cornerSmoothing={1}
              >
                <SquircleView
                  style={[
                    styles.infoIconContainer,
                    {
                      backgroundColor: theme.dark
                        ? "rgba(42,138,112,0.2)"
                        : "rgba(42,138,112,0.1)",
                      borderColor: theme.colors.primary,
                      borderWidth: 1,
                    },
                  ]}
                  cornerSmoothing={1}
                >
                  <Ionicons
                    name="sparkles"
                    size={16}
                    color={theme.colors.primary}
                  />
                </SquircleView>
                <View style={styles.infoTextBlock}>
                  <Text
                    style={[
                      styles.infoTitle,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    Widgets automáticos
                  </Text>
                  <Text
                    style={[
                      styles.infoDescription,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    Se añadirán widgets adaptados al tipo de grupo que elijas.
                    Los admins podrán personalizarlos después.
                  </Text>
                </View>
              </SquircleView>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </BlurTargetView>

      <ConfirmDialog
        visible={dialogConfig.visible}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        confirmText={dialogConfig.confirmText}
        cancelText={dialogConfig.cancelText}
        onConfirm={dialogConfig.onConfirm}
        onCancel={hideDialog}
        showCancel={true}
        blurTargetRef={backgroundRef}
      />
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 0,
  },

  // Title
  titleBlock: {
    marginTop: 4,
    marginBottom: 4,
  },
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

  // Divider
  divider: {
    height: 1,
    marginTop: 16,
    marginBottom: 24,
  },

  // Preview Card
  previewCard: {
    alignItems: "center",
    padding: 28,
    borderRadius: 24,
    marginBottom: 28,
  },
  previewIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  previewName: {
    fontFamily: "Archivo-Bold",
    fontSize: 20,
    marginTop: 14,
    textAlign: "center",
  },
  previewDescription: {
    fontFamily: "Archivo-Medium",
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
    lineHeight: 18,
  },
  previewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    marginTop: 12,
  },
  previewBadgeText: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 12,
    letterSpacing: 0.2,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 16,
    letterSpacing: 0.3,
    marginBottom: 12,
  },

  // Category Selector
  categoryCard: {
    borderRadius: 22,
    overflow: "hidden",
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 12,
  },
  categoryLabel: {
    fontFamily: "Archivo-Bold",
    fontSize: 14,
  },
  categoryDescription: {
    fontFamily: "Archivo-Medium",
    fontSize: 12,
    marginTop: 1,
    letterSpacing: 0.1,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  // Icon Grid
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    padding: 16,
    borderRadius: 22,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  // Inputs
  input: {
    marginBottom: 14,
    backgroundColor: "transparent",
  },

  // Info Card
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 22,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  infoTextBlock: {
    flex: 1,
    marginLeft: 14,
  },
  infoTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 13,
  },
  infoDescription: {
    fontFamily: "Archivo-Medium",
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
    letterSpacing: 0.1,
  },
});
