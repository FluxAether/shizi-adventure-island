import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, Switch, Text, TextInput, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { CHARACTERS } from "@/content";
import {
  loadCharacterProgresses,
  loadParentReport,
  setCharacterEnabled,
} from "@/services/progress";
import {
  selectProgress,
  selectSettings,
  useAppStore,
} from "@/store/use-app-store";
import { colors, fonts, radii, spacing } from "@/theme/tokens";
import type { CharacterProgress, ParentReport } from "@/types/progress";

const LIMITS = [5, 8, 12, 15, 20] as const;
let parentGateVerifiedForSession = false;

function Stat({ label, value, tint }: { label: string; value: string; tint: string }) {
  return (
    <View style={{ flex: 1, minHeight: 100, borderRadius: radii.lg, padding: 16, justifyContent: "center", backgroundColor: tint }}>
      <Text style={{ color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 25 }}>{value}</Text>
      <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 14 }}>{label}</Text>
    </View>
  );
}

function ToggleRow({ title, value, onChange }: { title: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={{ minHeight: 64, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <Text style={{ color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 17 }}>{title}</Text>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.outline, true: colors.green }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

function ParentalGateModal({
  visible,
  onVerify,
  onCancel,
}: {
  visible: boolean;
  onVerify: () => void;
  onCancel: () => void;
}) {
  const [num1, setNum1] = useState(47);
  const [num2, setNum2] = useState(38);
  const [answerInput, setAnswerInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [failCount, setFailCount] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);

  const generateChallenge = (clearError = true) => {
    const a = Math.floor(Math.random() * 70) + 20;
    const b = Math.floor(Math.random() * 80) + 10;
    setNum1(a);
    setNum2(b);
    setAnswerInput("");
    if (clearError) setErrorMsg("");
  };

  useEffect(() => {
    if (visible) {
      generateChallenge();
      setFailCount(0);
      setLockedUntil(0);
    }
  }, [visible]);

  const handleSubmit = () => {
    if (Date.now() < lockedUntil) {
      setErrorMsg("请稍等一下再试");
      return;
    }
    const expected = num1 + num2;
    if (parseInt(answerInput.trim(), 10) === expected) {
      setFailCount(0);
      setLockedUntil(0);
      onVerify();
    } else {
      const nextFailCount = failCount + 1;
      setFailCount(nextFailCount);
      if (nextFailCount >= 2) {
        setLockedUntil(Date.now() + 1500);
        setErrorMsg("回答错误，请稍后再试");
      } else {
        setErrorMsg("回答错误，请重试");
      }
      generateChallenge(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: colors.canvas, justifyContent: "center", alignItems: "center", padding: 24 }}>
        <Pressable style={{ width: "100%", maxWidth: 380, borderRadius: radii.xl, backgroundColor: colors.surface, padding: spacing.lg, gap: 16 }} onPress={(e) => e?.stopPropagation?.()}>
          <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 24, textAlign: "center" }}>家长验证</Text>
          <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 15, textAlign: "center" }}>
            为了保护小朋友的学习体验，请家长完成计算验证进入：
          </Text>
          <View style={{ alignItems: "center", paddingVertical: 8 }}>
            <Text style={{ color: colors.blueDeep, fontFamily: fonts.bodyBold, fontSize: 28 }}>
              请算一下 {num1} + {num2} = ?
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", borderRadius: radii.lg, backgroundColor: colors.canvas, paddingHorizontal: 16, minHeight: 52, borderWidth: 2, borderColor: errorMsg ? colors.orange : colors.outline }}>
            <TextInput
              accessibilityLabel="输入计算答案"
              keyboardType="number-pad"
              value={answerInput}
              onChangeText={(t) => {
                setAnswerInput(t.replace(/[^0-9]/g, ""));
                if (errorMsg) setErrorMsg("");
              }}
              placeholder="输入数字答案"
              placeholderTextColor={colors.muted}
              autoFocus
              style={{ flex: 1, color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 20 }}
            />
          </View>
          {errorMsg ? (
            <Text style={{ color: colors.orange, fontFamily: fonts.body, fontSize: 14, textAlign: "center" }}>{errorMsg}</Text>
          ) : null}
          <View style={{ flexDirection: "row", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="取消家长验证"
              onPress={onCancel}
              style={{ flex: 1, minHeight: 48, borderRadius: radii.lg, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas }}
            >
              <Text style={{ color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 16 }}>取消</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="验证进入家长中心"
              onPress={handleSubmit}
              style={{ flex: 1, minHeight: 48, borderRadius: radii.lg, alignItems: "center", justifyContent: "center", backgroundColor: colors.green }}
            >
              <Text style={{ color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 16 }}>确定</Text>
            </Pressable>
          </View>
        </Pressable>
      </View>
    </Modal>
  );
}

export default function ParentScreen() {
  const settings = useAppStore(selectSettings);
  const progress = useAppStore(selectProgress);
  const setSettings = useAppStore((state) => state.setSettings);
  const [todayReport, setTodayReport] = useState<ParentReport | null>(null);
  const [report, setReport] = useState<ParentReport | null>(null);
  const [query, setQuery] = useState("");
  const [progressById, setProgressById] = useState<Map<string, CharacterProgress>>(new Map());
  const [notice, setNotice] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [gateVerified, setGateVerified] = useState(parentGateVerifiedForSession);

  const refreshCharacters = () => {
    void loadCharacterProgresses().then((items) => {
      setProgressById(new Map(items.map((item) => [item.characterId, item])));
    });
  };

  useEffect(() => {
    if (!gateVerified) return;
    void Promise.all([loadParentReport(1), loadParentReport(7)])
      .then(([today, week]) => {
        setTodayReport(today);
        setReport(week);
      })
      .catch(() => setNotice("报告暂时没有准备好，请稍后再看。"));
    refreshCharacters();
  }, [gateVerified]);

  const filteredCharacters = useMemo(() => {
    const keyword = query.trim();
    return CHARACTERS.filter((item) => !keyword || item.hanzi.includes(keyword) || item.theme.includes(keyword)).slice(0, 24);
  }, [query]);

  const weakCharacters = useMemo(() => {
    const list: (typeof CHARACTERS)[number][] = [];
    for (const char of CHARACTERS) {
      const item = progressById.get(char.id);
      if (item && item.attempts > 0 && item.masteryScore === 0) {
        list.push(char);
        if (list.length >= 12) break;
      }
    }
    return list;
  }, [progressById]);

  if (!gateVerified) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <ParentalGateModal
          visible
          onVerify={() => {
            parentGateVerifiedForSession = true;
            setGateVerified(true);
          }}
          onCancel={() => router.back()}
        />
      </View>
    );
  }

  return (
    <AppScreen contentStyle={{ maxWidth: 760, paddingBottom: 48 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="关闭家长中心"
          onPress={() => router.back()}
          style={{ width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}
        >
          <AppIcon name="back" color={colors.blueDeep} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 32 }}>家长中心</Text>
          <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 14 }}>进度、时间和内容都在这里</Text>
        </View>
      </View>

      {notice ? (
        <View accessibilityLiveRegion="polite" style={{ borderRadius: radii.lg, backgroundColor: colors.orangeSoft, padding: 14 }}>
          <Text style={{ color: colors.orangeDeep, fontFamily: fonts.body }}>{notice}</Text>
        </View>
      ) : null}

      <View style={{ gap: 12 }}>
        <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 25 }}>今日学习</Text>
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Stat label="有效学习" value={`${Math.ceil(progress.activeSeconds / 60)} 分钟`} tint={colors.blueSoft} />
            <Stat label="新认识" value={`${progress.todayLearned} 个字`} tint={colors.greenSoft} />
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Stat label="答题正确率" value={`${todayReport?.correctRate ?? 0}%`} tint={colors.yellowSoft} />
            <Stat label="收集星星" value={`${todayReport?.starsEarned ?? 0} 颗`} tint={colors.orangeSoft} />
          </View>
        </View>
      </View>

      <View style={{ gap: 12 }}>
        <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 25 }}>最近一周</Text>
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Stat label="有效学习" value={`${Math.ceil((report?.activeSeconds ?? 0) / 60)} 分钟`} tint={colors.blueSoft} />
            <Stat label="新认识" value={`${report?.learnedCharacters ?? 0} 个字`} tint={colors.greenSoft} />
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Stat label="答题正确率" value={`${report?.correctRate ?? 0}%`} tint={colors.yellowSoft} />
            <Stat label="收集星星" value={`${report?.starsEarned ?? 0} 颗`} tint={colors.orangeSoft} />
          </View>
        </View>
      </View>

      <View style={{ gap: 12, borderRadius: radii.xl, backgroundColor: colors.surface, padding: spacing.lg }}>
        <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 25 }}>掌握情况</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[
            ["生疏", progress.unfamiliarCount, colors.orange],
            ["熟悉", progress.familiarCount, colors.blue],
            ["已掌握", progress.masteredCount, colors.green],
          ].map(([label, value, tint]) => (
            <View key={String(label)} style={{ flex: 1, alignItems: "center", gap: 4 }}>
              <Text style={{ color: tint as string, fontFamily: fonts.bodyBold, fontSize: 22 }}>{value}</Text>
              <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13 }}>{label}</Text>
            </View>
          ))}
        </View>
        {weakCharacters.length > 0 ? (
          <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.outline, gap: 8 }}>
            <Text style={{ color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 15 }}>
              重点关注（练过但仍生疏的字）：
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {weakCharacters.map((c) => (
                <View
                  key={c.id}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: radii.md,
                    backgroundColor: colors.orangeSoft,
                    borderWidth: 1,
                    borderColor: colors.orange,
                  }}
                >
                  <Text style={{ color: colors.orangeDeep, fontFamily: fonts.bodyBold, fontSize: 16 }}>
                    {c.hanzi}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>

      <View style={{ gap: 4, borderRadius: radii.xl, backgroundColor: colors.surface, padding: spacing.lg }}>
        <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 25 }}>声音设置</Text>
        <ToggleRow title="背景音乐" value={settings.musicEnabled} onChange={(musicEnabled) => setSettings({ musicEnabled })} />
        <ToggleRow title="语音与音效" value={settings.soundEnabled} onChange={(soundEnabled) => setSettings({ soundEnabled })} />
        <ToggleRow title="轻触反馈" value={settings.hapticsEnabled} onChange={(hapticsEnabled) => setSettings({ hapticsEnabled })} />
        <Text style={{ color: colors.muted, fontFamily: fonts.body, marginTop: 8 }}>整体音量</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[0.25, 0.5, 0.75, 1].map((volume) => {
            const selected = settings.voiceVolume === volume;
            return (
              <Pressable
                key={volume}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setSettings({ voiceVolume: volume, effectsVolume: volume })}
                style={{ flex: 1, minHeight: 56, borderRadius: radii.lg, alignItems: "center", justifyContent: "center", backgroundColor: selected ? colors.blue : colors.blueSoft }}
              >
                <Text style={{ color: selected ? colors.surface : colors.blueDeep, fontFamily: fonts.bodyBold }}>{Math.round(volume * 100)}%</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: 12, borderRadius: radii.xl, backgroundColor: colors.surface, padding: spacing.lg, zIndex: 10 }}>
        <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 25 }}>每日学习上限</Text>
        <View style={{ position: "relative", zIndex: 10 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="选择学习时长"
            onPress={() => setDropdownOpen(!dropdownOpen)}
            style={{
              minHeight: 56,
              paddingHorizontal: 18,
              borderRadius: radii.lg,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: colors.canvas,
              borderWidth: 2,
              borderColor: colors.outline,
            }}
          >
            <Text style={{ color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 17 }}>
              {(LIMITS as readonly number[]).includes(settings.studyDurationMinutes)
                ? `${settings.studyDurationMinutes} 分钟`
                : `自定义 (${settings.studyDurationMinutes} 分钟)`}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 16 }}>{dropdownOpen ? "▲" : "▼"}</Text>
          </Pressable>

          {dropdownOpen && (
            <View
              style={{
                marginTop: 6,
                borderRadius: radii.lg,
                backgroundColor: colors.surface,
                borderWidth: 2,
                borderColor: colors.outline,
                overflow: "hidden",
                elevation: 4,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
              }}
            >
              {LIMITS.map((minutes) => {
                const selected = settings.studyDurationMinutes === minutes;
                return (
                  <Pressable
                    key={minutes}
                    accessibilityRole="button"
                    onPress={() => {
                      setSettings({ studyDurationMinutes: minutes });
                      setDropdownOpen(false);
                    }}
                    style={{
                      minHeight: 48,
                      paddingHorizontal: 18,
                      justifyContent: "center",
                      backgroundColor: selected ? colors.greenSoft : colors.surface,
                    }}
                  >
                    <Text style={{ color: selected ? colors.greenDeep : colors.ink, fontFamily: fonts.bodyBold, fontSize: 16 }}>
                      {minutes} 分钟
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setDropdownOpen(false);
                  setCustomInput(String(settings.studyDurationMinutes));
                  setModalVisible(true);
                }}
                style={{
                  minHeight: 48,
                  paddingHorizontal: 18,
                  justifyContent: "center",
                  borderTopWidth: 1,
                  borderTopColor: colors.outline,
                  backgroundColor: !(LIMITS as readonly number[]).includes(settings.studyDurationMinutes)
                    ? colors.greenSoft
                    : colors.surface,
                }}
              >
                <Text
                  style={{
                    color: !(LIMITS as readonly number[]).includes(settings.studyDurationMinutes)
                      ? colors.greenDeep
                      : colors.blueDeep,
                    fontFamily: fonts.bodyBold,
                    fontSize: 16,
                  }}
                >
                  自定义...
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
          <Pressable style={{ flex: 1, backgroundColor: "#00000066", justifyContent: "center", alignItems: "center", padding: 24 }} onPress={() => setModalVisible(false)}>
            <Pressable style={{ width: "100%", maxWidth: 360, borderRadius: radii.xl, backgroundColor: colors.surface, padding: spacing.lg, gap: 16 }} onPress={(e) => e.stopPropagation()}>
              <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 22 }}>自定义学习时长</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: radii.lg, backgroundColor: colors.canvas, paddingHorizontal: 16, minHeight: 52 }}>
                <TextInput
                  accessibilityLabel="自定义学习时长（分钟）"
                  keyboardType="number-pad"
                  value={customInput}
                  onChangeText={(t) => setCustomInput(t.replace(/[^0-9]/g, ""))}
                  placeholder="输入分钟数"
                  placeholderTextColor={colors.muted}
                  autoFocus
                  style={{ flex: 1, color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 18 }}
                />
                <Text style={{ color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 16 }}>分钟</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 12, justifyContent: "flex-end" }}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setModalVisible(false)}
                  style={{ minWidth: 80, minHeight: 48, borderRadius: radii.lg, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas }}
                >
                  <Text style={{ color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 16 }}>取消</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    const num = parseInt(customInput, 10);
                    if (!isNaN(num) && num > 0 && num <= 1440) {
                      setSettings({ studyDurationMinutes: num });
                    }
                    setModalVisible(false);
                  }}
                  style={{ minWidth: 80, minHeight: 48, borderRadius: radii.lg, alignItems: "center", justifyContent: "center", backgroundColor: colors.green }}
                >
                  <Text style={{ color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 16 }}>确定</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </View>

      <View style={{ gap: 10, borderRadius: radii.xl, backgroundColor: colors.blueSoft, padding: spacing.lg }}>
        <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 25 }}>给家长</Text>
        <Text style={{ color: colors.muted, fontFamily: fonts.body, lineHeight: 22 }}>
          默认每天学 12 分钟。验证通过后，这次打开 App 都不用再算题。学习记录只保存在这台设备上，没有账号，也没有广告。
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="查看隐私说明"
          onPress={() => router.push('/privacy')}
          style={{ minHeight: 48, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}
        >
          <Text style={{ color: colors.blueDeep, fontFamily: fonts.bodyBold, fontSize: 16 }}>隐私说明</Text>
        </Pressable>
      </View>

      <View style={{ gap: 12, borderRadius: radii.xl, backgroundColor: colors.surface, padding: spacing.lg }}>
        <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 25 }}>学习字库</Text>
        <Text style={{ color: colors.muted, fontFamily: fonts.body, lineHeight: 22 }}>从内置 800 字中加入或暂时屏蔽，不会生成缺少发音和插画的新字。</Text>
        <TextInput
          accessibilityLabel="搜索内置汉字或主题"
          value={query}
          onChangeText={setQuery}
          placeholder="输入汉字或主题"
          placeholderTextColor={colors.muted}
          style={{ minHeight: 56, borderRadius: radii.lg, backgroundColor: colors.canvas, paddingHorizontal: 16, color: colors.ink, fontFamily: fonts.body, fontSize: 17 }}
        />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {filteredCharacters.length === 0 ? (
            <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 16, paddingVertical: 12 }}>
              没有找到匹配的汉字，试试其他关键字吧~
            </Text>
          ) : (
            filteredCharacters.map((item) => {
              const enabled = progressById.get(item.id)?.enabled !== false;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${enabled ? "屏蔽" : "加入"}汉字${item.hanzi}`}
                  onPress={() => {
                    void setCharacterEnabled(item.id, !enabled).then(refreshCharacters).catch(() => setNotice("这次设置没有保存，请再试一次。"));
                  }}
                  style={{ width: 58, height: 58, borderRadius: radii.lg, alignItems: "center", justifyContent: "center", backgroundColor: enabled ? colors.yellowSoft : "#EEF1F5", borderWidth: 2, borderColor: enabled ? colors.yellow : colors.outline }}
                >
                  <Text style={{ color: enabled ? colors.ink : colors.muted, fontFamily: fonts.bodyBold, fontSize: 24 }}>{item.hanzi}</Text>
                </Pressable>
              );
            })
          )}
        </View>
      </View>
    </AppScreen>
  );
}
