import { describe, expect, it } from 'vitest';
import { cropRect, initialView, outputSize, panBy, zoomTo } from './crop';

const img = { width: 800, height: 600 };

describe('initialView / cropRect', () => {
  it('一開始：縮放 1、準星在圖片正中央，裁切框蓋滿短邊', () => {
    const v = initialView(img);
    expect(v).toEqual({ zoom: 1, cx: 400, cy: 300 });
    expect(cropRect(img, v)).toEqual({ x: 100, y: 0, size: 600 });
  });

  it('正方形原圖不動直接存 = 原圖', () => {
    const sq = { width: 500, height: 500 };
    expect(cropRect(sq, initialView(sq))).toEqual({ x: 0, y: 0, size: 500 });
  });
});

describe('zoomTo', () => {
  it('以準星為中心放大', () => {
    const v = zoomTo(img, initialView(img), 2);
    expect(v).toEqual({ zoom: 2, cx: 400, cy: 300 });
    expect(cropRect(img, v)).toEqual({ x: 250, y: 150, size: 300 });
  });

  it('縮放限制在 1 到 5 倍', () => {
    expect(zoomTo(img, initialView(img), 10).zoom).toBe(5);
    expect(zoomTo(img, initialView(img), 0.5).zoom).toBe(1);
  });

  it('縮小時若準星太靠邊，會被推回以維持蓋滿', () => {
    let v = zoomTo(img, initialView(img), 2);
    v = panBy(img, v, -10_000, 0, 300); // 推到最右：cx = 800 - 150
    expect(v.cx).toBe(650);
    v = zoomTo(img, v, 1);
    expect(v.cx).toBe(500); // 800 - 300
  });
});

describe('panBy', () => {
  it('圖片往左拖，準星對到原圖更右邊的位置（依框的螢幕大小換算）', () => {
    // 縮放 1：裁切邊長 600 原圖 px 對應 300 螢幕 px → 1 螢幕 px = 2 原圖 px
    const v = panBy(img, initialView(img), -50, 0, 300);
    expect(v.cx).toBe(500);
    expect(cropRect(img, v).x).toBe(200);
  });

  it('不能拖出圖片範圍', () => {
    const v = panBy(img, initialView(img), -10_000, 10_000, 300);
    expect(v.cx).toBe(500);
    expect(v.cy).toBe(300); // 短邊已蓋滿，垂直方向不能動
  });
});

describe('outputSize', () => {
  it('取整數像素', () => {
    expect(outputSize({ x: 0, y: 0, size: 300.4 })).toBe(300);
  });

  it('最大 1024', () => {
    expect(outputSize({ x: 0, y: 0, size: 2000 })).toBe(1024);
  });
});
