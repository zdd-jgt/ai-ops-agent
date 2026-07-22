/**
 * 采样逻辑。
 *
 * 根据 `sampleRate` 决定事件是否应被采集。采样为确定性逻辑，
 * 同一 session 内相同类型事件采样结果一致（使用 session_id +
 * event_type 作为确定性种子）。
 */

/**
 * 基于 session 和 event_type 的确定性采样。
 *
 * @param sessionId - 当前匿名会话 ID
 * @param eventType - 事件类型字符串
 * @param sampleRate - 采样率 0-1
 * @returns 是否应采集此事件
 */
export function shouldSample(
  sessionId: string,
  eventType: string,
  sampleRate: number,
): boolean {
  if (sampleRate >= 1) return true;
  if (sampleRate <= 0) return false;

  // 使用简单的 DJB2 哈希产生 0-1 之间的确定性值
  const hash = djb2(`${sessionId}:${eventType}`);
  const normalized = (hash >>> 0) / 0xffffffff; // 0-1
  return normalized < sampleRate;
}

/** DJB2 哈希（32-bit）。 */
function djb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}
