# 运动与缓动

动画好不好看，八成取决于运动曲线，不取决于画了什么。这一份讲清楚：帧怎么算、
曲线怎么选、速度怎么控、什么时候该加运动模糊。

---

## 一、帧即函数

`window.renderAt(t)` 必须是纯函数：同一个 `t` 永远得到同一帧。

```js
window.renderAt = function (t) {
  ctx.clearRect(0, 0, W, H);
  drawBackground(t);
  drawTitle(t);
  drawParticles(t);
};
```

三条禁止：

| 禁止 | 后果 |
|---|---|
| 读 `Date.now()` / `performance.now()` | 预览和导出不同步，导出时画面乱跳 |
| 用 `Math.random()` | 每一帧粒子位置都变，导出后像雪花屏 |
| 依赖上一帧状态（累加、缓存） | 导出是「跳帧取样」，跳过的那几帧状态全丢 |

需要随机就写固定种子的伪随机：

```js
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261103);   // 固定种子，每帧重新创建也一样
```

需要「上一帧的位置」就把它算出来，不要存。比如粒子在 `t` 时刻的位置：

```js
// 错：p.x += vx * dt
// 对：位置是 t 的解析函数
const x = x0 + vx * t + 0.5 * ax * t * t;
```

---

## 二、时间归一化

所有动画参数都写成 `t` 的函数，用区间映射：

```js
const clamp01 = (u) => (u < 0 ? 0 : u > 1 ? 1 : u);
/** 在 [start, start+dur] 内把时间映射到 0..1 */
const tween = (t, start, dur) => clamp01((t - start) / Math.max(dur, 1e-6));
```

有了 `tween`，任何属性都能这样写：

```js
const u = tween(t, 1.2, 0.6);        // 1.2s 开始，持续 0.6s
const opacity = easeOutCubic(u);
const y = 400 - 120 * easeOutBack(u);
```

---

## 三、缓动曲线

### 3.1 为什么不能线性

匀速运动看起来像机器在动。人眼对「起步」和「收尾」的加速度极其敏感，
线性插值在这两端加速度突变，观感是「卡了一下」。

### 3.2 常用曲线（附实现）

```js
const easeOutCubic  = (u) => 1 - Math.pow(1 - u, 3);
const easeInCubic   = (u) => u * u * u;
const easeInOutCubic= (u) => u < 0.5 ? 4*u*u*u : 1 - Math.pow(-2*u + 2, 3) / 2;
const easeOutQuint  = (u) => 1 - Math.pow(1 - u, 5);
const easeOutExpo   = (u) => u === 1 ? 1 : 1 - Math.pow(2, -10 * u);
const easeOutBack   = (u) => { const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
```

### 3.3 什么时候用哪条

| 场景 | 曲线 | 理由 |
|---|---|---|
| 元素进场（淡入、上浮） | ease-out | 快进慢停，像被甩进来又稳住 |
| 元素退场（淡出、下沉） | ease-in | 慢起快走，像被吸走 |
| 位置移动 | ease-in-out | 两头缓中间快，符合惯性 |
| 弹性 / 回弹 | ease-out-back | 过冲 10–15% 再落回 |
| 数字滚动 | ease-out-quint | 末尾几乎静止，读数清楚 |
| 遮罩揭开 | ease-in-out | 匀速揭开像机械 |
| 摄像机推近 | ease-in-out 或 ease-out | 推近用 ease-out，拉远用 ease-in |

**不要用 CSS 默认的 `ease`**（等价 cubic-bezier(0.25,0.1,0.25,1)），曲线太弱，
在 1 秒以内的动画上几乎看不出区别。

### 3.4 用 bezier 精确控制

