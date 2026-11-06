# 调色与质感

纯代码画出来的画面很容易「塑料」：太干净、太平、太像 PPT。

这一份讲：调色板怎么定、层次怎么拉、质感怎么加、什么时候该收手。

---

## 一、先限制调色板

一条片子 3–5 个主色就够。超过 5 个，画面会散。

分配比例（60/30/10 法则）：

| 角色 | 占比 | 用途 |
|---|---|---|
| 底色 | 60% | 背景、大面积色块 |
| 辅色 | 30% | 次级元素、分隔线、装饰 |
| 强调色 | 10% | 只用在「要观众看的地方」：数字、关键词、按钮 |

**强调色不要平均分布**。整屏都是强调色，等于没有强调。

### 深色片子的起手式

```js
const PALETTE = {
  bg:      '#0b0d12',   // 带一点蓝的黑
  surface: '#161a23',   // 卡片/面板
  line:    '#242a36',   // 分隔线
  text:    '#e8e6e1',   // 带一点暖的白
  muted:   '#8b8f9a',   // 次要文字
  accent:  '#ff8a3d',   // 橙
  accent2: '#3fd7c0',   // 青
};
```

### 浅色片子的起手式

```js
const PALETTE = {
  bg:      '#f5f2ea',   // 米白，不是纯白
  surface: '#ffffff',
  line:    '#ddd8cc',
  text:    '#1a1815',
  muted:   '#6b675f',
  accent:  '#d97757',   // 陶土橙
};
```

---

## 二、层次靠明度，不靠饱和度

新手喜欢用鲜艳的颜色区分层次，结果画面吵。正确做法是拉开明度：

| 层 | 明度（HSL 的 L） | 例子 |
|---|---|---|
| 背景 | 8–18% | `#0b0d12` |
| 次级背景 | 20–30% | `#161a23` |
| 中间层 | 45–60% | `#4a5060` |
| 主体 | 85–100% | `#e8e6e1` |

相邻层至少差 20 个百分点，否则在暗环境下会糊在一起。

---

## 三、暗部不纯黑，亮部不纯白

`#000` 和 `#fff` 在大屏上生硬，而且会让渐变出现断层。

| 用途 | 不要用 | 改用 |
|---|---|---|
| 黑底 | `#000000` | `#0b0d12`（冷）或 `#14100c`（暖） |
| 白字 | `#ffffff` | `#e8e6e1`（暖）或 `#e6eaf0`（冷） |

这一条改完，画面立刻有「片子感」。

---

## 四、渐变

### 4.1 避免色带

两个相近色之间的长距离线性渐变会出现明显条纹（banding），尤其是 8bit 输出。

解法一：加噪点（见第五节）。
解法二：用多个中间色标，让过渡更平滑。

```js
const g = ctx.createLinearGradient(0, 0, 0, H);
g.addColorStop(0.00, '#0b0d12');
g.addColorStop(0.35, '#12161f');
g.addColorStop(0.70, '#1a2030');
g.addColorStop(1.00, '#0b0d12');
```

### 4.2 径向渐变做光

```js
const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
g.addColorStop(0, 'rgba(255,138,61,0.55)');
g.addColorStop(0.4, 'rgba(255,138,61,0.18)');
g.addColorStop(1, 'rgba(255,138,61,0)');
ctx.fillStyle = g;
ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
```

半径至少是光源尺寸的 3 倍，否则会看到明显的圆边。

---

## 五、颗粒

加一层极淡的噪点，能消掉渐变色带，也让画面不那么塑料。

### 5.1 预生成噪声贴图

```js
function makeNoise(size = 256, seed = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  const img = x.createImageData(size, size);
  const rand = mulberry32(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (rand() - 0.5) * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return c;
}
```

### 5.2 平铺

```js
const noise = ctx.createPattern(makeNoise(256, 7), 'repeat');
ctx.globalAlpha = 0.03;
ctx.globalCompositeOperation = 'overlay';
ctx.fillStyle = noise;
ctx.fillRect(0, 0, W, H);
ctx.globalAlpha = 1;
ctx.globalCompositeOperation = 'source-over';
```

