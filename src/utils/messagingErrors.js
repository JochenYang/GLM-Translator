/**
 * MV3 消息通道错误的分类。
 *
 * 结论来自实测：Chrome 会把消息暂存到 worker 启动后再投递（注入 6s 忙等仍能成功），
 * 所以 "Receiving end does not exist" 不是唤醒太慢的竞态，而是后台脚本根本没注册上
 * 监听器——重试再多次也不会成功，只能让用户重新加载扩展。
 * 只有 "message channel closed before a response was received" 才是处理中被回收，
 * 换一次唤醒可以恢复。
 *
 * 把这几类混在一起重试，会把真实原因换成一句笼统文案（"翻译服务暂未就绪"），
 * 用户看不出是翻译接口坏了还是扩展没起来。
 */

export const MESSAGING_ERROR_KIND = {
  /** 扩展被重新加载或更新后，页面里残留的旧上下文 */
  CONTEXT_INVALIDATED: "context-invalidated",
  /** 后台 Service Worker 脚本加载失败（chrome://extensions 报 Failed to load the script） */
  SCRIPT_LOAD_FAILED: "script-load-failed",
  /** 后台没有监听者：脚本没能启动，重试无效，需要重新加载扩展 */
  WORKER_UNAVAILABLE: "worker-unavailable",
  /** 处理请求时后台被回收：换一次唤醒通常就能过 */
  RETRYABLE: "retryable",
  /** 与消息通道无关的错误，调用方应原样上抛 */
  OTHER: "other",
};

// 顺序即优先级：先匹配到哪个片段就归哪一类
const PATTERNS = [
  [MESSAGING_ERROR_KIND.CONTEXT_INVALIDATED, "Extension context invalidated"],
  [MESSAGING_ERROR_KIND.SCRIPT_LOAD_FAILED, "Failed to load the script"],
  [MESSAGING_ERROR_KIND.WORKER_UNAVAILABLE, "Receiving end does not exist"],
  [MESSAGING_ERROR_KIND.WORKER_UNAVAILABLE, "Could not establish connection"],
  [
    MESSAGING_ERROR_KIND.RETRYABLE,
    "message channel closed before a response was received",
  ],
  [MESSAGING_ERROR_KIND.RETRYABLE, "A listener indicated an asynchronous response"],
];

/**
 * @param {unknown} error 抛出的错误对象，或其 message 字符串
 * @returns {string} MESSAGING_ERROR_KIND 中的一种
 */
export function classifyMessagingError(error) {
  const message = typeof error === "string" ? error : error?.message || "";
  for (const [kind, fragment] of PATTERNS) {
    if (message.includes(fragment)) return kind;
  }
  return MESSAGING_ERROR_KIND.OTHER;
}
