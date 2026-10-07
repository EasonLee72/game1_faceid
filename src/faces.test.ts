import { describe, expect, it } from 'vitest';
import { nameFromPath, shuffle } from './faces';

describe('nameFromPath', () => {
  it('取檔名、去掉副檔名', () => {
    expect(nameFromPath('/face/黃仁勳.jpg')).toBe('黃仁勳');
  });

  it('只去掉最後一個副檔名', () => {
    expect(nameFromPath('/face/Dr. Strange.webp')).toBe('Dr. Strange');
  });
});

describe('shuffle', () => {
  it('結果是原陣列的排列，且不改動原陣列', () => {
    const src = [1, 2, 3, 4, 5];
    const out = shuffle(src);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(src).toEqual([1, 2, 3, 4, 5]);
  });

  it('注入 random 時結果可重現（Fisher–Yates 由尾端往前交換）', () => {
    // random 恆為 0 → 每步 i 與 0 交換：[a,b,c,d] → [b,c,d,a]
    expect(shuffle(['a', 'b', 'c', 'd'], () => 0)).toEqual(['b', 'c', 'd', 'a']);
  });

  it('空陣列回傳空陣列', () => {
    expect(shuffle([])).toEqual([]);
  });
});
