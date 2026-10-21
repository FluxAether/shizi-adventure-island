import { router } from 'expo-router';
import { useState } from 'react';

import { FloatingView, PulseView } from '@/components/animated';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { AppIcon, type AppIconName } from '@/components/app-icon';
import { AppScreen } from '@/components/app-screen';
import { IslandArt } from '@/components/island-art';
import { PrimaryButton } from '@/components/primary-button';
import { ProgressHeader } from '@/components/progress-header';
import { RewardOverlay } from '@/components/reward-overlay';
import { adventureLevelId } from '@/content/adventure';
import { selectProgress, selectRewards, selectSettings, useAppStore } from '@/store/use-app-store';
import { colors, fonts, radii, spacing } from '@/theme/tokens';
import type { GameId } from '@/types/progress';
type GameDefinition = { id: GameId; title: string; hint: string; icon: AppIconName; color: string };

function DriftingCloud({ style, distance = 16, duration = 3500 }: { style: StyleProp<ViewStyle>; distance?: number; duration?: number }) {
  return <FloatingView axis="x" symmetric distance={distance} duration={duration} style={style} />;
}

const games: GameDefinition[] = [
  { id: 'listen', title: '听音选字', hint: '听一听，找到它', icon: 'volume', color: colors.orangeSoft },
  { id: 'memory', title: '翻翻乐', hint: '帮汉字找朋友', icon: 'cards', color: colors.blueSoft },
  { id: 'word-drag', title: '拖拽组词', hint: '把字送回家', icon: 'check', color: colors.greenSoft },
  { id: 'challenge', title: '闯关挑战', hint: '十题小冒险', icon: 'trophy', color: colors.yellowSoft },
];

