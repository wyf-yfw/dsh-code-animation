# 数据可视化

数据镜头是「信息型视频」的主力。做得好是说服力，做不好是 PPT 截图。

这一份讲：柱状、折线、环形、数字滚动、对比，以及怎么让它们动得有道理。

---

## 一、先定比例，再画

所有图表都要先算「数据 → 像素」的映射，不要边画边算。

```js
const max = Math.max(...values);
const yOf = (v) => baseY - (v / max) * plotHeight;
```

**纵轴从 0 开始**。截断纵轴会夸大差异，是数据可视化的头号错误。

---

## 二、柱状

### 2.1 生长

```js
for (let i = 0; i < values.length; i++) {
  const u = easeOutCubic(tween(t, start + i * 0.06, 0.5));
  const h = (values[i] / max) * plotHeight * u;
  ctx.fillRect(xOf(i), baseY - h, barW, h);
}
```

错开 60ms 一根，比同时长起来有节奏。

### 2.2 强调一根

要突出某一根，其余降透明度到 0.35，被强调的保持 1.0 并加高亮色。

### 2.3 圆角与间距

柱宽 : 间距 = 3 : 1。圆角只在顶部（`roundRect` 或手动路径），底部保持直角贴住基线。

---

## 三、折线

### 3.1 描线

用 `setLineDash` + `lineDashOffset` 做「画出来」的效果：

```js
const len = pathLength;
ctx.setLineDash([len, len]);
ctx.lineDashOffset = len * (1 - u);
ctx.stroke();
ctx.setLineDash([]);
```

或者逐段绘制（更可控，能配合点的高亮）。

### 3.2 面积填充

折线下方填充半透明色，alpha 0.15–0.25：

```js
ctx.beginPath();
ctx.moveTo(pts[0].x, baseY);
for (const p of pts) ctx.lineTo(p.x, p.y);
ctx.lineTo(pts[pts.length - 1].x, baseY);
ctx.closePath();
ctx.fillStyle = 'rgba(255,138,61,0.18)';
ctx.fill();
```

### 3.3 数据点

点在高亮时放大到 1.5 倍并加光晕。**不要每个点都加光晕**，那样像星空。

---

## 四、环形 / 饼图

### 4.1 扇区

```js
let a0 = -Math.PI / 2;
for (const seg of segments) {
  const a1 = a0 + (seg.value / total) * Math.PI * 2 * u;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, a0, a1);
  ctx.closePath();
  ctx.fill();
  a0 = a1;
}
```

### 4.2 环形进度

中间挖空（`globalCompositeOperation = 'destination-out'` 画一个内圆），
再在中间放百分比数字。

### 4.3 别用饼图

超过 4 个扇区，人眼分不清角度。改用横向条形图，长度比角度好判断。

---

## 五、数字

### 5.1 滚动到目标

```js
const u = easeOutQuint(tween(t, start, 0.9));
const shown = target * u;
```

末尾必须减速，否则读者看不清最终值。

### 5.2 千分位

```js
const fmt = (n) => n.toLocaleString('zh-CN', { maximumFractionDigits: 1 });
```

### 5.3 单位位置

单位（万 / 亿 / % / ms）放在数字右侧，字号是数字的 0.5 倍，基线对齐。

### 5.4 对比

两个数字对比时，**同时**滚动到各自目标值，而不是先后。同时到达才有「比较」的意味。

---

## 六、对比与变化

### 6.1 前后对比

左右并排，中间一条分隔线。两边的动画同步启动、同步结束。

### 6.2 差值高亮

用一段色块标出「变化的部分」，配一个数字标注差值。

### 6.3 上升 / 下降

箭头方向 + 颜色（涨用暖色、跌用冷色），但**颜色不是唯一信号**——色盲用户看不出来，
所以箭头形状也要区分。

---

## 七、动效纪律

| 该动 | 不该动 |
|---|---|
| 柱子的生长 | 坐标轴数字乱跳 |
| 折线的描绘 | 网格线闪烁 |
| 数字滚动 | 图例颜色渐变 |
| 高亮切换 | 整个图表旋转 |

**图表动效的目的是引导阅读顺序**，不是炫技。观众应该先看标题，再看高亮的那一根，
最后看总数。

---

## 八、常见错误

| 错误 | 后果 |
|---|---|
| 纵轴不从 0 开始 | 夸大差异，误导 |
| 饼图扇区 > 4 | 分不清 |
| 每个数据点都发光 | 像星空，看不出趋势 |
| 数字滚动不减速 | 读不出最终值 |
| 图例用 6 种颜色 | 记不住 |
| 网格线比数据线还粗 | 喧宾夺主 |

---

## 九、自检清单

- [ ] 纵轴从 0 开始？
- [ ] 柱子错开生长（60ms）？
- [ ] 数字末尾减速，单位提前固定？
- [ ] 对比的两个数字同时到达？
- [ ] 图表动效 ≤ 2 种？
- [ ] 高亮只有一处？
- [ ] 颜色之外还有形状/文字区分？
