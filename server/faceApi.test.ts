import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
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

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'faceid-api-'));
  await writeFile(join(dir, '甲.jpg'), 'old');
  const api = createFaceApi(dir);
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
