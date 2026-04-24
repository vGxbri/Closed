import { Ionicons } from "@expo/vector-icons";
import { BlurTargetView } from "expo-blur";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
import { ActivityIndicator, Text, TextInput, useTheme } from "react-native-paper";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  defaultGroupIcon,
  getIconComponent,
  groupIconOptions,
  IconName,
} from "../../../../constants/icons";
import { useGroup } from "../../../../hooks";

import {
  ConfirmDialog,
  DialogType,
} from "../../../../components/ui/ConfirmDialog";
import { CustomHeader } from "../../../../components/ui/CustomHeader";
import { useSnackbar } from "../../../../components/ui/SnackbarContext";

// ─── Toggle Row Component ───────────────────────────────────────────────
interface ToggleRowProps {
  icon: string;
  title: string;
  description: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  isLast?: boolean;
}

const ToggleRow = React.memo<ToggleRowProps>(
  ({ icon, title, description, value, onToggle, isLast = false }) => {
    const theme = useTheme();

    return (
      <Pressable
        onPress={() => onToggle(!value)}
        style={({ pressed }) => [
          styles.settingRow,
          !isLast && {
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.surfaceVariant,
          },
          { opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <SquircleView
          style={[
            styles.settingIconContainer,
            {
              backgroundColor: value
                ? theme.dark
                  ? "rgba(42,138,112,0.2)"
                  : "rgba(42,138,112,0.1)"
                : theme.colors.surfaceVariant,
              borderColor: value
                ? theme.colors.primary
                : theme.colors.outlineVariant,
              borderWidth: 1,
            },
          ]}
          cornerSmoothing={1}
        >
          <Ionicons
            name={icon as any}
            size={18}
            color={value ? theme.colors.primary : theme.colors.onSurfaceVariant}
          />
        </SquircleView>

        <View style={styles.settingInfo}>
          <Text
            style={[
              styles.settingTitle,
              { color: theme.colors.onSurface },
            ]}
          >
            {title}
          </Text>
          <Text
            style={[
              styles.settingDescription,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {description}
          </Text>
        </View>

        {/* Custom Toggle */}
        <View
          style={[
            styles.toggleTrack,
            {
              backgroundColor: value
                ? theme.colors.primary
                : theme.dark
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.08)",
            },
          ]}
        >
          <View
            style={[
              styles.toggleThumb,
              {
                backgroundColor: value
                  ? theme.colors.onPrimary
                  : theme.colors.onSurfaceVariant,
                transform: [{ translateX: value ? 18 : 2 }],
              },
            ]}
          />
        </View>
      </Pressable>
    );
  }
);

ToggleRow.displayName = "ToggleRow";

// ─── Main Screen ────────────────────────────────────────────────────────
export default function GroupSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();

  const {
    group,
    isLoading,
    updateGroup,
    deleteGroup,
    isAdmin,
    isOwner,
  } = useGroup(id);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState<IconName>(defaultGroupIcon);

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
    onConfirm: () => { },
  });

  const hideDialog = () =>
    setDialogConfig((prev) => ({ ...prev, visible: false }));

  const backgroundRef = React.useRef(null);

  // Settings
  const [allowMemberNominations, setAllowMemberNominations] = useState(false);
  const [allowMemberVoting, setAllowMemberVoting] = useState(true);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (group) {
      setName(group.name);
      setDescription(group.description || "");
      setIcon((group.icon as IconName) || defaultGroupIcon);
      setAllowMemberNominations(group.settings.allow_member_nominations);
      setAllowMemberVoting(group.settings.allow_member_voting);
    }
  }, [group]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      showSnackbar("El nombre del grupo es obligatorio", "error");
      return;
    }

    try {
      setSaving(true);
      await updateGroup({
        name: name.trim(),
        description: description.trim() || null,
        icon,
        settings: {
          ...group?.settings,
          allow_member_nominations: allowMemberNominations,
          allow_member_voting: allowMemberVoting,
        },
      });
      showSnackbar("Grupo actualizado correctamente", "success");
      router.back();
    } catch (error: any) {
      showSnackbar(
        error.message || "No se pudo actualizar el grupo",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }, [
    name,
    description,
    icon,
    group,
    allowMemberNominations,
    allowMemberVoting,
    updateGroup,
    showSnackbar,
    router,
  ]);

  const handleDelete = useCallback(() => {
    setDialogConfig({
      visible: true,
      title: "Eliminar Grupo",
      message:
        "¿Estás seguro? Esta acción eliminará el grupo y todos sus datos permanentemente.",
      type: "error",
      confirmText: "Eliminar",
      onConfirm: async () => {
        try {
          setSaving(true);
          await deleteGroup();
          router.dismissAll();
          router.replace("/(tabs)/home");
        } catch {
          setSaving(false);
          showSnackbar("No se pudo eliminar el grupo", "error");
        }
      },
    });
  }, [deleteGroup, router, showSnackbar]);

  // ─── Loading state ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <View
        style={[
          styles.centerContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text
          style={[
            styles.loadingText,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          Cargando...
        </Text>
      </View>
    );
  }

  // ─── Access denied state ───────────────────────────────────────
  if (!group || !isAdmin) {
    return (
      <View
        style={[
          styles.centerContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <SquircleView
          style={[
            styles.lockIconContainer,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
          cornerSmoothing={1}
        >
          <Ionicons
            name="lock-closed-outline"
            size={36}
            color={theme.colors.onSurfaceVariant}
          />
        </SquircleView>
        <Text
          style={[styles.lockTitle, { color: theme.colors.onSurface }]}
        >
          Sin acceso
        </Text>
        <Text
          style={[
            styles.lockSubtitle,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          No tienes permisos de administrador para ver esta pantalla.
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
          ]}
        >
          <SquircleView
            style={[
              styles.lockButton,
              { backgroundColor: theme.colors.primary },
            ]}
            cornerSmoothing={1}
          >
            <Text
              style={[
                styles.lockButtonText,
                { color: theme.colors.onPrimary },
              ]}
            >
              Volver
            </Text>
          </SquircleView>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <BlurTargetView ref={backgroundRef} style={styles.container}>
        <CustomHeader
          title=""
          showBackButton={true}
          rightAction={
            <TouchableOpacity
              onPress={handleSave}
              disabled={!name.trim() || saving}
              style={{
                width: 40,
                height: 40,
                justifyContent: "center",
                alignItems: "flex-end", // Align right to match standard header icons
                opacity: !name.trim() || saving ? 0.5 : 1,
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {saving ? (
                <ActivityIndicator size="small" color={theme.colors.onSurface} style={{ transform: [{ scale: 0.7 }] }} />
              ) : (
                <Ionicons name="save" size={24} color={theme.colors.onSurface} />
              )}
            </TouchableOpacity>
          }
        />

        <View
          style={[
            styles.container,
            { backgroundColor: theme.colors.background },
          ]}
        >
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
                  Ajustes
                </Text>
                <Text
                  style={[
                    styles.screenSubtitle,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Personaliza tu grupo
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
                  <SquircleView
                    style={[
                      styles.previewIconContainer,
                      {
                        backgroundColor: theme.dark
                          ? "rgba(42,138,112,0.15)"
                          : "rgba(42,138,112,0.08)",
                        borderColor: theme.colors.primary,
                        borderWidth: 1,
                      },
                    ]}
                    cornerSmoothing={1}
                  >
                    {getIconComponent(icon, 32, theme.colors.primary)}
                  </SquircleView>
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
                </SquircleView>
              </Animated.View>

              {/* ─── Section: Icon Selector ─── */}
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
                  Icono
                </Text>
                <SquircleView
                  style={[
                    styles.iconGrid,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.outlineVariant,
                      borderWidth: 1,
                    },
                  ]}
                  cornerSmoothing={1}
                >
                  {groupIconOptions.map((iconName) => {
                    const isSelected = icon === iconName;
                    return (
                      <TouchableOpacity
                        key={iconName}
                        style={[
                          styles.iconButton,
                          {
                            backgroundColor: isSelected
                              ? theme.dark
                                ? "rgba(42,138,112,0.2)"
                                : "rgba(42,138,112,0.1)"
                              : "transparent",
                            borderColor: isSelected
                              ? theme.colors.primary
                              : theme.colors.outlineVariant,
                          },
                        ]}
                        onPress={() => setIcon(iconName)}
                        activeOpacity={0.7}
                      >
                        {getIconComponent(
                          iconName,
                          24,
                          isSelected
                            ? theme.colors.primary
                            : theme.colors.onSurfaceVariant
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </SquircleView>
              </Animated.View>

              {/* ─── Section: Details ─── */}
              <Animated.View
                entering={FadeInDown.duration(400).delay(160)}
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

              {/* ─── Section: Permissions ─── */}
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
                  Permisos
                </Text>
                <SquircleView
                  style={[
                    styles.settingsCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.outlineVariant,
                      borderWidth: 1,
                    },
                  ]}
                  cornerSmoothing={1}
                >
                  <ToggleRow
                    icon="trophy-outline"
                    title="Crear premios"
                    description="Los miembros pueden crear premios"
                    value={allowMemberNominations}
                    onToggle={setAllowMemberNominations}
                  />
                  <ToggleRow
                    icon="checkmark-circle-outline"
                    title="Votar en premios"
                    description="Los miembros pueden votar"
                    value={allowMemberVoting}
                    onToggle={setAllowMemberVoting}
                    isLast
                  />
                </SquircleView>
              </Animated.View>

              {/* ─── Danger Zone ─── */}
              {isOwner && (
                <Animated.View
                  entering={FadeInDown.duration(400).delay(240)}
                  style={styles.section}
                >
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: theme.colors.error },
                    ]}
                  >
                    Zona de peligro
                  </Text>
                  <SquircleView
                    style={[
                      styles.dangerCard,
                      {
                        backgroundColor: theme.dark
                          ? "rgba(220,38,38,0.08)"
                          : "rgba(220,38,38,0.05)",
                        borderColor: theme.colors.error,
                        borderWidth: 1,
                      },
                    ]}
                    cornerSmoothing={1}
                  >
                    <View style={styles.dangerContent}>
                      <SquircleView
                        style={[
                          styles.dangerIconContainer,
                          {
                            backgroundColor: theme.dark
                              ? "rgba(220,38,38,0.2)"
                              : "rgba(220,38,38,0.1)",
                            borderColor: theme.colors.error,
                            borderWidth: 1,
                          },
                        ]}
                        cornerSmoothing={1}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={20}
                          color={theme.colors.error}
                        />
                      </SquircleView>
                      <View style={styles.dangerInfo}>
                        <Text
                          style={[
                            styles.dangerTitle,
                            { color: theme.colors.onSurface },
                          ]}
                        >
                          Eliminar grupo
                        </Text>
                        <Text
                          style={[
                            styles.dangerDescription,
                            { color: theme.colors.onSurfaceVariant },
                          ]}
                        >
                          Esta acción es irreversible
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={handleDelete}
                      disabled={saving}
                      style={({ pressed }) => [
                        {
                          opacity: pressed ? 0.85 : 1,
                          transform: [{ scale: pressed ? 0.97 : 1 }],
                        },
                      ]}
                    >
                      <SquircleView
                        style={[
                          styles.dangerButton,
                          {
                            backgroundColor: theme.colors.error,
                          },
                        ]}
                        cornerSmoothing={1}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={16}
                          color={theme.colors.onError}
                        />
                        <Text
                          style={[
                            styles.dangerButtonText,
                            { color: theme.colors.onError },
                          ]}
                        >
                          Eliminar
                        </Text>
                      </SquircleView>
                    </Pressable>
                  </SquircleView>
                </Animated.View>
              )}
            </ScrollView>

          </KeyboardAvoidingView>
        </View>
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
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 36,
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

  // Loading
  loadingText: {
    fontFamily: "Archivo-Medium",
    fontSize: 14,
    marginTop: 16,
  },

  // Lock / Access Denied
  lockIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  lockTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 20,
    marginBottom: 8,
  },
  lockSubtitle: {
    fontFamily: "Archivo-Medium",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  lockButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  lockButtonText: {
    fontFamily: "Archivo-Bold",
    fontSize: 16,
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

  // Settings Card
  settingsCard: {
    borderRadius: 22,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  settingInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 12,
  },
  settingTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 14,
  },
  settingDescription: {
    fontFamily: "Archivo-Medium",
    fontSize: 12,
    marginTop: 1,
    letterSpacing: 0.1,
  },

  // Toggle
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },

  // Danger Zone
  dangerCard: {
    borderRadius: 22,
    padding: 18,
  },
  dangerContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  dangerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  dangerInfo: {
    flex: 1,
    marginLeft: 14,
  },
  dangerTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 14,
  },
  dangerDescription: {
    fontFamily: "Archivo-Medium",
    fontSize: 12,
    marginTop: 1,
  },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
  },
  dangerButtonText: {
    fontFamily: "Archivo-Bold",
    fontSize: 14,
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 18,
  },
  saveButtonText: {
    fontFamily: "Archivo-Bold",
    fontSize: 16,
    letterSpacing: 0.3,
  },
});
