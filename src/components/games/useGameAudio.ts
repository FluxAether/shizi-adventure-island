import { useCallback } from 'react';

import { useAudio } from '@/services/audio';

export function useGameAudio(
  audioIdByCharacterId: Readonly<Record<string, string | undefined>>,
) {
  const audio = useAudio();
  return useCallback(
    (characterId: string) => {
      const audioId = audioIdByCharacterId[characterId];
      if (audioId) audio.play(audioId, { channel: 'voice' });
    },
    [audio, audioIdByCharacterId],
  );
}
