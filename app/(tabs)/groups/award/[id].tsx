import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { BlurTargetView, BlurView } from "expo-blur";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Animated,
    Modal,
    Pressable,
    TextInput as RNTextInput,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import SquircleView from "react-native-fast-squircle";
import {
    ActivityIndicator,
    Portal,
    Surface,
    Text,
    useTheme,
} from "react-native-paper";
import ReanimatedAnimated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AwardDetailSkeleton } from "@/components/award/AwardSkeletons";
import { useSnackbar } from "@/components/ui/SnackbarContext";
import { MemberAvatar } from "@/components/MemberAvatar";
import {
    ConfirmDialog,
    DialogType,
} from "@/components/ui/ConfirmDialog";
import { CustomHeader } from "@/components/ui/CustomHeader";
import { MemberSelectMenu } from "@/components/ui/MemberSelectMenu";
import {
    defaultAwardIcon,
    getIconComponent,
    IconName,
} from "@/constants/icons";
import { useAuth, useGroup } from "@/hooks";
import { supabase } from "@/lib/supabase";
import { awardsService } from "@/services";
import { AwardWithNominees } from "@/types/database";

// ... constants ...

const formatDate = (dateString: string) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleString("es-ES", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function AwardDetailScreen() {
  const { id, groupId } = useLocalSearchParams<{
    id: string;
    groupId: string;
  }>();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useSnackbar();

  const { isAdmin, group } = useGroup(groupId);
  const { user } = useAuth();

  const [award, setAward] = useState<AwardWithNominees | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [myVote, setMyVote] = useState<string | null>(null);
  const backgroundRef = React.useRef(null);

  // Dialog State
  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: DialogType;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    showCancel?: boolean;
  }>({
    visible: false,
    title: "",
    message: "",
    type: "info",
    onConfirm: () => {},
    showCancel: true,
  });

  const hideDialog = () =>
    setDialogConfig((prev) => ({ ...prev, visible: false }));

  const [showStartVotingModal, setShowStartVotingModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Audio nomination temp state
  const [showAudioTitleModal, setShowAudioTitleModal] = useState(false);
  const [tempAudio, setTempAudio] = useState<{
    uri: string;
    mimeType?: string;
    name: string;
  } | null>(null);

  // Text nomination state
  const [showTextModal, setShowTextModal] = useState(false);

  const fetchAward = React.useCallback(async () => {
    try {
      const data = await awardsService.getAwardById(id);
      setAward(data);

      if (data) {
        // Check for expiration
        if (data.status === "voting" && data.voting_end_at) {
          const endDate = new Date(data.voting_end_at);
          if (new Date() > endDate) {
            console.log("Award expired, triggering check...");
            await awardsService.checkExpiration(id);
            // Reload
            const updated = await awardsService.getAwardById(id);
            setAward(updated);
            if (updated && updated.status === "completed") {
              showSnackbar("La votación ha finalizado", "info");
            }
          }
        }

        const vote = await awardsService.getMyVote(id);
        setMyVote(vote);
      }
    } catch (error) {
      console.error(error);
      showSnackbar("No se pudo cargar el premio", "error");
    } finally {
      setLoading(false);
    }
  }, [id, showSnackbar]);

  useFocusEffect(
    useCallback(() => {
      fetchAward();
    }, [fetchAward]),
  );

  // Realtime Subscriptions
  useEffect(() => {
    if (!id || !user) return;

    const channel = supabase
      .channel(`award_room:${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "awards",
          filter: `id=eq.${id}`,
        },
        (payload: any) => {
          setAward((current) =>
            current ? { ...current, ...payload.new } : null,
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "nominees",
          filter: `award_id=eq.${id}`,
        },
        (payload: any) => {
          setAward((current) => {
            if (!current) return null;
            const updatedNominees = current.nominees.map((n) =>
              n.id === payload.new.id ? { ...n, ...payload.new } : n,
            );
            // Re-sort by created_at to keep order stable
            return {
              ...current,
              nominees: updatedNominees.sort((a, b) =>
                a.created_at.localeCompare(b.created_at),
              ),
            };
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "nominees",
          filter: `award_id=eq.${id}`,
        },
        (payload: any) => {
          // For INSERT or DELETE, best to reload to get profile data or remove correctly
          if (
            payload.eventType === "INSERT" ||
            payload.eventType === "DELETE"
          ) {
            fetchAward();
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "votes",
          filter: `award_id=eq.${id}`,
        },
        (payload: any) => {
          // Always refresh award data to update total vote counts
          fetchAward();

          // Check if it affects me (local state optimization)
          if (payload.new && (payload.new as any).voter_id === user.id) {
            setMyVote((payload.new as any).nominee_id);
          } else if (payload.eventType === "DELETE") {
            // If a deletion happens, we re-verify our own vote just in case
            awardsService.getMyVote(id).then(setMyVote);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user, fetchAward]);

  const [showManageNomineesModal, setShowManageNomineesModal] = useState(false);
  const [selectedNomineeIds, setSelectedNomineeIds] = useState<string[]>([]);

  // Sync selected nominees when modal opens
  const openManageNomineesModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedNomineeIds(award?.nominees.map((n) => n.user_id) || []);
    setShowManageNomineesModal(true);
  };

  const handleUpdateNomineesList = async () => {
    try {
      setActionLoading(true);
      const currentIds = award?.nominees.map((n) => n.user_id) || [];
      const toRemove =
        award?.nominees.filter(
          (n) => !selectedNomineeIds.includes(n.user_id),
        ) || [];
      const toAdd = selectedNomineeIds.filter((id) => !currentIds.includes(id));

      for (const n of toRemove) await awardsService.removeNominee(n.id);
      for (const uid of toAdd) await awardsService.addNominee(award!.id, uid);

      await fetchAward();
      setShowManageNomineesModal(false);
      showSnackbar("Lista de nominados actualizada", "success");
    } catch (e) {
      console.error(e);
      showSnackbar("Error al actualizar nominados", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteNomination = async (nomineeId: string) => {
    setDialogConfig({
      visible: true,
      title: "Eliminar nominación",
      message: "¿Estás seguro de que quieres eliminar esta nominación?",
      type: "error",
      confirmText: "Eliminar",
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await awardsService.removeNominee(nomineeId);
          await fetchAward();
          showSnackbar("Nominación eliminada correctamente", "success");
        } catch (e) {
          console.error(e);
          showSnackbar("Error al eliminar nominación", "error");
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleStartVoting = async (
    deadlineMode: "24h" | "48h" | "1w" | "custom",
    customDate: string,
    customTime: string,
  ) => {
    if (!award) return;

    let deadlineDate: Date | undefined;

    try {
      if (deadlineMode === "24h") {
        deadlineDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      } else if (deadlineMode === "48h") {
        deadlineDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
      } else if (deadlineMode === "1w") {
        deadlineDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      } else if (deadlineMode === "custom") {
        const [datePart, timePart] = [customDate, customTime];
        const [day, month, year] = datePart.split("/").map(Number);
        const [hour, minute] = timePart.split(":").map(Number);

        if (!day || !month || !year || isNaN(hour) || isNaN(minute)) {
          showSnackbar(
            "Formato de fecha inválido. Usa DD/MM/YYYY y HH:MM",
            "error",
          );
          return;
        }

        deadlineDate = new Date(year, month - 1, day, hour, minute);

        if (deadlineDate <= new Date()) {
          showSnackbar("La fecha debe ser futura", "error");
          return;
        }
      }

      setActionLoading(true);

      // Validation: Minimum 2 nominees/photos required
      if (award.nominees.length < 2) {
        showSnackbar(
          "Se necesitan mínimo 2 candidatos para empezar la votación",
          "error",
        );
        return;
      }

      await awardsService.updateAwardStatus(
        award.id,
        "voting",
        deadlineDate?.toISOString(),
      );

      setShowStartVotingModal(false);
      fetchAward();
    } catch {
      showSnackbar("No se pudo iniciar la votación", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleVote = async (nomineeId: string) => {
    if (!award) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      setActionLoading(true);

      // If clicking the same nominee, check if we can remove the vote
      if (myVote === nomineeId) {
        if (award.voting_settings?.allow_vote_change) {
          await awardsService.removeVote(award.id);
          setMyVote(null);
          // Small delay to allow DB triggers to finish
          setTimeout(() => fetchAward(), 500);
          showSnackbar("Voto retirado", "success");
        }
        return;
      }

      // Casting a new vote (or changing to a new person)
      await awardsService.vote(award.id, nomineeId);
      setMyVote(nomineeId);
      // Small delay to allow DB triggers to finish
      setTimeout(() => fetchAward(), 500);

      if (myVote) {
        showSnackbar("Tu voto ha sido cambiado", "success");
      } else {
        showSnackbar("Tu voto ha sido registrado", "success");
      }
    } catch (error: any) {
      showSnackbar(error.message || "No se pudo registrar el voto", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinishVoting = async () => {
    if (!award) return;

    setDialogConfig({
      visible: true,
      title: "Finalizar Votación",
      message:
        "¿Estás seguro? Se cerrará la votación y se decidirá el ganador.",
      type: "confirm",
      confirmText: "Finalizar",
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await awardsService.declareWinner(award.id);
          fetchAward();
        } catch (error: any) {
          showSnackbar(error.message || "Error al finalizar", "error");
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleRevealWinner = async () => {
    if (!award) return;

    setDialogConfig({
      visible: true,
      title: "Revelar Ganador",
      message: "¿Quieres mostrar el ganador a todos los miembros?",
      type: "confirm",
      confirmText: "Revelar",
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await awardsService.revealWinner(award.id);
          fetchAward();
        } catch {
          showSnackbar("No se pudo revelar el ganador", "error");
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleDelete = async () => {
    if (!award) return;

    setDialogConfig({
      visible: true,
      title: "Eliminar Premio",
      message: "¿Estás seguro? Esta acción no se puede deshacer.",
      type: "error",
      confirmText: "Eliminar",
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await awardsService.deleteAward(award.id);
          router.back();
        } catch {
          showSnackbar("No se pudo eliminar", "error");
        }
      },
    });
  };

  const handleAddNomineeWithPhoto = async () => {
    if (!award || !user) return;

    if (award.vote_type === "text") {
      setShowTextModal(true);
      return;
    }

    try {
      const isVideo = award.vote_type === "video";
      const isAudio = award.vote_type === "audio";

      let uri: string | undefined;
      let mimeType: string | undefined;
      let fileName: string | undefined;

      if (isAudio) {
        const docResult = await DocumentPicker.getDocumentAsync({
          type: "*/*", // Allow all files to avoid Android MIME type issues
          copyToCacheDirectory: true,
        });

        if (docResult.canceled) return;

        const asset = docResult.assets[0];
        const assetNameLower = asset.name.toLowerCase();
        const validAudioExtensions = [
          ".mp3",
          ".wav",
          ".m4a",
          ".aac",
          ".flac",
          ".ogg",
          ".wma",
        ];

        if (!validAudioExtensions.some((ext) => assetNameLower.endsWith(ext))) {
          showSnackbar(
            "Por favor selecciona un archivo de audio válido (.mp3, .wav, .m4a, etc.)",
            "error",
          );
          return;
        }

        uri = asset.uri;
        mimeType = asset.mimeType;
        fileName = asset.name;

        // Open modal to ask for title
        setTempAudio({ uri, mimeType, name: fileName });
        setShowAudioTitleModal(true);
        return; // Stop here, wait for modal submit
      } else {
        // Photo or Video
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: isVideo ? ["videos"] : ["images"],
          allowsEditing: false,
          quality: 0.8,
        });
        if (result.canceled) return;
        uri = result.assets[0].uri;
        mimeType = result.assets[0].mimeType;
        fileName = result.assets[0].fileName || undefined;
      }

      setActionLoading(true);

      // 2. Upload Media
      const publicUrl = await awardsService.uploadNomineeMedia(
        award.id,
        uri!,
        mimeType,
        fileName,
      ); // uri is guaranteed here

      // 3. Add Nominee
      await awardsService.addNominee(award.id, user.id, undefined, publicUrl);

      let typeLabel = "Foto";
      if (isVideo) typeLabel = "Vídeo";

      showSnackbar(`${typeLabel} añadida correctamente`, "success");
      fetchAward();
    } catch (error: any) {
      console.error(error);
      showSnackbar(error.message || "No se pudo subir", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitAudioNomination = async (title: string) => {
    if (!tempAudio || !award || !user) return;
    if (!title.trim()) {
      showSnackbar("Por favor añade un título al audio", "error");
      return;
    }

    try {
      setActionLoading(true);
      // Upload
      const publicUrl = await awardsService.uploadNomineeMedia(
        award.id,
        tempAudio.uri,
        tempAudio.mimeType,
        tempAudio.name,
      );

      // Add nominee with Reason = Title
      await awardsService.addNominee(award.id, user.id, title, publicUrl);

      showSnackbar("Audio añadido correctamente", "success");
      setShowAudioTitleModal(false);
      setTempAudio(null);
      fetchAward();
    } catch (error: any) {
      showSnackbar(error.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitTextNomination = async (text: string) => {
    if (!text.trim() || !award || !user) return;

    try {
      setActionLoading(true);
      await awardsService.addNominee(award.id, user.id, undefined, text);
      showSnackbar("Texto añadido correctamente", "success");
      setShowTextModal(false);
      fetchAward();
    } catch (error: any) {
      showSnackbar(error.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <AwardDetailSkeleton />;
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
          <View style={styles.notFoundContainer}>
            <SquircleView
              style={[
                styles.notFoundIcon,
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
              style={[styles.notFoundTitle, { color: theme.colors.onSurface }]}
            >
              Premio no encontrado
            </Text>
            <Text
              style={[
                styles.notFoundSubtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              No hemos podido cargar este premio.
            </Text>
          </View>
        </View>
      </>
    );
  }

  const getStatusConfig = () => {
    switch (award.status) {
      case "voting":
        return {
          label: "Votando",
          color: "#F59E0B",
          bg: "rgba(245, 158, 11, 0.15)",
          icon: "flame-outline" as keyof typeof Ionicons.glyphMap,
        };
      case "nominations":
        return {
          label: "Nominaciones",
          color: theme.colors.tertiary,
          bg: `${theme.colors.tertiary}22`,
          icon: "hand-right-outline" as keyof typeof Ionicons.glyphMap,
        };
      case "completed":
        return {
          label: "Completado",
          color: "#22C55E",
          bg: "rgba(34, 197, 94, 0.15)",
          icon: "trophy" as keyof typeof Ionicons.glyphMap,
        };
      default:
        return {
          label: "Borrador",
          color: theme.colors.onSurfaceVariant,
          bg: theme.colors.surfaceVariant,
          icon: "document-outline" as keyof typeof Ionicons.glyphMap,
        };
    }
  };

  const statusConfig = getStatusConfig();
  const totalVotes = award.nominees.reduce(
    (acc, curr) => acc + (curr.vote_count || 0),
    0,
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <BlurTargetView
        ref={backgroundRef}
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <CustomHeader title="" showBackButton={true} />
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 60 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Title ─── */}
          <ReanimatedAnimated.View
            entering={FadeInUp.duration(500)}
            style={styles.titleBlock}
          >
            <Text
              style={[styles.screenTitle, { color: theme.colors.primary }]}
              numberOfLines={2}
            >
              {award.name}
            </Text>
            {award.description ? (
              <Text
                style={[
                  styles.screenSubtitle,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {award.description}
              </Text>
            ) : null}
          </ReanimatedAnimated.View>

          <ReanimatedAnimated.View
            entering={FadeIn.duration(400).delay(50)}
            style={[
              styles.divider,
              { backgroundColor: theme.colors.outlineVariant },
            ]}
          />

          {/* ─── Status Card ─── */}
          <ReanimatedAnimated.View
            entering={FadeInDown.duration(350).delay(80)}
            style={styles.section}
          >
            <SquircleView
              style={[
                styles.statusCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor:
                    award.status === "voting"
                      ? "#F59E0B"
                      : award.status === "completed"
                        ? theme.colors.primary
                        : theme.colors.outlineVariant,
                  borderWidth: award.status === "voting" ? 1.5 : 1,
                },
              ]}
              cornerSmoothing={1}
            >
              <View style={styles.statusCardRow}>
                <SquircleView
                  style={[
                    styles.statusCardIcon,
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
                  {getIconComponent(
                    (award.icon as IconName) || defaultAwardIcon,
                    28,
                    theme.colors.primary,
                  )}
                </SquircleView>

                <View style={styles.statusCardTextBlock}>
                  <SquircleView
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: statusConfig.bg,
                        borderColor: statusConfig.color,
                        borderWidth: 1,
                      },
                    ]}
                    cornerSmoothing={1}
                  >
                    <Ionicons
                      name={statusConfig.icon}
                      size={12}
                      color={statusConfig.color}
                    />
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: statusConfig.color },
                      ]}
                    >
                      {statusConfig.label}
                    </Text>
                  </SquircleView>

                  {["voting", "completed"].includes(award.status) && (
                    <View style={styles.statRow}>
                      <Ionicons
                        name="stats-chart-outline"
                        size={13}
                        color={theme.colors.onSurfaceVariant}
                      />
                      <Text
                        style={[
                          styles.statRowText,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                      >
                        {totalVotes}{" "}
                        {totalVotes === 1 ? "voto total" : "votos totales"}
                      </Text>
                    </View>
                  )}

                  {award.status === "voting" && award.voting_end_at && (
                    <View style={styles.statRow}>
                      <Ionicons
                        name="time-outline"
                        size={13}
                        color={theme.colors.onSurfaceVariant}
                      />
                      <Text
                        style={[
                          styles.statRowText,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                      >
                        Termina {formatDate(award.voting_end_at)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {award.status === "completed" && (
                <SquircleView
                  style={[
                    styles.completedBanner,
                    {
                      backgroundColor: !award.winner_id
                        ? theme.colors.surfaceVariant
                        : award.is_revealed
                          ? "rgba(34,197,94,0.12)"
                          : theme.dark
                            ? "rgba(42,138,112,0.15)"
                            : "rgba(42,138,112,0.08)",
                      borderColor: !award.winner_id
                        ? theme.colors.outlineVariant
                        : award.is_revealed
                          ? "#22C55E"
                          : theme.colors.primary,
                      borderWidth: 1,
                    },
                  ]}
                  cornerSmoothing={1}
                >
                  <Ionicons
                    name={
                      !award.winner_id
                        ? "alert-circle-outline"
                        : award.is_revealed
                          ? "checkmark-circle"
                          : "eye-off-outline"
                    }
                    size={16}
                    color={
                      !award.winner_id
                        ? theme.colors.onSurfaceVariant
                        : award.is_revealed
                          ? "#22C55E"
                          : theme.colors.primary
                    }
                  />
                  <Text
                    style={[
                      styles.completedBannerText,
                      {
                        color: !award.winner_id
                          ? theme.colors.onSurfaceVariant
                          : award.is_revealed
                            ? "#22C55E"
                            : theme.colors.primary,
                      },
                    ]}
                  >
                    {!award.winner_id
                      ? "Premio desierto · insuficientes votos"
                      : award.is_revealed
                        ? "¡Ganador revelado!"
                        : "Ganador pendiente de revelar"}
                  </Text>
                </SquircleView>
              )}
            </SquircleView>
          </ReanimatedAnimated.View>

          {/* ─── Nominees Section ─── */}
          <ReanimatedAnimated.View
            entering={FadeInDown.duration(350).delay(120)}
            style={styles.section}
          >
            <View style={styles.sectionTitleRow}>
              <Text
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                {award.vote_type === "person"
                  ? "Nominados"
                  : award.vote_type === "photo"
                    ? "Fotos"
                    : award.vote_type === "video"
                      ? "Vídeos"
                      : award.vote_type === "audio"
                        ? "Audios"
                        : "Textos"}
              </Text>
              <SquircleView
                style={[
                  styles.sectionCountBadge,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                    borderColor: theme.colors.outlineVariant,
                    borderWidth: 1,
                  },
                ]}
                cornerSmoothing={1}
              >
                <Text
                  style={[
                    styles.sectionCountText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {award.nominees.length}
                </Text>
              </SquircleView>
            </View>

            {/* Manage Nominees Button (Only for Person awards in draft) */}
            {isAdmin &&
              award?.vote_type === "person" &&
              award.status === "draft" && (
                <Pressable
                  onPress={openManageNomineesModal}
                  style={({ pressed }) => [
                    {
                      opacity: pressed ? 0.85 : 1,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    },
                  ]}
                >
                  <SquircleView
                    style={[
                      styles.manageButton,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.outlineVariant,
                        borderWidth: 1,
                      },
                    ]}
                    cornerSmoothing={1}
                  >
                    <Ionicons
                      name="person-add-outline"
                      size={17}
                      color={theme.colors.primary}
                    />
                    <Text
                      style={[
                        styles.manageButtonText,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      Gestionar nominados
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={theme.colors.onSurfaceVariant}
                    />
                  </SquircleView>
                </Pressable>
              )}

            {/* Nominees List */}
            <View style={styles.nomineesList}>
              {award.nominees.length === 0 && (
                <SquircleView
                  style={[
                    styles.emptyNominees,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.outlineVariant,
                      borderWidth: 1,
                    },
                  ]}
                  cornerSmoothing={1}
                >
                  <Ionicons
                    name="people-outline"
                    size={28}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      styles.emptyNomineesText,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {isAdmin
                      ? award.vote_type === "person"
                        ? "Añade al menos 2 nominados para empezar"
                        : "Añade contenido para empezar"
                      : "Aún no hay nominados"}
                  </Text>
                </SquircleView>
              )}

              {award.nominees.map((nominee, nomineeIndex) => {
                const isWinner =
                  award.status === "completed" &&
                  nominee.is_winner &&
                  award.is_revealed;

                return (
                  <ReanimatedAnimated.View
                    key={nominee.id}
                    entering={FadeInDown.duration(300).delay(
                      160 + nomineeIndex * 50,
                    )}
                  >
                    <SquircleView
                      style={[
                        styles.nomineeCard,
                        {
                          backgroundColor: isWinner
                            ? "rgba(255,215,0,0.08)"
                            : theme.colors.surface,
                          borderColor: isWinner
                            ? "#FFD700"
                            : theme.colors.outlineVariant,
                          borderWidth: isWinner ? 1.5 : 1,
                          paddingTop: isWinner ? 36 : 16,
                        },
                      ]}
                      cornerSmoothing={1}
                    >
                    {/* Winner Banner */}
                    {isWinner && (
                      <View
                        style={[
                          styles.winnerBanner,
                          { backgroundColor: "#FFD700" },
                        ]}
                      >
                        <Ionicons name="trophy" size={12} color="#000" />
                        <Text
                          style={{
                            color: "#000",
                            fontWeight: "700",
                            marginLeft: 4,
                            fontSize: 11,
                          }}
                        >
                          GANADOR
                        </Text>
                      </View>
                    )}

                    {/* User Row */}
                    <View style={styles.nomineeUserRow}>
                      <MemberAvatar user={nominee.user} size="md" />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text variant="bodyLarge" style={{ fontWeight: "600" }}>
                          {nominee.user.display_name}
                        </Text>
                        {award.vote_type !== "person" &&
                          nominee.nomination_reason && (
                            <Text
                              variant="labelSmall"
                              style={{ color: theme.colors.onSurfaceVariant }}
                            >
                              {nominee.nomination_reason}
                            </Text>
                          )}
                      </View>

                      {/* Vote Button */}
                      {award.status === "voting" &&
                        (() => {
                          const isCurrentUserNominee =
                            award.vote_type === "person" &&
                            award.nominees.some((n) => n.user_id === user?.id);
                          const isSelf = nominee.user_id === user?.id;

                          const isVoteDisabled =
                            actionLoading ||
                            (!!myVote &&
                              !award.voting_settings?.allow_vote_change) ||
                            (isCurrentUserNominee &&
                              !award.voting_settings?.nominees_can_vote) ||
                            (isCurrentUserNominee &&
                              isSelf &&
                              !award.voting_settings?.allow_self_vote);

                          // Style for disabled state (e.g. grayed out if strict restriction)
                          // If I voted, I want only the OTHER buttons to look disabled (if change is not allowed)
                          // The selected button should remain opaque (primary color)
                          const isDisabledStyle =
                            isVoteDisabled && myVote !== nominee.id
                              ? { opacity: 0.5 }
                              : {};

                          return (
                            <TouchableOpacity
                              style={[
                                styles.voteButton,
                                {
                                  backgroundColor:
                                    myVote === nominee.id
                                      ? theme.colors.primary
                                      : "transparent",
                                  borderColor:
                                    myVote === nominee.id
                                      ? theme.colors.primary
                                      : theme.colors.outline,
                                },
                                isDisabledStyle,
                              ]}
                              disabled={isVoteDisabled}
                              onPress={() => handleVote(nominee.id)}
                            >
                              <Ionicons
                                name={
                                  myVote === nominee.id
                                    ? "checkmark"
                                    : "heart-outline"
                                }
                                size={16}
                                color={
                                  myVote === nominee.id
                                    ? theme.colors.onPrimary
                                    : theme.colors.outline
                                }
                              />
                              <Text
                                style={{
                                  marginLeft: 6,
                                  fontWeight: "600",
                                  color:
                                    myVote === nominee.id
                                      ? theme.colors.onPrimary
                                      : theme.colors.outline,
                                }}
                              >
                                {myVote === nominee.id ? "Votado" : "Votar"}
                              </Text>
                            </TouchableOpacity>
                          );
                        })()}

                      {/* Persistent Vote Indicator (when not voting) */}
                      {award.status !== "voting" && myVote === nominee.id && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: isWinner
                              ? "#FFD70025"
                              : theme.colors.primaryContainer,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 20,
                            borderWidth: 1,
                            borderColor: isWinner
                              ? "#FFD700"
                              : theme.colors.primary,
                          }}
                        >
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color={
                              isWinner ? "#B8860B" : theme.colors.onSurface
                            }
                          />
                          <Text
                            variant="labelSmall"
                            style={{
                              color: isWinner
                                ? "#B8860B"
                                : theme.colors.onSurface,
                              marginLeft: 6,
                              fontWeight: "700",
                            }}
                          >
                            Tu voto
                          </Text>
                        </View>
                      )}

                      {/* Vote Count (when revealed) */}
                      {award.is_revealed && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: theme.colors.surfaceVariant,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 20,
                            marginLeft: 8,
                          }}
                        >
                          <Text
                            variant="labelSmall"
                            style={{
                              color: theme.colors.onSurfaceVariant,
                              fontWeight: "700",
                            }}
                          >
                            {nominee.vote_count}{" "}
                            {nominee.vote_count === 1 ? "voto" : "votos"}
                          </Text>
                        </View>
                      )}

                      {/* Delete Button (Draft Mode) */}
                      {isAdmin &&
                        award.status === "draft" &&
                        award.vote_type !== "person" && (
                          <TouchableOpacity
                            onPress={() => handleDeleteNomination(nominee.id)}
                            style={{ padding: 8 }}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={20}
                              color={theme.colors.error}
                            />
                          </TouchableOpacity>
                        )}
                    </View>

                    {/* Content Display */}
                    {nominee.content_url && (
                      <View style={styles.nomineeContentWrapper}>
                        {award.vote_type === "video" ? (
                          <TouchableOpacity
                            onPress={() =>
                              setSelectedImage(nominee.content_url)
                            }
                            activeOpacity={0.9}
                            style={styles.mediaContainer}
                          >
                            <NomineeVideoThumbnail uri={nominee.content_url} />
                          </TouchableOpacity>
                        ) : award.vote_type === "audio" ? (
                          <TouchableOpacity
                            onPress={() =>
                              setSelectedImage(nominee.content_url)
                            }
                            activeOpacity={0.9}
                          >
                            <NomineeAudioPlayer
                              uri={nominee.content_url}
                              title={nominee.nomination_reason || "Audio"}
                            />
                          </TouchableOpacity>
                        ) : award.vote_type === "text" ? (
                          <NomineeTextCard text={nominee.content_url} />
                        ) : (
                          <TouchableOpacity
                            onPress={() =>
                              setSelectedImage(nominee.content_url)
                            }
                            activeOpacity={0.9}
                            style={styles.mediaContainer}
                          >
                            <Image
                              source={{ uri: nominee.content_url }}
                              style={styles.nomineeImage}
                              contentFit="cover"
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                    </SquircleView>
                  </ReanimatedAnimated.View>
                );
              })}
            </View>
          </ReanimatedAnimated.View>

          {/* ─── Admin Actions ─── */}
          {isAdmin && (
            <ReanimatedAnimated.View
              entering={FadeInDown.duration(350).delay(180)}
              style={styles.section}
            >
              <View style={styles.sectionTitleRow}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  Administración
                </Text>
              </View>

              <SquircleView
                style={[
                  styles.adminCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant,
                    borderWidth: 1,
                  },
                ]}
                cornerSmoothing={1}
              >
                {(() => {
                  type AdminAction = {
                    icon: keyof typeof Ionicons.glyphMap;
                    iconColor?: string;
                    iconBg?: string;
                    title: string;
                    subtitle: string;
                    titleColor?: string;
                    onPress: () => void;
                  };

                  const actions: AdminAction[] = [];

                  if (["draft", "nominations"].includes(award.status)) {
                    actions.push({
                      icon: "pencil-outline",
                      title: "Editar premio",
                      subtitle: "Cambia icono, nombre o descripción",
                      onPress: () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push({
                          pathname: "/groups/award/edit",
                          params: { id, groupId },
                        } as any);
                      },
                    });
                  }

                  if (award.status === "draft") {
                    actions.push({
                      icon: "play-circle",
                      iconColor: theme.colors.primary,
                      iconBg: theme.dark
                        ? "rgba(42,138,112,0.15)"
                        : "rgba(42,138,112,0.08)",
                      title: "Iniciar votación",
                      subtitle: "Abre el premio para recibir votos",
                      onPress: () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowStartVotingModal(true);
                      },
                    });

                    if (
                      ["photo", "video", "audio", "text"].includes(
                        award.vote_type,
                      )
                    ) {
                      const addLabel =
                        award.vote_type === "video"
                          ? "Añadir vídeo"
                          : award.vote_type === "audio"
                            ? "Añadir audio"
                            : award.vote_type === "text"
                              ? "Añadir texto"
                              : "Añadir foto";
                      const addIcon: keyof typeof Ionicons.glyphMap =
                        award.vote_type === "video"
                          ? "videocam-outline"
                          : award.vote_type === "audio"
                            ? "musical-notes-outline"
                            : award.vote_type === "text"
                              ? "document-text-outline"
                              : "camera-outline";
                      actions.push({
                        icon: addIcon,
                        title: addLabel,
                        subtitle: "Sube nuevo contenido al premio",
                        onPress: handleAddNomineeWithPhoto,
                      });
                    }
                  }

                  if (award.status === "voting") {
                    actions.push({
                      icon: "stop-circle",
                      iconColor: "#F59E0B",
                      iconBg: "rgba(245,158,11,0.12)",
                      title: "Finalizar votación",
                      subtitle: "Cierra los votos y declara ganador",
                      onPress: handleFinishVoting,
                    });
                  }

                  if (
                    award.status === "completed" &&
                    !award.is_revealed &&
                    award.winner_id
                  ) {
                    actions.push({
                      icon: "eye-outline",
                      iconColor: "#22C55E",
                      iconBg: "rgba(34,197,94,0.12)",
                      title: "Revelar ganador",
                      subtitle: "Muestra el resultado a todos",
                      onPress: handleRevealWinner,
                    });
                  }

                  actions.push({
                    icon: "trash-outline",
                    iconColor: theme.colors.error,
                    iconBg: `${theme.colors.error}15`,
                    title: "Eliminar premio",
                    subtitle: "Esta acción es irreversible",
                    titleColor: theme.colors.error,
                    onPress: handleDelete,
                  });

                  return actions.map((action, idx) => {
                    const isLast = idx === actions.length - 1;
                    return (
                      <React.Fragment key={action.title}>
                        <Pressable
                          onPress={action.onPress}
                          style={({ pressed }) => [
                            styles.adminButton,
                            {
                              backgroundColor: pressed
                                ? theme.dark
                                  ? "rgba(255,255,255,0.04)"
                                  : "rgba(0,0,0,0.03)"
                                : "transparent",
                            },
                          ]}
                        >
                          <SquircleView
                            style={[
                              styles.adminButtonIcon,
                              {
                                backgroundColor:
                                  action.iconBg ?? theme.colors.surfaceVariant,
                                borderColor:
                                  action.iconColor ??
                                  theme.colors.outlineVariant,
                                borderWidth: 1,
                              },
                            ]}
                            cornerSmoothing={1}
                          >
                            <Ionicons
                              name={action.icon}
                              size={18}
                              color={
                                action.iconColor ??
                                theme.colors.onSurfaceVariant
                              }
                            />
                          </SquircleView>
                          <View style={styles.adminButtonText}>
                            <Text
                              style={[
                                styles.adminButtonTitle,
                                {
                                  color:
                                    action.titleColor ??
                                    theme.colors.onSurface,
                                },
                              ]}
                            >
                              {action.title}
                            </Text>
                            <Text
                              style={[
                                styles.adminButtonSubtitle,
                                { color: theme.colors.onSurfaceVariant },
                              ]}
                            >
                              {action.subtitle}
                            </Text>
                          </View>
                          <Ionicons
                            name="chevron-forward"
                            size={18}
                            color={theme.colors.onSurfaceVariant}
                          />
                        </Pressable>
                        {!isLast && (
                          <View
                            style={[
                              styles.adminDivider,
                              {
                                backgroundColor: theme.colors.outlineVariant,
                              },
                            ]}
                          />
                        )}
                      </React.Fragment>
                    );
                  });
                })()}
              </SquircleView>
            </ReanimatedAnimated.View>
          )}
        </ScrollView>
      </BlurTargetView>

      {/* Start Voting Modal - ConfirmDialog Style */}
      <StartVotingModal
        visible={showStartVotingModal}
        onClose={() => setShowStartVotingModal(false)}
        onConfirm={handleStartVoting}
        award={award}
        blurTarget={backgroundRef}
      />

      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.fullScreenImageContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedImage(null)}
          >
            <Ionicons name="close-circle" size={40} color="white" />
          </TouchableOpacity>

          {award?.vote_type === "video" ? (
            <FullScreenVideoPlayer uri={selectedImage || ""} />
          ) : award?.vote_type === "audio" ? (
            <FullScreenAudioPlayer uri={selectedImage || ""} />
          ) : (
            <Image
              source={{ uri: selectedImage || undefined }}
              style={styles.fullScreenImage}
              contentFit="contain"
            />
          )}
        </View>
      </Modal>

      {/* Text Nomination Modal - ConfirmDialog Style */}
      <TextNominationModal
        visible={showTextModal}
        onClose={() => setShowTextModal(false)}
        onConfirm={handleSubmitTextNomination}
        actionLoading={actionLoading}
        blurTarget={backgroundRef}
      />

      <MemberSelectMenu
        visible={showManageNomineesModal}
        title="Gestionar Nominados"
        subtitle="Selecciona quién estará nominado"
        members={group?.members || []}
        selectedIds={selectedNomineeIds}
        onSelectionChange={setSelectedNomineeIds}
        onConfirm={handleUpdateNomineesList}
        onDismiss={() => setShowManageNomineesModal(false)}
        confirmText="Guardar"
        loading={actionLoading}
        minSelection={2}
      />

      <AudioTitleModal
        visible={showAudioTitleModal}
        onClose={() => setShowAudioTitleModal(false)}
        onConfirm={handleSubmitAudioNomination}
        audioFileName={tempAudio?.name || "Audio"}
        actionLoading={actionLoading}
        blurTarget={backgroundRef}
      />

      <ConfirmDialog
        visible={dialogConfig.visible}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        confirmText={dialogConfig.confirmText}
        cancelText={dialogConfig.cancelText}
        onConfirm={dialogConfig.onConfirm}
        onCancel={hideDialog}
        showCancel={dialogConfig.showCancel}
        blurTargetRef={backgroundRef}
      />
    </>
  );
}

// ==========================================
// START VOTING MODAL - ConfirmDialog Style
// ==========================================
interface StartVotingModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (
    mode: "24h" | "48h" | "1w" | "custom",
    customDate: string,
    customTime: string,
  ) => void;
  award: AwardWithNominees | null;
  blurTarget?: React.RefObject<any>;
}

function StartVotingModal({
  visible,
  onClose,
  onConfirm,
  award,
  blurTarget,
}: StartVotingModalProps) {
  const theme = useTheme();
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const translateYAnim = useRef(new Animated.Value(40)).current;
  const [shouldRender, setShouldRender] = useState(visible);

  // Local state for deadline settings - prevents parent re-renders
  const [deadlineMode, setDeadlineMode] = useState<
    "24h" | "48h" | "1w" | "custom"
  >("24h");

  // Use refs for uncontrolled inputs to avoid re-renders while typing
  const dateRef = useRef("");
  const timeRef = useRef("");

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setDeadlineMode("24h");
      dateRef.current = "";
      timeRef.current = "";
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      opacityAnim.setValue(0);
      scaleAnim.setValue(0.85);
      translateYAnim.setValue(40);

      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.85,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 40,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible, opacityAnim, scaleAnim, translateYAnim]);

  if (!shouldRender) return null;

  const canStart = award && award.nominees.length >= 2;

  return (
    <Portal>
      <View style={modalStyles.container}>
        {/* Backdrop with Blur */}
        <Pressable style={modalStyles.backdrop} onPress={onClose}>
          <Animated.View
            style={[StyleSheet.absoluteFill, { opacity: opacityAnim }]}
          >
            <BlurView
              intensity={25}
              tint="dark"
              style={StyleSheet.absoluteFill}
              blurMethod={blurTarget ? "dimezisBlurView" : undefined}
              blurTarget={blurTarget}
            />
          </Animated.View>
        </Pressable>

        {/* Dialog */}
        <Animated.View
          style={[
            modalStyles.dialogContainer,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.surfaceVariant,
              transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Icon */}
          <View
            style={[
              modalStyles.iconContainer,
              {
                backgroundColor: `${theme.colors.primary}20`,
                borderColor: theme.colors.primary,
              },
            ]}
          >
            <Ionicons
              name="play-circle"
              size={40}
              color={theme.colors.primary}
            />
          </View>

          {/* Title */}
          <Text
            variant="titleLarge"
            style={[modalStyles.title, { color: theme.colors.onSurface }]}
          >
            Iniciar Votación
          </Text>

          {/* Message */}
          <Text
            variant="bodyMedium"
            style={[
              modalStyles.message,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {canStart
              ? "Configura la duración de la votación"
              : "Necesitas más nominados para iniciar"}
          </Text>

          {/* Validation Warning */}
          {award && award.nominees.length < 2 && (
            <View
              style={[
                modalStyles.warningBox,
                { backgroundColor: "#FF980020", borderColor: "#FF9800" },
              ]}
            >
              <Ionicons name="alert-circle" size={20} color="#FF9800" />
              <Text
                style={{
                  color: "#FF9800",
                  marginLeft: 10,
                  fontWeight: "600",
                  fontSize: 13,
                  includeFontPadding: false,
                  textAlignVertical: "center",
                }}
              >
                Se necesitan mínimo 2{" "}
                {award.vote_type === "person"
                  ? "nominados"
                  : award.vote_type === "photo"
                    ? "fotos"
                    : award.vote_type === "video"
                      ? "vídeos"
                      : award.vote_type === "audio"
                        ? "audios"
                        : "textos"}
              </Text>
            </View>
          )}

          {/* Duration Options */}
          {canStart && (
            <>
              <Text
                variant="labelLarge"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginBottom: 12,
                  alignSelf: "flex-start",
                }}
              >
                Duración
              </Text>
              <View style={modalStyles.durationGrid}>
                {(
                  [
                    { key: "24h", label: "24h", icon: "time-outline" },
                    { key: "48h", label: "48h", icon: "time-outline" },
                    { key: "1w", label: "1 Sem", icon: "calendar-outline" },
                    { key: "custom", label: "Custom", icon: "create-outline" },
                  ] as const
                ).map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      modalStyles.durationOption,
                      {
                        borderColor:
                          deadlineMode === option.key
                            ? theme.colors.primary
                            : theme.colors.outline,
                        backgroundColor:
                          deadlineMode === option.key
                            ? theme.colors.primaryContainer
                            : "transparent",
                      },
                    ]}
                    onPress={() => setDeadlineMode(option.key)}
                  >
                    <Ionicons
                      name={option.icon as any}
                      size={18}
                      color={
                        deadlineMode === option.key
                          ? theme.colors.onSurface
                          : theme.colors.onSurfaceVariant
                      }
                    />
                    <Text
                      style={{
                        color:
                          deadlineMode === option.key
                            ? theme.colors.onSurface
                            : theme.colors.onSurfaceVariant,
                        fontWeight: "600",
                        marginTop: 4,
                        fontSize: 12,
                      }}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {deadlineMode === "custom" && (
                <View style={modalStyles.customDateRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text
                      variant="labelSmall"
                      style={{
                        color: theme.colors.onSurfaceVariant,
                        marginBottom: 4,
                      }}
                    >
                      Fecha
                    </Text>
                    <View
                      style={{
                        borderWidth: 1,
                        borderColor: theme.colors.outline,
                        borderRadius: 10,
                        backgroundColor: theme.colors.surface,
                        paddingHorizontal: 12,
                        height: 48,
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color={theme.colors.primary}
                        style={{ marginRight: 8 }}
                      />
                      <RNTextInput
                        placeholder="DD/MM/YYYY"
                        placeholderTextColor={theme.colors.onSurfaceVariant}
                        defaultValue=""
                        onChangeText={(text) => (dateRef.current = text)}
                        style={{
                          color: theme.colors.onSurface,
                          fontSize: 14,
                          flex: 1,
                          paddingVertical: 0,
                        }}
                      />
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      variant="labelSmall"
                      style={{
                        color: theme.colors.onSurfaceVariant,
                        marginBottom: 4,
                      }}
                    >
                      Hora
                    </Text>
                    <View
                      style={{
                        borderWidth: 1,
                        borderColor: theme.colors.outline,
                        borderRadius: 10,
                        backgroundColor: theme.colors.surface,
                        paddingHorizontal: 12,
                        height: 48,
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <Ionicons
                        name="time-outline"
                        size={18}
                        color={theme.colors.primary}
                        style={{ marginRight: 8 }}
                      />
                      <RNTextInput
                        placeholder="HH:MM"
                        placeholderTextColor={theme.colors.onSurfaceVariant}
                        defaultValue=""
                        onChangeText={(text) => (timeRef.current = text)}
                        style={{
                          color: theme.colors.onSurface,
                          fontSize: 14,
                          flex: 1,
                          paddingVertical: 0,
                        }}
                      />
                    </View>
                  </View>
                </View>
              )}
            </>
          )}

          {/* Actions */}
          <View style={modalStyles.actions}>
            <TouchableOpacity
              style={[
                modalStyles.cancelButton,
                { borderColor: theme.colors.surfaceVariant },
              ]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text
                variant="labelLarge"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  fontWeight: "600",
                }}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
            {canStart && (
              <TouchableOpacity
                style={[
                  modalStyles.confirmButton,
                  {
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.primary,
                  },
                ]}
                onPress={() => {
                  onConfirm(deadlineMode, dateRef.current, timeRef.current);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="play"
                  size={16}
                  color={theme.colors.onPrimary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  variant="labelLarge"
                  style={{ color: theme.colors.onPrimary, fontWeight: "700" }}
                >
                  Comenzar
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </Portal>
  );
}

// ==========================================
// TEXT NOMINATION MODAL - ConfirmDialog Style
// ==========================================
interface TextNominationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (text: string) => void;
  actionLoading: boolean;
  blurTarget?: React.RefObject<any>;
}

function TextNominationModal({
  visible,
  onClose,
  onConfirm,
  actionLoading,
  blurTarget,
}: TextNominationModalProps) {
  const theme = useTheme();
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const translateYAnim = useRef(new Animated.Value(40)).current;
  const [shouldRender, setShouldRender] = useState(visible);

  // Uncontrolled input to prevent double-typing/cursor jumps
  const textRef = useRef("");
  const [charCount, setCharCount] = useState(0);

  // Reset text when modal opens
  useEffect(() => {
    if (visible) {
      textRef.current = "";
      setCharCount(0);
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      opacityAnim.setValue(0);
      scaleAnim.setValue(0.85);
      translateYAnim.setValue(40);

      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.85,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 40,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible, opacityAnim, scaleAnim, translateYAnim]);

  if (!shouldRender) return null;

  const canSubmit = charCount > 0;

  return (
    <Portal>
      <View style={modalStyles.container}>
        {/* Backdrop with Blur */}
        <Pressable style={modalStyles.backdrop} onPress={onClose}>
          <Animated.View
            style={[StyleSheet.absoluteFill, { opacity: opacityAnim }]}
          >
            <BlurView
              intensity={25}
              tint="dark"
              style={StyleSheet.absoluteFill}
              blurMethod={blurTarget ? "dimezisBlurView" : undefined}
              blurTarget={blurTarget}
            />
          </Animated.View>
        </Pressable>

        {/* Dialog */}
        <Animated.View
          style={[
            modalStyles.dialogContainer,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.surfaceVariant,
              transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Icon */}
          <View
            style={[
              modalStyles.iconContainer,
              {
                backgroundColor: `${theme.colors.primary}20`,
                borderColor: theme.colors.primary,
              },
            ]}
          >
            <Ionicons
              name="document-text"
              size={40}
              color={theme.colors.primary}
            />
          </View>

          {/* Title */}
          <Text
            variant="titleLarge"
            style={[modalStyles.title, { color: theme.colors.onSurface }]}
          >
            Tu Nominación
          </Text>

          {/* Message */}
          <Text
            variant="bodyMedium"
            style={[
              modalStyles.message,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            Escribe el texto que quieres nominar
          </Text>

          {/* Text Input */}
          <View style={{ width: "100%", marginBottom: 20 }}>
            <View
              style={{
                borderWidth: 1,
                borderColor: theme.colors.outline,
                borderRadius: 14,
                backgroundColor: theme.colors.surface,
                minHeight: 120, // Slightly taller for better UX
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <RNTextInput
                placeholder="Escribe tu texto aquí..."
                placeholderTextColor={theme.colors.onSurfaceVariant}
                defaultValue=""
                onChangeText={(text) => {
                  textRef.current = text;
                  setCharCount(text.length);
                }}
                multiline
                style={{
                  color: theme.colors.onSurface,
                  fontSize: 16,
                  textAlignVertical: "top", // Important for Android multiline
                  flex: 1,
                }}
              />
            </View>
            <Text
              variant="labelSmall"
              style={{
                color: theme.colors.onSurfaceVariant,
                textAlign: "right",
                marginTop: 6,
              }}
            >
              {charCount} caracteres
            </Text>
          </View>

          {/* Actions */}
          <View style={modalStyles.actions}>
            <TouchableOpacity
              style={[
                modalStyles.cancelButton,
                { borderColor: theme.colors.surfaceVariant },
              ]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text
                variant="labelLarge"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  fontWeight: "600",
                }}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                modalStyles.confirmButton,
                {
                  backgroundColor: canSubmit
                    ? theme.colors.primaryContainer
                    : theme.colors.surfaceVariant,
                  borderColor: canSubmit
                    ? theme.colors.primary
                    : theme.colors.outline,
                  opacity: canSubmit ? 1 : 0.6,
                },
              ]}
              onPress={() => onConfirm(textRef.current)}
              disabled={!canSubmit || actionLoading}
              activeOpacity={0.7}
            >
              {actionLoading ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.onSurface}
                />
              ) : (
                <>
                  <Ionicons
                    name="send"
                    size={16}
                    color={
                      canSubmit
                        ? theme.colors.onSurface
                        : theme.colors.onSurfaceVariant
                    }
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    variant="labelLarge"
                    style={{
                      color: canSubmit
                        ? theme.colors.onSurface
                        : theme.colors.onSurfaceVariant,
                      fontWeight: "700",
                    }}
                  >
                    Enviar
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Portal>
  );
}

// ==========================================
// AUDIO TITLE MODAL - ConfirmDialog Style
// ==========================================
interface AudioTitleModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (title: string) => void;
  audioFileName: string;
  actionLoading: boolean;
  blurTarget?: React.RefObject<any>;
}

function AudioTitleModal({
  visible,
  onClose,
  onConfirm,
  audioFileName,
  actionLoading,
  blurTarget,
}: AudioTitleModalProps) {
  const theme = useTheme();
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const translateYAnim = useRef(new Animated.Value(40)).current;
  const [shouldRender, setShouldRender] = useState(visible);

  // Uncontrolled input pattern
  const titleRef = useRef("");
  const [hasText, setHasText] = useState(false);

  // Reset title when modal opens
  useEffect(() => {
    if (visible) {
      titleRef.current = "";
      setHasText(false);
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      opacityAnim.setValue(0);
      scaleAnim.setValue(0.85);
      translateYAnim.setValue(40);

      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.85,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 40,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible, opacityAnim, scaleAnim, translateYAnim]);

  if (!shouldRender) return null;

  const canSubmit = hasText;

  return (
    <Portal>
      <View style={modalStyles.container}>
        {/* Backdrop with Blur */}
        <Pressable style={modalStyles.backdrop} onPress={onClose}>
          <Animated.View
            style={[StyleSheet.absoluteFill, { opacity: opacityAnim }]}
          >
            <BlurView
              intensity={25}
              tint="dark"
              style={StyleSheet.absoluteFill}
              blurMethod={blurTarget ? "dimezisBlurView" : undefined}
              blurTarget={blurTarget}
            />
          </Animated.View>
        </Pressable>

        {/* Dialog */}
        <Animated.View
          style={[
            modalStyles.dialogContainer,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.surfaceVariant,
              transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Icon */}
          <View
            style={[
              modalStyles.iconContainer,
              {
                backgroundColor: `${theme.colors.primary}20`,
                borderColor: theme.colors.primary,
              },
            ]}
          >
            <Ionicons
              name="musical-notes"
              size={40}
              color={theme.colors.primary}
            />
          </View>

          {/* Title */}
          <Text
            variant="titleLarge"
            style={[modalStyles.title, { color: theme.colors.onSurface }]}
          >
            Título del Audio
          </Text>

          {/* File name info */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.colors.surfaceVariant,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 10,
              marginBottom: 16,
            }}
          >
            <Ionicons
              name="document-outline"
              size={16}
              color={theme.colors.onSurfaceVariant}
            />
            <Text
              variant="labelMedium"
              style={{ color: theme.colors.onSurfaceVariant, marginLeft: 8 }}
              numberOfLines={1}
            >
              {audioFileName}
            </Text>
          </View>

          {/* Text Input */}
          <View style={{ width: "100%", marginBottom: 20 }}>
            <View
              style={{
                borderWidth: 1,
                borderColor: theme.colors.outline,
                borderRadius: 14,
                backgroundColor: theme.colors.surface,
                paddingHorizontal: 12,
                height: 56, // Standard height
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Ionicons
                name="pencil"
                size={18}
                color={theme.colors.primary}
                style={{ marginRight: 8 }}
              />
              <RNTextInput
                placeholder="Dale un nombre a tu audio..."
                placeholderTextColor={theme.colors.onSurfaceVariant}
                defaultValue=""
                onChangeText={(text) => {
                  titleRef.current = text;
                  setHasText(text.trim().length > 0);
                }}
                style={{
                  color: theme.colors.onSurface,
                  fontSize: 16,
                  flex: 1,
                }}
              />
            </View>
          </View>

          {/* Actions */}
          <View style={modalStyles.actions}>
            <TouchableOpacity
              style={[
                modalStyles.cancelButton,
                { borderColor: theme.colors.surfaceVariant },
              ]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text
                variant="labelLarge"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  fontWeight: "600",
                }}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                modalStyles.confirmButton,
                {
                  backgroundColor: canSubmit
                    ? theme.colors.primaryContainer
                    : theme.colors.surfaceVariant,
                  borderColor: canSubmit
                    ? theme.colors.primary
                    : theme.colors.outline,
                  opacity: canSubmit ? 1 : 0.6,
                },
              ]}
              onPress={() => onConfirm(titleRef.current)}
              disabled={!canSubmit || actionLoading}
              activeOpacity={0.7}
            >
              {actionLoading ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.onSurface}
                />
              ) : (
                <>
                  <Ionicons
                    name="cloud-upload"
                    size={16}
                    color={
                      canSubmit
                        ? theme.colors.onSurface
                        : theme.colors.onSurfaceVariant
                    }
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    variant="labelLarge"
                    style={{
                      color: canSubmit
                        ? theme.colors.onSurface
                        : theme.colors.onSurfaceVariant,
                      fontWeight: "700",
                    }}
                  >
                    Subir
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Portal>
  );
}

// Modal Styles (shared between both modals)
const modalStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  dialogContainer: {
    width: "88%",
    maxWidth: 360,
    borderRadius: 24,
    padding: 28,
    paddingTop: 32,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 24,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
  },
  title: {
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  message: {
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    width: "100%",
  },
  durationGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    width: "100%",
  },
  durationOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  customDateRow: {
    flexDirection: "row",
    width: "100%",
    marginBottom: 16,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  confirmButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
});

// Video Helper Components
function NomineeVideoThumbnail({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (player) => {
    player.muted = true;
    player.loop = true;
  });

  return (
    <View style={{ width: "100%", height: 200, backgroundColor: "#000" }}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />
      <View
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: "rgba(0,0,0,0.3)",
          justifyContent: "center",
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        <Ionicons name="play-circle" size={40} color="white" />
      </View>
    </View>
  );
}

function FullScreenVideoPlayer({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (player) => {
    player.play();
    player.loop = true;
  });

  return (
    <VideoView
      player={player}
      style={{ width: "100%", height: "100%" }}
      contentFit="contain"
      allowsPictureInPicture
      fullscreenOptions={{ enable: true }}
    />
  );
}

function NomineeAudioPlayer({ uri, title }: { uri: string; title?: string }) {
  const theme = useTheme();
  return (
    <Surface
      style={{
        width: "100%",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.secondaryContainer,
        backgroundColor: theme.colors.surfaceVariant,
        overflow: "hidden",
      }}
      elevation={0}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 16,
        }}
      >
        {/* Play Button with premium style */}
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            backgroundColor: theme.colors.primaryContainer,
            borderWidth: 1.5,
            borderColor: theme.colors.primary,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Ionicons
            name="play"
            size={24}
            color={theme.colors.onSurface}
            style={{ marginLeft: 2 }}
          />
        </View>

        {/* Title & Waveform */}
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text
            style={{
              color: theme.colors.onSurface,
              fontWeight: "700",
              fontSize: 15,
              marginBottom: 8,
              letterSpacing: -0.3,
            }}
            numberOfLines={1}
          >
            {title || "Audio"}
          </Text>

          {/* Waveform bars with theme color */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              gap: 3,
              height: 24,
            }}
          >
            {[14, 20, 10, 24, 16, 12, 18, 14, 22, 10, 18, 14, 20, 12].map(
              (h, i) => (
                <View
                  key={i}
                  style={{
                    width: 3,
                    height: h,
                    backgroundColor: theme.colors.primary,
                    opacity: 0.6,
                    borderRadius: 2,
                  }}
                />
              ),
            )}
          </View>
        </View>

        {/* Music note indicator */}
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: theme.colors.secondaryContainer,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Ionicons
            name="musical-notes"
            size={18}
            color={theme.colors.onSurfaceVariant}
          />
        </View>
      </View>
    </Surface>
  );
}

function FullScreenAudioPlayer({ uri }: { uri: string }) {
  const player = useAudioPlayer(uri || null);
  const status = useAudioPlayerStatus(player);

  const togglePlay = () => {
    if (status.playing) player.pause();
    else player.play();
  };

  return (
    <View
      style={[
        styles.fullScreenImage,
        {
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#1a1a2e",
        },
      ]}
    >
      <Ionicons
        name="musical-notes"
        size={100}
        color="#fff"
        style={{ marginBottom: 40, opacity: 0.5 }}
      />

      <TouchableOpacity
        onPress={togglePlay}
        style={{
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: "rgba(255,255,255,0.15)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Ionicons
          name={status.playing ? "pause" : "play"}
          size={44}
          color="#fff"
          style={{ marginLeft: status.playing ? 0 : 4 }}
        />
      </TouchableOpacity>

      <Text
        style={{
          color: "rgba(255,255,255,0.7)",
          marginTop: 24,
          fontSize: 16,
          fontWeight: "500",
        }}
      >
        {status.currentTime ? Math.floor(status.currentTime / 1000) : 0}s /{" "}
        {status.duration ? Math.floor(status.duration / 1000) : 0}s
      </Text>
    </View>
  );
}

function NomineeTextCard({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <Surface
      style={{
        width: "100%",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.secondaryContainer,
        backgroundColor: theme.colors.surfaceVariant,
        overflow: "hidden",
      }}
      elevation={0}
    >
      {/* Quote icon decorator */}
      <View
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: theme.colors.primaryContainer,
          borderWidth: 1,
          borderColor: theme.colors.primary,
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1,
        }}
      >
        <Ionicons
          name="chatbubble-ellipses"
          size={16}
          color={theme.colors.onSurface}
        />
      </View>

      {/* Text content */}
      <View
        style={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16 }}
      >
        <ScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          style={{ maxHeight: 100 }}
        >
          <Text
            style={{
              fontSize: 15,
              lineHeight: 24,
              color: theme.colors.onSurface,
              fontStyle: "italic",
              fontWeight: "500",
            }}
          >
            &quot;{text}&quot;
          </Text>
        </ScrollView>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  notFoundIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  notFoundTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 18,
    textAlign: "center",
  },
  notFoundSubtitle: {
    fontFamily: "Archivo-Medium",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    letterSpacing: 0.1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 0,
  },

  // ─── Title ─────────────────────────────────────────────────────────
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
    lineHeight: 20,
  },
  divider: { height: 1, marginTop: 16, marginBottom: 20 },

  // ─── Section ───────────────────────────────────────────────────────
  section: { marginBottom: 24 },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  sectionTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 17,
    letterSpacing: 0.2,
  },
  sectionCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 28,
    alignItems: "center",
  },
  sectionCountText: {
    fontFamily: "Archivo-Bold",
    fontSize: 12,
    letterSpacing: 0.3,
  },

  // ─── Status Card ───────────────────────────────────────────────────
  statusCard: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  statusCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  statusCardIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  statusCardTextBlock: {
    flex: 1,
    gap: 6,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  statusBadgeText: {
    fontFamily: "Archivo-Bold",
    fontSize: 11.5,
    letterSpacing: 0.3,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statRowText: {
    fontFamily: "Archivo-Medium",
    fontSize: 12,
    letterSpacing: 0.2,
  },
  completedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 14,
  },
  completedBannerText: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 13,
    letterSpacing: 0.2,
    flex: 1,
  },

  // ─── Manage Button ─────────────────────────────────────────────────
  manageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 12,
  },
  manageButtonText: {
    flex: 1,
    fontFamily: "Archivo-SemiBold",
    fontSize: 14,
    letterSpacing: 0.2,
  },

  // ─── Nominees ──────────────────────────────────────────────────────
  nomineesList: { gap: 10 },
  nomineeCard: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    overflow: "hidden",
  },
  emptyNominees: {
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 10,
  },
  emptyNomineesText: {
    fontFamily: "Archivo-Medium",
    fontSize: 13,
    textAlign: "center",
    letterSpacing: 0.1,
  },
  winnerBanner: {
    position: "absolute",
    top: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomLeftRadius: 12,
    borderTopRightRadius: 20,
  },
  nomineeUserRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  voteButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  nomineeContentWrapper: {
    marginTop: 12,
  },
  mediaContainer: {
    borderRadius: 14,
    overflow: "hidden",
  },
  nomineeImage: {
    width: "100%",
    height: 200,
    borderRadius: 14,
    backgroundColor: "#f0f0f0",
  },

  // ─── Admin ─────────────────────────────────────────────────────────
  adminCard: {
    borderRadius: 20,
    overflow: "hidden",
  },
  adminButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  adminButtonIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  adminButtonText: {
    flex: 1,
    gap: 2,
  },
  adminButtonTitle: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 14.5,
    letterSpacing: 0.1,
  },
  adminButtonSubtitle: {
    fontFamily: "Archivo-Medium",
    fontSize: 12,
    letterSpacing: 0.1,
  },
  adminDivider: {
    height: 1,
    marginLeft: 68,
  },
  fullScreenImageContainer: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenImage: {
    width: "100%",
    height: "100%",
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 1,
  },
});
