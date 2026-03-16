import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Button, Text, TextInput, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { CustomHeader } from "../../components/ui/CustomHeader";
import { theme as appTheme } from "../../constants/theme";

export default function JoinGroupInputScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [code, setCode] = useState("");

  const handleContinue = () => {
    if (code.trim()) {
      router.push(`/join/${code.trim()}`);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["left", "right"]}
    >
      <CustomHeader title="Unirse a un grupo" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Text
                variant="headlineMedium"
                style={[styles.title, { color: theme.colors.onSurface }]}
              >
                Introduce el código
              </Text>
              <Text
                variant="bodyLarge"
                style={[
                  styles.subtitle,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Pídele al administrador del grupo el código de invitación e
                ingrésalo aquí.
              </Text>
            </View>

            <View style={styles.form}>
              <TextInput
                label="Código de invitación"
                placeholder="Ej. AB12CD"
                value={code}
                onChangeText={(text) => setCode(text.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                mode="outlined"
                style={styles.input}
                outlineStyle={{ borderRadius: 12 }}
                onSubmitEditing={handleContinue}
                returnKeyType="go"
              />

              <Button
                mode="contained"
                onPress={handleContinue}
                disabled={!code.trim()}
                style={[
                  styles.button,
                  { backgroundColor: theme.colors.primary },
                ]}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                Buscar grupo
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
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
  content: {
    flex: 1,
    padding: appTheme.spacing.xl,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    lineHeight: 24,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: "transparent",
  },
  button: {
    borderRadius: 100,
    marginTop: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
});
