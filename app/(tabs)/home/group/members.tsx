import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import {
  ActivityIndicator,
  Surface,
  Text,
  useTheme
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MemberAvatar } from "../../../../components/MemberAvatar";
import { ConfirmDialog, DialogType } from "../../../../components/ui/ConfirmDialog";
import { CustomHeader } from "../../../../components/ui/CustomHeader";
import { MenuOption, OptionsMenu } from "../../../../components/ui/OptionsMenu";
import { useSnackbar } from "../../../../components/ui/SnackbarContext";
import { useAuth, useGroup } from "../../../../hooks";

export default function GroupMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const { user } = useAuth();

  const [dialogConfig, setDialogConfig] = React.useState<{
    visible: boolean;
    title: string;
    message: string;
    type: DialogType;
    confirmText?: string;
    onConfirm: () => void;
  }>({
    visible: false,
    title: "",
    message: "",
    type: "info",
    onConfirm: () => {},
  });

  const [optionsMenu, setOptionsMenu] = React.useState<{
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

  const { 
    group, 
    isLoading, 
    removeMember,
    updateMemberRole,
    isAdmin, 
    isOwner 
  } = useGroup(id);

  if (isLoading || !group) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" />
          <Text variant="bodyMedium" style={{ marginTop: 16, color: theme.colors.onSurfaceVariant }}>
            Cargando miembros...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <CustomHeader title={`Miembros (${group.members.length})`} showBackButton={true} />

      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: 24 + insets.bottom }
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Surface style={[styles.membersCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.secondaryContainer, borderWidth: 1 }]} elevation={1}>
            {group.members.map((member, index) => {
              const isMemberOwner = member.role === 'owner';
              const isMe = user?.id === member.user_id;
              
              // Reglas de permisos:
              // 1. Owner puede gestionar a todos (menos a sí mismo)
              // 2. Admin puede gestionar a otros admins y miembros
              // 3. Nadie puede gestionar al Owner
              // 4. Uno no puede gestionarse a sí mismo
              const canManage = (isOwner || (isAdmin && !isMemberOwner)) && !isMe;
              
              const showOptions = () => {
                const actionOptions: MenuOption[] = [];

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

              const isLast = index === group.members.length - 1;
              
              return (
                <View 
                  key={member.user_id} 
                  style={[
                    styles.memberRow, 
                    !isLast && { borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceVariant }
                  ]}
                >
                  <MemberAvatar user={member} size="md" />
                  <View style={styles.memberInfo}>
                    <Text variant="bodyLarge" style={{ fontWeight: "600", color: theme.colors.onSurface }}>
                      {member.display_name} {isMe ? "(Tú)" : ""}
                    </Text>
                    <Text variant="labelMedium" style={{ color: theme.colors.primary, marginTop: 2 }}>
                      {member.role === 'owner' ? 'Propietario' : member.role === 'admin' ? 'Administrador' : 'Miembro'}
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
          </Surface>
        </ScrollView>
      </View>

      <ConfirmDialog
        visible={dialogConfig.visible}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        confirmText={dialogConfig.confirmText}
        onConfirm={dialogConfig.onConfirm}
        onCancel={hideDialog}
        showCancel={true}
      />

      <OptionsMenu
        visible={optionsMenu.visible}
        title={optionsMenu.title}
        options={optionsMenu.options}
        onDismiss={hideOptionsMenu}
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
    paddingTop: 0,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  membersCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 14,
  },
  kickButton: {
    padding: 8,
  },
  optionsButton: {
    padding: 8,
  },
});
