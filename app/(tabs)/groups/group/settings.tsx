/**
 * Ajustes del grupo
 * Configuración del grupo: identidad, miembros, permisos y opciones de administración.
 */
import { Ionicons } from "@expo/vector-icons";
import { BlurTargetView } from "expo-blur";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MemberAvatar } from "@/components/MemberAvatar";
import { ConfirmDialog, DialogType } from "@/components/ui/ConfirmDialog";
import { CTAButton } from "@/components/ui/CTAButton";
import { FloatingTopBar, TOP_BAR_HEIGHT } from "@/components/ui/FloatingTopBar";
import { GroupCover } from "@/components/ui/GroupCover";
import { MenuOption, OptionsMenu } from "@/components/ui/OptionsMenu";
import { useSnackbar } from "@/components/ui/SnackbarContext";
import { StatusView } from "@/components/ui/StatusView";
import { StepTitle } from "@/components/ui/StepTitle";
import { useAuth, useGroup } from "@/hooks";
import { getMemberDisplayName } from "@/lib/memberProfile";
import { groupsService, widgetsService } from "@/services";

// Liquid Glass solo existe en iOS 26+; en el resto los controles son superficies opacas.
const glassAvailable = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

const ROLE_LABELS: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  member: "Miembro",
};

interface SectionProps {
  title: string;
  /** Texto de ayuda bajo el bloque, como los pies de sección de iOS. */
  footer?: string;
  delay: number;
  children: React.ReactNode;
}

// Sección de ajustes: título, bloque agrupado con las filas y pie opcional
function Section({ title, footer, delay, children }: SectionProps) {
  const theme = useTheme();

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(delay)}
      style={styles.section}
    >
      <Text
        accessibilityRole="header"
        style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}
      >
        {title}
      </Text>
      <SquircleView
        style={[
          styles.group,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
        cornerSmoothing={1}
      >
        {children}
      </SquircleView>
      {footer && (
        <Text
          style={[
            styles.sectionFooter,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          {footer}
        </Text>
      )}
    </Animated.View>
  );
}

function Separator({ inset = 16 }: { inset?: number }) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.separator,
        { backgroundColor: theme.colors.outlineVariant, marginLeft: inset },
      ]}
    />
  );
}

interface ToggleRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}

const ToggleRow = React.memo<ToggleRowProps>(
  ({ icon, title, description, value, onToggle }) => {
    const theme = useTheme();

    return (
      <View style={styles.row}>
        <Ionicons
          name={icon}
          size={22}
          color={value ? theme.colors.primary : theme.colors.onSurfaceVariant}
        />
        <View style={styles.rowText}>
          <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>
            {title}
          </Text>
          <Text
            style={[
              styles.rowDescription,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {description}
          </Text>
        </View>
        {/* Interruptor del sistema: en iOS 26 ya es de cristal */}
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ true: theme.colors.primary }}
          accessibilityLabel={title}
          accessibilityHint={description}
        />
      </View>
    );
  },
);

ToggleRow.displayName = "ToggleRow";

interface SaveButtonProps {
  onPress: () => void;
  saving: boolean;
}

