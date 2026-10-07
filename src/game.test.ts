import { describe, expect, it } from 'vitest';
import type { Face } from './faces';
import { createGame, statusText } from './game';
import { HOLD_TO_ANSWER_MS } from './reveal';

const faces: Face[] = ['甲', '乙', '丙'].map((name) => ({ url: `/face/${name}.png`, name }));
// random 恆為 0 → shuffle 結果固定為 [乙, 丙, 甲]
const zero = () => 0;
const hold = (ms: number) => ({ dtMs: ms, pressed: true, durationSec: 1 });

/** 揭開並公布答案（揭露 1 秒 + 按住 3 秒） */
function answer(game: ReturnType<typeof createGame>) {
  game.tick(hold(1000));
  game.tick(hold(HOLD_TO_ANSWER_MS));
}

describe('createGame', () => {
  it('沒有照片時拒絕建立', () => {
    expect(() => createGame([])).toThrow();
  });

  it('依洗牌順序從第一題開始，遮罩為初始狀態', () => {
    const v = createGame(faces, zero).view();
    expect(v.face.name).toBe('乙');
    expect(v).toMatchObject({ index: 0, total: 3, isLast: false, phase: 'idle' });
    expect(v.reveal.progress).toBe(0);
  });

  it('tick 推進揭露，phase 依序為 revealing → full → answered', () => {
    const game = createGame(faces, zero);
    expect(game.tick(hold(500))).toBe(true);
    expect(game.view().phase).toBe('revealing');
    game.tick(hold(500));
    expect(game.view().phase).toBe('full');
    game.tick(hold(HOLD_TO_ANSWER_MS));
    expect(game.view().phase).toBe('answered');
  });

  it('沒有變化時 tick 回傳 false', () => {
    const game = createGame(faces, zero);
    expect(game.tick({ dtMs: 16, pressed: false, durationSec: 1 })).toBe(false);
  });
});

describe('next', () => {
  it('答案公布前無效', () => {
    const game = createGame(faces, zero);
    game.tick(hold(500));
    game.next();
    expect(game.view().index).toBe(0);
    expect(game.view().reveal.progress).toBeCloseTo(0.5);
  });

  it('答案公布後前往下一題，遮罩重置', () => {
    const game = createGame(faces, zero);
    answer(game);
    game.next();
    const v = game.view();
    expect(v).toMatchObject({ index: 1, phase: 'idle' });
    expect(v.face.name).toBe('丙');
  });

  it('最後一題公布後重新洗牌、從第一題再玩一輪', () => {
    const game = createGame(faces, zero);
    answer(game);
    game.next();
    answer(game);
    game.next();
    expect(game.view().isLast).toBe(true);
    answer(game);
    game.next();
    expect(game.view()).toMatchObject({ index: 0, isLast: false, phase: 'idle' });
  });
});

describe('restartRound', () => {
  it('揭露途中：恢復原始遮罩，題目不變', () => {
    const game = createGame(faces, zero);
    game.tick(hold(700));
    game.restartRound();
    const v = game.view();
    expect(v).toMatchObject({ index: 0, phase: 'idle' });
    expect(v.reveal).toEqual({ progress: 0, holdMs: 0, answered: false });
  });

  it('答案公布後也能重玩這題', () => {
    const game = createGame(faces, zero);
    answer(game);
    game.restartRound();
    expect(game.view()).toMatchObject({ index: 0, phase: 'idle' });
  });
});

describe('statusText', () => {
  it('依階段給出提示，3 秒文字來自常數', () => {
    const game = createGame(faces, zero);
    expect(statusText(game.view())).toBe('按住照片或空白鍵來揭開');
    game.tick(hold(500));
    expect(statusText(game.view())).toBe('已揭開');
    game.tick(hold(500));
    expect(statusText(game.view())).toBe(
      `全部揭開了！繼續按住 ${HOLD_TO_ANSWER_MS / 1000} 秒看答案`,
    );
    game.tick(hold(HOLD_TO_ANSWER_MS));
    expect(statusText(game.view())).toBe('答案是「乙」！');
  });

  it('最後一題公布時附上全部完成', () => {
    const game = createGame(faces, zero);
    for (let i = 0; i < 2; i++) {
      answer(game);
      game.next();
    }
    answer(game);
    expect(statusText(game.view())).toBe('答案是「甲」！全部 3 題都猜完了');
  });
});
