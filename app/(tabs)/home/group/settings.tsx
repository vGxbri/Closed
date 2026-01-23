import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import {
    ActivityIndicator,
    Button,
    Surface,
    Switch,
    Text,
    TextInput,
    useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { defaultGroupIcon, getIconComponent, groupIconOptions, IconName } from "../../../../constants/icons";
import { useGroup } from "../../../../hooks";

import { ConfirmDialog, DialogType } from "../../../../components/ui/ConfirmDialog";
import { CustomHeader } from "../../../../components/ui/CustomHeader";
import { useSnackbar } from "../../../../components/ui/SnackbarContext";

export default function GroupSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  
  const { 
    group, 
    isLoading, 
    updateGroup, 
    deleteGroup, 
    isAdmin, 
    isOwner 
  } = useGroup(id);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState<IconName>(defaultGroupIcon);
  
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

  const hideDialog = () => setDialogConfig(prev => ({ ...prev, visible: false }));
  
  // Settings
  const [allowMemberNominations, setAllowMemberNominations] = useState(false);
  const [allowMemberVoting, setAllowMemberVoting] = useState(true);

  const [saving, setSaving] = useState(false);

  const withOpacity = (color: string, opacity: number) => {
    const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
    return color + alpha;
  };

  useEffect(() => {
    if (group) {
      setName(group.name);
      setDescription(group.description || "");
      setIcon((group.icon as IconName) || defaultGroupIcon);
      setAllowMemberNominations(group.settings.allow_member_nominations);
      setAllowMemberVoting(group.settings.allow_member_voting);
    }
  }, [group]);

  const handleSave = async () => {
    if (!name.trim()) {
      showSnackbar("El nombre del grupo es obligatorio", "error");
      return;
    }

    try {
      setSaving(true);
      await updateGroup({
        name: name.trim(),
        description: description.trim() || null,
        icon,
        settings: {
          ...group?.settings, // Keep other settings like max_members
          allow_member_nominations: allowMemberNominations,
          allow_member_voting: allowMemberVoting,
        }
      });
      showSnackbar("Grupo actualizado correctamente", "success");
      router.back();
    } catch (error: any) {
      showSnackbar(error.message || "No se pudo actualizar el grupo", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    setDialogConfig({
      visible: true,
      title: "Eliminar Grupo",
      message: "¿Estás seguro? Esta acción eliminará el grupo y todos sus datos permanentemente.",
      type: "error",
      confirmText: "Eliminar",
      onConfirm: async () => {
        try {
          setSaving(true);
          await deleteGroup();
          router.dismissAll();
          router.replace("/(tabs)/home");
        } catch {
          setSaving(false);
          showSnackbar("No se pudo eliminar el grupo", "error");
        }
      }
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
        <Text variant="bodyMedium" style={{ marginTop: 16, color: theme.colors.onSurfaceVariant }}>
          Cargando...
        </Text>
      </View>
    );
  }

  if (!group || !isAdmin) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <Ionicons name="lock-closed-outline" size={48} color={theme.colors.onSurfaceVariant} />
        <Text variant="bodyLarge" style={{ marginVertical: 16, color: theme.colors.onSurfaceVariant }}>
          No tienes permisos para ver esta pantalla
        </Text>
        <Button mode="contained" onPress={() => router.back()}>Volver</Button>
      </View>
    );
  }

  const SETTINGS_OPTIONS = [
    {
      key: 'nominations',
      icon: 'trophy-outline',
      title: 'Permitir crear premios',
      description: 'Los miembros no administradores pueden crear premios',
      value: allowMemberNominations,
      onChange: setAllowMemberNominations,
    },
    {
      key: 'voting',
      icon: 'checkmark-circle-outline',
      title: 'Permitir votación',
      description: 'Los miembros pueden votar en premios',
      value: allowMemberVoting,
      onChange: setAllowMemberVoting,
    },
  ];

  return (
    <>
      <CustomHeader title="Ajustes del Grupo" showBackButton={true} />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Preview Card */}
            <Surface 
              style={[
                styles.previewCard, 
                { 
                  backgroundColor: theme.colors.surface, 
                  borderColor: theme.colors.secondaryContainer, 
                  borderWidth: 1 
                }
              ]} 
              elevation={1}
            >
              <View style={[styles.previewIconContainer, { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary, borderWidth: 1 }]}>
                {getIconComponent(icon, 32, theme.colors.onSurface)}
              </View>
              <Text variant="titleLarge" style={{ fontWeight: "700", marginTop: 12, textAlign: 'center' }}>
                {name.trim() || "Nombre del grupo"}
              </Text>
              {description.trim() ? (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, textAlign: 'center' }}>
                  {description}
                </Text>
              ) : null}
            </Surface>

            {/* Icon Selector */}
            <View style={styles.section}>
              <Text variant="titleMedium" style={{ fontWeight: "600", marginBottom: 12 }}>
                Elige un icono
              </Text>
              <Surface 
                style={[
                  styles.iconGridCard, 
                  { 
                    backgroundColor: theme.colors.surface, 
                    borderColor: theme.colors.secondaryContainer, 
                    borderWidth: 1 
                  }
                ]} 
                elevation={1}
              >
                {groupIconOptions.map((iconName) => (
                  <TouchableOpacity
                    key={iconName}
                    style={[
                      styles.iconButton,
                      { 
                        backgroundColor: icon === iconName 
                          ? theme.colors.primaryContainer 
                          : 'transparent',
                        borderColor: icon === iconName 
                          ? theme.colors.primary 
                          : theme.colors.outlineVariant,
                      },
                    ]}
                    onPress={() => setIcon(iconName)}
                  >
                    {getIconComponent(
                      iconName, 
                      24, 
                      icon === iconName 
                        ? theme.colors.onSurface 
                        : withOpacity(theme.colors.onSurfaceVariant, 0.4)
                    )}
                  </TouchableOpacity>
                ))}
              </Surface>
            </View>

            {/* Form Fields */}
            <View style={styles.section}>
              <Text variant="titleMedium" style={{ fontWeight: "600", marginBottom: 12 }}>
                Detalles
              </Text>
              
              <TextInput
                label="Nombre del grupo"
                placeholder="ej. Los Cracks"
                value={name}
                onChangeText={setName}
                mode="outlined"
                maxLength={30}
                style={styles.input}
                outlineStyle={{ borderRadius: 14 }}
                left={<TextInput.Icon icon="account-group" />}
              />

              <TextInput
                label="Descripción (opcional)"
                placeholder="Describe tu grupo..."
                value={description}
                onChangeText={setDescription}
                mode="outlined"
                multiline
                numberOfLines={2}
                style={styles.input}
                outlineStyle={{ borderRadius: 14 }}
                left={<TextInput.Icon icon="text" />}
              />
            </View>

            {/* Permissions Section */}
            <View style={styles.section}>
              <Text variant="titleMedium" style={{ fontWeight: "600", marginBottom: 12 }}>
                Permisos
              </Text>
              <Surface 
                style={[
                  styles.settingsCard, 
                  { 
                    backgroundColor: theme.colors.surface, 
                    borderColor: theme.colors.secondaryContainer, 
                    borderWidth: 1 
                  }
                ]} 
                elevation={1}
              >
                {SETTINGS_OPTIONS.map((option, index) => {
                  const isLast = index === SETTINGS_OPTIONS.length - 1;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.settingRow,
                        !isLast && { borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceVariant }
                      ]}
                      onPress={() => option.onChange(!option.value)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.settingIconContainer,
                        { backgroundColor: theme.colors.primaryContainer }
                      ]}>
                        <Ionicons
                          name={option.icon as any}
                          size={18}
                          color={theme.colors.onPrimaryContainer}
                        />
                      </View>
                      <View style={styles.settingInfo}>
                        <Text variant="bodyLarge" style={{ fontWeight: '500' }}>
                          {option.title}
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {option.description}
                        </Text>
                      </View>
                      <Switch
                        value={option.value}
                        onValueChange={option.onChange}
                      />
                    </TouchableOpacity>
                  );
                })}
              </Surface>
            </View>

            {/* Danger Zone */}
            {isOwner && (
              <View style={styles.section}>
                <Text variant="titleMedium" style={{ fontWeight: "600", marginBottom: 12, color: theme.colors.error }}>
                  Zona de Peligro
                </Text>
                <Surface 
                  style={[
                    styles.dangerCard, 
                    { 
                      backgroundColor: theme.colors.errorContainer, 
                      borderColor: theme.colors.error, 
                      borderWidth: 1 
                    }
                  ]} 
                  elevation={0}
                >
                  <View style={styles.dangerContent}>
                    <Ionicons name="warning-outline" size={24} color={theme.colors.error} />
                    <View style={styles.dangerInfo}>
                      <Text variant="bodyLarge" style={{ fontWeight: '500', color: theme.colors.onSurface }}>
                        Eliminar grupo
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>
                        Esta acción es irreversible
                      </Text>
                    </View>
                  </View>
                  <Button
                    mode="contained"
                    onPress={handleDelete}
                    loading={saving}
                    buttonColor={theme.colors.error}
                    textColor={theme.colors.onSurface}
                    style={{ borderRadius: 12, backgroundColor: theme.colors.errorContainer, borderColor: theme.colors.error, borderWidth: 1 }}
                    contentStyle={{ paddingVertical: 4 }}
                  >
                    Eliminar
                  </Button>
                </Surface>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <Surface 
            style={[
              styles.footer, 
              { 
                paddingBottom: 8 + insets.bottom,
                backgroundColor: theme.colors.surface,
                borderTopEndRadius: 16,
                borderTopStartRadius: 16,
              }
            ]} 
            elevation={0}
          >
            <Button
              mode="contained"
              onPress={handleSave}
              loading={saving}
              disabled={!name.trim() || saving}
              style={{ borderRadius: 14 }}
              contentStyle={{ 
                backgroundColor: theme.colors.primaryContainer, 
                paddingVertical: 6,
                borderColor: theme.colors.primary, 
                borderWidth: 1, 
                borderRadius: 16
              }}
            >
              Guardar Cambios
            </Button>
          </Surface>
        </KeyboardAvoidingView>
      </View>
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
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  previewCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    marginBottom: 24,
  },
  previewIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: 24,
  },
  iconGridCard: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    padding: 16,
    borderRadius: 16,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  input: {
    marginBottom: 12,
  },
  settingsCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  settingInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 12,
  },
  dangerCard: {
    borderRadius: 16,
    padding: 16,
  },
  dangerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dangerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  footer: {
    padding: 16,
    paddingTop: 16,
  },
});
