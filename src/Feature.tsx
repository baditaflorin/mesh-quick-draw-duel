import { useEffect, useMemo, useRef, useState } from "react";
import {
  MeshNameInput,
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
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `0:${String(s).padStart(2, "0")}`;
}
export function Feature({ room, config }: Props) {
  const named = useNamedPeer(config, room);
  const timer = useSharedTimer(room, "mesh-quick-draw-duel:timer", { durationMs: ROUND_MS });
  const strokes = useSharedStrokes(room, {
    key: "mesh-quick-draw-duel:strokes",
    color: "#71c9ce",
    width: 6,
  });
  const results = usePerPeerValue<RoundResult | null>(room, "mesh-quick-draw-duel:results", null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState<number[]>([]);
  const active = timer.state === "running";
  const mine = isValidResult(results.my) ? results.my : null;
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx) strokes.replay(ctx, { clear: true, width: 640, height: 330 });
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
  const stamp = (shape: "star" | "line") => {
    if (!active || mine) return;
    const base =
      shape === "star"
        ? [250, 80, 280, 180, 180, 120, 320, 120, 220, 180, 250, 80]
        : [160, 160, 470, 160];
    strokes.add(base);
  };
  return (
    <main className="duel-page">
      <header>
        <p className="eyebrow">Quick draw duel</p>
        <h1>Thirty seconds. Make your mark.</h1>
        <div className="timer" aria-live="polite">
          <span>{active ? "time left" : timer.state === "finished" ? "round ended" : "ready"}</span>
          <strong>
            {active ? fmt(timer.remainingMs ?? 0) : timer.state === "finished" ? "Done" : "0:30"}
          </strong>
        </div>
        <p role="status">
          {room
            ? `Connected with ${room.peerCount} peer${room.peerCount === 1 ? "" : "s"}`
            : "Connecting to duel room…"}
        </p>
      </header>
      <section className="duel-grid">
        <section className="card controls">
          <p className="eyebrow">Your turn</p>
          <MeshNameInput
            label="Your name"
            value={named.name}
            onChange={named.setName}
            placeholder="Duelist name"
            maxLength={32}
          />
          {!active ? (
            <button
              className="primary"
              type="button"
              onClick={() => {
                strokes.clear();
                timer.start(ROUND_MS);
              }}
              disabled={!room}
            >
              {timer.state === "finished" ? "Start a fresh round" : "Start shared round"}
            </button>
          ) : (
            <>
              <button
                className="primary"
                type="button"
                onClick={() =>
                  !mine && myMarks > 0 && results.setMy({ finishedAt: Date.now(), marks: myMarks })
                }
                disabled={!room || !!mine || myMarks === 0}
              >
                {mine ? "Finished ✓" : "Finish my drawing"}
              </button>
              <p role="status">
                {mine
                  ? "Your result is sealed once, keeping the finish order honest."
                  : "Draw with a pointer, or use the keyboard-safe stamps below."}
              </p>
              <div className="fallback" aria-label="Accessible drawing fallback">
                <button type="button" onClick={() => stamp("star")} disabled={!!mine}>
                  Add star stamp
                </button>
                <button type="button" onClick={() => stamp("line")} disabled={!!mine}>
                  Add line stamp
                </button>
              </div>
            </>
          )}
        </section>
        <section className="card canvas-card">
          <p className="eyebrow">Shared drawing wall</p>
          <canvas
            ref={canvas}
            width={640}
            height={330}
            aria-label="Drawing wall. Use the stamp buttons if drawing with a pointer is unavailable."
            onPointerDown={(e) => {
              if (!active || mine) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              setDrawing(point(e));
            }}
            onPointerMove={(e) => {
              if (drawing.length) setDrawing([...drawing, ...point(e)]);
            }}
            onPointerUp={() => {
              if (drawing.length >= 4) strokes.add(drawing);
              setDrawing([]);
            }}
          />
          <p className="canvas-note">{strokes.strokes.length} validated marks shared</p>
        </section>
      </section>
      <section className="card result" aria-labelledby="result-heading">
        <p className="eyebrow">Fair finish order</p>
        <h2 id="result-heading">
          {winner
            ? `${named.nameOf(winner[0]) || `Duelist ${winner[0].slice(0, 5)}`} wins this round`
            : "Finish a drawing to set the order"}
        </h2>
        {board.length ? (
          <ol>
            {board.map(([id, result], index) => (
              <li key={id}>
                <span>{index + 1}</span>
                <strong>{named.nameOf(id) || `Duelist ${id.slice(0, 5)}`}</strong>
                <small>
                  {result.marks} mark{result.marks === 1 ? "" : "s"} · finished first-wins
                </small>
              </li>
            ))}
          </ol>
        ) : (
          <p className="empty">A validated result needs at least one shared mark.</p>
        )}
      </section>
    </main>
  );
}
