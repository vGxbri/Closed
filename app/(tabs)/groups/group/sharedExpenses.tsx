import { Ionicons } from "@expo/vector-icons";
import { BlurTargetView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSnackbar } from "@/components/ui/SnackbarContext";
import { BottomSheetModal } from "../../../../components/ui/BottomSheetModal";
import {
  ConfirmDialog,
  DialogType,
} from "../../../../components/ui/ConfirmDialog";
import { CustomHeader } from "../../../../components/ui/CustomHeader";
import { ExpenseCard } from "../../../../components/ui/ExpenseCard";
import { MemberBalanceCard } from "../../../../components/ui/MemberBalanceCard";
import { SettlementCard } from "../../../../components/ui/SettlementCard";
import { useGroup } from "../../../../hooks";
import { useSharedExpenses } from "../../../../hooks/useSharedExpenses";
import { SharedExpenseWithDetails, GroupMemberView } from "../../../../types/database";
import { formatCents, DebtTransfer } from "../../../../lib/sharedExpenses";

type TabKey = "expenses" | "balances" | "settle";

// ─── Skeleton ───────────────────────────────────────────────────────────
const SkeletonCard = React.memo<{ index: number }>(({ index }) => {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeIn.duration(400).delay(index * 80)}>
      <SquircleView
        style={[
          styles.skeletonCard,
          {
            backgroundColor: theme.colors.surfaceVariant,
            borderColor: theme.colors.outlineVariant,
            borderWidth: 1,
          },
        ]}
        cornerSmoothing={1}
      >
        <View style={styles.skeletonRow}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: theme.dark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.06)",
            }}
          />
          <View style={{ flex: 1, gap: 8, marginLeft: 14 }}>
            <View
              style={{
                height: 14,
                borderRadius: 7,
                width: "65%",
                backgroundColor: theme.dark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.06)",
              }}
            />
            <View
              style={{
                height: 11,
                borderRadius: 6,
                width: "40%",
                backgroundColor: theme.dark
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(0,0,0,0.04)",
              }}
            />
          </View>
        </View>
      </SquircleView>
    </Animated.View>
  );
});
SkeletonCard.displayName = "SkeletonCard";

// ─── Tab Pill ───────────────────────────────────────────────────────────
interface TabPillProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
}

const TabPill = React.memo<TabPillProps>(
  ({ label, isActive, onPress, icon }) => {
    const theme = useTheme();

    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          {
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          },
        ]}
      >
        <SquircleView
          style={[
            styles.tabPill,
            {
              backgroundColor: isActive
                ? theme.colors.primary
                : theme.colors.surfaceVariant,
              borderColor: isActive
                ? theme.colors.primary
                : theme.colors.outlineVariant,
              borderWidth: 1,
            },
          ]}
          cornerSmoothing={1}
        >
          <Ionicons
            name={icon}
            size={15}
            color={
              isActive ? theme.colors.onPrimary : theme.colors.onSurfaceVariant
            }
          />
          <Text
            style={[
              styles.tabPillLabel,
              {
                color: isActive
                  ? theme.colors.onPrimary
                  : theme.colors.onSurfaceVariant,
              },
            ]}
          >
            {label}
          </Text>
        </SquircleView>
      </Pressable>
    );
  }
);
TabPill.displayName = "TabPill";

