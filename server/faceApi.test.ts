import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createFaceApi } from './faceApi';
import { BACKUP_DIR } from './faceFiles';

let dir: string;
let server: Server;
let base: string;
let ansPath: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'faceid-api-'));
  await writeFile(join(dir, '甲.jpg'), 'old');
  ansPath = join(dir, 'ans_order.md');
  const api = createFaceApi(dir, ansPath);
  server = createServer((req, res) =>
    api(req, res, () => {
      res.statusCode = 418;
      res.end('next');
    }),
  );
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  await new Promise((r) => server.close(r));
  await rm(dir, { recursive: true, force: true });
});

const put = (file: string, body: string) =>
  fetch(`${base}/api/faces/${encodeURIComponent(file)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body,
  });

describe('GET /api/faces', () => {
  it('回傳照片清單 JSON', async () => {
    const res = await fetch(`${base}/api/faces`);
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(list).toEqual([{ file: '甲.jpg', name: '甲', mtimeMs: expect.any(Number) }]);
  });
});

describe('PUT /api/faces/:file', () => {
  it('覆蓋照片並備份原檔', async () => {
    const res = await put('甲.jpg', 'new');
    expect(res.status).toBe(200);
    expect(await readFile(join(dir, '甲.jpg'), 'utf8')).toBe('new');
    const backups = await readdir(join(dir, BACKUP_DIR));
    expect(backups).toHaveLength(1);
    expect(await readFile(join(dir, BACKUP_DIR, backups[0]!), 'utf8')).toBe('old');
  });

  it('不合法檔名回 400，附錯誤訊息', async () => {
    const res = await put('../evil.jpg', 'x');
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/檔名/);
  });

  it('照片不存在回 404', async () => {
    const res = await put('乙.jpg', 'x');
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/找不到/);
  });

  it('空內容回 400，不覆蓋', async () => {
    const res = await put('甲.jpg', '');
    expect(res.status).toBe(400);
    expect(await readFile(join(dir, '甲.jpg'), 'utf8')).toBe('old');
  });
});

const generate = (query = '') => fetch(`${base}/api/ans-order${query}`, { method: 'POST' });

describe('GET /api/ans-order', () => {
  it('檔案不存在時回傳空字串', async () => {
    const res = await fetch(`${base}/api/ans-order`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ markdown: '', updatedMs: null });
  });

  it('回傳檔案內容與最後更新時間', async () => {
    await writeFile(ansPath, '1. 甲\n');
    const { mtimeMs } = await stat(ansPath);
    expect(await (await fetch(`${base}/api/ans-order`)).json()).toEqual({
      markdown: '1. 甲\n',
      updatedMs: mtimeMs,
    });
  });
});

describe('POST /api/ans-order', () => {
  beforeEach(() => writeFile(join(dir, '乙.png'), 'x'));

  const listed = (md: string) => md.match(/^\d+\. .+$/gm)?.map((l) => l.replace(/^\d+\. /, ''));

  it('檔案不存在：以所有照片的檔名寫出有序清單', async () => {
    const res = await generate();
    expect(res.status).toBe(200);
    const md = await readFile(ansPath, 'utf8');
    expect(listed(md)?.sort()).toEqual(['乙.png', '甲.jpg']);
    expect(md).toMatch(/^1\. /m);
    expect(md).toMatch(/^2\. /m);
    expect(await res.json()).toEqual({ markdown: md, updatedMs: (await stat(ansPath)).mtimeMs });
  });

  it('只有空白的檔案視為空的，直接寫入', async () => {
    await writeFile(ansPath, '  \n');
    expect((await generate()).status).toBe(200);
    expect(listed(await readFile(ansPath, 'utf8'))).toHaveLength(2);
  });

  it('已有內容且沒指定覆蓋：回 409，不動檔案', async () => {
    await writeFile(ansPath, '1. 甲\n');
    const res = await generate();
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/已經有內容/);
    expect(await readFile(ansPath, 'utf8')).toBe('1. 甲\n');
  });

  it('指定 overwrite=1 時覆蓋', async () => {
    await writeFile(ansPath, '1. 甲\n');
    expect((await generate('?overwrite=1')).status).toBe(200);
    expect(listed(await readFile(ansPath, 'utf8'))).toHaveLength(2);
  });

  it('沒有照片時回 400，不建立檔案', async () => {
    await rm(join(dir, '甲.jpg'));
    await rm(join(dir, '乙.png'));
    const res = await generate();
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/還沒有照片/);
    await expect(readFile(ansPath, 'utf8')).rejects.toThrow();
  });
});

describe('其他路徑', () => {
  it('交給下一個 middleware', async () => {
    const res = await fetch(`${base}/face/甲.jpg`);
    expect(res.status).toBe(418);
  });

  it('/api/faces 不支援的方法也交給下一個', async () => {
    const res = await fetch(`${base}/api/faces`, { method: 'DELETE' });
    expect(res.status).toBe(418);
  });
});
