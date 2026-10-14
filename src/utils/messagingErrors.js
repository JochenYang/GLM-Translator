/**
 * MV3 消息通道错误的分类。
 *
 * 连接类错误并不都能靠重试解决。把它们混在一起重试，会把真实原因换成一句
 * 笼统文案（"翻译服务暂未就绪"），用户既看不出是接口问题还是扩展没起来。
 * 这里把两类分开：
 * - 上下文失效与后台脚本加载失败：重试永远不会成功，必须直接给恢复动作；
 * - 唤醒竞态与请求中途被回收：换一次唤醒通常就能过。
 */

export const MESSAGING_ERROR_KIND = {
  /** 扩展被重新加载或更新后，页面里残留的旧上下文 */
  CONTEXT_INVALIDATED: "context-invalidated",
  /** 后台 Service Worker 脚本加载失败（chrome://extensions 报 Failed to load the script） */
  SCRIPT_LOAD_FAILED: "script-load-failed",
  /** 后台暂时联系不上：唤醒竞态，或处理请求时被回收，重试可能恢复 */
  RETRYABLE: "retryable",
  /** 与消息通道无关的错误，调用方应原样上抛 */
  OTHER: "other",
};

// 顺序即优先级：先匹配到哪个片段就归哪一类
const PATTERNS = [
  [MESSAGING_ERROR_KIND.CONTEXT_INVALIDATED, "Extension context invalidated"],
  [MESSAGING_ERROR_KIND.SCRIPT_LOAD_FAILED, "Failed to load the script"],
  [MESSAGING_ERROR_KIND.RETRYABLE, "Could not establish connection"],
  [MESSAGING_ERROR_KIND.RETRYABLE, "Receiving end does not exist"],
  // Service Worker 处理请求时被回收，Chrome 给出的两种措辞
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
