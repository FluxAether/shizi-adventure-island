import {
  createStudyTimer,
  getEffectiveActiveMs,
  markStudyTimerFlushed,
  setStudyTimerForeground,
  shouldFlushStudyTimer,
  touchStudyTimer,
} from "../../src/services/studyTimer";

describe("study timer", () => {
  test("counts foreground time and stops after 30 seconds idle", () => {
    const timer = createStudyTimer("session", 0);
    expect(getEffectiveActiveMs(timer, 40_000)).toBe(30_000);

    const resumed = touchStudyTimer(timer, 40_000);
    expect(getEffectiveActiveMs(resumed, 50_000)).toBe(40_000);
  });

  test("does not count background time", () => {
    let timer = createStudyTimer("session", 0);
    timer = setStudyTimerForeground(timer, false, 10_000);
    expect(getEffectiveActiveMs(timer, 100_000)).toBe(10_000);

    timer = setStudyTimerForeground(timer, true, 100_000);
    expect(getEffectiveActiveMs(timer, 105_000)).toBe(15_000);
  });

  test("requests a flush every 15 effective seconds", () => {
    let timer = createStudyTimer("session", 0);
    expect(shouldFlushStudyTimer(timer, 14_999)).toBe(false);
    expect(shouldFlushStudyTimer(timer, 15_000)).toBe(true);

    timer = markStudyTimerFlushed(timer, 15_000);
    expect(shouldFlushStudyTimer(timer, 29_999)).toBe(false);
    expect(shouldFlushStudyTimer(timer, 30_000)).toBe(true);
  });

  test("allows a zero remaining daily budget", () => {
    const timer = createStudyTimer("session", 0, 0);
    expect(timer.targetDurationMs).toBe(0);
  });
});
