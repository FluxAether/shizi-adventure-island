#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { illustrationFor } from './illustration-catalog.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_PATH = path.join(ROOT, 'content', 'characters.json');
const PETS_PATH = path.join(ROOT, 'content', 'pets.json');
const ACHIEVEMENTS_PATH = path.join(ROOT, 'content', 'achievements.json');
const REGISTRY_PATH = path.join(ROOT, 'src', 'content', 'registry.ts');
const REPLACEMENTS_PATH = path.join(ROOT, 'production', 'replacements.csv');
const CURRICULUM_REPLACEMENTS_PATH = path.join(ROOT, 'production', 'curriculum-replacements.csv');

const HANZI_REVISION = '3e9f908d25f70674862343b201f6b641a36cd226';
const HSK_REVISION = '7ac65bf1a6387d35f1ade478906172a19311c7f9';
const HANZI_URL = `https://raw.githubusercontent.com/ruddfawcett/hanziDB.csv/${HANZI_REVISION}/hanzi_db.csv`;
const HSK_URL = `https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/${HSK_REVISION}/complete.json`;

const LEVELS = [
  { id: 'grade-1-fall', title: '一年级上册', grade: 1, semester: 'fall', order: 1, characterCount: 100 },
  { id: 'grade-1-spring', title: '一年级下册', grade: 1, semester: 'spring', order: 2, characterCount: 200 },
  { id: 'grade-2-fall', title: '二年级上册', grade: 2, semester: 'fall', order: 3, characterCount: 250 },
  { id: 'grade-2-spring', title: '二年级下册', grade: 2, semester: 'spring', order: 4, characterCount: 250 },
];

const TEXTBOOK_LEVELS = [
  {
    ...LEVELS[0],
    edition: '2024修订版',
    writeTablePages: 'PDF 113（书页 108）',
    recognitionTablePages: null,
    writeList: '一二三上口耳目手日火田禾六七八十九王午下个去了子大人可叶东西竹马牙用几四小鸟是天女开关先云雨虫山水力男土木心尺本刀不少中五风立正工厂门卫月儿头里见在我左右和也又才爸妈比巴长公只多办石出来半你有牛羊爪白',
    supplements: [],
  },
  {
    ...LEVELS[1],
    edition: '2024修订版',
    writeTablePages: 'PDF 122-124（书页 117-119）',
    recognitionTablePages: null,
    writeList: '春冬吹花飞入什么古胡双言青清晴苗请生字红动万无明文卡片合共产党太阳光井主江住方后告的会北京广写认走河说让自己从好们叫他回快乐当书画毛止斤寸丁千元思床前地故乡色把讲样笑再节米间分吃肉册支电衣物造运欢房网对今雪细夕语打皮跑足沙包近习远学玉义饱抱首池采尖角早玩眼泪它贝气机台唱伞朵美这看鱼面问加豆斗笔知道放平安灯车站课坐老师国都百听时点林高兴着往瓜兔进巾洗她空还干身星久吓为怕家象没到向边行草赶过找页户交父',
    supplements: [],
  },
  {
    ...LEVELS[2],
    edition: '2024修订版',
    writeTablePages: 'PDF 118-120（书页 113-115）',
    recognitionTablePages: 'PDF 113-117（书页 108-112）',
    writeList: '两条哪宽那短孩成升连起海洋许作办法如已经别轻发胆肚更识转夹处块座园群队领树之杨松柏化金桂拍世界彩丛休朋友保护季肥农事谷体虽辛苦初丑诚丽提吗圆哥秋挂啊宝活些总给诉曲名香数晚奶您爷很变勺张汉图泥铁环依尽穷层照炉烟川直银仙顶巨位闪狗形状湖区胜岛弯现就外份枝客城市孔钉味号丰观呀答话抬能信阵做冻第像冷冰亮种棵以次想邻居吧奇怪货科楼代穿视利路同志军敌常非每战士戴难忘民因理串裤令反村由于员被声岁消息抄炒绝灭舟独阴似野低论船猫切该散步失要伙伴歌得闭忙谁汽饥饿宁库拿仔极送椅怎拉收接纸抓线吵但受句哭游戏爱呢跳咱狼蛇',
    supplements: [{ hanzi: '蝌', pinyin: 'kē', pdfPage: 113 }],
  },
  {
    ...LEVELS[3],
    edition: '2017投入使用、按2022年课程标准修订的可核验版',
    writeTablePages: 'PDF 124-126（书页 119-121）',
    recognitionTablePages: 'PDF 120-123（书页 115-118）',
    writeList: '诗童趁碧妆绿丝剪冲寻姑娘仔吐柳荡桃杏鲜邮递员原叔局堆认礼邓植格引注满休息锋昨冒留弯背洒温暖能桌味买具甘甜菜劳匹妹波纹像景恋舍求州华岛各民族谊齐奋贴街舟艾敬转团热闹贝壳甲骨钱币与财购烧茄烤鸭肉鸡蛋炒饭彩梦森拉结苹般精灵伞姨弟便教游戏母周围补充药合死记屁股净总幸婶使劲亡牢钻劝丢告筋疲图课摆座室交哈页抢嘻愿意麦该伯刻突掉湖莲穷荷绝含岭吴雷乌黑压垂户新迎扑指针帮助导永碰特积杯失洗澡容易浴桶扇慢遇兔安根痛最店决定商夫终完换期蛙卖搬倒籽泉破应整抽纺织编怎布消祖啊浓望蓝摘掏赛忆觉值类艰弓炎害此帝传忽启由理段通',
    supplements: [
      ['莺', 'yīng'], ['拂', 'fú'], ['堤', 'dī'], ['醉', 'zuì'], ['咏', 'yǒng'], ['绦', 'tāo'], ['裁', 'cái'],
      ['脱', 'tuō'], ['袄', 'ǎo'], ['羞', 'xiū'], ['遮', 'zhē'], ['掩', 'yǎn'], ['探', 'tàn'], ['嫩', 'nèn'],
      ['符', 'fú'], ['解', 'jiě'], ['触', 'chù'], ['杜', 'dù'], ['鹃', 'juān'], ['裹', 'guǒ'], ['颈', 'jǐng'],
      ['寄', 'jì'], ['漏', 'lòu'], ['懊', 'ào'], ['丧', 'sàng'], ['猬', 'wèi'], ['绚', 'xuàn'], ['坛', 'tán'],
      ['龄', 'líng'], ['致', 'zhì'], ['勃', 'bó'], ['挖', 'wā'], ['选', 'xuǎn'], ['茁', 'zhuó'], ['移', 'yí'],
      ['挥', 'huī'], ['填', 'tián'], ['扶', 'fú'], ['亭', 'tíng'], ['咨', 'zī'], ['询', 'xún'], ['剧', 'jù'], ['管', 'guǎn'],
    ].map(([hanzi, pinyin]) => ({ hanzi, pinyin, pdfPage: 120 })),
  },
];

