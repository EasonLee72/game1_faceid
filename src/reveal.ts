/** 完全揭露後，需持續按住多久才公布答案 */
export const HOLD_TO_ANSWER_MS = 3000;

export interface RevealState {
  /** 揭露比例 0..1（1 = 圓已擴張到舞台四角） */
  readonly progress: number;
  /** 完全揭露後已連續按住的毫秒數 */
  readonly holdMs: number;
  /** 是否已公布答案（終態） */
  readonly answered: boolean;
}

export interface StepInput {
  /** 距上一幀的毫秒數 */
  readonly dtMs: number;
  /** 此幀是否按住 */
  readonly pressed: boolean;
  /** 從 0 到全部揭露所需的按住秒數（拉桿值） */
  readonly durationSec: number;
}

export const initialReveal: RevealState = { progress: 0, holdMs: 0, answered: false };

export function step(state: RevealState, input: StepInput): RevealState {
  if (state.answered) return state;
  if (!input.pressed) return state.holdMs === 0 ? state : { ...state, holdMs: 0 };

  // 先推進揭露；到達 1 後該幀剩餘時間計入 hold
  const msToFull = (1 - state.progress) * input.durationSec * 1000;
  if (input.dtMs < msToFull) {
    return { ...state, progress: state.progress + input.dtMs / (input.durationSec * 1000) };
  }
  const holdMs = state.holdMs + (input.dtMs - msToFull);
  return { progress: 1, holdMs, answered: holdMs >= HOLD_TO_ANSWER_MS };
}
