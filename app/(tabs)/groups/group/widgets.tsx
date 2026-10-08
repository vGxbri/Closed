/**
 * Gestión de widgets del grupo
 * Activa y personaliza los widgets activos del grupo.
 */
import { Ionicons } from "@expo/vector-icons";
import { BlurTargetView } from "expo-blur";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import SquircleView from "react-native-fast-squircle";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";
import Animated, {
  FadeIn,
  FadeInDown,
  LinearTransition,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { CircleButton } from "@/components/ui/CircleButton";
import { ConfirmDialog, DialogType } from "@/components/ui/ConfirmDialog";
import { CTAButton } from "@/components/ui/CTAButton";
import { useSnackbar } from "@/components/ui/SnackbarContext";
import { StatusView } from "@/components/ui/StatusView";
import { StepTitle } from "@/components/ui/StepTitle";
import {
  getWidgetTone,
  useWidgetTone,
  WidgetWatermark,
} from "@/components/widgets/visuals";
import { useGroup } from "@/hooks";
import { widgetsService } from "@/services/widgets.service";
import { Widget } from "@/types/database";

interface WidgetCatalogCardProps {
  widget: Widget;
  isActive: boolean;
  isToggling: boolean;
  onToggle: () => void;
  index: number;
}

// Misma idea que las tarjetas del inicio del grupo: el icono del widget, en su color, de fondo
const WidgetCatalogCard = React.memo<WidgetCatalogCardProps>(
  ({ widget, isActive, isToggling, onToggle, index }) => {
    const theme = useTheme();
    const tone = getWidgetTone(widget.name);
    // Los hooks no admiten llamadas condicionales: se pide una paleta siempre y se usa solo si hay tono
    const tonePalette = useWidgetTone(tone ?? "green");
    const accent = tone ? tonePalette.accent : theme.colors.primary;

    const actionColor = isActive
      ? theme.colors.onSurface
      : theme.colors.onPrimary;

    return (
      <Animated.View
        entering={FadeInDown.duration(350).delay(80 + index * 60)}
        layout={LinearTransition.springify()}
      >
        <SquircleView
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
          cornerSmoothing={1}
        >
          <WidgetWatermark
            icon={
              (widget.icon as keyof typeof Ionicons.glyphMap) || "grid-outline"
            }
            color={accent}
            size={116}
            style={styles.cardWatermark}
          />

          <View>
            <Text
              style={[styles.cardName, { color: theme.colors.onSurface }]}
              numberOfLines={1}
            >
              {widget.name}
            </Text>
            {!!widget.subtitle && (
              <Text
                style={[
                  styles.cardSubtitle,
                  { color: theme.colors.onSurfaceVariant },
                ]}
                numberOfLines={1}
              >
                {widget.subtitle}
              </Text>
            )}
          </View>

          <Pressable
            onPress={onToggle}
            disabled={isToggling}
            accessibilityRole="button"
            accessibilityLabel={
              isActive ? `Quitar ${widget.name}` : `Añadir ${widget.name}`
            }
            accessibilityState={{ busy: isToggling }}
            hitSlop={8}
            style={({ pressed }) => [
              styles.action,
              {
                backgroundColor: isActive
                  ? theme.dark
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.06)"
                  : theme.colors.primary,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            {isToggling ? (
              <ActivityIndicator size={14} color={actionColor} />
            ) : (
              <>
                <Ionicons
                  name={isActive ? "remove" : "add"}
                  size={16}
                  color={actionColor}
                />
                <Text style={[styles.actionText, { color: actionColor }]}>
                  {isActive ? "Quitar" : "Añadir"}
                </Text>
              </>
            )}
          </Pressable>
        </SquircleView>
      </Animated.View>
    );
  },
);

WidgetCatalogCard.displayName = "WidgetCatalogCard";

const SkeletonCard = React.memo<{ index: number }>(({ index }) => {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeIn.duration(400).delay(index * 80)}>
      <View
        style={[
          styles.card,
          styles.skeletonCard,
          { backgroundColor: theme.colors.surfaceVariant },
        ]}
      />
    </Animated.View>
  );
});
SkeletonCard.displayName = "SkeletonCard";

interface SectionProps {
  title: string;
  count: number;
  delay: number;
  children: React.ReactNode;
}

function Section({ title, count, delay, children }: SectionProps) {
  const theme = useTheme();

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(delay)}
      style={styles.section}
    >
      <View
        accessible
        accessibilityRole="header"
        accessibilityLabel={`${title}, ${count}`}
        style={styles.sectionHeader}
      >
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          {title}
        </Text>
        <Text
          style={[
            styles.sectionCount,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          {count}
        </Text>
      </View>

      <View style={styles.widgetList}>{children}</View>
    </Animated.View>
  );
}

export default function ExploreWidgetsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();

  const backgroundRef = React.useRef(null);

  const { group, isLoading: isGroupLoading, isAdmin } = useGroup(id);

  const canManageWidgets =
    isAdmin || (group?.settings?.allow_member_manage_widgets ?? false);

  const [allWidgets, setAllWidgets] = useState<Widget[]>([]);
  const [activeWidgetIds, setActiveWidgetIds] = useState<Set<string>>(
    new Set(),
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
    onConfirm: () => {},
  });

  const hideDialog = () =>
    setDialogConfig((prev) => ({ ...prev, visible: false }));

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
        groupWidgets.filter((gw) => gw.is_active).map((gw) => gw.widget_id),
      );
      setActiveWidgetIds(activeIds);
    } catch {
      showSnackbar("Error al cargar los widgets", "error");
    } finally {
      setIsLoading(false);
    }
  }, [id, showSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggle = useCallback(
    async (widget: Widget) => {
      if (!id) return;
      const isCurrentlyActive = activeWidgetIds.has(widget.id);

      if (isCurrentlyActive) {
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
            } catch {
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
        try {
          setTogglingIds((prev) => new Set(prev).add(widget.id));
          await widgetsService.addWidgetToGroup(id, widget.id);
          setActiveWidgetIds((prev) => new Set(prev).add(widget.id));
          showSnackbar(`"${widget.name}" añadido al grupo`, "success");
        } catch {
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
    [id, activeWidgetIds, showSnackbar],
  );

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

  if (!isGroupLoading && (!group || !canManageWidgets)) {
    return (
      <StatusView
        icon="lock-closed"
        color={theme.colors.onSurfaceVariant}
        title="Sin acceso"
        message="Solo los administradores pueden gestionar widgets."
        onClose={() => router.back()}
      >
        <CTAButton
          title="Volver"
          iconName="arrow-back"
          onPress={() => router.back()}
        />
      </StatusView>
    );
  }

  return (
    <>
      <BlurTargetView
        ref={backgroundRef}
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
          <View style={styles.topBar}>
            <CircleButton
              icon="close"
              label="Cerrar"
              onPress={() => router.back()}
            />
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: 24 + insets.bottom },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <StepTitle
              main="Explora los"
              accent="widgets"
              subtitle="Añade o quita widgets para organizar el grupo a vuestra manera."
            />

            {isLoading ? (
              <View style={[styles.section, styles.widgetList]}>
                {[0, 1, 2, 3].map((i) => (
                  <SkeletonCard key={i} index={i} />
                ))}
              </View>
            ) : (
              <>
                {activeWidgets.length > 0 && (
                  <Section
                    title="Activos"
                    count={activeWidgets.length}
                    delay={80}
                  >
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
                  </Section>
                )}

                {availableWidgets.length > 0 && (
                  <Section
                    title="Disponibles"
                    count={availableWidgets.length}
                    delay={activeWidgets.length > 0 ? 160 : 80}
                  >
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
                  </Section>
                )}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  content: {
    paddingTop: 0,
  },

  section: {
    paddingHorizontal: 24,
    marginTop: 18,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 17,
  },
  sectionCount: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 15,
  },
  widgetList: {
    gap: 12,
  },

  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    minHeight: 112,
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
    overflow: "hidden",
  },
  // En una tarjeta apaisada el icono se centra en vertical a la derecha
  cardWatermark: {
    top: -4,
    right: -14,
  },
  skeletonCard: {
    borderWidth: 0,
  },
  cardName: {
    fontFamily: "Archivo-Bold",
    fontSize: 18,
    lineHeight: 23,
  },
  cardSubtitle: {
    fontFamily: "Archivo-Medium",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    height: 34,
    minWidth: 96,
    paddingHorizontal: 14,
    borderRadius: 17,
  },
  actionText: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 14,
  },
});
