import type { IncomingMessage, ServerResponse } from 'node:http';
import { listFaces, saveFace } from './faceFiles.ts';

export type Next = () => void;
export type Middleware = (req: IncomingMessage, res: ServerResponse, next: Next) => void;

const MAX_BODY = 20 * 1024 * 1024;

/**
 * GET  /api/faces          → FaceEntry[]
 * PUT  /api/faces/:file    → 以 body 覆蓋照片（先備份）
 * 其餘路徑交給 next()
 */
export function createFaceApi(faceDir: string): Middleware {
  return (req, res, next) => {
    const path = (req.url ?? '').split('?')[0]!;

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