const MARKED_PINYIN = {
  'ā': ['a', 1], 'á': ['a', 2], 'ǎ': ['a', 3], 'à': ['a', 4],
  'ē': ['e', 1], 'é': ['e', 2], 'ě': ['e', 3], 'è': ['e', 4],
  'ī': ['i', 1], 'í': ['i', 2], 'ǐ': ['i', 3], 'ì': ['i', 4],
  'ō': ['o', 1], 'ó': ['o', 2], 'ǒ': ['o', 3], 'ò': ['o', 4],
  'ū': ['u', 1], 'ú': ['u', 2], 'ǔ': ['u', 3], 'ù': ['u', 4],
  'ǖ': ['v', 1], 'ǘ': ['v', 2], 'ǚ': ['v', 3], 'ǜ': ['v', 4],
  'ü': ['v', 5],
};

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [headers, ...values] = rows;
  return values.map((fields) => Object.fromEntries(headers.map((header, index) => [header, fields[index] ?? ''])));
}

export function pinyinKey(pinyin) {
  let tone = 5;
  const base = [...pinyin.trim().toLowerCase()].map((character) => {
    const marked = MARKED_PINYIN[character];
    if (marked) {
      tone = marked[1];
      return marked[0];
    }
    return character === 'ü' ? 'v' : character;
  }).join('').replace(/[^a-zv]/g, '');

  if (!base) throw new Error(`Cannot derive a pinyin key from "${pinyin}"`);
  return `${base}${tone}`;
}

function numericKey(token) {
  const normalized = token.toLowerCase().replaceAll('u:', 'v').replaceAll('ü', 'v').replace(/[^a-zv1-5]/g, '');
  return /[1-5]$/.test(normalized) ? normalized : `${normalized}5`;
}

function primaryPinyin(value) {
  return value.split(/[,;/]/, 1)[0].trim().toLowerCase();
}

function applyIllustrations(snapshot) {
  return {
    ...snapshot,
    characters: snapshot.characters.map((entry) => {
      const { theme, illustration } = illustrationFor(entry.hanzi);
      return { ...entry, theme, illustration };
    }),
  };
}

