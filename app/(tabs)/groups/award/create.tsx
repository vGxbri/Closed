/**
 * Crear premio
 * Flujo para registrar un nuevo premio o reconocimiento en el grupo.
 */
import { Ionicons } from "@expo/vector-icons";
import { BlurTargetView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MemberAvatar } from "@/components/MemberAvatar";
import {
  AwardTextInput,
  GroupedCard,
  IconGrid,
  OptionRow,
  RowDivider,
  SectionLabel,
  SubmitButton,
} from "@/components/award/AwardFormUI";
import { AwardFormSkeleton } from "@/components/award/AwardSkeletons";
import { ConfirmDialog, DialogType } from "@/components/ui/ConfirmDialog";
import { CustomHeader } from "@/components/ui/CustomHeader";
import { useSnackbar } from "@/components/ui/SnackbarContext";
import {
  defaultAwardIcon,
  getIconComponent,
  IconName,
} from "@/constants/icons";
import { useGroup } from "@/hooks";
import { awardsService } from "@/services";
import { VoteType } from "@/types/database";

const VOTE_TYPE_OPTIONS: {
  value: VoteType;
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    value: "person",
    label: "Personas",
    subtitle: "Vota por miembros del grupo",
    icon: "people-outline",
  },
  {
    value: "photo",
    label: "Fotos",
    subtitle: "Vota por las mejores fotos",
    icon: "image-outline",
  },
  {
    value: "video",
    label: "Vídeos",
    subtitle: "Sube y vota vídeos",
    icon: "videocam-outline",
  },
  {
    value: "audio",
    label: "Audios",
    subtitle: "Comparte y vota audios",
    icon: "musical-notes-outline",
  },
  {
    value: "text",
    label: "Textos",
    subtitle: "Frases o textos cortos",
    icon: "document-text-outline",
  },
];

