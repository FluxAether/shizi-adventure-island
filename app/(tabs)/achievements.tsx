import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AppIcon, type AppIconName } from '@/components/app-icon';
import { AppScreen } from '@/components/app-screen';
import { RewardOverlay } from '@/components/reward-overlay';
import { ACHIEVEMENTS } from '@/content';
import {
  claimAchievement,
  loadAchievementStates,
  unlockAchievement,
} from '@/services/progress';
import {
  selectProgress,
  selectRewards,
  useAppStore,
} from '@/store/use-app-store';
import { colors, fonts, radii, spacing } from '@/theme/tokens';
import type { AchievementState } from '@/types/progress';

function currentValue(kind: string, progress: ReturnType<typeof selectProgress>): number {
  switch (kind) {
    case 'characters':
      return progress.masteredCount;
    case 'stars':
      return progress.lifetimeStars;
    case 'games':
      return Math.max(0, progress.gameRoundsCompleted);
    case 'islands':
      return Math.floor(progress.unlockedAdventureLevel / 10) + (progress.unlockedAdventureLevel >= 79 ? 1 : 0);
    case 'streak':
      return progress.streakDays;
    default:
      return 0;
  }
}

function getAchievementIcon(kind: string, id: string): AppIconName {
  if (id.includes('hanzi') || kind === 'characters') return 'explore';
  if (kind === 'streak') return 'fire';
  if (kind === 'stars') return 'star';
  if (kind === 'games') return 'psychology';
  if (kind === 'islands') return 'explore';
  return 'trophy';
}

function getUnitText(kind: string, threshold: number): string {
  switch (kind) {
    case 'characters':
      return `${threshold}个汉字`;
    case 'stars':
      return `${threshold}颗星`;
    case 'games':
      return `${threshold}局游戏`;
    case 'islands':
      return `${threshold}座岛`;
    case 'streak':
      return `${threshold}天`;
    default:
      return `${threshold}`;
  }
}

