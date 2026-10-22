import {
  bind,
  jsx,
  type RuntimeNode,
  ScalarSource,
} from "../jsx_binding_runtime.ts";
import { DOMVDOMHost, VDOMSnapshotRoot } from "../vdom_snapshot_runtime.ts";
import "./snake_game.css";

type Point = { x: number; y: number };
type Direction = "up" | "down" | "left" | "right";

const SIZE = 20;
const TICK_MS = 112;
const rootElement = document.querySelector<HTMLElement>("#root")!;
rootElement.innerHTML = `
  <main class="game-page">
    <header class="game-topbar">
      <a class="wordmark" href="/">FIELDNOTE<span> / UI RUNTIME STUDY</span></a>
      <span class="runtime-pill"><i></i> RETAINED JSX · LIVE</span>
    </header>
    <section class="game-intro">
      <div><p class="kicker">FRAME BY FRAME</p><h1>Snake</h1><p class="lede">A small game, driven by a retained JSX tree. The body glides between grid cells while one shared source updates each segment every animation frame.</p></div>
      <div class="score-card"><span>APPLES</span><strong id="score" aria-live="polite">00</strong></div>
    </section>
    <section class="game-layout">
      <div class="board-frame"><div id="game" class="game-mount" aria-label="Snake game board" role="application" aria-describedby="game-help"></div><div class="board-caption"><span id="state" aria-live="polite">READY WHEN YOU ARE</span><span>20 × 20 GRID</span></div></div>
      <aside class="game-side">
        <p class="side-label">YOUR RUN</p>
        <h2>Eat. Grow.<br/>Stay sharp.</h2>
        <p class="side-copy">Guide the snake to the glowing fruit. Each apple adds a segment. Don’t hit the walls or your own tail.</p>
        <button id="start" class="primary-button">Start game <span>↗</span></button>
        <button id="pause" class="secondary-button" type="button" aria-controls="game" disabled>Pause game <span>Ⅱ</span></button>
        <div class="side-rule"></div>
        <div class="controls-title">CONTROLS <span>⌨</span></div>
        <div class="key-grid"><kbd>↑</kbd><span class="key-spacer"></span><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></div>
        <p class="control-note" id="game-help">Arrow keys or WASD to steer · Space to pause</p>
        <div class="touch-pad" role="group" aria-label="Touch controls">
          <button type="button" data-direction="up" aria-label="Steer up">↑</button>
          <button type="button" data-direction="left" aria-label="Steer left">←</button>
          <button type="button" data-direction="down" aria-label="Steer down">↓</button>
          <button type="button" data-direction="right" aria-label="Steer right">→</button>
        </div>
        <div class="live-stats" aria-label="Live update workload">
          <div><span>FRAME RATE</span><strong id="fps">—</strong></div>
          <div><span>BOUND PROPS / FRAME</span><strong id="writes">5</strong></div>
        </div>
        <div class="game-meta"><span>UPDATE LOOP</span><strong>requestAnimationFrame</strong><span>HOST WRITES</span><strong>bound transform props</strong></div>
        <a class="benchmark-link" href="/snake-frame-benchmark.html?protocol=v6&arm=columnar-vdom&segments=128&frames=300">Compare runtime paths <span>↗</span></a>
      </aside>
    </section>
    <footer class="game-footer"><span>RESEARCH BUILD 01</span><span>Every frame is a small, explicit data update.</span></footer>
  </main>`;

const gameMount = document.querySelector<HTMLElement>("#game")!;
const scoreNode = document.querySelector<HTMLElement>("#score")!;
const stateNode = document.querySelector<HTMLElement>("#state")!;
const fpsNode = document.querySelector<HTMLElement>("#fps")!;
const writesNode = document.querySelector<HTMLElement>("#writes")!;
const startButton = document.querySelector<HTMLButtonElement>("#start")!;
const pauseButton = document.querySelector<HTMLButtonElement>("#pause")!;
const touchButtons = document.querySelectorAll<HTMLButtonElement>(".touch-pad button");
const progress = new ScalarSource(0, 0);
const root = new VDOMSnapshotRoot<Node, Node>(new DOMVDOMHost(), gameMount);

let body: Point[] = [];
let fromBody: Point[] = [];
let direction: Direction = "right";
let queuedDirection: Direction = "right";
let food: Point = { x: 15, y: 10 };
let score = 0;
let accumulator = 0;
let previousTime: number | null = null;
let rafId = 0;
let running = false;
let ended = false;
let fpsWindowStart = 0;
let fpsWindowFrames = 0;

const opposite: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};
const offset: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const positionAt = (before: Point[], after: Point[], id: number, t: number) => {
  const a = before[id] ?? before.at(-1)!;
  const b = after[id] ?? after.at(-1)!;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
};
const transformAt = (
  before: Point[],
  after: Point[],
  id: number,
  t: number,
) => {
  const point = positionAt(before, after, id, t);
  return `translate3d(${point.x * 100}%, ${point.y * 100}%, 0)`;
};
const scene = (): RuntimeNode =>
  jsx(
    "div",
    { className: "snake-board", "aria-label": "Snake playfield" },
    [
      ...body.map((_, id) =>
        jsx("i", {
          key: `body-${id}`,
          className: id === 0 ? "game-snake game-head" : "game-snake",
          style: {
            transform: bind(
              progress,
              (t) => transformAt(fromBody, body, id, t),
            ),
          },
        })
      ),
      jsx("i", {
        key: "food",
        className: "game-food",
        // Food is stationary between ticks. Interpolating it with the snake's
        // repeating 0→1 frame progress makes it travel back to its old cell on
        // every tick after spawning. Only update its transform when it moves.
        style: {
          transform: `translate3d(${food.x * 100}%, ${food.y * 100}%, 0)`,
        },
      }),
    ],
  );