// Solo aparece cuando hay cambios que guardar
function SaveButton({ onPress, saving }: SaveButtonProps) {
  const theme = useTheme();

  const content = (
    <Pressable
      onPress={onPress}
      disabled={saving}
      accessibilityRole="button"
      accessibilityLabel="Guardar cambios"
      accessibilityState={{ busy: saving }}
      hitSlop={6}
      style={styles.saveButtonContent}
    >
      {saving ? (
        <ActivityIndicator size="small" color={theme.colors.onPrimary} />
      ) : (
        <Text
          style={[styles.saveButtonText, { color: theme.colors.onPrimary }]}
        >
          Guardar
        </Text>
      )}
    </Pressable>
  );

  if (glassAvailable) {
    return (
      <GlassView
        style={styles.saveButton}
        tintColor={theme.colors.primary}
        isInteractive
      >
        {content}
      </GlassView>
    );
  }

  return (
    <View
      style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
    >
      {content}
    </View>
  );
}

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
    onConfirm: () => {},
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

  const backgroundRef = useRef(null);
  const descriptionRef = useRef<TextInput>(null);

  const [allowMemberNominations, setAllowMemberNominations] = useState(false);
  const [allowMemberManageWidgets, setAllowMemberManageWidgets] =
    useState(false);
  const [allowMemberCreateEvents, setAllowMemberCreateEvents] = useState(true);
  const [allowMemberEditEvents, setAllowMemberEditEvents] = useState(false);
  const [allowMemberUploadGallery, setAllowMemberUploadGallery] =
    useState(true);
  const [allowMemberCreateNotes, setAllowMemberCreateNotes] = useState(true);
  const [allowMemberCreateExpenses, setAllowMemberCreateExpenses] =
    useState(true);
  const [allowMemberSettleExpenses, setAllowMemberSettleExpenses] =
    useState(true);
  const [allowMemberCreateFlashbackParty, setAllowMemberCreateFlashbackParty] =
    useState(true);

  const [activeWidgetNames, setActiveWidgetNames] = useState<Set<string>>(
    new Set(),
  );

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (group) {
      setName(group.name);
      setDescription(group.description || "");
      setCoverImageUri(group.cover_image_url || null);
      setAllowMemberNominations(group.settings.allow_member_nominations);
      setAllowMemberManageWidgets(
        group.settings.allow_member_manage_widgets ?? false,
      );
      setAllowMemberCreateEvents(
        group.settings.allow_member_create_events ?? true,
      );
      setAllowMemberEditEvents(
        group.settings.allow_member_edit_events ?? false,
      );
      setAllowMemberUploadGallery(
        group.settings.allow_member_upload_gallery ?? true,
      );
      setAllowMemberCreateNotes(
        group.settings.allow_member_create_notes ?? true,
      );
      setAllowMemberCreateExpenses(
        group.settings.allow_member_create_expenses ?? true,
      );
      setAllowMemberSettleExpenses(
        group.settings.allow_member_settle_expenses ?? true,
      );
      setAllowMemberCreateFlashbackParty(
        group.settings.allow_member_create_flashback_party ?? true,
      );
    }
  }, [group]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    widgetsService
      .getGroupWidgets(id)
      .then((widgets) => {
        if (cancelled) return;
        setActiveWidgetNames(new Set(widgets.map((w) => w.widget.name)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);

  const hasUnsavedChanges =
    !!group &&
    (name.trim() !== group.name ||
      description.trim() !== (group.description || "") ||
      coverImageUri !== (group.cover_image_url || null) ||
      allowMemberNominations !== group.settings.allow_member_nominations ||
      allowMemberManageWidgets !==
        (group.settings.allow_member_manage_widgets ?? false) ||
      allowMemberCreateEvents !==
        (group.settings.allow_member_create_events ?? true) ||
      allowMemberEditEvents !==
        (group.settings.allow_member_edit_events ?? false) ||
      allowMemberUploadGallery !==
        (group.settings.allow_member_upload_gallery ?? true) ||
      allowMemberCreateNotes !==
        (group.settings.allow_member_create_notes ?? true) ||
      allowMemberCreateExpenses !==
        (group.settings.allow_member_create_expenses ?? true) ||
      allowMemberSettleExpenses !==
        (group.settings.allow_member_settle_expenses ?? true) ||
      allowMemberCreateFlashbackParty !==
        (group.settings.allow_member_create_flashback_party ?? true));

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
        if (!coverImageUri.startsWith("http")) {
          finalCoverUrl = await groupsService.uploadGroupCover(
            group!.id,
            coverImageUri,
          );
        }
      }

      await updateGroup({
        name: name.trim(),
        description: description.trim(),
        cover_image_url: finalCoverUrl || undefined,
        settings: {
          ...group!.settings,
          allow_member_nominations: allowMemberNominations,
          allow_member_manage_widgets: allowMemberManageWidgets,
          allow_member_create_events: allowMemberCreateEvents,
          allow_member_edit_events: allowMemberEditEvents,
          allow_member_upload_gallery: allowMemberUploadGallery,
          allow_member_create_notes: allowMemberCreateNotes,
          allow_member_create_expenses: allowMemberCreateExpenses,
          allow_member_settle_expenses: allowMemberSettleExpenses,
          allow_member_create_flashback_party: allowMemberCreateFlashbackParty,
        },
      });
      showSnackbar("Grupo actualizado correctamente", "success");
      router.back();
    } catch (error: any) {
      showSnackbar(error.message || "No se pudo actualizar el grupo", "error");
    } finally {
      setSaving(false);
    }
  }, [
    name,
    description,
    coverImageUri,
    group,
    allowMemberNominations,
    allowMemberManageWidgets,
    allowMemberCreateEvents,
    allowMemberEditEvents,
    allowMemberUploadGallery,
    allowMemberCreateNotes,
    allowMemberCreateExpenses,
    allowMemberSettleExpenses,
    allowMemberCreateFlashbackParty,
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

  // Deja sitio a la barra flotante, que va por encima del contenido
  const contentTop = insets.top + TOP_BAR_HEIGHT;

  if (isLoading) {
    const block = theme.colors.surfaceVariant;

    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Animated.View
          entering={FadeIn.duration(400)}
          style={[styles.content, { paddingTop: contentTop + 24 }]}
        >
          <View style={[styles.skeletonTitle, { backgroundColor: block }]} />
          <View style={[styles.cover, { backgroundColor: block }]} />
          <View style={[styles.skeletonGroup, { backgroundColor: block }]} />
          <View style={[styles.skeletonGroup, { backgroundColor: block }]} />
        </Animated.View>
        <FloatingTopBar onBack={() => router.back()} />
      </View>
    );
  }

  if (!group || !isAdmin) {
    return (
      <StatusView
        icon="lock-closed"
        color={theme.colors.onSurfaceVariant}
        title="Sin acceso"
        message="No tienes permisos de administrador para ver esta pantalla."
        onClose={() => router.back()}
      >
        <CTAButton
          title="Volver"
          iconName="arrow-back"
          onPress={() => router.back()}
        />
      </StatusView>
    );
  }

  const permissionRows: ToggleRowProps[] = [
    {
      icon: "grid-outline",
      title: "Gestionar widgets",
      description: "Los miembros pueden añadir o quitar widgets",
      value: allowMemberManageWidgets,
      onToggle: setAllowMemberManageWidgets,
    },
    ...(activeWidgetNames.has("Premios")
      ? [
          {
            icon: "trophy-outline" as const,
            title: "Crear premios",
            description: "Los miembros pueden crear premios",
            value: allowMemberNominations,
            onToggle: setAllowMemberNominations,
          },
        ]
      : []),
    ...(activeWidgetNames.has("Agenda")
      ? [
          {
            icon: "calendar-outline" as const,
            title: "Crear eventos",
            description: "Los miembros pueden crear eventos en la agenda",
            value: allowMemberCreateEvents,
            onToggle: setAllowMemberCreateEvents,
          },
          {
            icon: "create-outline" as const,
            title: "Editar eventos de otros",
            description: "Los miembros pueden editar eventos ajenos",
            value: allowMemberEditEvents,
            onToggle: setAllowMemberEditEvents,
          },
        ]
      : []),
    ...(activeWidgetNames.has("Archivo")
      ? [
          {
            icon: "image-outline" as const,
            title: "Subir al archivo",
            description: "Los miembros pueden subir fotos y vídeos",
            value: allowMemberUploadGallery,
            onToggle: setAllowMemberUploadGallery,
          },
        ]
      : []),
    ...(activeWidgetNames.has("Bloc")
      ? [
          {
            icon: "document-text-outline" as const,
            title: "Crear notas",
            description: "Los miembros pueden crear notas en el bloc",
            value: allowMemberCreateNotes,
            onToggle: setAllowMemberCreateNotes,
          },
        ]
      : []),
    ...(activeWidgetNames.has("Gastos")
      ? [
          {
            icon: "cash-outline" as const,
            title: "Crear gastos",
            description: "Los miembros pueden registrar gastos compartidos",
            value: allowMemberCreateExpenses,
            onToggle: setAllowMemberCreateExpenses,
          },
          {
            icon: "checkmark-done-outline" as const,
            title: "Liquidar gastos",
            description: "Los miembros pueden marcar liquidaciones",
            value: allowMemberSettleExpenses,
            onToggle: setAllowMemberSettleExpenses,
          },
        ]
      : []),
    ...(activeWidgetNames.has("Flashback")
      ? [
          {
            icon: "camera-outline" as const,
            title: "Crear fiestas Flashback",
            description: "Los miembros pueden crear fiestas Flashback",
            value: allowMemberCreateFlashbackParty,
            onToggle: setAllowMemberCreateFlashbackParty,
          },
        ]
      : []),
  ];

  const showMemberOptions = (member: (typeof group.members)[number]) => {
    const memberName = getMemberDisplayName(member);

    const changeRole =
      (role: "admin" | "member", success: string) => async () => {
        try {
          setSaving(true);
          await updateMemberRole(member.user_id, role);
          showSnackbar(success, "success");
        } catch {
          showSnackbar("Error al actualizar rol", "error");
        } finally {
          setSaving(false);
        }
      };

    const options: MenuOption[] = [];

    if (member.role === "member") {
      options.push({
        label: "Hacer Administrador",
        icon: "shield-checkmark-outline",
        action: () =>
          setDialogConfig({
            visible: true,
            title: "Hacer Administrador",
            message: `¿Quieres promover a ${memberName} a Administrador?`,
            confirmText: "Promover",
            type: "info",
            onConfirm: changeRole("admin", "Miembro promovido a Administrador"),
          }),
      });
    } else if (member.role === "admin") {
      options.push({
        label: "Quitar Administrador",
        icon: "shield-outline",
        action: () =>
          setDialogConfig({
            visible: true,
            title: "Quitar Administrador",
            message: `¿Quieres degradar a ${memberName} a miembro?`,
            confirmText: "Degradar",
            type: "warning",
            onConfirm: changeRole(
              "member",
              "Administrador degradado a miembro",
            ),
          }),
      });
    }

    options.push({
      label: "Expulsar del grupo",
      icon: "person-remove-outline",
      isDestructive: true,
      action: () =>
        setDialogConfig({
          visible: true,
          title: "Expulsar miembro",
          message: `¿Seguro que quieres expulsar a ${memberName} del grupo?`,
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
          },
        }),
    });

    setOptionsMenu({
      visible: true,
      title: `Gestionar a ${memberName}`,
      options,
    });
  };

  const badgeIcon = (
    <Ionicons name="camera" size={20} color={theme.colors.onSurface} />
  );

  return (
    <>
      <BlurTargetView
        ref={backgroundRef}
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        {/* En iOS el propio ScrollView esquiva el teclado y deja a la vista el campo activo */}
        <KeyboardAvoidingView
          style={styles.container}
          behavior="height"
          enabled={Platform.OS === "android"}
        >
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingTop: contentTop, paddingBottom: 32 + insets.bottom },
            ]}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.titleWrapper}>
              <StepTitle main="Ajustes del" accent="grupo" />
            </View>

            {/* Identidad: la portada tal como se ve en el grupo, y debajo nombre y descripción */}
            <Animated.View entering={FadeInDown.duration(400).delay(60)}>
              <Pressable
                onPress={handlePickPhoto}
                accessibilityRole="button"
                accessibilityLabel="Cambiar la portada del grupo"
                style={({ pressed }) => [
                  { transform: [{ scale: pressed ? 0.98 : 1 }] },
                ]}
              >
                <SquircleView
                  style={[
                    styles.cover,
                    styles.coverFrame,
                    { borderColor: theme.colors.outlineVariant },
                  ]}
                  cornerSmoothing={1}
                >
                  <GroupCover
                    uri={coverImageUri}
                    name={name.trim() || "Grupo"}
                    style={StyleSheet.absoluteFill}
                  />
                </SquircleView>

                {glassAvailable ? (
                  <GlassView style={styles.coverBadge}>{badgeIcon}</GlassView>
                ) : (
                  <View
                    style={[
                      styles.coverBadge,
                      styles.coverBadgeSolid,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.outlineVariant,
                      },
                    ]}
                  >
                    {badgeIcon}
                  </View>
                )}
              </Pressable>

              <SquircleView
                style={[
                  styles.group,
                  styles.fields,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant,
                  },
                ]}
                cornerSmoothing={1}
              >
                <TextInput
                  accessibilityLabel="Nombre del grupo"
                  placeholder="Nombre del grupo"
                  placeholderTextColor={theme.colors.onSurfaceVariant}
                  value={name}
                  onChangeText={setName}
                  maxLength={30}
                  style={[styles.nameInput, { color: theme.colors.onSurface }]}
                  selectionColor={theme.colors.primary}
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => descriptionRef.current?.focus()}
                />
                <Separator />
                <TextInput
                  ref={descriptionRef}
                  accessibilityLabel="Descripción del grupo"
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
                />
              </SquircleView>
            </Animated.View>

            <Section title={`Miembros · ${group.members.length}`} delay={120}>
              {group.members.map((member, index) => {
                const isMe = user?.id === member.user_id;
                const canManage =
                  (isOwner || (isAdmin && member.role !== "owner")) && !isMe;
                const memberName = getMemberDisplayName(member);

                return (
                  <React.Fragment key={member.user_id}>
                    {index > 0 && <Separator inset={66} />}
                    <View style={styles.row}>
                      <MemberAvatar user={member} size="sm" />
                      <View style={styles.rowText}>
                        <Text
                          style={[
                            styles.rowTitle,
                            { color: theme.colors.onSurface },
                          ]}
                          numberOfLines={1}
                        >
                          {memberName}
                          {isMe ? " (tú)" : ""}
                        </Text>
                        <Text
                          style={[
                            styles.rowDescription,
                            { color: theme.colors.onSurfaceVariant },
                          ]}
                        >
                          {ROLE_LABELS[member.role] ?? "Miembro"}
                        </Text>
                      </View>

                      {canManage && (
                        <Pressable
                          onPress={() => showMemberOptions(member)}
                          accessibilityRole="button"
                          accessibilityLabel={`Gestionar a ${memberName}`}
                          hitSlop={12}
                          style={({ pressed }) => ({
                            opacity: pressed ? 0.5 : 1,
                          })}
                        >
                          <Ionicons
                            name="ellipsis-horizontal"
                            size={22}
                            color={theme.colors.onSurfaceVariant}
                          />
                        </Pressable>
                      )}
                    </View>
                  </React.Fragment>
                );
              })}
            </Section>

            <Section
              title="Permisos"
              footer="Lo que pueden hacer los miembros que no son administradores. Solo aparecen los permisos de los widgets que tenéis activos."
              delay={180}
            >
              {permissionRows.map((row, index) => (
                <React.Fragment key={row.title}>
                  {index > 0 && <Separator inset={52} />}
                  <ToggleRow {...row} />
                </React.Fragment>
              ))}
            </Section>

            {isOwner && (
              <Section
                title="Zona de peligro"
                footer="Eliminar el grupo borra todos sus datos para todos los miembros. No se puede deshacer."
                delay={240}
              >
                <Pressable
                  onPress={handleDelete}
                  disabled={saving}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.row,
                    { opacity: pressed ? 0.55 : 1 },
                  ]}
                >
                  <Ionicons
                    name="trash-outline"
                    size={22}
                    color={theme.colors.error}
                  />
                  <Text
                    style={[
                      styles.rowTitle,
                      styles.rowText,
                      { color: theme.colors.error },
                    ]}
                  >
                    Eliminar grupo
                  </Text>
                </Pressable>
              </Section>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        <FloatingTopBar
          onBack={handleBack}
          right={
            hasUnsavedChanges && (
              <SaveButton onPress={handleSave} saving={saving} />
            )
          }
        />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
  },
  // El título compartido trae su propio margen lateral
  titleWrapper: {
    marginHorizontal: -24,
    marginBottom: 12,
  },

  cover: {
    height: 170,
    borderRadius: 24,
  },
  coverFrame: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  coverBadge: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  coverBadgeSolid: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  fields: {
    marginTop: 12,
  },
  nameInput: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  descriptionInput: {
    fontFamily: "Archivo-Regular",
    fontSize: 16,
    lineHeight: 22,
    minHeight: 76,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    textAlignVertical: "top",
  },

  section: {
    marginTop: 28,
  },
  sectionTitle: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 14,
    letterSpacing: 0.2,
    marginBottom: 8,
    marginLeft: 6,
  },
  sectionFooter: {
    fontFamily: "Archivo-Regular",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
    marginHorizontal: 6,
  },
  group: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 60,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 16,
  },
  rowDescription: {
    fontFamily: "Archivo-Regular",
    fontSize: 13,
    lineHeight: 17,
    marginTop: 2,
  },

  saveButton: {
    height: 44,
    minWidth: 104,
    borderRadius: 22,
  },
  saveButtonContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  saveButtonText: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 15,
  },

  skeletonTitle: {
    width: 180,
    height: 44,
    borderRadius: 10,
    marginBottom: 24,
  },
  skeletonGroup: {
    height: 120,
    borderRadius: 22,
    marginTop: 28,
  },
});
