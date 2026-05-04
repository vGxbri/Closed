import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useRef } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";
import { useSharedValue } from "react-native-reanimated";
import { MemberAvatar } from "../MemberAvatar";
import { BottomSheetModal } from "./BottomSheetModal";

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
  const scrollRef = useRef<ScrollView>(null);
  const isScrolledToTop = useSharedValue(true);

  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      isScrolledToTop.value = event.nativeEvent.contentOffset.y <= 0;
    },
    [isScrolledToTop]
  );

  const toggleMember = (userId: string) => {
    if (selectedIds.includes(userId)) {
      onSelectionChange(selectedIds.filter((id) => id !== userId));
    } else {
      onSelectionChange([...selectedIds, userId]);
    }
  };

  const canConfirm = selectedIds.length >= minSelection && !loading;

  return (
    <BottomSheetModal
      visible={visible}
      onDismiss={onDismiss}
      isScrolledToTop={isScrolledToTop}
      contentStyle={{ paddingHorizontal: 20 }}
    >
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
          ref={scrollRef}
          style={[
            styles.listContainer,
            { borderColor: theme.colors.surfaceVariant },
          ]}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          bounces={true}
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
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    paddingBottom: 16,
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
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
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
