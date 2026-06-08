/**
 * Esqueletos de premios
 * Pantallas de carga placeholder mientras se obtienen datos de awards.
 */

import { BlurTargetView } from "expo-blur";
import { Stack } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import SquircleView from "react-native-fast-squircle";
import { useTheme } from "react-native-paper";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CustomHeader } from "@/components/ui/CustomHeader";

function useSkeletonColors() {
  const theme = useTheme();
  const block = (opacity = 0.06) =>
    theme.dark ? `rgba(255,255,255,${opacity})` : `rgba(0,0,0,${opacity})`;
  return {
    theme,
    surface: theme.colors.surfaceVariant,
    blockLight: block(0.06),
    blockMid: block(0.08),
  };
}

const SkeletonBar = React.memo<{
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: object;
}>(({ width, height, borderRadius = 8, style }) => {
  const { surface } = useSkeletonColors();
  return (
    <View
      style={[
        { width, height, borderRadius, backgroundColor: surface },
        style,
      ]}
    />
  );
});
SkeletonBar.displayName = "SkeletonBar";

const SkeletonNomineeRow = React.memo<{ index: number }>(({ index }) => {
  const { theme, blockLight, blockMid } = useSkeletonColors();
  return (
    <Animated.View entering={FadeIn.duration(400).delay(80 + index * 60)}>
      <SquircleView
        style={[
          skeletonStyles.nomineeRowCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
            borderWidth: 1,
          },
        ]}
        cornerSmoothing={1}
      >
        <View style={skeletonStyles.nomineeRowInner}>
          <View
            style={[
              skeletonStyles.avatar,
              { backgroundColor: blockLight },
            ]}
          />
          <View style={skeletonStyles.nomineeTextCol}>
            <View
              style={[
                skeletonStyles.lineMd,
                { backgroundColor: blockMid, width: "60%" },
              ]}
            />
            <View
              style={[
                skeletonStyles.lineSm,
                { backgroundColor: blockLight, width: "40%" },
              ]}
            />
          </View>
          <View
            style={[
              skeletonStyles.badge,
              { backgroundColor: blockLight },
            ]}
          />
        </View>
      </SquircleView>
    </Animated.View>
  );
});
SkeletonNomineeRow.displayName = "SkeletonNomineeRow";

interface AwardFormSkeletonProps {
  variant?: "create" | "edit";
}

