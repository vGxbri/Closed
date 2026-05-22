import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";
import Animated, { FadeInDown } from "react-native-reanimated";

import {
  defaultAwardIcon,
  getIconComponent,
  IconName,
} from "../constants/icons";
import { Award, AwardStatus, AwardWithNominees } from "../types/database";

interface AwardCardProps {
  award: Award | AwardWithNominees;
  index: number;
  nomineeCount?: number;
  onPress?: () => void;
}

const STATUS_CONFIG: Record<
  AwardStatus,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    accent: string;
  }
> = {
  draft: { label: "Borrador", icon: "document-outline", accent: "muted" },
  nominations: {
    label: "Nominaciones",
    icon: "hand-right-outline",
    accent: "tertiary",
  },
  voting: { label: "Votando", icon: "flame-outline", accent: "voting" },
  completed: { label: "Completado", icon: "trophy", accent: "success" },
  archived: { label: "Archivado", icon: "archive-outline", accent: "muted" },
};

function getVoteTypeMeta(voteType: string) {
  switch (voteType) {
    case "photo":
      return { label: "Fotos", icon: "image-outline" as const };
    case "video":
      return { label: "Videos", icon: "videocam-outline" as const };
    case "audio":
      return { label: "Audios", icon: "musical-notes-outline" as const };
    case "text":
      return { label: "Textos", icon: "document-text-outline" as const };
    default:
      return { label: "Personas", icon: "people-outline" as const };
  }
}

function getVotingProgress(award: Award): number | null {
  if (award.status !== "voting") return null;
  const now = Date.now();
  const start = award.voting_start_at
    ? new Date(award.voting_start_at).getTime()
    : now;
  const end = award.voting_end_at
    ? new Date(award.voting_end_at).getTime()
    : now + 24 * 60 * 60 * 1000;
  const totalDuration = end - start;
  const timeRemaining = Math.max(0, end - now);
  if (totalDuration <= 0) return 0;
  return Math.min(100, Math.max(0, (timeRemaining / totalDuration) * 100));
}

export const AwardCard = React.memo<AwardCardProps>(
  ({ award, index, nomineeCount, onPress }) => {
    const theme = useTheme();
    const iconName = (award.icon as IconName) || defaultAwardIcon;
    const status =
      STATUS_CONFIG[award.status as AwardStatus] ?? STATUS_CONFIG.draft;
    const voteMeta = getVoteTypeMeta(award.vote_type);
    const nominees =
      "nominees" in award
        ? award.nominees.length
        : nomineeCount ?? 0;
    const votingProgress = getVotingProgress(award);

    const borderStyle = useMemo(() => {
      if (award.status === "voting") {
        return {
          borderColor: "#F59E0B",
          borderWidth: 1.5,
        };
      }
      if (award.status === "completed") {
        return {
          borderColor: theme.colors.primary,
          borderWidth: 1.5,
        };
      }
      return {
        borderColor: theme.colors.outlineVariant,
        borderWidth: 1,
      };
    }, [award.status, theme.colors.outlineVariant, theme.colors.primary]);

    const statusColors = useMemo(() => {
      switch (status.accent) {
        case "voting":
          return { fg: "#F59E0B", bg: "rgba(245,158,11,0.15)" };
        case "success":
          return { fg: "#22C55E", bg: "rgba(34,197,94,0.15)" };
        case "tertiary":
          return {
            fg: theme.colors.tertiary,
            bg: `${theme.colors.tertiary}22`,
          };
        default:
          return {
            fg: theme.colors.onSurfaceVariant,
            bg: theme.colors.surfaceVariant,
          };
      }
    }, [status.accent, theme.colors]);

    return (
      <Animated.View
        entering={FadeInDown.duration(350).delay(80 + index * 50)}
      >
        <Pressable
          onPress={onPress}
          disabled={!onPress}
          style={({ pressed }) => [
            {
              opacity: pressed ? 0.92 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          <SquircleView
            style={[
              styles.card,
              { backgroundColor: theme.colors.surface },
              borderStyle,
            ]}
            cornerSmoothing={1}
          >
            <View style={styles.cardContent}>
              <SquircleView
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                    borderColor: theme.colors.outlineVariant,
                    borderWidth: 1,
                  },
                ]}
                cornerSmoothing={1}
              >
                {getIconComponent(iconName, 20, theme.colors.onSurface)}
              </SquircleView>

              <View style={styles.textBlock}>
                <Text
                  style={[styles.title, { color: theme.colors.onSurface }]}
                  numberOfLines={1}
                >
                  {award.name}
                </Text>
                <View style={styles.metaRow}>
                  <Ionicons
                    name={voteMeta.icon}
                    size={12}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      styles.meta,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                    numberOfLines={1}
                  >
                    {voteMeta.label}
                    {" · "}
                    {nominees} nominado{nominees !== 1 ? "s" : ""}
                  </Text>
                </View>
              </View>

              <SquircleView
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: statusColors.bg,
                    borderColor: statusColors.fg,
                    borderWidth: 1,
                  },
                ]}
                cornerSmoothing={1}
              >
                <Ionicons
                  name={status.icon}
                  size={14}
                  color={statusColors.fg}
                />
              </SquircleView>
            </View>

            {votingProgress !== null && (
              <View style={styles.progressSection}>
                <View
                  style={[
                    styles.progressTrack,
                    { backgroundColor: theme.colors.surfaceVariant },
                  ]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: "#F59E0B",
                        width: `${votingProgress}%`,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.progressLabel,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {status.label}
                </Text>
              </View>
            )}
          </SquircleView>
        </Pressable>
      </Animated.View>
    );
  }
);

AwardCard.displayName = "AwardCard";

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    overflow: "hidden",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  textBlock: {
    flex: 1,
    marginLeft: 14,
    marginRight: 12,
    gap: 3,
  },
  title: {
    fontFamily: "Archivo-Bold",
    fontSize: 15,
    letterSpacing: 0.1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  meta: {
    fontFamily: "Archivo-Medium",
    fontSize: 12,
    letterSpacing: 0.1,
    flex: 1,
  },
  statusBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  progressSection: {
    marginTop: 12,
    gap: 6,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressLabel: {
    fontFamily: "Archivo-Medium",
    fontSize: 11,
    letterSpacing: 0.2,
  },
});
