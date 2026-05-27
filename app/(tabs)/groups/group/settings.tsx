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
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {
  IconName,
} from "../../../../constants/icons";
import { useAuth, useGroup } from "../../../../hooks";
import { MemberAvatar } from "../../../../components/MemberAvatar";
import { MenuOption, OptionsMenu } from "../../../../components/ui/OptionsMenu";

import {
  ConfirmDialog,
  DialogType,
} from "../../../../components/ui/ConfirmDialog";
import { CustomHeader } from "../../../../components/ui/CustomHeader";
import { useSnackbar } from "@/components/ui/SnackbarContext";
import { UserAvatar } from "../../../../components/ui/UserAvatar";
import { groupsService } from "../../../../services";

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
  const { user } = useAuth();

  const {
    group,
    isLoading,
    updateGroup,
    deleteGroup,
    removeMember,
    updateMemberRole,
    isAdmin,
    isOwner,
  } = useGroup(id);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUri, setCoverImageUri] = useState<string | null>(null);

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

  const [optionsMenu, setOptionsMenu] = useState<{
    visible: boolean;
    title: string;
    options: MenuOption[];
  }>({
    visible: false,
    title: "",
    options: [],
  });

  const hideOptionsMenu = () =>
    setOptionsMenu((prev) => ({ ...prev, visible: false }));

  const backgroundRef = React.useRef(null);

  // Settings
  const [allowMemberNominations, setAllowMemberNominations] = useState(false);
  const [allowMemberVoting, setAllowMemberVoting] = useState(true);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (group) {
      setName(group.name);
      setDescription(group.description || "");
      setCoverImageUri(group.cover_image_url || null);
      setAllowMemberNominations(group.settings.allow_member_nominations);
      setAllowMemberVoting(group.settings.allow_member_voting);
    }
  }, [group]);

  const hasUnsavedChanges = 
    group && (
      name.trim() !== group.name ||
      description.trim() !== (group.description || "") ||
      coverImageUri !== (group.cover_image_url || null) ||
      allowMemberNominations !== group.settings.allow_member_nominations ||
      allowMemberVoting !== group.settings.allow_member_voting
    );

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
    if (hasUnsavedChanges && !saving) {
      setDialogConfig({
        visible: true,
        title: "Descartar cambios",
        message: "Tienes cambios sin guardar. ¿Seguro que quieres salir?",
        type: "warning",
        confirmText: "Salir sin guardar",
        cancelText: "Cancelar",
        onConfirm: () => {
          hideDialog();
          router.back();
        },
      });
    } else {
      router.back();
    }
  }, [hasUnsavedChanges, saving, router]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      showSnackbar("El nombre del grupo es obligatorio", "error");
      return;
    }

    try {
      setSaving(true);
      let finalCoverUrl = group?.cover_image_url;

      if (coverImageUri && coverImageUri !== group?.cover_image_url) {
        // Only upload if it's a local uri (starts with file:// or similar)
        if (!coverImageUri.startsWith('http')) {
           finalCoverUrl = await groupsService.uploadGroupCover(group!.id, coverImageUri);
        }
      }

      await updateGroup({
        name: name.trim(),
        description: description.trim(),
        cover_image_url: finalCoverUrl || undefined,
        settings: {
          ...group!.settings,
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
    coverImageUri,
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
          router.replace("/(tabs)/groups");
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
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <CustomHeader title="" showBackButton={true} />
          
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: 120 + insets.bottom },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Title Skeleton */}
            <Animated.View entering={FadeIn.duration(400)} style={styles.titleBlock}>
              <View style={{ width: 160, height: 44, borderRadius: 8, backgroundColor: theme.colors.surfaceVariant, marginBottom: 8 }} />
              <View style={{ width: 200, height: 16, borderRadius: 4, backgroundColor: theme.colors.surfaceVariant }} />
            </Animated.View>

            <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />

            {/* Preview Card Skeleton */}
            <Animated.View entering={FadeIn.duration(400).delay(50)}>
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
                    { backgroundColor: theme.colors.surfaceVariant }
                  ]}
                  cornerSmoothing={1}
                />
                <View style={{ width: 140, height: 22, borderRadius: 11, backgroundColor: theme.colors.surfaceVariant, marginTop: 14 }} />
                <View style={{ width: 220, height: 16, borderRadius: 8, backgroundColor: theme.colors.surfaceVariant, marginTop: 10 }} />
              </SquircleView>
            </Animated.View>

            {/* Icon Selector Skeleton */}
            <Animated.View entering={FadeIn.duration(400).delay(100)} style={styles.section}>
              <View style={{ width: 100, height: 18, borderRadius: 9, backgroundColor: theme.colors.surfaceVariant, marginBottom: 12 }} />
              <SquircleView
                style={[
                  styles.iconGrid,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant,
                    borderWidth: 1,
                    height: 156, // Approximate height of the icon grid
                  },
                ]}
                cornerSmoothing={1}
              />
            </Animated.View>

            {/* Details Skeleton */}
            <Animated.View entering={FadeIn.duration(400).delay(150)} style={styles.section}>
              <View style={{ width: 100, height: 18, borderRadius: 9, backgroundColor: theme.colors.surfaceVariant, marginBottom: 12 }} />
              <View style={{ width: "100%", height: 56, borderRadius: 16, backgroundColor: theme.colors.surfaceVariant, marginBottom: 14 }} />
              <View style={{ width: "100%", height: 80, borderRadius: 16, backgroundColor: theme.colors.surfaceVariant }} />
            </Animated.View>
          </ScrollView>
        </View>
      </>
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
          onBackPress={handleBack}
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
                  <Pressable onPress={handlePickPhoto} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
                    <UserAvatar
                      uri={coverImageUri}
                      name={name.trim() || "Nombre del grupo"}
                      size={64}
                      borderRadius={20}
                    />
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

              {/* ─── Section: Miembros ─── */}
              <Animated.View
                entering={FadeInDown.duration(400).delay(180)}
                style={styles.section}
              >
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  Miembros ({group?.members.length || 0})
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
                  {group?.members.map((member, index) => {
                    const isMemberOwner = member.role === 'owner';
                    const isMe = user?.id === member.user_id;
                    const canManage = (isOwner || (isAdmin && !isMemberOwner)) && !isMe;

                    const showOptions = () => {
                      const actionOptions: MenuOption[] = [];

                      if (canManage) {
                        if (member.role === 'member') {
                          actionOptions.push({
                            label: 'Hacer Administrador',
                            icon: 'shield-checkmark-outline',
                            action: () => {
                              setDialogConfig({
                                visible: true,
                                title: "Hacer Administrador",
                                message: `¿Quieres promover a ${member.display_name} a Administrador?`,
                                confirmText: "Promover",
                                type: "info",
                                onConfirm: async () => {
                                  try {
                                    setSaving(true);
                                    await updateMemberRole(member.user_id, 'admin');
                                    showSnackbar("Miembro promovido a Administrador", "success");
                                  } catch {
                                    showSnackbar("Error al actualizar rol", "error");
                                  } finally {
                                    setSaving(false);
                                  }
                                }
                              });
                            }
                          });
                        } else if (member.role === 'admin') {
                          actionOptions.push({
                            label: 'Quitar Administrador',
                            icon: 'shield-outline',
                            action: () => {
                              setDialogConfig({
                                visible: true,
                                title: "Quitar Administrador",
                                message: `¿Quieres degradar a ${member.display_name} a miembro?`,
                                confirmText: "Degradar",
                                type: "warning",
                                onConfirm: async () => {
                                  try {
                                    setSaving(true);
                                    await updateMemberRole(member.user_id, 'member');
                                    showSnackbar("Administrador degradado a miembro", "success");
                                  } catch {
                                    showSnackbar("Error al actualizar rol", "error");
                                  } finally {
                                    setSaving(false);
                                  }
                                }
                              });
                            }
                          });
                        }

                        actionOptions.push({
                          label: 'Expulsar del grupo',
                          icon: 'person-remove-outline',
                          isDestructive: true,
                          action: () => {
                            setDialogConfig({
                              visible: true,
                              title: "Expulsar miembro",
                              message: `¿Seguro que quieres expulsar a ${member.display_name} del grupo?`,
                              type: "error",
                              confirmText: "Expulsar",
                              onConfirm: async () => {
                                try {
                                  setSaving(true);
                                  await removeMember(member.user_id);
                                  showSnackbar("Miembro expulsado", "success");
                                } catch {
                                  showSnackbar("No se pudo expulsar al miembro", "error");
                                } finally {
                                  setSaving(false);
                                }
                              }
                            });
                          }
                        });
                      }

                      if (actionOptions.length > 0) {
                        setOptionsMenu({
                          visible: true,
                          title: `Gestionar a ${member.display_name}`,
                          options: actionOptions
                        });
                      }
                    };

                    const isLast = index === (group?.members.length || 0) - 1;

                    return (
                      <View
                        key={member.user_id}
                        style={[
                          styles.memberRow,
                          !isLast && {
                            borderBottomWidth: StyleSheet.hairlineWidth,
                            borderBottomColor: theme.colors.outlineVariant,
                          },
                        ]}
                      >
                        <MemberAvatar user={member} size="sm" />
                        <View style={styles.memberInfo}>
                          <Text
                            style={[
                              styles.memberName,
                              { color: theme.colors.onSurface },
                            ]}
                            numberOfLines={1}
                          >
                            {member.display_name} {isMe ? "(Tú)" : ""}
                          </Text>
                          <Text
                            style={[
                              styles.memberRole,
                              { color: theme.colors.onSurfaceVariant },
                            ]}
                          >
                            {member.role === 'owner' ? 'Propietario' : member.role === 'admin' ? 'Administrador' : 'Miembro'}
                          </Text>
                        </View>

                        {canManage && (
                          <TouchableOpacity
                            style={styles.optionsButton}
                            onPress={showOptions}
                          >
                            <Ionicons
                              name="ellipsis-horizontal"
                              size={20}
                              color={theme.colors.onSurfaceVariant}
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </SquircleView>
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
      <OptionsMenu
        visible={optionsMenu.visible}
        title={optionsMenu.title}
        options={optionsMenu.options}
        onDismiss={hideOptionsMenu}
        blurTarget={backgroundRef}
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

  // Members
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 14,
  },
  memberRole: {
    fontFamily: "Archivo-Medium",
    fontSize: 12,
    marginTop: 2,
  },
  optionsButton: {
    padding: 8,
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
