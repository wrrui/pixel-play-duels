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
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => onCellPress(r, c)}
                className={cn(
                  "relative aspect-square rounded-md border text-center font-semibold",
                  "transition-transform duration-150 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-ring",
                  isP1 && "bg-primary text-primary-foreground border-primary/60",
                  isP2 && "bg-brand text-primary-foreground border-[color:hsl(var(--brand))]/60",
                  !cell.owner && "bg-muted text-foreground border-border",
                  mine ? "hover-scale" : "opacity-60 cursor-not-allowed"
                )}
                disabled={!mine}
                aria-label={`Cell ${r + 1},${c + 1} ${cell.owner ?? 'empty'} with ${cell.count}`}
              >
                <span className="pointer-events-none absolute inset-0 grid place-items-center text-lg">
                  {cell.count}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChainBoard;
