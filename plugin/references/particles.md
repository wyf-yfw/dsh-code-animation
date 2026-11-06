# 粒子系统

粒子是「量」的艺术：几十个是装饰，几千个是氛围，几万个是特效。

这一份讲：怎么在纯函数约束下做粒子、怎么控性能、怎么让粒子「有性格」。

---

## 一、纯函数粒子

粒子**不能**逐帧累加位置，因为导出是跳帧取样，跳过的帧状态全丢。

正确做法：每个粒子的状态是 `t` 的解析函数。

```js
function particle(i, t) {
  const rand = mulberry32(1000 + i);        // 每个粒子固定种子
  const angle = rand() * Math.PI * 2;
  const speed = 60 + rand() * 140;
  const life   = 1.2 + rand() * 1.8;
  const born   = rand() * 2;                // 出生时间错开
  const age    = t - born;
  if (age < 0 || age > life) return null;   // 未出生或已消亡

  const k = age / life;
  const r = speed * age * (1 - 0.5 * k);    // 带阻尼的位移
  return {
    x: cx + Math.cos(angle) * r,
    y: cy + Math.sin(angle) * r + 40 * age * age,   // 重力
    alpha: (1 - k) * (1 - k),               // 二次衰减
    size: 2 + rand() * 3,
  };
}
```

关键：`rand` 用粒子索引做种子，每个粒子的初始条件固定，位置由 `age` 算出。
删掉累加，也就删掉了跳帧问题。

---

## 二、绘制

### 2.1 用贴图，不要画路径

```js
// 慢：每个粒子 4 次调用
for (const p of ps) { ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill(); }

// 快：每个粒子 1 次
for (const p of ps) ctx.drawImage(dot, p.x - s, p.y - s, s * 2, s * 2);
```

预生成贴图（见 color.md 的 `makeNoise` / 光斑做法）：

```js
const dot = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const rg = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  rg.addColorStop(0, 'rgba(255,255,255,1)');
  rg.addColorStop(0.6, 'rgba(255,255,255,0.6)');
  rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 32, 32);
  return c;
})();
```

### 2.2 混合模式

| 模式 | 效果 | 适用 |
|---|---|---|
| `source-over` | 正常叠加 | 实心粒子 |
| `lighter` | 相加，越叠越亮 | 光点、火花 |
| `screen` | 柔和的提亮 | 烟雾、光晕 |

`lighter` 最容易出效果，但也最容易过曝。超过 500 个粒子时把单粒子 alpha 降到
0.15 以下。

---

## 三、性能

| 粒子数 | 做法 |
|---|---|
| < 200 | 每帧直接画 |
| 200–2000 | 贴图 + `lighter`，避免 `save/restore` |
| 2000–20000 | 降到 16×16 贴图，关闭阴影，减少 alpha 变化 |
| > 20000 | 预渲染成序列图，或改用 `ImageData` 逐像素（一次性） |

一帧 33ms 的预算下，2000 个 `drawImage` 约 6–10ms。

### 3.1 减少状态切换

```js
// 差：每个粒子都改 globalAlpha
for (const p of ps) { ctx.globalAlpha = p.alpha; ctx.drawImage(dot, ...); }

// 好：按 alpha 分桶，每桶设一次
const buckets = new Map();
for (const p of ps) {
  const k = Math.round(p.alpha * 10);
  (buckets.get(k) || buckets.set(k, []).get(k)).push(p);
}
for (const [k, arr] of buckets) {
  ctx.globalAlpha = k / 10;
  for (const p of arr) ctx.drawImage(dot, ...);
}
```

---

## 四、有性格的粒子

### 4.1 爆发

从一点向外，速度有分布，前快后慢：

```js
const r = speed * Math.pow(age, 0.6);   // 指数 < 1：一开始冲得快
```

### 4.2 汇聚

爆发反过来：从四周向中心收，`1 - pow(1 - k, 3)`。

### 4.3 飘浮

速度极低 + 正弦扰动，像尘埃：

```js
x: x0 + Math.sin(t * 0.7 + seed) * 18,
y: y0 - t * 12 + Math.cos(t * 0.5 + seed) * 10,
```

### 4.4 拖尾

每个粒子画最近 4 个历史位置（用 `t - k/30` 重算，不要存）：

```js
for (let k = 0; k < 4; k++) {
  const p = particle(i, t - k / 30);
  if (!p) continue;
  ctx.globalAlpha = p.alpha * Math.pow(0.5, k);
  ctx.drawImage(dot, p.x - s, p.y - s, s * 2, s * 2);
}
```

---

## 五、和文字/主体的关系

粒子是背景时，**必须压暗**：alpha ≤ 0.35，或者只在外围分布，别盖住中心。

判断方法：把画面缩到 25%，如果粒子还在抢视线，就再压。

---

## 六、自检清单

- [ ] 每个粒子的初始条件用索引做种子？
- [ ] 位置是 `t` 的解析函数，没有累加？
- [ ] 用贴图而不是 `arc` 路径？
- [ ] 粒子数在预算内（< 2000 直接画）？
- [ ] 背景粒子压暗到不抢主体？
- [ ] 混合模式统一，没有逐粒子切换？