function buildWordIndex(vocabulary) {
  const index = new Map();

  for (const item of vocabulary) {
    const characters = [...item.simplified];
    if (!characters.length || characters.length > 4 || !characters.every((character) => /\p{Script=Han}/u.test(character))) continue;

    const form = item.forms?.[0];
    const numericTokens = form?.transcriptions?.numeric?.trim().split(/\s+/) ?? [];
    const markedTokens = form?.transcriptions?.pinyin?.trim().split(/\s+/) ?? [];
    if (numericTokens.length !== characters.length || markedTokens.length !== characters.length) continue;

    const candidate = {
      word: item.simplified,
      pinyin: form.transcriptions.pinyin.toLowerCase(),
      frequency: Number.isFinite(item.frequency) ? item.frequency : Number.MAX_SAFE_INTEGER,
    };

    characters.forEach((character, position) => {
      const key = `${character}:${numericKey(numericTokens[position])}`;
      const candidates = index.get(key) ?? [];
      if (!candidates.some(({ word }) => word === candidate.word)) candidates.push(candidate);
      index.set(key, candidates);
    });
  }

  for (const candidates of index.values()) {
    candidates.sort((left, right) => left.frequency - right.frequency || left.word.length - right.word.length || left.word.localeCompare(right.word, 'zh-CN'));
  }
  return index;
}

function buildSnapshot(hanziRows, vocabulary) {
  const rowsByHanzi = new Map(hanziRows.map((row) => [row.character, row]));
  const wordIndex = buildWordIndex(vocabulary);
  const seen = new Map();
  const curriculumAudit = [];
  const selected = [];

  for (const textbook of TEXTBOOK_LEVELS) {
    const retained = [];
    const duplicates = [];
    for (const [index, hanzi] of [...textbook.writeList].entries()) {
      const firstSeenAt = seen.get(hanzi);
      if (firstSeenAt) {
        duplicates.push({ hanzi, originalOrder: index + 1, firstSeenAt });
        continue;
      }
      retained.push({ hanzi, pinyin: null, sourceKind: 'write-table', sourcePage: textbook.writeTablePages });
      seen.set(hanzi, `${textbook.id}:${index + 1}`);
    }

    if (retained.length + textbook.supplements.length !== textbook.characterCount) {
      throw new Error(`${textbook.id} needs ${textbook.characterCount - retained.length} recognition-table supplements, found ${textbook.supplements.length}`);
    }
    for (const supplement of textbook.supplements) {
      if (seen.has(supplement.hanzi)) throw new Error(`${textbook.id} supplement ${supplement.hanzi} is not globally unique`);
      retained.push({ ...supplement, sourceKind: 'recognition-table', sourcePage: `PDF ${supplement.pdfPage}` });
      seen.set(supplement.hanzi, `${textbook.id}:supplement-${retained.length}`);
    }

    curriculumAudit.push({
      levelId: textbook.id,
      edition: textbook.edition,
      writeTablePages: textbook.writeTablePages,
      recognitionTablePages: textbook.recognitionTablePages,
      originalWriteCount: [...textbook.writeList].length,
      duplicateCount: duplicates.length,
      supplementCount: textbook.supplements.length,
      duplicates,
      supplements: textbook.supplements,
    });
    selected.push(...retained.map((item, index) => ({ ...item, level: textbook, order: index + 1 })));
  }

  if (selected.length !== 800 || seen.size !== 800) throw new Error(`Curriculum must resolve to 800 unique characters, found ${selected.length}/${seen.size}`);

  const characters = selected.map((item, globalIndex) => {
    const row = rowsByHanzi.get(item.hanzi);
    if (!row) throw new Error(`Dictionary data is missing ${item.hanzi}`);
    const pinyin = item.pinyin ?? primaryPinyin(row.pinyin);
    const key = pinyinKey(pinyin);
    const candidates = wordIndex.get(`${item.hanzi}:${key}`) ?? [];
    const words = (candidates.length ? candidates.slice(0, 2) : [{ word: item.hanzi, pinyin }])
      .map(({ word, pinyin: wordPinyin }) => ({ word, pinyin: wordPinyin }));
    const illustrated = illustrationFor(item.hanzi);

    return {
      id: `hanzi-${String(globalIndex + 1).padStart(4, '0')}`,
      hanzi: item.hanzi,
      levelId: item.level.id,
      grade: item.level.grade,
      semester: item.level.semester,
      order: item.order,
      theme: illustrated.theme,
      readings: [{ key, pinyin, audioId: `syllable-${key}`, words }],
      primaryReadingKey: key,
      illustration: illustrated.illustration,
    };
  });

  const adventureLevels = Array.from({ length: 80 }, (_, index) => ({
    id: `adventure-${String(index + 1).padStart(2, '0')}`,
    island: Math.floor(index / 10) + 1,
    level: (index % 10) + 1,
    order: index + 1,
    title: `第${Math.floor(index / 10) + 1}岛 · 第${(index % 10) + 1}关`,
    characterIds: characters.slice(index * 10, index * 10 + 10).map(({ id }) => id),
  }));

  return {
    schemaVersion: 2,
    description: '以四册写字表首次出现顺序为主、用同册识字表补足跨册重复的 800 个唯一汉字离线字库。',
    sources: [
      ...TEXTBOOK_LEVELS.map(({ id, title, edition, writeTablePages, recognitionTablePages }) => ({ id, title, edition, writeTablePages, recognitionTablePages })),
      { name: 'hanziDB', purpose: '单字主读音与释义', revision: HANZI_REVISION, license: 'MIT' },
      { name: 'Complete HSK Vocabulary', revision: HSK_REVISION, license: 'MIT' },
    ],
    levels: LEVELS,
    adventureLevels,
    curriculumAudit,
    characters,
  };
}

