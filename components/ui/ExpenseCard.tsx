import { Ionicons } from "@expo/vector-icons";
import React, { useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";
import Animated, { FadeInDown } from "react-native-reanimated";

import { SharedExpenseWithDetails, GroupMemberView } from "../../types/database";
import { formatCents } from "../../lib/sharedExpenses";
import { UserAvatar } from "./UserAvatar";

interface ExpenseCardProps {
  expense: SharedExpenseWithDetails;
  index: number;
  members: GroupMemberView[];
  onLongPress: (expense: SharedExpenseWithDetails) => void;
}

export const ExpenseCard = React.memo<ExpenseCardProps>(
  ({ expense, index, members, onLongPress }) => {
    const theme = useTheme();

    const handleLongPress = useCallback(() => {
      onLongPress(expense);
    }, [expense, onLongPress]);

    const payerName =
      expense.payer?.display_name ||
      members.find((m) => m.user_id === expense.paid_by)?.display_name ||
      "Desconocido";

    const payerAvatar =
      expense.payer?.avatar_url ??
      members.find((m) => m.user_id === expense.paid_by)?.avatar_url ??
      null;

    const splitCount = expense.splits.length;
    const date = new Date(expense.created_at);
    const dateStr = date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });

    return (
      <Animated.View
        entering={FadeInDown.duration(350).delay(80 + index * 50)}
      >
        <Pressable
          onLongPress={handleLongPress}
          delayLongPress={500}
          style={({ pressed }) => [
            { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
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
              <UserAvatar uri={payerAvatar} name={payerName} size="sm" />

              <View style={styles.textBlock}>
                <Text
                  style={[styles.description, { color: theme.colors.onSurface }]}
                  numberOfLines={1}
                >
                  {expense.description}
                </Text>
                <Text
                  style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}
                  numberOfLines={1}
                >
                  {payerName} · {splitCount} persona{splitCount !== 1 ? "s" : ""} · {dateStr}
                </Text>
              </View>

              <Text style={[styles.amount, { color: theme.colors.primary }]}>
                {formatCents(expense.amount_cents)}
              </Text>
            </View>
          </SquircleView>
        </Pressable>
      </Animated.View>
    );
  }
);

ExpenseCard.displayName = "ExpenseCard";

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
  textBlock: {
    flex: 1,
    gap: 3,
  },
  description: {
    fontSize: 15,
    fontWeight: "600",
  },
  meta: {
    fontSize: 12,
    fontWeight: "400",
  },
  amount: {
    fontSize: 15,
    fontWeight: "700",
  },
});
