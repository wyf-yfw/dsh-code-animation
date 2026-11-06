# 中文排版

画面上的字是观众唯一会「读」的东西。画得再好，字排得散，整条片子就掉档。

这一份讲：字号怎么定、中文的坑在哪、文字怎么量、怎么排、怎么动。

---

## 一、字号阶梯

不要给每个元素随便定字号。整条片子最多四级，比例固定：

| 层级 | 相对大小 | 1080p 下的字号 | 用途 |
|---|---|---|---|
| 主标题 | 1.0 | 88–112px | 一场只有一句 |
| 副标题 | 0.55 | 48–60px | 补充主标题 |
| 正文 / 字幕 | 0.38 | 34–42px | 信息 |
| 角标 / 注释 | 0.26 | 22–28px | 来源、时间、编号 |

**两条硬规则：**

1. 相邻两级的比例不能小于 1.4 倍。1.2 倍的差距在画面上看起来像「没对齐」，
   不像「分级」。
2. 一条片子里只用四级。出现第五级，说明信息结构没想清楚。

### 竖屏

9:16 的片子以宽度定字号（1080 宽为基准），比横屏小 15–20%。
手机观看距离近，但屏幕小，字号不能照搬横屏。

| 层级 | 1080×1920 竖屏 |
|---|---|
| 主标题 | 72–88px |
| 副标题 | 44–52px |
| 字幕 | 32–38px |
| 角标 | 22–26px |

---

## 二、中文的六条硬规矩

### 2.1 行高

1.4–1.6。低于 1.3 上下行会「粘」在一起，高于 1.8 会散成两段。

```js
const lineHeight = fontSize * 1.5;
```

### 2.2 字距

默认 0。**中文字距一拉大就散架**，因为每个字是等宽的方块，拉开后字与字之间的
空隙和字内部笔画之间的空隙接近，视觉上会「碎」。

只有两种情况可以加：

- 主标题想强调：`letter-spacing: 0.08em`（不能再大）
- 全大写的英文副标：`0.12em`

### 2.3 单行长度

不超过 18 个汉字。超过必须换行，不要靠缩小字号硬塞——缩到 28px 以下，
在手机上就看不清了。

竖屏不超过 12 个汉字。

### 2.4 安全边距

左右各 8%，上下各 10%。贴边的字在播放器里会被裁掉一部分（尤其是竖屏底部
有控制条）。

```js
const padX = W * 0.08;
const padY = H * 0.10;
const maxWidth = W - padX * 2;
```

### 2.5 中英混排

中文和英文/数字之间留半个字宽的空隙，视觉上才不打架：

```js
// 「3.2秒」→「3.2 秒」
// 「B3风格」→「B3 风格」
const mix = (s) => s.replace(/([A-Za-z0-9])([\u4e00-\u9fa5])/g, '$1 $2')
                     .replace(/([\u4e00-\u9fa5])([A-Za-z0-9])/g, '$1 $2');
```

### 2.6 标点

| 规则 | 说明 |
|---|---|
| 句末不加句号 | 字幕不是文章，句号显得死板 |
| 逗号用全角「，」 | 半角「,」在中文里像排版错误 |
| 破折号用两个全角横线「——」 | 不要用 `--` 或单个「—」 |
| 省略号用「……」 | 六个点，不是三个 |
| 引号用「」或“” | 全文统一一种 |

---

## 三、量文字

Canvas 不会自动换行，必须自己量。

### 3.1 单行宽度

```js
ctx.font = '700 96px "PingFang SC", "Microsoft YaHei", sans-serif';
const w = ctx.measureText('创作模式').width;
```

注意：**先设 `font` 再量**。`measureText` 用的是当前 `ctx.font`。

### 3.2 自动换行

```js
function wrapText(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const ch of text) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}
```

逐字断行对中文是对的（中文可以在任意字之间断），英文要按词断，混排时优先在
空格处断。

### 3.3 垂直居中

`textBaseline` 的三个值差别很大：

| 值 | 基线位置 | 适合 |
|---|---|---|
| `alphabetic` | 字母底部（默认） | 精确对齐西文 |
| `middle` | 文字视觉中心偏上 | 单行居中（中文慎用，会偏上） |
| `top` | 字体顶部 | 多行排版 |

中文单行垂直居中，用 `middle` 后还要再往下挪 `fontSize * 0.08` 才真正居中。