export default function CreateAwardScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const backgroundRef = React.useRef(null);

  const { group, isLoading: groupLoading, isAdmin } = useGroup(groupId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIcon, setSelectedIcon] = useState<IconName>(defaultAwardIcon);
  const [selectedNominees, setSelectedNominees] = useState<string[]>([]);
  const [selectedVoteType, setSelectedVoteType] = useState<VoteType>("person");
  const [nomineesCanVote, setNomineesCanVote] = useState(false);
  const [allowSelfVote, setAllowSelfVote] = useState(false);
  const [allowVoteChange, setAllowVoteChange] = useState(false);
  const [loading, setLoading] = useState(false);

  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: DialogType;
  }>({ visible: false, title: "", message: "", type: "info" });
  const hideDialog = () =>
    setDialogConfig((prev) => ({ ...prev, visible: false }));

  const canCreateAward = useMemo(
    () => isAdmin || group?.settings?.allow_member_nominations,
    [isAdmin, group?.settings?.allow_member_nominations]
  );

  const toggleNominee = useCallback((userId: string) => {
    Haptics.selectionAsync();
    setSelectedNominees((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  }, []);

  const handleVoteTypeChange = useCallback((vt: VoteType) => {
    Haptics.selectionAsync();
    setSelectedVoteType(vt);
  }, []);

  const handleCreate = useCallback(async () => {
    const needsNominees = selectedVoteType === "person";
    if (!name.trim()) {
      setDialogConfig({
        visible: true,
        title: "Nombre requerido",
        message: "Dale un nombre a tu premio.",
        type: "warning",
      });
      return;
    }
    if (needsNominees && selectedNominees.length < 2) {
      setDialogConfig({
        visible: true,
        title: "Mínimo 2 nominados",
        message: "Selecciona al menos 2 personas para nominar.",
        type: "warning",
      });
      return;
    }
    if (!groupId) return;

    try {
      setLoading(true);
      Keyboard.dismiss();

      await awardsService.createAward({
        group_id: groupId,
        name: name.trim(),
        description: description.trim() || undefined,
        icon: selectedIcon,
        vote_type: selectedVoteType,
        nominee_ids: needsNominees ? selectedNominees : [],
        voting_settings: {
          allow_vote_change: allowVoteChange,
          ...(needsNominees && {
            nominees_can_vote: nomineesCanVote,
            allow_self_vote: nomineesCanVote && allowSelfVote,
          }),
        },
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showSnackbar("¡Premio creado!", "success");
      router.back();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al crear el premio";
      showSnackbar(message, "error");
    } finally {
      setLoading(false);
    }
  }, [
    name,
    description,
    selectedIcon,
    selectedVoteType,
    selectedNominees,
    nomineesCanVote,
    allowSelfVote,
    allowVoteChange,
    groupId,
    router,
    showSnackbar,
  ]);

  if (groupLoading) {
    return <AwardFormSkeleton variant="create" />;
  }

  if (!group || !canCreateAward) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View
          style={[
            styles.container,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <CustomHeader title="" showBackButton={true} />
          <View style={styles.lockContainer}>
            <SquircleView
              style={[
                styles.lockIcon,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
              cornerSmoothing={1}
            >
              <Ionicons
                name={!group ? "warning-outline" : "lock-closed-outline"}
                size={36}
                color={theme.colors.onSurfaceVariant}
              />
            </SquircleView>
            <Text
              style={[styles.lockTitle, { color: theme.colors.onSurface }]}
            >
              {!group ? "Grupo no encontrado" : "Sin permisos"}
            </Text>
            <Text
              style={[
                styles.lockSubtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {!group
                ? "No hemos podido cargar este grupo."
                : "Solo los administradores pueden crear premios en este grupo."}
            </Text>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                { opacity: pressed ? 0.9 : 1 },
                styles.lockButtonWrap,
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
        </View>
      </>
    );
  }

  const needsNominees = selectedVoteType === "person";
  const canSubmit =
    !!name.trim() &&
    (!needsNominees || selectedNominees.length >= 2) &&
    !loading;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <BlurTargetView
        ref={backgroundRef}
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <CustomHeader title="" showBackButton={true} />

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: 140 + insets.bottom },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            
            <Animated.View
              entering={FadeIn.duration(500)}
              style={styles.titleBlock}
            >
              <Text
                style={[styles.screenTitle, { color: theme.colors.primary }]}
              >
                Nuevo premio
              </Text>
              <Text
                style={[
                  styles.screenSubtitle,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Configura un premio para votar con tu grupo
              </Text>
            </Animated.View>

            <Animated.View
              entering={FadeIn.duration(400).delay(50)}
              style={[
                styles.divider,
                { backgroundColor: theme.colors.outlineVariant },
              ]}
            />

            <Animated.View
              entering={FadeInDown.duration(300).delay(80)}
              style={styles.section}
            >
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
                    styles.previewIcon,
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
                  {getIconComponent(selectedIcon, 30, theme.colors.primary)}
                </SquircleView>
                <Text
                  style={[
                    styles.previewName,
                    { color: theme.colors.onSurface },
                  ]}
                  numberOfLines={1}
                >
                  {name.trim() || "Nombre del premio"}
                </Text>
                {description.trim() ? (
                  <Text
                    style={[
                      styles.previewDescription,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                    numberOfLines={2}
                  >
                    {description.trim()}
                  </Text>
                ) : null}
              </SquircleView>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(300).delay(120)}
              style={styles.section}
            >
              <SectionLabel>Nombre *</SectionLabel>
              <AwardTextInput
                value={name}
                onChangeText={setName}
                placeholder="ej. Mejor Amigo del Año"
                maxLength={40}
                autoFocus
              />
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(300).delay(160)}
              style={styles.section}
            >
              <SectionLabel>Descripción (opcional)</SectionLabel>
              <AwardTextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Describe este premio..."
                maxLength={200}
                multiline
              />
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(300).delay(200)}
              style={styles.section}
            >
              <SectionLabel>Icono</SectionLabel>
              <IconGrid
                selectedIcon={selectedIcon}
                onSelect={(icon) => {
                  Haptics.selectionAsync();
                  setSelectedIcon(icon);
                }}
              />
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(300).delay(240)}
              style={styles.section}
            >
              <SectionLabel>¿Qué se va a votar?</SectionLabel>
              <GroupedCard>
                {VOTE_TYPE_OPTIONS.map((option, index) => (
                  <React.Fragment key={option.value}>
                    {index > 0 && <RowDivider />}
                    <OptionRow
                      icon={option.icon}
                      title={option.label}
                      subtitle={option.subtitle}
                      isActive={selectedVoteType === option.value}
                      onPress={() => handleVoteTypeChange(option.value)}
                      variant="radio"
                      isFirst={index === 0}
                      isLast={index === VOTE_TYPE_OPTIONS.length - 1}
                    />
                  </React.Fragment>
                ))}
              </GroupedCard>
            </Animated.View>

            {needsNominees && (
              <Animated.View
                entering={FadeInDown.duration(300).delay(280)}
                style={styles.section}
              >
                <View style={styles.sectionLabelRow}>
                  <SectionLabel>Nominados *</SectionLabel>
                  <Text
                    style={[
                      styles.counterPill,
                      {
                        color:
                          selectedNominees.length >= 2
                            ? theme.colors.primary
                            : theme.colors.onSurfaceVariant,
                        backgroundColor:
                          selectedNominees.length >= 2
                            ? theme.dark
                              ? "rgba(42,138,112,0.15)"
                              : "rgba(42,138,112,0.08)"
                            : theme.colors.surfaceVariant,
                      },
                    ]}
                  >
                    {selectedNominees.length}/{group.members.length} · mín 2
                  </Text>
                </View>

                <GroupedCard>
                  {group.members.length === 0 ? (
                    <View style={styles.emptyMembers}>
                      <Text
                        style={[
                          styles.emptyMembersText,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                      >
                        No hay miembros en el grupo
                      </Text>
                    </View>
                  ) : (
                    group.members.map((member, index) => {
                      const isSelected = selectedNominees.includes(
                        member.user_id
                      );
                      return (
                        <React.Fragment key={member.user_id}>
                          {index > 0 && <RowDivider />}
                          <Pressable
                            onPress={() => toggleNominee(member.user_id)}
                            style={({ pressed }) => [
                              styles.memberRow,
                              {
                                backgroundColor: pressed
                                  ? theme.dark
                                    ? "rgba(255,255,255,0.04)"
                                    : "rgba(0,0,0,0.03)"
                                  : "transparent",
                                borderTopLeftRadius: index === 0 ? 16 : 0,
                                borderTopRightRadius: index === 0 ? 16 : 0,
                                borderBottomLeftRadius:
                                  index === group.members.length - 1 ? 16 : 0,
                                borderBottomRightRadius:
                                  index === group.members.length - 1 ? 16 : 0,
                              },
                            ]}
                          >
                            <MemberAvatar user={member} size="sm" />
                            <Text
                              style={[
                                styles.memberName,
                                { color: theme.colors.onSurface },
                              ]}
                              numberOfLines={1}
                            >
                              {member.display_name}
                            </Text>
                            <SquircleView
                              style={[
                                styles.memberCheckbox,
                                {
                                  backgroundColor: isSelected
                                    ? theme.colors.primary
                                    : "transparent",
                                  borderColor: isSelected
                                    ? theme.colors.primary
                                    : theme.colors.outlineVariant,
                                  borderWidth: isSelected ? 0 : 1.5,
                                },
                              ]}
                              cornerSmoothing={1}
                            >
                              {isSelected && (
                                <Ionicons
                                  name="checkmark"
                                  size={14}
                                  color={theme.colors.onPrimary}
                                />
                              )}
                            </SquircleView>
                          </Pressable>
                        </React.Fragment>
                      );
                    })
                  )}
                </GroupedCard>
              </Animated.View>
            )}

            {!needsNominees && (
              <Animated.View
                entering={FadeInDown.duration(300).delay(280)}
                style={styles.section}
              >
                <SquircleView
                  style={[
                    styles.infoCard,
                    {
                      backgroundColor: theme.dark
                        ? "rgba(42,138,112,0.12)"
                        : "rgba(42,138,112,0.06)",
                      borderColor: theme.colors.primary,
                      borderWidth: 1,
                    },
                  ]}
                  cornerSmoothing={1}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Text
                    style={[
                      styles.infoCardText,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    {selectedVoteType === "photo"
                      ? "Podrás subir fotos antes de comenzar la votación."
                      : selectedVoteType === "video"
                        ? "Podrás subir vídeos antes de comenzar la votación."
                        : selectedVoteType === "audio"
                          ? "Podrás subir audios antes de comenzar la votación."
                          : "Podrás añadir textos antes de comenzar la votación."}
                  </Text>
                </SquircleView>
              </Animated.View>
            )}

            <Animated.View
              entering={FadeInDown.duration(300).delay(320)}
              style={styles.section}
            >
              <SectionLabel>Opciones de votación</SectionLabel>
              <GroupedCard>
                <OptionRow
                  icon="sync-outline"
                  title="Permitir cambiar el voto"
                  subtitle="Los miembros podrán modificar su voto"
                  isActive={allowVoteChange}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setAllowVoteChange((v) => !v);
                  }}
                  variant="toggle"
                  isFirst
                  isLast={!needsNominees}
                />

                {needsNominees && (
                  <>
                    <RowDivider />
                    <OptionRow
                      icon="hand-right-outline"
                      title="Los nominados pueden votar"
                      subtitle="Permite votar a los miembros nominados"
                      isActive={nomineesCanVote}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setNomineesCanVote((v) => {
                          if (v) setAllowSelfVote(false);
                          return !v;
                        });
                      }}
                      variant="toggle"
                      isLast={!nomineesCanVote}
                    />

                    {nomineesCanVote && (
                      <>
                        <RowDivider />
                        <OptionRow
                          icon="person-outline"
                          title="Pueden votarse a sí mismos"
                          subtitle="Cada nominado puede votarse a sí mismo"
                          isActive={allowSelfVote}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setAllowSelfVote((v) => !v);
                          }}
                          variant="toggle"
                          isLast
                        />
                      </>
                    )}
                  </>
                )}
              </GroupedCard>
            </Animated.View>
          </ScrollView>

          <Animated.View
            entering={FadeIn.duration(400).delay(280)}
            style={[
              styles.footer,
              {
                paddingBottom: insets.bottom + 16,
                borderTopColor: theme.colors.outlineVariant,
                backgroundColor: theme.colors.background,
              },
            ]}
          >
            <SubmitButton
              label="Crear premio"
              loadingLabel="Creando..."
              icon="trophy-outline"
              onPress={handleCreate}
              disabled={!canSubmit}
              loading={loading}
            />
          </Animated.View>
        </KeyboardAvoidingView>

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
  keyboardView: { flex: 1 },
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

  sectionLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  counterPill: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 11,
    letterSpacing: 0.3,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 10,
  },

  previewCard: {
    borderRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  previewIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  previewName: {
    fontFamily: "Archivo-Bold",
    fontSize: 18,
    letterSpacing: 0.2,
    textAlign: "center",
  },
  previewDescription: {
    fontFamily: "Archivo-Medium",
    fontSize: 13,
    letterSpacing: 0.1,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },

  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  memberName: {
    flex: 1,
    fontFamily: "Archivo-SemiBold",
    fontSize: 14.5,
    letterSpacing: 0.1,
  },
  memberCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyMembers: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyMembersText: {
    fontFamily: "Archivo-Medium",
    fontSize: 13,
  },

  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
  },
  infoCardText: {
    flex: 1,
    fontFamily: "Archivo-Medium",
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.1,
  },

  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
  },

  lockContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  lockIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  lockTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 18,
    textAlign: "center",
  },
  lockSubtitle: {
    fontFamily: "Archivo-Medium",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    letterSpacing: 0.1,
  },
  lockButtonWrap: { marginTop: 8 },
  lockButton: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
  },
  lockButtonText: {
    fontFamily: "Archivo-Bold",
    fontSize: 15,
  },
});
