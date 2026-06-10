/**
 * 文本分块工具
 * 目标：把任意长度文本拆分为不超过 maxChunkSize 字符的块，
 *       尽量保留段落/句子语义边界。
 * 输出：Chunk[]，每个 Chunk 形如 { text, sep }
 *       text 为块内容；sep 为「该块末尾与下一块之间」应有的分隔符（'\n\n' / '\n' / ' ' / ''）。
 * 调用方按 parts.map(p => p.text).join(parts.map(p => p.sep).join('')) 或类似方式还原。
 *
 * 简化对外 API：仍提供 chunkText(text) -> string[]，约定：
 *   - 块内完整保留原文（含分隔符），调用方用 parts.join('\n\n') 还原即可
 *   - 若原文分隔符非 \n\n，会有少量冗余空白（不影响可读性，对翻译无伤）
 */

const DEFAULT_MAX_CHUNK_SIZE = 2000;

function isBlank(str) {
  return !str || !str.trim();
}

function hardSplit(text, size) {
  const out = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}

function findCutPoint(text, maxSize) {
  if (text.length <= maxSize) return { at: text.length, sep: '' };

  // 优先级 1：\n\n 之后（包含分隔符到下一段）
  const paraRegex = /\n\s*\n/g;
  let last = { at: -1, sep: '' };
  let m;
  while ((m = paraRegex.exec(text)) !== null) {
    if (m.index + m[0].length <= maxSize) last = { at: m.index + m[0].length, sep: '' };
    else break;
  }
  if (last.at > 0) return last;

  // 优先级 2：句末标点之后
  const sentRegex = /[.!?。！？]/g;
  last = { at: -1, sep: '' };
  while ((m = sentRegex.exec(text)) !== null) {
    if (m.index + 1 <= maxSize) last = { at: m.index + 1, sep: '' };
    else break;
  }
  if (last.at > 0) return last;

  // 优先级 3：单换行之后
  const lineRegex = /\n/g;
  last = { at: -1, sep: '' };
  while ((m = lineRegex.exec(text)) !== null) {
    if (m.index + 1 <= maxSize) last = { at: m.index + 1, sep: '' };
    else break;
  }
  if (last.at > 0) return last;

  // 优先级 4：空格之后
  const spaceRegex = / /g;
  last = { at: -1, sep: '' };
  while ((m = spaceRegex.exec(text)) !== null) {
    if (m.index + 1 <= maxSize) last = { at: m.index + 1, sep: '' };
    else break;
  }
  if (last.at > 0) return last;

  // 兜底硬切
  return { at: maxSize, sep: '' };
}

export function chunkText(text, maxChunkSize = DEFAULT_MAX_CHUNK_SIZE) {
  if (text == null) return [];
  const trimmed = String(text);
  if (!trimmed.trim()) return [];
  if (trimmed.length <= maxChunkSize) return [trimmed];

  const chunks = [];
  let cursor = 0;
  while (cursor < trimmed.length) {
    const remaining = trimmed.slice(cursor);
    const { at } = findCutPoint(remaining, maxChunkSize);
    const piece = remaining.slice(0, at);
    if (!piece) break;
    chunks.push(piece);
    cursor += at;
    if (at === 0) break;
  }
  return chunks.length ? chunks : [trimmed];
}

export function estimateChunkCount(text, maxChunkSize = DEFAULT_MAX_CHUNK_SIZE) {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / maxChunkSize));
}

export const CHUNKER_DEFAULTS = {
  maxChunkSize: DEFAULT_MAX_CHUNK_SIZE,
};