---

## 四、排版样式

### 4.1 字重比字号更有效

想强调一个词，优先加粗或换色，而不是放大。放大破坏节奏，加粗只改变视觉重量。

```js
ctx.font = '400 42px ...';   // 正文
ctx.font = '700 42px ...';   // 强调（字号不变）
```

字体族只用系统字体，**不要引用任何网络字体**：离线渲染拿不到，会退回默认字体，
排版全乱。

```js
const FONT = '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
```

### 4.2 对齐

- 标题左对齐，起点固定在一个 x 上（不要居中——居中会让每行起点跳动）
- 多行正文左对齐，右端不齐是正常的
- 数字右对齐（小数点对齐），尤其是数据对比

### 4.3 描边与阴影

深色背景上的白字，加一层极淡的阴影让边缘清晰：

```js
ctx.shadowColor = 'rgba(0,0,0,0.35)';
ctx.shadowBlur = 12;
ctx.shadowOffsetY = 2;
ctx.fillText(text, x, y);
ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;   // 用完立刻复位
```

描边（`strokeText`）超过 2px 会显得廉价，只在超大标题上用 1–2px。

---

## 五、文字动画

### 5.1 逐字进场

三条限制：

1. 每个字的延迟 **20–40ms**。超过 60ms 就变成「一个一个蹦」，慢得难受。
2. 进场位移不超过字高的 30%。位移太大像在掉字。
3. 最后一个字落定后，**至少留 6 帧静止**再切走，否则观众读不完。

```js
function drawChars(t, text, x, y, start, perChar = 0.03) {
  let cursor = x;
  for (let i = 0; i < text.length; i++) {
    const u = tween(t, start + i * perChar, 0.35);
    if (u <= 0) { cursor += ctx.measureText(text[i]).width; continue; }
    const alpha = easeOutCubic(u);
    const dy = 12 * (1 - easeOutBack(u));
    ctx.globalAlpha = alpha;
    ctx.fillText(text[i], cursor, y + dy);
    cursor += ctx.measureText(text[i]).width;
  }
  ctx.globalAlpha = 1;
}
```

### 5.2 打字机

逐字显示 + 一个光标。光标要闪，但**不要用 `Math.sin(t*10)` 这种连续值**，
用方波：

```js
const blink = Math.floor(t * 2) % 2 === 0;   // 每 0.5s 切换
```

### 5.3 数字滚动

数字从 0 滚到目标值，末尾要减速，否则读不出最终值：

```js
const u = tween(t, start, 0.9);
const shown = Math.round(target * easeOutQuint(u));
```

千分位、单位、正负号在滚动过程中就要固定，不要到最后才出现。

### 5.4 遮罩揭示

文字从下往上「擦」出来，比淡入有力：

```js
ctx.save();
ctx.beginPath();
ctx.rect(0, y - fontSize, W, fontSize * 1.3 * u);   // 逐渐露出
ctx.clip();
ctx.fillText(text, x, y);
ctx.restore();
```

---

## 六、常见错误

| 错误 | 后果 | 修正 |
|---|---|---|
| 字号 28px 以下放正文 | 手机上看不清 | 缩内容，不缩字 |
| 行高 1.0 | 上下行粘连 | 1.4–1.6 |
| 中文字距 0.2em | 字散成碎片 | 0，或 ≤0.08em |
| 引用 Google Fonts | 离线渲染退回默认字体 | 只用系统字体 |
| 文字贴边 | 播放器裁切 | 左右 8% 安全边距 |
| 一句字幕 30 字 | 读不完 | ≤ 镜头时长 × 5.5 字 |
| 每行都居中 | 起点跳动，像 PPT | 左对齐 |
| 阴影 blur 30px | 糊成一团 | 8–14px |

---

## 七、自检清单

- [ ] 字号只有四级，相邻级差 ≥ 1.4 倍？
- [ ] 行高在 1.4–1.6？
- [ ] 单行 ≤ 18 字（竖屏 ≤ 12 字）？
- [ ] 左右留了 8% 安全边距？
- [ ] 中英之间有空格？
- [ ] 用的是系统字体，没有网络字体？
- [ ] 逐字动画的字间隔 20–40ms，末尾留了 6 帧静止？
- [ ] 深色背景上的字有没有加淡阴影保证边缘清晰？