透明度：

| 值 | 观感 |
|---|---|
| 1–2% | 几乎看不见，但能消 banding |
| 3–4% | 有胶片颗粒感（推荐） |
| 6% 以上 | 脏 |

噪声贴图要固定种子。每帧都重新生成会抖成雪花屏。

---

## 六、光晕

### 6.1 shadowBlur

最简单，但贵（每帧重算模糊）：

```js
ctx.shadowColor = 'rgba(255,138,61,0.8)';
ctx.shadowBlur = 24;
ctx.fillRect(x, y, w, h);
ctx.shadowBlur = 0;   // 复位，否则后续所有绘制都带阴影
```

`shadowBlur` 超过 40 在 1080p 上明显掉帧。

### 6.2 预渲染光斑

性能更好：预生成一张径向渐变贴图，用 `drawImage` 叠加。

```js
const glow = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const rg = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  rg.addColorStop(0, 'rgba(255,255,255,1)');
  rg.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
  return c;
})();

// 使用时
ctx.globalCompositeOperation = 'screen';
ctx.globalAlpha = 0.6;
ctx.drawImage(glow, cx - r, cy - r, r * 2, r * 2);
ctx.globalAlpha = 1;
ctx.globalCompositeOperation = 'source-over';
```

---

## 七、暗角

四角压暗 15–25%，中心不动。观众的视线会自然往中间走。

```js
const v = ctx.createRadialGradient(W/2, H/2, Math.min(W,H) * 0.35, W/2, H/2, Math.max(W,H) * 0.75);
v.addColorStop(0, 'rgba(0,0,0,0)');
v.addColorStop(1, 'rgba(0,0,0,0.28)');
ctx.fillStyle = v;
ctx.fillRect(0, 0, W, H);
```

暗角和光晕不要同时开到最大，会像廉价滤镜。

---

## 八、色差

快速运动的画面加 1–2px 的 RGB 通道偏移，有镜头感。静止画面加色差只会显脏。

```js
ctx.globalCompositeOperation = 'lighter';
ctx.fillStyle = 'rgba(255,0,60,0.5)';
ctx.fillRect(-offset, 0, W, H);
ctx.fillStyle = 'rgba(0,220,255,0.5)';
ctx.fillRect(offset, 0, W, H);
ctx.globalCompositeOperation = 'source-over';
```

只在高光边缘有效，全屏铺一层会变成紫色。

---

## 九、灰度自检

导出前把画面转成灰度看一眼：如果灰度下层次还在，说明结构是对的；
如果糊成一团，说明你在靠颜色硬撑，需要把明度关系拉开重画。

```js
ctx.filter = 'grayscale(1)';
// 画一遍，截图看
ctx.filter = 'none';
```

或者直接心算：把每个颜色换算成亮度 `0.299R + 0.587G + 0.114B`，看相邻层的差值
是否 ≥ 40。

---

## 十、常见错误

| 错误 | 后果 | 修正 |
|---|---|---|
| 7 种以上主色 | 画面散 | 砍到 3–5 个 |
| 靠饱和度分层 | 吵、刺眼 | 靠明度 |
| 纯黑纯白 | 生硬、断层 | 带色相的黑白 |
| 无颗粒的大面积渐变 | 色带明显 | 加 3% 噪点 |
| `shadowBlur` 60 | 掉帧 | 用预渲染光斑 |
| 暗角 + 光晕 + 色差全开 | 廉价滤镜 | 最多两种 |
| 每帧重新生成噪声 | 雪花屏 | 固定种子 + 预生成 |

---

## 十一、自检清单

- [ ] 主色 ≤ 5 个，且 60/30/10 分配？
- [ ] 相邻明度层差 ≥ 20 个百分点？
- [ ] 暗部不是 `#000`，亮部不是 `#fff`？
- [ ] 大面积渐变有噪点压 banding？
- [ ] 噪点透明度在 3–4%？
- [ ] `shadowBlur` 用完复位了吗？
- [ ] 灰度下还能分清层次吗？