```js
function cubicBezier(p1x, p1y, p2x, p2y) {
  // 牛顿迭代求 x 对应的 t，再算 y
  const cx = 3 * p1x, bx = 3 * (p2x - p1x) - cx, ax = 1 - cx - bx;
  const cy = 3 * p1y, by = 3 * (p2y - p1y) - cy, ay = 1 - cy - by;
  const sampleX = (s) => ((ax * s + bx) * s + cx) * s;
  const sampleY = (s) => ((ay * s + by) * s + cy) * s;
  const solveX = (x) => {
    let s = x;
    for (let i = 0; i < 6; i++) {
      const err = sampleX(s) - x;
      if (Math.abs(err) < 1e-5) break;
      const d = (3 * ax * s + 2 * bx) * s + cx;
      if (Math.abs(d) < 1e-6) break;
      s -= err / d;
    }
    return s;
  };
  return (x) => sampleY(solveX(clamp01(x)));
}
const easeOut = cubicBezier(0.16, 1, 0.3, 1);
```

常用值：

| 名字 | bezier |
|---|---|
| ease-out（强） | `(0.16, 1, 0.3, 1)` |
| ease-in（强） | `(0.7, 0, 0.84, 0)` |
| ease-in-out（标准） | `(0.65, 0, 0.35, 1)` |
| 快出慢收 | `(0.22, 1, 0.36, 1)` |
| 蓄力 | `(0.5, 0, 0.9, 0.2)` |

### 3.5 弹簧

弹簧比 bezier 更「活」，适合强调性动作（按钮弹入、图标落位）。解析解：

```js
/** 阻尼弹簧：0 时刻从 0 出发，最终收敛到 1 */
function spring(t, { stiffness = 180, damping = 12, mass = 1 } = {}) {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    const A = -1, B = -zeta * w0 / wd;
    return 1 + Math.exp(-zeta * w0 * t) * (A * Math.cos(wd * t) + B * Math.sin(wd * t));
  }
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
}
```

参数直觉：

| 效果 | stiffness | damping |
|---|---|---|
| 轻微回弹 | 120 | 14 |
| 明显回弹 | 200 | 10 |
| 硬弹（像金属） | 300 | 8 |
| 几乎不弹（只减速） | 100 | 26 |

**弹簧只用在「结果需要强调」的地方**：一次落位、一次开关。全程弹簧会显得廉价。

---

## 四、夹紧与越界

`ease-out-back` 会过冲（返回值 > 1），`spring` 会来回震荡。这些是设计意图，
但**位置、透明度、缩放必须夹紧到合法范围**：

```js
const alpha = clamp01(easeOutBack(u));
const scale = Math.max(0.01, 1 + 0.15 * spring(t, ...));
```

不夹紧的典型事故：透明度变成负数（画不出来）、缩放变成 0（除零）、
元素坐标飞到画布外（看起来像消失了）。

---

## 五、帧预算与性能

30fps 下每帧 16.6ms，60fps 下 8.3ms。浏览器还要留时间给合成和录制。

| 操作 | 大致成本 |
|---|---|
| `fillRect` 小面积 | 0.01ms |
| `fillText` 单行 | 0.05–0.2ms |
| `drawImage` 同尺寸贴图 | 0.05ms |
| 径向渐变全屏 | 0.5–2ms |
| `shadowBlur` 大半径 | 1–5ms |
| 逐像素 `getImageData/putImageData` | 10–50ms（禁止每帧做） |
| 创建 `Path2D`（每帧新建） | 0.1–1ms |

经验上限：**每帧 300 个绘制调用**以内比较稳。超过就合并、预渲染、降级。

优化手段：

1. **离屏预渲染**：把静态的复杂图形画一次到 `OffscreenCanvas`，之后 `drawImage`。
2. **分层**：背景层只在变化时重画（但纯函数约束下通常是每帧重画，所以要缓存到离屏 canvas，按 `t` 的粗粒度失效）。
3. **粒子用贴图**：不要每个粒子都 `beginPath + arc`，预生成 32×32 的圆点贴图。
4. **避免每帧分配**：对象池、复用数组。

