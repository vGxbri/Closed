import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
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
  ActivityIndicator,
  Button,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MemberAvatar } from "../../../../components/MemberAvatar";
import { awardIconOptions, defaultAwardIcon, getIconComponent, IconName } from "../../../../constants/icons";
import { useGroup } from "../../../../hooks";
import { awardsService } from "../../../../services";
import { VoteType } from "../../../../types/database";

import { useSnackbar } from "../../../../components/ui/SnackbarContext";

const VOTE_TYPE_OPTIONS: { value: VoteType; label: string; icon: string }[] = [
  { value: 'person', label: 'Personas', icon: 'people' },
  { value: 'photo', label: 'Fotos', icon: 'image' },
  { value: 'video', label: 'Videos', icon: 'videocam' },
  { value: 'audio', label: 'Audios', icon: 'musical-notes' },
  { value: 'text', label: 'Texto', icon: 'document-text' },
];

export default function CreateAwardScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  
  const { group, isLoading: groupLoading, isAdmin } = useGroup(groupId);
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIcon, setSelectedIcon] = useState<IconName>(defaultAwardIcon);
  const [selectedNominees, setSelectedNominees] = useState<string[]>([]);
  const [selectedVoteType, setSelectedVoteType] = useState<VoteType>('person');
  const [nomineesCanVote, setNomineesCanVote] = useState(false);
  const [allowSelfVote, setAllowSelfVote] = useState(false);
  const [allowVoteChange, setAllowVoteChange] = useState(false);
  const [loading, setLoading] = useState(false);

  const withOpacity = (color: string, opacity: number) => {
    const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
    return color + alpha;
  };

  // Loading state
  if (groupLoading) {
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

  if (!group) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.notFound}>
          <Ionicons name="warning-outline" size={48} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodyLarge" style={{ marginVertical: 16, color: theme.colors.onSurfaceVariant }}>
            Grupo no encontrado
          </Text>
          <Button mode="contained" onPress={() => router.back()}>Volver</Button>
        </View>
      </View>
    );
  }

  // Verificar permisos: solo admins o miembros si allow_member_nominations está activado
  const canCreateAward = isAdmin || group.settings?.allow_member_nominations;
  
  if (!canCreateAward) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.notFound}>
          <Ionicons name="lock-closed-outline" size={48} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodyLarge" style={{ marginVertical: 16, color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
            Solo los administradores pueden crear premios en este grupo
          </Text>
          <Button mode="contained" onPress={() => router.back()}>Volver</Button>
        </View>
      </View>
    );
  }

  const toggleNominee = (userId: string) => {
    setSelectedNominees((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    const needsNominees = selectedVoteType === 'person';
    if (!name.trim() || (needsNominees && selectedNominees.length < 2) || !groupId) return;

    try {
      setLoading(true);
      
      await awardsService.createAward({
        group_id: groupId,
        name: name.trim(),
        description: description.trim() || undefined,
        icon: selectedIcon,
        vote_type: selectedVoteType,
        nominee_ids: needsNominees ? selectedNominees : [],
        voting_settings: {
          allow_vote_change: allowVoteChange,
          ...(needsNominees && {
            nominees_can_vote: nomineesCanVote,
            allow_self_vote: nomineesCanVote && allowSelfVote,
          }),
        },
      });
      
      showSnackbar("¡Premio creado!", "success");
      router.back();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al crear el premio";
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
              numberOfLines={2}
              style={styles.input}
              outlineStyle={{ borderRadius: 14 }}
              left={<TextInput.Icon icon="text" />}
            />
          </View>

          {/* Vote Type Selector */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={{ fontWeight: "600", marginBottom: 12 }}>
              ¿Qué se va a votar?
            </Text>
            <Surface 
              style={[
                styles.voteTypeCard, 
                { 
                  backgroundColor: theme.colors.surface, 
                  borderColor: theme.colors.secondaryContainer, 
                  borderWidth: 1 
                }
              ]} 
              elevation={1}
            >
              {VOTE_TYPE_OPTIONS.map((option, index) => {
                const isSelected = selectedVoteType === option.value;
                const isLast = index === VOTE_TYPE_OPTIONS.length - 1;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.voteTypeRow,
                      isSelected && { backgroundColor: theme.colors.primaryContainer },
                      !isLast && { borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceVariant }
                    ]}
                    onPress={() => setSelectedVoteType(option.value)}
                  >
                    <View style={[
                      styles.voteTypeIconContainer,
                      { 
                        backgroundColor: isSelected ? theme.colors.primary : theme.colors.surfaceVariant,
                      }
                    ]}>
                      <Ionicons
                        name={option.icon as any}
                        size={18}
                        color={isSelected ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
                      />
                    </View>
                    <Text
                      variant="bodyLarge"
                      style={{
                        flex: 1,
                        marginLeft: 14,
                        fontWeight: isSelected ? '600' : '400',
                        color: theme.colors.onSurface
                      }}
                    >
                      {option.label}
                    </Text>
                    <Ionicons 
                      name={isSelected ? "radio-button-on" : "radio-button-off"} 
                      size={22} 
                      color={theme.colors.onPrimaryContainer} 
                    />
                  </TouchableOpacity>
                );
              })}
            </Surface>
          </View>

          {/* Nominees Section - Only show for 'person' vote type */}
          {selectedVoteType === 'person' && (
            <View style={styles.section}>
              <View style={styles.nomineesHeader}>
                <Text variant="titleMedium" style={{ fontWeight: "600" }}>
                  Seleccionar nominados
                </Text>
              </View>
              <View style={styles.nomineesList}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Mínimo 2 nominados requeridos
                </Text>
                <Text variant="labelMedium" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                  {selectedNominees.length} {selectedNominees.length === 1 ? 'seleccionado' : 'seleccionados'}
                </Text>
              </View>
              

              <Surface 
                style={[
                  styles.nomineesCard, 
                  { 
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.secondaryContainer, 
                    borderWidth: 1 
                  }
                ]} 
                elevation={1}
              >
                {group.members.length === 0 ? (
                  <Text variant="bodyMedium" style={{ textAlign: "center", color: theme.colors.onSurfaceVariant, padding: 20 }}>
                    No hay miembros en el grupo
                  </Text>
                ) : (
                  group.members.map((member, index) => {
                    const isSelected = selectedNominees.includes(member.user_id);
                    const isLast = index === group.members.length - 1;
                    return (
                      <TouchableOpacity
                        key={member.user_id}
                        style={[
                          styles.nomineeRow,
                          isSelected && { backgroundColor: theme.colors.primaryContainer },
                          !isSelected && { backgroundColor: theme.colors.surface },
                          !isLast && { borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceVariant }
                        ]}
                        onPress={() => toggleNominee(member.user_id)}
                        activeOpacity={0.7}
                      >
                        <MemberAvatar user={member} size="sm" />
                        <Text variant="bodyMedium" style={{ flex: 1, marginLeft: 12, fontWeight: isSelected ? '600' : '400' }}>
                          {member.display_name}
                        </Text>
                        <Ionicons 
                          name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
                          size={24} 
                          color={theme.colors.onPrimaryContainer} 
                        />
                      </TouchableOpacity>
                    );
                  })
                )}
              </Surface>
            </View>
          )}

          {/* Info for non-person vote types */}
          {selectedVoteType !== 'person' && (
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
              <Ionicons name="information-circle" size={20} color={theme.colors.onSurface} />
              <Text variant="bodyMedium" style={{ marginLeft: 12, flex: 1, color: theme.colors.onSurface }}>
                Podrás subir {selectedVoteType === 'photo' ? 'fotos' : selectedVoteType === 'video' ? 'videos' : selectedVoteType === 'audio' ? 'audios' : 'textos'} antes de comenzar la votación.
              </Text>
            </Surface>
          )}

          {/* Unified Voting Options Section (At the bottom) */}
          <View style={[styles.section, { marginBottom: 32 }]}>
            <Text variant="titleMedium" style={{ fontWeight: "600", marginBottom: 12 }}>
              Opciones de configuración
            </Text>
            <Surface 
              style={[
                styles.nomineesCard, 
                { 
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.secondaryContainer, 
                  borderWidth: 1,
                  padding: 4 // Reduced padding for better list appearance
                }
              ]} 
              elevation={1}
            >
              {/* Allow Vote Change Toggle */}
              <TouchableOpacity
                style={[
                  styles.voteTypeRow,
                  { borderBottomWidth: (selectedVoteType === 'person' && nomineesCanVote) || (selectedVoteType === 'person') ? 1 : 0, borderBottomColor: theme.colors.surfaceVariant }
                ]}
                onPress={() => setAllowVoteChange(!allowVoteChange)}
              >
                <View style={[
                  styles.voteTypeIconContainer,
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
              {selectedVoteType === 'person' && (
                <>
                  <TouchableOpacity
                    style={[
                      styles.voteTypeRow,
                      { borderBottomWidth: allowSelfVote || nomineesCanVote ? 1 : 0, borderBottomColor: theme.colors.surfaceVariant }
                    ]}
                    onPress={() => {
                      setNomineesCanVote(!nomineesCanVote);
                      if (nomineesCanVote) setAllowSelfVote(false);
                    }}
                  >
                    <View style={[
                      styles.voteTypeIconContainer,
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
                      style={[styles.voteTypeRow, { borderBottomWidth: 0 }]}
                      onPress={() => setAllowSelfVote(!allowSelfVote)}
                    >
                      <View style={[
                        styles.voteTypeIconContainer,
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
            disabled={!name.trim() || (selectedVoteType === 'person' && selectedNominees.length < 2) || loading}
            style={{ borderRadius: 14 }}
            contentStyle={{ 
              backgroundColor: theme.colors.primaryContainer, 
              paddingVertical: 6,
              borderColor: theme.colors.primary, 
              borderWidth: 1, 
              borderRadius: 16
            }}
          >
            Crear Premio
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    alignItems: 'center',
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
  voteTypeCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  voteTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  voteTypeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nomineesCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  nomineesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nomineesList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nomineeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  footer: {
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  }
});