export const AwardFormSkeleton = React.memo<AwardFormSkeletonProps>(
  ({ variant = "create" }) => {
    const insets = useSafeAreaInsets();
    const { theme } = useSkeletonColors();

    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <BlurTargetView
          style={[
            skeletonStyles.container,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <CustomHeader title="" showBackButton={true} />

          <ScrollView
            style={skeletonStyles.scrollView}
            contentContainerStyle={[
              skeletonStyles.content,
              { paddingBottom: 140 + insets.bottom },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              entering={FadeIn.duration(400)}
              style={skeletonStyles.titleBlock}
            >
              <SkeletonBar width={200} height={44} borderRadius={10} />
              <SkeletonBar
                width={260}
                height={16}
                borderRadius={6}
                style={{ marginTop: 8 }}
              />
            </Animated.View>

            <View
              style={[
                skeletonStyles.divider,
                { backgroundColor: theme.colors.outlineVariant },
              ]}
            />

            <Animated.View entering={FadeInDown.duration(350).delay(50)}>
              <SquircleView
                style={[
                  skeletonStyles.previewCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant,
                    borderWidth: 1,
                  },
                ]}
                cornerSmoothing={1}
              >
                <SquircleView
                  style={[
                    skeletonStyles.previewIcon,
                    { backgroundColor: theme.colors.surfaceVariant },
                  ]}
                  cornerSmoothing={1}
                />
                <SkeletonBar
                  width={160}
                  height={20}
                  borderRadius={10}
                  style={{ marginTop: 14 }}
                />
                <SkeletonBar
                  width={220}
                  height={14}
                  borderRadius={7}
                  style={{ marginTop: 8 }}
                />
              </SquircleView>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(350).delay(100)}
              style={skeletonStyles.section}
            >
              <SkeletonBar
                width={80}
                height={14}
                borderRadius={7}
                style={{ marginBottom: 10 }}
              />
              <SkeletonBar width="100%" height={48} borderRadius={16} />
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(350).delay(140)}
              style={skeletonStyles.section}
            >
              <SkeletonBar
                width={140}
                height={14}
                borderRadius={7}
                style={{ marginBottom: 10 }}
              />
              <SkeletonBar width="100%" height={88} borderRadius={16} />
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(350).delay(180)}
              style={skeletonStyles.section}
            >
              <SkeletonBar
                width={56}
                height={14}
                borderRadius={7}
                style={{ marginBottom: 10 }}
              />
              <View style={skeletonStyles.iconGrid}>
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <SquircleView
                    key={i}
                    style={[
                      skeletonStyles.iconBox,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.outlineVariant,
                        borderWidth: 1,
                      },
                    ]}
                    cornerSmoothing={1}
                  />
                ))}
              </View>
            </Animated.View>

            {variant === "create" && (
              <>
                <Animated.View
                  entering={FadeInDown.duration(350).delay(220)}
                  style={skeletonStyles.section}
                >
                  <SkeletonBar
                    width={160}
                    height={14}
                    borderRadius={7}
                    style={{ marginBottom: 10 }}
                  />
                  <SquircleView
                    style={[
                      skeletonStyles.groupedCard,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.outlineVariant,
                        borderWidth: 1,
                      },
                    ]}
                    cornerSmoothing={1}
                  >
                    {[0, 1, 2, 3, 4].map((i) => (
                      <View key={i}>
                        {i > 0 && (
                          <View
                            style={[
                              skeletonStyles.rowDivider,
                              {
                                backgroundColor: theme.colors.outlineVariant,
                              },
                            ]}
                          />
                        )}
                        <View style={skeletonStyles.optionRow}>
                          <View
                            style={[
                              skeletonStyles.optionIcon,
                              {
                                backgroundColor: theme.colors.surfaceVariant,
                              },
                            ]}
                          />
                          <View style={skeletonStyles.optionTextCol}>
                            <SkeletonBar width="55%" height={14} borderRadius={7} />
                            <SkeletonBar
                              width="75%"
                              height={11}
                              borderRadius={6}
                              style={{ marginTop: 6 }}
                            />
                          </View>
                          <View
                            style={[
                              skeletonStyles.radio,
                              {
                                backgroundColor: theme.colors.surfaceVariant,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    ))}
                  </SquircleView>
                </Animated.View>

                <Animated.View
                  entering={FadeInDown.duration(350).delay(260)}
                  style={skeletonStyles.section}
                >
                  <View style={skeletonStyles.sectionLabelRow}>
                    <SkeletonBar width={100} height={14} borderRadius={7} />
                    <SkeletonBar width={72} height={22} borderRadius={10} />
                  </View>
                  <SquircleView
                    style={[
                      skeletonStyles.groupedCard,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.outlineVariant,
                        borderWidth: 1,
                      },
                    ]}
                    cornerSmoothing={1}
                  >
                    {[0, 1, 2, 3].map((i) => (
                      <View key={i}>
                        {i > 0 && (
                          <View
                            style={[
                              skeletonStyles.rowDivider,
                              {
                                backgroundColor: theme.colors.outlineVariant,
                              },
                            ]}
                          />
                        )}
                        <View style={skeletonStyles.memberRow}>
                          <View
                            style={[
                              skeletonStyles.avatarSm,
                              {
                                backgroundColor: theme.colors.surfaceVariant,
                              },
                            ]}
                          />
                          <SkeletonBar width="50%" height={14} borderRadius={7} />
                          <View
                            style={[
                              skeletonStyles.checkbox,
                              {
                                backgroundColor: theme.colors.surfaceVariant,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    ))}
                  </SquircleView>
                </Animated.View>
              </>
            )}

            <Animated.View
              entering={FadeInDown.duration(350).delay(
                variant === "create" ? 300 : 220
              )}
              style={skeletonStyles.section}
            >
              <SkeletonBar
                width={150}
                height={14}
                borderRadius={7}
                style={{ marginBottom: 10 }}
              />
              <SquircleView
                style={[
                  skeletonStyles.groupedCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant,
                    borderWidth: 1,
                  },
                ]}
                cornerSmoothing={1}
              >
                {[0, 1, 2].map((i) => (
                  <View key={i}>
                    {i > 0 && (
                      <View
                        style={[
                          skeletonStyles.rowDivider,
                          {
                            backgroundColor: theme.colors.outlineVariant,
                          },
                        ]}
                      />
                    )}
                    <View style={skeletonStyles.optionRow}>
                      <View
                        style={[
                          skeletonStyles.optionIcon,
                          { backgroundColor: theme.colors.surfaceVariant },
                        ]}
                      />
                      <View style={skeletonStyles.optionTextCol}>
                        <SkeletonBar width="65%" height={14} borderRadius={7} />
                        <SkeletonBar
                          width="85%"
                          height={11}
                          borderRadius={6}
                          style={{ marginTop: 6 }}
                        />
                      </View>
                      <View
                        style={[
                          skeletonStyles.checkbox,
                          {
                            backgroundColor: theme.colors.surfaceVariant,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </SquircleView>
            </Animated.View>
          </ScrollView>

          <Animated.View
            entering={FadeIn.duration(400).delay(320)}
            style={[
              skeletonStyles.footer,
              {
                paddingBottom: insets.bottom + 16,
                borderTopColor: theme.colors.outlineVariant,
                backgroundColor: theme.colors.background,
              },
            ]}
          >
            <SkeletonBar width="100%" height={52} borderRadius={16} />
          </Animated.View>
        </BlurTargetView>
      </>
    );
  }
);
AwardFormSkeleton.displayName = "AwardFormSkeleton";

export const AwardDetailSkeleton = React.memo(() => {
  const insets = useSafeAreaInsets();
  const { theme } = useSkeletonColors();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <BlurTargetView
        style={[
          skeletonStyles.container,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <CustomHeader title="" showBackButton={true} />

        <ScrollView
          style={skeletonStyles.scrollView}
          contentContainerStyle={[
            skeletonStyles.content,
            { paddingBottom: 60 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={FadeIn.duration(400)}
            style={skeletonStyles.titleBlock}
          >
            <SkeletonBar width="75%" height={44} borderRadius={10} />
            <SkeletonBar
              width="55%"
              height={16}
              borderRadius={6}
              style={{ marginTop: 8 }}
            />
          </Animated.View>

          <View
            style={[
              skeletonStyles.divider,
              { backgroundColor: theme.colors.outlineVariant },
            ]}
          />

          <Animated.View entering={FadeInDown.duration(350).delay(60)}>
            <SquircleView
              style={[
                skeletonStyles.statusCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant,
                  borderWidth: 1,
                },
              ]}
              cornerSmoothing={1}
            >
              <View style={skeletonStyles.statusRow}>
                <SquircleView
                  style={[
                    skeletonStyles.statusIcon,
                    { backgroundColor: theme.colors.surfaceVariant },
                  ]}
                  cornerSmoothing={1}
                />
                <View style={skeletonStyles.statusTextCol}>
                  <SkeletonBar width={90} height={22} borderRadius={10} />
                  <SkeletonBar
                    width={120}
                    height={12}
                    borderRadius={6}
                    style={{ marginTop: 8 }}
                  />
                  <SkeletonBar
                    width={160}
                    height={12}
                    borderRadius={6}
                    style={{ marginTop: 6 }}
                  />
                </View>
              </View>
            </SquircleView>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(350).delay(120)}
            style={skeletonStyles.section}
          >
            <View style={skeletonStyles.sectionLabelRow}>
              <SkeletonBar width={110} height={18} borderRadius={9} />
              <SkeletonBar width={32} height={24} borderRadius={10} />
            </View>
            <View style={skeletonStyles.nomineeList}>
              {[0, 1, 2].map((i) => (
                <SkeletonNomineeRow key={i} index={i} />
              ))}
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(350).delay(200)}
            style={skeletonStyles.section}
          >
            <SkeletonBar
              width={130}
              height={18}
              borderRadius={9}
              style={{ marginBottom: 12 }}
            />
            <SquircleView
              style={[
                skeletonStyles.groupedCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant,
                  borderWidth: 1,
                },
              ]}
              cornerSmoothing={1}
            >
              {[0, 1, 2].map((i) => (
                <View key={i}>
                  {i > 0 && (
                    <View
                      style={[
                        skeletonStyles.rowDivider,
                        { backgroundColor: theme.colors.outlineVariant },
                      ]}
                    />
                  )}
                  <View style={skeletonStyles.adminRow}>
                    <View
                      style={[
                        skeletonStyles.optionIcon,
                        { backgroundColor: theme.colors.surfaceVariant },
                      ]}
                    />
                    <View style={skeletonStyles.optionTextCol}>
                      <SkeletonBar width="50%" height={14} borderRadius={7} />
                      <SkeletonBar
                        width="70%"
                        height={11}
                        borderRadius={6}
                        style={{ marginTop: 6 }}
                      />
                    </View>
                    <SkeletonBar width={18} height={18} borderRadius={9} />
                  </View>
                </View>
              ))}
            </SquircleView>
          </Animated.View>
        </ScrollView>
      </BlurTargetView>
    </>
  );
});
AwardDetailSkeleton.displayName = "AwardDetailSkeleton";

const skeletonStyles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 0 },

  titleBlock: { marginTop: 4, marginBottom: 4 },
  divider: { height: 1, marginTop: 16, marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  previewCard: {
    borderRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  previewIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
  },

  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  iconBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
  },

  groupedCard: {
    borderRadius: 18,
    overflow: "hidden",
  },
  rowDivider: {
    height: 1,
    marginLeft: 64,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
  },
  optionTextCol: {
    flex: 1,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  avatarSm: {
    width: 32,
    height: 32,
    borderRadius: 11,
  },

  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
  },

  statusCard: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 24,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  statusIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
  },
  statusTextCol: {
    flex: 1,
  },

  nomineeList: { gap: 10 },
  nomineeRowCard: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  nomineeRowInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
  },
  nomineeTextCol: {
    flex: 1,
    gap: 8,
  },
  lineMd: {
    height: 14,
    borderRadius: 7,
  },
  lineSm: {
    height: 11,
    borderRadius: 6,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 12,
  },

  adminRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});
