# 视觉特效

特效是调味，不是主菜。一条片子里特效超过三处，观众就只看特效不看内容了。

这一份讲：模糊、发光、故障、拖影、扫描线、噪点，以及它们的性能代价。

---

## 一、模糊

### 1.1 运动模糊（方向模糊）

快速移动的元素，沿运动方向拉出拖影。Canvas 没有内置方向模糊，用多次错位绘制近似：

```js
function drawMotionBlur(fn, dx, dy, samples = 6, alpha = 0.16) {
  for (let i = 0; i < samples; i++) {
    const k = i / (samples - 1 || 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(-dx * k, -dy * k);
    fn();
    ctx.restore();
  }
}
// 用：一个向右移动 60px/帧的方块
drawMotionBlur(() => ctx.fillRect(x, y, 80, 80), 60, 0);
```

`samples` 越多越顺滑，但绘制成本线性上升。6 个样本 + 0.16 alpha 是最省的做法。

### 1.2 景深模糊

前后景分层，后景模糊。Canvas 用 `ctx.filter = 'blur(Npx)'`：

```js
ctx.save();
ctx.filter = 'blur(8px)';
drawBackground(t);
ctx.restore();
```

`ctx.filter` 在部分浏览器上很慢（每帧重新计算卷积）。静态背景可以先渲染到离屏
canvas，只在需要时重画。

### 1.3 什么时候不要模糊

- 文字：小字模糊后完全读不出来
- 细线：1px 的线模糊后消失
- 大面积纯色：模糊了看不出来，白费性能

---

## 二、发光

### 2.1 多层叠加

比 `shadowBlur` 便宜且可控：

```js
function glowDot(x, y, r, color) {
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 3; i >= 1; i--) {
    const rr = r * (1 + i * 0.9);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
    g.addColorStop(0, color.replace('ALPHA', 0.28 / i));
    g.addColorStop(1, color.replace('ALPHA', 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
}
// 用：glowDot(400, 300, 20, 'rgba(255,138,61,ALPHA)')
```

### 2.2 阈值发光（bloom）

真实 bloom 是「亮的地方溢光」。近似做法：把亮部提出来，模糊，再叠加。

```js
// 1) 画场景
drawScene(t);
// 2) 提亮部（简化：直接整屏叠一层模糊后的自身）
ctx.save();
ctx.globalCompositeOperation = 'lighter';
ctx.globalAlpha = 0.25;
ctx.filter = 'blur(12px)';
ctx.drawImage(canvas, 0, 0);
ctx.restore();
```

整屏 bloom 会让暗部发灰。只在关键帧用。

---

## 三、故障（glitch）

### 3.1 切片错位

```js
function glitchSlices(t, amount) {
  const slices = 12;
  // 按帧号取种子：同一帧永远是同一个错位量，导出才不会抖
  const rand = mulberry32(Math.floor(t * 30) + 1);
  for (let i = 0; i < slices; i++) {
    const y = (H / slices) * i;
    const off = (rand() - 0.5) * 2 * amount;
    ctx.drawImage(canvas, 0, y, W, H / slices, off, y, W, H / slices);
  }
}
```

`Math.random()` 在这里是错的：预览时每帧随机，看着像故障；导出时按帧取样，
同一个 `t` 每次渲染结果不同，视频会出现无法复现的抖动。

### 3.2 RGB 分离

```js
ctx.globalCompositeOperation = 'lighter';
ctx.fillStyle = 'rgba(255,0,80,0.6)';  ctx.fillRect(-4, 0, W, H);
ctx.fillStyle = 'rgba(0,220,255,0.6)'; ctx.fillRect(4, 0, W, H);
ctx.globalCompositeOperation = 'source-over';
```

### 3.3 什么时候用

- 科技 / 赛博 / 故障艺术题材
- 转场（0.1–0.2s，不要持续）
- **不要**用在文字为主的信息型画面上，读不清

---

## 四、拖影

### 4.1 残影（trail）

不擦除画布，只叠一层半透明底色，上一次的绘制就会留下：

```js
// 每帧开头
ctx.fillStyle = 'rgba(11,13,18,0.18)';   // 不是 clearRect
ctx.fillRect(0, 0, W, H);
```

这是**有状态**的做法，违反纯函数约束。导出时会因为跳帧而拖影不一致。

替代：按 `t` 计算最近 N 帧的位置，逐个画出来：

```js
for (let k = 0; k < 6; k++) {
  const tk = Math.max(0, t - k * (1 / 30));
  ctx.globalAlpha = 0.5 * Math.pow(0.6, k);
  drawDotAt(tk);
}
ctx.globalAlpha = 1;
```

### 4.2 速度线

漫画式速度线：从中心向外放射的短线段，透明度随速度变化。

```js
const lines = 40;
for (let i = 0; i < lines; i++) {
  const a = (i / lines) * Math.PI * 2;
  const r0 = 120 + rand() * 60;
  const r1 = r0 + 40 + speed * 80;
  ctx.strokeStyle = `rgba(255,255,255,${0.05 + speed * 0.15})`;
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
  ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
  ctx.stroke();
}
```

---

## 五、扫描线 / CRT

```js
function scanlines(gap = 3, alpha = 0.08) {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  for (let y = 0; y < H; y += gap) ctx.fillRect(0, y, W, 1);
}
```

配合轻微的垂直滚动，就是 CRT 质感：

```js
const offset = (t * 30) % gap;
for (let y = -gap; y < H; y += gap) ctx.fillRect(0, y + offset, W, 1);
```

`gap` 小于 2 在 1080p 上会摩尔纹，建议 3–4。

---

## 六、粒子光效

见 `get_reference("particles")`。这里只讲一个原则：**粒子用贴图，不要每个都画路径**。

---

## 七、性能对照

| 特效 | 1080p 单帧成本 | 建议 |
|---|---|---|
| `fillRect` 叠色 | <0.1ms | 随便用 |
| 径向渐变光斑 | 0.5–2ms | 预渲染成贴图 |
| `shadowBlur` 20px | 2–5ms | 少用 |
| `ctx.filter = blur(8px)` | 4–10ms | 只在关键帧 |
| 逐像素 `getImageData` | 15–50ms | 禁止 |
| 切片错位 12 片 | 1–3ms | 可接受 |
| 6 样本运动模糊 | ×6 绘制成本 | 只给快速元素 |

**一帧 33ms 的预算（30fps），特效超过 10ms 就会掉帧。**

---

## 八、纪律

1. **一条片子最多三种特效**。多了像滤镜堆叠。
2. **特效服务于叙事**：故障是为了表达「系统崩了」，不是为了好看。
3. **不要用特效掩盖内容空洞**。画面没内容时加特效，只会显得更空。
4. **导出前逐帧看**，特效在静态截图里往往比动态播放时好看。

---

## 九、自检清单

- [ ] 全片特效种类 ≤ 3？
- [ ] 每个特效都有叙事理由？
- [ ] 所有随机都用了固定种子？
- [ ] 模糊没有用在文字和细线上？
- [ ] 一帧的特效总成本 < 10ms？
- [ ] 拖影是按 `t` 重算的，不是靠画布残留？
