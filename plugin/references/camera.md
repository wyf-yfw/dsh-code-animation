# 镜头与空间

平面画布也能有空间感。靠的是透视、视差、景深和运动。

这一份讲：2.5D 推拉摇移、视差分层、伪 3D 投影、镜头运动的速度曲线。

---

## 一、镜头运动

### 1.1 推（zoom in）

画面向中心放大。速度曲线决定情绪：

| 曲线 | 情绪 |
|---|---|
| ease-in-out | 平稳推进（叙事） |
| ease-out | 猛地推近然后稳住（强调） |
| 线性 | 机械、冷（科技感） |

```js
const z = 1 + 0.35 * easeInOutCubic(tween(t, start, 1.2));
ctx.translate(cx, cy);
ctx.scale(z, z);
ctx.translate(-cx, -cy);
drawScene(t);
```

放大超过 2 倍会明显糊（画布分辨率限制）。要推很远就用「换场」而不是「推」。

### 1.2 摇（pan）

画布内容整体平移，模拟摄像机左右摇。

```js
const dx = -W * 0.25 * easeInOutCubic(tween(t, start, 1.5));
ctx.translate(dx, 0);
drawScene(t);
```

平移时**背景要比前景慢**（视差），否则像整张图在滑动。

### 1.3 手持感

轻微的随机抖动，让画面不像 CG：

```js
const rand = mulberry32(Math.floor(t * 30));
const shakeX = (rand() - 0.5) * 3;
const shakeY = (rand() - 0.5) * 2;
ctx.translate(shakeX, shakeY);
```

幅度 2–4px。超过 8px 会晕。

---

## 二、视差分层

把画面拆成 3 层，按不同速度移动：

```js
function drawParallax(t, offset) {
  ctx.save(); ctx.translate(offset * 0.2, 0); drawFar(t);  ctx.restore();   // 远景最慢
  ctx.save(); ctx.translate(offset * 0.5, 0); drawMid(t);  ctx.restore();   // 中景
  ctx.save(); ctx.translate(offset * 1.0, 0); drawNear(t); ctx.restore();   // 近景最快
}
```

速度比 0.2 : 0.5 : 1.0 是经验值。远景再慢就变成静止了。

---

## 三、伪 3D

### 3.1 透视投影

把 3D 点投到 2D：

```js
function project(x, y, z, fov = 600) {
  const s = fov / (fov + z);
  return { x: cx + x * s, y: cy + y * s, s };
}
```

`s` 是缩放系数，可以拿来同时缩放尺寸和透明度：

```js
const p = project(x, y, z);
ctx.globalAlpha = 0.3 + 0.7 * p.s;
ctx.drawImage(img, p.x - w * p.s / 2, p.y - h * p.s / 2, w * p.s, h * p.s);
```

### 3.2 绕 Y 轴旋转

```js
const a = t * 0.6;
const rx = x * Math.cos(a) - z * Math.sin(a);
const rz = x * Math.sin(a) + z * Math.cos(a);
const p = project(rx, y, rz);
```

### 3.3 卡片翻转

单个元素绕 Y 轴翻转，用横向缩放模拟：

```js
const flip = Math.cos(tween(t, start, 0.5) * Math.PI);   // 1 → -1
ctx.scale(Math.abs(flip) || 0.001, 1);
```

`flip` 过 0 时要跳过绘制（避免除零或宽度为 0 的怪异渲染）。

---

## 四、景深

近处清晰、远处模糊（或反过来）：

```js
// 远景
ctx.save();
ctx.filter = 'blur(6px)';
ctx.globalAlpha = 0.7;
drawFar(t);
ctx.restore();
// 近景
drawNear(t);
```

`ctx.filter` 贵，远景用离屏预渲染的模糊图更省。

---

## 五、构图

| 法则 | 用法 |
|---|---|
| 三分法 | 主体放在 1/3 线上，不要正中 |
| 视线方向留白 | 人物/箭头朝向的一侧留更多空间 |
| 前景遮挡 | 加一个模糊的前景元素（柱子、叶片），立刻有纵深 |
| 大小对比 | 一个大元素 + 一堆小元素，比均匀分布有层次 |

---

## 六、速度与重量

大物体移动要慢，小物体可以快。同样的位移，大元素用更长的时长：

```js
const durBig = 0.9;   // 大标题
const durSmall = 0.4; // 小图标
```

违反这条，画面会像「轻飘飘的塑料」。

---

## 七、自检清单

- [ ] 推镜头的放大倍数 ≤ 2？
- [ ] 平移时背景比前景慢？
- [ ] 手持抖动 ≤ 4px？
- [ ] 3D 投影的缩放同时作用在尺寸上？
- [ ] 翻转经过 0 时跳过了绘制？
- [ ] 大元素比小元素动得慢？
- [ ] 主体没有压在正中（除非刻意对称）？
