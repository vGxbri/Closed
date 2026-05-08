import { Ionicons } from '@expo/vector-icons';
import { BlurTargetView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import SquircleView from 'react-native-fast-squircle';
import { Text, useTheme } from 'react-native-paper';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheetModal } from '@/components/ui/BottomSheetModal';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { useSnackbar } from '@/components/ui/SnackbarContext';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useAuth, useGroup } from '@/hooks';

// ─── Helpers ────────────────────────────────────────────────────────────
function formatTimeSince(dateString: string): string {
  const joined = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - joined.getTime();

  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (totalDays < 1) return 'Hoy';
  if (totalDays === 1) return '1 día';
  if (totalDays < 30) return `${totalDays} días`;

  const months = Math.floor(totalDays / 30);
  if (months === 1) return '1 mes';
  if (months < 12) return `${months} meses`;

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (remainingMonths === 0) return years === 1 ? '1 año' : `${years} años`;
  return `${years}a ${remainingMonths}m`;
}

function formatJoinedDate(dateString: string): string {
  const d = new Date(dateString);
  return d.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ─── Stat Card ──────────────────────────────────────────────────────────
interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  index: number;
}

const StatCard = React.memo<StatCardProps>(({ icon, label, value, index }) => {
  const theme = useTheme();

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(200 + index * 80)}
      style={styles.statCard}
    >
      <SquircleView
        style={[
          styles.statCardInner,
          { backgroundColor: theme.colors.surface },
        ]}
        cornerSmoothing={1}
      >
        <SquircleView
          style={[
            styles.statIconBg,
            {
              backgroundColor: theme.dark
                ? 'rgba(42,138,112,0.15)'
                : 'rgba(42,138,112,0.08)',
            },
          ]}
          cornerSmoothing={1}
        >
          <Ionicons name={icon} size={18} color={theme.colors.primary} />
        </SquircleView>
        <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>
          {value}
        </Text>
        <Text
          style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}
        >
          {label}
        </Text>
      </SquircleView>
    </Animated.View>
  );
});

StatCard.displayName = 'StatCard';

// ─── Skeleton ───────────────────────────────────────────────────────────
const ProfileSkeleton = React.memo(() => {
  const theme = useTheme();

  return (
    <View style={styles.skeletonContainer}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.skeletonHeader}>
        <View style={[styles.skeletonAvatar, { backgroundColor: theme.colors.surfaceVariant }]} />
        <View style={[styles.skeletonName, { backgroundColor: theme.colors.surfaceVariant }]} />
        <View style={[styles.skeletonBadge, { backgroundColor: theme.colors.surfaceVariant }]} />
      </Animated.View>

      <View style={styles.statsRow}>
        {[0, 1].map((i) => (
          <Animated.View
            key={i}
            entering={FadeInDown.duration(400).delay(200 + i * 80)}
            style={styles.statCard}
          >
            <View style={[styles.skeletonStat, { backgroundColor: theme.colors.surface }]} />
          </Animated.View>
        ))}
      </View>

      <Animated.View entering={FadeInDown.duration(400).delay(360)}>
        <View style={[styles.skeletonInfoRow, { backgroundColor: theme.colors.surface }]} />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(440)}>
        <View style={[styles.skeletonButton, { backgroundColor: theme.colors.surfaceVariant }]} />
      </Animated.View>
    </View>
  );
});

ProfileSkeleton.displayName = 'ProfileSkeleton';

