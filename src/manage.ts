import './base.css';
import './manage.css';
import { cropRect, initialView, outputSize, panBy, zoomTo, type CropView, type Size } from './crop';
import { mimeOf } from './faces';

interface FaceEntry {
  readonly file: string;
  readonly name: string;
  readonly mtimeMs: number;
}

const $ = <T extends Element = HTMLElement>(id: string) =>
  document.getElementById(id) as unknown as T;
const listView = $('list-view');
const grid = $<HTMLUListElement>('grid');
const listEmpty = $('list-empty');
const listError = $('list-error');
const editView = $('edit-view');
const editName = $('edit-name');
const box = $<HTMLDivElement>('crop-box');
const img = $<HTMLImageElement>('crop-img');
const zoom = $<HTMLInputElement>('zoom');
const zoomValue = $<HTMLOutputElement>('zoom-value');
const outInfo = $('out-info');
const editError = $('edit-error');
const discard = $<HTMLButtonElement>('discard');
const save = $<HTMLButtonElement>('save');
const toast = $('toast');

const faceUrl = (f: FaceEntry) => `/face/${encodeURIComponent(f.file)}?v=${f.mtimeMs}`;

// ── 列表 ──────────────────────────────────────

let faces: FaceEntry[] = [];

async function loadList(focusFile?: string) {
  listError.hidden = true;
  try {
    const res = await fetch('/api/faces');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    faces = (await res.json()) as FaceEntry[];
  } catch (err) {
    listError.textContent = `讀不到照片清單（${String(err)}）。請確認是用 pnpm dev 開啟這個頁面。`;
    listError.hidden = false;
    return;
  }

  listEmpty.hidden = faces.length > 0;
  grid.replaceChildren(
    ...faces.map((face) => {
      const li = document.createElement('li');
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'card';
      card.dataset.file = face.file;
      card.setAttribute('aria-label', `編輯「${face.name}」`);
      const thumb = document.createElement('img');
      thumb.src = faceUrl(face);
      thumb.alt = '';
      thumb.loading = 'lazy';
      const name = document.createElement('span');
      name.textContent = face.name;
      card.append(thumb, name);
      card.addEventListener('click', () => openEditor(face));
      li.append(card);
      return li;
    }),
  );
  if (focusFile) {
    grid.querySelector<HTMLButtonElement>(`[data-file="${CSS.escape(focusFile)}"]`)?.focus();
  }
}

// ── 編輯 ──────────────────────────────────────

let editing: FaceEntry | null = null;
let natural: Size = { width: 1, height: 1 };
let view: CropView = { zoom: 1, cx: 0, cy: 0 };

function openEditor(face: FaceEntry) {
  editing = face;
  editName.textContent = face.name;
  editError.hidden = true;
  setBusy(false);
  listView.hidden = true;
  editView.hidden = false;
  img.hidden = true;
  img.onload = () => {
    natural = { width: img.naturalWidth, height: img.naturalHeight };
    view = initialView(natural);
    img.hidden = false;
    renderCrop();
    box.focus();
  };
  img.onerror = () => showEditError('這張照片讀取失敗，可能已被移動或刪除。');
  img.src = faceUrl(face);
}

function closeEditor(saved?: FaceEntry) {
  const file = editing?.file;
  editing = null;
  editView.hidden = true;
  listView.hidden = false;
  if (saved) showToast(`已儲存「${saved.name}」`);
  void loadList(file);
}

const boxPx = () => box.clientWidth;

function renderCrop() {
  const rect = cropRect(natural, view);
  const scale = boxPx() / rect.size;
  img.style.width = `${natural.width * scale}px`;
  img.style.height = `${natural.height * scale}px`;
  img.style.transform = `translate(${-rect.x * scale}px, ${-rect.y * scale}px)`;
  zoom.value = String(view.zoom);
  zoomValue.textContent = `${view.zoom.toFixed(1)}×`;
  const out = outputSize(rect);
  outInfo.textContent = `儲存後的尺寸：${out} × ${out} px`;
}

function setView(next: CropView) {
  view = next;
  renderCrop();
}

// 拖曳
let drag: { x: number; y: number } | null = null;
box.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || !editing) return;
  box.setPointerCapture(e.pointerId);
  box.classList.add('is-dragging');
  drag = { x: e.clientX, y: e.clientY };
});
box.addEventListener('pointermove', (e) => {
  if (!drag) return;
  setView(panBy(natural, view, e.clientX - drag.x, e.clientY - drag.y, boxPx()));
  drag = { x: e.clientX, y: e.clientY };
});
const endDrag = () => {
  drag = null;
  box.classList.remove('is-dragging');
};
box.addEventListener('pointerup', endDrag);
box.addEventListener('pointercancel', endDrag);
box.addEventListener('lostpointercapture', endDrag);

// 縮放：滾輪、拉桿、+/- 鍵都以準星為中心
box.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    setView(zoomTo(natural, view, view.zoom * Math.exp(-e.deltaY * 0.002)));
  },
  { passive: false },
);
zoom.addEventListener('input', () => setView(zoomTo(natural, view, Number(zoom.value))));

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};
box.addEventListener('keydown', (e) => {
  const arrow = ARROWS[e.key];
  if (arrow) {
    e.preventDefault();
    const step = e.shiftKey ? 10 : 1;
    setView(panBy(natural, view, arrow[0] * step, arrow[1] * step, boxPx()));
  } else if (e.key === '+' || e.key === '=') {
    e.preventDefault();
    setView(zoomTo(natural, view, view.zoom * 1.1));
  } else if (e.key === '-') {
    e.preventDefault();
    setView(zoomTo(natural, view, view.zoom / 1.1));
  }
});

new ResizeObserver(() => {
  if (editing && !img.hidden) renderCrop();
}).observe(box);

// 儲存 / 放棄
discard.addEventListener('click', () => closeEditor());
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && editing && !save.disabled) closeEditor();
});

save.addEventListener('click', async () => {
  const face = editing;
  if (!face || img.hidden) return;
  editError.hidden = true;
  setBusy(true);
  try {
    const blob = await renderOutput(face.file);
    const res = await fetch(`/api/faces/${encodeURIComponent(face.file)}`, {
      method: 'PUT',
      headers: { 'Content-Type': blob.type },
      body: blob,
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? `伺服器回應 ${res.status}`);
    }
    closeEditor(face);
  } catch (err) {
    showEditError(
      `儲存失敗：${err instanceof Error ? err.message : String(err)}。原檔沒有被改動，可以再試一次。`,
    );
    setBusy(false);
  }
});

function renderOutput(file: string): Promise<Blob> {
  const rect = cropRect(natural, view);
  const size = outputSize(rect);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('瀏覽器不支援 canvas'));
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, rect.x, rect.y, rect.size, rect.size, 0, 0, size, size);
  const mime = mimeOf(file) ?? 'image/png';
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('無法產生圖片'))), mime, 0.92),
  );
}

function setBusy(busy: boolean) {
  save.disabled = busy;
  discard.disabled = busy;
  save.textContent = busy ? '儲存中…' : '儲存';
}

function showEditError(message: string) {
  editError.textContent = message;
  editError.hidden = false;
}

let toastTimer = 0;
function showToast(message: string) {
  toast.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toast.textContent = ''), 4000);
}

void loadList();
