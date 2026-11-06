# 工艺参考

十三份按需加载的工艺文档：写画面和配乐时用到的具体做法，不进系统提示，
由 `get_reference` 一次取一份。

> 返回 [README](../README.md) · [使用指南](guide.md) · [工具参考](tools.md)

---

## 为什么要拆

这些内容原来全压在流程提示词里（`plugin/flow.js`），每一轮对话都占满上下文。
拆出来之后提示词从 14.8 KB 降到 7.2 KB，可用的知识反而多了三十倍——因为按需加载，
写动画时才取，取过就不用再取。

组织方式参照了 [Remotion 的 Agent Skills](https://github.com/remotion-dev/skills)
（router + 按需 reference），但内容是给 Canvas 单文件动画重写的。

---

## 在哪一步取哪几份

```
第 1 步 问清需求
   └─ 不取

第 2 步 推荐风格 + show_stills
   └─ 不取

第 3 步 拍板风格（硬门禁）
   ├─ get_reference("color")        定调色板
   └─ get_reference("typography")   定字号阶梯
        ↓ 这两件事必须在分镜之前定：
          字号没定，你不知道一条字幕能放几个字

第 4 步 出分镜 + 配乐卡点谱
   ├─ get_reference("sequencing")   时间轴、节奏曲线、疏密
   ├─ get_reference("audio")        卡点怎么落、重音怎么分档
   └─ get_reference("copy")         字幕硬规则与禁用词
        ↓ 分镜就是时间轴，这里节奏错了后面全错

第 5 步 拍板分镜（硬门禁）
   └─ 不取

第 6 步 写动画 + 配乐
   ├─ get_reference("motion")       必取
   ├─ get_reference("transitions")  2 个以上镜头时
   ├─ get_reference("text-animation") 文字要动时
   ├─ get_reference("effects")      模糊/发光/故障/拖影
   ├─ get_reference("particles")    粒子
   ├─ get_reference("camera")       推拉摇移/视差/伪 3D
   ├─ get_reference("data-viz")     图表/数字对比
   └─ get_reference("timbre")       28 条音色配方 + 编曲

交付前 自检三条
```

一条 30 秒的片子，通常取 3–5 份。全取反而抓不住重点。

---

## 十三份清单

| name | 字数 | 内容 | 步骤 |
|---|---|---|---|
| `sequencing` | 1.8k | 时间轴、节奏曲线、疏密、开场三秒、收尾 | 4 |
| `motion` | 7.0k | 缓动数学（bezier 求解、弹簧解析解）、夹紧、帧预算、运动模糊、预备-动作-跟随 | 6 |
| `transitions` | 4.1k | 三种时间关系、叠化吃时长的算法、擦除/推镜代码、光效 overlay | 6 |
| `typography` | 4.7k | 字号阶梯、中文六条硬规矩、measureText 换行、逐字/打字机/遮罩 | 3 |
| `text-animation` | 3.4k | 进场四种、出场四种、强调四种、数字滚动、混排 | 6 |
| `color` | 4.9k | 60/30/10 配色、明度分层、噪点压 banding、光斑预渲染、暗角、灰度自检 | 3 |
| `effects` | 4.4k | 方向模糊、bloom、glitch 切片、拖影、扫描线、性能对照表 | 6 |
| `particles` | 3.1k | 纯函数粒子、贴图绘制、按 alpha 分桶、爆发/汇聚/飘浮/拖尾 | 6 |
| `camera` | 2.5k | 推拉摇移、视差三层、伪 3D 投影、景深、构图 | 6 |
| `data-viz` | 2.6k | 柱状/折线/环形、数字滚动、对比、图表动效纪律 | 6 |
| `audio` | 2.6k | beats 精度、bed/dest 分线、侧链时间常数、电平表、音效设计 | 4 |
| `timbre` | 5.3k | 28 条音色配方 + 三个完整示例 + 编曲层次/密度曲线 | 6 |
| `copy` | 1.9k | 三条硬规则、禁用清单、对照表、改写流程 | 4 |

合计约 4.8 万字。

---

## 每份的结构

十三份都按同一个骨架写，方便 Agent 定位：

| 段落 | 内容 |
|---|---|
| 原则 | 这件事为什么重要、什么算做好了 |
| 参数表 | 具体数值（时长、比例、透明度、字号） |
| 代码 | 可直接用的 Canvas 片段 |
| 常见错误 | 「错误 → 后果 → 修正」三列表 |
| 自检清单 | 导出前逐条过 |

数值不是拍脑袋定的：帧预算是按 30fps 的 33ms 预算推的，字号是按 1080p 观看距离定的，
电平表是按 −1dBFS 峰值留的余量。

---

## 和工具的关系

```js
get_reference({ name: 'motion' })
→ { name, title, body }   // body 是整份 Markdown
```

| 情况 | 行为 |
|---|---|
| 名字不在表里 | 报错并列出可用的 13 个 |
| 参数为空 | 同上 |
| 文件缺失 | 报错指出 `references/<name>.md` |

取过一次就不必再取——同一轮里重复调用只是浪费上下文。

---

## 新增一份

1. 在 `plugin/references/` 下按同样的骨架写一份 `<name>.md`
2. `plugin/data.js` 的 `REFERENCES` 加一行
3. `plugin/flow.js` 的路由表加一行，写清在哪一步取
4. `docs/references.md` 的清单补一行

不用改 `tools.js`：它从 `REFERENCES` 读名字，从磁盘读正文。

---

## 授权说明

[remotion-dev/skills](https://github.com/remotion-dev/skills) 没有 LICENSE 文件，
所以这里只借鉴了它的组织方式（router + 按需 reference + 每份一个工艺方向），
正文全部按 Canvas 单文件动画重写。直接搬运文本会带来授权风险。

---
