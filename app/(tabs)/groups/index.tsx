import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import {
    ActivityIndicator,
    Button,
    Surface,
    Text,
    useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GroupCard } from "../../../components/GroupCard"; // Asegúrate de que la ruta es correcta
import { CustomHeader } from "../../../components/ui/CustomHeader";
import { useGroups } from "../../../hooks";

export default function GroupsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { groups, isLoading, error, refetch } = useGroups();

  const handleGroupPress = (groupId: string) => {
    router.push({ pathname: "/groups/group/[id]", params: { id: groupId } });
  };

  const handleCreateGroup = () => router.push("/groups/group/create" as any);
  const handleJoinGroup = () => router.push("/groups/group/join" as any);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <CustomHeader title="Mis Círculos" showBackButton={false} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 100 + insets.bottom, paddingTop: 16 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={theme.colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text
            variant="headlineMedium"
            style={{
              fontFamily: "InstrumentSerif-Italic",
              fontSize: 36,
              color: theme.colors.onSurface,
            }}
          >
            Tus Grupos
          </Text>
          <TouchableOpacity onPress={handleJoinGroup}>
            <Ionicons
              name="qr-code-outline"
              size={24}
              color={theme.colors.onSurfaceVariant}
            />
          </TouchableOpacity>
        </View>

        {isLoading && groups.length === 0 ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : groups.length === 0 ? (
          <Surface style={styles.emptyCard} elevation={1}>
            <Text variant="titleMedium" style={{ fontWeight: "700" }}>
              Comienza tu legado
            </Text>
            <Text
              variant="bodyMedium"
              style={{
                color: theme.colors.onSurfaceVariant,
                marginTop: 8,
                textAlign: "center",
              }}
            >
              Crea un grupo para empezar a nominar y premiar a tus amigos.
            </Text>
            <Button
              mode="contained"
              onPress={handleCreateGroup}
              style={{ marginTop: 24, borderRadius: 12 }}
            >
              + Crear un grupo
            </Button>
          </Surface>
        ) : (
          <View style={styles.bentoGrid}>
            {/* Iteramos los grupos */}
            {groups.map((group) => (
              <View key={group.id} style={styles.bentoItem}>
                <GroupCard
                  group={group}
                  onPress={() => handleGroupPress(group.id)}
                />
              </View>
            ))}

            {/* Tarjeta de "Añadir nuevo" siempre al final del grid */}
            <TouchableOpacity
              onPress={handleCreateGroup}
              style={[
                styles.bentoItem,
                styles.createCard,
                { borderColor: theme.colors.outlineVariant },
              ]}
            >
              <Ionicons
                name="add"
                size={32}
                color={theme.colors.onSurfaceVariant}
              />
              <Text
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginTop: 8,
                  fontFamily: "Archivo-Medium",
                }}
              >
                Nuevo
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  loadingState: { padding: 40, alignItems: "center" },
  emptyCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    marginTop: 20,
  },
  // Estilos del Bento Grid
  bentoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
  },
  bentoItem: {
    width: "47%", // Para que quepan 2 por fila con el gap
    aspectRatio: 1, // Cuadrados perfectos (Squircles)
  },
  createCard: {
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
});
