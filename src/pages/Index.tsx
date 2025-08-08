import React, { useEffect, useMemo, useState } from "react";
import { Instagram, Bot, Users2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GameBoard from "@/components/game/GameBoard";

// Game types
type Player = "P1" | "P2";

type Mode = "bot" | "human";

const DEFAULT_SIZE = 12;
const COLORS_COUNT = 6; // game-c1..game-c6

const keyFrom = (r: number, c: number) => `${r},${c}`;
const parseKey = (k: string) => k.split(",").map(Number) as [number, number];

const neighbors = (r: number, c: number, n: number): [number, number][] => {
  const res: [number, number][] = [];
  if (r > 0) res.push([r - 1, c]);
  if (r < n - 1) res.push([r + 1, c]);
  if (c > 0) res.push([r, c - 1]);
  if (c < n - 1) res.push([r, c + 1]);
  return res;
};

function createBoard(size: number): number[][] {
  // random colors 0..COLORS_COUNT-1, ensure corners differ
  const b = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => Math.floor(Math.random() * COLORS_COUNT))
  );
  if (b[0][0] === b[size - 1][size - 1]) {
    // adjust bottom-right until different
    let newColor = Math.floor(Math.random() * COLORS_COUNT);
    while (newColor === b[0][0]) newColor = Math.floor(Math.random() * COLORS_COUNT);
    b[size - 1][size - 1] = newColor;
  }
  return b;
}

function cloneBoard(board: number[][]) {
  return board.map((row) => row.slice());
}

function floodExpand(
  board: number[][],
  targetColor: number,
  territory: Set<string>,
  opponent: Set<string>
): Set<string> {
  const size = board.length;
  const queue: [number, number][] = Array.from(territory).map(parseKey);
  const visited = new Set<string>(territory);
  while (queue.length) {
    const [r, c] = queue.shift()!;
    for (const [nr, nc] of neighbors(r, c, size)) {
      const k = keyFrom(nr, nc);
      if (visited.has(k) || opponent.has(k)) continue;
      if (board[nr][nc] === targetColor) {
        territory.add(k);
        visited.add(k);
        queue.push([nr, nc]);
      }
    }
  }
  return territory;
}

