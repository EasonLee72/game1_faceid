import { readFile, stat, writeFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { formatAnsOrder } from '../src/ansOrder.ts';
import { shuffle } from '../src/faces.ts';
import { listFaces, saveFace } from './faceFiles.ts';

export type Next = () => void;
export type Middleware = (req: IncomingMessage, res: ServerResponse, next: Next) => void;

const MAX_BODY = 20 * 1024 * 1024;

/**
 * GET  /api/faces          → FaceEntry[]
 * PUT  /api/faces/:file    → 以 body 覆蓋照片（先備份）
 * GET  /api/ans-order      → { markdown, updatedMs }，檔案不存在時為 '' 與 null
 * POST /api/ans-order      → 以照片隨機排序寫出 ans_order.md；已有內容需帶 ?overwrite=1
 * 其餘路徑交給 next()
 */
export function createFaceApi(faceDir: string, ansOrderPath: string): Middleware {
  return (req, res, next) => {
    const [path = '', query = ''] = (req.url ?? '').split('?');

    if (path === '/api/ans-order' && req.method === 'GET') {
      readAnsOrder(ansOrderPath).then(
        (file) => send(res, 200, file),
        (err: unknown) => send(res, 500, { error: `讀取答案順序失敗：${String(err)}` }),
      );
      return;
    }

    if (path === '/api/ans-order' && req.method === 'POST') {
      const overwrite = new URLSearchParams(query).get('overwrite') === '1';
      handleGenerate(faceDir, ansOrderPath, overwrite, res);
      return;
    }

    if (req.method === 'GET' && path === '/api/faces') {
      listFaces(faceDir).then(
        (list) => send(res, 200, list),
        (err: unknown) => send(res, 500, { error: `讀取照片清單失敗：${String(err)}` }),
      );
      return;
    }

    const match = /^\/api\/faces\/([^/]+)$/.exec(path);
    if (req.method === 'PUT' && match) {
      handleSave(faceDir, match[1]!, req, res);
      return;
    }

    next();
  };
}

async function handleSave(
  faceDir: string,
  encodedFile: string,
  req: IncomingMessage,
  res: ServerResponse,
) {
  let file: string;
  try {
    file = decodeURIComponent(encodedFile);
  } catch {
    return send(res, 400, { error: `檔名不合法：${encodedFile}` });
  }
  try {
    const body = await readBody(req);
    if (body === null) return send(res, 413, { error: '照片太大，上限 20 MB' });
    if (body.length === 0) return send(res, 400, { error: '沒有收到照片內容，請再試一次' });

    const result = await saveFace(faceDir, file, body);
    if (result.ok) return send(res, 200, { ok: true });
    if (result.reason === 'invalid') return send(res, 400, { error: `檔名不合法：${file}` });
    return send(res, 404, { error: `找不到照片：${file}，可能已被移動或刪除` });
  } catch (err) {
    send(res, 500, { error: `儲存失敗：${String(err)}` });
  }
}

interface AnsOrderFile {
  readonly markdown: string;
  /** 最後修改時間；檔案不存在時為 null */
  readonly updatedMs: number | null;
}

async function readAnsOrder(ansOrderPath: string): Promise<AnsOrderFile> {
  try {
    const [markdown, { mtimeMs }] = await Promise.all([
      readFile(ansOrderPath, 'utf8'),
      stat(ansOrderPath),
    ]);
    return { markdown, updatedMs: mtimeMs };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { markdown: '', updatedMs: null };
    throw err;
  }
}

async function handleGenerate(
  faceDir: string,
  ansOrderPath: string,
  overwrite: boolean,
  res: ServerResponse,
) {
  try {
    const faces = await listFaces(faceDir);
    if (faces.length === 0) {
      return send(res, 400, { error: '還沒有照片，請先把照片放進 face/ 資料夾' });
    }
    if (!overwrite && (await readAnsOrder(ansOrderPath)).markdown.trim() !== '') {
      return send(res, 409, { error: 'ans_order.md 已經有內容，確認要覆蓋請帶 overwrite=1' });
    }
    const markdown = formatAnsOrder(shuffle(faces.map((f) => f.file)));
    await writeFile(ansOrderPath, markdown, 'utf8');
    send(res, 200, await readAnsOrder(ansOrderPath));
  } catch (err) {
    send(res, 500, { error: `產生答案順序失敗：${String(err)}` });
  }
}

/** 讀完整個 body；超過上限回傳 null */
async function readBody(req: IncomingMessage): Promise<Buffer | null> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size > MAX_BODY) return null;
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}