function generateRegistry(snapshot, pets, achievements) {
  const audioIds = [...new Set(snapshot.characters.flatMap(({ readings }) => readings.map(({ audioId }) => audioId)))].sort();
  const sceneIds = [...new Set(snapshot.characters.map(({ illustration }) => illustration.sceneId))].sort();
  const audioEntries = audioIds.map((id) => `  '${id}': require('../../assets/audio/syllables-indextts-normalized/${id.replace('syllable-', '')}.mp3'),`).join('\n');
  const sceneEntries = sceneIds.map((id) => `  '${id}': require('../../assets/illustrations/scenes/${id.replace('scene-', '')}.svg'),`).join('\n');

  return `// Generated by scripts/build-content.mjs. Do not edit by hand.\n` +
    `import type { AchievementDefinition, AdventureLevel, CharacterEntry, LevelDefinition, PetDefinition, Reading, WordExample } from './types';\n\n` +
    `export const LEVELS = ${JSON.stringify(snapshot.levels, null, 2)} as const satisfies readonly LevelDefinition[];\n\n` +
    `export const ADVENTURE_LEVELS = ${JSON.stringify(snapshot.adventureLevels, null, 2)} as const satisfies readonly AdventureLevel[];\n\n` +
    `export const PETS = ${JSON.stringify(pets, null, 2)} as const satisfies readonly PetDefinition[];\n\n` +
    `export const ACHIEVEMENTS = ${JSON.stringify(achievements, null, 2)} as const satisfies readonly AchievementDefinition[];\n\n` +
    `export const AUDIO_ASSETS = {\n${audioEntries}\n} as const;\n\n` +
    `export const SCENE_ASSETS = {\n${sceneEntries}\n} as const;\n\n` +
    `export const CHARACTERS = ${JSON.stringify(snapshot.characters, null, 2)} as const satisfies readonly CharacterEntry[];\n\n` +
    `export function getCharacterById(id: string): CharacterEntry | undefined {\n  return CHARACTERS.find((entry) => entry.id === id);\n}\n\n` +
    `export function primaryReading(entry: CharacterEntry): Reading {\n  return entry.readings.find((reading) => reading.key === entry.primaryReadingKey) ?? entry.readings[0];\n}\n\n` +
    `export function primaryPinyin(entry: CharacterEntry): string {\n  return primaryReading(entry).pinyin;\n}\n\n` +
    `export function primaryWords(entry: CharacterEntry): readonly WordExample[] {\n  return primaryReading(entry).words;\n}\n`;
}

