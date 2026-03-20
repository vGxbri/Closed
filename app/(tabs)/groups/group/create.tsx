import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import {
  Button,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { defaultGroupIcon, getIconComponent, groupIconOptions, IconName } from "../../../../constants/icons";
import { groupsService } from "../../../../services";

import { useSnackbar } from "../../../../components/ui/SnackbarContext";

export default function CreateGroupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIcon, setSelectedIcon] = useState<IconName>(defaultGroupIcon);
  const [loading, setLoading] = useState(false);

  const withOpacity = (color: string, opacity: number) => {
    const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
    return color + alpha;
  };

  const handleCreate = async () => {
    if (!name.trim()) return;

    try {
      setLoading(true);
      
      const newGroup = await groupsService.createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
        icon: selectedIcon,
      });
      
      showSnackbar("¡Grupo creado!", "success");
      router.replace({
        pathname: "/home/group/[id]",
        params: { id: newGroup.id }
      });
    } catch (err) {
      console.error("Error creating group:", err);
      const message = err instanceof Error ? err.message : "Error al crear el grupo";
      showSnackbar(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
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
              {getIconComponent(selectedIcon, 32, theme.colors.onSurface)}
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
                      backgroundColor: selectedIcon === iconName 
                        ? theme.colors.primaryContainer 
                        : 'transparent',
                      borderColor: selectedIcon === iconName 
                        ? theme.colors.primary 
                        : theme.colors.outlineVariant,
                    },
                  ]}
                  onPress={() => setSelectedIcon(iconName)}
                >
                  {getIconComponent(
                    iconName, 
                    24, 
                    selectedIcon === iconName 
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
              numberOfLines={3}
              style={styles.input}
              outlineStyle={{ borderRadius: 14 }}
              left={<TextInput.Icon icon="text" />}
            />
          </View>

          {/* Info Tip */}
          <Surface 
            style={[
              styles.infoCard, 
              { 
                backgroundColor: theme.colors.primaryContainer, 
                borderColor: theme.colors.primary, 
                borderWidth: 1 
              }
            ]} 
            elevation={0}
          >
            <Ionicons name="briefcase" size={20} color={theme.colors.onSurface} />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, flex: 1, marginLeft: 12 }}>
              Serás el propietario del grupo y podrás invitar a tus amigos.
            </Text>
          </Surface>
        </ScrollView>

        {/* Submit Button */}
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
            onPress={handleCreate}
            loading={loading}
            disabled={!name.trim() || loading}
            style={{ borderRadius: 14 }}
            contentStyle={{ 
              backgroundColor: theme.colors.primaryContainer, paddingVertical: 6,
              borderColor: theme.colors.primary, borderWidth: 1, borderRadius: 16
            }}
          >
            Crear Grupo
          </Button>
        </Surface>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
  },
  footer: {
    padding: 16,
    paddingTop: 16,
  },
});
