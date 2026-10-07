import { describe, expect, it } from 'vitest';
import { revealRadiusPct } from './geometry';

describe('revealRadiusPct', () => {
  it('progress 0：直徑 8% → 半徑 4%', () => {
    expect(revealRadiusPct(0)).toBeCloseTo(4);
  });

  it('progress 1：半徑等於中心到角落距離（邊長的 √2/2）', () => {
    expect(revealRadiusPct(1)).toBeCloseTo((Math.SQRT2 / 2) * 100);
  });

  it('中間線性內插', () => {
    expect(revealRadiusPct(0.5)).toBeCloseTo((4 + (Math.SQRT2 / 2) * 100) / 2);
  });
});
