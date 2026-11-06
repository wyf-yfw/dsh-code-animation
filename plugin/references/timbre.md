# 音色配方（28 条，已逐个试听校准）

「听感」那栏是它应该听起来像什么。如果你写出来的东西和这栏不符，说明配方用错了，重写。

**禁令：任何音色都不许做低频扫频（把正弦从一两百赫兹一路滑到三四十赫兹）。**
这种声音听感像放屁，不是鼓。底鼓要「咚」就给一个固定频率的低正弦加一层鼓皮噪声，
让包络去做冲击，不要让频率去滑。自写配乐同样适用，没有例外。

| 音色 | 听感 | 做法 |
|---|---|---|
| 底鼓 kick | 低频「咚」，一击即止，音高不滑动 | 噪声过 220Hz 带通衰 0.05s（鼓皮），叠 62Hz 正弦**固定频率**衰 0.13s |
| 军鼓 snare | 中频「沙」加一点鼓皮音 | 2200Hz 带通噪声衰 0.07s，叠 190Hz 与 330Hz 正弦短衰减 |
| 闭合踩镲 | 极短极亮，只有「呲」一声 | 7000Hz 高通噪声，衰减 0.012s |
| 开镲 open hat | 同样高频，但尾巴拖长 | 同上，衰减 0.18s |
| 通鼓 tom | 有明确音高的鼓，比军鼓低沉 | 正弦 170→105Hz，衰减 0.22s |
| 吊镲 crash | 宽频金属噪声，尾巴很长 | 4200Hz 高通噪声乘非谐波调制，衰减 0.42s |
| 古筝拨弦 | 明亮拨弦，「啪」的起音加金属余韵 | Karplus-Strong，循环反馈 0.998，见示例一 |
| 清音吉他 | 同一类拨弦但更闷、衰更快 | Karplus-Strong 反馈 0.982，输出再过 1800Hz 低通 |
| 失真主音 | 沙哑持续，有攻击性 | 两路失谐锯齿叠加，tanh 硬削波，再过 900Hz 带通 |
| 竹笛 | 柔和持续音，带明显气声和轻微颤动 | 正弦加 0.4% 颤音，混 2400Hz 带通噪声 0.35，60ms 渐入 |
| 弦乐铺底 | 慢起音、宽而厚、无节奏 | 三路失谐锯齿加一个八度，1400Hz 低通，350ms 渐入 |
| 低频贝斯 sub | 极低频，音高明确但更像震动 | 55Hz 正弦加 110Hz 二次谐波 0.25 |
| 钟铃 bell | 金属非谐波，不是乐器音 | FM：载波 660Hz，调制比 3.51，调制指数从 6 指数衰到 0 |
| 马林巴 | 木头味，短促，有余音共鸣 | 523Hz 正弦衰 0.22，叠 4 倍频衰 0.06 与 9.2 倍频衰 0.02 |
| 上行扫频 riser | 亮度和音高一起往上冲 | 噪声过 400→7400Hz 扫频低通，叠 200→1100Hz 正弦 |
| 落重音 impact | 比底鼓更重更长，用在切点 | 52Hz 正弦**固定频率**衰 0.42，叠 2600Hz 高通噪声衰 0.3 与 240Hz 短瞬态 |
| 808 底鼓 | 长拖尾，有音高，但音高不滑动 | 62Hz 正弦**固定频率**，衰减 0.55s，轻微饱和，叠 4ms 噪声瞬态 |
| 酸性贝斯 303 | 锯齿过强共振，每个音「呜」一下 | 锯齿过 Q=11 状态变量滤波，截止 240→2840Hz 指数衰 0.075s，见示例二 |
| 超级锯齿 supersaw | 多层失谐，宽、亮、有合唱感 | 七路锯齿失谐 ±0.09 半音叠加，6000Hz 低通，见示例三 |
| 合成拨弦 pluck | 起音很亮然后瞬间变闷 | 锯齿过 Q=3 状态变量滤波，截止 400→5600Hz 衰 0.05s |
| 琶音 arp | 十六分音符快速跑动，每个音很短 | 方波每个十六分一个音，滤波截止瞬开瞬关 |
| FM 贝斯 | 低频但起音带金属「叮」 | 载波 55Hz，调制比 2，调制指数 420 指数衰 0.035s |
| 门限铺底 trance gate | 和弦被节奏切成一格一格 | 锯齿和弦过 2200Hz 低通，再乘八分音符硬门限 |
| 芯片方波 chip | 单薄、刺耳，红白机味 | 25% 占空比方波，短音符 |
| 抖动贝斯 wobble | 周期性「哇—哇—」 | 锯齿过 Q=9 状态变量滤波，截止被 4Hz LFO 在 200–2400Hz 扫动 |
| 下坠噪声 downlifter | 亮度往下掉，只掉亮度不掉音高 | 噪声过 7000→500Hz 反向扫频低通；**不要再叠低频正弦** |
| 侧链泵动 sidechain | 铺底每拍被压下去再弹回 | 铺底增益按 0.18 + 0.82 × (拍内相位 / 0.55) 起伏 |
| 四踩律动 four-on-floor | 每拍一记底鼓，二四拍军鼓 | 底鼓每拍，二四拍噪声军鼓，八分音符踩镲 |

#### 完整示例一：拨弦（古筝 / 吉他）

