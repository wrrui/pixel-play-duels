import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Instagram, Bot, Users2, RefreshCcw, Play, Pause, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import ChainBoard, { Player } from "@/components/game/ChainBoard";

// Chain Reaction style game
export interface Cell { owner: Player | null; count: number }

type Mode = "bot" | "human";

const DEFAULT_SIZE = 9; // odd for nice symmetry

const neighbors = (r: number, c: number, n: number): [number, number][] => {
  const res: [number, number][] = [];
  if (r > 0) res.push([r - 1, c]);
  if (r < n - 1) res.push([r + 1, c]);
  if (c > 0) res.push([r, c - 1]);
  if (c < n - 1) res.push([r, c + 1]);
  return res;
};

const capacityAt = (r: number, c: number, n: number) => neighbors(r, c, n).length; // 2 corner, 3 edge, 4 interior

const cloneGrid = (g: Cell[][]) => g.map((row) => row.map((c) => ({ ...c })));

const createGrid = (size: number): Cell[][] => {
  const grid: Cell[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ owner: null, count: 0 }))
  );
  const mid = Math.floor(size / 2);
  // Start with 3 points each on interior cells so pressing will pop as per request
  const p1Start: [number, number] = [mid, Math.max(1, mid - 2)];
  const p2Start: [number, number] = [mid, Math.min(size - 2, mid + 2)];
  grid[p1Start[0]][p1Start[1]] = { owner: "P1", count: 3 };
  grid[p2Start[0]][p2Start[1]] = { owner: "P2", count: 3 };
  return grid;
};

function simulatePlace(orig: Cell[][], r: number, c: number, player: Player) {
  const n = orig.length;
  const grid = cloneGrid(orig);
  const target = grid[r][c];
  if (!(target.owner === player || target.owner === null)) return { grid, changed: false };
  target.owner = player;
  target.count += 1;
  const queue: [number, number][] = [];
  if (target.count >= capacityAt(r, c, n)) queue.push([r, c]);

  while (queue.length) {
    const [cr, cc] = queue.shift()!;
    const cap = capacityAt(cr, cc, n);
    if (grid[cr][cc].count < cap) continue;
    // explode
    grid[cr][cc].count -= cap;
    const neigh = neighbors(cr, cc, n);
    for (const [nr, nc] of neigh) {
      grid[nr][nc].count += 1;
      grid[nr][nc].owner = player;
      const ncap = capacityAt(nr, nc, n);
      if (grid[nr][nc].count >= ncap) queue.push([nr, nc]);
    }
  }
  return { grid, changed: true };
}

