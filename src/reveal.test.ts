import { describe, expect, it } from 'vitest';
import { HOLD_TO_ANSWER_MS, initialReveal, step, type RevealState } from './reveal';

const at = (progress: number, holdMs = 0): RevealState => ({ progress, holdMs, answered: false });

describe('step', () => {
  it('沒按住時不會有任何變化', () => {
    const s = at(0.4);
    expect(step(s, { dtMs: 1000, pressed: false, durationSec: 10 })).toEqual(s);
  });

  it('按住時依「全部揭露秒數」線性推進', () => {
    const s = step(initialReveal, { dtMs: 1000, pressed: true, durationSec: 10 });
    expect(s.progress).toBeCloseTo(0.1);
    expect(s.holdMs).toBe(0);
  });

  it('中途改變秒數：已揭露的保留，之後用新速度', () => {
    let s = step(initialReveal, { dtMs: 1000, pressed: true, durationSec: 10 }); // 0.1
    s = step(s, { dtMs: 1000, pressed: true, durationSec: 5 }); // +0.2
    expect(s.progress).toBeCloseTo(0.3);
  });

  it('揭露比例不超過 1', () => {
    const s = step(at(0.99), { dtMs: 5000, pressed: true, durationSec: 10 });
    expect(s.progress).toBe(1);
  });

  it('到達 100% 時還按著：該幀剩下的時間直接計入 3 秒', () => {
    // 0.95 → 1 需 500ms，剩 500ms 計入 hold
    const s = step(at(0.95), { dtMs: 1000, pressed: true, durationSec: 10 });
    expect(s.progress).toBe(1);
    expect(s.holdMs).toBeCloseTo(500);
  });

  it('完全揭露後按住會累計 hold', () => {
    const s = step(at(1, 1000), { dtMs: 500, pressed: true, durationSec: 10 });
    expect(s.holdMs).toBe(1500);
    expect(s.answered).toBe(false);
  });

  it('完全揭露後放開，hold 歸零', () => {
    const s = step(at(1, 2500), { dtMs: 16, pressed: false, durationSec: 10 });
    expect(s).toEqual(at(1, 0));
  });

  it('hold 達 3 秒即公布答案', () => {
    const s = step(at(1, HOLD_TO_ANSWER_MS - 10), { dtMs: 16, pressed: true, durationSec: 10 });
    expect(s.answered).toBe(true);
  });

  it('公布答案後為終態：放開或繼續按都不再變化', () => {
    const done: RevealState = { progress: 1, holdMs: HOLD_TO_ANSWER_MS, answered: true };
    expect(step(done, { dtMs: 100, pressed: false, durationSec: 10 })).toEqual(done);
    expect(step(done, { dtMs: 100, pressed: true, durationSec: 10 })).toEqual(done);
  });
});