// ─── Main Screen ────────────────────────────────────────────────────────
export default function SharedExpensesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();

  const backgroundRef = React.useRef(null);

  const [activeTab, setActiveTab] = useState<TabKey>("expenses");
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedExpense, setSelectedExpense] =
    useState<SharedExpenseWithDetails | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<SharedExpenseWithDetails | null>(null);
  const [settlingDebt, setSettlingDebt] = useState<string | null>(null);

  const { group } = useGroup(id);
  const activeMembers: GroupMemberView[] = useMemo(
    () => (group?.members || []).filter((m) => m.is_active),
    [group?.members]
  );

  const {
    expenses,
    balances,
    debts,
    totalSpent,
    isLoading,
    deleteExpense,
    settleDebt,
  } = useSharedExpenses(id);

  const handleLongPress = useCallback(
    (expense: SharedExpenseWithDetails) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSelectedExpense(expense);
      setActionSheetVisible(true);
    },
    []
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteExpense(deleteTarget.id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      showSnackbar("Gasto eliminado", "success");
    } catch (e) {
      console.error("Error deleting expense:", e);
      showSnackbar("Error al eliminar", "error");
    }
    setDeleteTarget(null);
  }, [deleteTarget, deleteExpense, showSnackbar]);

  const handleCreatePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/groups/group/createExpense",
      params: { id },
    } as any);
  }, [router, id]);

  const handleSettle = useCallback(
    async (debt: DebtTransfer) => {
      const key = `${debt.fromUserId}-${debt.toUserId}`;
      setSettlingDebt(key);
      try {
        await settleDebt(debt.fromUserId, debt.toUserId, debt.amountCents);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        showSnackbar("Pago marcado como hecho", "success");
      } catch (e) {
        console.error("Error settling debt:", e);
        showSnackbar("Error al marcar el pago", "error");
      } finally {
        setSettlingDebt(null);
      }
    },
    [settleDebt, showSnackbar]
  );

  // ─── Tab content renderers ──────────────
  const renderExpensesTab = () => {
    if (isLoading) {
      return (
        <View style={styles.itemList}>
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} index={i} />
          ))}
        </View>
      );
    }

    if (expenses.length === 0) {
      return (
        <Animated.View
          entering={FadeInDown.duration(400).delay(100)}
          style={styles.emptyContainer}
        >
          <SquircleView
            style={[
              styles.emptyCard,
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
                styles.emptyIconContainer,
                {
                  backgroundColor: theme.dark
                    ? "rgba(42,138,112,0.15)"
                    : "rgba(42,138,112,0.08)",
                },
              ]}
              cornerSmoothing={1}
            >
              <Ionicons
                name="wallet-outline"
                size={36}
                color={theme.colors.primary}
              />
            </SquircleView>

            <Text
              style={[styles.emptyTitle, { color: theme.colors.onSurface }]}
            >
              Sin gastos todavía
            </Text>
            <Text
              style={[
                styles.emptySubtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Registra los gastos del viaje para dividirlos entre el grupo de forma justa.
            </Text>

            <Pressable
              onPress={handleCreatePress}
              style={({ pressed }) => [
                styles.emptyButton,
                {
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <SquircleView
                style={[
                  styles.emptyButtonInner,
                  { backgroundColor: theme.colors.primary },
                ]}
                cornerSmoothing={1}
              >
                <Ionicons
                  name="add"
                  size={20}
                  color={theme.colors.onPrimary}
                />
                <Text
                  style={[
                    styles.emptyButtonText,
                    { color: theme.colors.onPrimary },
                  ]}
                >
                  Añadir gasto
                </Text>
              </SquircleView>
            </Pressable>
          </SquircleView>
        </Animated.View>
      );
    }

    return (
      <View style={styles.itemList}>
        {expenses.map((expense, index) => (
          <ExpenseCard
            key={expense.id}
            expense={expense}
            index={index}
            members={activeMembers}
            onLongPress={handleLongPress}
          />
        ))}
      </View>
    );
  };

  const renderBalancesTab = () => {
    if (isLoading) {
      return (
        <View style={styles.itemList}>
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} index={i} />
          ))}
        </View>
      );
    }

    if (balances.size === 0) {
      return (
        <Animated.View
          entering={FadeInDown.duration(400).delay(100)}
          style={styles.emptyContainer}
        >
          <SquircleView
            style={[
              styles.emptyCard,
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
                styles.emptyIconContainer,
                {
                  backgroundColor: theme.dark
                    ? "rgba(42,138,112,0.15)"
                    : "rgba(42,138,112,0.08)",
                },
              ]}
              cornerSmoothing={1}
            >
              <Ionicons
                name="bar-chart-outline"
                size={36}
                color={theme.colors.primary}
              />
            </SquircleView>
            <Text
              style={[styles.emptyTitle, { color: theme.colors.onSurface }]}
            >
              Sin saldos
            </Text>
            <Text
              style={[
                styles.emptySubtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Añade gastos para ver quién debe cuánto.
            </Text>
          </SquircleView>
        </Animated.View>
      );
    }

    return (
      <View style={styles.itemList}>
        {/* Total summary */}
        <Animated.View entering={FadeInDown.duration(350).delay(60)}>
          <SquircleView
            style={[
              styles.summaryCard,
              {
                backgroundColor: theme.colors.primaryContainer,
                borderColor: theme.colors.primary,
                borderWidth: 1,
              },
            ]}
            cornerSmoothing={1}
          >
            <Text
              style={[
                styles.summaryLabel,
                { color: theme.colors.onPrimaryContainer },
              ]}
            >
              Total gastado en el viaje
            </Text>
            <Text
              style={[
                styles.summaryAmount,
                { color: theme.colors.onPrimaryContainer },
              ]}
            >
              {formatCents(totalSpent)}
            </Text>
          </SquircleView>
        </Animated.View>

        {activeMembers.map((member, index) => {
          const balance = balances.get(member.user_id);
          if (!balance) return null;
          return (
            <MemberBalanceCard
              key={member.user_id}
              member={member}
              balance={balance}
              index={index + 1}
            />
          );
        })}
      </View>
    );
  };

  const renderSettleTab = () => {
    if (isLoading) {
      return (
        <View style={styles.itemList}>
          {[0, 1].map((i) => (
            <SkeletonCard key={i} index={i} />
          ))}
        </View>
      );
    }

    if (debts.length === 0) {
      return (
        <Animated.View
          entering={FadeInDown.duration(400).delay(100)}
          style={styles.emptyContainer}
        >
          <SquircleView
            style={[
              styles.emptyCard,
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
                styles.emptyIconContainer,
                {
                  backgroundColor: theme.dark
                    ? "rgba(42,138,112,0.15)"
                    : "rgba(42,138,112,0.08)",
                },
              ]}
              cornerSmoothing={1}
            >
              <Ionicons
                name="checkmark-done-outline"
                size={36}
                color={theme.colors.primary}
              />
            </SquircleView>
            <Text
              style={[styles.emptyTitle, { color: theme.colors.onSurface }]}
            >
              {expenses.length === 0
                ? "Sin gastos que liquidar"
                : "¡Todo cuadrado!"}
            </Text>
            <Text
              style={[
                styles.emptySubtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {expenses.length === 0
                ? "Cuando registréis gastos, aquí veréis cómo saldar las cuentas."
                : "No hay deudas pendientes entre los miembros del grupo."}
            </Text>
          </SquircleView>
        </Animated.View>
      );
    }

    return (
      <View style={styles.itemList}>
        {debts.map((debt, index) => (
          <SettlementCard
            key={`${debt.fromUserId}-${debt.toUserId}`}
            debt={debt}
            index={index}
            members={activeMembers}
            onSettle={handleSettle}
            isSettling={
              settlingDebt === `${debt.fromUserId}-${debt.toUserId}`
            }
          />
        ))}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <BlurTargetView
        ref={backgroundRef}
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <CustomHeader title="" showBackButton={true} />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: 120 + insets.bottom },
          ]}
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
              Gastos
            </Text>
            <Text
              style={[
                styles.screenSubtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {isLoading
                ? "Cargando..."
                : expenses.length === 0
                  ? "Gastos compartidos del viaje"
                  : `${expenses.length} gasto${expenses.length !== 1 ? "s" : ""} · Total: ${formatCents(totalSpent)}`}
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

          {/* ─── Tabs ─── */}
          <Animated.View
            entering={FadeInDown.duration(300).delay(80)}
            style={styles.tabRow}
          >
            <TabPill
              label="Gastos"
              isActive={activeTab === "expenses"}
              onPress={() => setActiveTab("expenses")}
              icon="receipt-outline"
            />
            <TabPill
              label="Saldos"
              isActive={activeTab === "balances"}
              onPress={() => setActiveTab("balances")}
              icon="bar-chart-outline"
            />
            <TabPill
              label="Liquidar"
              isActive={activeTab === "settle"}
              onPress={() => setActiveTab("settle")}
              icon="swap-horizontal-outline"
            />
          </Animated.View>

          {/* ─── Content ─── */}
          {activeTab === "expenses" && renderExpensesTab()}
          {activeTab === "balances" && renderBalancesTab()}
          {activeTab === "settle" && renderSettleTab()}
        </ScrollView>

        {/* ─── FAB ─── */}
        {!isLoading && activeTab === "expenses" && expenses.length > 0 && (
          <Animated.View
            entering={FadeIn.duration(400).delay(300)}
            style={[
              styles.fabContainer,
              { bottom: Math.max(insets.bottom + 24, 40) },
            ]}
          >
            <Pressable
              onPress={handleCreatePress}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.92 : 1 }],
                },
              ]}
            >
              <SquircleView
                style={[
                  styles.fab,
                  {
                    backgroundColor: theme.colors.primary,
                    shadowColor: theme.colors.primary,
                  },
                ]}
                cornerSmoothing={1}
              >
                <Ionicons
                  name="add"
                  size={28}
                  color={theme.colors.onPrimary}
                />
              </SquircleView>
            </Pressable>
          </Animated.View>
        )}
      </BlurTargetView>

      {/* ─── Action Bottom Sheet (long press on expense) ─── */}
      <BottomSheetModal
        visible={actionSheetVisible}
        onDismiss={() => {
          setActionSheetVisible(false);
          setSelectedExpense(null);
        }}
        blurTarget={backgroundRef}
      >
        {selectedExpense && (
          <View
            style={[
              styles.actionSheetContent,
              { paddingBottom: Math.max(insets.bottom + 24, 40) },
            ]}
          >
            <Text
              style={[
                styles.actionSheetTitle,
                { color: theme.colors.onSurface },
              ]}
              numberOfLines={1}
            >
              {selectedExpense.description}
            </Text>

            <SquircleView
              style={[
                styles.actionMenuCard,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  borderColor: theme.colors.outlineVariant,
                  borderWidth: 1,
                },
              ]}
              cornerSmoothing={1}
            >
              {/* Delete */}
              <Pressable
                style={({ pressed }) => [
                  styles.actionOption,
                  {
                    backgroundColor: pressed
                      ? theme.colors.outlineVariant
                      : "transparent",
                  },
                ]}
                onPress={() => {
                  setActionSheetVisible(false);
                  setDeleteTarget(selectedExpense);
                }}
              >
                <SquircleView
                  style={[
                    styles.actionIconBox,
                    { backgroundColor: theme.colors.surface },
                  ]}
                  cornerSmoothing={1}
                >
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color="#F44336"
                  />
                </SquircleView>
                <Text
                  style={[
                    styles.actionOptionText,
                    { color: "#F44336" },
                  ]}
                >
                  Eliminar gasto
                </Text>
              </Pressable>
            </SquircleView>
          </View>
        )}
      </BottomSheetModal>

      {/* ─── Delete Confirm Dialog ─── */}
      <ConfirmDialog
        visible={!!deleteTarget}
        title="Eliminar gasto"
        message={`¿Eliminar "${deleteTarget?.description}"? Esta acción no se puede deshacer.`}
        type="warning"
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        blurTargetRef={backgroundRef}
      />
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
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

  tabRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  tabPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 7,
  },
  tabPillLabel: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 13,
    letterSpacing: 0.2,
  },

  itemList: { gap: 10 },

  summaryCard: {
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    marginBottom: 6,
  },
  summaryLabel: {
    fontFamily: "Archivo-Medium",
    fontSize: 13,
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  summaryAmount: {
    fontFamily: "Archivo-Bold",
    fontSize: 28,
    letterSpacing: 0.5,
  },

  skeletonCard: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  emptyContainer: { marginTop: 20 },
  emptyCard: {
    borderRadius: 24,
    padding: 36,
    alignItems: "center",
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 17,
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: "Archivo-Medium",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    letterSpacing: 0.1,
    marginBottom: 20,
  },
  emptyButton: { marginTop: 4 },
  emptyButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  emptyButtonText: {
    fontFamily: "Archivo-Bold",
    fontSize: 15,
  },

  fabContainer: {
    position: "absolute",
    right: 24,
    zIndex: 100,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },

  actionSheetContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  actionSheetTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 18,
    marginBottom: 16,
  },
  actionMenuCard: {
    borderRadius: 20,
    overflow: "hidden",
  },
  actionOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  actionOptionText: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 15,
    flex: 1,
  },
});
