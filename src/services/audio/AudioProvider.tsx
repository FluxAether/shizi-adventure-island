import {
  setAudioModeAsync,
  useAudioPlayer,
  type AudioPlayer,
  type AudioSource,
} from "expo-audio";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { AppState } from "react-native";

import { selectSettings, useAppStore } from "@/store/useAppStore";

export type AudioChannel = "voice" | "effect" | "music";

export interface PlayAudioOptions {
  channel?: AudioChannel;
  loop?: boolean;
}

interface AudioContextValue {
  play: (audioId: string, options?: PlayAudioOptions) => boolean;
  stop: (channel?: AudioChannel) => void;
  pauseAll: () => void;
}

interface AudioProviderProps extends PropsWithChildren {
  sources: Readonly<Record<string, AudioSource>>;
}

const SFX_IDS = [
  "sfx-tap",
  "sfx-flip",
  "sfx-correct",
  "sfx-retry",
  "sfx-reward",
] as const;

type SfxId = (typeof SFX_IDS)[number];

const AudioContext = createContext<AudioContextValue | null>(null);

function pause(player: AudioPlayer): void {
  player.pause();
}

function isSfxId(audioId: string): audioId is SfxId {
  return (SFX_IDS as readonly string[]).includes(audioId);
}

function replay(player: AudioPlayer): void {
  // replace()+immediate play races while the new item is still loading.
  // seekTo resolves after the player can actually position, then play is safe.
  void player.seekTo(0).then(() => {
    player.play();
  });
}

export function AudioProvider({ children, sources }: AudioProviderProps) {
  const settings = useAppStore(selectSettings);
  const voicePlayer = useAudioPlayer(null);
  const effectPlayer = useAudioPlayer(null);
  const musicPlayer = useAudioPlayer(null);
  const sfxTapPlayer = useAudioPlayer(sources["sfx-tap"] ?? null);
  const sfxFlipPlayer = useAudioPlayer(sources["sfx-flip"] ?? null);
  const sfxCorrectPlayer = useAudioPlayer(sources["sfx-correct"] ?? null);
  const sfxRetryPlayer = useAudioPlayer(sources["sfx-retry"] ?? null);
  const sfxRewardPlayer = useAudioPlayer(sources["sfx-reward"] ?? null);
  const activeSourceId = useRef<Partial<Record<AudioChannel, string>>>({});

  const players = useMemo(
    () => ({ voice: voicePlayer, effect: effectPlayer, music: musicPlayer }),
    [effectPlayer, musicPlayer, voicePlayer],
  );

  const sfxPlayers = useMemo(
    () =>
      ({
        "sfx-tap": sfxTapPlayer,
        "sfx-flip": sfxFlipPlayer,
        "sfx-correct": sfxCorrectPlayer,
        "sfx-retry": sfxRetryPlayer,
        "sfx-reward": sfxRewardPlayer,
      }) satisfies Record<SfxId, AudioPlayer>,
    [sfxCorrectPlayer, sfxFlipPlayer, sfxRetryPlayer, sfxRewardPlayer, sfxTapPlayer],
  );

  const pauseAll = useCallback(() => {
    pause(voicePlayer);
    pause(effectPlayer);
    pause(musicPlayer);
    for (const player of Object.values(sfxPlayers)) {
      pause(player);
    }
  }, [effectPlayer, musicPlayer, sfxPlayers, voicePlayer]);

  const stop = useCallback((channel?: AudioChannel) => {
    if (channel) {
      pause(players[channel]);
      void players[channel].seekTo(0);
      if (channel === "effect") {
        for (const player of Object.values(sfxPlayers)) {
          pause(player);
          void player.seekTo(0);
        }
      }
      return;
    }
    pauseAll();
    void voicePlayer.seekTo(0);
    void effectPlayer.seekTo(0);
    void musicPlayer.seekTo(0);
    for (const player of Object.values(sfxPlayers)) {
      void player.seekTo(0);
    }
  }, [effectPlayer, musicPlayer, pauseAll, players, sfxPlayers, voicePlayer]);

  const play = useCallback((audioId: string, options: PlayAudioOptions = {}) => {
    const channel = options.channel ?? "voice";
    const source = sources[audioId];
    const enabled = channel === "music" ? settings.musicEnabled : settings.soundEnabled;
    if (!source || !enabled) {
      return false;
    }

    if (channel === "effect" && isSfxId(audioId)) {
      const player = sfxPlayers[audioId];
      player.loop = false;
      player.volume = settings.effectsVolume;
      replay(player);
      return true;
    }

    const player = players[channel];
    player.loop = options.loop ?? channel === "music";
    player.volume = channel === "music"
      ? settings.musicVolume
      : channel === "voice"
        ? settings.voiceVolume
        : settings.effectsVolume;

    if (activeSourceId.current[channel] === audioId) {
      replay(player);
      return true;
    }

    activeSourceId.current[channel] = audioId;
    player.replace(source);
    replay(player);
    return true;
  }, [players, settings, sfxPlayers, sources]);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: "mixWithOthers",
    }).catch(() => undefined);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        pauseAll();
      }
    });
    return () => subscription.remove();
  }, [pauseAll]);

  useEffect(() => {
    musicPlayer.volume = settings.musicVolume;
    voicePlayer.volume = settings.voiceVolume;
    effectPlayer.volume = settings.effectsVolume;
    for (const player of Object.values(sfxPlayers)) {
      player.volume = settings.effectsVolume;
    }
    if (!settings.musicEnabled) {
      musicPlayer.pause();
    }
    if (!settings.soundEnabled) {
      voicePlayer.pause();
      effectPlayer.pause();
      for (const player of Object.values(sfxPlayers)) {
        player.pause();
      }
    }
  }, [effectPlayer, musicPlayer, settings, sfxPlayers, voicePlayer]);

  const value = useMemo(() => ({ play, stop, pauseAll }), [pauseAll, play, stop]);
  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudio(): AudioContextValue {
  const value = useContext(AudioContext);
  if (!value) {
    throw new Error("useAudio must be used within AudioProvider");
  }
  return value;
}
