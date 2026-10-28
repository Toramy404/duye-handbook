# 第三方来源与许可

本项目新增程序代码由维护者确认按 GPL-3.0 发布，许可证全文见 LICENSE。此声明不改变第三方内容的权利，也不授予游戏图像或表情的额外权利。

## 语音预览依赖（2026-10-28）

- 轻量中文使用 [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx)（Apache-2.0）及官方Release的 `sherpa-onnx-streaming-zipformer-small-ctc-zh-int8-2025-04-01`。其[ONNX模型卡](https://huggingface.co/csukuangfj/sherpa-onnx-streaming-zipformer-small-ctc-zh-int8-2025-04-01)指向[原始训练模型](https://huggingface.co/csukuangfj/icefall-streaming-zipformer-small-ctc-zh-2025-04-01)，后者标注Apache-2.0。
- 对照使用 [Vosk API](https://github.com/alphacep/vosk-api/blob/master/COPYING)（Apache-2.0）及 `vosk-model-small-cn-0.22`；[官方模型表](https://alphacephei.com/vosk/models)列出该模型的Apache-2.0许可。
- 简称为本项目人工维护；拼音由 [pypinyin](https://github.com/mozillazg/python-pinyin) 0.55.0派生（MIT），完整声明见 `dist/PINYIN-LICENSE.txt`，随离线名称索引保存。

Python环境与模型仅从各官方源下载到忽略的 `.voice-runtime/`，本轮不随Git、APK或Release分发。模型URL和压缩包SHA-256固定在 `scripts/setup_voice.py`；依赖版本在 `scripts/voice-requirements.txt`。Windows系统Huihui语音仅用于生成本机回归夹具，不分发语音引擎或录音。后续Android封装需同时附所选模型及其运行时依赖的完整声明。

## 游戏资料与素材

| 内容 | 来源与适用说明 |
| --- | --- |
| QuickRef 衍生资料及对应图标 | [xxiixi/NightreignQuickRef](https://github.com/xxiixi/NightreignQuickRef)，采用的资料快照 commit 为 3e23450094c18125ae5665927ed240b18189a040，保留 GPL-3.0 全文；对游戏原有美术不作独立授权保证 |
| 八位本体夜王头像 | [Nightreign Overlay 的 nightlordIcons](https://github.com/shahf215/Nightreign-Overlay/tree/main/public/assets/nightlordIcons)，其 README 声明个人、非商业使用；不纳入本项目新增代码的许可声明 |
| 安定者、废弃物之王图标 | QuickRef 的 the-will-of-the-balancers / the-night-of-dregs 遗物图标，非角色肖像 |
| 物理/属性伤害类型图标 | QuickRef 的 Negations 资源目录 |
| 大空洞底图 | [Nightreign Sidekick](https://nightreignsidekick.com/)，独立再分发许可未确认 |
| 大空洞地表组合原图 | Alex0Goat / SisterNun，保留原图水印；引述水印要求不等于所有用途授权 |
| 打伞骑士表情 | 用户提供的现有图片副本；作者和再分发许可尚未确认，保留原始像素，不宣称原创 |
| 其他数值与配置来源 | data/sources.json 的逐来源链接、日期、许可备注，以及原记录中的 source/核对字段 |

资料经字段统一、别名关联、展示分组及明确记录的纠错。具体修改见 data/corrections.json；来源冲突见 data/issues.json。没有从其他项目复制整套界面代码。

未确认的素材许可是尚待处理的维护事项。公开源码、提供署名或个人非商业用途声明不等于已取得全部素材授权。商业分发、上架或再次转授素材前，需要分别取得明确许可或替换为可授权素材。权利问题可通过仓库 Issue 提供具体文件、来源和证明，维护者据实处理。

## 武器图鉴首批预览资料（2026-10-17）

首批 24 件装备使用仓库保存的 Nightreign 研究事实记录；逐条链接保留在 `data/sources.json` 与详情页。Mobalytics、BWIKI、QuickRef 及官方指南各自的核验范围保留在研究来源中；未将官方指南的搜索摘录当成完整 PDF 核验。没有复制网站武器图片或网页全文，也未用艾尔登法环本体数据补空白。类别符号由本项目以 SVG 路径绘制，仅表示近战、远程、触媒和盾牌。

## v0.5.0 武器目录扩展与缩圈计时参考

目录扩展取用游民星空（两辑武器图鉴）与游侠网（33 类装备图鉴）的名称、分类事实，逐项保留网页定位、原名和采用规则；发现错名或数值错行时不直接转录。18 件新增传说面板取自 Mobalytics 的对应 Nightreign 武器页，所有数值和来源条件保存在独立输入中，未复制武器图片、网页全文或介绍文案。新增目录与面板输入见 `docs/research/weapon-catalog-index-20261017.json`、`docs/research/weapon-legendary-expansion-20261017.json`，对应来源链接见 `data/sources.json`。

手动倒计时使用既有 QuickRef 时间轴和 3DM 转载的社区测试记录作参考。末次缩圈结束的 14:00 / 14:30 冲突保留在 `data/circle_timing.json`，界面标为预计时间；3DM 原文来源注明为 Steam、作者琪。这里只整理时间事实和来源链接，不复制攻略正文。

## 武器面板补全预览（2026-10-17）

新增研究输入 `docs/research/weapon-panel-audit-20261017.json` 只保留事实字段、出处、修订与差异，不包含网站图片、攻略正文或界面代码。Mobalytics 页面提供387件面板；NightreignArmamentHelper 的基础武器参数用于数值核对；JDennisUF/nightreign_info 明示转录RPS表，因此按一条来源链记录，不计成两个独立来源；BWIKI以固定修订记录，Game8的少量争议字段来自检索摘录；蝎纹鸢形盾页面另已直接读取，逐来源注明读取范围。

参数摘录固定于 nextfinish/NightreignArmamentHelper 的 `eab1dbdcdabf0f5a99a13e6051e2738b03c15879`；上游MIT许可证全文保存在 `docs/research/armamenthelper-LICENSE.txt`，并附入离线资源 `dist/DATA-LICENSE.txt`。未执行上游程序，也未包含其游戏内存读取功能。网站素材的既有许可边界不因本次核对改变。

## 待核字段接续（2026-10-18）

`weapon-panel-followup-20261018.json`仅摘录GameWith和Game8日文攻略的本轮目标品质、字母补正及指定数值事实，保留URL、取得日期、页面快照哈希和条件；不分发网页全文、图片或攻略文案。Game8中英文不计为两个独立发布者，GameWith列表与详情也不重复计数。两站不同条件示例保留原值，来源解释由本项目重新整理。
