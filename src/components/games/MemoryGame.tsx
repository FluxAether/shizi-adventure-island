import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Path, Pattern, Rect } from "react-native-svg";

import { AppIcon } from "@/components/app-icon";
import { StarBurst } from "@/components/animated";
import {
  concealMemoryMismatch,
  createMemoryDeck,
  createMemoryState,
  MEMORY_MISMATCH_DELAY_MS,
  selectMemoryCard,
  type MemoryCard,
} from "@/game-logic/memory";
import { colors, fonts, radii } from "@/theme/tokens";

import { CompletionPanel } from "./GameScaffold";
import type { GameProps } from "./types";

const CONFETTI_COLORS = ["#FF6B6B", "#FFD54F", "#4FACFE", "#66BB6A", "#FFA726", "#CE93D8", "#FF8A80"];
const CONFETTI_PIECES = Array.from({ length: 28 }, (_, index) => ({
  id: index,
  left: 4 + ((index * 17) % 92),
  delay: (index % 7) * 70,
  duration: 1400 + (index % 5) * 180,
  drift: (index % 2 === 0 ? 1 : -1) * (18 + (index % 6) * 8),
  spin: 220 + (index % 8) * 40,
  size: 8 + (index % 4) * 3,
  color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
}));

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function MemoryGame({ characters, onFirstAnswer, onInteraction, onComplete, onExit }: GameProps) {
  const deck = useMemo(() => createMemoryDeck(characters), [characters]);
  const [gameState, setGameState] = useState(createMemoryState);
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { width, height } = useWindowDimensions();
  const columns = width > height || width >= 768 ? 4 : 3;
  const matchedCount = gameState.matchedPairIds.length * 2;
  const totalCards = deck.length;

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  useEffect(() => {
    if (gameState.completed) return;
    const id = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, [gameState.completed]);

  const chooseCard = (card: MemoryCard) => {
    onInteraction();
    const transition = selectMemoryCard(deck, gameState, card.id);
    if (transition.state === gameState) return;
    setGameState(transition.state);
    if (!transition.resolution) return;
    onFirstAnswer(transition.resolution);
    if (transition.state.completed) {
      onComplete({ score: 6, total: 6, passed: true });
    } else if (transition.state.locked) {
      timer.current = setTimeout(
        () => setGameState((state) => concealMemoryMismatch(state)),
        MEMORY_MISMATCH_DELAY_MS,
      );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9FF" }} edges={["top", "bottom"]}>
      {/* Decorative Background Blur Circles */}
      <View style={{ position: "absolute", top: 40, left: 20, width: 128, height: 128, borderRadius: 64, backgroundColor: "rgba(208,228,255,0.4)" }} />
      <View style={{ position: "absolute", bottom: 80, right: 20, width: 192, height: 192, borderRadius: 96, backgroundColor: "rgba(156,244,156,0.4)" }} />

      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16, gap: 24 }}>
        {/* Header Bar */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="退出游戏"
            onPress={onExit}
            style={({ pressed }) => ({
              width: 56,
              height: 56,
              borderRadius: 28,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#FFFFFF",
              borderWidth: 2,
              borderColor: "#EBEEF5",
              boxShadow: pressed ? "none" : "0 6px 0 0 #D7DAE1",
              transform: [{ translateY: pressed ? 6 : 0 }],
            })}
          >
            <AppIcon name="close" size={24} color="#404751" />
          </Pressable>

          <View style={{ flexDirection: "row", gap: 12 }}>
            {/* Timer Pill */}
            <View
              style={{
                minHeight: 52,
                borderRadius: radii.pill,
                backgroundColor: "#9CF49C",
                borderWidth: 2,
                borderColor: "rgba(18,109,39,0.2)",
                paddingHorizontal: 20,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 6px 0 0 #126D27",
              }}
            >
              <AppIcon name="clock" size={22} color="#126D27" />
              <Text style={{ color: "#19722B", fontFamily: fonts.bodyBold, fontSize: 20, letterSpacing: 1 }}>
                {formatTime(elapsed)}
              </Text>
            </View>

            {/* Matches Star Pill */}
            <View
              style={{
                minHeight: 52,
                borderRadius: radii.pill,
                backgroundColor: "#E89409",
                borderWidth: 2,
                borderColor: "rgba(134,83,0,0.2)",
                paddingHorizontal: 20,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 6px 0 0 #865300",
              }}
            >
              <AppIcon name="star" size={22} color="#FFB961" />
              <Text style={{ color: "#573400", fontFamily: fonts.bodyBold, fontSize: 20 }}>
                {matchedCount}/{totalCards}
              </Text>
            </View>
          </View>
        </View>

        {gameState.completed ? (
          <View style={{ flex: 1 }}>
            <CompletionPanel
              title="全部找到啦"
              detail={`用了 ${gameState.moves} 次尝试 · ${formatTime(elapsed)}`}
              passed
              onExit={onExit}
            />
            <MemoryConfetti />
          </View>
        ) : (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <View
              style={{
                width: "100%",
                maxWidth: 400,
                aspectRatio: 3 / 4.5,
                flexDirection: "row",
                flexWrap: "wrap",
              }}
            >
              {deck.map((card) => (
                <View key={card.id} style={{ width: `${100 / columns}%`, height: "25%", padding: 4 }}>
                  <MemoryCardButton
                    card={card}
                    open={gameState.openIds.includes(card.id) || gameState.matchedPairIds.includes(card.pairId)}
                    matched={gameState.matchedPairIds.includes(card.pairId)}
                    disabled={gameState.locked}
                    onPress={() => chooseCard(card)}
                  />
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function CardPatternSvg() {
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", borderRadius: 16 }}>
      <Svg width="100%" height="100%" viewBox="0 0 100 130">
        <Defs>
          <Pattern id="stars" width="20" height="20" patternUnits="userSpaceOnUse">
            <Circle cx="5" cy="5" r="2" fill="#D0E4FF" />
            <Circle cx="15" cy="15" r="2" fill="#D0E4FF" />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="#00629F" />
        <Rect width="100%" height="100%" fill="url(#stars)" />
      </Svg>
    </View>
  );
}

function MemoryCardButton({
  card,
  open,
  matched,
  disabled,
  onPress,
}: {
  card: MemoryCard;
  open: boolean;
  matched: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const flip = useSharedValue(open ? 1 : 0);
  const matchPulse = useSharedValue(1);

  useEffect(() => {
    flip.value = withTiming(open ? 1 : 0, { duration: 350, easing: Easing.out(Easing.cubic) });
  }, [open, flip]);

  useEffect(() => {
    if (matched) {
      matchPulse.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        ),
        2,
        true,
      );
    } else {
      matchPulse.value = 1;
    }
    return () => cancelAnimation(matchPulse);
  }, [matched, matchPulse]);

  const frontAnimatedStyle = useAnimatedStyle(() => ({
    opacity: flip.value < 0.5 ? 1 : 0,
    transform: [
      { perspective: 1000 },
      { rotateY: `${interpolate(flip.value, [0, 1], [0, 180])}deg` },
    ],
  }));

  const backAnimatedStyle = useAnimatedStyle(() => ({
    opacity: flip.value >= 0.5 ? 1 : 0,
    transform: [
      { perspective: 1000 },
      { rotateY: `${interpolate(flip.value, [0, 1], [-180, 0])}deg` },
      { scale: matchPulse.value },
    ],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={open ? `${card.label}${matched ? "，已配对" : ""}` : "未翻开的记忆卡"}
      accessibilityState={{ disabled: disabled || matched, selected: open }}
      disabled={disabled || matched}
      onPress={onPress}
      style={{ flex: 1, position: "relative" }}
    >
      {/* Front side (Unflipped blue star card) */}
      <Animated.View
        style={[
          {
            position: "absolute",
            inset: 0,
            borderRadius: 16,
            borderTopWidth: 2,
            borderTopColor: "rgba(255,255,255,0.3)",
            backgroundColor: "#00629F",
            boxShadow: "0 8px 0 0 #004A7A",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            backfaceVisibility: "hidden",
          },
          frontAnimatedStyle,
        ]}
      >
        <CardPatternSvg />
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            borderWidth: 2,
            borderColor: "rgba(255,255,255,0.4)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Svg width="20" height="20" viewBox="0 0 24 24">
            <Path
              d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm0-13a3 3 0 0 0-3 3 1 1 0 0 0 2 0 1 1 0 1 1 2 0c0 1-1.5 1.5-2 2.5a1 1 0 0 0 2 0c.5-.7 2-1.5 2-3.5a3 3 0 0 0-3-3zm0 9a1 1 0 1 0 1 1 1 1 0 0 0-1-1z"
              fill="rgba(255,255,255,0.6)"
            />
          </Svg>
        </View>
      </Animated.View>

      {/* Back side (Flipped card content) */}
      <Animated.View
        style={[
          {
            position: "absolute",
            inset: 0,
            borderRadius: 16,
            borderWidth: matched ? 4 : 2,
            borderColor: matched ? "#FFB961" : "#EBEEF5",
            backgroundColor: matched ? "#FFFAF0" : "#FFFFFF",
            boxShadow: matched
              ? "0 0 20px rgba(232, 148, 9, 0.4)"
              : "0 4px 0 #EBEEF5",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            backfaceVisibility: "hidden",
          },
          backAnimatedStyle,
        ]}
      >
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{
            color: card.face === "hanzi" ? "#865300" : colors.ink,
            fontFamily: card.face === "hanzi" ? fonts.display : fonts.bodyBold,
            fontSize: card.face === "hanzi" ? 64 : 22,
            fontWeight: "700",
          }}
        >
          {card.label}
        </Text>
      </Animated.View>

      {matched ? <StarBurst trigger={1} /> : null}
    </Pressable>
  );
}

function MemoryConfetti() {
  const { width, height } = useWindowDimensions();
  return (
    <View pointerEvents="none" style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 20 }}>
      {CONFETTI_PIECES.map((piece) => (
        <ConfettiPiece key={piece.id} {...piece} width={width} height={height} />
      ))}
    </View>
  );
}

function ConfettiPiece({
  left,
  delay,
  duration,
  drift,
  spin,
  size,
  color,
  width,
  height,
}: (typeof CONFETTI_PIECES)[number] & { width: number; height: number }) {
  const fall = useSharedValue(0);

  useEffect(() => {
    fall.value = withDelay(delay, withTiming(1, { duration, easing: Easing.in(Easing.quad) }));
  }, [delay, duration, fall]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(fall.value, [0, 0.08, 0.85, 1], [0, 1, 1, 0]),
    transform: [
      { translateY: interpolate(fall.value, [0, 1], [-40, height]) },
      { translateX: interpolate(fall.value, [0, 1], [0, drift]) },
      { rotate: `${interpolate(fall.value, [0, 1], [0, spin])}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: 0,
          left: (width * left) / 100,
          width: size,
          height: size * 1.6,
          borderRadius: 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}
