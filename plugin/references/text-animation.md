# 文字动画

字是最贵的画面元素：它承载信息，也最容易做砸。

这一份讲：进场、出场、强调、跟随，以及什么时候**不要**动。

---

## 一、先问一句：这个字需要动吗

| 情况 | 动不动 |
|---|---|
| 主标题首次出现 | 动（这是全片的「定调」） |
| 副标题补充说明 | 轻动（淡入即可） |
| 正文 / 字幕 | **不动**（动了读者跟不上） |
| 数据 / 数字 | 动（滚动到目标值） |
| 重复出现的界面文字 | 不动 |

一条片子里，需要「炫技」的文字动画最多两处。其余全部用淡入 + 位移。

---

## 二、进场

### 2.1 淡入 + 上浮（最稳）

```js
const u = easeOutCubic(tween(t, start, 0.45));
ctx.globalAlpha = u;
ctx.fillText(text, x, y + 24 * (1 - u));   // 从下方 24px 浮上来
ctx.globalAlpha = 1;
```

位移量 20–30px。超过 60px 会像「掉下来」，少于 10px 看不出在动。

### 2.2 遮罩揭示

文字被「擦」出来，比淡入有力，适合主标题：

```js
ctx.save();
ctx.beginPath();
ctx.rect(0, y - fontSize, W, fontSize * 1.35 * u);
ctx.clip();
ctx.fillText(text, x, y);
ctx.restore();
```

方向：从下往上（最常见）、从左往右（像被写出来）。

### 2.3 逐字进场

```js
function drawChars(t, text, x, y, start, perChar = 0.03, dur = 0.35) {
  let cursor = x;
  for (let i = 0; i < text.length; i++) {
    const u = tween(t, start + i * perChar, dur);
    const w = ctx.measureText(text[i]).width;
    if (u > 0) {
      ctx.globalAlpha = easeOutCubic(u);
      ctx.fillText(text[i], cursor, y + 14 * (1 - easeOutBack(u)));
      ctx.globalAlpha = 1;
    }
    cursor += w;
  }
}
```

参数纪律：

| 参数 | 范围 | 超了会怎样 |
|---|---|---|
| 每字延迟 | 20–40ms | 60ms 以上变成「一个一个蹦」 |
| 单字时长 | 0.3–0.4s | 太长整句拖沓 |
| 位移 | ≤ 字高 30% | 太大像掉字 |

### 2.4 缩放落定

从 1.15 倍缩到 1.0，配合淡入，像「砸」在屏幕上：

```js
const u = easeOutQuint(tween(t, start, 0.4));
ctx.translate(cx, cy);
ctx.scale(1 + 0.15 * (1 - u), 1 + 0.15 * (1 - u));
ctx.translate(-cx, -cy);
ctx.globalAlpha = u;
ctx.fillText(text, x, y);
```

---

## 三、出场

出场比进场更需要克制。观众已经读完了，快走就行。

| 方式 | 时长 | 说明 |
|---|---|---|
| 淡出 | 0.2–0.3s | 最稳 |
| 上移淡出 | 0.3s | 有「翻页」感 |
| 缩小淡出 | 0.25s | 有「退后」感 |
| 硬切 | 0 帧 | 卡点上用，最干净 |

**不要**做出场动画比进场还花哨——那是本末倒置。

---

## 四、强调

### 4.1 高亮扫过

一条色块从左扫到右，字变亮：

```js
const u = easeInOutCubic(tween(t, start, 0.5));
ctx.save();
ctx.beginPath();
ctx.rect(x - 8, y - fontSize * 1.1, (w + 16) * u, fontSize * 1.35);
ctx.clip();
ctx.fillStyle = accent;
ctx.fillRect(x - 8, y - fontSize * 1.1, w + 16, fontSize * 1.35);
ctx.restore();
```

### 4.2 下划线生长

```js
const u = easeOutCubic(tween(t, start, 0.4));
ctx.fillRect(x, y + 10, w * u, 4);
```

### 4.3 圈注 / 手绘感

```js
// 椭圆逐段画出
const u = easeOutCubic(tween(t, start, 0.6));
ctx.strokeStyle = accent;
ctx.lineWidth = 3;
ctx.beginPath();
ctx.ellipse(cx, cy, rx, ry, -0.1, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * u);
ctx.stroke();
```

手绘感靠两点：轻微的不规则（用固定种子扰动半径）+ 端点圆角。

### 4.4 抖动强调

字被「震」一下，适合冲击性内容：

```js
const shake = 6 * Math.sin(t * 60) * Math.exp(-(t - start) * 8);
ctx.fillText(text, x + shake, y);
```

幅度 4–8px，衰减要快（0.3s 内归零）。

---

## 五、数字

### 5.1 滚动

```js
const u = easeOutQuint(tween(t, start, 0.9));
const shown = target * u;
ctx.fillText(format(shown), x, y);
```

### 5.2 单位与符号

单位、百分号、正负号**在滚动开始前就固定**，不要最后才出现——那会让数字宽度
跳动，眼睛跟不上。

### 5.3 等宽

数字用等宽字体，否则 1 和 8 的宽度差会让数字左右抖：

```js
ctx.font = '700 96px ui-monospace, "SF Mono", Menlo, monospace';
```

---

## 六、多语言与混排

- 中英混排时，英文用西文字体，中文用中文字体，`font-family` 里中文放后面兜底
- 日文假名和中文汉字宽度接近，可以共用一套
- 阿拉伯语 / 希伯来语是 RTL，Canvas 需要 `ctx.direction = 'rtl'`

---

## 七、常见错误

| 错误 | 后果 |
|---|---|
| 每个字都弹跳 | 廉价、拖沓 |
| 字幕做动画 | 读不完 |
| 进场 1.2s | 观众等得不耐烦 |
| 出场比进场花哨 | 本末倒置 |
| 数字宽度跳动 | 眼睛跟不上 |
| 逐字延迟 80ms | 变成「一个一个蹦」 |
| 强调色用三种 | 没有重点 |

---

## 八、自检清单

- [ ] 需要炫技的文字动画 ≤ 2 处？
- [ ] 字幕没有做动画？
- [ ] 逐字延迟 20–40ms？
- [ ] 进场位移 ≤ 30px（或字高 30%）？
- [ ] 最后一句留了 6 帧静止？
- [ ] 数字用等宽字体，单位提前固定？
- [ ] 出场时长 ≤ 进场时长？
