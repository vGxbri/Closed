/**
 * Lista de grupos del usuario
 * Muestra los grupos privados con acceso a crear, unirse o abrir cada uno.
 */
import { Ionicons } from "@expo/vector-icons";
import { BlurTargetView } from "expo-blur";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { GroupCover } from "@/components/ui/GroupCover";
import { MenuOption, OptionsMenu } from "@/components/ui/OptionsMenu";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useAuth, useGroups } from "@/hooks";
import { GroupWithDetails } from "@/types/database";

const CARD_GAP = 14;
const COVER_HEIGHT = 124;
const MAX_FACES = 4;

// En iOS la cabecera es la nativa del sistema (Liquid Glass en iOS 26+).
const isIOS = Platform.OS === "ios";

interface SkeletonCardProps {
  index: number;
}

const SkeletonCard = React.memo<SkeletonCardProps>(({ index }) => {
  const theme = useTheme();
  const barColor = theme.dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  return (
    <Animated.View
      entering={FadeIn.duration(400).delay(index * 80)}
      style={styles.bentoItem}
    >
      <SquircleView
        style={[
          styles.groupCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
            borderWidth: 1,
          },
        ]}
        cornerSmoothing={1}
      >
        <View
          style={[
            styles.cover,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        />
        <View style={styles.cardFooter}>
          <View style={styles.groupInfo}>
            <View
              style={[styles.skeletonTextLong, { backgroundColor: barColor }]}
            />
            <View
              style={[styles.skeletonTextShort, { backgroundColor: barColor }]}
            />
          </View>
        </View>
      </SquircleView>
    </Animated.View>
  );
});

SkeletonCard.displayName = "SkeletonCard";

interface GroupCardItemProps {
  group: GroupWithDetails;
  index: number;
  onPress: () => void;
}

const GroupCardItem = React.memo<GroupCardItemProps>(
  ({ group, index, onPress }) => {
    const theme = useTheme();
    const faces = group.members.slice(0, MAX_FACES);

    return (
      <Animated.View
        entering={FadeInDown.duration(400).delay(100 + index * 80)}
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
              styles.groupCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
                borderWidth: 1,
              },
            ]}
            cornerSmoothing={1}
          >
            <View>
              <GroupCover
                uri={group.cover_image_url}
                name={group.name}
                style={styles.cover}
              />

              {group.my_role && group.my_role !== "member" && (
                <View
                  style={[
                    styles.roleBadge,
                    { backgroundColor: theme.colors.surface },
                  ]}
                >
                  <Text
                    style={[
                      styles.roleBadgeText,
                      { color: theme.colors.primary },
                    ]}
                  >
                    {group.my_role === "owner"
                      ? "Propietario"
                      : "Administrador"}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.groupInfo}>
                <Text
                  style={[styles.groupName, { color: theme.colors.onSurface }]}
                  numberOfLines={1}
                >
                  {group.name}
                </Text>
                <Text
                  style={[
                    styles.metaText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {group.member_count} miembro
                  {group.member_count !== 1 ? "s" : ""}
                </Text>
              </View>

              <View style={styles.faces}>
                {faces.map((member, i) => (
                  <View
                    key={member.id}
                    style={[
                      styles.face,
                      { borderColor: theme.colors.surface },
                      i > 0 && styles.faceOverlap,
                    ]}
                  >
                    <UserAvatar
                      uri={member.group_avatar_url ?? member.avatar_url}
                      name={member.group_display_name ?? member.display_name}
                      size={26}
                      borderRadius={13}
                    />
                  </View>
                ))}
              </View>
            </View>
          </SquircleView>
        </Pressable>
      </Animated.View>
    );
  },
);

GroupCardItem.displayName = "GroupCardItem";

export default function GroupsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { groups, isLoading, refetch } = useGroups();
  const backgroundRef = useRef(null);
  const { signOut } = useAuth();

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [menu, setMenu] = useState<{
    visible: boolean;
    title: string;
    options: MenuOption[];
  }>({ visible: false, title: "", options: [] });

  const handleGroupPress = useCallback(
    (groupId: string) => {
      router.push({ pathname: "/groups/group/[id]", params: { id: groupId } });
    },
    [router],
  );

  const handleCreateGroup = useCallback(
    () => router.push("/createGroup" as any),
    [router],
  );

  const handleJoinGroup = useCallback(
    () => router.push("/join/joinGroup" as any),
    [router],
  );

  const openAddMenu = () =>
    setMenu({
      visible: true,
      title: "Añadir grupo",
      options: [
        { label: "Crear grupo", icon: "add", action: handleCreateGroup },
        {
          label: "Unirse con código",
          icon: "qr-code-outline",
          action: handleJoinGroup,
        },
      ],
    });

  const openMoreMenu = () =>
    setMenu({
      visible: true,
      title: "Opciones",
      options: [
        {
          label: "Cerrar sesión",
          icon: "log-out-outline",
          action: () => setShowSignOutDialog(true),
          isDestructive: true,
        },
      ],
    });

  const subtitle = isLoading
    ? "Cargando..."
    : `${groups.length} grupo${groups.length !== 1 ? "s" : ""}`;

  const skeletonCards = useMemo(
    () =>
      Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={`skeleton-${i}`} index={i} />
      )),
    [],
  );

  return (
    <BlurTargetView ref={backgroundRef} style={{ flex: 1 }}>
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
        edges={isIOS ? ["left", "right"] : ["top", "left", "right"]}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isIOS && styles.scrollContentNativeHeader,
          ]}
          contentInsetAdjustmentBehavior={isIOS ? "automatic" : undefined}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {isIOS ? (
            <Text
              style={[
                styles.subtitle,
                styles.subtitleNativeHeader,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {subtitle}
            </Text>
          ) : (
            <>
              <Animated.View
                entering={FadeInUp.duration(500)}
                style={styles.header}
              >
                <View>
                  <Text style={[styles.title, { color: theme.colors.primary }]}>
                    Tus Grupos
                  </Text>
                  <Text
                    style={[
                      styles.subtitle,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {subtitle}
                  </Text>
                </View>

                <View style={styles.headerActions}>
                  <Pressable
                    onPress={openAddMenu}
                    accessibilityRole="button"
                    accessibilityLabel="Añadir grupo"
                    style={({ pressed }) => [
                      {
                        opacity: pressed ? 0.7 : 1,
                        transform: [{ scale: pressed ? 0.92 : 1 }],
                      },
                    ]}
                  >
                    <SquircleView
                      style={[
                        styles.headerButton,
                        {
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.outlineVariant,
                          borderWidth: 1,
                        },
                      ]}
                      cornerSmoothing={1}
                    >
                      <Ionicons
                        name="add"
                        size={22}
                        color={theme.colors.onSurfaceVariant}
                      />
                    </SquircleView>
                  </Pressable>

                  <Pressable
                    onPress={openMoreMenu}
                    accessibilityRole="button"
                    accessibilityLabel="Más opciones"
                    style={({ pressed }) => [
                      {
                        opacity: pressed ? 0.7 : 1,
                        transform: [{ scale: pressed ? 0.92 : 1 }],
                      },
                    ]}
                  >
                    <SquircleView
                      style={[
                        styles.headerButton,
                        {
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.outlineVariant,
                          borderWidth: 1,
                        },
                      ]}
                      cornerSmoothing={1}
                    >
                      <Ionicons
                        name="ellipsis-horizontal"
                        size={20}
                        color={theme.colors.onSurfaceVariant}
                      />
                    </SquircleView>
                  </Pressable>
                </View>
              </Animated.View>

              <Animated.View
                entering={FadeIn.duration(400).delay(100)}
                style={[
                  styles.divider,
                  { backgroundColor: theme.colors.outlineVariant },
                ]}
              />
            </>
          )}

          {isLoading && groups.length === 0 ? (
            <View style={styles.bentoGrid}>{skeletonCards}</View>
          ) : groups.length === 0 ? (
            <Animated.View
              entering={FadeInDown.duration(500).delay(150)}
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
                    name="people-outline"
                    size={36}
                    color={theme.colors.primary}
                  />
                </SquircleView>

                <Text
                  style={[styles.emptyTitle, { color: theme.colors.onSurface }]}
                >
                  Comienza tu legado
                </Text>
                <Text
                  style={[
                    styles.emptySubtitle,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Crea un grupo para empezar a nominar y premiar a tus amigos.
                </Text>

                <Pressable
                  onPress={handleCreateGroup}
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
                      Crear un grupo
                    </Text>
                  </SquircleView>
                </Pressable>
              </SquircleView>
            </Animated.View>
          ) : (
            <View style={styles.bentoGrid}>
              {groups.map((group, index) => (
                <GroupCardItem
                  key={group.id}
                  group={group}
                  index={index}
                  onPress={() => handleGroupPress(group.id)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {isIOS && (
        <>
          <Stack.Screen
            options={{
              headerShown: true,
              headerTransparent: true,
              headerStyle: { backgroundColor: "transparent" },
              headerShadowVisible: false,
            }}
          />
          <Stack.Title
            large
            style={{
              fontFamily: "InstrumentSerif-Italic",
              fontSize: 22,
              color: theme.colors.primary,
            }}
            largeStyle={{
              fontFamily: "InstrumentSerif-Italic",
              fontSize: 38,
              color: theme.colors.primary,
            }}
          >
            Tus Grupos
          </Stack.Title>
          <Stack.Toolbar placement="right">
            <Stack.Toolbar.Menu icon="plus" accessibilityLabel="Añadir grupo">
              <Stack.Toolbar.MenuAction
                icon="plus.circle"
                onPress={handleCreateGroup}
              >
                Crear grupo
              </Stack.Toolbar.MenuAction>
              <Stack.Toolbar.MenuAction icon="qrcode" onPress={handleJoinGroup}>
                Unirse con código
              </Stack.Toolbar.MenuAction>
            </Stack.Toolbar.Menu>
            <Stack.Toolbar.Menu
              icon="ellipsis"
              accessibilityLabel="Más opciones"
            >
              <Stack.Toolbar.MenuAction
                icon="rectangle.portrait.and.arrow.right"
                destructive
                onPress={() => setShowSignOutDialog(true)}
              >
                Cerrar sesión
              </Stack.Toolbar.MenuAction>
            </Stack.Toolbar.Menu>
          </Stack.Toolbar>
        </>
      )}

      {!isIOS && (
        <OptionsMenu
          visible={menu.visible}
          title={menu.title}
          options={menu.options}
          onDismiss={() => setMenu((prev) => ({ ...prev, visible: false }))}
          blurTarget={backgroundRef}
        />
      )}

      <ConfirmDialog
        visible={showSignOutDialog}
        title="¿Cerrar sesión?"
        message="Tendrás que volver a iniciar sesión para acceder a tus grupos."
        type="error"
        confirmText="Cerrar sesión"
        cancelText="Cancelar"
        onConfirm={() => signOut()}
        onCancel={() => setShowSignOutDialog(false)}
        blurTargetRef={backgroundRef}
      />
    </BlurTargetView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFill,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 120,
  },
  scrollContentNativeHeader: {
    paddingTop: 0,
  },
  subtitleNativeHeader: {
    marginTop: 0,
    marginBottom: 16,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 38,
    letterSpacing: 0.5,
    lineHeight: 44,
  },
  subtitle: {
    fontFamily: "Archivo-Medium",
    fontSize: 14,
    letterSpacing: 0.3,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  divider: {
    height: 1,
    marginTop: 16,
    marginBottom: 20,
  },

  bentoGrid: {
    flexDirection: "column",
    gap: CARD_GAP,
  },
  bentoItem: {
    width: "100%",
  },

  groupCard: {
    borderRadius: 22,
    overflow: "hidden",
  },
  cover: {
    height: COVER_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontFamily: "Archivo-Bold",
    fontSize: 16,
    lineHeight: 21,
    marginBottom: 2,
  },
  metaText: {
    fontFamily: "Archivo-Medium",
    fontSize: 12,
  },
  faces: {
    flexDirection: "row",
    alignItems: "center",
  },
  face: {
    borderRadius: 15,
    borderWidth: 2,
  },
  faceOverlap: {
    marginLeft: -9,
  },
  roleBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontFamily: "Archivo-Bold",
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  emptyContainer: {
    marginTop: 20,
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

  skeletonTextLong: {
    height: 14,
    borderRadius: 7,
    width: "60%",
    marginBottom: 8,
  },
  skeletonTextShort: {
    height: 11,
    borderRadius: 6,
    width: "35%",
  },
});
