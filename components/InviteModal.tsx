/**
 * Modal de invitación
 * Permite copiar o compartir el enlace y código para unirse a un grupo.
 */

import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useState } from "react";
import {
  AccessibilityInfo,
  Pressable,
  Share,
  StyleSheet,
  View,
} from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";

import { CTAButton } from "@/components/ui/CTAButton";
import {
  getGroupInviteUrl,
  getInviteShareMessage,
  normalizeInviteCode,
} from "@/lib/inviteLink";
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
  const [copied, setCopied] = useState(false);

  const inviteCodeNormalized = useMemo(
    () => normalizeInviteCode(inviteCode) ?? inviteCode,
    [inviteCode],
  );
  const appLink = useMemo(
    () => getGroupInviteUrl(inviteCodeNormalized),
    [inviteCodeNormalized],
  );

  // La confirmación de copiado vuelve a su estado normal al cabo de un momento
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(inviteCodeNormalized);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    AccessibilityInfo.announceForAccessibility("Código copiado");
    setCopied(true);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: getInviteShareMessage(groupName, inviteCodeNormalized),
        title: `Únete a ${groupName} en Closed`,
        url: appLink,
      });
    } catch {}
  };

  const characters = inviteCodeNormalized.split("");
  // El código se muestra partido en dos mitades, igual que en la pantalla donde se escribe
  const half = Math.ceil(characters.length / 2);
  const boxFill = theme.dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)";
  const hintColor = copied
    ? theme.colors.primary
    : theme.colors.onSurfaceVariant;

  return (
    <BottomSheetModal
      visible={visible}
      onDismiss={onClose}
      contentStyle={styles.sheetContent}
    >
      <View
        accessible
        accessibilityRole="header"
        accessibilityLabel={`Invita a gente a ${groupName}`}
      >
        <Text style={[styles.titleLead, { color: theme.colors.onSurface }]}>
          Invita a gente a
        </Text>
        <Text
          style={[styles.titleGroup, { color: theme.colors.primary }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {groupName}
        </Text>
      </View>

      <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        Pásales este código o comparte la invitación para que se unan.
      </Text>

      <Pressable
        onPress={handleCopyCode}
        accessibilityRole="button"
        accessibilityLabel={`Código ${characters.join(" ")}`}
        accessibilityHint="Copia el código"
        style={({ pressed }) => [
          styles.codeBlock,
          { transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
      >
        <View style={styles.codeRow}>
          {characters.map((character, index) => (
            <SquircleView
              key={index}
              style={[
                styles.codeBox,
                index === half - 1 && styles.codeBoxBeforeGap,
                { backgroundColor: boxFill },
              ]}
              cornerSmoothing={1}
            >
              <Text
                maxFontSizeMultiplier={1.2}
                style={[styles.codeChar, { color: theme.colors.onSurface }]}
              >
                {character}
              </Text>
            </SquircleView>
          ))}
        </View>

        <View style={styles.copyHint}>
          <Ionicons
            name={copied ? "checkmark-circle" : "copy-outline"}
            size={15}
            color={hintColor}
          />
          <Text style={[styles.copyHintText, { color: hintColor }]}>
            {copied ? "Código copiado" : "Toca para copiar"}
          </Text>
        </View>
      </Pressable>

      <CTAButton
        title="Compartir invitación"
        iconName="share-outline"
        onPress={handleShare}
      />
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  sheetContent: {
    paddingHorizontal: 22,
    paddingBottom: 34,
  },
  titleLead: {
    fontFamily: "Archivo-Bold",
    fontSize: 20,
    lineHeight: 25,
    marginTop: 4,
  },
  titleGroup: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontFamily: "Archivo-Regular",
    fontSize: 15,
    lineHeight: 21,
    marginTop: 6,
  },
  codeBlock: {
    marginTop: 22,
    marginBottom: 24,
  },
  codeRow: {
    flexDirection: "row",
    gap: 8,
  },
  codeBox: {
    flex: 1,
    aspectRatio: 0.8,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  codeBoxBeforeGap: {
    marginRight: 10,
  },
  codeChar: {
    fontFamily: "Archivo-Bold",
    fontSize: 28,
  },
  copyHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
  },
  copyHintText: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 13,
  },
});
