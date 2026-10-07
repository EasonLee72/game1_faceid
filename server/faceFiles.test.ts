import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BACKUP_DIR, backupName, listFaces, mimeOf, resolveFacePath, saveFace } from './faceFiles';

describe('resolveFacePath', () => {
  it('合法檔名回傳 face/ 底下的完整路徑', () => {
    expect(resolveFacePath('/p/face', '黃仁勳.jpg')).toBe(join('/p/face', '黃仁勳.jpg'));
    expect(resolveFacePath('/p/face', 'A.JPG')).toBe(join('/p/face', 'A.JPG'));
  });

  it.each(['../a.jpg', 'a/b.jpg', 'a\\b.jpg', '..', '.backup', '.hidden.jpg', 'a.txt', 'a', ''])(
    '拒絕不合法檔名：%s',
    (file) => {
      expect(resolveFacePath('/p/face', file)).toBeNull();
    },
  );
});

describe('backupName', () => {
  const now = new Date(2026, 9, 7, 12, 3, 1);

  it('在副檔名前加上時間', () => {
    expect(backupName('黃仁勳.jpg', now)).toBe('黃仁勳.20261007-120301.jpg');
  });

  it('檔名本身有點也正確', () => {
    expect(backupName('Dr. Strange.webp', now)).toBe('Dr. Strange.20261007-120301.webp');
  });
});

describe('mimeOf', () => {
  it.each([
    ['a.jpg', 'image/jpeg'],
    ['a.JPEG', 'image/jpeg'],
    ['a.png', 'image/png'],
    ['a.webp', 'image/webp'],
  ])('%s → %s', (file, mime) => {
    expect(mimeOf(file)).toBe(mime);
  });
});

describe('檔案系統', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'faceid-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('listFaces 只列出照片，依檔名排序，不含備份資料夾', async () => {
    await writeFile(join(dir, 'b.png'), 'b');
    await writeFile(join(dir, 'a.jpg'), 'a');
    await writeFile(join(dir, 'notes.txt'), 'x');
    await mkdir(join(dir, BACKUP_DIR));
    await writeFile(join(dir, BACKUP_DIR, 'a.20260101-000000.jpg'), 'old');

    const list = await listFaces(dir);
    expect(list.map(({ file, name }) => ({ file, name }))).toEqual([
      { file: 'a.jpg', name: 'a' },
      { file: 'b.png', name: 'b' },
    ]);
    expect(list[0]!.mtimeMs).toBeGreaterThan(0);
  });

  it('saveFace 先備份原檔再覆蓋', async () => {
    await writeFile(join(dir, '甲.jpg'), 'old');
    const now = new Date(2026, 9, 7, 12, 3, 1);

    const result = await saveFace(dir, '甲.jpg', new TextEncoder().encode('new'), now);

    expect(result).toEqual({ ok: true });
    expect(await readFile(join(dir, '甲.jpg'), 'utf8')).toBe('new');
    expect(await readFile(join(dir, BACKUP_DIR, '甲.20261007-120301.jpg'), 'utf8')).toBe('old');
  });

  it('saveFace 拒絕不合法檔名，且不寫任何東西', async () => {
    const result = await saveFace(dir, '../evil.jpg', new Uint8Array([1]));
    expect(result).toEqual({ ok: false, reason: 'invalid' });
    expect(await readdir(dir)).toEqual([]);
  });

  it('saveFace 不建立新檔：原檔不存在時回報 not-found', async () => {
    const result = await saveFace(dir, '不存在.jpg', new Uint8Array([1]));
    expect(result).toEqual({ ok: false, reason: 'not-found' });
    expect(await readdir(dir)).toEqual([]);
  });
});
