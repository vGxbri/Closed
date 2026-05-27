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
import { getMemberAvatarUrl } from '@/lib/memberProfile';
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
        style={[styles.statCardInner, { backgroundColor: theme.colors.surface }]}
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
        <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
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
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.skeletonContainer, { paddingTop: insets.top + 8 }]}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.skeletonHeader}>
        <View style={[styles.skeletonContextLabel, { backgroundColor: theme.colors.surfaceVariant }]} />
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
        <View style={[styles.skeletonSectionLabel, { backgroundColor: theme.colors.surfaceVariant }]} />
        <View style={[styles.skeletonSettingsCard, { backgroundColor: theme.colors.surface }]} />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(480)} style={{ marginTop: 24 }}>
        <View style={[styles.skeletonSectionLabel, { backgroundColor: theme.colors.surfaceVariant }]} />
        <View style={[styles.skeletonButton, { backgroundColor: theme.colors.surface }]} />
      </Animated.View>
    </View>
  );
});

ProfileSkeleton.displayName = 'ProfileSkeleton';

// ─── Main Screen ────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { group, isLoading, leaveGroup, isOwner, updateMyMembership, uploadMemberAvatar, transferOwnership } = useGroup(id as string);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const backgroundRef = useRef(null);
  const router = useRouter();
  const { showSnackbar } = useSnackbar();

  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showTransferSheet, setShowTransferSheet] = useState(false);
  const [showEditNameSheet, setShowEditNameSheet] = useState(false);
  const [showPhotoOptionsSheet, setShowPhotoOptionsSheet] = useState(false);

  const [isLeaving, setIsLeaving] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferringUserId, setTransferringUserId] = useState<string | null>(null);

  const myMembership = useMemo(() => {
    if (!group || !user) return null;
    return group.members.find((m) => m.user_id === user.id) ?? null;
  }, [group, user]);

  const displayName = useMemo(
    () => myMembership?.display_name || profile?.display_name || 'Usuario',
    [myMembership, profile],
  );

  const avatarUrl = useMemo(
    () => myMembership ? getMemberAvatarUrl(myMembership) : profile?.avatar_url ?? null,
    [myMembership, profile],
  );

  const joinedAt = myMembership?.joined_at ?? '';
  const timeSince = useMemo(() => (joinedAt ? formatTimeSince(joinedAt) : '—'), [joinedAt]);
  const joinedFormatted = useMemo(() => (joinedAt ? formatJoinedDate(joinedAt) : ''), [joinedAt]);

  const roleName = useMemo(() => {
    if (!myMembership) return '';
    switch (myMembership.role) {
      case 'owner': return 'Propietario';
      case 'admin': return 'Administrador';
      default: return 'Miembro';
    }
  }, [myMembership]);

  const roleIcon = useMemo((): keyof typeof Ionicons.glyphMap => {
    switch (myMembership?.role) {
      case 'owner': return 'shield-checkmark';
      case 'admin': return 'shield-half';
      default: return 'person';
    }
  }, [myMembership]);

  const transferableMembers = useMemo(() => {
    const members = (group?.members ?? []).filter((m) => m.user_id !== user?.id);
    return members.sort((a, b) => {
      const aPriority = a.role === 'admin' ? 0 : 1;
      const bPriority = b.role === 'admin' ? 0 : 1;
      return aPriority - bPriority;
    });
  }, [group, user?.id]);

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
      const permission = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        const request = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!request.granted) {
          showSnackbar('Permite acceso a Fotos para cambiar tu avatar', 'info');
          return;
        }
      }
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
      await updateMyMembership({ group_avatar_url: '' });
      showSnackbar('Foto de grupo eliminada', 'success');
    } catch {
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
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ProfileSkeleton />
      </View>
    );
  }

  const iconBg = theme.dark ? 'rgba(42,138,112,0.15)' : 'rgba(42,138,112,0.08)';

  return (
    <BlurTargetView ref={backgroundRef} style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 90 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Hero ─── */}
          <Animated.View entering={FadeIn.duration(500)} style={styles.heroSection}>
            <View style={styles.contextLabelSpacer} />

            <Pressable
              onPress={handlePickImage}
              style={styles.avatarWrapper}
              accessibilityRole="button"
              accessibilityLabel="Cambiar foto del grupo"
            >
              <UserAvatar uri={avatarUrl} name={displayName} size={100} borderRadius={32} />
              {isUploadingPhoto ? (
                <View style={[styles.uploadingOverlay, { borderRadius: 32 }]}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              ) : null}
            </Pressable>

            <Pressable
              onPress={() => { setEditNameValue(displayName); setShowEditNameSheet(true); }}
              style={styles.nameRow}
              accessibilityRole="button"
              accessibilityLabel="Editar alias del grupo"
            >
              <Text style={[styles.displayName, { color: theme.colors.onSurface }]} numberOfLines={1}>
                {displayName}
              </Text>
            </Pressable>

            {roleName ? (
              <SquircleView
                style={[styles.roleBadge, { backgroundColor: iconBg }]}
                cornerSmoothing={1}
              >
                <Ionicons name={roleIcon} size={12} color={theme.colors.primary} />
                <Text style={[styles.roleBadgeText, { color: theme.colors.primary }]}>
                  {roleName}
                </Text>
              </SquircleView>
            ) : null}
          </Animated.View>

          {/* ─── Stats ─── */}
          <View style={styles.statsRow}>
            <StatCard icon="calendar-outline" label="En el grupo" value={timeSince} index={0} />
            <StatCard icon="people-outline" label="Miembros" value={String(group?.member_count ?? 0)} index={1} />
          </View>

          {/* ─── Identity section ─── */}
          <Animated.View entering={FadeInDown.duration(400).delay(300)}>
            <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
              TU IDENTIDAD AQUÍ
            </Text>
            <SquircleView
              style={[styles.settingsCard, { backgroundColor: theme.colors.surface }]}
              cornerSmoothing={1}
            >
              {/* Alias */}
              <Pressable
                onPress={() => { setEditNameValue(displayName); setShowEditNameSheet(true); }}
                style={styles.settingsRow}
                accessibilityRole="button"
                accessibilityLabel="Editar alias del grupo"
              >
                <SquircleView style={[styles.settingsIconBg, { backgroundColor: iconBg }]} cornerSmoothing={1}>
                  <Ionicons name="text-outline" size={16} color={theme.colors.primary} />
                </SquircleView>
                <View style={styles.settingsRowText}>
                  <Text style={[styles.settingsRowTitle, { color: theme.colors.onSurface }]}>
                    Alias
                  </Text>
                  <Text style={[styles.settingsRowSub, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                    {myMembership?.group_display_name?.trim() || 'Sin alias'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.onSurfaceVariant} />
              </Pressable>

              <View style={[styles.settingsDivider, { backgroundColor: theme.colors.outlineVariant }]} />

              {/* Foto */}
              <Pressable
                onPress={handlePickImage}
                style={styles.settingsRow}
                accessibilityRole="button"
                accessibilityLabel="Cambiar foto del grupo"
              >
                <SquircleView style={[styles.settingsIconBg, { backgroundColor: iconBg }]} cornerSmoothing={1}>
                  <Ionicons name="camera-outline" size={16} color={theme.colors.primary} />
                </SquircleView>
                <View style={styles.settingsRowText}>
                  <Text style={[styles.settingsRowTitle, { color: theme.colors.onSurface }]}>
                    Foto
                  </Text>
                  <Text style={[styles.settingsRowSub, { color: theme.colors.onSurfaceVariant }]}>
                    {myMembership?.group_avatar_url ? 'Foto personalizada' : 'Sin foto de grupo'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.onSurfaceVariant} />
              </Pressable>
            </SquircleView>
            <Text style={[styles.sectionHint, { color: theme.colors.onSurfaceVariant }]}>
              Solo visible para los miembros de este grupo.
            </Text>
          </Animated.View>

          {/* ─── Joined date ─── */}
          {joinedFormatted !== '' && (
            <Animated.View entering={FadeInDown.duration(400).delay(380)} style={styles.joinedSection}>
              <SquircleView
                style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}
                cornerSmoothing={1}
              >
                <View style={styles.infoRow}>
                  <Ionicons name="time-outline" size={16} color={theme.colors.onSurfaceVariant} />
                  <Text style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]}>
                    Miembro desde el {joinedFormatted}
                  </Text>
                </View>
              </SquircleView>
            </Animated.View>
          )}

          {/* ─── Danger zone ─── */}
          <Animated.View entering={FadeInDown.duration(400).delay(460)} style={styles.dangerSection}>
            <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
              ZONA DE RIESGO
            </Text>
            <Pressable
              onPress={() => {
                if (isOwner) {
                  if (transferableMembers.length === 0) {
                    showSnackbar('No hay otros miembros para transferir el grupo.', 'info');
                  } else {
                    setShowTransferSheet(true);
                  }
                } else {
                  setShowLeaveDialog(true);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={isOwner ? 'Transferir grupo' : 'Abandonar grupo'}
              style={({ pressed }) => ({
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <SquircleView
                style={[
                  styles.leaveButton,
                  {
                    backgroundColor: isOwner
                      ? theme.colors.surface
                      : theme.dark ? 'rgba(239,83,80,0.10)' : 'rgba(211,47,47,0.05)',
                    borderColor: isOwner
                      ? theme.colors.outlineVariant
                      : theme.dark ? 'rgba(239,83,80,0.25)' : 'rgba(211,47,47,0.15)',
                  },
                ]}
                cornerSmoothing={1}
              >
                <Ionicons
                  name={isOwner ? 'swap-horizontal-outline' : 'log-out-outline'}
                  size={20}
                  color={isOwner ? theme.colors.onSurface : theme.colors.error}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.leaveButtonTitle, { color: isOwner ? theme.colors.onSurface : theme.colors.error }]}>
                    {isOwner ? 'Transferir propiedad' : 'Abandonar grupo'}
                  </Text>
                  <Text style={[styles.leaveButtonSub, { color: isOwner ? theme.colors.onSurfaceVariant : theme.colors.error }]}>
                    {isOwner ? 'Pasarás a ser administrador' : 'Perderás acceso al contenido privado'}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={isOwner ? theme.colors.onSurfaceVariant : theme.colors.error}
                />
              </SquircleView>
            </Pressable>
          </Animated.View>
        </ScrollView>

        {/* ─── Edit Name Sheet ─── */}
        <BottomSheetModal visible={showEditNameSheet} onDismiss={() => setShowEditNameSheet(false)}>
          <View style={styles.sheetContent}>
            <Text style={[styles.sheetTitle, { color: theme.colors.onSurface }]}>
              Alias del grupo
            </Text>
            <Text style={[styles.sheetSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              Este nombre solo lo ven los miembros de este grupo.
            </Text>
            <Input
              value={editNameValue}
              onChangeText={setEditNameValue}
              placeholder="Tu nombre aquí..."
              autoFocus
              onSubmitEditing={handleSaveName}
            />
            <View style={styles.sheetActions}>
              <Button title="Cancelar" variant="secondary" onPress={() => setShowEditNameSheet(false)} style={{ flex: 1 }} />
              <Button title="Guardar" onPress={handleSaveName} loading={isSavingName} style={{ flex: 1 }} />
            </View>
          </View>
        </BottomSheetModal>

        {/* ─── Edit Photo Sheet ─── */}
        <BottomSheetModal visible={showPhotoOptionsSheet} onDismiss={() => setShowPhotoOptionsSheet(false)}>
          <View style={styles.sheetContent}>
            <Text style={[styles.sheetTitle, { color: theme.colors.onSurface }]}>
              Foto de grupo
            </Text>
            <Text style={[styles.sheetSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              Solo se muestra en este grupo, no afecta tu perfil global.
            </Text>
            <Pressable style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.7 : 1 }]} onPress={launchPicker}>
              <Ionicons name="images-outline" size={22} color={theme.colors.onSurface} />
              <Text style={[styles.actionRowText, { color: theme.colors.onSurface }]}>
                {myMembership?.group_avatar_url ? 'Cambiar foto' : 'Elegir de la galería'}
              </Text>
            </Pressable>
            {(myMembership?.group_avatar_url || profile?.avatar_url) && (
              <Pressable style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.7 : 1 }]} onPress={handleRemoveImage}>
                <Ionicons name="close-circle-outline" size={22} color={theme.colors.error} />
                <Text style={[styles.actionRowText, { color: theme.colors.error }]}>
                  No usar foto en este grupo
                </Text>
              </Pressable>
            )}
          </View>
        </BottomSheetModal>

        {/* ─── Transfer Ownership Sheet ─── */}
        <BottomSheetModal visible={showTransferSheet} onDismiss={() => setShowTransferSheet(false)}>
          <View style={styles.sheetContent}>
            <Text style={[styles.sheetTitle, { color: theme.colors.onSurface }]}>
              Transferir propiedad
            </Text>
            <Text style={[styles.sheetSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              Elige al nuevo propietario. Tú pasarás a ser administrador.
            </Text>
            <View style={styles.adminList}>
              {transferableMembers.map((member) => {
                const memberRole = member.role === 'owner' ? 'Propietario' : member.role === 'admin' ? 'Administrador' : 'Miembro';
                return (
                  <Pressable
                    key={member.user_id}
                    disabled={isTransferring}
                    onPress={async () => {
                      if (isTransferring) return;
                      try {
                        setIsTransferring(true);
                        setTransferringUserId(member.user_id);
                        await transferOwnership(member.user_id);
                        setShowTransferSheet(false);
                        showSnackbar('Propiedad transferida correctamente.', 'success');
                      } catch {
                        showSnackbar('Error al transferir el grupo.', 'error');
                      } finally {
                        setIsTransferring(false);
                        setTransferringUserId(null);
                      }
                    }}
                    style={({ pressed }) => [
                      styles.adminItem,
                      { opacity: isTransferring ? 0.6 : pressed ? 0.7 : 1 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Transferir propiedad a ${member.display_name || 'Miembro'}`}
                  >
                    <UserAvatar
                      uri={getMemberAvatarUrl(member)}
                      name={member.display_name || member.group_display_name || 'Miembro'}
                      size={40}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.adminName, { color: theme.colors.onSurface }]}>
                        {member.display_name || member.group_display_name || 'Miembro'}
                      </Text>
                      <Text style={[styles.adminRole, { color: theme.colors.onSurfaceVariant }]}>
                        {memberRole}
                      </Text>
                    </View>
                    {transferringUserId === member.user_id
                      ? <ActivityIndicator size="small" color={theme.colors.primary} />
                      : <Ionicons name="chevron-forward" size={18} color={theme.colors.onSurfaceVariant} />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </BottomSheetModal>

        {/* ─── Leave Confirmation Dialog ─── */}
        <ConfirmDialog
          visible={showLeaveDialog}
          title="¿Abandonar grupo?"
          message={`Dejarás de ver el contenido privado de "${group?.name || 'este grupo'}". Puedes volver a unirte con un código de invitación.`}
          type="error"
          confirmText={isLeaving ? 'Saliendo...' : 'Abandonar'}
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
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    flexGrow: 1,
  },

  // ─── Hero ──────────────────────────
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  contextLabelSpacer: {
    height: 30,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 4,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  displayName: {
    fontFamily: 'Archivo-Bold',
    fontSize: 26,
    letterSpacing: -0.3,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 10,
  },
  roleBadgeText: {
    fontFamily: 'Archivo-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
  },

  // ─── Stats ─────────────────────────
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: { flex: 1 },
  statCardInner: {
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    gap: 6,
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
    fontSize: 11,
    letterSpacing: 0.2,
    textAlign: 'center',
  },

  // ─── Section labels ─────────────────
  sectionLabel: {
    fontFamily: 'Archivo-SemiBold',
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  sectionHint: {
    fontFamily: 'Archivo-Medium',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
  },

  // ─── Settings card ──────────────────
  settingsCard: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  settingsDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 62,
  },
  settingsIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsRowText: { flex: 1 },
  settingsRowTitle: {
    fontFamily: 'Archivo-SemiBold',
    fontSize: 15,
    marginBottom: 1,
  },
  settingsRowSub: {
    fontFamily: 'Archivo-Medium',
    fontSize: 12,
  },

  // ─── Info card ──────────────────────
  joinedSection: {
    marginTop: 12,
    marginBottom: 4,
  },
  infoCard: {
    padding: 14,
    borderRadius: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    fontFamily: 'Archivo-Medium',
    fontSize: 13,
    flex: 1,
  },

  // ─── Danger zone ────────────────────
  dangerSection: {
    marginTop: 24,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  leaveButtonTitle: {
    fontFamily: 'Archivo-SemiBold',
    fontSize: 15,
    marginBottom: 1,
  },
  leaveButtonSub: {
    fontFamily: 'Archivo-Medium',
    fontSize: 12,
    opacity: 0.8,
  },

  // ─── Skeleton ───────────────────────
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  skeletonHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  skeletonContextLabel: {
    width: 80,
    height: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  skeletonAvatar: {
    width: 100,
    height: 100,
    borderRadius: 32,
  },
  skeletonName: {
    width: 180,
    height: 26,
    borderRadius: 13,
    marginTop: 14,
  },
  skeletonBadge: {
    width: 80,
    height: 22,
    borderRadius: 11,
    marginTop: 10,
  },
  skeletonStat: {
    height: 106,
    borderRadius: 20,
    width: '100%',
  },
  skeletonSectionLabel: {
    width: 110,
    height: 11,
    borderRadius: 6,
    marginBottom: 10,
  },
  skeletonSettingsCard: {
    height: 110,
    borderRadius: 18,
  },
  skeletonButton: {
    height: 64,
    borderRadius: 16,
    width: '100%',
  },

  // ─── Sheet ──────────────────────────
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
    lineHeight: 20,
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
    gap: 14,
  },
  actionRowText: {
    fontFamily: 'Archivo-SemiBold',
    fontSize: 16,
  },
  adminList: { gap: 8 },
  adminItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(150,150,150,0.05)',
  },
  adminName: {
    fontFamily: 'Archivo-SemiBold',
    fontSize: 15,
    marginBottom: 1,
  },
  adminRole: {
    fontFamily: 'Archivo-Medium',
    fontSize: 12,
  },
});
