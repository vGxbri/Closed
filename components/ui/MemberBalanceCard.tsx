import React from "react";
import { StyleSheet, View } from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";
import Animated, { FadeInDown } from "react-native-reanimated";

import { GroupMemberView } from "../../types/database";
import { MemberBalance } from "../../lib/sharedExpenses";
import { formatCents } from "../../lib/sharedExpenses";
import { UserAvatar } from "./UserAvatar";

interface MemberBalanceCardProps {
  member: GroupMemberView;
  balance: MemberBalance;
  index: number;
}

export const MemberBalanceCard = React.memo<MemberBalanceCardProps>(
  ({ member, balance, index }) => {
    const theme = useTheme();

    const isPositive = balance.netBalance > 0;
    const isZero = balance.netBalance === 0;
    const balanceColor = isZero
      ? theme.colors.onSurfaceVariant
      : isPositive
        ? "#4CAF50"
        : "#F44336";

    const statusText = isZero
      ? "En paz"
      : isPositive
        ? "Le deben"
        : "Debe";

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
            <UserAvatar
              uri={member.avatar_url}
              name={member.group_display_name || member.display_name}
              size="sm"
            />

            <View style={styles.textBlock}>
              <Text
                style={[styles.name, { color: theme.colors.onSurface }]}
                numberOfLines={1}
              >
                {member.group_display_name || member.display_name}
              </Text>
              <Text style={[styles.status, { color: balanceColor }]}>
                {statusText}
              </Text>
            </View>

            <Text style={[styles.amount, { color: balanceColor }]}>
              {isPositive ? "+" : ""}
              {formatCents(balance.netBalance)}
            </Text>
          </View>
        </SquircleView>
      </Animated.View>
    );
  }
);

MemberBalanceCard.displayName = "MemberBalanceCard";

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
  name: {
    fontSize: 15,
    fontWeight: "600",
  },
  status: {
    fontSize: 12,
    fontWeight: "500",
  },
  amount: {
    fontSize: 15,
    fontWeight: "700",
  },
});
