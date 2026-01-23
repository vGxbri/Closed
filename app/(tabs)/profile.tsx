import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, TextInput as RNTextInput, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Divider,
  List,
  Portal,
  Text,
  useTheme
} from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MemberAvatar } from "../../components/MemberAvatar";
import { CustomHeader } from "../../components/ui/CustomHeader";
import { useSnackbar } from "../../components/ui/SnackbarContext";
import { theme as appTheme } from "../../constants/theme";
import { useAuth, useGroups } from "../../hooks";
import { authService } from "../../services";

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { profile, isLoading: authLoading, signOut, isAuthenticated, updateProfile, refreshProfile } = useAuth();
  const { groups, isLoading: groupsLoading } = useGroups();
  const { showSnackbar } = useSnackbar();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // Edit profile state
  const [showEditModal, setShowEditModal] = useState(false);
  const nameRef = useRef(""); // Use ref for uncontrolled input
  const [editAvatarUri, setEditAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Animation refs for edit modal
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const translateYAnim = useRef(new Animated.Value(40)).current;
  const [shouldRenderModal, setShouldRenderModal] = useState(false);
  
  // Animate modal open/close
  useEffect(() => {
    if (showEditModal) {
      setShouldRenderModal(true);
      opacityAnim.setValue(0);
      scaleAnim.setValue(0.85);
      translateYAnim.setValue(40);
      
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.85,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 40,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShouldRenderModal(false);
      });
    }
  }, [showEditModal, opacityAnim, scaleAnim, translateYAnim]);

  const totalGroups = groups.length;
  const totalAwards = groups.reduce((acc, g) => acc + (g.awards?.length || 0), 0);

  const handleSignOut = async () => {
    setShowLogoutDialog(true);
  };

  const confirmSignOut = async () => {
    try {
      await signOut();
      router.replace("/auth/login");
    } catch {
      showSnackbar("No se pudo cerrar sesión", "error");
    }
  };

  const openEditModal = () => {
      setEditAvatarUri(null);
      // Initialize ref with current name
      nameRef.current = profile?.display_name || "";
      setShowEditModal(true);
    };

    const pickImage = async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setEditAvatarUri(result.assets[0].uri);
      }
    };

    const handleSaveProfile = async () => {
      try {
        setSaving(true);
        
        let avatarUrl = profile?.avatar_url;
        const newName = nameRef.current.trim();
        
        // Upload new avatar if selected
        if (editAvatarUri) {
          avatarUrl = await authService.uploadAvatar(editAvatarUri);
        }
        
        await updateProfile({
          display_name: newName || profile?.display_name,
          avatar_url: avatarUrl,
        });
        
        setShowEditModal(false);
        showSnackbar("Perfil actualizado", "success");
      } catch (error) {
        console.error(error);
        showSnackbar("Error al actualizar el perfil", "error");
      } finally {
        setSaving(false);
      }
    };

  // Loading state
  if (authLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={["left", "right"]}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // Not authenticated state
  if (!isAuthenticated || !profile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={["left", "right"]}>
        <View style={styles.centerContent}>
          <Ionicons name="person-circle-outline" size={80} color={theme.colors.onSurfaceVariant} />
          <Text variant="titleLarge" style={{ marginTop: 16 }}>
            No has iniciado sesión
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, marginBottom: 24 }}>
            Inicia sesión para ver tu perfil
          </Text>
          <Button mode="contained" onPress={() => router.push("/auth/login")}>
            Iniciar Sesión
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={["left", "right"]}>
      <CustomHeader title="Perfil" showBackButton={false} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { 
            flexGrow: 1, 
            justifyContent: 'center',
            paddingTop: 0, // CustomHeader handles top spacing
            paddingBottom: insets.bottom 
          }
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', width: '100%' }}>
            {/* Left: Huge Avatar */}
            <MemberAvatar user={profile} size="xl" />
            
            {/* Right: Info & Actions */}
            <View style={{ flex: 1, marginLeft: 20, paddingTop: 4 }}>
              <View>
                <Text variant="headlineSmall" style={{ fontWeight: "800", letterSpacing: -0.5, lineHeight: 28 }}>
                  {profile.display_name}
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                  {profile.email || "usuario@podium.app"}
                </Text>
              </View>

              <TouchableOpacity 
                onPress={openEditModal}
                style={{ 
                  marginTop: 16, 
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: theme.colors.surfaceVariant,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  alignSelf: 'flex-start',
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.colors.outlineVariant,
                }}
              >
                <Ionicons name="pencil-sharp" size={14} color={theme.colors.onSurface} style={{ marginRight: 6 }} />
                <Text variant="labelMedium" style={{ fontWeight: "700", color: theme.colors.onSurface }}>
                  Editar Perfil
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {profile.bio && (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 20, lineHeight: 22 }}>
              {profile.bio}
            </Text>
          )}
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={{ fontWeight: "600", marginBottom: 12 }}>
            Configuración
          </Text>

          <Card mode="outlined" style={{ borderColor: theme.colors.secondaryContainer, borderWidth: 1 }}>
            <List.Item
              title="Notificaciones"
              left={() => (
                <View style={{ marginLeft: 16, marginRight: 8 }}>
                  <View style={{ 
                    backgroundColor: theme.colors.primaryContainer, 
                    borderColor: theme.colors.primary, 
                    borderWidth: 1,
                    borderRadius: 8,
                    width: 40,
                    height: 40,
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <Ionicons name="notifications-outline" size={22} color={theme.colors.onSurface} />
                  </View>
                </View>
              )}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => {}}
            />
            <Divider />
            <List.Item
              title="Apariencia"
              left={() => (
                <View style={{ marginLeft: 16, marginRight: 8 }}>
                  <View style={{ 
                    backgroundColor: theme.colors.primaryContainer, 
                    borderColor: theme.colors.primary, 
                    borderWidth: 1,
                    borderRadius: 8,
                    width: 40,
                    height: 40,
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <Ionicons name="color-palette-outline" size={22} color={theme.colors.onSurface} />
                  </View>
                </View>
              )}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => {}}
            />
            <Divider />
            <List.Item
              title="Privacidad"
              left={() => (
                <View style={{ marginLeft: 16, marginRight: 8 }}>
                  <View style={{ 
                    backgroundColor: theme.colors.primaryContainer, 
                    borderColor: theme.colors.primary, 
                    borderWidth: 1,
                    borderRadius: 8,
                    width: 40,
                    height: 40,
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <Ionicons name="lock-closed-outline" size={22} color={theme.colors.onSurface} />
                  </View>
                </View>
              )}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => {}}
            />
            <Divider />
            <List.Item
              title="Ayuda"
              left={() => (
                <View style={{ marginLeft: 16, marginRight: 8 }}>
                  <View style={{ 
                    backgroundColor: theme.colors.primaryContainer, 
                    borderColor: theme.colors.primary, 
                    borderWidth: 1,
                    borderRadius: 8,
                    width: 40,
                    height: 40,
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <Ionicons name="help-circle-outline" size={22} color={theme.colors.onSurface} />
                  </View>
                </View>
              )}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => {}}
            />
          </Card>
        </View>

        {/* Logout */}
        <Button
          mode="outlined"
          onPress={handleSignOut}
          style={styles.logoutButton}
          textColor={theme.colors.error}
        >
          Cerrar Sesión
        </Button>

        <Text variant="labelSmall" style={{ textAlign: "center", color: theme.colors.onSurfaceVariant }}>
          Juan Homo
        </Text>
      </ScrollView>

      <ConfirmDialog
        visible={showLogoutDialog}
        title="Cerrar Sesión"
        message="¿Estás seguro de que quieres cerrar sesión?"
        type="error"
        confirmText="Cerrar Sesión"
        cancelText="Cancelar"
        onConfirm={confirmSignOut}
        onCancel={() => setShowLogoutDialog(false)}
      />

      {/* Edit Profile Modal */}
      {shouldRenderModal && (
        <Portal>
          <View style={editModalStyles.container}>
            {/* Backdrop with Blur */}
            <Pressable style={editModalStyles.backdrop} onPress={() => setShowEditModal(false)}>
              <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacityAnim }]}>
                <BlurView 
                  intensity={25} 
                  tint="dark"
                  style={StyleSheet.absoluteFill}
                  experimentalBlurMethod="dimezisBlurView" 
                />
              </Animated.View>
            </Pressable>
            
            {/* Dialog */}
            <Animated.View
              style={[
                editModalStyles.dialogContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.surfaceVariant,
                  transform: [
                    { scale: scaleAnim },
                    { translateY: translateYAnim }
                  ],
                  opacity: opacityAnim,
                },
              ]}
            >
              {/* Title */}
              <Text variant="titleLarge" style={[editModalStyles.title, { color: theme.colors.onSurface, marginBottom: 12 }]}>
                Editar Perfil
              </Text>

              {/* Separator */}
              <View style={{ height: 1, backgroundColor: theme.colors.surfaceVariant, width: '100%', marginBottom: 20 }} />

              {/* Avatar Preview & Picker */}
              <TouchableOpacity onPress={pickImage} style={{ alignItems: 'center', marginBottom: 20 }}>
                {editAvatarUri ? (
                  <Image 
                    source={{ uri: editAvatarUri }} 
                    style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: theme.colors.primaryContainer }} 
                  />
                ) : (
                  <MemberAvatar user={profile!} size="xl" />
                )}
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  marginTop: 10,
                  backgroundColor: theme.colors.primaryContainer,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: theme.colors.primary,
                }}>
                  <Ionicons name="camera-outline" size={16} color={theme.colors.onPrimaryContainer} />
                  <Text variant="labelMedium" style={{ color: theme.colors.onPrimaryContainer, marginLeft: 6, fontWeight: '600' }}>
                    Cambiar foto
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Name Input */}
              <View style={{ width: '100%', marginBottom: 24 }}>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8, alignSelf: 'flex-start' }}>
                  Nombre
                </Text>
                <View style={{
                  borderWidth: 1, 
                  borderColor: theme.colors.outline, 
                  borderRadius: 14,
                  backgroundColor: theme.colors.surfaceVariant, 
                  paddingHorizontal: 16, 
                  height: 52,
                  flexDirection: 'row', 
                  alignItems: 'center',
                }}>
                  <Ionicons name="person-outline" size={20} color={theme.colors.primary} style={{ marginRight: 12 }} />
                  <RNTextInput
                    placeholder="Tu nombre"
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    defaultValue={profile?.display_name || ""}
                    onChangeText={(text) => nameRef.current = text}
                    style={{ color: theme.colors.onSurface, fontSize: 16, flex: 1 }}
                  />
                </View>
              </View>

              {/* Actions */}
              <View style={editModalStyles.actions}>
                <TouchableOpacity
                  style={[editModalStyles.cancelButton, { borderColor: theme.colors.surfaceVariant }]}
                  onPress={() => setShowEditModal(false)}
                  activeOpacity={0.7}
                >
                  <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, fontWeight: '600' }}>
                    Cancelar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[editModalStyles.confirmButton, { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary }]}
                  onPress={handleSaveProfile}
                  activeOpacity={0.7}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={theme.colors.onSurface} />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color={theme.colors.onSurface} style={{ marginRight: 6 }} />
                      <Text variant="labelLarge" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                        Guardar
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </Portal>
      )}
    </SafeAreaView>
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
    padding: appTheme.spacing.lg,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: appTheme.spacing.lg,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: appTheme.spacing.xl,
  },
  statsCard: {
    borderRadius: appTheme.borderRadius.lg,
    padding: appTheme.spacing.lg,
    marginBottom: appTheme.spacing.xl,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stat: {
    flex: 1,
    alignItems: "center",
    minHeight: 50,
    justifyContent: "center",
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  section: {
    marginBottom: appTheme.spacing.xl,
  },
  logoutButton: {
    marginBottom: appTheme.spacing.lg,
  },
  modalContent: {
    margin: 20,
    padding: 24,
    borderRadius: 20,
  },
});

// Premium modal styles matching other app modals
const editModalStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  dialogContainer: {
    width: '88%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 28,
    paddingTop: 32,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 24,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  actions: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
