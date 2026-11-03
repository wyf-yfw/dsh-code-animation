/**
 * Creation-mode tools: the conversation itself writes the animation.
 *
 * `list_styles` searches the 341-entry catalog; `save_animation` takes the HTML the
 * model wrote, stores it, and returns a card the conversation renders as a live,
 * scrubbable animation. No second model call is involved — the Agent that already
 * holds the user's context is the one that authors the code.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { OUTPUT_DIR, catalog, describe, searchStyles, styleById } from './data.js';

const MAX_HTML_BYTES = 2 * 1024 * 1024;

/** Strip the wrappers a model habitually adds around a file body. */
function stripWrappers(text) {
  let body = String(text || '').trim();
  const fenced = /```(?:html|HTML)?\s*([\s\S]*?)```/.exec(body);
  if (fenced && fenced[1].includes('<')) body = fenced[1].trim();
  const start = body.search(/<!DOCTYPE html>|<html[\s>]/i);
  if (start > 0) body = body.slice(start);
  const end = body.toLowerCase().lastIndexOf('</html>');
  if (end >= 0) body = body.slice(0, end + '</html>'.length);
  return body.trim();
}

/** Validate the contract the preview and exporter both rely on. */
function inspect(html) {
  const problems = [];
  if (!/<html[\s>]/i.test(html)) problems.push('缺少 <html> 根元素');
  if (!/<canvas[\s>]/i.test(html)) problems.push('缺少 <canvas>（录制需要 canvas.captureStream）');
  if (!/window\.renderAt\s*=/.test(html)) problems.push('缺少 window.renderAt = function(t)');
  if (/Math\.random\s*\(/.test(html)) problems.push('使用了 Math.random()，必须改为固定种子随机');
  if (/requestAnimationFrame\s*\(/.test(html)) problems.push('使用了 requestAnimationFrame 自播，导出需要关闭它');
  if (/<script[^>]+\bsrc=/i.test(html)) problems.push('引用了外部脚本');
  if (/<img[^>]+\bsrc\s*=\s*["']https?:/i.test(html)) problems.push('引用了外部图片');
  if (/<link[^>]+stylesheet/i.test(html)) problems.push('引用了外部样式表');
  return problems;
}

function slug(input) {
  const base = String(input || 'animation')
    .toLowerCase()
    .replace(/[^\w-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return base || 'animation';
}

/**
 * Register the creation tools on the given registry.
 * @param tools - the `ctx.tools` registry of the realm that should own these tools.
 */
export function registerCreationTools(tools) {
  const disposers = [];

  disposers.push(tools.register({
    name: 'list_styles',
    description: [
      '在 341 种代码动画风格里检索。用户说出气质、题材或编号时先调用它，再按选中的风格动手做动画。',
      '返回每条风格的编号、名称、系列、适用题材、是否有参考静帧，以及完整风格提示词（prompt）。',
      '选择规则：用户给了编号就精确匹配；只描述气质时挑 2–3 条最匹配的说明理由，用户已要求直接做就选最匹配的一条继续。',
      '不要把多条风格的约束机械叠加：主画风、运动方式、版式各选一条，各自负责一件事。',
    ].join('\n'),
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '关键词、风格名或编号，如「水墨」「B3」「赛博」；留空则按系列浏览。' },
        series: {
          type: 'string',
          description: '限定系列：AG（代码样片）、M（动态风格）、K（卡通画风）、Z（中国风）、H（现成版式）、L（Lemo-Opuscar）、V（mg-styles-15）、X（code-video）、R（照参考学来的）、O（奥斯卡 98 部）。',
        },
        limit: { type: 'integer', description: '返回条数，默认 12，最多 50。', minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          series: { type: 'array', items: { type: 'object', additionalProperties: true } },
          styles: { type: 'array', items: { type: 'object', additionalProperties: true } },
        },
        required: ['total', 'styles'],
        additionalProperties: false,
      },
      render: (_args, value) => [{
        type: 'text',
        text: value.styles.length
          ? value.styles.map((s) => `${s.id} ${s.name}（${s.seriesName}）｜${s.description}${s.hasStill ? '｜有参考静帧' : ''}`).join('\n')
          : '没有匹配的风格',
      }],
      presentationMeta: (_args, value) => ({ styles: value.styles }),
    },
    async execute(args) {
      const { styles, series } = catalog();
      const found = searchStyles(args?.query, { series: args?.series, limit: args?.limit });
      return {
        total: styles.length,
        series: Object.entries(series).map(([id, name]) => ({ id, name })),
        styles: found.map(describe),
      };
    },
  }));

  disposers.push(tools.register({
    name: 'get_style',
    description: '读取某一条风格的完整提示词与参考静帧信息。动手做动画前调用它拿到该风格的完整规范。',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string', description: '风格编号，如 B3、A1、O96。' } },
      required: ['id'],
      additionalProperties: false,
    },
    output: {
      // An empty string stands for "no still": the schema dialect here accepts only
      // single-type nodes, so a nullable union is not available.
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          prompt: { type: 'string' },
          description: { type: 'string' },
          stillUrl: { type: 'string', description: '参考静帧地址；没有静帧时是空字符串。' },
          series: { type: 'string' },
          seriesName: { type: 'string' },
        },
        required: ['id', 'name', 'prompt'],
        additionalProperties: true,
      },
      render: (_args, value) => [{
        type: 'text',
        text: `${value.id} ${value.name}\n\n${value.prompt || value.description || ''}`,
      }],
      presentationMeta: (_args, value) => value,
    },
    async execute(args) {
      const style = styleById(args?.id);
      if (!style) {
        const near = searchStyles(args?.id, { limit: 3 }).map((s) => s.id);
        throw new Error(`没有编号为 ${args?.id} 的风格${near.length ? `，相近的有：${near.join('、')}` : ''}`);
      }
      return describe(style);
    },
  }));

  disposers.push(tools.register({
    name: 'save_animation',
    description: [
      '把一段动画 HTML 存到工作区，并在对话里渲染成可播放、可导出视频的动画卡片。',
      'HTML 必须满足：单个完整文件、只含原生 HTML/JS/Canvas、不引用任何外部库或图片、实现 window.renderAt(t)（t 为秒，同一 t 渲染同一帧）、使用固定种子随机、不启用 requestAnimationFrame 自播。',
      '生成后用 renderAt 检查首帧、中段、尾帧，确认不是黑屏或静止。',
    ].join('\n'),
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '这个动画叫什么，用于卡片标题和文件名。' },
        style_id: { type: 'string', description: '采用的风格编号，如 B3。会显示在卡片上。' },
        duration: { type: 'number', description: '片长（秒），用于预览进度条与导出。默认 8。' },
        fps: { type: 'integer', description: '帧率，默认 30。' },
        html: { type: 'string', description: '完整的动画 HTML 文件正文。' },
      },
      required: ['title', 'html'],
      additionalProperties: false,
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          styleId: { type: 'string' },
          styleName: { type: 'string' },
          duration: { type: 'number' },
          fps: { type: 'integer' },
          url: { type: 'string' },
          bytes: { type: 'integer' },
          warnings: { type: 'array', items: { type: 'string' } },
        },
        required: ['id', 'title', 'url', 'duration', 'fps'],
        additionalProperties: false,
      },
      render: (_args, value) => [{
        type: 'text',
        text: [
          `已生成动画「${value.title}」${value.styleId ? `（${value.styleId} ${value.styleName || ''}）` : ''}`,
          `片长 ${value.duration}s · ${value.fps}fps · ${(value.bytes / 1024).toFixed(0)} KB`,
          value.warnings.length ? `注意：${value.warnings.join('；')}` : '',
          '对话里已显示预览卡片，可拖动查看任意时刻，也可以直接导出视频。',
        ].filter(Boolean).join('\n'),
      }],
      presentationMeta: (_args, value) => value,
    },
    async execute(args) {
      const html = stripWrappers(args?.html);
      if (!html) throw new Error('html 为空');
      const bytes = Buffer.byteLength(html, 'utf8');
      if (bytes > MAX_HTML_BYTES) throw new Error(`HTML 过大（${(bytes / 1048576).toFixed(1)} MB），上限 2 MB`);

      const problems = inspect(html);
      const style = args.style_id ? styleById(args.style_id) : undefined;
      const duration = Math.max(1, Math.min(Number(args?.duration) || 8, 120));
      const fps = Math.max(1, Math.min(Number(args?.fps) || 30, 60));
      const id = `anim-${slug(args?.title)}-${Date.now().toString(36)}`;

      mkdirSync(OUTPUT_DIR, { recursive: true });
      writeFileSync(join(OUTPUT_DIR, `${id}.html`), html, 'utf8');

      return {
        id,
        title: String(args?.title || '动画'),
        styleId: style ? style.id : '',
        styleName: style ? style.name : '',
        duration,
        fps,
        url: `/code-animation-api/animation/${id}`,
        bytes,
        warnings: problems,
      };
    },
  }));

  return () => {
    for (const dispose of disposers.reverse()) {
      try { dispose(); } catch { /* one bad disposer must not block the rest */ }
    }
  };
}
