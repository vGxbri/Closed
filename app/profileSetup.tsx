/**
 * Configuración de perfil de usuario
 * Pantalla inicial donde el usuario completa nombre y avatar antes de acceder a sus grupos.
 */
import { Ionicons } from "@expo/vector-icons";
import { decode } from "base64-arraybuffer";
import { BlurTargetView } from "expo-blur";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInputProps,
  View,
} from "react-native";
import { Text, TextInput, useTheme } from "react-native-paper";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { ConfirmDialog, DialogType } from "@/components/ui/ConfirmDialog";
import { CTAButton } from "@/components/ui/CTAButton";
import { GroupedField, GroupedFields } from "@/components/ui/GroupedFields";
import {
  KEYBOARD_DISMISS_RIGHT,
  KEYBOARD_DISMISS_SIZE,
} from "@/components/ui/KeyboardDismissButton";
import { StepTitle } from "@/components/ui/StepTitle";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useAuth } from "@/hooks/useAuth";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";
import { supabase } from "@/lib/supabase";

const AVATAR_SIZE = 132;

// En iOS el campo va en una tarjeta agrupada y la insignia de la foto es de cristal (iOS 26+)
const isIOS = Platform.OS === "ios";
const glassAvailable = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

export default function ProfileSetup() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { user, updateProfile, isProfileLoading } = useAuth();
  const backgroundRef = React.useRef(null);

  const [displayName, setDisplayName] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: DialogType;
  }>({
    visible: false,
    title: "",
    message: "",
    type: "info",
  });

  const showDialog = (
    title: string,
    message: string,
    type: DialogType = "error",
  ) => {
    setDialogConfig({ visible: true, title, message, type });
  };

  const hideDialog = () => {
    setDialogConfig((prev) => ({ ...prev, visible: false }));
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0].base64) {
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
      uploadImage(result.assets[0].base64);
    }
  };

  const uploadImage = async (base64Data: string) => {
    try {
      if (!user?.id) return;
      setIsUploading(true);

      const filePath = `${user.id}/${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(filePath, decode(base64Data), {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (error) throw error;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setImage(data.publicUrl);
    } catch (error) {
      showDialog("Error al subir imagen", (error as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleContinue = async () => {
    if (!displayName.trim()) {
      showDialog(
        "Nombre requerido",
        "Por favor, ingresa un nombre o apodo.",
        "warning",
      );
      return;
    }

    try {
      await updateProfile({
        display_name: displayName,
        avatar_url: image || undefined,
      });
      router.replace("/");
    } catch (error) {
      showDialog("Error al actualizar el perfil", (error as Error).message);
    }
  };

  const isBusy = isProfileLoading || isUploading;
  const canContinue = !!displayName.trim() && !isBusy;

  // Lo que comparten el campo de iOS y el de Android
  const nameField = {
    accessibilityLabel: "Nombre o apodo",
    value: displayName,
    onChangeText: setDisplayName,
    autoCapitalize: "words",
    autoComplete: "name",
    textContentType: "name",
    returnKeyType: "done",
    onSubmitEditing: handleContinue,
  } satisfies TextInputProps;

  const badgeIcon = (
    <Ionicons name="camera" size={20} color={theme.colors.onSurface} />
  );

  return (
    <BlurTargetView ref={backgroundRef} style={styles.container}>
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
          {/* El margen inferior se aplica aquí y no en SafeAreaView: el botón lo descuenta
              al subir con el teclado y los dos valores deben coincidir */}
          <View style={[styles.container, { marginBottom: insets.bottom }]}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <StepTitle
                main="¿Cómo te"
                accent="llamas?"
                subtitle="Elige el nombre y la foto con los que te verán en tus grupos."
              />

              <View style={styles.avatarSection}>
                <Pressable
                  onPress={pickImage}
                  disabled={isUploading}
                  accessibilityRole="button"
                  accessibilityLabel={
                    image ? "Cambiar foto de perfil" : "Elegir foto de perfil"
                  }
                  accessibilityState={{ busy: isUploading }}
                  style={({ pressed }) => [
                    styles.avatarPicker,
                    { transform: [{ scale: pressed ? 0.97 : 1 }] },
                  ]}
                >
                  {/* Sin foto, el avatar muestra la inicial del nombre según se escribe */}
                  <UserAvatar
                    uri={image}
                    name={displayName.trim() || "?"}
                    size={AVATAR_SIZE}
                  />

                  {isUploading && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator color="#FFFFFF" />
                    </View>
                  )}

                  {glassAvailable ? (
                    <GlassView style={styles.badge}>{badgeIcon}</GlassView>
                  ) : (
                    <View
                      style={[
                        styles.badge,
                        styles.badgeSolid,
                        {
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.outlineVariant,
                        },
                      ]}
                    >
                      {badgeIcon}
                    </View>
                  )}
                </Pressable>
                <Text
                  style={[
                    styles.photoHint,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {image
                    ? "Toca para cambiar tu foto"
                    : "Toca para añadir tu foto"}
                </Text>
              </View>

              <View style={styles.form}>
                {isIOS ? (
                  <GroupedFields>
                    <GroupedField
                      icon="person"
                      placeholder="Nombre o apodo"
                      {...nameField}
                    />
                  </GroupedFields>
                ) : (
                  <TextInput
                    label="Nombre o apodo"
                    placeholder="Ej: Gabri"
                    {...nameField}
                    mode="outlined"
                    style={styles.input}
                    outlineStyle={{
                      borderColor: theme.colors.outlineVariant,
                      borderRadius: 20,
                      borderWidth: 1,
                    }}
                    contentStyle={styles.inputContent}
                  />
                )}
              </View>
            </ScrollView>

            {/* El botón se queda pegado encima del teclado; lo de arriba se desplaza si no cabe */}
            <View
              style={[
                styles.footer,
                {
                  paddingBottom:
                    12 + Math.max(0, keyboardHeight - insets.bottom),
                },
                // Con el teclado abierto, hueco a la derecha para el botón de ocultarlo
                keyboardHeight > 0 && {
                  paddingRight:
                    KEYBOARD_DISMISS_RIGHT + KEYBOARD_DISMISS_SIZE + 10,
                },
              ]}
            >
              <CTAButton
                title="Continuar"
                loadingText={isUploading ? "Subiendo foto..." : "Guardando..."}
                onPress={handleContinue}
                disabled={!displayName.trim()}
                loading={isBusy}
                backgroundColor={
                  canContinue
                    ? theme.colors.primary
                    : theme.colors.surfaceVariant
                }
                textColor={
                  canContinue
                    ? theme.colors.onPrimary
                    : theme.colors.onSurfaceVariant
                }
                iconBorderColor={
                  canContinue ? "rgba(255,255,255,0.3)" : theme.colors.outline
                }
              />
            </View>
          </View>
        </SafeAreaView>

        <ConfirmDialog
          visible={dialogConfig.visible}
          title={dialogConfig.title}
          message={dialogConfig.message}
          type={dialogConfig.type}
          onConfirm={hideDialog}
          onCancel={hideDialog}
          confirmText="Entendido"
          showCancel={false}
          blurTargetRef={backgroundRef}
        />
      </View>
    </BlurTargetView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 16,
  },
  avatarSection: {
    alignItems: "center",
    marginTop: 26,
    marginBottom: 28,
  },
  avatarPicker: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: AVATAR_SIZE * 0.35,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    position: "absolute",
    right: -6,
    bottom: -6,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeSolid: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  photoHint: {
    marginTop: 16,
    fontFamily: "Archivo-Medium",
    fontSize: 14,
  },
  form: {
    paddingHorizontal: 24,
  },
  input: {
    backgroundColor: "transparent",
  },
  inputContent: {
    fontFamily: "Archivo-Medium",
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
});