```js
// 预生成粒子贴图
const dot = document.createElement('canvas');
dot.width = dot.height = 32;
const dctx = dot.getContext('2d');
const g = dctx.createRadialGradient(16, 16, 0, 16, 16, 16);
g.addColorStop(0, 'rgba(255,255,255,1)');
g.addColorStop(1, 'rgba(255,255,255,0)');
dctx.fillStyle = g; dctx.fillRect(0, 0, 32, 32);
// 绘制时
ctx.drawImage(dot, p.x - 16, p.y - 16, 32, 32);
```

---

## 六、运动模糊

真实运动模糊来自快门开合：180° 快门意味着曝光覆盖半帧。

### 6.1 子帧叠加

```js
function drawWithBlur(t, shutter = 0.5, samples = 6) {
  // shutter 是帧的倍数：0.5 = 半帧曝光
  const frameDur = 1 / 30;
  const span = frameDur * shutter;
  ctx.save();
  ctx.globalAlpha = 1 / samples;
  for (let i = 0; i < samples; i++) {
    const sub = t - (i / (samples - 1 || 1)) * span;
    drawScene(sub);
  }
  ctx.restore();   // 恢复 globalAlpha
}
```

### 6.2 什么时候用

| 条件 | 加不加 |
|---|---|
| 元素速度 > 40px/帧 | 加 |
| 画面整体推拉/摇移 | 加 |
| 静止画面、缓慢淡入 | 不加（只会变糊） |
| 文字 | 谨慎，小字加了会糊成一团 |

### 6.3 成本

`samples` 直接乘上绘制成本。6 个样本 = 6 倍绘制时间。导出 120 秒 × 30fps × 6 样本
= 21600 次全场景绘制，会很慢。只在关键段落用，或者把 samples 降到 3。

---

## 七、动作设计

### 7.1 预备—动作—跟随

真实动作有三段，动画也一样：

| 阶段 | 时长占比 | 表现 |
|---|---|---|
| 预备（anticipation） | 15% | 反向蓄力，比如起跳前下蹲 |
| 动作（action） | 50% | 主运动，快 |
| 跟随（follow-through） | 35% | 过冲 + 回弹 + 附属物延迟 |

```js
const total = 0.8;
const u = tween(t, 1.0, total);
let y;
if (u < 0.15)      y = 20 * (u / 0.15);                    // 下蹲
else if (u < 0.65) y = 20 - 140 * easeOutQuint((u - 0.15) / 0.5);  // 起跳
else               y = -120 + 8 * Math.sin((u - 0.65) / 0.35 * Math.PI); // 回弹
```

### 7.2 只让一个东西当主角

同一时刻三个元素在动，观众哪个都看不见。检查方法：每隔 0.5 秒问一次
「现在观众的眼睛该看哪里」。答不上来就说明画面太挤。

### 7.3 留白

静止不是死亡。6–10 帧的静场比全程都在动更有力，尤其是重音之前。

```js
// 重音落在 3.0s：2.9–3.0 之间画面完全静止
const holdStart = 2.9, holdEnd = 3.0;
if (t > holdStart && t < holdEnd) return;   // 保持上一帧内容
```

### 7.4 次级动作

主体到位后，附属元素延迟 2–4 帧跟上，画面立刻「活」：

```js
const mainU = tween(t, 1.0, 0.4);
const subU  = tween(t, 1.0 + 0.08, 0.4);   // 延迟 80ms
```

---

## 八、自检清单

导出前逐条过：

- [ ] `renderAt(0)` 不是黑屏
- [ ] `renderAt(duration/2)` 有内容
- [ ] `renderAt(duration - 0.05)` 不是被截断的半截动作
- [ ] 没有任何 `Math.random()` 或 `Date.now()`
- [ ] 所有插值都夹紧了
- [ ] 同一时刻只有一个视觉主角
- [ ] 每个卡点前 2–3 帧画面是静的
- [ ] 逐帧拖动看，没有闪烁或跳变
