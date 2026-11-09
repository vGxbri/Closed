/**
 * Perfil del grupo
 * Cómo te ven los demás en este grupo: alias, foto, tu actividad y tu pertenencia al grupo.
 */
import { Ionicons } from "@expo/vector-icons";
import { BlurTargetView } from "expo-blur";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import * as ImagePicker from "expo-image-picker";
import { useGlobalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Platform,
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

import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FloatingTopBar, TOP_BAR_HEIGHT } from "@/components/ui/FloatingTopBar";
import { MenuOption, OptionsMenu } from "@/components/ui/OptionsMenu";
import { SaveButton } from "@/components/ui/SaveButton";
import { useSnackbar } from "@/components/ui/SnackbarContext";
import { getAvatarSeed, UserAvatar } from "@/components/ui/UserAvatar";
import { useAuth, useGroup } from "@/hooks";
import { getMemberAvatarUrl, getMemberDisplayName } from "@/lib/memberProfile";
import { groupsService, widgetsService } from "@/services";
import { GroupMemberView } from "@/types/database";

// Liquid Glass solo existe en iOS 26+; en el resto los controles son superficies opacas.
const glassAvailable = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

const ROLE_LABELS: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  member: "Miembro",
};

function formatTimeSince(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();

  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (totalDays < 1) return "Hoy";
  if (totalDays === 1) return "1 día";
  if (totalDays < 30) return `${totalDays} días`;

  const months = Math.floor(totalDays / 30);
  if (months === 1) return "1 mes";
  if (months < 12) return `${months} meses`;

  const years = Math.floor(months / 12);
  return years === 1 ? "1 año" : `${years} años`;
}

function formatJoinedDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface SectionProps {
  title: string;
  /** Texto de ayuda bajo el bloque, como los pies de sección de iOS. */
  footer?: string;
  delay: number;
  children: React.ReactNode;
}

// Sección: título, bloque agrupado con las filas y pie opcional
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

function Separator({ inset = 52 }: { inset?: number }) {
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

interface ActionRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value?: string;
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

function ActionRow({
  icon,
  title,
  value,
  destructive = false,
  disabled = false,
  onPress,
}: ActionRowProps) {
  const theme = useTheme();
  const color = destructive ? theme.colors.error : theme.colors.onSurface;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={value ? `${title}: ${value}` : title}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.55 : 1 }]}
    >
      <Ionicons
        name={icon}
        size={22}
        color={destructive ? theme.colors.error : theme.colors.primary}
      />
      <Text style={[styles.rowTitle, styles.rowFill, { color }]}>{title}</Text>
      {value && (
        <Text
          style={[styles.rowValue, { color: theme.colors.onSurfaceVariant }]}
          numberOfLines={1}
        >
          {value}
        </Text>
      )}
      {!destructive && (
        <Ionicons
          name="chevron-forward"
          size={17}
          color={theme.colors.onSurfaceVariant}
        />
      )}
    </Pressable>
  );
}

const ProfileSkeleton = React.memo(() => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const block = theme.colors.surfaceVariant;

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      style={[
        styles.content,
        { paddingTop: insets.top + TOP_BAR_HEIGHT, alignItems: "center" },
      ]}
    >
      <View style={[styles.skeletonAvatar, { backgroundColor: block }]} />
      <View style={[styles.skeletonName, { backgroundColor: block }]} />
      <View style={[styles.skeletonRole, { backgroundColor: block }]} />
      <View style={[styles.skeletonGroup, { backgroundColor: block }]} />
      <View style={[styles.skeletonGroup, { backgroundColor: block }]} />
    </Animated.View>
  );
});

ProfileSkeleton.displayName = "ProfileSkeleton";

