import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import {
    Animated,
    Pressable,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { ActivityIndicator, Portal, Text, useTheme } from "react-native-paper";
import { MemberAvatar } from "../MemberAvatar";

export interface SelectableMember {
  id?: string; // for MemberAvatar compatibility
  user_id: string;
  display_name: string;
  avatar_url?: string | null;
}

interface MemberSelectMenuProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  members: SelectableMember[];
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onConfirm: () => void;
  onDismiss: () => void;
  confirmText?: string;
  loading?: boolean;
  minSelection?: number;
}

export const MemberSelectMenu: React.FC<MemberSelectMenuProps> = ({
  visible,
  title,
  subtitle,
  members,
  selectedIds,
  onSelectionChange,
  onConfirm,
  onDismiss,
  confirmText = "Guardar",
  loading = false,
  minSelection = 0,
}) => {
  const theme = useTheme();
  const opacityAnim = React.useRef(new Animated.Value(0)).current;
  const translateYAnim = React.useRef(new Animated.Value(600)).current;
  const [shouldRender, setShouldRender] = React.useState(visible);

  React.useEffect(() => {
    if (visible) {
      setShouldRender(true);
      opacityAnim.setValue(0);
      translateYAnim.setValue(600);

      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 600,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible, opacityAnim, translateYAnim]);

  const toggleMember = (userId: string) => {
    if (selectedIds.includes(userId)) {
      onSelectionChange(selectedIds.filter((id) => id !== userId));
    } else {
      onSelectionChange([...selectedIds, userId]);
    }
  };

  const canConfirm = selectedIds.length >= minSelection && !loading;

  if (!shouldRender) return null;

  return (
    <Portal>
      <View style={styles.container}>
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={onDismiss}>
          <Animated.View
            style={[StyleSheet.absoluteFill, { opacity: opacityAnim }]}
          >
            <BlurView
              intensity={25}
              tint="dark"
              style={StyleSheet.absoluteFill}
              blurMethod="dimezisBlurView"
            />
          </Animated.View>
        </Pressable>

        {/* Menu */}
        <Animated.View
          style={[
            styles.menuContainer,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.surfaceVariant,
              transform: [{ translateY: translateYAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Handle bar */}
          <View
            style={[
              styles.handleBar,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          />

          {/* Header */}
          <View style={styles.header}>
            <Text
              variant="titleMedium"
              style={[styles.title, { color: theme.colors.onSurface }]}
            >
              {title}
            </Text>
            {subtitle && (
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {subtitle}
              </Text>
            )}
            <View
              style={[
                styles.countBadge,
                { backgroundColor: theme.colors.primaryContainer },
              ]}
            >
              <Text
                variant="labelSmall"
                style={{
                  color: theme.colors.onPrimaryContainer,
                  fontWeight: "700",
                }}
              >
                {selectedIds.length} seleccionados
              </Text>
            </View>
          </View>

          {/* Members List */}
          {members.length === 0 ? (
            <View
              style={[
                styles.listContainer,
                {
                  borderColor: theme.colors.surfaceVariant,
                  padding: 32,
                  alignItems: "center",
                },
              ]}
            >
              <Text
                variant="bodyMedium"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  textAlign: "center",
                }}
              >
                No hay miembros disponibles para seleccionar.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={[
                styles.listContainer,
                { borderColor: theme.colors.surfaceVariant },
              ]}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              {members.map((member, index) => {
                const isSelected = selectedIds.includes(member.user_id);
                const isLast = index === members.length - 1;
                return (
                  <TouchableOpacity
                    key={member.user_id}
                    style={[
                      styles.memberRow,
                      isSelected && {
                        backgroundColor: theme.colors.primaryContainer,
                      },
                      !isSelected && { backgroundColor: theme.colors.surface },
                      !isLast && {
                        borderBottomWidth: 1,
                        borderBottomColor: theme.colors.surfaceVariant,
                      },
                    ]}
                    onPress={() => toggleMember(member.user_id)}
                    activeOpacity={0.7}
                  >
                    <MemberAvatar
                      user={{
                        id: member.user_id,
                        display_name: member.display_name,
                        avatar_url: member.avatar_url,
                      }}
                      size="sm"
                    />
                    <Text
                      variant="bodyMedium"
                      style={{
                        flex: 1,
                        marginLeft: 12,
                        fontWeight: isSelected ? "600" : "400",
                        color: theme.colors.onSurface,
                      }}
                    >
                      {member.display_name}
                    </Text>
                    <Ionicons
                      name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                      size={24}
                      color={
                        isSelected
                          ? theme.colors.onPrimaryContainer
                          : theme.colors.outline
                      }
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                { borderColor: theme.colors.surfaceVariant },
              ]}
              onPress={onDismiss}
              activeOpacity={0.7}
            >
              <Text
                variant="labelLarge"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  fontWeight: "600",
                }}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                {
                  backgroundColor: canConfirm
                    ? theme.colors.primaryContainer
                    : theme.colors.surfaceVariant,
                  borderColor: canConfirm
                    ? theme.colors.primary
                    : theme.colors.outline,
                  opacity: canConfirm ? 1 : 0.6,
                },
              ]}
              onPress={onConfirm}
              disabled={!canConfirm}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Text
                  variant="labelLarge"
                  style={{ color: theme.colors.onSurface, fontWeight: "700" }}
                >
                  {confirmText}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    alignItems: "center",
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  menuContainer: {
    width: "100%",
    maxWidth: 500,
    maxHeight: "75%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20, // Add padding to sides
    borderWidth: 1,
    borderBottomWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    alignItems: "center",
    paddingBottom: 16,
    // Remove border from header since list will be card
    borderBottomWidth: 0,
  },
  title: {
    fontWeight: "700",
    marginBottom: 4,
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  listContainer: {
    width: "100%",
    maxHeight: 400,
    borderRadius: 16, // Rounded corners for list
    borderWidth: 1, // Border for list
    overflow: "hidden", // Clip content
    marginBottom: 16, // Space before buttons
  },
  listContent: {
    paddingHorizontal: 0,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 16,
    paddingBottom: 34,
    // Remove top border since list is separated
    borderTopWidth: 0,
  },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  confirmButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
});
