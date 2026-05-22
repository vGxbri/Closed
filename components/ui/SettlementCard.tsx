import { Ionicons } from "@expo/vector-icons";
import React, { useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";
import Animated, { FadeInDown } from "react-native-reanimated";

import { GroupMemberView } from "../../types/database";
import { DebtTransfer, formatCents } from "../../lib/sharedExpenses";
import { UserAvatar } from "./UserAvatar";

interface SettlementCardProps {
  debt: DebtTransfer;
  index: number;
  members: GroupMemberView[];
  onSettle: (debt: DebtTransfer) => void;
  isSettling: boolean;
}

export const SettlementCard = React.memo<SettlementCardProps>(
  ({ debt, index, members, onSettle, isSettling }) => {
    const theme = useTheme();

    const fromMember = members.find((m) => m.user_id === debt.fromUserId);
    const toMember = members.find((m) => m.user_id === debt.toUserId);

    const fromName = fromMember?.group_display_name || fromMember?.display_name || "?";
    const toName = toMember?.group_display_name || toMember?.display_name || "?";

    const handleSettle = useCallback(() => {
      onSettle(debt);
    }, [debt, onSettle]);

    return (
      <Animated.View
        entering={FadeInDown.duration(350).delay(80 + index * 50)}
      >
        <SquircleView
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
              borderWidth: 1,
            },
          ]}
          cornerSmoothing={1}
        >
          <View style={styles.cardContent}>
            <View style={styles.avatarsRow}>
              <UserAvatar
                uri={fromMember?.avatar_url ?? null}
                name={fromName}
                size="sm"
              />
              <Ionicons
                name="arrow-forward"
                size={16}
                color={theme.colors.onSurfaceVariant}
              />
              <UserAvatar
                uri={toMember?.avatar_url ?? null}
                name={toName}
                size="sm"
              />
            </View>

            <View style={styles.textBlock}>
              <Text
                style={[styles.description, { color: theme.colors.onSurface }]}
                numberOfLines={2}
              >
                {fromName} debe pagar{"\n"}
                <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>
                  {formatCents(debt.amountCents)}
                </Text>
                {" "}a {toName}
              </Text>
            </View>

            <Pressable
              onPress={handleSettle}
              disabled={isSettling}
              style={({ pressed }) => [
                { opacity: pressed || isSettling ? 0.6 : 1 },
              ]}
            >
              <SquircleView
                style={[
                  styles.settleButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                cornerSmoothing={1}
              >
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              </SquircleView>
            </Pressable>
          </View>
        </SquircleView>
      </Animated.View>
    );
  }
);

SettlementCard.displayName = "SettlementCard";

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 10,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  avatarsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  textBlock: {
    flex: 1,
  },
  description: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  settleButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
