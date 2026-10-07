import { shuffle, type Face } from './faces';
import { HOLD_TO_ANSWER_MS, initialReveal, step, type RevealState, type StepInput } from './reveal';

export type Phase = 'idle' | 'revealing' | 'full' | 'answered';

export interface GameView {
  readonly face: Face;
  /** 0-based 題號 */
  readonly index: number;
  readonly total: number;
  readonly isLast: boolean;
  readonly reveal: RevealState;
  readonly phase: Phase;
}

export interface Game {
  /** 推進一幀；回傳畫面是否需要更新 */
  tick(input: StepInput): boolean;
  /** 答案公布後才有效：前往下一題，最後一題則重新洗牌再玩一輪 */
  next(): void;
  /** 恢復這題最原始的遮罩 */
  restartRound(): void;
  view(): GameView;
}

export function createGame(faces: readonly Face[], random: () => number = Math.random): Game {
  if (faces.length === 0) throw new Error('createGame: 至少需要一張照片');

  let deck = shuffle(faces, random);
  let index = 0;
  let reveal = initialReveal;

  return {
    tick(input) {
      const before = reveal;
      reveal = step(reveal, input);
      return reveal !== before;
    },
    next() {
      if (!reveal.answered) return;
      if (index === deck.length - 1) {
        deck = shuffle(faces, random);
        index = 0;
      } else {
        index++;
      }
      reveal = initialReveal;
    },
    restartRound() {
      reveal = initialReveal;
    },
    view() {
      return {
        face: deck[index]!,
        index,
        total: deck.length,
        isLast: index === deck.length - 1,
        reveal,
        phase: phaseOf(reveal),
      };
    },
  };
}

function phaseOf(reveal: RevealState): Phase {
  if (reveal.answered) return 'answered';
  if (reveal.progress === 0) return 'idle';
  return reveal.progress < 1 ? 'revealing' : 'full';
}

export function statusText(view: GameView): string {
  switch (view.phase) {
    case 'idle':
      return '按住照片或空白鍵來揭開';
    case 'revealing':
      return '已揭開';
    case 'full':
      return `全部揭開了！繼續按住 ${HOLD_TO_ANSWER_MS / 1000} 秒看答案`;
    case 'answered':
      return view.isLast
        ? `答案是「${view.face.name}」！全部 ${view.total} 題都猜完了`
        : `答案是「${view.face.name}」！`;
  }
}