~~~js
// Karplus-Strong：噪声填一个周期长度的循环缓冲，每绕一圈丢一点高频。
// 这个衰减过程就是「被拨动的弦」和「一个 beep」的区别。
function pluckBuffer(freq, seconds, feedback) {
  const n = Math.floor(seconds * ctx.sampleRate);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  const period = Math.max(2, Math.round(ctx.sampleRate / freq));
  const line = new Float32Array(period);
  for (let i = 0; i < period; i++) line[i] = rand() * 2 - 1;
  let prev = 0;
  let idx = 0;
  for (let i = 0; i < n; i++) {
    const cur = line[idx];
    line[idx] = 0.5 * (cur + prev) * feedback;
    prev = cur;
    idx = (idx + 1) % period;
    d[i] = cur;
  }
  return buf;
}
// 古筝：feedback 0.998，余音长且带金属感
// 清音吉他：feedback 0.982，再接一个 1800Hz 低通，更闷更短
~~~

#### 完整示例二：酸性贝斯（滤波器扫动）

~~~js
// 状态变量滤波器，截止频率可以逐样本变化。
// biquad 做不到平滑扫频（系数按 buffer 固定），而扫频正是 acid 和 wobble 的灵魂。
function svf(input, cutoffAt, q) {
  const out = new Float32Array(input.length);
  const maxFc = ctx.sampleRate / 8; // 再高会不稳定
  let low = 0;
  let band = 0;
  for (let i = 0; i < input.length; i++) {
    const fc = Math.max(20, Math.min(maxFc, cutoffAt(i / ctx.sampleRate)));
    const f = 2 * Math.sin((Math.PI * fc) / ctx.sampleRate);
    const high = input[i] - low - (1 / q) * band;
    band += f * high;
    low += f * band;
    out[i] = low;
  }
  return out;
}

function sawBuffer(freq, seconds) {
  const n = Math.floor(seconds * ctx.sampleRate);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = 2 * (((freq * i) / ctx.sampleRate) % 1) - 1;
  return buf;
}

// 303：锯齿过 Q=11 的滤波器，截止从 2640Hz 在 75ms 内指数关掉
const raw = sawBuffer(55, 0.25).getChannelData(0);
const acid = svf(raw, (t) => 240 + 2400 * Math.exp(-t / 0.075), 11);
~~~

#### 完整示例三：超级锯齿（宽亮主音）

~~~js
// 七路失谐锯齿叠加，这是 trance / EDM 那种「宽」的来源。
const detunes = [-0.09, -0.06, -0.03, 0, 0.03, 0.06, 0.09];
const mix = new Float32Array(Math.floor(duration * ctx.sampleRate));
for (const d of detunes) {
  const v = sawBuffer(261.6 * Math.pow(2, d / 12), duration).getChannelData(0);
  for (let i = 0; i < mix.length; i++) mix[i] += v[i] / detunes.length;
}
// 再接 6000Hz 低通削掉刺耳高频
~~~

上面的示例只演示关键部分：master、sawBuffer 这些辅助函数要在你自己的代码里完整定义。

写完用 renderAt 自检首帧、中段、尾帧：不是黑屏、文字不溢出、不同时间画面确实在动。
把"未走分镜确认"之类的提示当回事——那是流程被跳过的信号。

---

## 编曲：从音色到一条完整的配乐

有了音色还不够，还得排成一条有起伏的配乐。这一段讲层次、密度和收尾。

### 层次（同一时刻最多 4 层）

| 层 | 作用 | 音量 | 例子 |
|---|---|---|---|
| 低频 | 地基 | −12dB | 贝斯根音、底鼓 |
| 中频 | 主体 | −9dB | 和弦、主旋律 |
| 高频 | 空气感 | −18dB | 踩镲、铃声、噪声铺底 |
| 点状 | 强调 | −6dB | 重击、转场音效 |

层次超过 4 层会糊成一团。**同一时刻不要有两个乐器抢同一个频段**：
电钢琴和吉他都在 200–800Hz，同时弹就打架，错开八度或错开时间。

### 密度曲线

配乐的密度必须跟着画面走：

| 段落 | 密度 | 做法 |
|---|---|---|
| 开场 | 低 | 只有铺底 + 一两个点缀 |
| 铺垫 | 中 | 加节奏，鼓组进来 |
| 高潮 | 高 | 全编制，重音密集 |
| 收尾 | 低 | 撤掉鼓，只留和弦散开 |

全程一个密度，观众听 20 秒就走神了。

### 卡点处的三种处理

| 处理 | 听感 | 什么时候用 |
|---|---|---|
| 加一层重击 | 有力 | 普通卡点 |
| 撤掉所有声音 0.15s | 屏息 | 高潮前 |
| 只留高频 + 一记低频 | 空间感 | 转场 |

**不要每个卡点都用同一种处理。** 连续三次同样的重击，第四次就没感觉了。

### 收尾

最后 0.5s 做三件事：

1. 鼓组停
2. 和弦延长（不要断）
3. 整体音量线性衰减到 0

```js
master.gain.setValueAtTime(0.9, t0 + duration - 0.5);
master.gain.linearRampToValueAtTime(0, t0 + duration);
```

硬切会「啪」一声。

### 自检

- [ ] 同一时刻不超过 4 层？
- [ ] 没有两个乐器抢同一频段？
- [ ] 密度有起伏（开场低、高潮高、收尾低）？
- [ ] 卡点处理有变化（不是每次都同一招）？
- [ ] 结尾有 0.5s 衰减？
- [ ] 全曲峰值 ≤ −1dBFS？