const render = () => root.commit(scene(), null, true);
const updateWorkload = () => {
  writesNode.textContent = String(body.length + 1);
};

const spawnFood = (): Point => {
  const free: Point[] = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (!body.some((point) => point.x === x && point.y === y)) {
        free.push({ x, y });
      }
    }
  }
  return free[Math.floor(Math.random() * free.length)] ?? body[0];
};

const setStatus = (status: string) => {
  stateNode.textContent = status;
};

const endGame = () => {
  running = false;
  ended = true;
  cancelAnimationFrame(rafId);
  setStatus("RUN OVER · TRY AGAIN");
  startButton.innerHTML = "Play again <span>↗</span>";
  pauseButton.disabled = true;
  startButton.focus();
};

const advance = () => {
  direction = queuedDirection;
  const head = body[0];
  const delta = offset[direction];
  const next = { x: head.x + delta.x, y: head.y + delta.y };
  const eats = next.x === food.x && next.y === food.y;
  const occupied = eats ? body : body.slice(0, -1);
  if (
    next.x < 0 || next.y < 0 || next.x >= SIZE || next.y >= SIZE ||
    occupied.some((point) => point.x === next.x && point.y === next.y)
  ) {
    endGame();
    return;
  }
  fromBody = body;
  body = [next, ...(eats ? body : body.slice(0, -1))];
  if (eats) {
    score++;
    scoreNode.textContent = String(score).padStart(2, "0");
    food = spawnFood();
    updateWorkload();
    render();
  }
};

const frame = (time: number) => {
  if (!running) return;
  fpsWindowFrames++;
  if (fpsWindowStart === 0) fpsWindowStart = time;
  const fpsWindowMs = time - fpsWindowStart;
  if (fpsWindowMs >= 500) {
    fpsNode.textContent = `${
      Math.round(fpsWindowFrames * 1000 / fpsWindowMs)
    } FPS`;
    fpsWindowStart = time;
    fpsWindowFrames = 0;
  }
  if (previousTime === null) previousTime = time;
  accumulator += Math.min(64, Math.max(0, time - previousTime));
  previousTime = time;
  while (accumulator >= TICK_MS && running) {
    advance();
    accumulator -= TICK_MS;
  }
  if (!running) return;
  root.setSource(progress, accumulator / TICK_MS);
  rafId = requestAnimationFrame(frame);
};

const start = () => {
  cancelAnimationFrame(rafId);
  ended = false;
  running = true;
  score = 0;
  accumulator = 0;
  previousTime = null;
  fpsWindowStart = 0;
  fpsWindowFrames = 0;
  fpsNode.textContent = "—";
  direction = queuedDirection = "right";
  body = [
    { x: 9, y: 10 },
    { x: 8, y: 10 },
    { x: 7, y: 10 },
    { x: 6, y: 10 },
  ];
  fromBody = body;
  food = { x: 14, y: 10 };
  scoreNode.textContent = "00";
  // Flush the reset positions before the first RAF. This matters when a run
  // is restarted immediately after a collision or while the previous frame
  // source still holds a non-zero interpolation value.
  root.setSource(progress, 0);
  render();
  setStatus("IN MOTION · GOOD LUCK");
  startButton.innerHTML = "Restart run <span>↗</span>";
  pauseButton.disabled = false;
  pauseButton.innerHTML = "Pause game <span>Ⅱ</span>";
  rafId = requestAnimationFrame(frame);
};

const togglePause = () => {
  if (running) {
    running = false;
    cancelAnimationFrame(rafId);
    setStatus("PAUSED · PRESS RESUME WHEN READY");
    pauseButton.innerHTML = "Resume game <span>▶</span>";
    return;
  }
  if (ended || body.length === 0) return;
  running = true;
  previousTime = null;
  setStatus("IN MOTION · GOOD LUCK");
  pauseButton.innerHTML = "Pause game <span>Ⅱ</span>";
  rafId = requestAnimationFrame(frame);
};

const steer = (next: Direction) => {
  if (
    !running || next === opposite[direction] ||
    next === opposite[queuedDirection]
  ) return;
  queuedDirection = next;
};

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  const directions: Record<string, Direction> = {
    arrowup: "up",
    w: "up",
    arrowdown: "down",
    s: "down",
    arrowleft: "left",
    a: "left",
    arrowright: "right",
    d: "right",
  };
  if (directions[key]) {
    event.preventDefault();
    steer(directions[key]);
  } else if (event.code === "Space" && !ended && body.length > 0) {
    event.preventDefault();
    togglePause();
  }
});
touchButtons.forEach((button) => {
  button.addEventListener("click", () => {
    steer(button.dataset.direction as Direction);
  });
});

// A swipe is a convenient one-handed control on narrow screens. Keep the
// pointer listener on the board so page scrolling outside the board is native.
let swipeStart: Point | null = null;
gameMount.addEventListener("pointerdown", (event) => {
  swipeStart = { x: event.clientX, y: event.clientY };
}, { passive: true });
gameMount.addEventListener("pointerup", (event) => {
  if (!swipeStart) return;
  const dx = event.clientX - swipeStart.x;
  const dy = event.clientY - swipeStart.y;
  swipeStart = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
  steer(Math.abs(dx) > Math.abs(dy)
    ? dx > 0 ? "right" : "left"
    : dy > 0 ? "down" : "up");
}, { passive: true });
gameMount.addEventListener("pointercancel", () => {
  swipeStart = null;
}, { passive: true });
startButton.addEventListener("click", start);
pauseButton.addEventListener("click", togglePause);

// Show the initial board in a ready state; no frame loop runs until the player starts.
body = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }];
fromBody = body;
updateWorkload();
render();
