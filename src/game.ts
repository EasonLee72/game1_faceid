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
  /** 答案公布後才有效：前往下一題，最後一題則從頭再玩一輪（非固定順序時重新洗牌） */
  next(): void;
  /** 恢復這題最原始的遮罩 */
  restartRound(): void;
  /** 有人提前猜中：直接全部揭開並公布答案 */
  revealAnswer(): void;
  view(): GameView;
}

export interface GameOptions {
  /** true = 照傳入順序出題（ans_order.md），每輪都一樣；false = 每輪洗牌 */
  readonly fixedOrder?: boolean;
}

export function createGame(
  faces: readonly Face[],
  random: () => number = Math.random,
  { fixedOrder = false }: GameOptions = {},
): Game {
  if (faces.length === 0) throw new Error('createGame: 至少需要一張照片');

  const newDeck = () => (fixedOrder ? [...faces] : shuffle(faces, random));
  let deck = newDeck();
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
        deck = newDeck();
        index = 0;
      } else {
        index++;
      }
      reveal = initialReveal;
    },
    restartRound() {
      reveal = initialReveal;
    },
    revealAnswer() {
      reveal = { progress: 1, holdMs: HOLD_TO_ANSWER_MS, answered: true };
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
