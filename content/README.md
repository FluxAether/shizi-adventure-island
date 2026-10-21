# 800 字内容源

`characters.json` 是本项目的离线、可审核内容快照。当前采用 2024 统编版一至二年级写字表首次出现顺序为主，跨册重复字按同册识字表补足，总数固定 800。

## 可核验来源

- 一年级上册 / 一年级下册 / 二年级上册：2024 修订版写字表（PDF 附录）
- 二年级下册：当前可核验到的是 2017 投入使用、按 2022 年课程标准修订的版本写字表与识字表补足；不虚构“2024 下册写字表”
- 单字主读音与释义：`ruddfawcett/hanziDB.csv` 修订 `3e9f908d25f70674862343b201f6b641a36cd226`，MIT
- 常用组词：`drkameleon/complete-hsk-vocabulary` 修订 `7ac65bf1a6387d35f1ade478906172a19311c7f9`，MIT

完整第三方版权声明见 `THIRD_PARTY_NOTICES.md`。跨册重复替换记录见 `production/curriculum-replacements.csv`。

来源 URL 只记录在本文档和构建脚本中，不会进入应用内容 registry。

## 重建与检查

```sh
node scripts/build-content.mjs --refresh
bash scripts/generate-audio.sh
node scripts/build-content.mjs --check
node scripts/validate-media.mjs --deep
node --test tests/content/content.test.mjs
```

`--refresh` 才会访问固定修订的公开源；日常构建与校验完全离线。合成音频和占位插画的专业复核状态见 `production/replacements.csv`。
