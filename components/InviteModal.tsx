import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import React, { useMemo } from "react";
import {
  getGroupInviteUrl,
  getInviteShareMessage,
  normalizeInviteCode,
} from "@/lib/inviteLink";
import {
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, Surface, Text, useTheme } from "react-native-paper";
import { useSnackbar } from "@/components/ui/SnackbarContext";
import { BottomSheetModal } from "./ui/BottomSheetModal";

interface InviteModalProps {
  visible: boolean;
  onClose: () => void;
  inviteCode: string;
  groupName: string;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  visible,
  onClose,
  inviteCode,
  groupName,
}) => {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();

  const inviteCodeNormalized = useMemo(
    () => normalizeInviteCode(inviteCode) ?? inviteCode,
    [inviteCode],
  );
  const appLink = useMemo(
    () => getGroupInviteUrl(inviteCodeNormalized),
    [inviteCodeNormalized],
  );

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(inviteCodeNormalized);
    showSnackbar("Código copiado al portapapeles", "success");
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(appLink);
    showSnackbar("Enlace copiado al portapapeles", "success");
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: getInviteShareMessage(groupName, inviteCodeNormalized),
        title: `Únete a ${groupName} en Closed`,
        url: appLink,
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <BottomSheetModal
      visible={visible}
      onDismiss={onClose}
      contentStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
    >
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text variant="titleLarge" style={{ fontWeight: "700" }}>
          Invitar al grupo
        </Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons
            name="close"
            size={24}
            color={theme.colors.onSurfaceVariant}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Invite Code Section */}
        <Text
          variant="bodyMedium"
          style={{
            textAlign: "center",
            color: theme.colors.onSurfaceVariant,
            marginBottom: 16,
          }}
        >
          Comparte este código para que se unan al grupo
        </Text>

        <TouchableOpacity onPress={handleCopyCode} activeOpacity={0.7}>
          <Surface
            style={[
              styles.codeContainer,
              {
                backgroundColor: theme.colors.primaryContainer,
                borderColor: theme.colors.primary,
                borderWidth: 2, // Dashed border simulated or just solid
                borderStyle: "dashed",
              },
            ]}
            elevation={0}
          >
            <Text
              variant="displayMedium"
              style={{
                fontWeight: "800",
                color: theme.colors.onSurface,
                letterSpacing: 4,
              }}
            >
              {inviteCodeNormalized}
            </Text>
            <View style={styles.tapToCopy}>
              <Ionicons
                name="copy-outline"
                size={14}
                color={theme.colors.onPrimaryContainer}
              />
              <Text
                variant="labelSmall"
                style={{
                  color: theme.colors.onPrimaryContainer,
                  marginLeft: 4,
                }}
              >
                Toca para copiar
              </Text>
            </View>
          </Surface>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View
            style={[
              styles.divider,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          />
          <Text
            variant="labelMedium"
            style={{
              color: theme.colors.onSurfaceVariant,
              paddingHorizontal: 12,
            }}
          >
            O COMPARTE EL ENLACE DE LA APP
          </Text>
          <View
            style={[
              styles.divider,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          />
        </View>

        {/* Link Section */}
        <Surface
          style={[
            styles.linkContainer,
            {
              backgroundColor: theme.colors.surfaceVariant,
              borderColor: theme.colors.outlineVariant,
              borderWidth: 1,
            },
          ]}
          elevation={0}
        >
          <Ionicons
            name="link"
            size={20}
            color={theme.colors.onSurfaceVariant}
            style={{ marginLeft: 4 }}
          />
          <Text
            numberOfLines={1}
            style={[styles.linkText, { color: theme.colors.onSurface }]}
          >
            {appLink}
          </Text>
          <TouchableOpacity
            style={[
              styles.copyLinkButton,
              { backgroundColor: theme.colors.surface },
            ]}
            onPress={handleCopyLink}
          >
            <Ionicons
              name="copy-outline"
              size={18}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </Surface>

        {/* Share Button */}
        <Text
          variant="bodySmall"
          style={{
            textAlign: "center",
            color: theme.colors.onSurfaceVariant,
            marginTop: 4,
          }}
        >
          El enlace abre la app si está instalada. Si no funciona, usa el código en
          Unirse a un grupo.
        </Text>

        <Button
          mode="contained"
          onPress={handleShare}
          icon="share-variant"
          style={{ borderRadius: 12, marginTop: 4 }}
          contentStyle={{ paddingVertical: 6 }}
        >
          Compartir invitación
        </Button>
      </View>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  closeButton: {
    padding: 8,
    marginRight: -8,
  },
  content: {
    gap: 16,
  },
  codeContainer: {
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  tapToCopy: {
    flexDirection: "row",
    alignItems: "center",
    opacity: 0.6,
    marginTop: 8,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  linkContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 14,
    marginBottom: 8,
  },
  linkText: {
    flex: 1,
    marginHorizontal: 12,
    fontSize: 14,
  },
  copyLinkButton: {
    padding: 8,
    borderRadius: 10,
    elevation: 1,
  },
});
