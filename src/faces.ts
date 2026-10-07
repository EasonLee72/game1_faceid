export interface Face {
  readonly url: string;
  readonly name: string;
}

/** '/face/黃仁勳.jpg' → '黃仁勳' */
export function nameFromPath(path: string): string {
  const file = path.slice(path.lastIndexOf('/') + 1);
  const dot = file.lastIndexOf('.');
  return dot > 0 ? file.slice(0, dot) : file;
}

/** Fisher–Yates，回傳新陣列；random 可注入以便測試 */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/** 'a.JPG' → 'image/jpeg'；不支援的副檔名回傳 null */
export function mimeOf(file: string): string | null {
  const dot = file.lastIndexOf('.');
  return dot < 0 ? null : (MIME[file.slice(dot + 1).toLowerCase()] ?? null);
}
