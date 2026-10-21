# 识字冒险岛

[![Expo](https://img.shields.io/badge/Expo-SDK%2057-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react&logoColor=white)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**对照小学语文写字表整理的 800 字随身练习。**

面向幼小衔接与小学低年级，以识字卡学习为主，游戏复习与宠物奖励为辅。默认每日练习上限为 12 分钟，无广告、无账号，学习记录保存在本机。

[功能特性](#功能特性) · [快速开始](#快速开始) · [开发与检查](#开发与检查) · [构建与更新](#构建与更新) · [目录结构](#目录结构) · [内容与隐私](#内容与隐私) · [相关文档](#相关文档) · [许可证](#许可证)

## 功能特性

- **800 字学习内容**：分为 8 岛、80 关，每关 10 字，结合拼音、词组、插画和预置音频进行练习。
- **识字卡学习**：支持翻面看组词、滑动换字、收藏、播放发音及已收录多音字的读音切换。每轮默认 8 张，优先安排未学和待巩固的汉字。
- **游戏化复习**：提供听音选字、记忆翻牌、拖字成词和限时挑战四种玩法，巩固字音、字形与词组记忆。
- **宠物与成就**：8 种宠物随学习进度解锁，可用学习获得的星星喂食、帮助宠物成长并兑换装扮，成就按学习指标解锁。
- **家长管理**：通过口算验证后，查看今日与近一周学习报告，管理内置字库、声音设置与每日练习时长。
- **本地优先**：核心学习内容与媒体随应用提供，学习进度保存在 SQLite，偏好设置保存在 AsyncStorage，不依赖账号或云端学习服务。

### 学习规则

识字卡是主路径，游戏用于复习，宠物只提供奖励。限时挑战每轮 75 秒、10 题，**答对至少 7 题才算通过并推进关卡**；识字卡与其他复习游戏不会直接解锁新关卡。

项目不以全面启蒙平台为目标，不计划加入直播课、拼音全科、描红、AI 对话或账号体系。

## 快速开始

### 环境要求

- 推荐使用 **Node.js 24 LTS，版本不低于 24.3.0**，并使用 npm 管理依赖。
- Android 本地原生开发需要 Android Studio、Android SDK 及匹配的 JDK。
- iOS 本地原生开发需要 macOS 与 Xcode。
- 原生环境配置可参考 [Expo 开发环境指南](https://docs.expo.dev/get-started/set-up-your-environment/)。

### 安装依赖

```bash
git clone https://github.com/thomas92118/shizi-adventure-island.git
cd shizi-adventure-island
npm ci
```

仓库使用 `package-lock.json` 锁定依赖，常规开发不需要重新生成音频或插画。

### 启动开发

```bash
# 启动 Metro 开发服务器
npm start

# 在浏览器中开发
npm run web
```

需要运行原生应用时，在配置好对应开发环境后执行：

```bash
# 编译并运行 Android 开发应用
npm run android

# 编译并运行 iOS 开发应用，仅限 macOS
npm run ios
```

项目包含原生依赖、配置插件和 `expo-dev-client`，建议使用 development build 进行原生功能开发，不将 Expo Go 作为完整功能的验证环境。后续调试可使用 `npm start` 连接已安装的开发应用。

## 开发与检查

### 常用检查

```bash
npm run typecheck
npm run lint
npm test
npm run validate:content
npm run validate:media
```

| 命令 | 用途 |
| --- | --- |
| `npm run typecheck` | 执行 TypeScript 类型检查，不生成编译产物 |
| `npm run lint` | 检查代码风格与静态问题 |
| `npm test` | 使用 Jest 与 `jest-expo` 运行测试 |
| `npm run validate:content` | 检查内容快照与配套清单的一致性 |
| `npm run validate:media` | 检查音频、插画等媒体资源 |

### 素材制作

以下命令用于维护素材，不是首次运行项目的必要步骤：

| 命令 | 用途 |
| --- | --- |
| `npm run generate:audio` | 运行 IndexTTS 音频生成脚本，需要单独准备推理环境与模型 |
| `npm run generate:illustrations` | 默认导出插画提示词并同步现有素材索引，不直接发起图片生成 |
| `npm run sync:illustrations` | 根据现有插画素材重新生成运行时资源索引 |
| `npm run bundle:illustrations` | 将源 PNG 转换为打包用 WebP，并同步资源索引，需要 ffmpeg 与源文件 |

运行时字卡插画使用 `assets/illustrations/characters-webp/`，音节音频使用 `assets/audio/syllables-indextts-normalized/`。原始 PNG 和未归一化音频不作为运行时资源，也不随当前仓库提交。

重新制作素材前，请先核对脚本参数、模型与参考素材授权，以及 [生产素材替换清单](production/README.md)。

## 构建与更新

应用配置位于 [app.config.js](app.config.js)，构建配置位于 [eas.json](eas.json)。构建与更新脚本通过 `npx eas-cli@latest` 调用 EAS CLI；首次运行时可能下载 CLI。`eas.json` 要求 EAS CLI 不低于 `21.3.0`。

### 配置环境变量

执行 EAS 命令前，先登录具有对应项目权限的 Expo 账号，并在本地环境中提供项目标识。云端构建与更新所使用的环境也应配置一致的值。

| 环境变量 | 说明 |
| --- | --- |
| `EAS_PROJECT_ID` | EAS 项目 ID；也支持 `EXPO_PUBLIC_EAS_PROJECT_ID`。配置会据此设置项目关联和更新地址 |
| `APP_BUNDLE_ID` | iOS Bundle Identifier 与 Android package；也支持 `EXPO_PUBLIC_APP_BUNDLE_ID` |
| `EXPO_OWNER` | Expo 账号或组织名称，可选 |
| `EXPO_PUBLIC_APP_NAME` | 应用名称，默认 `识字冒险岛` |
| `EXPO_PUBLIC_APP_SLUG` | Expo slug，默认 `shizi-adventure-island` |
| `EXPO_PUBLIC_APP_SCHEME` | URL scheme，默认 `shiziadventure` |

注意：

- 未提供项目 ID 且没有其他有效项目关联时，EAS 命令会提示 `EAS project not configured`。复用已有项目时，应使用既有项目 ID，避免误创建新项目。
- 未设置包名时会使用 `com.example.shiziadventureisland`。**发布前必须确认正式包名**，并与已有应用保持一致。
- `EXPO_PUBLIC_*` 变量会公开到客户端，不应存放密钥或其他敏感信息；本地环境文件不应提交到仓库。
- EAS 环境变量的创建、可见性与本地同步方式见 [官方文档](https://docs.expo.dev/eas/environment-variables/)。

### 原生构建

| Profile | 用途 | 分发方式 | 更新 Channel |
| --- | --- | --- | --- |
| `development` | 包含开发客户端的原生开发构建 | 内部分发 | `development` |
| `preview` | 预览与内部测试 | 内部分发 | `preview` |
| `production` | 商店发行构建，自动递增原生构建号 | 商店分发 | `production` |

以下示例构建 Android 应用：

```bash
# 开发构建
npx eas-cli@latest build --profile development --platform android

# 内部预览包
npm run build:preview -- --platform android

# 正式发行包
npm run build:production -- --platform android
```

构建 iOS 时，将 `--platform android` 改为 `--platform ios`，并准备相应的 Apple 签名与分发配置。生成发行包不等同于提交商店或通过审核。

### OTA 更新

```bash
npm run update:preview -- --environment preview
npm run update:production -- --environment production
```

当前 `runtimeVersion` 使用 `appVersion` 策略。更新必须与已安装原生应用的运行时兼容；原生依赖、原生配置或未纳入 OTA 的大型媒体发生变化时，应重新构建应用。

应用通过自己的更新流程检查原生发行版更新，在用户确认后下载并重启。开发模式与 Web 不执行该原生 OTA 流程，检查更新失败不会阻止进入应用。

大型静态媒体主要保留在原生安装包中，OTA 仅发布 JavaScript 与配置允许的资源；具体范围以 `app.config.js` 中的 `updates.assetPatternsToBeBundled` 为准。

## 目录结构

```text
app/                    Expo Router 页面、导航与家长入口
assets/                 音频、插画、宠物、动画与应用图标
content/                汉字与课程内容源数据
src/
  components/           学习卡片、游戏组件与通用 UI
  content/              运行时内容与资源索引
  db/                   本地数据库与迁移
  game-logic/           小游戏题目生成与玩法逻辑
  services/             学习进度、奖励、计时与应用更新
  store/                Zustand 应用状态
  types/                共享类型定义
plugins/                Expo 原生配置插件
scripts/                内容构建、素材生成与校验脚本
tests/                  自动化测试
production/             素材复核与替换清单
docs/                   优化计划、上架材料与方案调研
app.config.js           动态应用配置
brand.config.js         应用品牌与标识配置
eas.json                EAS 构建配置
```

## 内容与隐私

### 字库来源与适用范围

字库共 800 个不同汉字，对照小学语文写字表整理：一年级上册 100 字、下册 200 字，二年级上、下册各 250 字。

一年级上册、一下、二上依据 2024 修订版写字表；二年级下册依据可核验的课标修订版整理。详细来源与整理方式见 [内容说明](content/README.md)。

**本项目不是教育部官方教材，也不代表教材出版方。** 字库与练习用于辅助识字，不替代课堂教学或完整课程体系。

### 本地数据与网络访问

- 无账号、无广告，学习记录保存在本机，不提供账号同步或云端学习记录服务。
- 核心学习与复习内容支持离线使用；卸载应用或清除本地数据可能导致学习记录丢失。
- 启用 EAS Updates 的原生发行版会与 Expo 更新服务通信，因此「本地优先」不表示应用绝不联网。
- 发布应用前，请结合实际配置、分发平台与使用的第三方资源复核隐私说明及商店声明。

## 相关文档

- [优化计划](docs/optimization-plan.md)：产品方向与后续排期，规划项不代表已实现功能。
- [上架材料](docs/store-listing.md)：商店文案、年龄建议、儿童类问卷与截图建议。
- [生产素材替换清单](production/README.md)：音频和插画的复核、替换状态。
- [中文语音方案调研](docs/chinese-tts-research.md)：语音方案与许可问题的历史调研记录。
- [汉字插画方案调研](docs/hanzi-illustration-research.md)：插画方案、素材选型与制作建议。

## 许可证

项目代码采用 [MIT License](LICENSE)。

字体、音频、插画、模型及其他第三方资源仍需遵守各自的许可与授权条件；项目的 MIT 许可证不替代上游许可、参考声音授权或发布前的素材复核。
