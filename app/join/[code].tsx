/**
 * Unión por enlace de invitación
 * Muestra el grupo al que invita un código o enlace y permite unirse a él.
 */
import { Ionicons } from "@expo/vector-icons";
import { BlurTargetView } from "expo-blur";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { CircleButton } from "@/components/ui/CircleButton";
import { ConfirmDialog, DialogType } from "@/components/ui/ConfirmDialog";
import { CTAButton } from "@/components/ui/CTAButton";
import { GroupCover } from "@/components/ui/GroupCover";
import { StatusView, TextLink } from "@/components/ui/StatusView";
import { StepTitle } from "@/components/ui/StepTitle";
import { useAuth } from "@/hooks";
import { normalizeInviteCode } from "@/lib/inviteLink";
import { groupsService } from "@/services";
import { Group } from "@/types/database";

type JoinState =
  "loading" | "preview" | "joining" | "success" | "error" | "already_member";

export default function JoinGroupScreen() {
  const params = useLocalSearchParams<{ code: string | string[] }>();
  const inviteCode = normalizeInviteCode(params.code);
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

  const hideDialog = () =>
    setDialogConfig((prev) => ({ ...prev, visible: false }));

  const loadGroupPreview = useCallback(async () => {
    try {
      setState("loading");
      const groupData = await groupsService.getGroupByInviteCode(inviteCode!);

      if (!groupData) {
        if (!isAuthenticated) {
          setGroup(null);
          setState("preview");
          return;
        }
        setError("Este código de invitación no es válido o ha caducado.");
        setState("error");
        return;
      }

      setGroup(groupData);
      setState("preview");
    } catch {
      if (!isAuthenticated) {
        setGroup(null);
        setState("preview");
        return;
      }
      setError("No se ha podido cargar la información del grupo.");
      setState("error");
    }
  }, [inviteCode, isAuthenticated]);

  useEffect(() => {
    if (authLoading) return;

    if (!inviteCode) {
      setError("El código de invitación no es válido.");
      setState("error");
      return;
    }

    loadGroupPreview();
  }, [inviteCode, authLoading, loadGroupPreview]);

  const handleJoin = async () => {
    if (!isAuthenticated) {
      setDialogConfig({
        visible: true,
        title: "Inicia sesión",
        message: "Necesitas iniciar sesión para unirte a un grupo",
        type: "info",
        confirmText: "Iniciar Sesión",
        cancelText: "Cancelar",
        onConfirm: () =>
          router.push({
            pathname: "/auth/login",
            params: { returnTo: `/join/${inviteCode}` },
          }),
        showCancel: true,
      });
      return;
    }

    try {
      setState("joining");
      const joinedGroup = await groupsService.joinGroup(inviteCode!);
      setState("success");

      setTimeout(() => {
        router.replace({
          pathname: "/(tabs)/groups/group/[id]",
          params: { id: joinedGroup.id },
        });
      }, 1500);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al unirse al grupo";

      if (message.includes("already a member")) {
        setState("already_member");
      } else {
        // El servicio devuelve este error en inglés
        setError(
          message.includes("Invalid invite code")
            ? "Este código de invitación no es válido o ha caducado."
            : message,
        );
        setState("error");
      }
    }
  };

  const handleGoToGroup = () => {
    if (group) {
      router.replace({
        pathname: "/(tabs)/groups/group/[id]",
        params: { id: group.id },
      });
    }
  };

  const handleGoHome = () => {
    router.replace("/");
  };

  // Vuelve a la pantalla del código si se llegó desde ella; si no, la abre
  const handleTryAnotherCode = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/join/joinGroup");
    }
  };

  if (state === "loading" || authLoading) {
    return (
      <StatusView
        color={theme.colors.primary}
        title="Cargando invitación"
        message="Un momento, por favor."
      />
    );
  }

  if (state === "joining") {
    return (
      <StatusView
        color={theme.colors.primary}
        title="Uniéndote al grupo"
        message="Un momento, por favor."
      />
    );
  }

  if (state === "success") {
    return (
      <StatusView
        icon="checkmark-circle"
        color="#2E7D32"
        title="¡Ya estás dentro!"
        message={`Te has unido a "${group?.name}". Abriendo el grupo…`}
      />
    );
  }

  if (state === "error") {
    return (
      <StatusView
        icon="alert-circle"
        color={theme.colors.error}
        title="Invitación no válida"
        message={error ?? ""}
        onClose={handleGoHome}
      >
        <CTAButton
          title="Probar otro código"
          iconName="refresh"
          onPress={handleTryAnotherCode}
        />
        <TextLink label="Ir al inicio" onPress={handleGoHome} />
      </StatusView>
    );
  }

  if (state === "already_member") {
    return (
      <StatusView
        icon="checkmark-circle"
        color={theme.colors.primary}
        title="Ya eres miembro"
        message={`Ya formas parte de "${group?.name}".`}
        onClose={handleGoHome}
      >
        <CTAButton title="Ir al grupo" onPress={handleGoToGroup} />
      </StatusView>
    );
  }

  return (
    <BlurTargetView ref={backgroundRef} style={styles.container}>
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={["top", "left", "right"]}
      >
        <View style={styles.topBar}>
          <CircleButton icon="close" label="Cerrar" onPress={handleGoHome} />
        </View>

        <StepTitle
          main="Te han"
          accent="invitado"
          subtitle={
            isAuthenticated
              ? "Echa un vistazo al grupo y únete cuando quieras."
              : "Inicia sesión para unirte a este grupo."
          }
        />

        <View style={styles.previewContent}>
          <SquircleView
            style={[
              styles.groupCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
            cornerSmoothing={1}
          >
            {group ? (
              <GroupCover
                uri={group.cover_image_url}
                name={group.name}
                style={styles.groupCover}
              />
            ) : (
              // Sin sesión no se pueden leer los datos del grupo
              <View
                style={[
                  styles.groupCover,
                  styles.groupCoverPlaceholder,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
              >
                <Ionicons
                  name="lock-closed"
                  size={36}
                  color={theme.colors.onSurfaceVariant}
                />
              </View>
            )}

            <View style={styles.groupInfo}>
              <Text
                style={[styles.groupName, { color: theme.colors.onSurface }]}
                numberOfLines={2}
              >
                {group?.name ?? "Grupo privado"}
              </Text>
              {!!group?.description && (
                <Text
                  style={[
                    styles.groupDescription,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                  numberOfLines={3}
                >
                  {group.description}
                </Text>
              )}
              <View style={styles.codeLine}>
                <Ionicons
                  name="key-outline"
                  size={14}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text
                  style={[
                    styles.codeText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                  accessibilityLabel={`Código ${inviteCode?.split("").join(" ")}`}
                >
                  {inviteCode}
                </Text>
              </View>
            </View>
          </SquircleView>
        </View>

        <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
          <CTAButton
            title={
              isAuthenticated ? "Unirme al grupo" : "Iniciar sesión para unirme"
            }
            onPress={handleJoin}
          />
          <TextLink label="Cancelar" onPress={handleGoHome} />
        </View>
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
  topBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },

  previewContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 14,
  },
  groupCard: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  groupCover: {
    height: 170,
  },
  groupCoverPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  groupInfo: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 6,
  },
  groupName: {
    fontFamily: "Archivo-Bold",
    fontSize: 20,
    lineHeight: 25,
  },
  groupDescription: {
    fontFamily: "Archivo-Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  codeLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  codeText: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 13,
    letterSpacing: 1.5,
  },

  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 14,
    alignItems: "center",
  },
});
