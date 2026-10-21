import { type PropsWithChildren, useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";

import { useAppStore } from "@/store/useAppStore";

import { flushStudySession } from "./progress";
import { getEffectiveActiveMs, shouldFlushStudyTimer } from "./studyTimer";

export function StudySessionProvider({ children }: PropsWithChildren) {
  const flushing = useRef(false);

  const flushCurrent = useCallback(async (force: boolean) => {
    if (flushing.current) {
      return;
    }

    const now = Date.now();
    const timer = useAppStore.getState().study;
    if (
      !timer.sessionId ||
      (!force && !shouldFlushStudyTimer(timer, now))
    ) {
      return;
    }

    const activeMs = getEffectiveActiveMs(timer, now);
    if (activeMs <= timer.lastFlushedActiveMs) {
      return;
    }

    flushing.current = true;
    try {
      await flushStudySession(timer.sessionId, activeMs);
      const current = useAppStore.getState();
      if (current.study.sessionId === timer.sessionId) {
        current.markStudyFlushed(Date.now(), activeMs);
      }
    } catch {
      // Leave the flush watermark unchanged so the next tick retries.
    } finally {
      flushing.current = false;
    }
  }, []);

  useEffect(() => {
    useAppStore.getState().setForeground(AppState.currentState === "active");
    const subscription = AppState.addEventListener("change", (state) => {
      useAppStore.getState().setForeground(state === "active");
      if (state !== "active") {
        void flushCurrent(true);
      }
    });
    const interval = setInterval(() => void flushCurrent(false), 1_000);

    return () => {
      subscription.remove();
      clearInterval(interval);
      void flushCurrent(true);
    };
  }, [flushCurrent]);

  return children;
}