const Index: React.FC = () => {
  const [mode, setMode] = useState<Mode>("bot");
  const [size, setSize] = useState<number>(DEFAULT_SIZE);
  const [board, setBoard] = useState<number[][]>(() => createBoard(DEFAULT_SIZE));
  const [p1Color, setP1Color] = useState<number>(() => board[0][0]);
  const [p2Color, setP2Color] = useState<number>(() => board[DEFAULT_SIZE - 1][DEFAULT_SIZE - 1]);
  const [p1, setP1] = useState<Set<string>>(() => new Set([keyFrom(0, 0)]));
  const [p2, setP2] = useState<Set<string>>(() => new Set([keyFrom(DEFAULT_SIZE - 1, DEFAULT_SIZE - 1)]));
  const [turn, setTurn] = useState<Player>("P1");
  const [winner, setWinner] = useState<Player | "draw" | null>(null);

  // SEO title
  useEffect(() => {
    document.title = "Color Wars – 2-Player & VS Bot | Created by Adam";
  }, []);

  const totalTiles = size * size;
  const p1Count = p1.size;
  const p2Count = p2.size;

  const isFinished = winner !== null || p1Count + p2Count === totalTiles;

  useEffect(() => {
    if (p1Count + p2Count === totalTiles && winner === null) {
      if (p1Count === p2Count) setWinner("draw");
      else setWinner(p1Count > p2Count ? "P1" : "P2");
    }
  }, [p1Count, p2Count, totalTiles, winner]);

  // Reset when size changes
  const resetGame = (newSize = size) => {
    const b = createBoard(newSize);
    setBoard(b);
    setP1(new Set([keyFrom(0, 0)]));
    setP2(new Set([keyFrom(newSize - 1, newSize - 1)]));
    setP1Color(b[0][0]);
    setP2Color(b[newSize - 1][newSize - 1]);
    setTurn("P1");
    setWinner(null);
  };

  // Allowed colors for a player
  const allowedColors = (player: Player) => {
    const current = player === "P1" ? p1Color : p2Color;
    const other = player === "P1" ? p2Color : p1Color;
    return Array.from({ length: COLORS_COUNT }, (_, i) => i).filter((c) => c !== current && c !== other);
  };

  // Apply a move for the current player
  const applyMove = (color: number, player: Player, fromBot = false) => {
    if (isFinished) return;
    // disallow invalid
    if (!allowedColors(player).includes(color)) return;

    setBoard((prev) => {
      const nb = cloneBoard(prev);
      if (player === "P1") {
        // repaint territory first
        for (const k of p1) {
          const [r, c] = parseKey(k);
          nb[r][c] = color;
        }
        // expand territory
        const newTerritory = new Set(p1);
        floodExpand(nb, color, newTerritory, p2);
        // repaint newly added
        for (const k of newTerritory) {
          const [r, c] = parseKey(k);
          nb[r][c] = color;
        }
        setP1(newTerritory);
        setP1Color(color);
        setTurn("P2");
      } else {
        for (const k of p2) {
          const [r, c] = parseKey(k);
          nb[r][c] = color;
        }
        const newTerritory = new Set(p2);
        floodExpand(nb, color, newTerritory, p1);
        for (const k of newTerritory) {
          const [r, c] = parseKey(k);
          nb[r][c] = color;
        }
        setP2(newTerritory);
        setP2Color(color);
        setTurn("P1");
      }
      return nb;
    });
  };

  // Bot logic (P2 is the bot)
  useEffect(() => {
    if (mode !== "bot" || turn !== "P2" || isFinished) return;
    const options = allowedColors("P2");

    // Greedy evaluation: choose color that maximizes immediate territory size
    const pick = () => {
      let bestColor = options[0];
      let bestGain = -1;
      for (const color of options) {
        const simBoard = cloneBoard(board);
        // paint current p2 territory
        const tempP2 = new Set(p2);
        for (const k of tempP2) {
          const [r, c] = parseKey(k);
          simBoard[r][c] = color;
        }
        const expanded = floodExpand(simBoard, color, new Set(tempP2), p1);
        const gain = expanded.size - p2.size;
        if (gain > bestGain) {
          bestGain = gain;
          bestColor = color;
        }
      }
      return bestColor;
    };

    const moveColor = pick();
    const t = setTimeout(() => applyMove(moveColor, "P2", true), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, turn, board, p1, p2, isFinished]);

  const colorButtons = useMemo(() => Array.from({ length: COLORS_COUNT }, (_, i) => i), []);

  const instaUrl = "https://www.instagram.com/a.d.a.m_c.h?igsh=MW9lZXBpbXV1eXJraA%3D%3D&utm_source=qr";

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

      <main className="container py-8">
        <article className="mx-auto max-w-6xl">
          <h1 className="mb-6 text-center font-display text-3xl font-bold tracking-tight md:text-4xl">
            Color Wars – 2-Player Strategy Game
          </h1>

          <section className="grid gap-6 md:grid-cols-[1.2fr,0.8fr]">
            <Card>
              <CardContent className="p-4">
                <GameBoard size={size} board={board} p1Territory={p1} p2Territory={p2} />
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
                    <Select value={String(size)} onValueChange={(v) => { const s = Number(v); setSize(s); resetGame(s); }}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Size" /></SelectTrigger>
                      <SelectContent>
                        {[10, 12, 14, 16].map((s) => (
                          <SelectItem key={s} value={String(s)}>{s} × {s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="text-sm text-muted-foreground">Actions</div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => resetGame()}>
                        <RefreshCcw className="mr-2" /> New Game
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 rounded-md border p-3">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium">Turn</span>
                      <span className={turn === "P1" ? "text-primary" : "text-brand"}>{turn === "P1" ? "Player 1" : mode === "bot" ? "Bot" : "Player 2"}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {colorButtons.map((i) => {
                        const disabled = isFinished || !allowedColors(turn).includes(i);
                        return (
                          <Button
                            key={i}
                            variant={disabled ? "secondary" : "outline"}
                            size="icon"
                            disabled={disabled}
                            onClick={() => applyMove(i, turn)}
                            className="rounded-full"
                            style={{ backgroundColor: disabled ? undefined : `hsl(var(--game-c${i + 1}))` }}
                            aria-label={`Choose color ${i + 1}`}
                            title={disabled ? "Not allowed" : "Pick this color"}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-md border p-3 text-center">
                      <div className="text-xs uppercase text-muted-foreground">Player 1</div>
                      <div className="text-2xl font-bold text-primary">{p1Count}</div>
                    </div>
                    <div className="rounded-md border p-3 text-center">
                      <div className="text-xs uppercase text-muted-foreground">{mode === "bot" ? "Bot" : "Player 2"}</div>
                      <div className="text-2xl font-bold text-brand">{p2Count}</div>
                    </div>
                  </div>

                  {isFinished && (
                    <div className="mt-4 rounded-md border bg-secondary p-3 text-center">
                      <div className="text-sm font-medium">
                        {winner === "draw" ? "It's a draw!" : winner === "P1" ? "Player 1 wins!" : mode === "bot" ? "Bot wins!" : "Player 2 wins!"}
                      </div>
                    </div>
                  )}
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
