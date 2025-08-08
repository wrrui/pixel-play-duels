import React from "react";
import { cn } from "@/lib/utils";

export type Player = "P1" | "P2";

export interface Cell {
  owner: Player | null;
  count: number;
}

interface ChainBoardProps {
  grid: Cell[][];
  onCellPress: (r: number, c: number) => void;
  turn: Player;
}

const TILE_GAP = 4;

const dotPositions: Record<number, Array<{ left: string; top: string }>> = {
  1: [{ left: "50%", top: "50%" }],
  2: [
    { left: "35%", top: "50%" },
    { left: "65%", top: "50%" },
  ],
  3: [
    { left: "32%", top: "35%" },
    { left: "68%", top: "35%" },
    { left: "50%", top: "68%" },
  ],
};

const ChainBoard: React.FC<ChainBoardProps> = ({ grid, onCellPress, turn }) => {
  const size = grid.length;
  return (
    <div className={cn("rounded-xl border bg-card p-3 shadow-sm animate-enter")}
    >
      <div
        className="grid touch-pan-y select-none"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, gap: TILE_GAP }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const isP1 = cell.owner === "P1";
            const isP2 = cell.owner === "P2";
            const mine = cell.owner === turn || cell.owner === null;
            const count = Math.min(cell.count, 3);
            const positions = dotPositions[count as 1 | 2 | 3] ?? [];
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => onCellPress(r, c)}
                className={cn(
                  "relative aspect-square rounded-md border bg-background/40",
                  "transition-transform duration-150 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-ring",
                  isP1 && "border-p1",
                  isP2 && "border-p2",
                  mine ? "hover-scale" : "opacity-60 cursor-not-allowed"
                )}
                disabled={!mine}
                aria-label={`Cell ${r + 1},${c + 1} ${cell.owner ?? 'empty'} with ${cell.count}`}
              >
                {/* Dots */}
                <div className="pointer-events-none absolute inset-0">
                  {positions.map((pos, i) => (
                    <span
                      key={i}
                      className={cn(
                        "absolute block h-3 w-3 rounded-full shadow-sm md:h-3.5 md:w-3.5",
                        isP1 ? "bg-p1" : isP2 ? "bg-p2" : "bg-muted"
                      )}
                      style={{
                        left: `calc(${pos.left} - 0.5rem)`,
                        top: `calc(${pos.top} - 0.5rem)`,
                      }}
                    />
                  ))}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChainBoard;
