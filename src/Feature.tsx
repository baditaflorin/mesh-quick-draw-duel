import { useEffect, useMemo, useRef, useState } from "react";
import {
  MeshButton,
  MeshNameInput,
  MeshPresence,
  MeshStatusPill,
  MeshSurface,
  useNamedPeer,
  usePerPeerValue,
  useSharedStrokes,
  useSharedTimer,
  type MeshConfig,
  type YRoom,
} from "@baditaflorin/mesh-common";

type Props = { room: YRoom | null; config: MeshConfig };
type RoundResult = { finishedAt: number; marks: number };

const ROUND_MS = 30_000;

export function isValidResult(value: unknown): value is RoundResult {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as Record<string, unknown>).finishedAt === "number" &&
    Number.isFinite((value as Record<string, unknown>).finishedAt) &&
    typeof (value as Record<string, unknown>).marks === "number" &&
    Number.isInteger((value as Record<string, unknown>).marks) &&
    ((value as Record<string, unknown>).marks as number) > 0
  );
}

export function fmt(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `0:${String(seconds).padStart(2, "0")}`;
}

function timerCopy(state: "idle" | "running" | "paused" | "finished") {
  switch (state) {
    case "running":
      return { tone: "live" as const, label: "Round in progress" };
    case "finished":
      return { tone: "success" as const, label: "Round complete" };
    case "paused":
      return { tone: "warning" as const, label: "Round paused" };
    default:
      return { tone: "neutral" as const, label: "Ready when you are" };
  }
}

