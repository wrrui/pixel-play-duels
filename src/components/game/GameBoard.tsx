import React from "react";
import { cn } from "@/lib/utils";

export type Player = "P1" | "P2";

export interface GameBoardProps {
  size: number;
  board: number[][]; // color index per tile
  p1Territory: Set<string>;
  p2Territory: Set<string>;
}

const TILE_GAP = 2; // px

export const GameBoard: React.FC<GameBoardProps> = ({ size, board, p1Territory, p2Territory }) => {
  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-card p-3 shadow-sm transition-transform duration-300 hover:shadow-md",
        "animate-enter"
      )}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          gap: TILE_GAP,
        }}
      >
        {board.map((row, r) =>
          row.map((colorIdx, c) => {
            const key = `${r},${c}`;
            const ownedBy = p1Territory.has(key) ? "P1" : p2Territory.has(key) ? "P2" : undefined;
            return (
              <div
                key={key}
                className={cn(
                  "relative aspect-square rounded-sm",
                  ownedBy === "P1" && "ring-2 ring-primary ring-offset-0",
                  ownedBy === "P2" && "ring-2 ring-brand ring-offset-0",
                )}
                style={{
                  backgroundColor: `hsl(var(--game-c${colorIdx + 1}))`,
                }}
              >
                {/* Ownership dot */}
                {ownedBy && (
                  <span
                    className={cn(
                      "pointer-events-none absolute h-1.5 w-1.5 rounded-full",
                      ownedBy === "P1" ? "bg-primary" : "bg-brand",
                      ownedBy === "P1" ? "top-1 left-1" : "bottom-1 right-1"
                    )}
                    aria-hidden
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default GameBoard;
