/**
 * Editar premio
 * Modifica título, destinatario, medios y datos de un premio existente.
 */
import { Ionicons } from "@expo/vector-icons";
import { BlurTargetView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
import { awardsService } from "@/services";
import { Award } from "@/types/database";

const VOTE_TYPE_LABEL: Record<string, string> = {
  person: "Personas",
  photo: "Fotos",
  video: "Vídeos",
  audio: "Audios",
  text: "Textos",
};

const VOTE_TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  person: "people-outline",
  photo: "image-outline",
  video: "videocam-outline",
  audio: "musical-notes-outline",
  text: "document-text-outline",
};

export default function EditAwardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const backgroundRef = React.useRef(null);

  const [award, setAward] = useState<Award | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIcon, setSelectedIcon] = useState<IconName>(defaultAwardIcon);
  const [nomineesCanVote, setNomineesCanVote] = useState(false);
  const [allowSelfVote, setAllowSelfVote] = useState(false);
  const [allowVoteChange, setAllowVoteChange] = useState(false);

  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: DialogType;
  }>({ visible: false, title: "", message: "", type: "info" });
  const hideDialog = () =>
    setDialogConfig((prev) => ({ ...prev, visible: false }));

  useEffect(() => {
    const loadAward = async () => {
      try {
        const data = await awardsService.getAwardById(id);
        if (data) {
          setAward(data);
          setName(data.name);
          setDescription(data.description || "");
          setSelectedIcon((data.icon as IconName) || defaultAwardIcon);
          if (data.voting_settings) {
            setNomineesCanVote(data.voting_settings.nominees_can_vote || false);
            setAllowSelfVote(data.voting_settings.allow_self_vote || false);
            setAllowVoteChange(data.voting_settings.allow_vote_change || false);
          }
        }
      } catch {
        showSnackbar("Error al cargar el premio", "error");
      } finally {
        setLoading(false);
      }
    };
    loadAward();
  }, [id, showSnackbar]);

  const handleSave = useCallback(async () => {
    if (!award) return;
    if (!name.trim()) {
      setDialogConfig({
        visible: true,
        title: "Nombre requerido",
        message: "Dale un nombre a tu premio.",
        type: "warning",
      });
      return;
    }

    try {
      setSaving(true);
      Keyboard.dismiss();

      await awardsService.updateAward(id, {
        name: name.trim(),
        description: description.trim() || null,
        icon: selectedIcon,
        voting_settings: {
          ...award.voting_settings,
          allow_vote_change: allowVoteChange,
          ...(award.vote_type === "person" && {
            nominees_can_vote: nomineesCanVote,
            allow_self_vote: nomineesCanVote && allowSelfVote,
          }),
        },
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showSnackbar("¡Premio actualizado!", "success");
      router.back();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al actualizar el premio";
      showSnackbar(message, "error");
    } finally {
      setSaving(false);
    }
  }, [
    award,
    id,
    name,
    description,
    selectedIcon,
    allowVoteChange,
    nomineesCanVote,
    allowSelfVote,
    router,
    showSnackbar,
  ]);

  if (loading) {
    return <AwardFormSkeleton variant="edit" />;
  }

  if (!award) {
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
                name="warning-outline"
                size={36}
                color={theme.colors.onSurfaceVariant}
              />
            </SquircleView>
            <Text
              style={[styles.lockTitle, { color: theme.colors.onSurface }]}
            >
              Premio no encontrado
            </Text>
            <Text
              style={[
                styles.lockSubtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              No hemos podido cargar este premio.
            </Text>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.lockButtonWrap,
                { opacity: pressed ? 0.9 : 1 },
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

  const voteTypeLabel = VOTE_TYPE_LABEL[award.vote_type] || award.vote_type;
  const voteTypeIcon = VOTE_TYPE_ICON[award.vote_type] || "trophy-outline";

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
                Editar premio
              </Text>
              <Text
                style={[
                  styles.screenSubtitle,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Cambia el nombre, icono y opciones de votación
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

                <SquircleView
                  style={[
                    styles.voteTypePill,
                    {
                      backgroundColor: theme.colors.surfaceVariant,
                      borderColor: theme.colors.outlineVariant,
                      borderWidth: 1,
                    },
                  ]}
                  cornerSmoothing={1}
                >
                  <Ionicons
                    name={voteTypeIcon}
                    size={13}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      styles.voteTypePillText,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {voteTypeLabel}
                  </Text>
                </SquircleView>
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
                  isLast={award.vote_type !== "person"}
                />

                {award.vote_type === "person" && (
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
              label="Guardar cambios"
              loadingLabel="Guardando..."
              icon="checkmark-circle-outline"
              onPress={handleSave}
              disabled={!name.trim() || saving}
              loading={saving}
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
  voteTypePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 14,
  },
  voteTypePillText: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 12,
    letterSpacing: 0.3,
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
