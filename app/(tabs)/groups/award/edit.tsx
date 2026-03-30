import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from "react-native";
import {
    ActivityIndicator,
    Button,
    Surface,
    Text,
    TextInput,
    useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CustomHeader } from "../../../../components/ui/CustomHeader";
import { useSnackbar } from "../../../../components/ui/SnackbarContext";
import { awardIconOptions, defaultAwardIcon, getIconComponent, IconName } from "../../../../constants/icons";
import { awardsService } from "../../../../services";
import { Award } from "../../../../types/database";

export default function EditAwardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  
  const [award, setAward] = useState<Award | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIcon, setSelectedIcon] = useState<IconName>(defaultAwardIcon);
  const [nomineesCanVote, setNomineesCanVote] = useState(false);
  const [allowSelfVote, setAllowSelfVote] = useState(false);
  const [allowVoteChange, setAllowVoteChange] = useState(false);

  const withOpacity = (color: string, opacity: number) => {
    const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
    return color + alpha;
  };

  // Load award data
  useEffect(() => {
    const loadAward = async () => {
      try {
        const data = await awardsService.getAwardById(id);
        if (data) {
          setAward(data);
          setName(data.name);
          setDescription(data.description || "");
          setSelectedIcon((data.icon as IconName) || defaultAwardIcon);
          // Load voting settings
          if (data.voting_settings) {
            setNomineesCanVote(data.voting_settings.nominees_can_vote || false);
            setAllowSelfVote(data.voting_settings.allow_self_vote || false);
            setAllowVoteChange(data.voting_settings.allow_vote_change || false);
          }
        }
      } catch (error) {
        console.error(error);
        showSnackbar("Error al cargar el premio", "error");
      } finally {
        setLoading(false);
      }
    };
    loadAward();
  }, [id, showSnackbar]);

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" />
          <Text variant="bodyMedium" style={{ marginTop: 16, color: theme.colors.onSurfaceVariant }}>
            Cargando...
          </Text>
        </View>
      </View>
    );
  }

  if (!award) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.notFound}>
          <Ionicons name="warning-outline" size={48} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodyLarge" style={{ marginVertical: 16, color: theme.colors.onSurfaceVariant }}>
            Premio no encontrado
          </Text>
          <Button mode="contained" onPress={() => router.back()}>Volver</Button>
        </View>
      </View>
    );
  }

  const handleSave = async () => {
    if (!name.trim()) return;

    try {
      setSaving(true);
      
      await awardsService.updateAward(id, {
        name: name.trim(),
        description: description.trim() || null,
        icon: selectedIcon,
        voting_settings: {
          ...award.voting_settings,
          allow_vote_change: allowVoteChange,
          ...(award.vote_type === 'person' && {
            nominees_can_vote: nomineesCanVote,
            allow_self_vote: nomineesCanVote && allowSelfVote,
          }),
        },
      });
      
      showSnackbar("¡Premio actualizado!", "success");
      router.back();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al actualizar el premio";
      showSnackbar(message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <CustomHeader title="Editar Premio" showBackButton={true} />
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
              {name.trim() || "Nombre del premio"}
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
              {awardIconOptions.map((iconName) => (
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
              label="Nombre del premio"
              placeholder="ej. Mejor Amigo del Año"
              value={name}
              onChangeText={setName}
              mode="outlined"
              maxLength={40}
              style={styles.input}
              outlineStyle={{ borderRadius: 14 }}
              left={<TextInput.Icon icon="trophy" />}
            />

            <TextInput
              label="Descripción (opcional)"
              placeholder="Describe este premio..."
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

          {/* Unified Voting Options Section (At the bottom) */}
          <View style={[styles.section, { marginBottom: 32 }]}>
            <Text variant="titleMedium" style={{ fontWeight: "600", marginBottom: 12 }}>
              Opciones de configuración
            </Text>
            <Surface 
              style={[
                styles.iconGridCard, 
                { 
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.secondaryContainer, 
                  borderWidth: 1,
                  flexDirection: 'column',
                  gap: 0,
                  padding: 4 // Reduced padding
                }
              ]} 
              elevation={1}
            >
              {/* Allow Vote Change Toggle */}
              <TouchableOpacity
                style={[
                  styles.optionRow,
                  { borderBottomWidth: (award.vote_type === 'person' && nomineesCanVote) || (award.vote_type === 'person') ? 1 : 0, borderBottomColor: theme.colors.surfaceVariant }
                ]}
                onPress={() => setAllowVoteChange(!allowVoteChange)}
              >
                <View style={[
                  styles.optionIconContainer,
                  { backgroundColor: allowVoteChange ? theme.colors.primary : theme.colors.surfaceVariant }
                ]}>
                  <Ionicons name="sync" size={18} color={allowVoteChange ? theme.colors.onPrimary : theme.colors.onSurfaceVariant} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text variant="bodyLarge" style={{ fontWeight: allowVoteChange ? '600' : '400', color: theme.colors.onSurface }}>
                    Permitir cambiar el voto
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Los usuarios pueden modificar su voto después
                  </Text>
                </View>
                <Ionicons 
                  name={allowVoteChange ? "checkbox" : "square-outline"} 
                  size={24} 
                  color={allowVoteChange ? theme.colors.primary : theme.colors.onSurfaceVariant} 
                />
              </TouchableOpacity>

              {/* Nominee Voting Toggles - Only for 'person' vote type */}
              {award.vote_type === 'person' && (
                <>
                  <TouchableOpacity
                    style={[
                      styles.optionRow,
                      { borderBottomWidth: allowSelfVote || nomineesCanVote ? 1 : 0, borderBottomColor: theme.colors.surfaceVariant }
                    ]}
                    onPress={() => {
                      setNomineesCanVote(!nomineesCanVote);
                      if (nomineesCanVote) setAllowSelfVote(false);
                    }}
                  >
                    <View style={[
                      styles.optionIconContainer,
                      { backgroundColor: nomineesCanVote ? theme.colors.primary : theme.colors.surfaceVariant }
                    ]}>
                      <Ionicons name="hand-left" size={18} color={nomineesCanVote ? theme.colors.onPrimary : theme.colors.onSurfaceVariant} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text variant="bodyLarge" style={{ fontWeight: nomineesCanVote ? '600' : '400', color: theme.colors.onSurface }}>
                        Los nominados pueden votar
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        Permitir que las personas nominadas voten
                      </Text>
                    </View>
                    <Ionicons 
                      name={nomineesCanVote ? "checkbox" : "square-outline"} 
                      size={24} 
                      color={nomineesCanVote ? theme.colors.primary : theme.colors.onSurfaceVariant} 
                    />
                  </TouchableOpacity>

                  {nomineesCanVote && (
                    <TouchableOpacity
                      style={[styles.optionRow, { borderBottomWidth: 0 }]}
                      onPress={() => setAllowSelfVote(!allowSelfVote)}
                    >
                      <View style={[
                        styles.optionIconContainer,
                        { backgroundColor: allowSelfVote ? theme.colors.primary : theme.colors.surfaceVariant }
                      ]}>
                        <Ionicons name="person" size={18} color={allowSelfVote ? theme.colors.onPrimary : theme.colors.onSurfaceVariant} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text variant="bodyLarge" style={{ fontWeight: allowSelfVote ? '600' : '400', color: theme.colors.onSurface }}>
                          Pueden votarse a sí mismos
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          Permitir que un nominado vote por sí mismo
                        </Text>
                      </View>
                      <Ionicons 
                        name={allowSelfVote ? "checkbox" : "square-outline"} 
                        size={24} 
                        color={allowSelfVote ? theme.colors.primary : theme.colors.onSurfaceVariant} 
                      />
                    </TouchableOpacity>
                  )}
                </>
              )}
            </Surface>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <Surface 
          style={[
            styles.footer, 
            { 
              paddingBottom: 80 + insets.bottom,
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
  footer: {
    padding: 16,
    paddingTop: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  optionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
