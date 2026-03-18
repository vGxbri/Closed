import { decode } from "base64-arraybuffer";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import { Avatar, Button, Surface, Text, TextInput, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

export default function ProfileSetup() {
  const router = useRouter();
  const theme = useTheme();
  const { user, updateProfile, isProfileLoading } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      Alert.alert("Error uploading image", (error as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleContinue = async () => {
    if (!displayName.trim()) {
      Alert.alert("Por favor, ingresa un nombre o apodo.");
      return;
    }

    try {
      await updateProfile({
        display_name: displayName,
        avatar_url: image || undefined,
      });
      router.replace("/");
    } catch (error) {
      console.error(error);
      Alert.alert("Error al actualizar el perfil", (error as Error).message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text variant="displaySmall" style={[styles.title, { color: theme.colors.onSurface }]}>
              ¡Hola!
            </Text>
            <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              ¿Cómo quieres que te llamen?
            </Text>
          </View>

          <View style={styles.avatarContainer}>
            <TouchableOpacity onPress={pickImage}>
              {image ? (
                <Avatar.Image size={120} source={{ uri: image }} />
              ) : (
                <Surface 
                  style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.surfaceVariant }]} 
                  elevation={2}
                >
                  <Text variant="displayMedium" style={{ color: theme.colors.primary }}>
                    {displayName.charAt(0).toUpperCase() || "?"}
                  </Text>
                </Surface>
              )}
              <View style={[styles.editBadge, { backgroundColor: theme.colors.background, borderColor: theme.colors.outline }]}>
                <Text style={styles.editBadgeText}>✏️</Text>
              </View>
            </TouchableOpacity>
            <Text variant="bodyMedium" style={[styles.photoHint, { color: theme.colors.primary }]}>
              Toca para cambiar tu foto
            </Text>
          </View>

          <TextInput
            label="Nombre o Apodo"
            value={displayName}
            onChangeText={setDisplayName}
            mode="outlined"
            style={styles.input}
            outlineColor={theme.colors.outline}
            activeOutlineColor={theme.colors.primary}
            textColor={theme.colors.onSurface}
            placeholder="Ej: Gabri"
            placeholderTextColor={theme.colors.onSurfaceVariant}
          />

          <View style={styles.spacer} />

          <Button
            mode="contained"
            onPress={handleContinue}
            loading={isProfileLoading || isUploading}
            disabled={isProfileLoading || isUploading || !displayName.trim()}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Continuar
          </Button>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  header: {
    marginBottom: 40,
    alignItems: "center",
  },
  title: {
    fontFamily: "ClashDisplay-Bold",
    marginBottom: 8,
  },
  subtitle: {
    // color se maneja en el componente
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
  },
  editBadgeText: {
    fontSize: 12,
  },
  photoHint: {
    marginTop: 12,
    fontFamily: "Archivo-Medium",
  },
  input: {
    backgroundColor: "transparent",
    width: "100%",
  },
  spacer: {
    flex: 1,
  },
  button: {
    borderRadius: 100,
  },
  buttonContent: {
    height: 56,
  },
});
