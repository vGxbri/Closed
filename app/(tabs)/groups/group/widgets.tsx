import { Ionicons } from "@expo/vector-icons";
import { BlurTargetView } from "expo-blur";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import SquircleView from "react-native-fast-squircle";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  Layout,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  ConfirmDialog,
  DialogType,
} from "../../../../components/ui/ConfirmDialog";
import { CustomHeader } from "../../../../components/ui/CustomHeader";
import { useSnackbar } from "../../../../components/ui/SnackbarContext";
import { useGroup } from "../../../../hooks";
import { widgetsService } from "../../../../services/widgets.service";
import { Widget } from "../../../../types/database";

// ─── Widget Catalog Card ────────────────────────────────────────────────
interface WidgetCatalogCardProps {
  widget: Widget;
  isActive: boolean;
  isToggling: boolean;
  onToggle: () => void;
  index: number;
}

const WidgetCatalogCard = React.memo<WidgetCatalogCardProps>(
  ({ widget, isActive, isToggling, onToggle, index }) => {
    const theme = useTheme();

    return (
      <Animated.View
        entering={FadeInDown.duration(350).delay(80 + index * 60)}
        layout={Layout.springify()}
      >
        <SquircleView
          style={[
            styles.widgetCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: isActive
                ? theme.colors.primary
                : theme.colors.outlineVariant,
              borderWidth: isActive ? 1.5 : 1,
            },
          ]}
          cornerSmoothing={1}
        >
          <View style={styles.widgetCardContent}>
            {/* Icon */}
            <SquircleView
              style={[
                styles.widgetIconContainer,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  borderColor: theme.colors.outlineVariant,
                  borderWidth: 1,
                },
              ]}
              cornerSmoothing={1}
            >
              <Ionicons
                name={
                  (widget.icon as keyof typeof Ionicons.glyphMap) ||
                  "grid-outline"
                }
                size={22}
                color="#FFFFFF"
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
              {widget.subtitle && (
                <Text
                  style={[
                    styles.widgetSubtitle,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                  numberOfLines={1}
                >
                  {widget.subtitle}
                </Text>
              )}
            </View>

            {/* Toggle Button */}
            <TouchableOpacity
              onPress={onToggle}
              disabled={isToggling}
              activeOpacity={0.7}
              style={[
                styles.toggleButton,
                {
                  backgroundColor: isActive
                    ? theme.colors.errorContainer
                    : theme.colors.primaryContainer,
                  borderColor: isActive
                    ? theme.colors.error
                    : theme.colors.primary,
                  borderWidth: 1,
                },
              ]}
            >
              {isToggling ? (
                <ActivityIndicator
                  size={14}
                  color={
                    isActive
                      ? theme.colors.error
                      : theme.colors.primary
                  }
                />
              ) : (
                <>
                  <Ionicons
                    name={isActive ? "remove" : "add"}
                    size={16}
                    color={
                      isActive
                        ? theme.colors.error
                        : theme.colors.onSurfaceVariant
                    }
                  />
                  <Text
                    style={[
                      styles.toggleText,
                      {
                        color: isActive
                          ? theme.colors.error
                          : theme.colors.onSurfaceVariant,
                      },
                    ]}
                  >
                    {isActive ? "Quitar" : "Añadir"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SquircleView>
      </Animated.View>
    );
  }
);

WidgetCatalogCard.displayName = "WidgetCatalogCard";

// ─── Skeleton ───────────────────────────────────────────────────────────
const SkeletonCard = React.memo<{ index: number }>(({ index }) => {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeIn.duration(400).delay(index * 80)}>
      <SquircleView
        style={[
          styles.widgetCard,
          {
            backgroundColor: theme.colors.surfaceVariant,
            borderColor: theme.colors.onSurfaceVariant,
            borderWidth: 1,
            height: 76,
          },
        ]}
        cornerSmoothing={1}
      />
    </Animated.View>
  );
});
SkeletonCard.displayName = "SkeletonCard";

// ─── Main Screen ────────────────────────────────────────────────────────
export default function ExploreWidgetsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();

  const backgroundRef = React.useRef(null);

  const { group, isLoading: isGroupLoading, isAdmin } = useGroup(id);

  const [allWidgets, setAllWidgets] = useState<Widget[]>([]);
  const [activeWidgetIds, setActiveWidgetIds] = useState<Set<string>>(
    new Set()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

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
    onConfirm: () => { },
  });

  const hideDialog = () =>
    setDialogConfig((prev) => ({ ...prev, visible: false }));

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const [widgets, groupWidgets] = await Promise.all([
        widgetsService.getAllWidgets(),
        widgetsService.getGroupWidgetLinks(id),
      ]);

      setAllWidgets(widgets);

      const activeIds = new Set(
        groupWidgets
          .filter((gw) => gw.is_active)
          .map((gw) => gw.widget_id)
      );
      setActiveWidgetIds(activeIds);
    } catch (error) {
      console.error("Error loading widgets catalog:", error);
      showSnackbar("Error al cargar los widgets", "error");
    } finally {
      setIsLoading(false);
    }
  }, [id, showSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toggle widget
  const handleToggle = useCallback(
    async (widget: Widget) => {
      if (!id) return;
      const isCurrentlyActive = activeWidgetIds.has(widget.id);

      if (isCurrentlyActive) {
        // Confirm removal
        setDialogConfig({
          visible: true,
          title: "Quitar Widget",
          message: `¿Quieres quitar "${widget.name}" de este grupo? Los datos asociados no se eliminarán.`,
          type: "warning",
          confirmText: "Quitar",
          cancelText: "Cancelar",
          onConfirm: async () => {
            hideDialog();
            try {
              setTogglingIds((prev) => new Set(prev).add(widget.id));
              await widgetsService.removeWidgetFromGroup(id, widget.id);
              setActiveWidgetIds((prev) => {
                const next = new Set(prev);
                next.delete(widget.id);
                return next;
              });
              showSnackbar(`"${widget.name}" eliminado del grupo`, "success");
            } catch (error) {
              console.error("Error removing widget:", error);
              showSnackbar("Error al quitar el widget", "error");
            } finally {
              setTogglingIds((prev) => {
                const next = new Set(prev);
                next.delete(widget.id);
                return next;
              });
            }
          },
        });
      } else {
        // Add directly
        try {
          setTogglingIds((prev) => new Set(prev).add(widget.id));
          await widgetsService.addWidgetToGroup(id, widget.id);
          setActiveWidgetIds((prev) => new Set(prev).add(widget.id));
          showSnackbar(`"${widget.name}" añadido al grupo`, "success");
        } catch (error) {
          console.error("Error adding widget:", error);
          showSnackbar("Error al añadir el widget", "error");
        } finally {
          setTogglingIds((prev) => {
            const next = new Set(prev);
            next.delete(widget.id);
            return next;
          });
        }
      }
    },
    [id, activeWidgetIds, showSnackbar]
  );

  // Separate active and available widgets
  const { activeWidgets, availableWidgets } = useMemo(() => {
    const active: Widget[] = [];
    const available: Widget[] = [];

    for (const w of allWidgets) {
      if (activeWidgetIds.has(w.id)) {
        active.push(w);
      } else {
        available.push(w);
      }
    }

    return { activeWidgets: active, availableWidgets: available };
  }, [allWidgets, activeWidgetIds]);

  // Access denied
  if (!isGroupLoading && (!group || !isAdmin)) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View
          style={[
            styles.centerContainer,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <SquircleView
            style={[
              styles.lockIconContainer,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
            cornerSmoothing={1}
          >
            <Ionicons
              name="lock-closed-outline"
              size={36}
              color={theme.colors.onSurfaceVariant}
            />
          </SquircleView>
          <Text style={[styles.lockTitle, { color: theme.colors.onSurface }]}>
            Sin acceso
          </Text>
          <Text
            style={[
              styles.lockSubtitle,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            Solo los administradores pueden gestionar widgets.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
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
      </>
    );
  }

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
              Widgets
            </Text>
            <Text
              style={[
                styles.screenSubtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Personaliza tu grupo añadiendo o quitando widgets
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

          {isLoading ? (
            <View style={styles.skeletonContainer}>
              {[0, 1, 2, 3, 4].map((i) => (
                <SkeletonCard key={i} index={i} />
              ))}
            </View>
          ) : (
            <>
              {/* ─── Active Widgets ─── */}
              {activeWidgets.length > 0 && (
                <Animated.View
                  entering={FadeInDown.duration(400).delay(80)}
                  style={styles.section}
                >
                  <View style={styles.sectionHeader}>
                    <SquircleView
                      style={[
                        styles.sectionIconContainer,
                        {
                          backgroundColor: theme.colors.surfaceVariant,
                          borderColor: theme.colors.outlineVariant,
                          borderWidth: 1,
                        },
                      ]}
                      cornerSmoothing={1}
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#FFFFFF"
                      />
                    </SquircleView>
                    <Text
                      style={[
                        styles.sectionTitle,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      Activos ({activeWidgets.length})
                    </Text>
                  </View>

                  <View style={styles.widgetList}>
                    {activeWidgets.map((widget, index) => (
                      <WidgetCatalogCard
                        key={widget.id}
                        widget={widget}
                        isActive={true}
                        isToggling={togglingIds.has(widget.id)}
                        onToggle={() => handleToggle(widget)}
                        index={index}
                      />
                    ))}
                  </View>
                </Animated.View>
              )}

              {/* ─── Available Widgets ─── */}
              {availableWidgets.length > 0 && (
                <Animated.View
                  entering={FadeInDown.duration(400).delay(
                    activeWidgets.length > 0 ? 160 : 80
                  )}
                  style={styles.section}
                >
                  <View style={styles.sectionHeader}>
                    <SquircleView
                      style={[
                        styles.sectionIconContainer,
                        {
                          backgroundColor: theme.colors.surfaceVariant,
                          borderColor: theme.colors.outlineVariant,
                          borderWidth: 1,
                        },
                      ]}
                      cornerSmoothing={1}
                    >
                      <Ionicons
                        name="grid-outline"
                        size={16}
                        color="#FFFFFF"
                      />
                    </SquircleView>
                    <Text
                      style={[
                        styles.sectionTitle,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      Disponibles ({availableWidgets.length})
                    </Text>
                  </View>

                  <View style={styles.widgetList}>
                    {availableWidgets.map((widget, index) => (
                      <WidgetCatalogCard
                        key={widget.id}
                        widget={widget}
                        isActive={false}
                        isToggling={togglingIds.has(widget.id)}
                        onToggle={() => handleToggle(widget)}
                        index={index + activeWidgets.length}
                      />
                    ))}
                  </View>
                </Animated.View>
              )}

              {/* ─── All Active Info Tip ─── */}
              {availableWidgets.length === 0 && activeWidgets.length > 0 && (
                <Animated.View
                  entering={FadeInDown.duration(400).delay(200)}
                >
                  <SquircleView
                    style={[
                      styles.infoCard,
                      {
                        backgroundColor: theme.dark
                          ? "rgba(42,138,112,0.15)"
                          : "rgba(42,138,112,0.08)",
                        borderColor: theme.colors.onSurfaceVariant,
                        borderWidth: 1.5,
                      },
                    ]}
                    cornerSmoothing={1}
                  >
                    <SquircleView
                      style={[
                        styles.infoIconContainer,
                        {
                          backgroundColor: theme.colors.surfaceVariant,
                          borderColor: theme.colors.outlineVariant,
                          borderWidth: 1,
                        },
                      ]}
                      cornerSmoothing={1}
                    >
                      <Ionicons
                        name="sparkles"
                        size={16}
                        color="#FFFFFF"
                      />
                    </SquircleView>
                    <View style={styles.infoTextBlock}>
                      <Text
                        style={[
                          styles.infoTitle,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        ¡Todo activado!
                      </Text>
                      <Text
                        style={[
                          styles.infoDescription,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                      >
                        Tienes todos los widgets disponibles activos en tu
                        grupo. Volveremos con más pronto.
                      </Text>
                    </View>
                  </SquircleView>
                </Animated.View>
              )}
            </>
          )}
        </ScrollView>
      </BlurTargetView>

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

// ─── Styles ─────────────────────────────────────────────────────────────
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

  // Title
  titleBlock: {
    marginTop: 4,
    marginBottom: 4,
  },
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

  // Divider
  divider: {
    height: 1,
    marginTop: 16,
    marginBottom: 24,
  },

  // Sections
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 10,
  },
  sectionIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 16,
    letterSpacing: 0.3,
  },

  // Widget List
  widgetList: {
    gap: 10,
  },

  // Widget Card
  widgetCard: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  widgetCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  widgetIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  widgetInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 12,
  },
  widgetName: {
    fontFamily: "Archivo-Bold",
    fontSize: 15,
  },
  widgetSubtitle: {
    fontFamily: "Archivo-Medium",
    fontSize: 12,
    marginTop: 2,
    letterSpacing: 0.1,
  },

  // Toggle Button
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 80,
    justifyContent: "center",
  },
  toggleText: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 13,
    letterSpacing: 0.2,
  },

  // Skeleton
  skeletonContainer: {
    gap: 10,
  },

  // Info Card
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 22,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  infoTextBlock: {
    flex: 1,
    marginLeft: 14,
  },
  infoTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 13,
  },
  infoDescription: {
    fontFamily: "Archivo-Medium",
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
    letterSpacing: 0.1,
  },

  // Access Denied
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  lockIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  lockTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 20,
    marginBottom: 8,
  },
  lockSubtitle: {
    fontFamily: "Archivo-Medium",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  lockButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  lockButtonText: {
    fontFamily: "Archivo-Bold",
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