export default function AchievementsScreen() {
  const { width, height } = useWindowDimensions();
  const wide = width > height || width >= 768;
  const progress = useAppStore(selectProgress);
  const rewards = useAppStore(selectRewards);
  const refreshAppState = useAppStore((state) => state.refreshAppState);
  const [states, setStates] = useState<AchievementState[]>([]);
  const [message, setMessage] = useState<{ title: string; body: string; stars?: number } | null>(null);

  const reload = useCallback(async () => {
    for (const achievement of ACHIEVEMENTS) {
      const value = currentValue(achievement.kind, progress);
      if (value >= achievement.threshold) {
        await unlockAchievement({
          achievementId: achievement.id,
          stars: achievement.stars,
        }).catch(() => undefined);
      }
    }
    setStates(await loadAchievementStates());
  }, [progress]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void reload()
        .catch(() => {
          if (!cancelled) {
            setMessage({ title: '荣誉墙还没准备好', body: '请稍后再来看看。' });
          }
        });
    });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const byId = useMemo(
    () => new Map(states.map((item) => [item.achievementId, item])),
    [states],
  );

  const claimable = ACHIEVEMENTS.find((achievement) => {
    const state = byId.get(achievement.id);
    const value = currentValue(achievement.kind, progress);
    const unlocked = Boolean(state) || value >= achievement.threshold;
    return unlocked && state?.claimedAt == null;
  });

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <AppScreen contentStyle={{ paddingBottom: 120 }}>
      {/* Top Navigation Bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回"
          onPress={goBack}
          style={({ pressed }) => ({
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 0 rgba(0, 98, 159, 0.1)',
            transform: [{ scale: pressed ? 0.95 : 1 }],
          })}
        >
          <AppIcon name="arrow_back" size={24} color={colors.blueDeep} />
        </Pressable>

        <Text style={{ color: colors.blueDeep, fontFamily: fonts.bodyBold, fontSize: 22, textAlign: 'center' }}>
          荣誉墙
        </Text>

        <View
          style={{
            minHeight: 40,
            borderRadius: radii.pill,
            backgroundColor: 'rgba(255, 185, 97, 0.2)',
            borderWidth: 2,
            borderColor: '#FFB961',
            paddingHorizontal: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 4px 0 rgba(255, 185, 97, 0.3)',
          }}
        >
          <AppIcon name="stars" size={20} color={colors.orangeDeep} />
          <Text style={{ color: colors.orangeDeep, fontFamily: fonts.bodyBold, fontSize: 16 }}>
            {rewards.stars}
          </Text>
        </View>
      </View>

      {/* Hero Header Section */}
      <View style={{ alignItems: 'center', paddingVertical: spacing.md, position: 'relative' }}>
        <View style={{ position: 'absolute', top: -4, left: wide ? '35%' : '18%', transform: [{ rotate: '-12deg' }] }}>
          <AppIcon name="star" size={44} color="#FFB961" />
        </View>
        <View style={{ position: 'absolute', top: 4, right: wide ? '35%' : '18%', transform: [{ rotate: '12deg' }] }}>
          <AppIcon name="sparkle" size={36} color="#4FACFE" />
        </View>

        <Text style={{ color: '#004A7A', fontFamily: fonts.display, fontSize: 36, textAlign: 'center', marginTop: 12 }}>
          我的成就
        </Text>
        <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 15, textAlign: 'center', marginTop: 6 }}>
          继续探索和学习，解锁更多闪亮的勋章吧！
        </Text>
      </View>

      {/* Unlocked Reward Claim Banner */}
      {claimable ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`领取${claimable.title}`}
          onPress={() => {
            void claimAchievement(claimable.id)
              .then(async (result) => {
                await refreshAppState();
                await reload();
                setMessage(
                  result.claimed
                    ? { title: '徽章点亮啦！', body: claimable.title, stars: claimable.stars }
                    : { title: '已经领过啦', body: '继续去认识新汉字吧。' },
                );
              })
              .catch(() => setMessage({ title: '领取失败了', body: '再试一次吧～' }));
          }}
          style={({ pressed }) => ({
            minHeight: 72,
            borderRadius: radii.xl,
            backgroundColor: '#E89409',
            paddingHorizontal: 20,
            paddingVertical: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            boxShadow: '0 8px 0 #865300',
            transform: [{ translateY: pressed ? 4 : 0 }],
          })}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AppIcon name="redeem" size={28} color={colors.surface} />
          </View>

          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: colors.surface, fontFamily: fonts.bodyBold, fontSize: 17 }}>
              新奖励已解锁！
            </Text>
            <Text style={{ color: 'rgba(255, 255, 255, 0.92)', fontFamily: fonts.body, fontSize: 13 }}>
              点击领取惊喜礼物：{claimable.title}
            </Text>
          </View>

          <AppIcon name="arrow_forward" size={24} color={colors.surface} />
        </Pressable>
      ) : null}

      {/* Achievement Cards Grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        {ACHIEVEMENTS.map((achievement) => {
          const state = byId.get(achievement.id);
          const value = currentValue(achievement.kind, progress);
          const unlocked = Boolean(state) || value >= achievement.threshold;
          const claimed = state?.claimedAt != null;
          const progressRatio = Math.min(1, value / achievement.threshold);
          const iconName = getAchievementIcon(achievement.kind, achievement.id);

          return (
            <View
              key={achievement.id}
              style={{
                width: wide ? '31%' : '47%',
                minHeight: 210,
                borderRadius: radii.xl,
                backgroundColor: unlocked ? colors.surface : 'rgba(224, 226, 233, 0.5)',
                borderWidth: unlocked ? 0 : 2,
                borderColor: '#BFC7D3',
                borderStyle: unlocked ? 'solid' : 'dashed',
                padding: spacing.lg,
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: unlocked ? '0 6px 0 rgba(0, 98, 159, 0.1), 0 10px 20px rgba(0, 0, 0, 0.05)' : 'none',
              }}
            >
              {/* Medal Header */}
              <View style={{ alignItems: 'center', gap: 10, width: '100%' }}>
                {claimed ? (
                  <LinearGradient
                    colors={['#FFD54F', '#FFB300']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 36,
                      borderWidth: 4,
                      borderColor: '#FFF3E0',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 6px 12px rgba(255, 179, 0, 0.35)',
                    }}
                  >
                    <AppIcon name={iconName} size={36} color={colors.surface} />
                  </LinearGradient>
                ) : unlocked ? (
                  <LinearGradient
                    colors={['#E0E0E0', '#BDBDBD']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 36,
                      borderWidth: 4,
                      borderColor: '#FAFAFA',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 6px 12px rgba(158, 158, 158, 0.3)',
                    }}
                  >
                    <AppIcon name={iconName} size={36} color={colors.surface} />
                  </LinearGradient>
                ) : (
                  <View
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 36,
                      backgroundColor: '#E0E2E9',
                      borderWidth: 4,
                      borderColor: '#F8F9FF',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    <AppIcon name={iconName} size={36} color="#707882" />
                    <View
                      style={{
                        position: 'absolute',
                        bottom: -4,
                        right: -4,
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: colors.surface,
                        borderWidth: 1,
                        borderColor: '#BFC7D3',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      }}
                    >
                      <AppIcon name="lock" size={14} color="#707882" />
                    </View>
                  </View>
                )}

                <View style={{ alignItems: 'center', gap: 2 }}>
                  <Text style={{ color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 16, textAlign: 'center' }}>
                    {achievement.title}
                  </Text>
                  <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12, textAlign: 'center' }}>
                    {achievement.description}
                  </Text>
                </View>
              </View>

              {/* Status / Progress Bar Footer */}
              <View style={{ width: '100%', marginTop: 8 }}>
                {claimed ? (
                  <View
                    style={{
                      alignSelf: 'center',
                      backgroundColor: 'rgba(255, 185, 97, 0.2)',
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                      borderRadius: radii.pill,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <AppIcon name="check_circle" size={16} color="#865300" />
                    <Text style={{ color: '#865300', fontFamily: fonts.bodyBold, fontSize: 12 }}>
                      已达成
                    </Text>
                  </View>
                ) : unlocked ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`领取${achievement.title}`}
                    onPress={() => {
                      void claimAchievement(achievement.id)
                        .then(async (result) => {
                          await refreshAppState();
                          await reload();
                          setMessage(
                            result.claimed
                              ? { title: '徽章点亮啦！', body: achievement.title, stars: achievement.stars }
                              : { title: '已经领过啦', body: '继续去认识新汉字吧。' },
                          );
                        })
                        .catch(() => setMessage({ title: '领取失败了', body: '再试一次吧～' }));
                    }}
                    style={({ pressed }) => ({
                      height: 36,
                      borderRadius: radii.pill,
                      backgroundColor: '#E89409',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 14,
                      boxShadow: '0 4px 0 #865300',
                      transform: [{ translateY: pressed ? 2 : 0 }],
                    })}
                  >
                    <Text style={{ color: colors.surface, fontFamily: fonts.bodyBold, fontSize: 13 }}>
                      领取 +{achievement.stars}★
                    </Text>
                  </Pressable>
                ) : (
                  <View style={{ gap: 4, opacity: 0.75 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 }}>
                      <Text style={{ color: '#00629F', fontFamily: fonts.bodyBold, fontSize: 11 }}>
                        {Math.min(value, achievement.threshold)}
                      </Text>
                      <Text style={{ color: '#00629F', fontFamily: fonts.bodyBold, fontSize: 11 }}>
                        {getUnitText(achievement.kind, achievement.threshold)}
                      </Text>
                    </View>
                    <View style={{ height: 10, borderRadius: radii.pill, backgroundColor: '#E0E2E9', overflow: 'hidden' }}>
                      <View
                        style={{
                          width: `${Math.max(4, progressRatio * 100)}%`,
                          height: '100%',
                          backgroundColor: '#9CF49C',
                          borderRadius: radii.pill,
                        }}
                      />
                    </View>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>

      <RewardOverlay
        visible={message !== null}
        title={message?.title ?? ''}
        message={message?.body ?? ''}
        stars={message?.stars}
        tone={message?.stars ? 'achievement' : 'info'}
        onDismiss={() => setMessage(null)}
      />
    </AppScreen>
  );
}


