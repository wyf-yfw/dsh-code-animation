# 转场

镜头之间怎么接，决定了片子是「一段一段」还是「一条」。这一份讲：接法有哪些、
时长怎么定、时间轴怎么算、转场时画面该守什么纪律。

---

## 一、三种时间关系

先把概念分清。两个镜头 A（0–3s）和 B（3–6s），接法不同，总时长不同：

| 接法 | 时间关系 | 总时长 |
|---|---|---|
| 硬切 | B 从 A 结束的那一帧开始 | 6s（不变） |
| 叠化 | A 与 B 重叠 d 秒 | 6 − d |
| 推/擦除 | B 在同一时刻覆盖 A | 6s（不变） |

**叠化会吃掉时长**，这是最容易出错的地方。分镜写的是 0–3、3–6，实际叠化 0.4s 后
总长变成 5.6s，后面所有卡点、配乐小节线全部要跟着挪。

要么在分镜阶段就预留重叠（A: 0–3.4，B: 3.0–6），要么干脆用硬切。

---

## 二、硬切

0 帧转场，最干净、最有力。快节奏片子应该以硬切为主。

### 2.1 对齐

切点两侧的构图重心尽量落在同一位置，切过去才不跳。

```js
// A 场结尾：主体在画面中央偏左
// B 场开头：主体也在中央偏左
```

### 2.2 节奏

硬切必须落在节拍上。BPM 120 时一拍 0.5s，切点放在 0.5 的整数倍上，
观众会觉得「踩上了」；放在 0.37s 就会觉得「怎么这时候切」。

### 2.3 切点前后的微调

- 切点前 2 帧：画面开始「收」（轻微压暗或缩小 2%）
- 切点后 2 帧：画面「放」（从 98% 弹到 100%）

这两帧的呼吸感让硬切不像「断了」，而像「换了口气」。

---

## 三、叠化

### 3.1 实现

```js
function drawCrossfade(t, a, b, start, dur) {
  const u = clamp01((t - start) / dur);
  // A 淡出用 ease-in，B 淡入用 ease-out，交叉点更自然
  const aAlpha = 1 - easeInCubic(u);
  const bAlpha = easeOutCubic(u);
  if (aAlpha > 0) { ctx.globalAlpha = aAlpha; a(t); }
  if (bAlpha > 0) { ctx.globalAlpha = bAlpha; b(t); }
  ctx.globalAlpha = 1;
}
```

**不要两条都是线性**，中间会有一段时间两边都是 50%，画面发灰。
用 ease-in / ease-out 交叉，总亮度更稳。

### 3.2 时长

| 节奏 | 叠化时长 |
|---|---|
| 快（BPM > 110） | 0.15–0.25s |
| 中速 | 0.3s |
| 慢 / 抒情 | 0.4–0.6s |
| 超过 0.8s | 拖沓，除非刻意做「时间流逝」 |

### 3.3 白闪 / 黑场叠化

叠化到一个纯色再叠出来，比直接叠化更有仪式感，而且不改变时间轴：

```js
// 0–0.15s 叠到白，0.15–0.3s 从白叠出
if (u < 0.5) {
  ctx.fillStyle = `rgba(255,255,255,${easeInCubic(u * 2)})`;
} else {
  ctx.fillStyle = `rgba(255,255,255,${1 - easeOutCubic((u - 0.5) * 2)})`;
}
ctx.fillRect(0, 0, W, H);
```

---

## 四、推 / 擦除 / 划像

同一时刻 B 覆盖 A，不改变时间轴。

### 4.1 横向擦除

```js
function drawWipe(t, a, b, start, dur, dir = 1) {
  const u = easeInOutCubic(clamp01((t - start) / dur));
  a(t);
  ctx.save();
  ctx.beginPath();
  if (dir > 0) ctx.rect(0, 0, W * u, H);      // 从左往右露出 B
  else         ctx.rect(W * (1 - u), 0, W * u, H);
  ctx.clip();
  b(t);
  ctx.restore();
}
```