function csvCell(value) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function generateReplacements(snapshot) {
  const rows = [['assetType', 'assetId', 'path', 'status', 'generatedBy', 'reviewNotes']];
  const firstIslandAudioIds = new Set(
    snapshot.characters
      .filter(({ levelId }) => levelId === 'grade-1-fall')
      .flatMap(({ readings }) => readings.map(({ audioId }) => audioId)),
  );
  const audioIds = [...new Set(snapshot.characters.flatMap(({ readings }) => readings.map(({ audioId }) => audioId)))].sort();
  const sceneIds = [...new Set(snapshot.characters.map(({ illustration }) => illustration.sceneId))].sort();
  for (const id of audioIds) {
    const isFirstIsland = firstIslandAudioIds.has(id);
    rows.push([
      'audio',
      id,
      `assets/audio/syllables-indextts-normalized/${id.replace('syllable-', '')}.mp3`,
      isFirstIsland ? 'synthetic-reference-pending-human-voiceover' : 'synthetic-pending-professional-review',
      'IndexTTS-2.5 rabbit-0',
      isFirstIsland ? '第一岛上线前需替换为真人配音并复核声调、多音字与音量' : '上线前复核声调、多音字与音量',
    ]);
  }
  for (const character of snapshot.characters) {
    const isFirstIsland = character.levelId === 'grade-1-fall';
    rows.push([
      'illustration',
      character.id,
      `assets/illustrations/characters-webp/${character.id}.webp`,
      isFirstIsland ? 'ai-draft-pending-first-island-blind-test' : 'ai-generated-pending-professional-review',
      'character-illustration-pipeline',
      isFirstIsland
        ? `第一岛识字卡「${character.hanzi}」需完成家长盲测与人工精修`
        : `上线前复核「${character.hanzi}」插画指认度、无文字水印与风格一致性`,
    ]);
  }
  for (const id of sceneIds) {
    rows.push(['scene', id, `assets/illustrations/scenes/${id.replace('scene-', '')}.svg`, 'placeholder-pending-professional-review', 'hand-authored SVG', '上线前替换为授权的儿童插画']);
  }
  return `${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`;
}

function generateCurriculumReplacements(snapshot) {
  const rows = [['levelId', 'originalHanzi', 'originalOrder', 'firstSeenAt', 'replacementHanzi', 'replacementPinyin', 'replacementPdfPage', 'reason']];
  for (const audit of snapshot.curriculumAudit) {
    audit.duplicates.forEach((duplicate, index) => {
      const replacement = audit.supplements[index];
      rows.push([
        audit.levelId,
        duplicate.hanzi,
        duplicate.originalOrder,
        duplicate.firstSeenAt,
        replacement.hanzi,
        replacement.pinyin,
        replacement.pdfPage,
        '跨册重复跳过；按同册识字表顺序补足',
      ]);
    });
  }
  return `${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`;
}

async function loadSnapshot() {
  return JSON.parse(await readFile(SOURCE_PATH, 'utf8'));
}

async function refresh() {
  const [hanziResponse, hskResponse] = await Promise.all([fetch(HANZI_URL), fetch(HSK_URL)]);
  if (!hanziResponse.ok) throw new Error(`Cannot fetch hanzi source: ${hanziResponse.status}`);
  if (!hskResponse.ok) throw new Error(`Cannot fetch HSK source: ${hskResponse.status}`);
  const snapshot = buildSnapshot(parseCsv(await hanziResponse.text()), await hskResponse.json());
  await writeFile(SOURCE_PATH, `${JSON.stringify(snapshot, null, 2)}\n`);
  return snapshot;
}

async function main() {
  const check = process.argv.includes('--check');
  const snapshot = applyIllustrations(process.argv.includes('--refresh') ? await refresh() : await loadSnapshot());
  const [pets, achievements] = await Promise.all([
    readFile(PETS_PATH, 'utf8').then(JSON.parse),
    readFile(ACHIEVEMENTS_PATH, 'utf8').then(JSON.parse),
  ]);
  const outputs = [
    [SOURCE_PATH, `${JSON.stringify(snapshot, null, 2)}\n`],
    [REGISTRY_PATH, generateRegistry(snapshot, pets, achievements)],
    [REPLACEMENTS_PATH, generateReplacements(snapshot)],
    [CURRICULUM_REPLACEMENTS_PATH, generateCurriculumReplacements(snapshot)],
  ];

  if (check) {
    for (const [filePath, expected] of outputs) {
      const actual = await readFile(filePath, 'utf8').catch(() => '');
      if (actual !== expected) throw new Error(`${path.relative(ROOT, filePath)} is stale; run node scripts/build-content.mjs`);
    }
    console.log(`Content build is current: ${snapshot.characters.length} characters.`);
    return;
  }

  await Promise.all(outputs.map(([filePath, content]) => writeFile(filePath, content)));
  console.log(`Built ${snapshot.characters.length} characters, ${new Set(snapshot.characters.flatMap(({ readings }) => readings.map(({ audioId }) => audioId))).size} audio references.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
