/** 起始露出直徑佔舞台寬度的比例 */
export const START_DIAMETER = 0.08;

const START_RADIUS_PCT = (START_DIAMETER / 2) * 100;
const END_RADIUS_PCT = (Math.SQRT2 / 2) * 100;

/**
 * 揭露比例 → clip-path circle() 的半徑（舞台邊長的 %）。
 * 正方形舞台中 circle() 的 % 基準剛好是邊長。
 */
export function revealRadiusPct(progress: number): number {
  return START_RADIUS_PCT + (END_RADIUS_PCT - START_RADIUS_PCT) * progress;
}