### 4.2 推镜

B 从右侧推入，A 同时向左退出 20%，有纵深感：

```js
const u = easeOutQuint(clamp01((t - start) / dur));
ctx.save(); ctx.translate(-W * 0.2 * u, 0); a(t); ctx.restore();
ctx.save(); ctx.translate(W * (1 - u), 0);  b(t); ctx.restore();
```

### 4.3 圆形扩散

从一点向外扩，适合「聚焦到某个细节」：

```js
ctx.save();
ctx.beginPath();
ctx.arc(cx, cy, Math.max(W, H) * u, 0, Math.PI * 2);
ctx.clip();
b(t);
ctx.restore();
```

---

## 五、不占时长的光效

闪白、漏光、暗场推进、色带扫过——这些是**叠在切点上**的效果，几帧成本就能
让硬切看起来像「被打断」。

### 5.1 闪白

```js
// 切点前 2 帧到后 3 帧，全屏白，alpha 从 0 冲到 0.8 再落回 0
const cut = 3.0;
const u = (t - (cut - 0.066)) / 0.166;
if (u >= 0 && u <= 1) {
  ctx.fillStyle = `rgba(255,255,255,${0.8 * Math.sin(u * Math.PI)})`;
  ctx.fillRect(0, 0, W, H);
}
```

### 5.2 漏光

一道暖色斜向光带扫过，0.3s：

```js
const u = clamp01((t - start) / 0.3);
const x = -W * 0.5 + (W * 2) * easeInOutCubic(u);
const g = ctx.createLinearGradient(x, 0, x + W * 0.4, H);
g.addColorStop(0, 'rgba(255,180,90,0)');
g.addColorStop(0.5, 'rgba(255,180,90,0.35)');
g.addColorStop(1, 'rgba(255,180,90,0)');
ctx.globalCompositeOperation = 'screen';
ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
ctx.globalCompositeOperation = 'source-over';
```

### 5.3 故障

三帧内随机偏移色块 + RGB 分离，适合科技/赛博题材：

```js
const u = tween(t, cut - 0.1, 0.1);
if (u > 0 && u < 1) {
  const off = 8 * Math.sin(u * Math.PI * 6);
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(255,0,80,0.5)';  ctx.fillRect(off, 0, W, H);
  ctx.fillStyle = 'rgba(0,220,255,0.5)'; ctx.fillRect(-off, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
}
```

---

## 六、纪律

### 6.1 转场期间只做一件事

前一秒在放大标题、后一秒又推镜头又换配色，观众的注意力会被撕开。

### 6.2 一个片子最多两种转场手法

三种以上显得没有章法。硬切 + 叠化已经能覆盖 90% 的场景。

### 6.3 转场不解决问题

如果两场之间接得生硬，八成是内容没接上（上一场没交代完，下一场突然开始），
换更花哨的转场只会让问题更明显。

---

## 七、和配乐的关系

每个切点都应该是配乐的一个重音（`beats` 里标出来）。切点落下去、鼓也落下去，
观众才觉得「这一下是故意的」。

反过来：如果配乐在切点上是空的，那就不要在那个切点做花哨转场，硬切反而更干净。

| 转场 | 配乐 |
|---|---|
| 硬切 | 短促打击（kick / hit），同帧 |
| 叠化 | 不需要重音，让音乐自然过渡 |
| 擦除 / 推 | 上行扫频（whoosh），提前 0.1s 起 |
| 闪白 | 白噪声瞬态 + 低频撞击 |

---

## 八、自检清单

- [ ] 叠化有没有偷偷改变总时长？卡点要不要跟着挪？
- [ ] 切点是否落在节拍上？
- [ ] 叠化交叉的两条曲线是不是一条 ease-in、一条 ease-out？
- [ ] 一个片子里转场手法是否 ≤ 2 种？
- [ ] 转场期间是否只有一件事在变化？
- [ ] 每个切点在 `beats` 里都有对应重音吗？
