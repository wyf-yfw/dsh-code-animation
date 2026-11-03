window.__ModuleLoader__.load({
  id: '@local/dsh-code-animation',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useMemo, useRef, useCallback } = React;

    const API = '/code-animation-api';
    /** Conversation event kind that carries one Turn's creation artifacts. */
    const KIND = 'code-animation';

    const CSS = `
.cas-tail{margin:8px 0 2px;display:flex;flex-direction:column;gap:8px}
.cas-card{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;overflow:hidden;
  background:var(--dsw-alias-bg-layer-1);font:13px/1.5 system-ui,"PingFang SC","Microsoft YaHei",sans-serif;
  color:var(--dsw-alias-label-primary)}
.cas-card-head{display:flex;align-items:center;gap:8px;padding:9px 11px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.cas-dot{width:7px;height:7px;border-radius:2px;background:linear-gradient(135deg,#ff8a3d,#e0457b);flex:none}
.cas-card-title{font-weight:600;font-size:12.5px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cas-card-meta{font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.cas-grow{flex:1}
.cas-btn{height:27px;padding:0 11px;border-radius:7px;font:600 11.5px/1 inherit;cursor:pointer;white-space:nowrap;
  border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.cas-btn:hover{border-color:var(--dsw-alias-border-l2)}
.cas-btn:disabled{opacity:.5;cursor:not-allowed}
.cas-btn-primary{background:var(--dsw-alias-label-primary);border-color:transparent;color:var(--dsw-alias-bg-base)}
.cas-btn-primary:hover{filter:brightness(.92)}

/* stills gallery */
.cas-stills{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px;padding:10px}
.cas-still{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;overflow:hidden;
  background:var(--dsw-alias-bg-layer-2);cursor:zoom-in;padding:0;text-align:left;font:inherit;color:inherit}
.cas-still img{width:100%;display:block;aspect-ratio:16/9;object-fit:cover}
.cas-still-cap{padding:6px 8px}
.cas-still-id{font-size:10px;font-weight:600;color:var(--dsw-alias-label-secondary);letter-spacing:.4px}
.cas-still-name{margin-left:6px;font-size:12.5px}
.cas-still-desc{display:block;margin-top:2px;font-size:11px;color:var(--dsw-alias-label-secondary);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cas-nostill{padding:8px 10px;font-size:11.5px;color:var(--dsw-alias-label-secondary)}

/* storyboard */
.cas-sb-track{display:flex;height:26px;gap:2px;padding:8px 10px 0}
.cas-sb-seg{display:flex;align-items:center;justify-content:center;border-radius:4px;min-width:14px;flex-basis:0;
  color:#0b0c10;font-size:10px;font-weight:700}
.cas-sb-list{max-height:280px;overflow:auto;padding:8px 10px 10px;display:flex;flex-direction:column;gap:6px}
.cas-sb-shot{display:grid;grid-template-columns:20px 78px minmax(0,1fr);gap:8px;align-items:start}
.cas-sb-idx{width:20px;height:20px;border-radius:5px;display:flex;align-items:center;justify-content:center;
  color:#0b0c10;font-size:10.5px;font-weight:700;margin-top:1px}
.cas-sb-t{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;
  color:var(--dsw-alias-label-secondary);padding-top:2px}
.cas-sb-body{min-width:0}
.cas-sb-scene{display:block;font-size:12.5px}
.cas-sb-text,.cas-sb-cam{display:block;margin-top:2px;font-size:11px;color:var(--dsw-alias-label-secondary)}
.cas-sb-foot{padding:8px 11px;border-top:1px solid var(--dsw-alias-border-l1);font-size:11.5px;
  color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2)}

/* animation player */
.cas-stage{position:relative;background:#05070b;display:flex;align-items:center;justify-content:center}
.cas-stage[data-aspect="16:9"]{aspect-ratio:16/9;max-height:560px}
.cas-stage[data-aspect="9:16"]{height:520px}
.cas-stage[data-aspect="1:1"]{aspect-ratio:1/1;max-height:520px}
.cas-frame{display:block;width:100%;height:100%;border:0;background:#05070b}
.cas-bar{display:flex;align-items:center;gap:9px;padding:8px 11px;border-top:1px solid var(--dsw-alias-border-l1)}
.cas-play-btn{width:28px;height:28px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1);
  background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);display:inline-flex;
  align-items:center;justify-content:center;cursor:pointer;font-size:12px;padding:0;flex-shrink:0;user-select:none}
.cas-play-btn:hover{background:var(--dsw-alias-bg-layer-3);border-color:var(--dsw-alias-border-l2)}
.cas-play-btn:active{transform:scale(0.96)}
.cas-scrub{flex:1;accent-color:var(--dsw-alias-label-secondary);min-width:0}
.cas-t{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;
  color:var(--dsw-alias-label-secondary);white-space:nowrap}
.cas-warn{padding:7px 11px;font-size:11.5px;color:var(--dsw-alias-state-warn-primary);
  border-top:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2)}
.cas-note{padding:8px 11px;font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.cas-score{display:flex;align-items:center;gap:9px;padding:8px 11px;border-top:1px solid var(--dsw-alias-border-l1);
  flex-wrap:wrap}
.cas-score-label{font-size:11.5px;font-weight:600;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.cas-select{height:27px;border-radius:7px;border:1px solid var(--dsw-alias-border-l1);
  background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:11.5px;
  padding:0 6px;outline:none;max-width:190px}
.cas-select:focus{border-color:var(--dsw-alias-border-l2)}
.cas-score-hint{font-size:11px;color:var(--dsw-alias-state-idle-primary);white-space:nowrap}
.cas-path{padding:7px 11px;border-top:1px solid var(--dsw-alias-border-l1);font-size:11px;
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--dsw-alias-state-idle-primary);
  word-break:break-all;background:var(--dsw-alias-bg-layer-2)}
.cas-path-ok{color:var(--dsw-alias-state-success-primary)}
.cas-lightbox{position:fixed;inset:0;z-index:9100;background:rgba(4,5,8,.88);display:flex;align-items:center;
  justify-content:center;padding:32px;cursor:zoom-out}
.cas-lightbox img{max-width:100%;max-height:100%;border-radius:10px;box-shadow:0 20px 60px rgba(0,0,0,.6)}
`;

    const PALETTE = ['#ff8a3d', '#e0457b', '#7b5bff', '#3fd7c0', '#4d6bfe', '#ffc04d'];

    /** Parse one tool call's raw argument text; malformed input degrades to {}. */
    function parseArgs(raw) {
      if (typeof raw !== 'string' || raw === '') return {};
      try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        return {};
      }
    }

    /* __MUSIC_ENGINE__ */

    /**
     * Container preference, best first.
     *
     * Chromium records genuine H.264/AAC MP4 through MediaRecorder, so MP4 is the
     * default; the WebM entries are the fallback for browsers without it.
     */
    const CONTAINERS = [
      { id: 'mp4', label: 'MP4', ext: 'mp4', mimes: ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1.4D401F,mp4a.40.2', 'video/mp4'] },
      { id: 'webm', label: 'WebM', ext: 'webm', mimes: ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'] },
    ];

    /** Which container this browser can actually record, MP4 first. */
    function pickContainer(preferred) {
      const order = preferred === 'webm' ? ['webm', 'mp4'] : ['mp4', 'webm'];
      for (const id of order) {
        const container = CONTAINERS.find((c) => c.id === id);
        const mime = container.mimes.find((m) => (
          typeof MediaRecorder !== 'undefined'
          && MediaRecorder.isTypeSupported
          && MediaRecorder.isTypeSupported(m)
        ));
        if (mime) return { ...container, mime };
      }
      return null;
    }

    function download(blob, name) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }

    /**
     * Drive a detached document frame frame by frame and record it through MediaRecorder.
     * @param opts.music - a preset id, or an AudioBuffer for a user-supplied track.
     *   Any audio is mixed at render time, so video and score start together.
     * @param opts.cuts - cut times in seconds; the score is fitted and accented to them.
     */
    /**
     * Find the canvas an export should record.
     *
     * The frame is loaded asynchronously and a page may create its canvas from script,
     * so this waits for the document and retries instead of failing on a first miss.
     * When several canvases exist the largest is used: decorative or helper canvases
     * are typically small.
     */
    async function resolveCanvas(iframe, timeoutMs = 2000) {
      const started = performance.now();
      let doc;
      let seen = '';

      while (performance.now() - started < timeoutMs) {
        doc = iframe && iframe.contentDocument;
        if (doc && doc.readyState !== 'loading') {
          const canvases = Array.from(doc.querySelectorAll('canvas'));
          if (canvases.length) {
            canvases.sort((a, b) => (b.width * b.height) - (a.width * a.height));
            return canvases[0];
          }
          // Remember what the page does contain, for an actionable failure message.
          const counts = ['div', 'svg', 'video', 'img']
            .map((tag) => [tag, doc.querySelectorAll(tag).length])
            .filter(([, n]) => n > 0)
            .map(([tag, n]) => `${n} 个 <${tag}>`);
          seen = counts.join('、');
        }
        await new Promise((r) => setTimeout(r, 80));
      }

      const win = iframe && iframe.contentWindow;
      const hasRenderAt = win && typeof win.renderAt === 'function';
      throw new Error([
        '画面里没有可录制的 <canvas>',
        seen ? `（页面里找到 ${seen}）` : '',
        hasRenderAt ? '' : '，且没有 window.renderAt',
        '。这个动画是 DOM/CSS 绘制的，无法逐帧录制；需要让 Agent 改为渲染到 <canvas> 的实现。',
      ].filter(Boolean).join(''));
    }

    async function recordAnimation(iframe, opts) {
      const win = iframe && iframe.contentWindow;
      if (!win) throw new Error('预览还没准备好');
      const canvas = await resolveCanvas(iframe);
      if (typeof canvas.captureStream !== 'function') throw new Error('当前浏览器不支持 canvas.captureStream');
      const container = pickContainer(opts.container);
      if (!container) throw new Error('当前浏览器不支持 MediaRecorder 录制');
      const mime = container.mime;

      const stream = canvas.captureStream(0);
      const videoTrack = stream.getVideoTracks()[0];
      const tracks = [videoTrack];

      // Audio, when requested, is mixed into the same recording session so the two
      // tracks share one clock.
      let audioCtx;
      let source;
      let audioBuffer;
      let analyser;
      const wantsMusic = opts.music && opts.music !== 'none';
      if (wantsMusic || opts.musicBuffer) {
        if (opts.musicBuffer) {
          audioBuffer = opts.musicBuffer;
        } else {
          if (opts.onStage) opts.onStage('正在合成配乐…');
          audioBuffer = await renderMusic(opts.music, {
            duration: opts.duration,
            seed: opts.musicSeed,
            cuts: opts.cuts,
          });
        }
        audioCtx = new AudioContext();
        const destination = audioCtx.createMediaStreamDestination();
        source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(destination);
        // Tap the same signal so the export can prove audio actually flowed.
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        tracks.push(...destination.stream.getAudioTracks());
      }

      const recorder = new MediaRecorder(new MediaStream(tracks), { mimeType: mime, videoBitsPerSecond: 16000000 });
      const parts = [];
      recorder.ondataavailable = (e) => { if (e.data && e.data.size) parts.push(e.data); };
      const finished = new Promise((resolve) => {
        recorder.onstop = () => resolve(new Blob(parts, { type: 'video/webm' }));
      });
      recorder.start();

      const fps = Math.max(1, Number(opts.fps) || 30);
      const total = Math.max(1, Math.round(opts.duration * fps));
      const hasRenderAt = typeof win.renderAt === 'function';
      const t0 = performance.now();
      let audioPeak = 0;

      if (source) {
        // A suspended context yields no audio, and without an output device resume()
        // can hang forever — wait briefly, then record anyway rather than stall.
        if (audioCtx.state === 'suspended') {
          await Promise.race([
            audioCtx.resume().catch(() => {}),
            new Promise((r) => setTimeout(r, 400)),
          ]);
        }
        if (audioCtx.state !== 'running' && opts.onStage) opts.onStage('音频未启动，本段可能是无声的');
        source.start(0);
      }

      try {
        for (let i = 0; i < total; i++) {
          if (opts.signal && opts.signal.aborted) break;
          if (hasRenderAt) await win.renderAt(i / fps);
          videoTrack.requestFrame();
          // Sample the score periodically; a peak of zero means the browser never
          // started audio, which would otherwise export as silent video.
          if (analyser && i % 5 === 0) {
            const probe = new Float32Array(analyser.fftSize);
            analyser.getFloatTimeDomainData(probe);
            for (let k = 0; k < probe.length; k++) {
              const v = Math.abs(probe[k]);
              if (v > audioPeak) audioPeak = v;
            }
          }
          if (opts.onProgress) opts.onProgress((i + 1) / total);
          const target = ((i + 1) * 1000) / fps;
          const wait = target - (performance.now() - t0);
          if (wait > 1) await new Promise((r) => setTimeout(r, wait));
        }
      } finally {
        recorder.stop();
      }

      const blob = await finished;
      try { if (source) source.stop(); } catch { /* already ended */ }
      if (audioCtx) void audioCtx.close();
      return { blob, container, hasAudio: tracks.length > 1, audioPeak };
    }

    /** Reference stills the Agent showed for the user to pick a style from. */
    function StillGallery({ stills, note, missing }) {
      const [lightbox, setLightbox] = useState('');
      return h('div', { className: 'cas-card' },
        h('div', { className: 'cas-card-head' },
          h('span', { className: 'cas-dot' }),
          h('span', { className: 'cas-card-title' }, '风格候选'),
          h('span', { className: 'cas-card-meta' }, `${stills.length} 条参考静帧`),
        ),
        note ? h('div', { className: 'cas-note' }, note) : null,
        h('div', { className: 'cas-stills' },
          stills.map((s) => h('button', {
            key: s.id,
            className: 'cas-still',
            onClick: () => setLightbox(`${API}/still/${s.id}`),
            title: '点击放大',
          },
            h('img', { src: `${API}/still/${s.id}`, alt: s.name || s.id, loading: 'lazy' }),
            h('span', { className: 'cas-still-cap' },
              h('span', { className: 'cas-still-id' }, s.id),
              h('span', { className: 'cas-still-name' }, s.name || ''),
              h('span', { className: 'cas-still-desc' }, s.desc || ''),
            ),
          )),
        ),
        (missing && missing.length)
          ? h('div', { className: 'cas-nostill' }, `没有参考静帧：${missing.join('、')}`)
          : null,
        lightbox
          ? h('div', { className: 'cas-lightbox', onClick: () => setLightbox('') },
              h('img', { src: lightbox, alt: '参考静帧' }))
          : null,
      );
    }

    /** The storyboard draft, as a proportional timeline plus a per-shot list. */
    function StoryboardCard({ board }) {
      const shots = board.shots || [];
      const shots2 = shots.length ? shots : [];
      return h('div', { className: 'cas-card' },
        h('div', { className: 'cas-card-head' },
          h('span', { className: 'cas-dot' }),
          h('span', { className: 'cas-card-title' }, `分镜 · ${board.title || ''}`),
          h('span', { className: 'cas-card-meta' },
            [
              board.styleId ? `${board.styleId} ${board.styleName || ''}`.trim() : '',
              `${shots2.length} 场`,
              `${board.duration}s`,
              board.aspect || '',
            ].filter(Boolean).join(' · ')),
        ),
        h('div', { className: 'cas-sb-track' },
          shots2.map((shot, i) => h('span', {
            key: i,
            className: 'cas-sb-seg',
            title: `${shot.start}–${shot.end}s｜${shot.scene}`,
            style: {
              flexGrow: String(Math.max(0.05, Number(shot.end) - Number(shot.start))),
              background: PALETTE[i % PALETTE.length],
            },
          }, h('b', null, String(i + 1))))),
        h('div', { className: 'cas-sb-list' },
          shots2.map((shot, i) => h('div', { key: i, className: 'cas-sb-shot' },
            h('span', { className: 'cas-sb-idx', style: { background: PALETTE[i % PALETTE.length] } }, String(i + 1)),
            h('span', { className: 'cas-sb-t' }, `${Number(shot.start).toFixed(2)}–${Number(shot.end).toFixed(2)}s`),
            h('span', { className: 'cas-sb-body' },
              h('span', { className: 'cas-sb-scene' }, shot.scene || ''),
              shot.text ? h('span', { className: 'cas-sb-text' }, `字幕「${shot.text}」`) : null,
              shot.camera ? h('span', { className: 'cas-sb-cam' }, shot.camera) : null,
            ),
          ))),
        (board.warnings && board.warnings.length)
          ? h('div', { className: 'cas-warn' }, `需要留意：${board.warnings.join('；')}`)
          : null,
        h('div', { className: 'cas-sb-foot' }, '这份分镜只是草稿。确认之后再让 Agent 开始写动画；要改就直接说加场、删场、调时长或改文案。'),
      );
    }

    /**
     * The finished animation: pick a score and a container, scrub any moment, export.
     *
     * Exports are written to the session directory through the Host so the file lands
     * somewhere the user can find; the card shows that absolute path before and after
     * the export, and keeps a browser download as a secondary action.
     */
    function AnimationCard({ anim, cwd, uiWorkspace }) {
      const [scrub, setScrub] = useState(0);
      const [busy, setBusy] = useState('');
      const [progress, setProgress] = useState(0);
      const [note, setNote] = useState('');
      const [savedPath, setSavedPath] = useState('');
      const [targetDir, setTargetDir] = useState('');
      const [customDir, setCustomDir] = useState('');
      const [aspect, setAspect] = useState('16:9');
      const [playing, setPlaying] = useState(false);
      const animFrameRef = useRef(null);
      const scrubRef = useRef(0);
      scrubRef.current = scrub;
      const [music, setMusic] = useState(anim.music || 'none');
      const [custom, setCustom] = useState(null);
      const [customName, setCustomName] = useState('');
      const [stage, setStage] = useState('');
      const [format, setFormat] = useState(null);
      const previewRef = useRef(null);
      const fileRef = useRef(null);
      const frameRef = useRef(null);

      // Only offer containers this browser can actually record.
      const available = useMemo(
        () => CONTAINERS.filter((c) => c.mimes.some((m) => (
          typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)
        ))),
        [],
      );
      const defaultFormat = available.some((c) => c.id === 'mp4') ? 'mp4' : (available[0] && available[0].id) || 'webm';
      const activeFormat = format || defaultFormat;

      const duration = Number(anim.duration) || 8;
      const fps = Number(anim.fps) || 30;
      // Cut points come from the storyboard, so the score lands on the edits.
      const cuts = useMemo(
        () => (Array.isArray(anim.cuts) ? anim.cuts.map(Number).filter((t) => Number.isFinite(t) && t > 0) : []),
        [anim.cuts],
      );

      useEffect(() => () => { if (previewRef.current) previewRef.current.stop(); }, []);

      // Resolve the destination up front so the card can state it before exporting.
      useEffect(() => {
        let cancelled = false;
        const query = cwd ? `?dir=${encodeURIComponent(cwd)}` : '';
        fetch(`${API}/export-dir${query}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => { if (!cancelled && data && data.dir) setTargetDir(data.dir); })
          .catch(() => {});
        return () => { cancelled = true; };
      }, [cwd]);

      const applyScrub = useCallback((value) => {
        setScrub(value);
        const win = frameRef.current && frameRef.current.contentWindow;
        if (win && typeof win.renderAt === 'function') {
          try { win.renderAt(Number(value)); } catch { /* one bad frame must not break the card */ }
        }
      }, []);

      const stopPlayback = useCallback(() => {
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
        setPlaying(false);
      }, []);

      const togglePlay = useCallback(() => {
        if (playing) {
          stopPlayback();
        } else {
          let startT = Number(scrubRef.current);
          if (startT >= duration - 0.05) {
            startT = 0;
            applyScrub(0);
          }
          setPlaying(true);
          const startWallTime = performance.now() - startT * 1000;
          const step = (now) => {
            const curT = (now - startWallTime) / 1000;
            if (curT >= duration) {
              applyScrub(duration);
              setPlaying(false);
              animFrameRef.current = null;
            } else {
              applyScrub(curT);
              animFrameRef.current = requestAnimationFrame(step);
            }
          };
          animFrameRef.current = requestAnimationFrame(step);
        }
      }, [playing, duration, applyScrub, stopPlayback]);

      useEffect(() => () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      }, []);

      const onPreview = useCallback(() => {
        if (previewRef.current) { previewRef.current.stop(); previewRef.current = null; return; }
        const selected = custom ? 'ambient' : music;
        if (!selected || selected === 'none') return;
        previewRef.current = previewMusic(selected, duration);
      }, [music, custom, duration]);

      const onPickFile = useCallback(async (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        try {
          const buffer = await audioFileToBuffer(file, duration);
          setCustom(buffer);
          setCustomName(file.name);
          setNote(`已载入 ${file.name}，导出时会混入`);
        } catch (error) {
          setNote(`音频读取失败：${error.message}`);
        }
      }, [duration]);

      const onPickDirectory = useCallback(async () => {
        if (uiWorkspace && typeof uiWorkspace.pickDirectory === 'function') {
          try {
            const chosen = await uiWorkspace.pickDirectory();
            if (chosen) {
              setCustomDir(chosen);
              setTargetDir(chosen);
              return;
            }
          } catch (e) {
            console.warn('uiWorkspace.pickDirectory error:', e);
          }
        }
        const val = window.prompt('请输入保存视频的目标文件夹路径（绝对路径）：', customDir || targetDir || cwd || '');
        if (val && val.trim()) {
          setCustomDir(val.trim());
          setTargetDir(val.trim());
        }
      }, [uiWorkspace, customDir, targetDir, cwd]);

      const onExport = useCallback(async () => {
        if (busy) return;
        setBusy('export');
        setProgress(0);
        setNote('');
        setSavedPath('');
        setStage('');
        try {
          const { blob, container, hasAudio, audioPeak } = await recordAnimation(frameRef.current, {
            duration,
            fps,
            cuts,
            container: activeFormat,
            music: custom ? 'none' : music,
            musicBuffer: custom || undefined,
            onStage: setStage,
            onProgress: setProgress,
          });
          if (!blob || !blob.size) throw new Error('录制结果为空');

          const wanted = custom || music !== 'none';
          // A zero peak means the browser never started audio: say so instead of
          // handing over a silent file as if it were scored.
          const audioNote = !wanted
            ? '无声'
            : (hasAudio && audioPeak > 1e-4)
              ? '含配乐'
              : '⚠ 配乐未进入录制，这段是无声的';

          const fileName = `${anim.title || anim.id || 'animation'}.${container.ext}`;
          setStage('正在写入工作区…');
          try {
            const query = new URLSearchParams({ name: fileName });
            const exportDir = customDir || cwd;
            if (exportDir) query.set('dir', exportDir);
            const res = await fetch(`${API}/export?${query}`, {
              method: 'POST',
              headers: { 'content-type': blob.type || 'application/octet-stream' },
              body: blob,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
            setSavedPath(data.path);
            setNote(`已导出 ${(blob.size / 1048576).toFixed(1)} MB · ${container.label} · ${audioNote}`);
          } catch (error) {
            // A Host that cannot be reached must not lose the render.
            download(blob, fileName);
            setNote(`已通过浏览器下载 ${fileName} · ${container.label} · ${audioNote}（写入工作区失败：${error.message}）`);
          }
        } catch (error) {
          setNote(`导出失败：${error.message}`);
        } finally {
          setBusy('');
          setStage('');
        }
      }, [busy, duration, fps, music, custom, cuts, anim, activeFormat, customDir, cwd]);

      const scoreOptions = MUSIC_PRESETS;

      return h('div', { className: 'cas-card' },
        h('div', { className: 'cas-card-head' },
          h('span', { className: 'cas-dot' }),
          h('span', { className: 'cas-card-title' }, anim.title || '动画'),
          h('span', { className: 'cas-card-meta' },
            [
              anim.styleId ? `${anim.styleId} ${anim.styleName || ''}`.trim() : '',
              `${duration}s`,
              `${fps}fps`,
              cuts.length ? `卡点 ${cuts.length} 处` : '',
            ].filter(Boolean).join(' · ')),
          h('span', { className: 'cas-grow' }),
          h('button', {
            className: 'cas-btn cas-btn-primary',
            onClick: onExport,
            disabled: !!busy,
          }, busy === 'export' ? (stage || `录制中 ${Math.round(progress * 100)}%`) : '导出视频'),
        ),
        h('div', { className: 'cas-stage', 'data-aspect': aspect },
          h('iframe', {
            ref: frameRef,
            className: 'cas-frame',
            title: anim.title || '动画',
            src: `${API}/animation/${anim.id}`,
            sandbox: 'allow-scripts allow-same-origin',
            onLoad: () => {
              const frame = frameRef.current;
              const doc = frame && frame.contentDocument;
              const win = frame && frame.contentWindow;
              const canvas = doc && doc.querySelector('canvas');
              if (canvas && canvas.width && canvas.height) {
                const ratio = canvas.width / canvas.height;
                setAspect(ratio > 1.2 ? '16:9' : ratio < 0.85 ? '9:16' : '1:1');
              }
              if (win && typeof win.renderAt === 'function') {
                try { win.renderAt(0); } catch { /* ignore */ }
              }
            },
          }),
        ),
        h('div', { className: 'cas-bar' },
          h('button', {
            className: 'cas-play-btn',
            title: playing ? '暂停' : '播放',
            onClick: togglePlay,
          }, playing ? '⏸' : '▶'),
          h('input', {
            className: 'cas-scrub', type: 'range', min: 0, max: duration, step: 0.05,
            value: scrub,
            onChange: (e) => {
              stopPlayback();
              applyScrub(e.target.value);
            },
          }),
          h('span', { className: 'cas-t' }, `${Number(scrub).toFixed(2)}s / ${duration}s`),
          h('button', {
            className: 'cas-play-btn',
            style: { width: '24px', height: '24px', fontSize: '11px' },
            title: '从头播放',
            onClick: () => {
              stopPlayback();
              applyScrub(0);
            },
          }, '↺'),
        ),
        h('div', { className: 'cas-score' },
          h('span', { className: 'cas-score-label' }, '配乐'),
          h('select', {
            className: 'cas-select',
            value: custom ? 'custom' : music,
            onChange: (e) => {
              if (e.target.value === 'custom') { if (fileRef.current) fileRef.current.click(); return; }
              setCustom(null);
              setCustomName('');
              setMusic(e.target.value);
            },
          },
            scoreOptions.map((p) => h('option', { key: p.id, value: p.id }, p.label)),
            h('option', { value: 'custom' }, customName ? `自定义：${customName}` : '自定义音频…'),
          ),
          cuts.length
            ? h('span', { className: 'cas-score-hint' }, `已按 ${cuts.length} 个切点卡拍`)
            : h('span', { className: 'cas-score-hint' }, '先在分镜里定切点，配乐会自动卡拍'),
          h('span', { className: 'cas-grow' }),
          h('button', {
            className: 'cas-btn',
            onClick: onPreview,
            disabled: !!busy || (!custom && music === 'none'),
          }, previewRef.current ? '停止试听' : '试听'),
          h('input', {
            ref: fileRef, type: 'file', accept: 'audio/*',
            style: { display: 'none' }, onChange: onPickFile,
          }),
        ),
        h('div', { className: 'cas-score' },
          h('span', { className: 'cas-score-label' }, '格式'),
          available.length > 1
            ? h('select', {
                className: 'cas-select',
                value: activeFormat,
                onChange: (e) => setFormat(e.target.value),
              }, available.map((c) => h('option', { key: c.id, value: c.id }, c.label)))
            : h('span', { className: 'cas-score-hint' }, available[0] ? available[0].label : '无可用容器'),
          h('span', { className: 'cas-score-hint' },
            available.some((c) => c.id === 'mp4')
              ? 'MP4 为 H.264 + AAC，可直接发微信、剪映、Premiere'
              : '当前浏览器不支持 MP4 录制，可用 ffmpeg 转码'),
        ),
        // State the destination before the export so the file is never a mystery.
        h('div', { className: 'cas-path' },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' } },
            h('span', null, savedPath
              ? h('span', { className: 'cas-path-ok' }, `已保存到 ${savedPath}`)
              : (customDir || targetDir
                  ? `导出目录：${customDir || targetDir}`
                  : '导出目录：会话工作目录下的 code-animation/')),
            h('button', {
              className: 'cas-btn',
              style: { fontSize: '11px', padding: '2px 8px', height: '22px' },
              onClick: onPickDirectory,
              disabled: !!busy,
            }, '📂 选择文件夹…'),
          ),
        ),
        (anim.warnings && anim.warnings.length)
          ? h('div', { className: 'cas-warn' }, `建议检查：${anim.warnings.join('；')}`)
          : null,
        note ? h('div', { className: 'cas-note' }, note) : null,
      );
    }

    /**
     * The Turn-level creation workspace.
     *
     * It renders beneath the closing prose and outside the collapsible Tool group,
     * so the reference stills, the storyboard draft and the finished animation stay
     * visible without expanding the process log.
     */
    function CreationTail(props) {
      const data = props.turn && props.turn.data ? props.turn.data.get(KIND) : undefined;
      const useSessions = props.useSessions;
      const sessionId = props.sessionId;
      // The session's working directory decides where exports land.
      const cwd = useSessions && sessionId
        ? useSessions((state) => state.byId[sessionId]?.cwd)
        : undefined;
      if (!data) return null;

      const hasAnything = (data.stills && data.stills.items.length)
        || data.storyboards.length
        || data.animations.length;
      if (!hasAnything) return null;

      const latestBoard = data.storyboards[data.storyboards.length - 1];
      const latestAnim = data.animations[data.animations.length - 1];

      return h('div', { className: 'cas-tail' },
        h('style', null, CSS),
        data.stills && data.stills.items.length
          ? h(StillGallery, { stills: data.stills.items, note: data.stills.note, missing: data.stills.missing })
          : null,
        latestBoard ? h(StoryboardCard, { board: latestBoard }) : null,
        latestAnim ? h(AnimationCard, { anim: latestAnim, cwd, uiWorkspace: props.uiWorkspace }) : null,
      );
    }

    /**
     * Fold one Turn's creation artifacts out of the session log.
     *
     * Everything is narrowed from the persisted call arguments and result text, so a
     * replayed Session reproduces the same cards with no Host change and no reliance
     * on live plugin memory.
     */
    const creationTurnDefinition = {
      kind: KIND,
      match: (event) => {
        if (event.type === 'turn/start') return { id: String(event.data.turn), role: 'start' };
        if (event.type === 'tool/call') return { id: String(event.data.turn), role: 'update' };
        // Replacement copies stay model-only; only appended results are transcript material.
        if (event.type === 'tool/result' && event.surfaceOp === 'append') {
          return { id: String(event.data.turn), role: 'update' };
        }
        return null;
      },
      start: (_context, match) => ({
        turn: match.event.data.turn,
        calls: new Map(),
        stills: null,
        storyboards: [],
        animations: [],
      }),
      update: (context, match) => {
        const state = context.state;

        if (match.event.type === 'tool/call') {
          const calls = new Map(state.calls);
          calls.set(String(match.event.data.callId), {
            name: match.event.data.name,
            argsRaw: match.event.data.arguments,
          });
          return { ...state, calls };
        }
        if (match.event.type !== 'tool/result') return state;

        const message = match.event.data.message;
        if (message.isError === true) return state;
        const call = state.calls.get(String(message.source.callId));
        if (!call) return state;

        const args = parseArgs(call.argsRaw);
        const text = (message.content || [])
          .filter((block) => block.type === 'text')
          .map((block) => block.text)
          .join('\n');

        if (call.name === 'show_stills') {
          const items = (Array.isArray(args.ids) ? args.ids : []).map((id) => {
            const key = String(id).toUpperCase();
            const match2 = new RegExp(`${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+([^｜\\n]+)`).exec(text);
            return {
              id: key,
              name: match2 ? match2[1].trim() : '',
              desc: (new RegExp(`${key}\\s+[^｜\\n]+｜([^\\n]+)`).exec(text) || [])[1] || '',
            };
          });
          const missing = (new RegExp('没有参考静帧：([^\\n（]+)').exec(text) || [])[1];
          return {
            ...state,
            stills: {
              items,
              note: typeof args.note === 'string' ? args.note : '',
              missing: missing ? missing.split('、').map((s) => s.trim()).filter(Boolean) : [],
            },
          };
        }

        if (call.name === 'save_storyboard') {
          const shots = Array.isArray(args.shots) ? args.shots : [];
          // Shot starts after 0 are the cut points the score will be fitted to.
          const cuts = shots
            .map((s) => Number(s.start))
            .filter((t) => Number.isFinite(t) && t > 0.05)
            .sort((a, b) => a - b);
          return {
            ...state,
            storyboards: [...state.storyboards, {
              title: String(args.title || ''),
              styleId: String(args.style_id || ''),
              styleName: '',
              duration: Number(args.duration) || 0,
              aspect: String(args.aspect || ''),
              music: String(args.music || ''),
              cuts,
              shots: shots.map((s, i) => ({
                index: i + 1,
                start: Number(s.start) || 0,
                end: Number(s.end) || 0,
                scene: String(s.scene || ''),
                text: String(s.text || ''),
                camera: String(s.camera || ''),
              })),
              warnings: (new RegExp('需要留意：([^\\n]+)').exec(text) || [])[1]
                ? (new RegExp('需要留意：([^\\n]+)').exec(text))[1].split('；').map((s) => s.trim()).filter(Boolean)
                : [],
            }],
          };
        }

        if (call.name === 'save_animation') {
          const id = (new RegExp(`${API}/animation/([A-Za-z0-9_-]+)`).exec(text) || [])[1]
            || String(args.storyboard_id || '').replace(/^sb-/, 'anim-');
          if (!id) return state;
          const warn = (new RegExp('^(?:注意|建议检查)：(.+)$', 'm').exec(text) || [])[1];
          // The linked storyboard supplies the cut points, so the score can be fitted
          // to the real edits rather than to a fixed tempo.
          const board = state.storyboards.find((b) => b.id === args.storyboard_id)
            || state.storyboards[state.storyboards.length - 1];
          return {
            ...state,
            animations: [...state.animations, {
              id,
              title: String(args.title || ''),
              styleId: String(args.style_id || ''),
              styleName: '',
              duration: Number(args.duration) || 8,
              fps: Number(args.fps) || 30,
              music: String(args.music || (board && board.music) || ''),
              cuts: board ? board.cuts || [] : [],
              warnings: warn ? warn.split('；').map((s) => s.trim()).filter(Boolean) : [],
            }],
          };
        }

        return state;
      },
      buildLocationData: (context, scope, previous) => {
        if (scope !== 'turn' || context.state === undefined) return null;
        const state = context.state;
        // Reuse the previous value when nothing changed, so the snapshot does not republish.
        if (
          previous && previous.kind === 'turn' && previous.turn === state.turn && previous.key === KIND
          && previous.value.stills === state.stills
          && previous.value.storyboards === state.storyboards
          && previous.value.animations === state.animations
        ) return previous;
        return {
          kind: 'turn',
          turn: state.turn,
          key: KIND,
          value: {
            stills: state.stills,
            storyboards: state.storyboards,
            animations: state.animations,
          },
        };
      },
    };

    return {
      inject: ['slots', 'uiConversation'],
      apply(ctx) {
        ctx.effect(() => ctx.uiConversation.events.register(creationTurnDefinition), 'code-animation-studio:turn-data');

        ctx.slots.inject('conversation.chat.turnTail', () => ctx.slots.register({
          name: 'conversation.chat.turnTail',
          id: 'code-animation-studio',
          order: 30,
          label: '代码动画',
        }, (props) => h(CreationTail, { ...props, uiWorkspace: ctx.get('uiWorkspace') })));
      },
    };
  },
});