// ─── Main Screen ────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { group, isLoading, leaveGroup, isAdmin, isOwner, updateMyMembership, uploadMemberAvatar, transferOwnership } = useGroup(id as string);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const backgroundRef = useRef(null);
  const router = useRouter();
  const { showSnackbar } = useSnackbar();

  // Sheets & Dialogs
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showTransferSheet, setShowTransferSheet] = useState(false);
  const [showEditNameSheet, setShowEditNameSheet] = useState(false);
  const [showPhotoOptionsSheet, setShowPhotoOptionsSheet] = useState(false);

  // States
  const [isLeaving, setIsLeaving] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);

  // Find the current user's membership
  const myMembership = useMemo(() => {
    if (!group || !user) return null;
    return group.members.find((m) => m.user_id === user.id) ?? null;
  }, [group, user]);

  // display_name and avatar_url from the view are already coalesced
  const displayName = useMemo(
    () => myMembership?.display_name || profile?.display_name || 'Usuario',
    [myMembership, profile]
  );

  const avatarUrl = useMemo(() => {
    if (myMembership?.group_avatar_url !== undefined && myMembership?.group_avatar_url !== null) {
      return myMembership.group_avatar_url;
    }
    return profile?.avatar_url || null;
  }, [myMembership, profile]);

  const hasGroupAvatar = !!myMembership?.group_avatar_url;

  const joinedAt = myMembership?.joined_at ?? '';
  const timeSince = useMemo(
    () => (joinedAt ? formatTimeSince(joinedAt) : '—'),
    [joinedAt]
  );
  const joinedFormatted = useMemo(
    () => (joinedAt ? formatJoinedDate(joinedAt) : ''),
    [joinedAt]
  );

  const roleName = useMemo(() => {
    if (!myMembership) return '';
    switch (myMembership.role) {
      case 'owner':
        return 'Admin';
      case 'admin':
        return 'Moderador';
      default:
        return 'Miembro';
    }
  }, [myMembership]);

  // ─── Handlers ──────────────────────────────────────
  const handleLeave = useCallback(async () => {
    try {
      setIsLeaving(true);
      await leaveGroup();
      router.replace('/(tabs)/groups');
    } catch (error) {
      console.error('Error leaving group:', error);
    } finally {
      setIsLeaving(false);
      setShowLeaveDialog(false);
    }
  }, [leaveGroup, router]);

  const launchPicker = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setShowPhotoOptionsSheet(false);
        setIsUploadingPhoto(true);
        const publicUrl = await uploadMemberAvatar(result.assets[0].uri);
        await updateMyMembership({ group_avatar_url: publicUrl });
        showSnackbar('Foto actualizada', 'success');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      showSnackbar('Error al actualizar la foto', 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handlePickImage = () => {
    // Show options if there's an override or a global photo
    if (myMembership?.group_avatar_url !== null || profile?.avatar_url) {
      setShowPhotoOptionsSheet(true);
    } else {
      launchPicker();
    }
  };

  const handleRemoveImage = async () => {
    try {
      setShowPhotoOptionsSheet(false);
      setIsUploadingPhoto(true);
      // Using empty string to explicitly override global photo with "no photo" (initials)
      await updateMyMembership({ group_avatar_url: '' });
      showSnackbar('Foto de grupo eliminada', 'success');
    } catch (error) {
      showSnackbar('Error al eliminar foto', 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSaveName = async () => {
    if (!editNameValue.trim()) {
      setShowEditNameSheet(false);
      return;
    }
    try {
      setIsSavingName(true);
      await updateMyMembership({ group_display_name: editNameValue.trim() });
      showSnackbar('Alias actualizado', 'success');
      setShowEditNameSheet(false);
    } catch (error) {
      console.error('Error updating name:', error);
      showSnackbar('Error al actualizar el alias', 'error');
    } finally {
      setIsSavingName(false);
    }
  };

  // ─── Render ────────────────────────────────────────
  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ProfileSkeleton />
      </View>
    );
  }

  return (
    <BlurTargetView ref={backgroundRef} style={{ flex: 1 }}>
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom + 90,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Avatar + Name Section ─── */}
        <Animated.View
          entering={FadeIn.duration(500)}
          style={styles.headerSection}
        >
          <Pressable onPress={handlePickImage} style={styles.avatarWrapper}>
            <UserAvatar
              uri={avatarUrl}
              name={displayName}
              size={110}
              borderRadius={36}
            />
            <View
              style={[
                styles.editPhotoBadge,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Ionicons name="camera" size={16} color={theme.colors.primary} />
            </View>
            {isUploadingPhoto && (
              <View style={[StyleSheet.absoluteFill, styles.uploadingOverlay]}>
                <ActivityIndicator color="#FFF" />
              </View>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              setEditNameValue(displayName);
              setShowEditNameSheet(true);
            }}
            style={styles.nameRow}
          >
            <Text
              style={[styles.displayName, { color: theme.colors.onSurface }]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            <Ionicons name="pencil" size={16} color={theme.colors.onSurfaceVariant} style={{ marginTop: 16 }} />
          </Pressable>

          {/* Role badge */}
          {roleName && (
            <SquircleView
              style={[
                styles.roleBadge,
                {
                  backgroundColor: theme.dark
                    ? 'rgba(42,138,112,0.2)'
                    : 'rgba(42,138,112,0.1)',
                },
              ]}
              cornerSmoothing={1}
            >
              <Ionicons
                name={
                  myMembership?.role === 'owner'
                    ? 'shield-checkmark'
                    : myMembership?.role === 'admin'
                      ? 'shield-half'
                      : 'person'
                }
                size={13}
                color={theme.colors.primary}
              />
              <Text
                style={[styles.roleBadgeText, { color: theme.colors.primary }]}
              >
                {roleName}
              </Text>
            </SquircleView>
          )}
        </Animated.View>

        {/* ─── Stats Cards ─── */}
        <View style={styles.statsRow}>
          <StatCard
            icon="calendar-outline"
            label="En el grupo"
            value={timeSince}
            index={0}
          />
          <StatCard
            icon="people-outline"
            label="Miembros"
            value={String(group?.member_count ?? 0)}
            index={1}
          />
        </View>

        {/* ─── Joined Date ─── */}
        {joinedFormatted !== '' && (
          <Animated.View
            entering={FadeInDown.duration(400).delay(400)}
            style={styles.joinedSection}
          >
            <SquircleView
              style={[
                styles.infoCard,
                { backgroundColor: theme.colors.surface },
              ]}
              cornerSmoothing={1}
            >
              <View style={styles.infoRow}>
                <Ionicons
                  name="time-outline"
                  size={18}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text
                  style={[
                    styles.infoText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Miembro desde el {joinedFormatted}
                </Text>
              </View>
            </SquircleView>
          </Animated.View>
        )}

        {/* ─── Leave/Transfer Group ─── */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(500)}
          style={styles.dangerSection}
        >
          <Pressable
            onPress={() => {
              if (isOwner) {
                const otherAdmins = group?.members.filter(m => m.role === 'admin' && m.user_id !== user?.id) || [];
                if (otherAdmins.length === 0) {
                  showSnackbar('No hay otros administradores. Nombra a uno desde la lista de miembros primero.', 'info');
                } else {
                  setShowTransferSheet(true);
                }
              } else {
                setShowLeaveDialog(true);
              }
            }}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            <SquircleView
              style={[
                styles.leaveButton,
                {
                  backgroundColor: isOwner
                    ? theme.colors.surfaceVariant
                    : theme.dark
                      ? 'rgba(239,83,80,0.12)'
                      : 'rgba(211,47,47,0.06)',
                  borderColor: isOwner
                    ? theme.colors.outlineVariant
                    : theme.dark
                      ? 'rgba(239,83,80,0.25)'
                      : 'rgba(211,47,47,0.15)',
                },
              ]}
              cornerSmoothing={1}
            >
              <Ionicons
                name={isOwner ? 'swap-horizontal-outline' : 'log-out-outline'}
                size={20}
                color={isOwner ? theme.colors.onSurface : theme.colors.error}
              />
              <Text
                style={[
                  styles.leaveButtonText,
                  { color: isOwner ? theme.colors.onSurface : theme.colors.error },
                ]}
              >
                {isOwner ? 'Transferir grupo' : 'Abandonar grupo'}
              </Text>
            </SquircleView>
          </Pressable>
        </Animated.View>
      </ScrollView>

      {/* ─── Edit Name Sheet ─── */}
      <BottomSheetModal
        visible={showEditNameSheet}
        onDismiss={() => setShowEditNameSheet(false)}
      >
        <View style={styles.sheetContent}>
          <Text style={[styles.sheetTitle, { color: theme.colors.onSurface }]}>
            Alias del grupo
          </Text>
          <Text style={[styles.sheetSubtitle, { color: theme.colors.onSurfaceVariant }]}>
            Este nombre solo será visible para los miembros de este grupo.
          </Text>
          <Input
            value={editNameValue}
            onChangeText={setEditNameValue}
            placeholder="Introduce un nombre..."
            autoFocus
            onSubmitEditing={handleSaveName}
          />
          <View style={styles.sheetActions}>
            <Button
              title="Cancelar"
              variant="secondary"
              onPress={() => setShowEditNameSheet(false)}
              style={{ flex: 1 }}
            />
            <Button
              title="Guardar"
              onPress={handleSaveName}
              loading={isSavingName}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </BottomSheetModal>

      {/* ─── Edit Photo Sheet ─── */}
      <BottomSheetModal
        visible={showPhotoOptionsSheet}
        onDismiss={() => setShowPhotoOptionsSheet(false)}
      >
        <View style={styles.sheetContent}>
          <Text style={[styles.sheetTitle, { color: theme.colors.onSurface }]}>
            Foto de grupo
          </Text>
          <Text style={[styles.sheetSubtitle, { color: theme.colors.onSurfaceVariant }]}>
            Cambia o elimina tu foto para este grupo.
          </Text>

          <Pressable
            style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.7 : 1 }]}
            onPress={launchPicker}
          >
            <Ionicons name="images-outline" size={24} color={theme.colors.onSurface} />
            <Text style={[styles.actionRowText, { color: theme.colors.onSurface }]}>
              {myMembership?.group_avatar_url ? 'Cambiar foto' : 'Elegir de la galería'}
            </Text>
          </Pressable>

          {(myMembership?.group_avatar_url || profile?.avatar_url) && (
            <Pressable
              style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.7 : 1 }]}
              onPress={handleRemoveImage}
            >
              <Ionicons name="close-circle-outline" size={24} color={theme.colors.error} />
              <Text style={[styles.actionRowText, { color: theme.colors.error }]}>
                No usar foto en este grupo
              </Text>
            </Pressable>
          )}
        </View>
      </BottomSheetModal>

      {/* ─── Transfer Ownership Sheet ─── */}
      <BottomSheetModal
        visible={showTransferSheet}
        onDismiss={() => setShowTransferSheet(false)}
      >
        <View style={styles.sheetContent}>
          <Text style={[styles.sheetTitle, { color: theme.colors.onSurface }]}>
            Transferir Propiedad
          </Text>
          <Text style={[styles.sheetSubtitle, { color: theme.colors.onSurfaceVariant }]}>
            Selecciona al nuevo propietario del grupo:
          </Text>

          <View style={styles.adminList}>
            {(group?.members.filter(m => m.role === 'admin' && m.user_id !== user?.id) || []).map((admin) => (
              <Pressable
                key={admin.user_id}
                onPress={async () => {
                  try {
                    await transferOwnership(admin.user_id);
                    setShowTransferSheet(false);
                    showSnackbar('Has transferido la propiedad del grupo.', 'success');
                  } catch (err) {
                    showSnackbar('Error al transferir el grupo.', 'error');
                  }
                }}
                style={({ pressed }) => [
                  styles.adminItem,
                  { opacity: pressed ? 0.7 : 1 }
                ]}
              >
                <UserAvatar
                  uri={admin.avatar_url || admin.group_avatar_url}
                  name={admin.display_name || admin.group_display_name || 'Admin'}
                  size={40}
                />
                <Text style={[styles.adminName, { color: theme.colors.onSurface }]}>
                  {admin.display_name || admin.group_display_name || 'Admin'}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.onSurfaceVariant} />
              </Pressable>
            ))}
          </View>
        </View>
      </BottomSheetModal>

      {/* ─── Leave Confirmation Dialog ─── */}
      <ConfirmDialog
        visible={showLeaveDialog}
        title="¿Abandonar grupo?"
        message={`Dejarás de ver el contenido de "${group?.name || 'este grupo'}". Puedes volver a unirte con un código de invitación.`}
        type="error"
        confirmText="Abandonar"
        cancelText="Cancelar"
        onConfirm={handleLeave}
        onCancel={() => setShowLeaveDialog(false)}
        blurTargetRef={backgroundRef}
      />
      </View>
    </BlurTargetView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    flexGrow: 1,
    justifyContent: 'center',
  },

  // ─── Header / Avatar ──────────────
  headerSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarWrapper: {
    position: 'relative',
  },
  editPhotoBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadingOverlay: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  displayName: {
    fontFamily: 'Archivo-Bold',
    fontSize: 26,
    marginTop: 16,
    letterSpacing: -0.3,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 10,
  },
  roleBadgeText: {
    fontFamily: 'Archivo-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
  },

  // ─── Stats ────────────────────────
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
  },
  statCardInner: {
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    gap: 8,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'Archivo-Bold',
    fontSize: 20,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontFamily: 'Archivo-Medium',
    fontSize: 12,
    letterSpacing: 0.2,
  },

  // ─── Info Card ────────────────────
  joinedSection: {
    marginBottom: 16,
  },
  infoCard: {
    padding: 16,
    borderRadius: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    fontFamily: 'Archivo-Medium',
    fontSize: 14,
    flex: 1,
  },

  // ─── Danger Zone ──────────────────
  dangerSection: {
    marginTop: 16,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  leaveButtonText: {
    fontFamily: 'Archivo-SemiBold',
    fontSize: 15,
  },

  // ─── Skeleton ─────────────────────
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  skeletonHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  skeletonAvatar: {
    width: 110,
    height: 110,
    borderRadius: 36,
  },
  skeletonName: {
    width: 180,
    height: 28,
    borderRadius: 14,
    marginTop: 16,
  },
  skeletonBadge: {
    width: 80,
    height: 24,
    borderRadius: 12,
    marginTop: 10,
  },
  skeletonStat: {
    height: 110,
    borderRadius: 20,
    width: '100%',
  },
  skeletonInfoRow: {
    height: 54,
    borderRadius: 16,
    width: '100%',
    marginBottom: 16,
  },
  skeletonButton: {
    height: 52,
    borderRadius: 16,
    width: '100%',
  },

  // ─── Sheet ────────────────────────
  sheetContent: {
    padding: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  sheetTitle: {
    fontFamily: 'Archivo-Bold',
    fontSize: 22,
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontFamily: 'Archivo-Medium',
    fontSize: 14,
    marginBottom: 20,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 16,
  },
  actionRowText: {
    fontFamily: 'Archivo-SemiBold',
    fontSize: 16,
  },
  adminList: {
    gap: 8,
  },
  adminItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(150,150,150,0.05)',
  },
  adminName: {
    fontFamily: 'Archivo-SemiBold',
    fontSize: 16,
    flex: 1,
    marginLeft: 12,
  },
});
