export interface Size {
  readonly width: number;
  readonly height: number;
}

/** 編輯狀態：zoom 1 = 正方形框剛好蓋滿短邊；cx/cy = 準星所在的原圖像素座標 */
export interface CropView {
  readonly zoom: number;
  readonly cx: number;
  readonly cy: number;
}

/** 原圖上的正方形裁切範圍（像素） */
export interface CropRect {
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

export const MAX_ZOOM = 5;
export const MAX_OUTPUT = 1024;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const sideOf = (img: Size, zoom: number) => Math.min(img.width, img.height) / zoom;

/** 讓裁切範圍留在圖片內 */
function contain(img: Size, zoom: number, cx: number, cy: number): CropView {
  const half = sideOf(img, zoom) / 2;
  return {
    zoom,
    cx: clamp(cx, half, img.width - half),
    cy: clamp(cy, half, img.height - half),
  };
}

export function initialView(img: Size): CropView {
  return { zoom: 1, cx: img.width / 2, cy: img.height / 2 };
}

export function cropRect(img: Size, view: CropView): CropRect {
  const size = sideOf(img, view.zoom);
  return { x: view.cx - size / 2, y: view.cy - size / 2, size };
}

/** 以準星為中心縮放，並維持圖片蓋滿裁切框 */
export function zoomTo(img: Size, view: CropView, zoom: number): CropView {
  return contain(img, clamp(zoom, 1, MAX_ZOOM), view.cx, view.cy);
}

/** 圖片在畫面上被拖曳 (dx, dy) 螢幕像素；boxPx = 裁切框的螢幕邊長 */
export function panBy(img: Size, view: CropView, dx: number, dy: number, boxPx: number): CropView {
  const srcPerPx = sideOf(img, view.zoom) / boxPx;
  return contain(img, view.zoom, view.cx - dx * srcPerPx, view.cy - dy * srcPerPx);
}

/** 輸出邊長：等於裁切範圍的原圖像素，最大 1024 */
export function outputSize(rect: CropRect): number {
  return Math.min(Math.round(rect.size), MAX_OUTPUT);
}
