# 代码动画工作台 · Code Animation Studio

给 [DeepSeek Harness](https://github.com/deepseek-ai/dsh) 加一个 **创作模式**：在对话框里说一句话，Agent 直接写出代码动画、内联预览、一键导出视频。

风格库来自开源项目 [XiaoyeCodes/code-animation-prompts](https://github.com/XiaoyeCodes/code-animation-prompts) 的 **341 种代码动画风格提示词** 与 **193 张参考静帧**。

## 它解决什么

原本要出片，你得离开对话去开一个网页工具、翻 341 条提示词、复制粘贴、再想办法录屏。这个插件把整条链路搬进对话框：

```
你说：用 B3 粒子聚形做一个 3 秒的片子，内容是「选个风格就能出片」

Agent：list_styles("粒子")        → 检索到 B3 粒子聚形（带参考静帧）
       get_style("B3")           → 拿到这条风格的完整视觉规范
       save_animation(html...)   → 写代码 → 存盘 → 对话里出现动画卡片
       你：拖动进度条看任意时刻 → 点「导出视频」→ 拿到 WebM
```

没有第二次模型调用：写代码的就是**已经在对话里、手上有你全部上下文**的那个 Agent。

## 装上之后的样子

- 新会话的模式选择器里多一项 **创作模式**（和「标准模式」「PTC 模式」并列）
- 在这个模式下，Agent 多了三个工具
- 动画以卡片形式出现在对话流里，可拖动、可导出

## 三个工具

| 工具 | 作用 |
|---|---|
| `list_styles` | 在 341 条风格里检索。返回编号、名称、系列、适用题材、有无参考静帧、完整提示词 |
| `get_style` | 取某一条风格的完整规范与静帧地址 |
| `save_animation` | 存下 HTML，返回对话内的动画卡片 |

`save_animation` 会**校验交付契约**，把常见问题变成卡片的提示而不是坏视频：

- 必须有 `window.renderAt(t)`（按秒渲染，同一 t 同一帧）
- 必须有 `<canvas>`
- 禁止 `Math.random()`、`requestAnimationFrame` 自播、外部脚本/图片/样式表

## 安装

需要 dsh 0.2.1 及以上。

```bash
git clone https://github.com/wyf-yfw/dsh-code-animation.git
```

然后在 dsh 里安装两个 bundle（两个都要装，缺一不可）：

```bash
dsh plugin install /path/to/dsh-code-animation/plugin
dsh plugin install /path/to/dsh-code-animation/preset
```

也可以直接让 Agent 装：把仓库地址给它，让它用 `plugin_manager` 的 `install_bundle` 分别指向 `plugin/` 和 `preset/`。

打开新会话 → 模式选择器 → **创作模式**。

## 目录结构

```
plugin/                  dsh 插件包（@local/dsh-code-animation）
├── index.js             Host：静态资源路由 + 生成物路由；按 config 决定装哪一半
├── tools.js             三个工具的 schema、校验与执行
├── data.js              风格目录的检索与投影
├── client.js            浏览器半边：对话内动画卡片（拖动 / 导出）
├── src/ui.js            client.js 的可读源码
├── styles.json          341 条风格（含完整提示词）
├── stills/              193 张参考静帧，按风格编号命名
├── cordis.patch.yml     顶层行：只开路由
└── locale/              中英文标题与描述

preset/                  agent preset 包（@local/dsh-code-animation-preset）
└── cordis.patch.yml     声明「创作模式」，把插件挂进该模式
```

**为什么要拆成两个包**：preset 会被 mount 进每个 Agent 作用域，路由却是 profile 级的——同一个包在两处都注册路由就会撞车（`duplicate prefix route`）。所以顶层行只开路由（`tools: false`），preset 行只开工具（`routes: false`）。

## 数据来源与许可

- 风格提示词与参考静帧：**[XiaoyeCodes/code-animation-prompts](https://github.com/XiaoyeCodes/code-animation-prompts)**，按其 `LICENSE.md` 与 `references/attribution.md` 使用。
- 其中 L / V / X 系列分别来自 Lemo-Opuscar、mg-styles-15、code-video，各自的第三方许可见原仓库 `assets/library/第三方许可/`。
- 本仓库的插件代码（`index.js`、`tools.js`、`data.js`、`client.js`、`src/`）为 MIT。

**如果你要再分发，请保留上述署名与第三方许可。** 素材版权归原作者。

## 已知限制

- 导出走浏览器 `MediaRecorder`，产出 **WebM**，不是 MP4。要 MP4 请自行转码（`ffmpeg -i x.webm x.mp4`）。
- 逐帧录制是实时的，8 秒 30fps 大约要 8 秒；期间请勿切走标签页。
- 341 条里 148 条没有参考静帧，卡片会如实标注「无静帧」。
- 风格提示词里 `{{ }}` 占位符原样保留，由 Agent 在生成时按你说的内容填。
