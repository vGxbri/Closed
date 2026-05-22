import { Ionicons } from "@expo/vector-icons";
import { BlurTargetView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Keyboard,
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

import { ConfirmDialog, DialogType } from "@/components/ui/ConfirmDialog";
import { CustomHeader } from "@/components/ui/CustomHeader";
import { MemberChecklist } from "@/components/ui/MemberChecklist";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useAuth, useGroup } from "@/hooks";
import { sharedExpensesService } from "@/services/sharedExpenses.service";
import { GroupMemberView } from "@/types/database";

export default function CreateExpenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const backgroundRef = React.useRef(null);

  const { user } = useAuth();
  const { group } = useGroup(id);
  const activeMembers: GroupMemberView[] = useMemo(
    () => (group?.members || []).filter((m) => m.is_active),
    [group?.members]
  );

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paidBy, setPaidBy] = useState<string>(user?.id || "");
  const [selectedSplitIds, setSelectedSplitIds] = useState<Set<string>>(
    () => new Set(activeMembers.map((m) => m.user_id))
  );
  const [isSaving, setIsSaving] = useState(false);

  // Re-sync when members load
  React.useEffect(() => {
    if (activeMembers.length > 0 && selectedSplitIds.size === 0) {
      setSelectedSplitIds(new Set(activeMembers.map((m) => m.user_id)));
    }
    if (user?.id && !paidBy) {
      setPaidBy(user.id);
    }
  }, [activeMembers, user?.id]);

  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: DialogType;
  }>({ visible: false, title: "", message: "", type: "info" });
  const hideDialog = () =>
    setDialogConfig((prev) => ({ ...prev, visible: false }));

  const handleToggleSplit = useCallback((userId: string) => {
    setSelectedSplitIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        if (next.size <= 1) return prev;
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }, []);

  const amountCents = useMemo(() => {
    const parsed = parseFloat(amount.replace(",", "."));
    if (isNaN(parsed) || parsed <= 0) return 0;
    return Math.round(parsed * 100);
  }, [amount]);

  const perPersonCents = useMemo(() => {
    if (amountCents === 0 || selectedSplitIds.size === 0) return 0;
    return Math.floor(amountCents / selectedSplitIds.size);
  }, [amountCents, selectedSplitIds.size]);

  const handleSave = useCallback(async () => {
    if (!amount.trim() || amountCents === 0) {
      setDialogConfig({
        visible: true,
        title: "Importe requerido",
        message: "Introduce una cantidad válida mayor que 0.",
        type: "warning",
      });
      return;
    }
    if (!description.trim()) {
      setDialogConfig({
        visible: true,
        title: "Descripción requerida",
        message: "Describe brevemente en qué se ha gastado.",
        type: "warning",
      });
      return;
    }
    if (selectedSplitIds.size === 0) {
      setDialogConfig({
        visible: true,
        title: "Selecciona participantes",
        message: "Debe haber al menos una persona en el reparto.",
        type: "warning",
      });
      return;
    }
    if (!id) return;

    try {
      setIsSaving(true);
      Keyboard.dismiss();

      await sharedExpensesService.createExpense({
        group_id: id,
        amount_cents: amountCents,
        description: description.trim(),
        paid_by: paidBy,
        split_user_ids: Array.from(selectedSplitIds),
      });

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.back();
    } catch (e) {
      console.error("Error creating expense:", e);
      setDialogConfig({
        visible: true,
        title: "Error",
        message: "No se pudo guardar el gasto. Inténtalo de nuevo.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }, [amount, description, paidBy, selectedSplitIds, amountCents, id, router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <BlurTargetView
        ref={backgroundRef}
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <CustomHeader title="" showBackButton />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: 120 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeIn.duration(500)} style={styles.titleBlock}>
            <Text style={[styles.screenTitle, { color: theme.colors.primary }]}>
              Nuevo gasto
            </Text>
            <Text
              style={[
                styles.screenSubtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Registra un gasto compartido del viaje
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeIn.duration(400).delay(50)}
            style={[
              styles.divider,
              { backgroundColor: theme.colors.outlineVariant },
            ]}
          />

          {/* ─── Amount ─── */}
          <Animated.View
            entering={FadeInDown.duration(300).delay(80)}
            style={styles.section}
          >
            <Text
              style={[
                styles.sectionLabel,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Importe (€)
            </Text>
            <SquircleView
              style={[
                styles.inputCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant,
                  borderWidth: 1,
                },
              ]}
              cornerSmoothing={1}
            >
              <Ionicons
                name="cash-outline"
                size={20}
                color={theme.colors.onSurfaceVariant}
              />
              <TextInput
                style={[styles.textInput, { color: theme.colors.onSurface }]}
                placeholder="0,00"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
            </SquircleView>
          </Animated.View>

          {/* ─── Description ─── */}
          <Animated.View
            entering={FadeInDown.duration(300).delay(120)}
            style={styles.section}
          >
            <Text
              style={[
                styles.sectionLabel,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Descripción
            </Text>
            <SquircleView
              style={[
                styles.inputCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant,
                  borderWidth: 1,
                },
              ]}
              cornerSmoothing={1}
            >
              <Ionicons
                name="create-outline"
                size={20}
                color={theme.colors.onSurfaceVariant}
              />
              <TextInput
                style={[styles.textInput, { color: theme.colors.onSurface }]}
                placeholder="Ej. Cena en el restaurante"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                value={description}
                onChangeText={setDescription}
                returnKeyType="done"
                maxLength={100}
              />
            </SquircleView>
          </Animated.View>

          {/* ─── Paid by ─── */}
          <Animated.View
            entering={FadeInDown.duration(300).delay(160)}
            style={styles.section}
          >
            <Text
              style={[
                styles.sectionLabel,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              ¿Quién pagó?
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.payerScroll}
              contentContainerStyle={styles.payerScrollContent}
            >
              {activeMembers.map((member) => {
                const isSelected = paidBy === member.user_id;
                const name =
                  member.group_display_name || member.display_name;
                return (
                  <Pressable
                    key={member.user_id}
                    onPress={() => setPaidBy(member.user_id)}
                    style={({ pressed }) => [
                      { opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    <SquircleView
                      style={[
                        styles.payerChip,
                        {
                          backgroundColor: isSelected
                            ? theme.colors.primaryContainer
                            : theme.colors.surface,
                          borderColor: isSelected
                            ? theme.colors.primary
                            : theme.colors.outlineVariant,
                          borderWidth: isSelected ? 1.5 : 1,
                        },
                      ]}
                      cornerSmoothing={1}
                    >
                      <UserAvatar
                        uri={member.avatar_url}
                        name={name}
                        size={28}
                      />
                      <Text
                        style={[
                          styles.payerName,
                          {
                            color: isSelected
                              ? theme.colors.onPrimaryContainer
                              : theme.colors.onSurface,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {name}
                      </Text>
                    </SquircleView>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>

          {/* ─── Split between ─── */}
          <Animated.View
            entering={FadeInDown.duration(300).delay(200)}
            style={styles.section}
          >
            <View style={styles.sectionHeaderRow}>
              <Text
                style={[
                  styles.sectionLabel,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Dividir entre
              </Text>
              {amountCents > 0 && selectedSplitIds.size > 0 && (
                <Text
                  style={[
                    styles.perPersonLabel,
                    { color: theme.colors.primary },
                  ]}
                >
                  {(perPersonCents / 100).toFixed(2)} € / persona
                </Text>
              )}
            </View>
            <MemberChecklist
              members={activeMembers}
              selectedIds={selectedSplitIds}
              onToggle={handleToggleSplit}
            />
          </Animated.View>
        </ScrollView>

        {/* ─── Save button ─── */}
        <View
          style={[
            styles.bottomBar,
            {
              paddingBottom: Math.max(insets.bottom + 16, 32),
            },
          ]}
        >
          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            style={({ pressed }) => [
              {
                opacity: pressed || isSaving ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            <SquircleView
              style={[
                styles.saveButton,
                { backgroundColor: theme.colors.primary },
              ]}
              cornerSmoothing={1}
            >
              <Ionicons
                name={isSaving ? "hourglass-outline" : "checkmark"}
                size={22}
                color={theme.colors.onPrimary}
              />
              <Text
                style={[
                  styles.saveButtonText,
                  { color: theme.colors.onPrimary },
                ]}
              >
                {isSaving ? "Guardando..." : "Guardar gasto"}
              </Text>
            </SquircleView>
          </Pressable>
        </View>
      </BlurTargetView>

      <ConfirmDialog
        visible={dialogConfig.visible}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        onCancel={hideDialog}
        showCancel={false}
        confirmText="OK"
        onConfirm={hideDialog}
        blurTargetRef={backgroundRef}
      />
    </>
  );
}

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

  section: { marginBottom: 24 },
  sectionLabel: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 13,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  perPersonLabel: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 13,
    letterSpacing: 0.2,
  },

  inputCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 12,
  },
  textInput: {
    flex: 1,
    fontFamily: "Archivo-Medium",
    fontSize: 16,
    padding: 0,
  },

  payerScroll: { marginHorizontal: -24 },
  payerScrollContent: {
    paddingHorizontal: 24,
    gap: 10,
  },
  payerChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 8,
  },
  payerName: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 13,
    maxWidth: 100,
  },

  bottomBar: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 18,
  },
  saveButtonText: {
    fontFamily: "Archivo-Bold",
    fontSize: 16,
  },
});
