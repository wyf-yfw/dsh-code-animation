window.__ModuleLoader__.load({
  id: '@local/dsh-code-animation',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useMemo, useRef, useCallback } = React;

    const API = '/code-animation-api';

    const CSS = `
.cas-card{margin:6px 0;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;overflow:hidden;
  background:var(--dsw-alias-bg-layer-1);font:13px/1.5 system-ui,"PingFang SC","Microsoft YaHei",sans-serif;
  color:var(--dsw-alias-label-primary);max-width:760px}
.cas-card-head{display:flex;align-items:center;gap:8px;padding:9px 11px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.cas-dot{width:7px;height:7px;border-radius:2px;background:linear-gradient(135deg,#ff8a3d,#e0457b);flex:none}
.cas-card-title{font-weight:600;font-size:12.5px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cas-card-meta{font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.cas-grow{flex:1}
.cas-card-body{padding:0}
.cas-stage{position:relative;background:#05070b;display:flex;align-items:center;justify-content:center}
.cas-stage[data-aspect="16:9"]{aspect-ratio:16/9}
.cas-stage[data-aspect="9:16"]{height:440px}
.cas-stage[data-aspect="1:1"]{aspect-ratio:1/1;max-height:440px}
.cas-frame{display:block;width:100%;height:100%;border:0;background:#05070b}
.cas-bar{display:flex;align-items:center;gap:9px;padding:8px 11px;border-top:1px solid var(--dsw-alias-border-l1)}
.cas-scrub{flex:1;accent-color:var(--dsw-alias-label-secondary);min-width:0}
.cas-t{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.cas-btn{height:27px;padding:0 11px;border-radius:7px;font:600 11.5px/1 inherit;cursor:pointer;white-space:nowrap;
  border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.cas-btn:hover{border-color:var(--dsw-alias-border-l2)}
.cas-btn:disabled{opacity:.5;cursor:not-allowed}
.cas-btn-primary{background:var(--dsw-alias-label-primary);border-color:transparent;color:var(--dsw-alias-bg-base)}
.cas-warn{padding:7px 11px;font-size:11.5px;color:var(--dsw-alias-state-warn-primary);
  border-top:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2)}
.cas-err{padding:8px 11px;font-size:11.5px;color:var(--dsw-alias-state-error-primary)}
.cas-sim{display:grid;grid-template-columns:66px minmax(0,1fr);gap:10px;width:100%;text-align:left;padding:7px;
  border-radius:8px;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-primary);
  cursor:pointer;font:inherit}
.cas-sim:hover{background:var(--dsw-alias-bg-layer-2)}
.cas-sim-thumb{width:66px;height:37px;border-radius:5px;overflow:hidden;background:var(--dsw-alias-bg-layer-2);display:block}
.cas-sim-thumb img{width:100%;height:100%;object-fit:cover;display:block}
.cas-sim-none{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:9px;
  color:var(--dsw-alias-state-idle-primary)}
.cas-sim-id{font-size:10px;font-weight:600;color:var(--dsw-alias-label-secondary);letter-spacing:.4px}
.cas-sim-name{margin-left:6px;font-size:12.5px}
.cas-sim-desc{display:block;margin-top:1px;font-size:11px;color:var(--dsw-alias-label-secondary);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cas-sim-list{max-height:340px;overflow:auto;padding:6px}
.cas-lightbox{position:fixed;inset:0;z-index:9100;background:rgba(4,5,8,.86);display:flex;align-items:center;
  justify-content:center;padding:32px;cursor:zoom-out}
.cas-lightbox img{max-width:100%;max-height:100%;border-radius:10px;box-shadow:0 20px 60px rgba(0,0,0,.6)}
`;

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

    /** Drive a detached document frame by frame and record it through MediaRecorder. */
    async function recordAnimation(iframe, opts) {
      const win = iframe && iframe.contentWindow;
      const doc = iframe && iframe.contentDocument;
      if (!win || !doc) throw new Error('预览还没准备好');
      const canvas = doc.querySelector('canvas');
      if (!canvas) throw new Error('画面里没有 <canvas>，无法逐帧录制');
      if (typeof canvas.captureStream !== 'function') throw new Error('当前浏览器不支持 canvas.captureStream');
      const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
        .find((m) => window.MediaRecorder && window.MediaRecorder.isTypeSupported && window.MediaRecorder.isTypeSupported(m));
      if (!mime) throw new Error('当前浏览器不支持 MediaRecorder 录制');

      // Detach the canvas from the visible document so capture is not throttled by
      // the tab's compositor, and drive renderAt deterministically.
      const stream = canvas.captureStream(0);
      const track = stream.getVideoTracks()[0];
      const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 16000000 });
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
      for (let i = 0; i < total; i++) {
        if (opts.signal && opts.signal.aborted) break;
        if (hasRenderAt) await win.renderAt(i / fps);
        track.requestFrame();
        if (opts.onProgress) opts.onProgress((i + 1) / total);
        const target = ((i + 1) * 1000) / fps;
        const wait = target - (performance.now() - t0);
        if (wait > 1) await new Promise((r) => setTimeout(r, wait));
      }
      recorder.stop();
      return finished;
    }

    /** The live animation card: scrub any moment, then export it as video. */
    function AnimationCard(props) {
      const meta = props.meta || {};
      const [scrub, setScrub] = useState(0);
      const [busy, setBusy] = useState('');
      const [progress, setProgress] = useState(0);
      const [note, setNote] = useState('');
      const [aspect, setAspect] = useState('16:9');
      const frameRef = useRef(null);

      const duration = Number(meta.duration) || 8;
      const fps = Number(meta.fps) || 30;
      const url = meta.url || '';

      const applyScrub = useCallback((value) => {
        setScrub(value);
        const win = frameRef.current && frameRef.current.contentWindow;
        if (win && typeof win.renderAt === 'function') {
          try { win.renderAt(Number(value)); } catch { /* one bad frame must not break the card */ }
        }
      }, []);

      const onExport = useCallback(async () => {
        if (busy) return;
        setBusy('export');
        setProgress(0);
        setNote('');
        try {
          const blob = await recordAnimation(frameRef.current, {
            duration,
            fps,
            onProgress: setProgress,
          });
          if (!blob || !blob.size) throw new Error('录制结果为空');
          download(blob, `${meta.title || meta.id || 'animation'}.webm`);
          setNote(`已导出 ${(blob.size / 1048576).toFixed(1)} MB`);
        } catch (error) {
          setNote(`导出失败：${error.message}`);
        } finally {
          setBusy('');
        }
      }, [busy, duration, fps, meta]);

      return h('div', { className: 'cas-card' },
        h('div', { className: 'cas-card-head' },
          h('span', { className: 'cas-dot' }),
          h('span', { className: 'cas-card-title' }, meta.title || '动画'),
          h('span', { className: 'cas-card-meta' },
            [meta.styleId ? `${meta.styleId} ${meta.styleName || ''}`.trim() : '', `${duration}s`, `${fps}fps`]
              .filter(Boolean).join(' · ')),
          h('span', { className: 'cas-grow' }),
          h('button', {
            className: 'cas-btn cas-btn-primary',
            onClick: onExport,
            disabled: !!busy,
          }, busy === 'export' ? `录制中 ${Math.round(progress * 100)}%` : '导出视频'),
        ),
        h('div', { className: 'cas-card-body' },
          h('div', { className: 'cas-stage', 'data-aspect': aspect },
            h('iframe', {
              ref: frameRef,
              className: 'cas-frame',
              title: meta.title || '动画',
              src: url,
              sandbox: 'allow-scripts allow-same-origin',
              onLoad: () => {
                const win = frameRef.current && frameRef.current.contentWindow;
                const doc = frameRef.current && frameRef.current.contentDocument;
                if (doc) {
                  const c = doc.querySelector('canvas');
                  if (c && c.width && c.height) {
                    const ratio = c.width / c.height;
                    setAspect(ratio > 1.2 ? '16:9' : ratio < 0.85 ? '9:16' : '1:1');
                  }
                }
                if (win && typeof win.renderAt === 'function') {
                  try { win.renderAt(0); } catch { /* ignore */ }
                }
              },
            }),
          ),
          h('div', { className: 'cas-bar' },
            h('input', {
              className: 'cas-scrub', type: 'range', min: 0, max: duration, step: 0.05,
              value: scrub, onChange: (e) => applyScrub(e.target.value),
            }),
            h('span', { className: 'cas-t' }, `${Number(scrub).toFixed(2)}s / ${duration}s`),
          ),
        ),
        (meta.warnings && meta.warnings.length)
          ? h('div', { className: 'cas-warn' }, `建议检查：${meta.warnings.join('；')}`)
          : null,
        note ? h('div', { className: 'cas-err' }, note) : null,
      );
    }

    /** Catalog results rendered as a browsable list with reference stills. */
    function StylesCard(props) {
      const styles = (props.meta && props.meta.styles) || [];
      const [lightbox, setLightbox] = useState('');
      if (!styles.length) return h('div', { className: 'cas-err' }, '没有匹配的风格');
      return h('div', { className: 'cas-card' },
        h('style', null, CSS),
        h('div', { className: 'cas-card-head' },
          h('span', { className: 'cas-dot' }),
          h('span', { className: 'cas-card-title' }, '风格检索结果'),
          h('span', { className: 'cas-card-meta' }, `${styles.length} 条`),
        ),
        h('div', { className: 'cas-sim-list' },
          styles.map((s) => h('button', {
            key: s.id,
            className: 'cas-sim',
            onClick: () => { if (s.stillUrl) setLightbox(s.stillUrl); },
            title: s.hasStill ? '点击放大参考静帧' : '这个风格没有参考静帧',
          },
            h('span', { className: 'cas-sim-thumb' },
              s.hasStill
                ? h('img', { src: `${API}/still/${s.id}`, alt: '', loading: 'lazy' })
                : h('span', { className: 'cas-sim-none' }, '无静帧'),
            ),
            h('span', null,
              h('span', { className: 'cas-sim-id' }, s.id),
              h('span', { className: 'cas-sim-name' }, s.name || ''),
              h('span', { className: 'cas-sim-desc' }, s.description || ''),
            ),
          )),
        ),
        lightbox
          ? h('div', { className: 'cas-lightbox', onClick: () => setLightbox('') },
              h('img', { src: lightbox, alt: '参考静帧' }))
          : null,
      );
    }

    function card(kind, render) {
      return function ToolView(props) {
        const block = props.block;
        const phase = props.phase;
        if (phase !== 'result') {
          return h('div', { className: 'cas-card' },
            h('style', null, CSS),
            h('div', { className: 'cas-card-head' },
              h('span', { className: 'cas-dot' }),
              h('span', { className: 'cas-card-title' }, kind === 'save' ? '正在生成动画…' : '正在检索风格…'),
            ),
          );
        }
        const meta = block.meta || {};
        if (block.isError) {
          const text = (block.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
          return h('div', { className: 'cas-card' },
            h('style', null, CSS),
            h('div', { className: 'cas-card-head' },
              h('span', { className: 'cas-dot' }),
              h('span', { className: 'cas-card-title' }, kind === 'save' ? '动画生成失败' : '风格检索失败'),
            ),
            h('div', { className: 'cas-err' }, block.error?.reason || text || '未知错误'),
          );
        }
        return render(meta);
      };
    }

    const SaveAnimationView = card('save', (meta) => h('div', null,
      h('style', null, CSS),
      h(AnimationCard, { meta }),
    ));
    const ListStylesView = card('list', (meta) => h(StylesCard, { meta }));

    return {
      inject: ['slots'],
      apply(ctx) {
        const style = h('style', null, CSS);
        ctx.slots.inject('tool.call.toolview', function* () {
          yield ctx.slots.register({ name: 'tool.call.toolview', key: 'save_animation' }, SaveAnimationView);
          yield ctx.slots.register({ name: 'tool.call.toolview', key: 'list_styles' }, ListStylesView);
        });
        // Keep the stylesheet alive with the plugin rather than with one card.
        ctx.effect(() => {
          void style;
          return () => {};
        }, 'code-animation-studio:styles');
      },
    };
  },
});
