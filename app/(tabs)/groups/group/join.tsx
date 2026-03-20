import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export default function JoinGroupScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState("");

  const handleJoin = () => {
    if (code.trim()) {
      router.push({
        pathname: "/join/[code]",
        params: { code: code.trim().toUpperCase() }
      });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={styles.content}>
          <View style={styles.centerSection}>
            {/* Icon */}
            <Surface style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary, borderWidth: 1 }]} elevation={2}>
                <Ionicons name="ticket-outline" size={48} color={theme.colors.onSurface} />
            </Surface>

            {/* Title */}
            <Text variant="headlineSmall" style={{ fontWeight: "700", textAlign: "center", marginBottom: 8 }}>
                Unirse a un grupo
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginBottom: 32, maxWidth: 280 }}>
                Introduce el código de invitación que te han compartido para acceder al grupo
            </Text>

            {/* Code Input */}
            <TextInput
                placeholder="Ej: ABC12345"
                value={code}
                onChangeText={setCode}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={12}
                mode="outlined"
                style={styles.input}
                outlineStyle={{ borderRadius: 16, borderColor: theme.colors.outline }}
                contentStyle={{ textAlign: "center", fontSize: 24, fontWeight: '700' }}
                selectionColor={theme.colors.primary}
            />
          </View>
        </View>

        {/* Join Button - Outside content scroll, stays above keyboard */}
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
              disabled={!code.trim() || code.length < 4}
              style={{ borderRadius: 14 }}
              contentStyle={{ 
                  paddingVertical: 6,
                  backgroundColor: (!code.trim() || code.length < 4) ? theme.colors.surfaceDisabled : theme.colors.primary, 
                  borderColor: 'transparent', 
                  borderWidth: 1, 
                  borderRadius: 16
              }}
              labelStyle={{
                  color: (!code.trim() || code.length < 4) ? theme.colors.onSurfaceDisabled : theme.colors.onPrimary,
                  fontWeight: "600",
                  fontSize: 16
              }}
          >
              Continuar
          </Button>
        </Surface>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
  },
  centerSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    marginTop: -60, // Visual balance
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    transform: [{ rotate: '-10deg' }]
  },
  input: {
    width: "100%",
    maxWidth: 280,
    backgroundColor: 'transparent',
    fontSize: 24,
  },
  footer: {
    padding: 16,
    paddingTop: 16,
    width: '100%',
  },
});
