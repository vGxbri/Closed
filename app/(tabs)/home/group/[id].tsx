import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from "react-native";
import {
    ActivityIndicator,
    Button,
    FAB,
    Surface,
    Text,
    useTheme
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AwardCard } from "../../../../components/AwardCard";
import { InviteModal } from "../../../../components/InviteModal";
import { MemberAvatar } from "../../../../components/MemberAvatar";
import { defaultGroupIcon, getIconComponent, IconName } from "../../../../constants/icons";
import { useAuth, useGroup } from "../../../../hooks";

import { ConfirmDialog, DialogType } from "../../../../components/ui/ConfirmDialog";
import { CustomHeader } from "../../../../components/ui/CustomHeader";
import { MenuOption, OptionsMenu } from "../../../../components/ui/OptionsMenu";
import { useSnackbar } from "../../../../components/ui/SnackbarContext";
import { BlurTargetView } from "expo-blur";

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
    options: []
  });

  const hideDialog = () => setDialogConfig(prev => ({ ...prev, visible: false }));
  const hideOptionsMenu = () => setOptionsMenu(prev => ({ ...prev, visible: false }));

  const backgroundRef = React.useRef(null);

  const { 
    group, 
    isLoading, 
    error, 
    refetch, 
    removeMember,
    updateMemberRole,
    isAdmin, 
    isOwner 
  } = useGroup(id);

  const canCreateAward = isAdmin || group?.settings?.allow_member_nominations;

  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

  const handleCreateAward = () => {
    router.push({
      pathname: "/home/award/create",
      params: { groupId: id }
    });
  };

  const handleInvite = () => {
    setShowInviteModal(true);
  };

  // Loading state
  if (isLoading && !group) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" />
          <Text variant="bodyMedium" style={{ marginTop: 16, color: theme.colors.onSurfaceVariant }}>
            Cargando grupo...
          </Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error || !group) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.notFound}>
          <Ionicons name="warning-outline" size={48} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodyLarge" style={{ marginVertical: 16, color: theme.colors.onSurfaceVariant }}>
            {error ? "Error al cargar el grupo" : "Grupo no encontrado"}
          </Text>
          <Button mode="contained" onPress={() => router.back()}>Volver</Button>
        </View>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <BlurTargetView ref={backgroundRef} style={styles.container}>
      <CustomHeader 
        title={group.name} 
        showBackButton={true}
        rightAction={isAdmin ? (
          <TouchableOpacity 
            onPress={() => router.push({
              pathname: "/home/group/settings",
              params: { id }
            })}
          >
            <Ionicons name="settings-outline" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
        ) : undefined}
      />

      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            styles.content,
            { paddingBottom: 100 + insets.bottom }
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
          {/* Group Header */}
          <View style={styles.header}>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
              {isOwner ? 'Bienvenido a' : 'Miembro de'}
            </Text>
            <View style={styles.headerTitleRow}>
              <Surface style={[styles.groupIconSurface, { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary, borderWidth: 1 }]} elevation={2}>
                {getIconComponent((group.icon as IconName) || defaultGroupIcon, 24, theme.colors.onSurface)}
              </Surface>
              <Text 
                variant="headlineMedium" 
                numberOfLines={1} 
                adjustsFontSizeToFit
                minimumFontScale={0.6}
                style={{ fontWeight: "800", letterSpacing: -0.5, marginLeft: 12, flex: 1 }}
              >
                {group.name}
              </Text>
            </View>
            {group.description && (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                {group.description}
              </Text>
            )}
          </View>

          {/* Separator */}
          <View style={{ height: 1, backgroundColor: theme.colors.surfaceVariant, marginBottom: 24 }} />

          {/* Quick Stats - Compact */}
          <View style={styles.statsRow}>
            <Surface style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.secondaryContainer, borderWidth: 1 }]} elevation={1}>
              <View style={[styles.statIconContainer, { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary, borderWidth: 1 }]}>
                <Ionicons name="people" size={18} color={theme.colors.onSecondaryContainer} />
              </View>
              <View>
                <Text variant="titleLarge" style={{ fontWeight: "800", color: theme.colors.onSurface }}>
                  {group.member_count}
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, fontWeight: "600" }}>
                  {group.member_count === 1 ? 'Miembro' : 'Miembros'}
                </Text>
              </View>
            </Surface>

            <Surface style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.secondaryContainer, borderWidth: 1 }]} elevation={1}>
              <View style={[styles.statIconContainer, { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary, borderWidth: 1 }]}>
                <Ionicons name="trophy" size={18} color={theme.colors.onSecondaryContainer} />
              </View>
              <View>
                <Text variant="titleLarge" style={{ fontWeight: "800", color: theme.colors.onSurface }}>
                  {group.awards?.length || 0}
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, fontWeight: "600" }}>
                  {(group.awards?.length || 0) === 1 ? 'Premio' : 'Premios'}
                </Text>
              </View>
            </Surface>
          </View>

          {/* Members Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="titleLarge" style={{ fontWeight: "700" }}>
                Miembros
              </Text>
              <TouchableOpacity onPress={handleInvite} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontWeight: "600", color: theme.colors.tertiary, marginRight: 4, fontSize: 14 }}>
                  Invitar
                </Text>
                <Ionicons name="person-add" size={14} color={theme.colors.tertiary} />
              </TouchableOpacity>
            </View>

            {group.members.length > 0 ? (
              <Surface style={[styles.membersCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.secondaryContainer, borderWidth: 1 }]} elevation={1}>
                {group.members.slice(0, 6).map((member, index) => {
                  const isMemberOwner = member.role === 'owner';
                  const isMe = user?.id === member.user_id;
                  const canManage = (isOwner || (isAdmin && !isMemberOwner)) && !isMe;
                  const isLast = index === Math.min(5, group.members.length - 1);
                  
                  const showOptions = () => {
                    const actionOptions: { label: string; icon?: keyof typeof Ionicons.glyphMap; action: () => void; isDestructive?: boolean }[] = [];

                    if (canManage) {
                      if (member.role === 'member') {
                        actionOptions.push({
                          label: 'Hacer Administrador',
                          icon: 'shield-checkmark-outline',
                          action: () => {
                            setDialogConfig({
                              visible: true,
                              title: "Hacer Administrador",
                              message: `¿Quieres promover a ${member.display_name} a Administrador?`,
                              confirmText: "Promover",
                              type: "info",
                              onConfirm: async () => {
                                try {
                                  await updateMemberRole(member.user_id, 'admin');
                                  showSnackbar("Miembro promovido a Administrador", "success");
                                } catch {
                                  showSnackbar("Error al actualizar rol", "error");
                                }
                              }
                            });
                          }
                        });
                      } else if (member.role === 'admin') {
                        actionOptions.push({
                          label: 'Quitar Administrador',
                          icon: 'shield-outline',
                          action: () => {
                            setDialogConfig({
                              visible: true,
                              title: "Quitar Administrador",
                              message: `¿Quieres degradar a ${member.display_name} a miembro?`,
                              confirmText: "Degradar",
                              type: "warning",
                              onConfirm: async () => {
                                try {
                                  await updateMemberRole(member.user_id, 'member');
                                  showSnackbar("Administrador degradado a miembro", "success");
                                } catch {
                                  showSnackbar("Error al actualizar rol", "error");
                                }
                              }
                            });
                          }
                        });
                      }
                      
                      actionOptions.push({
                        label: 'Expulsar del grupo',
                        icon: 'person-remove-outline',
                        isDestructive: true,
                        action: () => {
                          setDialogConfig({
                            visible: true,
                            title: "Expulsar miembro",
                            message: `¿Seguro que quieres expulsar a ${member.display_name} del grupo?`,
                            type: "error",
                            confirmText: "Expulsar",
                            onConfirm: async () => {
                              try {
                                await removeMember(member.user_id);
                                showSnackbar("Miembro expulsado", "success");
                              } catch {
                                showSnackbar("No se pudo expulsar al miembro", "error");
                              }
                            }
                          });
                        }
                      });
                    }

                    if (actionOptions.length > 0) {
                      setOptionsMenu({
                        visible: true,
                        title: `Gestionar a ${member.display_name}`,
                        options: actionOptions
                      });
                    }
                  };
                  
                  return (
                    <View 
                      key={member.user_id} 
                      style={[
                        styles.memberRowCompact, 
                        !isLast && { borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceVariant }
                      ]}
                    >
                      <MemberAvatar user={member} size="sm" />
                      <View style={styles.memberInfo}>
                        <Text variant="bodyMedium" style={{ fontWeight: "600", color: theme.colors.onSurface }}>
                          {member.display_name}
                        </Text>
                        <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
                          {member.role === 'owner' ? 'Propietario' : member.role === 'admin' ? 'Admin' : 'Miembro'}
                        </Text>
                      </View>
                      {canManage && (
                        <TouchableOpacity
                          style={styles.optionsButton}
                          onPress={showOptions}
                        >
                          <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.onSurfaceVariant} />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
                
                {group.members.length > 6 && (
                  <TouchableOpacity 
                    style={styles.viewAllButton}
                    onPress={() => {
                      router.push({
                        pathname: "/home/group/members",
                        params: { id }
                      });
                    }}
                  >
                    <Text style={{ color: theme.colors.onSurface, fontWeight: '600', fontSize: 14 }}>
                      Ver lista completa ({group.members.length})
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.onSurface} />
                  </TouchableOpacity>
                )}
              </Surface>
            ) : (
              <Text variant="bodyMedium" style={{ textAlign: "center", color: theme.colors.onSurfaceVariant, padding: 20 }}>
                No hay miembros aún
              </Text>
            )}
          </View>

          {/* Awards Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text variant="titleLarge" style={{ fontWeight: "700" }}>
                  Premios
                </Text>
                {group.awards && group.awards.length > 0 && (
                  <View style={[styles.countBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                      {group.awards.length}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {!group.awards || group.awards.length === 0 ? (
              <Surface 
                style={[
                  styles.emptyCard, 
                  { 
                    backgroundColor: theme.colors.surface, 
                    borderColor: theme.colors.secondaryContainer, 
                    borderWidth: 1 
                  }
                ]} 
                elevation={1}
              >
                <Text variant="titleMedium" style={{ marginTop: 16, fontWeight: "700" }}>
                  Sin premios activos
                </Text>
                <Text 
                  variant="bodyMedium" 
                  style={{ 
                    color: theme.colors.onSurfaceVariant, 
                    marginTop: 8, 
                    textAlign: "center", 
                    maxWidth: 260, 
                    lineHeight: 20 
                  }}
                >
                  {canCreateAward
                    ? "Los premios motivan al equipo. ¡Crea el primero!"
                    : "Aún no se han creado premios en este grupo."}
                </Text>
                {canCreateAward && (
                  <TouchableOpacity 
                    onPress={handleCreateAward}
                    style={[
                      styles.createButton,
                      { 
                        backgroundColor: theme.colors.primaryContainer,
                        borderColor: theme.colors.primary,
                      }
                    ]}
                  >
                    <Text style={{ color: theme.colors.onSurface, fontWeight: '600', marginLeft: 8 }}>
                      + Crear un Premio
                    </Text>
                  </TouchableOpacity>
                )}
              </Surface>
            ) : (
              <View style={{ gap: 12 }}>
                {group.awards.map((award) => (
                  <AwardCard 
                    key={award.id} 
                    award={award}
                    nomineeCount={(award as any).nominee_count}
                    onPress={() => {
                      router.push({
                        pathname: "/home/award/[id]",
                        params: { id: award.id, groupId: id }
                      });
                    }}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* FAB for creators */}
        {canCreateAward && group.awards && group.awards.length > 0 && (
          <FAB
            icon="plus"
            label={Platform.OS === 'ios' ? "Nuevo Premio" : undefined}
            style={[
              styles.fab, 
              { 
                bottom: 24 + insets.bottom,
                backgroundColor: theme.colors.primaryContainer,
                borderColor: theme.colors.primary,
                borderWidth: 1,
              }
            ]}
            color={theme.colors.onPrimaryContainer}
            onPress={handleCreateAward}
          />
        )}

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 0, // Header handles top
    paddingBottom: 100,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  notFound: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  headerButton: {
    padding: 8,
  },
  // Header
  header: {
    marginBottom: 24,
    marginTop: 10,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  groupIconSurface: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  // Stats Row - Compact horizontal
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  membersList: {
    gap: 12,
  },
  membersCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  memberRowCompact: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  optionsButton: {
    padding: 8,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    gap: 4,
  },
  emptyCard: {
    borderRadius: 24,
    padding: 32,
    paddingTop: 16,
    alignItems: "center",
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    position: "absolute",
    right: 20,
    borderRadius: 16,
  },
  countBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  createButton: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
  },
});
