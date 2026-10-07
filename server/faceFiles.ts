import { copyFile, mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { mimeOf, nameFromPath } from '../src/faces.ts';

export { mimeOf };

export interface FaceEntry {
  readonly file: string;
  readonly name: string;
  readonly mtimeMs: number;
}

export type SaveResult = { ok: true } | { ok: false; reason: 'invalid' | 'not-found' };

export const BACKUP_DIR = '.backup';

const isFaceFile = (file: string) =>
  file !== '' && !file.startsWith('.') && !/[\\/]/.test(file) && mimeOf(file) !== null;

/** 只接受 face/ 底下、允許副檔名的單層檔名；不合法回傳 null */
export function resolveFacePath(faceDir: string, file: string): string | null {
  return isFaceFile(file) ? join(faceDir, file) : null;
}

/** '黃仁勳.jpg' + 時間 → '黃仁勳.20261007-120301.jpg'（本地時間） */
export function backupName(file: string, now: Date): string {
  const ext = extname(file);
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp =
    `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}` +
    `-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
  return `${file.slice(0, -ext.length)}.${stamp}${ext}`;
}

export async function listFaces(faceDir: string): Promise<FaceEntry[]> {
  const entries = await readdir(faceDir, { withFileTypes: true });
  const faces = await Promise.all(
    entries
      .filter((e) => e.isFile() && isFaceFile(e.name))
      .map(async (e) => ({
        file: e.name,
        name: nameFromPath(e.name),
        mtimeMs: (await stat(join(faceDir, e.name))).mtimeMs,
      })),
  );
  return faces.sort((a, b) => a.file.localeCompare(b.file));
}

/** 先把原檔備份到 .backup/，再覆蓋 */
export async function saveFace(
  faceDir: string,
  file: string,
  data: Uint8Array,
  now: Date = new Date(),
): Promise<SaveResult> {
  const target = resolveFacePath(faceDir, file);
  if (!target) return { ok: false, reason: 'invalid' };
  try {
    if (!(await stat(target)).isFile()) return { ok: false, reason: 'not-found' };
  } catch {
    return { ok: false, reason: 'not-found' };
  }

  const backupDir = join(faceDir, BACKUP_DIR);
  await mkdir(backupDir, { recursive: true });
  await copyFile(target, join(backupDir, backupName(file, now)));
  await writeFile(target, data);
  return { ok: true };
}
