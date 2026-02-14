import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import React from "react";
import {
  Modal,
  Pressable,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, Surface, Text, useTheme } from "react-native-paper";
import { useSnackbar } from "./ui/SnackbarContext";

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
  
  // App link for sharing and copying
  const appLink = `closed://join/${inviteCode}`;

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(inviteCode);
    showSnackbar("Código copiado al portapapeles", "success");
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(appLink);
    showSnackbar("Enlace copiado al portapapeles", "success");
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `¡Únete a mi grupo "${groupName}" en Closed! 🏆\n\nUsa el código: ${inviteCode}\n\nO abre este enlace:\n${appLink}`,
        title: `Únete a ${groupName} en Closed`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.modalContent, { backgroundColor: theme.colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
                <View style={{ width: 40 }} />
                <Text variant="titleLarge" style={{ fontWeight: "700" }}>Invitar Amigos</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={theme.colors.onSurfaceVariant} />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                {/* Invite Code Section */}
                <Text variant="bodyMedium" style={{ textAlign: "center", color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
                    Comparte este código con tus amigos
                </Text>

                <TouchableOpacity 
                    onPress={handleCopyCode}
                    activeOpacity={0.7}
                >
                    <Surface 
                        style={[
                            styles.codeContainer, 
                            { 
                                backgroundColor: theme.colors.primaryContainer,
                                borderColor: theme.colors.primary,
                                borderWidth: 2, // Dashed border simulated or just solid
                                borderStyle: 'dashed'
                            }
                        ]} 
                        elevation={0}
                    >
                        <Text variant="displayMedium" style={{ fontWeight: "800", color: theme.colors.onSurface, letterSpacing: 4 }}>
                            {inviteCode}
                        </Text>
                        <View style={styles.tapToCopy}>
                            <Ionicons name="copy-outline" size={14} color={theme.colors.onPrimaryContainer} />
                            <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer, marginLeft: 4 }}>
                                Toca para copiar
                            </Text>
                        </View>
                    </Surface>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.dividerContainer}>
                    <View style={[styles.divider, { backgroundColor: theme.colors.surfaceVariant }]} />
                    <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, paddingHorizontal: 12 }}>
                        O COMPARTE EL ENLACE
                    </Text>
                    <View style={[styles.divider, { backgroundColor: theme.colors.surfaceVariant }]} />
                </View>

                {/* Link Section */}
                <Surface 
                    style={[
                        styles.linkContainer, 
                        { 
                            backgroundColor: theme.colors.surfaceVariant, 
                            borderColor: theme.colors.outlineVariant, 
                            borderWidth: 1 
                        }
                    ]}
                    elevation={0}
                >
                    <Ionicons name="link" size={20} color={theme.colors.onSurfaceVariant} style={{ marginLeft: 4 }} />
                    <Text numberOfLines={1} style={[styles.linkText, { color: theme.colors.onSurface }]}>
                        {appLink}
                    </Text>
                    <TouchableOpacity 
                        style={[styles.copyLinkButton, { backgroundColor: theme.colors.surface }]} 
                        onPress={handleCopyLink}
                    >
                        <Ionicons name="copy-outline" size={18} color={theme.colors.primary} />
                    </TouchableOpacity>
                </Surface>

                {/* Share Button */}
                <Button
                    mode="contained"
                    onPress={handleShare}
                    icon="share-variant"
                    style={{ borderRadius: 12, marginTop: 8 }}
                    contentStyle={{ paddingVertical: 6 }}
                >
                    Compartir enlace
                </Button>
            </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: "flex-end", // Bottom sheet style
  },
  modalContent: {
    width: "100%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    elevation: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
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
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.6,
    marginTop: 8,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