function GameCard({
  game,
  hint,
  wide,
  fullWidth,
  onPress,
}: {
  game: GameDefinition;
  hint: string;
  wide: boolean;
  fullWidth: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={game.title}
      onPress={onPress}
      style={({ pressed }) => ({
        width: wide ? '23%' : fullWidth ? '100%' : '48%',
        minWidth: wide ? 160 : 0,
        minHeight: 118,
        borderRadius: radii.xl,
        borderCurve: 'continuous',
        padding: 14,
        backgroundColor: game.color,
        justifyContent: 'space-between',
        opacity: pressed ? 0.92 : 1,
        transform: [{ translateY: pressed ? 4 : 0 }, { scale: pressed ? 0.97 : 1 }],
        boxShadow: '0 6px 0 #CBDCE9',
      })}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppIcon name={game.icon} color={colors.blueDeep} />
      </View>
      <View style={{ gap: 2 }}>
        <Text style={{ color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 16 }}>{game.title}</Text>
        <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12 }}>{hint}</Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const wide = width > height || width >= 768;
  const progress = useAppStore(selectProgress);
  const rewards = useAppStore(selectRewards);
  const settings = useAppStore(selectSettings);
  const [limitMessage, setLimitMessage] = useState(false);
  const dailyLimitReached = progress.activeSeconds >= settings.studyDurationMinutes * 60;
  const islandNumber = Math.min(8, Math.floor(progress.unlockedAdventureLevel / 10) + 1);
  const levelOnIsland = (progress.unlockedAdventureLevel % 10) + 1;
  const currentLevelLearned = progress.currentLevelLearned;
  const currentLevelSize = progress.currentLevelSize;
  const challengeUnlocked = currentLevelSize > 0 && currentLevelLearned >= currentLevelSize;
  const remainingToLearn = Math.max(0, currentLevelSize - currentLevelLearned);
  const adventureHint = challengeUnlocked
    ? '本关汉字练完啦，去闯关挑战，答对 7 题过关'
    : currentLevelLearned === 0
      ? `本关 0/${currentLevelSize} · 先认识这些字`
      : remainingToLearn > 0
        ? `还差 ${remainingToLearn} 个字就能去闯关`
        : `本关进度 ${currentLevelLearned}/${currentLevelSize}`;
  const unlockAtFor = (id: GameId) => (id === 'listen' ? 0 : id === 'memory' ? 1 : 10);
  const isLocked = (id: GameId) =>
    id === 'challenge' ? !challengeUnlocked : progress.totalSeen < unlockAtFor(id);
  const unlockedGames = games.filter((game) => !isLocked(game.id));
  const nextLocked = games.find((game) => isLocked(game.id));
  const featuredGame = unlockedGames[unlockedGames.length - 1] ?? games[0];

  const openGame = (gameId: GameId) => {
    if (dailyLimitReached) {
      setLimitMessage(true);
      return;
    }
    router.push({
      pathname: '/(study)/game/[gameId]',
      params: { gameId, levelId: adventureLevelId(progress.unlockedAdventureLevel) },
    });
  };

  const startAdventure = () => {
    if (dailyLimitReached) {
      setLimitMessage(true);
      return;
    }
    router.push('/(tabs)/cards');
  };

  return (
    <AppScreen contentStyle={{ paddingBottom: 120 }}>
      <ProgressHeader streak={progress.streakDays} stars={rewards.stars} title="今日进度" />

      <View
        style={{
          minHeight: wide ? 420 : 520,
          borderRadius: radii.hero,
          borderCurve: 'continuous',
          overflow: 'hidden',
          backgroundColor: colors.blueSoft,
        }}
      >
        <LinearGradient
          colors={['#7EC8FF', '#B8E4FF', '#D9F3C8', '#8ED37A']}
          locations={[0, 0.42, 0.72, 1]}
          style={{ position: 'absolute', inset: 0 }}
        />
        <DriftingCloud distance={18} duration={4000} style={{ position: 'absolute', top: 28, left: 28, width: 84, height: 28, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.7)' }} />
        <DriftingCloud distance={-14} duration={3200} style={{ position: 'absolute', top: 56, right: 36, width: 58, height: 22, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.55)' }} />
        <DriftingCloud distance={12} duration={4500} style={{ position: 'absolute', top: 92, left: 72, width: 120, height: 18, borderRadius: 12, backgroundColor: 'rgba(255,213,79,0.55)' }} />

        <View
          style={{
            flex: 1,
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.xxl,
            paddingBottom: spacing.xl,
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.lg,
          }}
        >
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Text style={{ color: colors.blueDeep, fontFamily: fonts.bodyBold, fontSize: 15 }}>
              第 {islandNumber} 岛 · 第 {levelOnIsland} 关
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <Image
                accessible={false}
                contentFit="contain"
                source={require('../../assets/images/splash-icon.png')}
                style={{ width: wide ? 64 : 56, height: wide ? 64 : 56 }}
              />
              <Text
                selectable
                style={{
                  color: colors.ink,
                  fontFamily: fonts.display,
                  fontSize: wide ? 40 : 34,
                  lineHeight: wide ? 48 : 42,
                  textAlign: 'center',
                }}
              >
                识字冒险岛
              </Text>
            </View>
          </View>

          <FloatingView distance={-10} duration={2200}>
            <IslandArt width={wide ? 360 : 300} height={wide ? 240 : 200} />
          </FloatingView>

          <View style={{ width: '100%', maxWidth: 360, alignItems: 'center', gap: 12 }}>
            <PulseView scaleTo={1.03} duration={1400} style={{ width: '100%' }}>
              <PrimaryButton
                title="开始冒险"
                icon={<AppIcon name="play" color={colors.ink} />}
                onPress={startAdventure}
              />
            </PulseView>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`去玩${featuredGame.title}`}
              onPress={() => openGame(featuredGame.id)}
              style={({ pressed }) => ({
                minHeight: 52,
                borderRadius: radii.pill,
                backgroundColor: 'rgba(255,255,255,0.9)',
                paddingHorizontal: 18,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: pressed ? 0.85 : 1,
                boxShadow: '0 4px 0 rgba(0,98,159,0.12)',
              })}
            >
              <AppIcon name={featuredGame.icon} color={colors.blueDeep} size={20} />
              <Text style={{ color: colors.blueDeep, fontFamily: fonts.bodyBold, fontSize: 16 }}>
                先玩{featuredGame.title}
              </Text>
            </Pressable>
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.82)',
                borderRadius: radii.pill,
                paddingHorizontal: 16,
                paddingVertical: 8,
              }}
            >
              <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 15, textAlign: 'center' }}>
                {adventureHint}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={{ gap: 12 }}>
        <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 26 }}>现在能玩</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {unlockedGames.map((game) => {
            const hint = game.id === 'challenge' ? '答对 7 题即可通关' : game.hint;
            return (
              <GameCard
                key={game.id}
                game={game}
                hint={hint}
                wide={wide}
                fullWidth={unlockedGames.length === 1}
                onPress={() => openGame(game.id)}
              />
            );
          })}
          {nextLocked ? (
            <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 15, width: '100%' }}>
              {nextLocked.id === 'challenge'
                ? `再学 ${Math.max(0, currentLevelSize - currentLevelLearned)} 个本关字就能闯关`
                : `再认识 ${Math.max(0, unlockAtFor(nextLocked.id) - progress.totalSeen)} 个字解锁${nextLocked.title}`}
            </Text>
          ) : null}
        </View>
      </View>

      <RewardOverlay
        visible={limitMessage}
        title="今天已经很棒啦！"
        message="明天再来冒险吧！"
        tone="info"
        onDismiss={() => setLimitMessage(false)}
      />
    </AppScreen>
  );
}
