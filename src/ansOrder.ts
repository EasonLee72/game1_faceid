// server/ 也會載入這個檔，相對匯入需帶副檔名
import { mimeOf, type Face } from './faces.ts';

export const ANS_ORDER_FILE = 'ans_order.md';

export interface MissingEntry {
  /** 清單中的第幾題（1-based，只算清單行） */
  readonly position: number;
  readonly name: string;
}

export interface AnsOrder {
  /** 出題順序；null = 沒有可用的清單，改用隨機洗牌 */
  readonly order: Face[] | null;
  readonly missing: readonly MissingEntry[];
}

const LIST_ITEM = /^\s*\d+\.\s*(.+?)\s*$/;

/** 'Kenny.png' → 'Kenny'；'Dr. Strange' 不是圖片副檔名，原樣保留 */
function stripImageExt(entry: string): string {
  const dot = entry.lastIndexOf('.');
  return dot > 0 && mimeOf(entry) !== null ? entry.slice(0, dot) : entry;
}

/** 只讀有序清單行（`1. 名字`），依行的先後決定出題順序 */
export function parseAnsOrder(markdown: string, faces: readonly Face[]): AnsOrder {
  const byName = new Map(faces.map((f) => [f.name, f]));
  const order: Face[] = [];
  const missing: MissingEntry[] = [];
  let position = 0;

  for (const line of markdown.split(/\r?\n/)) {
    const match = LIST_ITEM.exec(line);
    if (!match) continue;
    position++;
    const name = stripImageExt(match[1]!);
    const face = byName.get(name);
    if (face) order.push(face);
    else missing.push({ position, name });
  }

  return { order: order.length > 0 ? order : null, missing };
}

export function ansOrderWarning({ order, missing }: AnsOrder): string {
  if (missing.length === 0) return '';
  const list = missing.map((m) => `第 ${m.position} 題「${m.name}」`).join('、');
  const consequence = order ? '已跳過，之後的題號會往前移' : '改成隨機出題';
  return `${ANS_ORDER_FILE} ${list}找不到照片，${consequence}`;
}

export function formatAnsOrder(files: readonly string[]): string {
  const lines = files.map((file, i) => `${i + 1}. ${file}`);
  return `# 答案順序\n\n${lines.join('\n')}\n`;
}

/** 本機時間 → '10/07 22:31' */
function formatUpdated(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 管理頁顯示的檔案狀態；updatedMs 為 null 代表檔案不存在 */
export function ansOrderStatus(updatedMs: number | null, { order, missing }: AnsOrder): string {
  if (updatedMs === null) return `還沒有 ${ANS_ORDER_FILE}，遊戲會隨機出題`;
  const updated = formatUpdated(updatedMs);
  if (order)
    return `${ANS_ORDER_FILE} 共 ${order.length} 題，更新於 ${updated}，遊戲照這個順序出題`;
  if (missing.length > 0) {
    return `${ANS_ORDER_FILE} 的題目都找不到照片（更新於 ${updated}），遊戲會隨機出題`;
  }
  return `${ANS_ORDER_FILE} 是空的（更新於 ${updated}），遊戲會隨機出題`;
}