export function Feature({ room, config }: Props) {
  const named = useNamedPeer(config, room);
  const timer = useSharedTimer(room, "mesh-quick-draw-duel:timer", {
    durationMs: ROUND_MS,
  });
  const strokes = useSharedStrokes(room, {
    key: "mesh-quick-draw-duel:strokes",
    color: "#e7b851",
    width: 6,
  });
  const results = usePerPeerValue<RoundResult | null>(room, "mesh-quick-draw-duel:results", null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState<number[]>([]);
  const active = timer.state === "running";
  const mine = isValidResult(results.my) ? results.my : null;
  const round = timerCopy(timer.state);
  const peerCount = room?.peerCount ?? 0;

  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (context) {
      strokes.replay(context, { clear: true, width: 640, height: 330 });
    }
  }, [strokes.strokes]);

  const myMarks = room
    ? strokes.strokes.filter((stroke) => stroke.peerId === room.peerId).length
    : 0;
  const board = useMemo(
    () =>
      results.entries
        .filter((entry): entry is [string, RoundResult] => isValidResult(entry[1]))
        .sort((a, b) => a[1].finishedAt - b[1].finishedAt),
    [results.entries],
  );
  const winner = board[0];

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return [
      (event.clientX - rect.left) * (640 / rect.width),
      (event.clientY - rect.top) * (330 / rect.height),
    ];
  };

  const startRound = () => {
    strokes.clear();
    results.clearMy();
    timer.start(ROUND_MS);
  };

  const finishDrawing = () => {
    if (!mine && myMarks > 0) {
      results.setMy({ finishedAt: Date.now(), marks: myMarks });
    }
  };

  const stamp = (shape: "star" | "line") => {
    if (!active || mine) return;
    const base =
      shape === "star"
        ? [250, 80, 280, 180, 180, 120, 320, 120, 220, 180, 250, 80]
        : [160, 160, 470, 160];
    strokes.add(base);
  };

  const stageAction = !active ? (
    <MeshButton
      className="quick-draw-stage-action"
      size="lg"
      fullWidth
      onClick={startRound}
      disabled={!room}
    >
      {timer.state === "finished" ? "Start a fresh round" : "Start 30-second round"}
    </MeshButton>
  ) : (
    <MeshButton
      className="quick-draw-stage-action"
      size="lg"
      fullWidth
      onClick={finishDrawing}
      disabled={!room || !!mine || myMarks === 0}
    >
      {mine ? "Drawing locked" : "Finish my drawing"}
    </MeshButton>
  );

  return (
    <main className="quick-draw-page">
      <header className="quick-draw-intro">
        <div>
          <p className="quick-draw-eyebrow">Shared sketch sprint</p>
          <h1>Draw first. Finish clean.</h1>
          <p className="quick-draw-lede">
            A thirty-second shared canvas where every mark lands in the same room.
          </p>
        </div>
        <div className="quick-draw-signals" aria-label="Duel room status">
          <MeshStatusPill tone={round.tone} dot>
            {round.label}
          </MeshStatusPill>
          <MeshPresence
            count={peerCount}
            label="devices in this duel"
            state={room ? "connected" : "connecting"}
          />
        </div>
      </header>

      <section className="quick-draw-workspace" aria-label="Quick Draw workspace">
        <MeshSurface
          as="section"
          tone="raised"
          padding="lg"
          className="quick-draw-round"
          aria-labelledby="round-heading"
        >
          <div className="quick-draw-round-topline">
            <p className="quick-draw-eyebrow">Round clock</p>
            <MeshStatusPill tone={round.tone} dot>
              {active ? "Live" : timer.state === "finished" ? "Closed" : "On deck"}
            </MeshStatusPill>
          </div>
          <h2 id="round-heading">Make one deliberate mark.</h2>
          <div
            className="quick-draw-clock"
            aria-label={`Time ${active ? "remaining" : "available"}`}
          >
            <span>{active ? "time remaining" : "shared window"}</span>
            <strong>{active ? fmt(timer.remainingMs ?? 0) : "0:30"}</strong>
          </div>
          <div className="quick-draw-name">
            <MeshNameInput
              label="Your name"
              value={named.name}
              onChange={named.setName}
              placeholder="Duelist name"
              maxLength={32}
            />
          </div>
          {stageAction}
          {active ? (
            <p className="quick-draw-helper" role="status">
              {mine
                ? "Your finish is sealed. Watch the shared wall fill in."
                : "Draw with a pointer, or add an accessible mark below."}
            </p>
          ) : (
            <p className="quick-draw-helper" role="status">
              {room
                ? "Everyone sees the same clock when the round opens."
                : "Connecting to your shared canvas…"}
            </p>
          )}
          {active ? (
            <div className="quick-draw-stamps" aria-label="Accessible drawing controls">
              <MeshButton variant="secondary" onClick={() => stamp("star")} disabled={!!mine}>
                Add star mark
              </MeshButton>
              <MeshButton variant="secondary" onClick={() => stamp("line")} disabled={!!mine}>
                Add line mark
              </MeshButton>
            </div>
          ) : null}
        </MeshSurface>

        <MeshSurface
          as="section"
          tone="accent"
          padding="lg"
          className="quick-draw-canvas-card"
          aria-labelledby="canvas-heading"
        >
          <div className="quick-draw-canvas-heading">
            <div>
              <p className="quick-draw-eyebrow">Live sheet</p>
              <h2 id="canvas-heading">The shared drawing wall</h2>
            </div>
            <span className="quick-draw-mark-count">
              {strokes.strokes.length} {strokes.strokes.length === 1 ? "mark" : "marks"}
            </span>
          </div>
          <div className="quick-draw-canvas-wrap">
            <canvas
              ref={canvas}
              width={640}
              height={330}
              aria-label="Drawing wall. Use the accessible mark buttons if drawing with a pointer is unavailable."
              onPointerDown={(event) => {
                if (!active || mine) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                setDrawing(point(event));
              }}
              onPointerMove={(event) => {
                if (drawing.length) setDrawing([...drawing, ...point(event)]);
              }}
              onPointerUp={() => {
                if (drawing.length >= 4) strokes.add(drawing);
                setDrawing([]);
              }}
              onPointerCancel={() => setDrawing([])}
            />
            {!active && strokes.strokes.length === 0 ? (
              <div className="quick-draw-canvas-empty" aria-hidden="true">
                <span>30</span>
                <p>The wall wakes up with the next shared round.</p>
              </div>
            ) : null}
          </div>
          <p className="quick-draw-canvas-note">
            Marks sync in the room. The finish order is visible to everyone.
          </p>
        </MeshSurface>
      </section>

      <MeshSurface
        as="section"
        tone="quiet"
        padding="lg"
        className="quick-draw-results"
        aria-labelledby="results-heading"
      >
        <div>
          <p className="quick-draw-eyebrow">Fair finish order</p>
          <h2 id="results-heading">
            {winner
              ? `${named.nameOf(winner[0]) || `Duelist ${winner[0].slice(0, 5)}`} leads this round`
              : "A clean finish sets the order"}
          </h2>
        </div>
        {board.length ? (
          <ol>
            {board.map(([id, result], index) => (
              <li key={id}>
                <span className="quick-draw-rank">{String(index + 1).padStart(2, "0")}</span>
                <strong>{named.nameOf(id) || `Duelist ${id.slice(0, 5)}`}</strong>
                <small>
                  {result.marks} {result.marks === 1 ? "mark" : "marks"} · finish confirmed
                </small>
              </li>
            ))}
          </ol>
        ) : (
          <p className="quick-draw-empty">A validated finish needs at least one shared mark.</p>
        )}
      </MeshSurface>
    </main>
  );
}
