import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { InviteModal } from "../../../../components/InviteModal";
import { MemberAvatarsRow } from "../../../../components/MemberAvatar";
import {
  defaultGroupIcon,
  getIconComponent,
  IconName,
} from "../../../../constants/icons";
import { useAuth, useGroup } from "../../../../hooks";

import { BlurTargetView } from "expo-blur";
import { ConfirmDialog, DialogType } from "../../../../components/ui/ConfirmDialog";
import { CustomHeader } from "../../../../components/ui/CustomHeader";
import { MenuOption, OptionsMenu } from "../../../../components/ui/OptionsMenu";
import { useSnackbar } from "../../../../components/ui/SnackbarContext";

// ─── Constants ─────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = 14;
const CARD_WIDTH = (SCREEN_WIDTH - 24 * 2 - CARD_GAP) / 2;

// ─── Widget Config ─────────────────────────────────────────────────────
interface WidgetConfig {
  id: string;
  name: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const PLACEHOLDER_WIDGETS: WidgetConfig[] = [
  {
    id: "expenses",
    name: "Gastos",
    subtitle: "Gastos compartidos",
    icon: "wallet-outline",
  },
  {
    id: "gallery",
    name: "Galería",
    subtitle: "Fotos del grupo",
    icon: "images-outline",
  },
  {
    id: "tasks",
    name: "Tareas",
    subtitle: "Lista compartida",
    icon: "checkbox-outline",
  },
  {
    id: "ai-daily",
    name: "IA Daily",
    subtitle: "Encuestas y retos",
    icon: "sparkles-outline",
  },
];

// ─── Widget Card ───────────────────────────────────────────────────────
interface WidgetCardProps {
  widget: WidgetConfig;
  index: number;
  onPress: () => void;
}

const WidgetCard = React.memo<WidgetCardProps>(({ widget, index, onPress }) => {
  const theme = useTheme();

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(200 + index * 80)}
      style={styles.bentoItem}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          {
            opacity: pressed ? 0.92 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          },
        ]}
      >
        <SquircleView
          style={[
            styles.widgetCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
              borderWidth: 1,
            },
          ]}
          cornerSmoothing={1}
        >
          {/* Icon */}
          <SquircleView
            style={[
              styles.widgetIconContainer,
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
            <Ionicons
              name={widget.icon}
              size={24}
              color={theme.colors.primary}
            />
          </SquircleView>

          {/* Info */}
          <View style={styles.widgetInfo}>
            <Text
              style={[styles.widgetName, { color: theme.colors.onSurface }]}
              numberOfLines={1}
            >
              {widget.name}
            </Text>
            <Text
              style={[
                styles.widgetSubtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
              numberOfLines={1}
            >
              {widget.subtitle}
            </Text>
          </View>
        </SquircleView>
      </Pressable>
    </Animated.View>
  );
});

WidgetCard.displayName = "WidgetCard";

// ─── Skeleton Card ─────────────────────────────────────────────────────
interface SkeletonProps {
  index: number;
}

const SkeletonCard = React.memo<SkeletonProps>(({ index }) => {
  const theme = useTheme();
  return (
    <Animated.View
      entering={FadeIn.duration(400).delay(index * 80)}
      style={{ width: "100%" }}
    >
      <SquircleView
        style={[
          styles.skeletonBlock,
          {
            backgroundColor: theme.colors.surfaceVariant,
            borderColor: theme.colors.outlineVariant,
            borderWidth: 1,
          },
        ]}
        cornerSmoothing={1}
      />
    </Animated.View>
  );
});

SkeletonCard.displayName = "SkeletonCard";

// ─── Main Screen ───────────────────────────────────────────────────────
export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const { user } = useAuth();
  const [showInviteModal, setShowInviteModal] = useState(false);

  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: DialogType;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }>({
    visible: false,
    title: "",
    message: "",
    type: "info",
    onConfirm: () => {},
  });

  const [optionsMenu, setOptionsMenu] = useState<{
    visible: boolean;
    title: string;
    options: MenuOption[];
  }>({
    visible: false,
    title: "",
    options: [],
  });

  const hideDialog = () =>
    setDialogConfig((prev) => ({ ...prev, visible: false }));
  const hideOptionsMenu = () =>
    setOptionsMenu((prev) => ({ ...prev, visible: false }));

  const backgroundRef = React.useRef(null);

  const {
    group,
    isLoading,
    error,
    refetch,
    isAdmin,
    isOwner,
  } = useGroup(id);

  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

  const handleWidgetPress = useCallback(() => {
    showSnackbar("Próximamente", "info");
  }, [showSnackbar]);

  const handleAddWidget = useCallback(() => {
    showSnackbar("Próximamente — Explorar widgets", "info");
  }, [showSnackbar]);

  const handleMembersPress = useCallback(() => {
    if (!group) return;
    // If there's a members screen, navigate to it; otherwise open invite modal
    setShowInviteModal(true);
  }, [group]);

  const handleInvite = useCallback(() => {
    setShowInviteModal(true);
  }, []);

  // Placeholder widgets — in the future this would come from the group data
  const widgets = useMemo(() => PLACEHOLDER_WIDGETS, []);

  // Loading state
  if (isLoading && !group) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View
          style={[styles.container, { backgroundColor: theme.colors.background }]}
        >
          <CustomHeader title="" showBackButton={true} />
          <View style={styles.loadingContent}>
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} index={i} />
            ))}
          </View>
        </View>
      </>
    );
  }

  // Error state
  if (error || !group) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View
          style={[styles.container, { backgroundColor: theme.colors.background }]}
        >
          <CustomHeader title="" showBackButton={true} />
          <View style={styles.errorContent}>
            <SquircleView
              style={[
                styles.errorIconContainer,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                },
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
              style={[
                styles.errorTitle,
                { color: theme.colors.onSurface },
              ]}
            >
              {error ? "Error al cargar" : "Grupo no encontrado"}
            </Text>
            <Text
              style={[
                styles.errorSubtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {error
                ? "No se pudo cargar el grupo. Inténtalo de nuevo."
                : "Este grupo ya no existe o no tienes acceso."}
            </Text>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
              ]}
            >
              <SquircleView
                style={[
                  styles.errorButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                cornerSmoothing={1}
              >
                <Text
                  style={[
                    styles.errorButtonText,
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

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <BlurTargetView ref={backgroundRef} style={styles.container}>
        <CustomHeader
          title=""
          showBackButton={true}
          rightAction={
            isAdmin ? (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/groups/group/settings",
                    params: { id },
                  })
                }
              >
                <Ionicons
                  name="settings-outline"
                  size={24}
                  color={theme.colors.onSurface}
                />
              </TouchableOpacity>
            ) : undefined
          }
        />

        <View
          style={[styles.container, { backgroundColor: theme.colors.background }]}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: 120 + insets.bottom },
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={refetch}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
              />
            }
          >
            {/* ─── Group Header ─── */}
            <Animated.View
              entering={FadeInUp.duration(500)}
              style={styles.header}
            >
              {/* Icon + Name */}
              <View style={styles.headerTitleRow}>
                <SquircleView
                  style={[
                    styles.groupIconContainer,
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
                    (group.icon as IconName) || defaultGroupIcon,
                    26,
                    theme.colors.primary
                  )}
                </SquircleView>
              </View>

              <Text
                style={[styles.groupName, { color: theme.colors.primary }]}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {group.name}
              </Text>

              {/* Divider */}
              <View
                style={[
                  styles.headerDivider,
                  { backgroundColor: theme.colors.outlineVariant },
                ]}
              />

              {/* Description */}
              <Text
                style={[
                  styles.groupDescription,
                  { color: theme.colors.onSurfaceVariant },
                ]}
                numberOfLines={2}
              >
                {group.description || "Tu espacio privado para organizaros juntos."}
              </Text>
            </Animated.View>

            {/* ─── Members Row ─── */}
            <Animated.View entering={FadeInDown.duration(400).delay(100)}>
              <Pressable
                onPress={handleMembersPress}
                style={({ pressed }) => [
                  styles.membersRow,
                  {
                    opacity: pressed ? 0.85 : 1,
                    transform: [{ scale: pressed ? 0.99 : 1 }],
                  },
                ]}
              >
                <MemberAvatarsRow
                  users={group.members}
                  max={5}
                  size="sm"
                />
                <View style={styles.membersTextBlock}>
                  <Text
                    style={[
                      styles.membersCount,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    {group.member_count}{" "}
                    {group.member_count === 1 ? "miembro" : "miembros"}
                  </Text>
                  <Text
                    style={[
                      styles.membersAction,
                      { color: theme.colors.primary },
                    ]}
                  >
                    Invitar
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={theme.colors.onSurfaceVariant}
                />
              </Pressable>
            </Animated.View>

            {/* ─── Section Divider ─── */}
            <Animated.View
              entering={FadeIn.duration(400).delay(150)}
              style={[
                styles.sectionDivider,
                { backgroundColor: theme.colors.outlineVariant },
              ]}
            />

            {/* ─── Widgets Grid ─── */}
            {widgets.length > 0 ? (
              <View style={styles.bentoGrid}>
                {widgets.map((widget, index) => (
                  <WidgetCard
                    key={widget.id}
                    widget={widget}
                    index={index}
                    onPress={handleWidgetPress}
                  />
                ))}

                {/* Add Widget Card */}
                <Animated.View
                  entering={FadeInDown.duration(400).delay(
                    200 + widgets.length * 80
                  )}
                  style={{ width: "100%" }}
                >
                  <Pressable
                    onPress={handleAddWidget}
                    style={({ pressed }) => [
                      {
                        opacity: pressed ? 0.8 : 1,
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                      },
                    ]}
                  >
                    <SquircleView
                      style={[
                        styles.addWidgetCard,
                        {
                          borderColor: theme.colors.outlineVariant,
                          borderWidth: 2,
                        },
                      ]}
                      cornerSmoothing={1}
                    >
                      <SquircleView
                        style={[
                          styles.addWidgetIconContainer,
                          {
                            backgroundColor: theme.dark
                              ? "rgba(255,255,255,0.06)"
                              : "rgba(0,0,0,0.04)",
                          },
                        ]}
                        cornerSmoothing={1}
                      >
                        <Ionicons
                          name="add"
                          size={24}
                          color={theme.colors.onSurfaceVariant}
                        />
                      </SquircleView>
                      <View>
                        <Text
                          style={[
                            styles.addWidgetTitle,
                            { color: theme.colors.onSurfaceVariant },
                          ]}
                        >
                          Explorar widgets
                        </Text>
                        <Text
                          style={[
                            styles.addWidgetSubtitle,
                            { color: theme.colors.outline },
                          ]}
                        >
                          Personaliza tu grupo
                        </Text>
                      </View>
                    </SquircleView>
                  </Pressable>
                </Animated.View>
              </View>
            ) : (
              /* ─── Empty Widget State ─── */
              <Animated.View
                entering={FadeInDown.duration(500).delay(200)}
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
                      name="grid-outline"
                      size={36}
                      color={theme.colors.primary}
                    />
                  </SquircleView>

                  <Text
                    style={[
                      styles.emptyTitle,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    Personaliza tu grupo
                  </Text>
                  <Text
                    style={[
                      styles.emptySubtitle,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    Añade widgets para organizar tu grupo a tu manera. Gastos,
                    galería, tareas y mucho más.
                  </Text>

                  <Pressable
                    onPress={handleAddWidget}
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
                        Explorar widgets
                      </Text>
                    </SquircleView>
                  </Pressable>
                </SquircleView>
              </Animated.View>
            )}
          </ScrollView>

          {/* Invite Modal */}
          <InviteModal
            visible={showInviteModal}
            onClose={() => setShowInviteModal(false)}
            inviteCode={group.invite_code}
            groupName={group.name}
          />
        </View>
      </BlurTargetView>

      <OptionsMenu
        visible={optionsMenu.visible}
        title={optionsMenu.title}
        options={optionsMenu.options}
        onDismiss={hideOptionsMenu}
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
        showCancel={true}
        blurTargetRef={backgroundRef}
      />
    </>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 0,
  },

  // Loading
  loadingContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    gap: 16,
  },
  skeletonBlock: {
    height: 80,
    borderRadius: 22,
  },

  // Error
  errorContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 36,
  },
  errorIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  errorTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  errorSubtitle: {
    fontFamily: "Archivo-Medium",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  errorButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  errorButtonText: {
    fontFamily: "Archivo-Bold",
    fontSize: 16,
  },

  // Header
  header: {
    marginBottom: 20,
    marginTop: 4,
  },
  headerTitleRow: {
    marginBottom: 12,
  },
  groupIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  groupName: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 34,
    letterSpacing: 0.5,
    lineHeight: 40,
  },
  headerDivider: {
    height: 1,
    width: "50%",
    marginTop: 6,
    marginBottom: 10,
  },
  groupDescription: {
    fontFamily: "Archivo-Medium",
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.3,
  },

  // Members Row
  membersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  membersTextBlock: {
    flex: 1,
    marginLeft: 2,
  },
  membersCount: {
    fontFamily: "Archivo-Bold",
    fontSize: 14,
  },
  membersAction: {
    fontFamily: "Archivo-Medium",
    fontSize: 12,
    letterSpacing: 0.3,
    marginTop: 1,
  },

  // Section Divider
  sectionDivider: {
    height: 1,
    marginBottom: 20,
  },

  // Bento Grid
  bentoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: CARD_GAP,
  },
  bentoItem: {
    width: CARD_WIDTH,
  },

  // Widget Card
  widgetCard: {
    borderRadius: 22,
    padding: 16,
    aspectRatio: 1,
    justifyContent: "space-between",
  },
  widgetIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  widgetInfo: {
    flex: 1,
    justifyContent: "flex-end",
  },
  widgetName: {
    fontFamily: "Archivo-Bold",
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 2,
  },
  widgetSubtitle: {
    fontFamily: "Archivo-Medium",
    fontSize: 12,
    letterSpacing: 0.2,
  },

  // Add Widget Card
  addWidgetCard: {
    borderRadius: 22,
    borderStyle: "dashed",
    backgroundColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 14,
  },
  addWidgetIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  addWidgetTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 14,
  },
  addWidgetSubtitle: {
    fontFamily: "Archivo-Medium",
    fontSize: 12,
    marginTop: 1,
  },

  // Empty State
  emptyContainer: {
    marginTop: 8,
  },
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
    fontSize: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: "Archivo-Medium",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    width: "100%",
  },
  emptyButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  emptyButtonText: {
    fontFamily: "Archivo-Bold",
    fontSize: 16,
    letterSpacing: 0.3,
  },
});
