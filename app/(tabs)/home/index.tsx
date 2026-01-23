import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from "react-native";
import {
    ActivityIndicator,
    Button,
    FAB,
    Surface,
    Text,
    useTheme
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GroupCard } from "../../../components/GroupCard";
import { CustomHeader } from "../../../components/ui/CustomHeader";
import { useAuth, useGroups } from "../../../hooks";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { groups, isLoading, error, refetch } = useGroups();
  const theme = useTheme();

  const handleGroupPress = (groupId: string) => {
    router.push({
      pathname: "/home/group/[id]",
      params: { id: groupId }
    });
  };

  const handleCreateGroup = () => {
    router.push("/home/group/create" as any);
  };

  const handleJoinGroup = () => {
    router.push("/home/group/join" as any);
  };

  // Calculate stats
  const totalGroups = groups.length;
  const totalAwards = groups.reduce((acc, g) => acc + (g.awards?.length || 0), 0);
  const totalMembers = groups.reduce((acc, g) => acc + (g.member_count || 0), 0);

  const displayName = profile?.display_name?.split(' ')[0] || 'Campeón';

  const StatCard = ({ label, value, icon }: { label: string; value: number | string; icon: string }) => (
    <Surface style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.secondaryContainer, borderWidth: 1 }]} elevation={1}>
      <View style={[styles.statIconContainer, { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary, borderWidth: 1  }]}>
        <Ionicons name={icon as any} size={22} color={theme.colors.onSecondaryContainer} />
      </View>
      <View>
        <Text variant="headlineMedium" style={{ fontWeight: "800", color: theme.colors.onSurface, lineHeight: 32 }}>
          {value}
        </Text>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, fontWeight: "600", marginTop: 2 }}>
          {label}
        </Text>
      </View>
    </Surface>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <CustomHeader title="Podium" showBackButton={false} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 100 + insets.bottom, paddingTop: 16 }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
              Bienvenido de nuevo,
            </Text>
            <Text variant="headlineMedium" style={{ fontWeight: "800", letterSpacing: -0.5 }}>
              {displayName}
            </Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <StatCard label="Grupos" value={totalGroups} icon="people" />
          <StatCard label="Premios" value={totalAwards} icon="trophy" />
          <StatCard label="Amigos" value={totalMembers} icon="heart" />
        </View>

        {/* Groups Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="titleLarge" style={{ fontWeight: "700" }}>
              Mis Grupos
            </Text>
            <TouchableOpacity onPress={handleJoinGroup} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontWeight: "600", color: theme.colors.tertiary, marginRight: 4, fontSize: 14 }}>
                Unirse con código
              </Text>
              <Ionicons name="arrow-forward" size={14} color={theme.colors.tertiary} />
            </TouchableOpacity>
          </View>

          {/* Error State */}
          {error && (
            <Surface style={[styles.errorCard, { backgroundColor: theme.colors.errorContainer }]} elevation={0}>
              <Ionicons name="warning-outline" size={24} color={theme.colors.error} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                  No se pudieron cargar los grupos
                </Text>
                <TouchableOpacity onPress={refetch}>
                  <Text style={{ color: theme.colors.error, fontWeight: "700", marginTop: 4 }}>
                    Reintentar
                  </Text>
                </TouchableOpacity>
              </View>
            </Surface>
          )}

          {isLoading && groups.length === 0 ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text variant="bodyMedium" style={{ marginTop: 16, color: theme.colors.onSurfaceVariant }}>
                Sincronizando podios...
              </Text>
            </View>
          ) : groups.length === 0 ? (
            <Surface style={styles.emptyCard} elevation={1}>
              <Text variant="titleMedium" style={{ fontWeight: "700" }}>
                Comienza tu legado
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, textAlign: "center", maxWidth: 260, lineHeight: 20 }}>
                Crea un grupo para empezar a nominar y premiar a tus amigos.
              </Text>
              <Button 
                mode="contained" 
                onPress={handleCreateGroup} 
                style={{ marginTop: 24, borderRadius: 12, borderColor: theme.colors.primary, borderWidth: 1, backgroundColor: theme.colors.primaryContainer }}
                contentStyle={{ paddingVertical: 6 }}
              >
                + Crear un grupo
              </Button>
            </Surface>
          ) : (
            <View style={styles.groupsList}>
              {groups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  onPress={() => handleGroupPress(group.id)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      {groups.length > 0 && (
        <FAB
          icon="plus"
          label={Platform.OS === 'ios' ? "Nuevo Grupo" : undefined}
          style={[
            styles.fab, 
            { 
                bottom: 24 + insets.bottom,
                backgroundColor: theme.colors.primaryContainer,
                borderColor: theme.colors.primary,
                borderWidth: 1,
            }
          ]}
          color={theme.colors.onPrimaryContainer}
          onPress={handleCreateGroup}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  glowSpot: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    marginTop: 10,
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  logoContainer: {
    width: 60,
    height: 60,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  loadingState: {
    alignItems: "center",
    padding: 40,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 16,
    marginBottom: 16,
  },
  emptyCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  groupsList: {
    gap: 16,
  },
  fab: {
    position: "absolute",
    right: 20,
    borderRadius: 16,
  },
});

