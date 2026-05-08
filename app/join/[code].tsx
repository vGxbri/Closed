import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  StyleSheet,
  View,
} from "react-native";
import { BlurTargetView } from "expo-blur";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Button,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { defaultGroupIcon, getIconComponent, IconName } from "../../constants/icons";
import { theme as appTheme } from "../../constants/theme";
import { useAuth } from "../../hooks";
import { groupsService } from "../../services";
import { Group } from "../../types/database";

import { ConfirmDialog, DialogType } from "../../components/ui/ConfirmDialog";

type JoinState = "loading" | "preview" | "joining" | "success" | "error" | "already_member";

export default function JoinGroupScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const backgroundRef = useRef(null);
  
  const [state, setState] = useState<JoinState>("loading");
  const [group, setGroup] = useState<Group | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: DialogType;
    confirmText?: string;
    cancelText?: string;
    showCancel?: boolean;
    onConfirm: () => void;
  }>({
    visible: false,
    title: "",
    message: "",
    type: "info",
    onConfirm: () => {},
  });

  const hideDialog = () => setDialogConfig(prev => ({ ...prev, visible: false }));

  const loadGroupPreview = useCallback(async () => {
    try {
      setState("loading");
      const groupData = await groupsService.getGroupByInviteCode(code!);
      
      if (!groupData) {
        setError("Este enlace de invitación no es válido o ha expirado");
        setState("error");
        return;
      }
      
      setGroup(groupData);
      setState("preview");
    } catch (err) {
      console.error("Error loading group preview:", err);
      setError("Error al cargar la información del grupo");
      setState("error");
    }
  }, [code]);

  useEffect(() => {
    if (authLoading) return;
    
    if (!code) {
      setError("Código de invitación no válido");
      setState("error");
      return;
    }

    loadGroupPreview();
  }, [code, authLoading, loadGroupPreview]);

  const handleJoin = async () => {
    if (!isAuthenticated) {
      setDialogConfig({
        visible: true,
        title: "Inicia sesión",
        message: "Necesitas iniciar sesión para unirte a un grupo",
        type: "info",
        confirmText: "Iniciar Sesión",
        cancelText: "Cancelar",
        onConfirm: () => router.push("/auth/login"),
        showCancel: true
      });
      return;
    }

    try {
      setState("joining");
      const joinedGroup = await groupsService.joinGroup(code!);
      setState("success");
      
      setTimeout(() => {
        router.replace({
          pathname: "/(tabs)/groups/group/[id]",
          params: { id: joinedGroup.id }
        });
      }, 1500);
    } catch (err) {
      console.error("Error joining group:", err);
      const message = err instanceof Error ? err.message : "Error al unirse al grupo";
      
      if (message.includes("already a member")) {
        setState("already_member");
      } else {
        setError(message);
        setState("error");
      }
    }
  };

  const handleGoToGroup = () => {
    if (group) {
      router.replace({
        pathname: "/(tabs)/groups/group/[id]",
        params: { id: group.id }
      });
    }
  };

  const handleGoHome = () => {
    router.replace("/");
  };

  // Loading state
  if (state === "loading" || authLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centerContent}>
          <Surface style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary, borderWidth: 1 }]} elevation={0}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </Surface>
          <Text variant="headlineSmall" style={{ fontWeight: "700", textAlign: "center", marginBottom: 8 }}>
            Cargando invitación
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center" }}>
            Un momento por favor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (state === "error") {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centerContent}>
          <Surface style={[styles.iconContainer, { backgroundColor: theme.colors.errorContainer, borderColor: theme.colors.error, borderWidth: 1 }]} elevation={0}>
            <Ionicons name="warning-outline" size={48} color={theme.colors.error} />
          </Surface>
          <Text variant="headlineSmall" style={{ fontWeight: "700", textAlign: "center", marginBottom: 8 }}>
            Enlace no válido
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", maxWidth: 280 }}>
            {error}
          </Text>
        </View>

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
            onPress={handleGoHome}
            style={{ borderRadius: 14 }}
            contentStyle={{ 
              paddingVertical: 6,
              backgroundColor: theme.colors.primary, 
              borderRadius: 16
            }}
            labelStyle={{
              color: theme.colors.onPrimary,
              fontWeight: "600",
              fontSize: 16
            }}
          >
            Ir al inicio
          </Button>
        </Surface>
      </SafeAreaView>
    );
  }

  // Already member state
  if (state === "already_member") {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centerContent}>
          <Surface style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary, borderWidth: 1 }]} elevation={0}>
            <Ionicons name="checkmark-circle" size={48} color={theme.colors.primary} />
          </Surface>
          <Text variant="headlineSmall" style={{ fontWeight: "700", textAlign: "center", marginBottom: 8 }}>
            ¡Ya eres miembro!
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", maxWidth: 280 }}>
            {`Ya formas parte de "${group?.name}"`}
          </Text>
        </View>

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
            onPress={handleGoToGroup}
            style={{ borderRadius: 14 }}
            contentStyle={{ 
              paddingVertical: 6,
              backgroundColor: theme.colors.primary, 
              borderRadius: 16
            }}
            labelStyle={{
              color: theme.colors.onPrimary,
              fontWeight: "600",
              fontSize: 16
            }}
          >
            Ir al grupo
          </Button>
        </Surface>
      </SafeAreaView>
    );
  }

  // Success state
  if (state === "success") {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centerContent}>
          <Surface style={[styles.iconContainer, { backgroundColor: 'rgba(50, 215, 75, 0.15)', borderColor: '#32D74B', borderWidth: 1 }]} elevation={0}>
            <Ionicons name="checkmark-circle" size={48} color="#32D74B" />
          </Surface>
          <Text variant="headlineSmall" style={{ fontWeight: "700", textAlign: "center", marginBottom: 8 }}>
            ¡Bienvenido!
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", maxWidth: 280 }}>
            {`Te has unido a "${group?.name}"`}
          </Text>
          <ActivityIndicator size="small" style={{ marginTop: 24 }} color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Joining state
  if (state === "joining") {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centerContent}>
          <Surface style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary, borderWidth: 1 }]} elevation={0}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </Surface>
          <Text variant="headlineSmall" style={{ fontWeight: "700", textAlign: "center", marginBottom: 8 }}>
            Uniéndote al grupo
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center" }}>
            Un momento por favor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Preview state (default)
  return (
    <BlurTargetView ref={backgroundRef} style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <View style={styles.centerContent}>
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
            {/* Group Icon */}
            <Surface style={[styles.groupIconContainer, { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary, borderWidth: 1 }]} elevation={0}>
              {getIconComponent((group?.icon as IconName) || defaultGroupIcon, 40, theme.colors.onSurface)}
            </Surface>

            {/* Invitation Text */}
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
              Te han invitado a unirte a
            </Text>

            {/* Group Name */}
            <Text variant="headlineSmall" style={{ fontWeight: "700", textAlign: "center", marginTop: 4 }}>
              {group?.name}
            </Text>
            
            {/* Group Description */}
            {group?.description && (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 8, maxWidth: 280 }}>
                {group.description}
              </Text>
            )}
          </Surface>

          {/* Code display */}
          <View style={[styles.codeChip, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Ionicons name="key-outline" size={14} color={theme.colors.onSurfaceVariant} />
            <Text variant="labelMedium" style={{ marginLeft: 6, color: theme.colors.onSurfaceVariant }}>
              {code}
            </Text>
          </View>
        </View>
      </View>

      {/* Footer with buttons */}
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
          onPress={handleJoin}
          icon="account-multiple-plus"
          style={{ borderRadius: 14, marginBottom: 8 }}
          contentStyle={{ 
            paddingVertical: 6,
            backgroundColor: theme.colors.primary, 
            borderRadius: 16
          }}
          labelStyle={{
            color: theme.colors.onPrimary,
            fontWeight: "600",
            fontSize: 16
          }}
        >
          {isAuthenticated ? "Unirme al grupo" : "Iniciar sesión para unirme"}
        </Button>
        <Button
          mode="text"
          onPress={handleGoHome}
          style={{ borderRadius: 14 }}
          labelStyle={{
            color: theme.colors.onSurfaceVariant,
            fontWeight: "500",
          }}
        >
          Cancelar
        </Button>
      </Surface>
    </SafeAreaView>
      
    <ConfirmDialog
        visible={dialogConfig.visible}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        confirmText={dialogConfig.confirmText}
        cancelText={dialogConfig.cancelText}
        onConfirm={dialogConfig.onConfirm}
        onCancel={hideDialog}
        showCancel={dialogConfig.showCancel}
        blurTargetRef={backgroundRef}
      />
    </BlurTargetView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: appTheme.spacing.lg,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  previewCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    width: '100%',
    maxWidth: 340,
  },
  groupIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  codeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 16,
  },
  footer: {
    padding: 16,
    paddingTop: 16,
    width: '100%',
  },
});