export default function ProfileScreen() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();
  const {
    group,
    isLoading,
    leaveGroup,
    isOwner,
    updateMyMembership,
    uploadMemberAvatar,
    transferOwnership,
  } = useGroup(id as string);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const backgroundRef = useRef(null);
  const router = useRouter();
  const { showSnackbar } = useSnackbar();

  // null mientras no se toca el campo: así siempre refleja el alias guardado
  const [aliasDraft, setAliasDraft] = useState<string | null>(null);
  const [isSavingAlias, setIsSavingAlias] = useState(false);

  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [showTransferSheet, setShowTransferSheet] = useState(false);
  const [transferTarget, setTransferTarget] = useState<GroupMemberView | null>(
    null,
  );
  const [isTransferring, setIsTransferring] = useState(false);

  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const [activity, setActivity] = useState<{
    messages: number;
    photos: number;
  } | null>(null);
  const [hasGallery, setHasGallery] = useState(false);

  const myMembership = useMemo(
    () => group?.members.find((m) => m.user_id === user?.id) ?? null,
    [group, user],
  );

  // Actividad del miembro; las fotos solo cuentan si el grupo tiene el Archivo activo
  useEffect(() => {
    if (!id || !user) return;
    let cancelled = false;

    groupsService
      .getMemberActivity(id as string, user.id)
      .then((result) => {
        if (!cancelled) setActivity(result);
      })
      .catch(() => {});
    widgetsService
      .getGroupWidgets(id as string)
      .then((widgets) => {
        if (!cancelled) {
          setHasGallery(widgets.some((w) => w.widget.name === "Archivo"));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [id, user]);

  const savedAlias = myMembership?.group_display_name?.trim() ?? "";
  const aliasValue = aliasDraft ?? savedAlias;
  const aliasDirty = aliasDraft !== null && aliasDraft.trim() !== savedAlias;

  const handleSaveAlias = useCallback(async () => {
    if (!aliasDirty || aliasDraft === null) return;
    const next = aliasDraft.trim();
    try {
      setIsSavingAlias(true);
      // Sin alias se vuelve a usar el nombre del perfil
      await updateMyMembership({ group_display_name: next || null });
      setAliasDraft(null);
      showSnackbar(next ? "Alias guardado" : "Alias quitado", "success");
    } catch {
      showSnackbar("No se pudo guardar el alias", "error");
    } finally {
      setIsSavingAlias(false);
    }
  }, [aliasDirty, aliasDraft, updateMyMembership, showSnackbar]);

  const setGroupAvatar = useCallback(
    async (value: string | null, success: string) => {
      try {
        setIsUploadingPhoto(true);
        await updateMyMembership({ group_avatar_url: value });
        showSnackbar(success, "success");
      } catch {
        showSnackbar("No se pudo cambiar la foto", "error");
      } finally {
        setIsUploadingPhoto(false);
      }
    },
    [updateMyMembership, showSnackbar],
  );

  const pickPhoto = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    try {
      setIsUploadingPhoto(true);
      const publicUrl = await uploadMemberAvatar(result.assets[0].uri);
      await updateMyMembership({ group_avatar_url: publicUrl });
      showSnackbar("Foto actualizada", "success");
    } catch {
      showSnackbar("No se pudo subir la foto", "error");
    } finally {
      setIsUploadingPhoto(false);
    }
  }, [uploadMemberAvatar, updateMyMembership, showSnackbar]);

  const handleLeave = useCallback(async () => {
    try {
      setIsLeaving(true);
      await leaveGroup();
      setShowLeaveDialog(false);
      router.replace("/(tabs)/groups");
    } catch {
      setShowLeaveDialog(false);
      showSnackbar("No se pudo abandonar el grupo", "error");
    } finally {
      setIsLeaving(false);
    }
  }, [leaveGroup, router, showSnackbar]);

  const handleTransfer = useCallback(async () => {
    if (!transferTarget) return;
    try {
      setIsTransferring(true);
      await transferOwnership(transferTarget.user_id);
      showSnackbar(
        `${getMemberDisplayName(transferTarget)} es el nuevo propietario`,
        "success",
      );
    } catch {
      showSnackbar("No se pudo transferir la propiedad", "error");
    } finally {
      setIsTransferring(false);
      setTransferTarget(null);
    }
  }, [transferTarget, transferOwnership, showSnackbar]);

  // Administradores primero: son los candidatos más naturales
  const transferableMembers = useMemo(
    () =>
      (group?.members ?? [])
        .filter((m) => m.user_id !== user?.id)
        .sort(
          (a, b) => (a.role === "admin" ? 0 : 1) - (b.role === "admin" ? 0 : 1),
        ),
    [group, user?.id],
  );

  if (isLoading || !group) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <ProfileSkeleton />
        <FloatingTopBar onBack={() => router.back()} />
      </View>
    );
  }

  const displayName = myMembership
    ? getMemberDisplayName(myMembership)
    : profile?.display_name || "Usuario";
  const avatarUrl = myMembership
    ? getMemberAvatarUrl(myMembership)
    : (profile?.avatar_url ?? null);
  const roleName = ROLE_LABELS[myMembership?.role ?? "member"] ?? "Miembro";

  // group_avatar_url: null usa la foto del perfil, "" no muestra ninguna y una URL es la propia del grupo
  const groupAvatar = myMembership?.group_avatar_url;
  const hasCustomPhoto = !!groupAvatar;
  const usesProfilePhoto = groupAvatar == null && !!profile?.avatar_url;
  const photoStatus = hasCustomPhoto
    ? "Solo de este grupo"
    : usesProfilePhoto
      ? "La de tu perfil"
      : "Sin foto";

  const photoOptions: MenuOption[] = [
    {
      label: hasCustomPhoto ? "Elegir otra foto" : "Elegir de la galería",
      icon: "images-outline",
      action: pickPhoto,
    },
    ...(profile?.avatar_url && groupAvatar != null
      ? [
          {
            label: "Usar la foto de mi perfil",
            icon: "person-circle-outline" as const,
            action: () =>
              setGroupAvatar(null, "Ahora usas la foto de tu perfil"),
          },
        ]
      : []),
    ...(avatarUrl
      ? [
          {
            label: "Quitar foto",
            icon: "trash-outline" as const,
            isDestructive: true,
            action: () => setGroupAvatar("", "Foto quitada"),
          },
        ]
      : []),
  ];

  const joinedAt = myMembership?.joined_at;
  const plural = (n: number, one: string, many: string) =>
    n === 1 ? one : many;

  // Resumen de tu paso por el grupo en una línea: cifra destacada y texto en gris
  const timeInGroup = joinedAt ? formatTimeSince(joinedAt) : null;
  const summary: { value: string; text: string }[] = [
    ...(timeInGroup
      ? [
          timeInGroup === "Hoy"
            ? { value: "Desde hoy", text: "" }
            : { value: timeInGroup, text: " en el grupo" },
        ]
      : []),
    ...(activity
      ? [
          {
            value: String(activity.messages),
            text: ` ${plural(activity.messages, "mensaje", "mensajes")}`,
          },
          ...(hasGallery
            ? [
                {
                  value: String(activity.photos),
                  text: ` ${plural(activity.photos, "foto", "fotos")}`,
                },
              ]
            : []),
        ]
      : []),
  ];
  const summaryLabel = [
    joinedAt ? `Miembro desde el ${formatJoinedDate(joinedAt)}` : null,
    ...summary.slice(timeInGroup ? 1 : 0).map((item) => item.value + item.text),
  ]
    .filter(Boolean)
    .join(", ");

  const neutralFill = theme.dark
    ? "rgba(255,255,255,0.08)"
    : "rgba(0,0,0,0.05)";

  const badgeIcon = isUploadingPhoto ? (
    <ActivityIndicator size="small" color={theme.colors.onSurface} />
  ) : (
    <Ionicons name="camera" size={19} color={theme.colors.onSurface} />
  );

  return (
    <>
      <BlurTargetView
        ref={backgroundRef}
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + TOP_BAR_HEIGHT,
              // En iOS la barra nativa ya forma parte del área segura inferior.
              paddingBottom: insets.bottom + (Platform.OS === "ios" ? 24 : 96),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          {/* Cómo te ven los demás en este grupo */}
          <Animated.View entering={FadeIn.duration(400)} style={styles.hero}>
            <Pressable
              onPress={() => setShowPhotoMenu(true)}
              disabled={isUploadingPhoto}
              accessibilityRole="button"
              accessibilityLabel="Cambiar tu foto en este grupo"
              style={({ pressed }) => ({
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <UserAvatar
                uri={avatarUrl}
                name={displayName}
                seed={user ? getAvatarSeed(user.id, id) : undefined}
                size={116}
                borderRadius={38}
              />
              {glassAvailable ? (
                <GlassView style={styles.avatarBadge}>{badgeIcon}</GlassView>
              ) : (
                <View
                  style={[
                    styles.avatarBadge,
                    styles.avatarBadgeSolid,
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

            <Text
              accessibilityRole="header"
              style={[styles.name, { color: theme.colors.onSurface }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {displayName}
            </Text>
            <Text
              style={[styles.role, { color: theme.colors.onSurfaceVariant }]}
              numberOfLines={1}
            >
              {roleName} de{" "}
              <Text style={[styles.roleGroup, { color: theme.colors.primary }]}>
                {group.name}
              </Text>
            </Text>

            {summary.length > 0 && (
              <Animated.Text
                entering={FadeIn.duration(300)}
                accessibilityLabel={summaryLabel}
                style={[
                  styles.summary,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {summary.map((item, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && "  ·  "}
                    <Text
                      style={[
                        styles.summaryValue,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      {item.value}
                    </Text>
                    {item.text}
                  </React.Fragment>
                ))}
              </Animated.Text>
            )}
          </Animated.View>

          <Section
            title="Tu identidad aquí"
            footer={`Solo la ven los miembros de ${group.name}. Tu perfil general no cambia.`}
            delay={140}
          >
            <View style={styles.row}>
              <Ionicons
                name="at-outline"
                size={22}
                color={theme.colors.primary}
              />
              <TextInput
                accessibilityLabel="Alias en este grupo"
                accessibilityHint="Déjalo vacío para usar el nombre de tu perfil"
                // Sin alias se muestra el nombre del perfil, que es el que verán los demás
                placeholder={profile?.display_name || "Alias"}
                placeholderTextColor={theme.colors.onSurfaceVariant}
                value={aliasValue}
                onChangeText={setAliasDraft}
                maxLength={30}
                style={[
                  styles.rowTitle,
                  styles.rowFill,
                  styles.aliasInput,
                  { color: theme.colors.onSurface },
                ]}
                selectionColor={theme.colors.primary}
                returnKeyType="done"
                onSubmitEditing={handleSaveAlias}
              />
              {aliasValue.length > 0 && (
                <Pressable
                  onPress={() => setAliasDraft("")}
                  accessibilityRole="button"
                  accessibilityLabel="Borrar el alias"
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.clearButton,
                    {
                      backgroundColor: neutralFill,
                      opacity: pressed ? 0.5 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name="close"
                    size={14}
                    color={theme.colors.onSurfaceVariant}
                  />
                </Pressable>
              )}
            </View>
            <Separator />
            <ActionRow
              icon="camera-outline"
              title="Foto"
              value={photoStatus}
              onPress={() => setShowPhotoMenu(true)}
              disabled={isUploadingPhoto}
            />
          </Section>

          <Section
            title="Tu sitio en el grupo"
            footer={
              isOwner
                ? "Para salir del grupo, antes tienes que pasar la propiedad a otro miembro. Tú seguirás como administrador."
                : undefined
            }
            delay={200}
          >
            {isOwner ? (
              <ActionRow
                icon="swap-horizontal-outline"
                title="Transferir propiedad"
                onPress={() =>
                  transferableMembers.length === 0
                    ? showSnackbar(
                        "Aún no hay otros miembros a quien pasarla",
                        "info",
                      )
                    : setShowTransferSheet(true)
                }
              />
            ) : (
              <ActionRow
                icon="log-out-outline"
                title="Abandonar grupo"
                destructive
                onPress={() => setShowLeaveDialog(true)}
              />
            )}
          </Section>
        </ScrollView>

        <FloatingTopBar
          onBack={() => router.back()}
          right={
            aliasDirty && (
              <SaveButton onPress={handleSaveAlias} saving={isSavingAlias} />
            )
          }
        />

        <BottomSheetModal
          visible={showTransferSheet}
          onDismiss={() => setShowTransferSheet(false)}
          blurTarget={backgroundRef}
          contentStyle={styles.sheetContent}
        >
          <Text
            accessibilityRole="header"
            style={[styles.sheetTitle, { color: theme.colors.onSurface }]}
          >
            Transferir propiedad
          </Text>
          <Text
            style={[
              styles.sheetSubtitle,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            Elige quién será el nuevo propietario.
          </Text>

          <ScrollView
            style={styles.sheetList}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.sheetGroup, { backgroundColor: neutralFill }]}>
              {transferableMembers.map((member, index) => {
                const memberName = getMemberDisplayName(member);
                return (
                  <React.Fragment key={member.user_id}>
                    {index > 0 && <Separator inset={66} />}
                    <Pressable
                      onPress={() => {
                        setShowTransferSheet(false);
                        // La confirmación se abre cuando la hoja ya se ha cerrado
                        setTimeout(() => setTransferTarget(member), 300);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`${memberName}, ${ROLE_LABELS[member.role] ?? "Miembro"}`}
                      style={({ pressed }) => [
                        styles.row,
                        { opacity: pressed ? 0.55 : 1 },
                      ]}
                    >
                      <UserAvatar
                        uri={getMemberAvatarUrl(member)}
                        name={memberName}
                        seed={getAvatarSeed(member.user_id, member.group_id)}
                        size={36}
                      />
                      <Text
                        style={[
                          styles.rowTitle,
                          styles.rowFill,
                          { color: theme.colors.onSurface },
                        ]}
                        numberOfLines={1}
                      >
                        {memberName}
                      </Text>
                      <Text
                        style={[
                          styles.rowValue,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                      >
                        {ROLE_LABELS[member.role] ?? "Miembro"}
                      </Text>
                    </Pressable>
                  </React.Fragment>
                );
              })}
            </View>
          </ScrollView>
        </BottomSheetModal>
      </BlurTargetView>

      <OptionsMenu
        visible={showPhotoMenu}
        title="Tu foto en este grupo"
        options={photoOptions}
        onDismiss={() => setShowPhotoMenu(false)}
        blurTarget={backgroundRef}
      />

      <ConfirmDialog
        visible={!!transferTarget}
        title="Transferir propiedad"
        message={
          transferTarget
            ? `${getMemberDisplayName(transferTarget)} será el nuevo propietario de ${group.name}. Tú pasarás a ser administrador.`
            : ""
        }
        type="warning"
        confirmText={isTransferring ? "Transfiriendo..." : "Transferir"}
        cancelText="Cancelar"
        onConfirm={handleTransfer}
        onCancel={() => setTransferTarget(null)}
        showCancel
        blurTargetRef={backgroundRef}
      />

      <ConfirmDialog
        visible={showLeaveDialog}
        title="¿Abandonar el grupo?"
        message={`Dejarás de ver el contenido de ${group.name}. Podrás volver a unirte con una invitación.`}
        type="error"
        confirmText={isLeaving ? "Saliendo..." : "Abandonar"}
        cancelText="Cancelar"
        onConfirm={handleLeave}
        onCancel={() => setShowLeaveDialog(false)}
        showCancel
        blurTargetRef={backgroundRef}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },

  hero: {
    alignItems: "center",
    paddingTop: 4,
  },
  avatarBadge: {
    position: "absolute",
    right: -6,
    bottom: -6,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarBadgeSolid: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  name: {
    fontFamily: "Archivo-Bold",
    fontSize: 28,
    marginTop: 18,
    maxWidth: "100%",
  },
  role: {
    fontFamily: "Archivo-Regular",
    fontSize: 15,
    marginTop: 4,
    maxWidth: "100%",
  },
  roleGroup: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 19,
  },

  summary: {
    fontFamily: "Archivo-Regular",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 12,
  },
  summaryValue: {
    fontFamily: "Archivo-SemiBold",
  },

  section: { marginTop: 28 },
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
  separator: { height: StyleSheet.hairlineWidth },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  rowFill: { flex: 1 },
  rowTitle: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 16,
  },
  rowValue: {
    fontFamily: "Archivo-Regular",
    fontSize: 15,
    maxWidth: "45%",
  },
  aliasInput: {
    paddingVertical: 8,
  },
  clearButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },

  sheetContent: {
    paddingHorizontal: 16,
    paddingBottom: 34,
  },
  sheetTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 20,
    lineHeight: 25,
    paddingHorizontal: 6,
    paddingTop: 4,
  },
  sheetSubtitle: {
    fontFamily: "Archivo-Regular",
    fontSize: 14,
    lineHeight: 19,
    paddingHorizontal: 6,
    marginTop: 4,
    marginBottom: 14,
  },
  sheetList: { maxHeight: 420 },
  sheetGroup: {
    borderRadius: 22,
    overflow: "hidden",
  },

  skeletonAvatar: { width: 116, height: 116, borderRadius: 38 },
  skeletonName: { width: 180, height: 30, borderRadius: 10, marginTop: 18 },
  skeletonRole: { width: 140, height: 16, borderRadius: 8, marginTop: 8 },
  skeletonGroup: {
    alignSelf: "stretch",
    height: 112,
    borderRadius: 22,
    marginTop: 28,
  },
});
