<div align="center">

<img src="docs/cover.png" alt="代码动画工作台" width="100%">

# 代码动画工作台

341 种代码动画风格提示词，接入 DeepSeek Harness 对话框。

[![stars](https://img.shields.io/github/stars/wyf-yfw/dsh-code-animation?style=flat-square&logo=github&logoColor=white&label=stars&color=ff8a3d)](https://github.com/wyf-yfw/dsh-code-animation/stargazers)
[![license](https://img.shields.io/badge/license-MIT-3ea675?style=flat-square)](LICENSE)
[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek_Harness-plugin-4d6bfe?style=flat-square)](https://github.com/deepseek-ai/dsh)
[![styles](https://img.shields.io/badge/styles-341-e0457b?style=flat-square)](#风格库)
[![stills](https://img.shields.io/badge/stills-193-7b5bff?style=flat-square)](#风格库)

[![tools](https://img.shields.io/badge/tools-5-ff9a4d?style=flat-square)](#工具参考)
[![export](https://img.shields.io/badge/export-MP4%20H.264%2BAAC-3fd7c0?style=flat-square)](#导出)
[![score](https://img.shields.io/badge/score-8%20presets-ffc04d?style=flat-square)](#配乐)
[![deps](https://img.shields.io/badge/deps-0-2f9e6e?style=flat-square)](#限制)
[![PRs](https://img.shields.io/badge/PRs-welcome-e0457b?style=flat-square)](#参与)

[概述](#概述) · [安装](#安装) · [使用](#使用) · [工具参考](#工具参考) · [配乐](#配乐) · [导出](#导出) · [架构](#架构) · [故障排查](#故障排查) · [限制](#限制)

</div>

---

## 概述

本项目把 [XiaoyeCodes/code-animation-prompts](https://github.com/XiaoyeCodes/code-animation-prompts)
的 341 种风格提示词与 193 张参考静帧封装成 DeepSeek Harness 的一个 Agent 模式。
在该模式下，Agent 通过五个工具检索风格、提交分镜、产出动画，成品以卡片形式出现在对话末尾，
可直接预览与导出。

动画由对话中的 Agent 直接编写为 HTML + Canvas，不经过第二次模型调用。
导出由浏览器完成，不依赖 ffmpeg、playwright 或网络。

```mermaid
sequenceDiagram
    autonumber
    participant U as 用户
    participant A as Agent（创作模式）

    Note over U,A: 第 1 步 · 需求澄清
    A->>U: 询问主题、画幅、时长、调性与配乐
    U-->>A: 讲「首屏从 3.2 秒压到 0.8 秒」，竖屏，8 秒

    Note over U,A: 第 2 步 · 风格推荐
    A->>U: show_stills → 3 张参考静帧与推荐理由

    Note over U,A: 第 3 步 · 风格确认
    U-->>A: 就第二个
    A->>A: get_style 读取完整视觉规范

    Note over U,A: 第 4 步 · 分镜草稿
    A->>U: save_storyboard → 时间轴 + 逐场画面 / 字幕 / 运镜

    Note over U,A: 第 5 步 · 分镜确认
    U-->>A: 第 2 场拉长到 3 秒

    Note over U,A: 第 6 步 · 生成与交付
    A->>U: save_animation → 可拖动预览 + 配乐 + 导出
```

### 流程门禁

六步流程与两道确认门禁写在系统提示中（`plugin/flow.js`，段落序号 450，位于策略区）。
门禁的用途是控制返工成本：

| 门禁 | 原因 |
|---|---|
| 推荐风格时必须调用 `show_stills` | 文字描述不足以判断视觉风格 |
| 风格确认前不写动画代码 | 风格错误意味着整段重做 |
| 分镜确认前不写动画代码 | 分镜是结构调整成本最低的阶段 |

`save_animation` 未携带 `storyboard_id` 时，预览卡片会标注「未经用户拍板」。
用户若在首条消息中同时给出风格编号与内容，可跳过前三步，分镜确认不可跳过。

### 界面

模式选择器新增「创作模式」：

<div align="center">
<img src="docs/mode-picker.png" alt="模式选择器中的创作模式" width="82%">
</div>

参考静帧、分镜草稿与动画预览渲染于 `conversation.chat.turnTail`，即回合末尾、
可折叠工具组之外，因此不会随工具组折叠而隐藏：

```
✓ 已处理 6 步                                    可折叠的工具调用日志
你的片子做好了，B3 粒子聚形，8 秒。

┌─────────────────────────────────────────┐
│ ● 风格候选            3 条参考静帧        │     回合级卡片
│ [静帧] [静帧] [静帧]                      │     始终展开
├─────────────────────────────────────────┤
│ ● 分镜 · 首屏加速        3 场 · 8s · 9:16 │
│ ▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░           │
│ 1  0.00–2.40s  粒子崩塌成数字…            │
├─────────────────────────────────────────┤
│ ● 首屏加速         B3 粒子聚形  8s 30fps  │
│ [ 动画预览 ]              [ 导出视频 ]    │
│ 配乐 [脉冲 ▾]  格式 [MP4 ▾]      [试听]   │
└─────────────────────────────────────────┘
```

---

## 安装

要求 dsh `0.2.1` 及以上。

```bash
git clone https://github.com/wyf-yfw/dsh-code-animation.git
```

安装两个 bundle。二者缺一不可：

```bash
dsh plugin install ./dsh-code-animation/plugin     # 风格库、工具、卡片
dsh plugin install ./dsh-code-animation/preset     # 声明「创作模式」
```

安装后新建会话，在模式选择器中选择「创作模式」。

---

## 使用

在创作模式下用自然语言描述需求即可。

| 输入 | 行为 |
|---|---|
| `想做个视频，讲我们这次把首屏从 3.2 秒压到 0.8 秒` | 提出澄清问题：受众、画幅、时长、调性 |
| `帮我挑个适合讲「三个人同时改一份文档」的风格` | 返回 2–3 个候选并附参考静帧 |
| `就第二个` | 读取该风格规范，提交分镜草稿待审 |
| `第 2 场拉长到 3 秒，结尾加一句「这次真的快了」` | 更新分镜并重新提交 |
| `可以，开始做` | 编写动画，输出预览卡片 |
| `用 B3 做一个 3 秒的粒子聚形，内容是 XXX` | 跳过前三步，仍先提交分镜 |
| `换个水墨风的，竖屏 9:16` | 按 Z 系列重做，画布改为 1080×1920 |

示例：

```text
想做一个 8 秒的竖屏短片，讲「首屏加载从 3.2 秒压到 0.8 秒」，
发在朋友圈，要爽快、有冲击力，主色 #4D6BFE。

用 A1 字雨做一个 5 秒的动画：屏幕上不断落下「已读」「未回」「在吗」，
越堆越多，最后压成一堵墙。16:9，30fps，深色背景。

用 O96 奥本海默风格做一段 4 秒的粒子火球，主题是「我们发布了一个东西」，
要黎明前试验场的质感，IMAX 颗粒。
```

---

## 工具参考

| 工具 | 阶段 | 作用 |
|---|---|---|
| `list_styles` | 2 | 检索 341 条风格，返回编号、名称、系列、适用题材、有无静帧、完整提示词 |
| `show_stills` | 2 | 将参考静帧作为图片写入对话，供风格判断 |
| `get_style` | 3 之后 | 读取单条风格的完整视觉规范 |
| `save_storyboard` | 4 | 提交分镜草稿并校验结构，渲染为时间轴与逐场清单 |
| `save_animation` | 6 | 校验 HTML 交付契约，落盘并挂载预览卡片 |

### 参数

**`list_styles`**

| 参数 | 类型 | 说明 |
|---|---|---|
| `query` | string | 关键词、风格名或编号，如 `水墨` / `B3` |
| `series` | string | 限定系列：`AG` `M` `K` `Z` `H` `L` `V` `X` `R` `O` |
| `limit` | integer | 返回条数，默认 12，上限 50 |

**`show_stills`**

| 参数 | 类型 | 说明 |
|---|---|---|
| `ids` | string[] | 风格编号，单次上限 4 条 |
| `note` | string | 推荐理由，显示在图片上方 |

**`save_storyboard`**

| 参数 | 类型 | 说明 |
|---|---|---|
| `title` | string | 片名 |
| `style_id` | string | 已确认的风格编号 |
| `duration` | number | 总时长（秒） |
| `fps` | integer | 帧率，默认 30 |
| `aspect` | enum | `16:9` / `9:16` / `1:1` |
| `music` | enum | 配乐预设，留空按风格自动选择 |
| `shots[]` | object[] | 镜头列表，字段：`start` `end` `scene` `text` `camera` |

**`save_animation`**

| 参数 | 类型 | 说明 |
|---|---|---|
| `title` | string | 片名 |
| `html` | string | 完整的动画 HTML 正文，上限 2 MB |
| `style_id` | string | 采用的风格编号 |
| `storyboard_id` | string | 已确认的分镜 id |
| `duration` / `fps` | number | 覆盖分镜中的取值 |
| `music` | enum | 覆盖分镜中的配乐 |

### 分镜校验

`save_storyboard` 检查以下结构问题，结果附在草稿卡片上：

| 检查项 | 示例输出 |
|---|---|
| 时间空档 | 第 2 场与上一场之间有 3s 空档 |
| 时间重叠 | 第 3 场与上一场时间重叠 |
| 起止倒置 | 第 2 场的结束时间不大于开始时间 |
| 超出总时长 | 第 4 场超出总时长 8s |
| 缺画面描述 | 第 2 场没有写画面内容 |
| 场次过少 | 只有 1 场：分镜至少拆成 3 场才有节奏 |
| 时长不齐 | 各场时长合计 6s，与总时长 8s 不一致 |

### 交付契约校验

`save_animation` 校验 HTML 是否满足预览与导出所需的接口：

| 检查项 | 原因 |
|---|---|
| 存在 `window.renderAt(t)` | 导出逐帧驱动，`t` 为秒，同一 `t` 须渲染同一帧 |
| 存在 `<canvas>` | 录制基于 `canvas.captureStream()` |
| 无 `Math.random()` | 需固定种子以保证可复现 |
| 无 `requestAnimationFrame` 自播 | 自播会与导出器争夺时间轴 |
| 无外部脚本、图片、样式表 | 离线可复现，并规避供应链风险 |
| 关联了分镜 | 否则卡片标注「未经用户拍板」 |

---

## 风格库

<div align="center">

| 系列 | 名称 | 数量 | | 系列 | 名称 | 数量 |
|:---:|---|:---:|---|:---:|---|:---:|
| **AG** | A–G 代码样片 | 26 | | **L** | Lemo-Opuscar | 59 |
| **M** | 动态风格 | 40 | | **V** | mg-styles-15 | 15 |
| **K** | 卡通画风 | 38 | | **X** | code-video | 31 |
| **Z** | 中国风 | 15 | | **R** | 照参考学来的 | 7 |
| **H** | 现成版式 | 12 | | **O** | 奥斯卡 98 部 | 98 |

合计 341 条，其中 193 条带参考静帧。

</div>

选风格时，主画风、运动方式与版式各取一条，不叠加多条风格的完整约束。

---

## 配乐

导出的影片默认带配乐。音轨由 Web Audio 程序化合成，不引入音频素材，也不访问网络。
合成在 `OfflineAudioContext` 中离线完成，长度与影片严格一致，并与画面共用同一时钟。

### 按风格选择

风格决定默认预设：

| 预设 | 适用风格 |
|---|---|
| `guofeng` 国风 | Z 中国风全部；水墨、敦煌、皮影、剪纸类（五声音阶与拨弦） |
| `epic` 史诗 | O 奥斯卡 3D 类、L Lemo-Opuscar |
| `synth` 合成波 | 赛博、霓虹、CRT、故障题材与 R 系列 |
| `ambient` 氛围 | 黑白与默片题材，O 系列 2D·B&W |
| `bright` 轻快 | K 卡通画风、M 动态风格 |
| `pulse` 脉冲 | AG 代码样片、H 版式、V、X |
| `lofi` | 需手动选择 |
| `none` | 静音 |

### 卡点

分镜中每个镜头的起始时间为切点。导出时遍历 60–180 BPM，选取使所有切点最接近节拍、
且优先落在小节线上的速度，并在每个切点上叠加 crash 与低频，前接一段上行音。

```
分镜：  0 ──── 1.5 ──── 3.0 ──── 4.5 ──── 6.0s
配乐：  ↓        ↓        ↓        ↓
       起拍    重音     重音     重音    收尾
```

速度拟合结果（实测）：

| 切点 | 拟合速度 | 说明 |
|---|---|---|
| 1.5 / 3.0 / 4.5s | 160 BPM | 每场 4 拍，落在小节线 |
| 2.0 / 4.0s | 120 BPM | 每场 4 拍 |
| 无切点 | 128 BPM | 回退到预设速度 |

切点处的能量约为相邻区间的 2 倍（0.21 对 0.10–0.15 RMS）。

### 自定义音频

卡片上可选择「自定义音频」载入本地文件。文件仅在浏览器内混入，不上传，也不写回工作区；
短文件自动循环补满，末尾自动淡出。

### 可复现性

同一组 `style + duration + cuts + seed` 渲染出的音轨逐样本一致（同种子差异量级 1e-7，
音频渲染器的浮点噪声；换种子差异量级 10³）。

---

## 导出

| 格式 | 编码 | 说明 |
|---|---|---|
| **MP4**（默认） | H.264 + AAC | 可直接发送至社交平台，或导入剪映、Premiere、Final Cut |
| **WebM** | VP9 + Opus | 浏览器不支持 MP4 时的回退 |

格式下拉只列出当前浏览器实际支持的容器。Chromium 内核（Chrome / Edge 111+）支持直接录制 MP4，
产出为标准 MP4（`ftyp isom` + `avc1`），非改名文件。

导出流程：

1. 读取预览 iframe 中的 `<canvas>`
2. 按分镜切点渲染配乐，混为单条音轨
3. `captureStream(0)` + 逐帧 `renderAt(i / fps)` + `requestFrame()`
4. `MediaRecorder` 编码
5. 由 Host 写入**会话工作目录下的 `code-animation/`**，卡片显示完整路径

### 文件位置

成片不在浏览器下载目录里，而是写入会话工作目录：

```
<会话工作目录>/code-animation/<片名>.mp4
```

卡片在导出前就显示目标目录，导出后替换为完整文件路径。
若 Host 不可达，会自动退回浏览器下载，并在卡片上说明。

### 导出状态

导出后卡片报告音轨状态：

| 状态 | 含义 |
|---|---|
| `含配乐` | 音频已进入录制 |
| `无声` | 选择了「无配乐」 |
| `⚠ 配乐未进入录制` | 浏览器未启动音频（无音频设备或页面被静音），此时不会把无声文件当作配乐成片交付 |

### 为什么需要手动点击

导出不是自动的，原因有两条：

- 浏览器要求**用户手势**才能启动 `AudioContext`，自动导出会得到无声文件
- 录制是**实时**的，8 秒片子需要 8 秒；对长片自动执行会长时间占用页面

重新编码：

```bash
ffmpeg -i in.mp4 -c:v libx264 -crf 20 -c:a aac -b:a 192k out.mp4
```

> 本插件本身不需要 ffmpeg。上面这条命令只用于你自己重新编码。

---

## 架构

```mermaid
flowchart LR
    subgraph P["profile 根层"]
        R["code-animation-studio<br/><i>routes: true, tools: false</i>"]
        R --> RT["/code-animation-api<br/>· /still/:id<br/>· /animation/:id"]
    end
    subgraph M["创作模式 preset"]
        S["code-animation-studio<br/><i>tools: true, routes: false</i>"]
        S --> T1[list_styles]
        S --> T2[show_stills]
        S --> T3[get_style]
        S --> T4[save_storyboard]
        S --> T5[save_animation]
        S --> FP["flow.js<br/><i>系统提示：六步流程与门禁</i>"]
    end
    U([对话]) --> T1 & T2 & T3 & T4 & T5
    T5 -->|写入文件| RT
    RT -->|回合末尾卡片| U
```

同一个插件挂载两次，职责分离。preset 会挂载进每个 Agent 作用域，而 HTTP 路由是 profile 级的，
两处都注册路由会冲突：

```
code-animation-studio (@local/dsh-code-animation):
  webserver: duplicate prefix route "/code-animation-api"
```

因此路由归 profile 层，工具归 preset 层，各自由 `config.routes` 与 `config.tools` 控制。

### 卡片渲染位置

```
conversation.chat.node（工具组，可折叠）
  └─ tool.call.toolview     调用日志

conversation.chat.turnTail（回合末尾，始终展开）
  └─ code-animation-studio  参考静帧 / 分镜 / 预览
```

数据来自 `uiConversation.events.register()` 注册的回合级投影：将每个回合中
`show_stills`、`save_storyboard`、`save_animation` 的落盘参数与结果文本折叠为一份回合数据。
数据源为会话日志而非插件内存，因此刷新页面与重放历史会话均可还原。

### 目录

```
dsh-code-animation/
├── plugin/                  # @local/dsh-code-animation
│   ├── index.js             # Host：路由与挂载；按 config 决定装载哪一半
│   ├── flow.js              # 六步流程与门禁的系统提示段落
│   ├── tools.js             # 五个工具的 schema、校验与执行
│   ├── data.js              # 风格目录的检索、投影与风格到配乐的映射
│   ├── client.js            # 浏览器端：回合末尾卡片（含配乐引擎）
│   ├── src/ui.js            # client.js 的可读源码
│   ├── src/music.js         # 程序化配乐：八个预设、卡点拟合、离线渲染
│   ├── styles.json          # 341 条风格，含完整提示词
│   ├── stills/              # 193 张参考静帧，按风格编号命名
│   └── cordis.patch.yml     # 顶层行：仅开启路由
├── preset/                  # @local/dsh-code-animation-preset
│   └── cordis.patch.yml     # 声明「创作模式」
└── docs/
    ├── cover.html           # 封面源码
    ├── cover.png
    ├── mode-picker.png
    └── shoot-cover.cjs      # 重新生成封面
```

### 重新生成封面

封面由 HTML 渲染，修改 `docs/cover.html` 后执行：

```bash
node docs/shoot-cover.cjs      # 输出 1280×640 @2x 的 docs/cover.png
```

脚本通过 Chrome DevTools Protocol 驱动无头浏览器，无 npm 依赖，
自动查找本机 Chrome / Edge / Chromium，或用 `CHROME=<路径>` 指定。

---

## 限制

- **升级插件后需重启 dsh**，见 [故障排查](#故障排查)
- 导出为实时录制：8 秒 30fps 约需 8 秒，期间切换标签页会被浏览器节流
- 导出需手动点击，不自动执行：`AudioContext` 需要用户手势，且录制耗时与片长成正比
- MP4 录制需要 Chromium 111+；Firefox 将回退至 WebM
- 配乐为程序化合成，非真实乐器录音
- 自定义音频仅在浏览器内混入，不上传，不写回工作区
- 341 条风格中 148 条没有参考静帧，卡片会标注「无静帧」
- 风格提示词中的 `{{ }}` 占位符原样保留，由 Agent 在生成时填入
- 动画必须渲染到 `<canvas>`；纯 DOM / CSS 动画可预览但无法录制

---

## 故障排查

### 规则：更新插件后必须重启 dsh

Agent 创建模式挂载的是 `@local/dsh-code-animation` 模块的一个实例，该模块在 **dsh 进程启动时导入一次**
并留在 ESM 缓存中。在 Web 界面里禁用再启用插件行不会重新导入模块，因此：

- 修改或升级插件后，**必须重启 `dsh web`**
- 未重启时，创作模式运行的是旧版本：可能缺少工具、卡片不渲染、或界面提示与实际不符
- 已存在的会话保留创建时的插件版本；验证新版行为请新建会话

### 检查当前加载的版本

```bash
curl -s http://127.0.0.1:3080/code-animation-api/health
```

```json
{
  "ok": true,
  "rev": 4,
  "tools": ["list_styles", "show_stills", "get_style", "save_storyboard", "save_animation"],
  "styles": 341,
  "stills": 193
}
```

| 字段 | 判读 |
|---|---|
| 缺少 `rev` / `tools` | 加载的是 rev 3 之前的版本，需要重启 |
| `rev` 低于仓库中的 `BUILD_REV` | 加载的是旧版本，需要重启 |
| `tools` 少于五项 | 同上 |

`BUILD_REV` 定义在 `plugin/data.js`，工具名或结果结构变化时应递增。

### 卡片没有出现

依次检查：

1. `health` 的 `rev` 是否与仓库一致；不一致则重启
2. 该会话是否在**创作模式**下创建；其他模式不挂载这些工具
3. 会话中是否调用过 `save_animation`；只有调用过才有卡片
4. 浏览器控制台是否有 `slot entry crashed` 报错

### Agent 自己写脚本或去装 ffmpeg

这是工具不可用的典型表现：没有 `save_storyboard` 时，Agent 会尝试用命令行自行录制。
按上一节确认 `tools` 齐全后重启即可。`plugin/flow.js` 中也已明确禁止自建录制脚本、
禁止查找或安装 ffmpeg、禁止使用 playwright。

---

## 素材来源与许可

| 部分 | 许可 |
|---|---|
| 插件代码（`index.js`、`tools.js`、`data.js`、`flow.js`、`client.js`、`src/`） | MIT |
| 341 条提示词与 193 张静帧 | 来自 [XiaoyeCodes/code-animation-prompts](https://github.com/XiaoyeCodes/code-animation-prompts)，遵循其 `LICENSE.md` 与 `references/attribution.md` |
| 其中 L / V / X 系列 | 分别来自 Lemo-Opuscar、mg-styles-15、code-video，第三方许可见原仓库 `assets/library/第三方许可/` |

再分发时请保留上述署名与第三方许可。素材版权归原作者。

---

## 参与

Issue 与 PR 均可。以下方向尚未实现：

- [ ] 服务端导出 MP4，接入 ffmpeg 以避开浏览器的实时录制约束
- [ ] 将封面图或首帧写回会话，使 Agent 能检视自身产出
- [ ] 风格收藏与自定义风格目录
- [ ] 导出直接写入工作区文件，而非浏览器下载

---

<div align="center">

<sub>为 <a href="https://github.com/deepseek-ai/dsh">DeepSeek Harness</a> 构建 ·
风格库来自 <a href="https://github.com/XiaoyeCodes/code-animation-prompts">code-animation-prompts</a></sub>

</div>
