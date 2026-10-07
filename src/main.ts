import './base.css';
import './style.css';
import { nameFromPath, type Face } from './faces';
import { createGame, statusText, type Game } from './game';
import { revealRadiusPct } from './geometry';
import { HOLD_TO_ANSWER_MS } from './reveal';

const urls = import.meta.glob<string>('/face/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', {
  eager: true,
  query: '?url',
  import: 'default',
});
const faces: Face[] = Object.entries(urls).map(([path, url]) => ({
  url,
  name: nameFromPath(path),
}));

const $ = <T extends Element = HTMLElement>(id: string) =>
  document.getElementById(id) as unknown as T;
const stage = $<HTMLDivElement>('stage');
const photo = $<HTMLImageElement>('photo');
const ring = $<SVGPathElement>('ring');
const answer = $<HTMLParagraphElement>('answer');
const phase = $<HTMLSpanElement>('phase');
const pct = $<HTMLSpanElement>('pct');
const counter = $<HTMLParagraphElement>('counter');
const speed = $<HTMLInputElement>('speed');
const speedValue = $<HTMLOutputElement>('speed-value');
const restart = $<HTMLButtonElement>('restart');
const next = $<HTMLButtonElement>('next');

const SPEED_KEY = 'faceid.durationSec';

let pointerHeld = false;
let keyHeld = false;
// render 用來判斷是否需要更新的快取
let shownKey = '';
let shownStatus = '';

if (faces.length === 0) {
  $('empty').hidden = false;
} else {
  $('play').hidden = false;
  $('controls').hidden = false;
  const game = createGame(faces);
  restoreSpeed();
  bindInput(game);
  render(game);
  let last = performance.now();
  const loop = (now: number) => {
    // 分頁切走後回來，避免一次跳一大段
    const dtMs = Math.min(now - last, 100);
    last = now;
    const pressed = pointerHeld || keyHeld;
    const changed = game.tick({ dtMs, pressed, durationSec: Number(speed.value) });
    stage.classList.toggle('is-pressed', pressed && game.view().phase !== 'answered');
    if (changed) render(game);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function bindInput(game: Game) {
  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    stage.setPointerCapture(e.pointerId);
    pointerHeld = true;
  });
  const release = () => (pointerHeld = false);
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);
  stage.addEventListener('lostpointercapture', release);
  stage.addEventListener('contextmenu', (e) => e.preventDefault());

  // 空白鍵等同按住照片；焦點在按鈕或拉桿上時讓它們保有原本行為
  const isControl = (t: EventTarget | null) =>
    t instanceof HTMLButtonElement || t instanceof HTMLInputElement;
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || isControl(e.target)) return;
    e.preventDefault();
    keyHeld = true;
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') keyHeld = false;
  });
  window.addEventListener('blur', () => {
    pointerHeld = false;
    keyHeld = false;
  });

  speed.addEventListener('input', () => {
    speedValue.textContent = `${speed.value} 秒`;
    try {
      localStorage.setItem(SPEED_KEY, speed.value);
    } catch {
      // 無法儲存就算了，只是偏好設定
    }
  });

  restart.addEventListener('click', () => {
    game.restartRound();
    render(game);
  });
  next.addEventListener('click', () => {
    game.next();
    render(game);
  });
}

function restoreSpeed() {
  try {
    const saved = localStorage.getItem(SPEED_KEY);
    if (saved) speed.value = saved;
  } catch {
    // 讀不到就用預設值
  }
  speedValue.textContent = `${speed.value} 秒`;
}

function render(game: Game) {
  const v = game.view();

  const key = `${v.index}|${v.face.url}`;
  if (key !== shownKey) {
    shownKey = key;
    photo.src = v.face.url;
    answer.textContent = v.face.name;
    counter.textContent = `第 ${v.index + 1} / ${v.total} 題`;
    next.textContent = v.isLast ? '再玩一輪' : '下一題';
  }

  photo.style.clipPath = `circle(${revealRadiusPct(v.reveal.progress)}% at 50% 50%)`;
  ring.style.strokeDasharray = `${(v.reveal.holdMs / HOLD_TO_ANSWER_MS) * 100} 100`;
  answer.hidden = v.phase !== 'answered';
  next.disabled = v.phase !== 'answered';
  pct.textContent = v.phase === 'revealing' ? `${Math.floor(v.reveal.progress * 100)}%` : '';

  // 只在文字改變時寫入，避免 aria-live 每幀播報
  const status = statusText(v);
  if (status !== shownStatus) {
    shownStatus = status;
    phase.textContent = status;
  }
}