const Index: React.FC = () => {
  const [mode, setMode] = useState<Mode>("bot");
  const [size, setSize] = useState<number>(DEFAULT_SIZE);
  const [grid, setGrid] = useState<Cell[][]>(() => createGrid(DEFAULT_SIZE));
  const [turn, setTurn] = useState<Player>("P1");
  const [winner, setWinner] = useState<Player | "draw" | null>(null);

  // Background music controller
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { document.title = "Color Wars – Chain Reaction | Created by Adam"; }, []);

  const countOwned = useCallback((player: Player) => {
    let cells = 0, orbs = 0;
    for (const row of grid) for (const cell of row) if (cell.owner === player) { cells++; orbs += cell.count; }
    return { cells, orbs };
  }, [grid]);

  useEffect(() => {
    // win: opponent has no cells
    const p1 = countOwned("P1").cells;
    const p2 = countOwned("P2").cells;
    if (p1 > 0 && p2 === 0) setWinner("P1");
    else if (p2 > 0 && p1 === 0) setWinner("P2");
  }, [grid, countOwned]);

  const reset = (newSize = size) => {
    setGrid(createGrid(newSize));
    setWinner(null);
    setTurn("P1");
  };

  const onCellPress = (r: number, c: number) => {
    if (winner) return;
    const cell = grid[r][c];
    if (!(cell.owner === turn || cell.owner === null)) return; // illegal
    const { grid: next } = simulatePlace(grid, r, c, turn);
    setGrid(next);
    setTurn((t) => (t === "P1" ? "P2" : "P1"));
  };

  // Bot chooses move that maximizes (bot orbs - opponent orbs)
  useEffect(() => {
    if (mode !== "bot" || turn !== "P2" || winner) return;
    const legal: [number, number][] = [];
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        if (grid[r][c].owner === "P2" || grid[r][c].owner === null) legal.push([r, c]);

    let bestScore = -Infinity;
    let bestMove = legal[0] ?? [0, 0];
    for (const [r, c] of legal) {
      const { grid: g2 } = simulatePlace(grid, r, c, "P2");
      const score = g2.flat().reduce((acc, cell) => acc + (cell.owner === "P2" ? cell.count : cell.owner === "P1" ? -cell.count : 0), 0);
      if (score > bestScore) { bestScore = score; bestMove = [r, c]; }
    }
    const t = setTimeout(() => {
      const { grid: next } = simulatePlace(grid, bestMove[0], bestMove[1], "P2");
      setGrid(next);
      setTurn("P1");
    }, 450);
    return () => clearTimeout(t);
  }, [mode, turn, grid, size, winner]);

  // Music controls
  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else {
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  const colorButtons = useMemo(() => [7, 9, 11, 13], []);
  const instaUrl = "https://www.instagram.com/a.d.a.m_c.h?igsh=MW9lZXBpbXV1eXJraA%3D%3D&utm_source=qr";

  const p1Stats = countOwned("P1");
  const p2Stats = countOwned("P2");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex items-center justify-between py-4">
          <a href={instaUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-ring rounded-md px-2 py-1 hover:opacity-90 transition-opacity" aria-label="Visit Adam's Instagram">
            <Instagram className="text-foreground" />
            <span className="font-semibold">@a.d.a.m_c.h</span>
          </a>
          <div className="text-sm text-muted-foreground">Created by Adam</div>
        </div>
      </header>

      <main className="container py-6">
        <article className="mx-auto max-w-6xl">
          <h1 className="mb-4 text-center font-display text-3xl font-bold tracking-tight md:text-4xl">Color Wars – Chain Reaction</h1>
          <p className="mx-auto mb-6 max-w-2xl text-center text-muted-foreground">Tap your cells to pop when full and claim adjacent squares. Chain explosions to take over the board. Win when your opponent has no cells left!</p>

          <section className="grid gap-6 md:grid-cols-[1.2fr,0.8fr]">
            <Card>
              <CardContent className="p-3 sm:p-4">
                <ChainBoard grid={grid} onCellPress={onCellPress} turn={turn} />
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="animate-enter">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {mode === "bot" ? <Bot className="text-brand" /> : <Users2 className="text-primary" />}
                      <span className="text-sm text-muted-foreground">Mode</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant={mode === "bot" ? "brand" : "outlineBrand"} size="sm" onClick={() => setMode("bot")}>VS Bot</Button>
                      <Button variant={mode === "human" ? "brand" : "outlineBrand"} size="sm" onClick={() => setMode("human")}>VS Human</Button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 items-center gap-2">
                    <div className="text-sm text-muted-foreground">Grid Size</div>
                    <Select value={String(size)} onValueChange={(v) => { const s = Number(v); setSize(s); reset(s); }}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Size" /></SelectTrigger>
                      <SelectContent>
                        {colorButtons.map((s) => (
                          <SelectItem key={s} value={String(s)}>{s} × {s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="text-sm text-muted-foreground">Actions</div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => reset()}>
                        <RefreshCcw className="mr-2" /> New Game
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 rounded-md border p-3">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium">Turn</span>
                      <span className={turn === "P1" ? "text-primary" : "text-brand"}>{turn === "P1" ? "Player 1" : mode === "bot" ? "Bot" : "Player 2"}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-md border p-3 text-center">
                        <div className="text-xs uppercase text-muted-foreground">Player 1</div>
                        <div className="text-lg font-bold text-primary">{p1Stats.cells} cells · {p1Stats.orbs} pts</div>
                      </div>
                      <div className="rounded-md border p-3 text-center">
                        <div className="text-xs uppercase text-muted-foreground">{mode === "bot" ? "Bot" : "Player 2"}</div>
                        <div className="text-lg font-bold text-brand">{p2Stats.cells} cells · {p2Stats.orbs} pts</div>
                      </div>
                    </div>
                  </div>

                  {winner && (
                    <div className="mt-4 rounded-md border bg-secondary p-3 text-center">
                      <div className="text-sm font-medium">
                        {winner === "draw" ? "It's a draw!" : winner === "P1" ? "Player 1 wins!" : mode === "bot" ? "Bot wins!" : "Player 2 wins!"}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="animate-enter">
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Music className="text-brand" />
                    <span className="text-sm text-muted-foreground">Background Music (add a Wegz song URL)</span>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      placeholder="Paste Wegz song MP3 URL here"
                      value={audioUrl}
                      onChange={(e) => setAudioUrl(e.target.value)}
                    />
                    <Button
                      variant={playing ? "brand" : "outlineBrand"}
                      onClick={() => {
                        if (audioRef.current && audioUrl) {
                          audioRef.current.src = audioUrl;
                        }
                        togglePlay();
                      }}
                    >
                      {playing ? <><Pause className="mr-2" /> Pause</> : <><Play className="mr-2" /> Play</>}
                    </Button>
                  </div>
                  <audio ref={audioRef} loop preload="none" />
                  <p className="mt-2 text-xs text-muted-foreground">Tip: Due to mobile autoplay policies, press Play after placing your first move.</p>
                </CardContent>
              </Card>
            </div>
          </section>
        </article>
      </main>

      <footer className="border-t">
        <div className="container flex items-center justify-between py-6">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Color Wars · Created by Adam</p>
          <a href={instaUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover-scale">
            <Instagram className="text-brand" />
            <span className="story-link">Follow on Instagram</span>
          </a>
        </div>
      </footer>
    </div>
  );
};

export default Index;
