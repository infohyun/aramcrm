"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw, Trophy } from "lucide-react";

type Board = number[][];

function createEmptyBoard(): Board {
  return Array.from({ length: 4 }, () => Array(4).fill(0));
}

function addRandomTile(board: Board): Board {
  const newBoard = board.map((row) => [...row]);
  const empty: [number, number][] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (newBoard[r][c] === 0) empty.push([r, c]);
    }
  }
  if (empty.length === 0) return newBoard;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  newBoard[r][c] = Math.random() < 0.9 ? 2 : 4;
  return newBoard;
}

function rotateBoard(board: Board): Board {
  const n = board.length;
  const rotated = createEmptyBoard();
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      rotated[c][n - 1 - r] = board[r][c];
    }
  }
  return rotated;
}

function slideLeft(board: Board): { board: Board; score: number; moved: boolean } {
  let score = 0;
  let moved = false;
  const newBoard = createEmptyBoard();

  for (let r = 0; r < 4; r++) {
    const row = board[r].filter((v) => v !== 0);
    const merged: number[] = [];
    let i = 0;
    while (i < row.length) {
      if (i + 1 < row.length && row[i] === row[i + 1]) {
        merged.push(row[i] * 2);
        score += row[i] * 2;
        i += 2;
      } else {
        merged.push(row[i]);
        i++;
      }
    }
    for (let c = 0; c < 4; c++) {
      newBoard[r][c] = merged[c] || 0;
      if (newBoard[r][c] !== board[r][c]) moved = true;
    }
  }
  return { board: newBoard, score, moved };
}

function move(board: Board, direction: "left" | "right" | "up" | "down"): { board: Board; score: number; moved: boolean } {
  let rotated = board;
  const rotations = { left: 0, down: 1, right: 2, up: 3 };
  const times = rotations[direction];

  for (let i = 0; i < times; i++) rotated = rotateBoard(rotated);
  const result = slideLeft(rotated);
  let finalBoard = result.board;
  for (let i = 0; i < (4 - times) % 4; i++) finalBoard = rotateBoard(finalBoard);

  return { board: finalBoard, score: result.score, moved: result.moved };
}

function canMove(board: Board): boolean {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === 0) return true;
      if (c + 1 < 4 && board[r][c] === board[r][c + 1]) return true;
      if (r + 1 < 4 && board[r][c] === board[r + 1][c]) return true;
    }
  }
  return false;
}

function hasWon(board: Board): boolean {
  return board.some((row) => row.some((v) => v >= 2048));
}

const TILE_COLORS: Record<number, string> = {
  0: "bg-white/[0.03]",
  2: "bg-amber-900/40 text-amber-200",
  4: "bg-amber-800/50 text-amber-200",
  8: "bg-orange-700/60 text-orange-100",
  16: "bg-orange-600/70 text-orange-50",
  32: "bg-red-600/70 text-red-50",
  64: "bg-red-500/80 text-red-50",
  128: "bg-yellow-500/70 text-yellow-50",
  256: "bg-yellow-400/70 text-yellow-950",
  512: "bg-yellow-300/80 text-yellow-950",
  1024: "bg-yellow-200/80 text-yellow-950",
  2048: "bg-yellow-100/90 text-yellow-950",
};

function getTileColor(value: number): string {
  return TILE_COLORS[value] || "bg-purple-500/80 text-white";
}

function getTileSize(value: number): string {
  if (value >= 1024) return "text-lg font-bold";
  if (value >= 128) return "text-xl font-bold";
  return "text-2xl font-bold";
}

export default function Puzzle2048Page() {
  const [board, setBoard] = useState<Board>(createEmptyBoard);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [keepPlaying, setKeepPlaying] = useState(false);

  const initGame = useCallback(() => {
    let b = createEmptyBoard();
    b = addRandomTile(b);
    b = addRandomTile(b);
    setBoard(b);
    setScore(0);
    setGameOver(false);
    setWon(false);
    setKeepPlaying(false);
  }, []);

  useEffect(() => {
    initGame();
    const saved = localStorage.getItem("best2048");
    if (saved) setBestScore(parseInt(saved));
  }, [initGame]);

  const handleMove = useCallback(
    (direction: "left" | "right" | "up" | "down") => {
      if (gameOver) return;
      if (won && !keepPlaying) return;

      const result = move(board, direction);
      if (!result.moved) return;

      const newBoard = addRandomTile(result.board);
      const newScore = score + result.score;
      setBoard(newBoard);
      setScore(newScore);

      if (newScore > bestScore) {
        setBestScore(newScore);
        localStorage.setItem("best2048", newScore.toString());
      }

      if (!keepPlaying && hasWon(newBoard)) {
        setWon(true);
      }

      if (!canMove(newBoard)) {
        setGameOver(true);
      }
    },
    [board, score, bestScore, gameOver, won, keepPlaying]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap: Record<string, "left" | "right" | "up" | "down"> = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
        a: "left",
        d: "right",
        w: "up",
        s: "down",
      };
      const dir = keyMap[e.key];
      if (dir) {
        e.preventDefault();
        handleMove(dir);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleMove]);

  // Touch support
  useEffect(() => {
    let startX = 0;
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (Math.max(absDx, absDy) < 30) return;
      if (absDx > absDy) {
        handleMove(dx > 0 ? "right" : "left");
      } else {
        handleMove(dy > 0 ? "down" : "up");
      }
    };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleMove]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/games"
            className="rounded-lg p-2 text-white/40 transition hover:bg-white/[0.06] hover:text-white/70"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">2048</h1>
            <p className="text-xs text-white/40">
              방향키 또는 WASD로 타일을 합치세요
            </p>
          </div>
        </div>
        <button
          onClick={initGame}
          className="flex items-center gap-2 rounded-lg bg-white/[0.06] px-4 py-2 text-sm text-white/70 transition hover:bg-white/[0.1] hover:text-white"
        >
          <RotateCcw size={16} />
          새 게임
        </button>
      </div>

      {/* Score */}
      <div className="flex gap-4">
        <div className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
          <p className="text-xs text-white/40">점수</p>
          <p className="text-2xl font-bold text-amber-400">
            {score.toLocaleString()}
          </p>
        </div>
        <div className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
          <p className="text-xs text-white/40">최고 점수</p>
          <p className="flex items-center justify-center gap-1 text-2xl font-bold text-yellow-300">
            <Trophy size={18} />
            {bestScore.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Board */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="grid grid-cols-4 gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
            {board.flat().map((value, i) => (
              <div
                key={i}
                className={`flex h-20 w-20 items-center justify-center rounded-xl transition-all duration-150 sm:h-24 sm:w-24 ${getTileColor(
                  value
                )} ${value ? "scale-100" : "scale-95"}`}
              >
                {value > 0 && (
                  <span className={getTileSize(value)}>
                    {value}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Game Over Overlay */}
          {gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-black/70 backdrop-blur-sm">
              <p className="mb-2 text-3xl font-bold text-white">
                게임 오버!
              </p>
              <p className="mb-4 text-lg text-white/60">
                점수: {score.toLocaleString()}
              </p>
              <button
                onClick={initGame}
                className="rounded-lg bg-amber-500 px-6 py-2 font-medium text-white transition hover:bg-amber-600"
              >
                다시 하기
              </button>
            </div>
          )}

          {/* Win Overlay */}
          {won && !keepPlaying && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-black/70 backdrop-blur-sm">
              <p className="mb-2 text-3xl font-bold text-yellow-400">
                축하합니다! 🎉
              </p>
              <p className="mb-4 text-lg text-white/60">2048을 달성했습니다!</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setKeepPlaying(true)}
                  className="rounded-lg bg-white/10 px-6 py-2 font-medium text-white transition hover:bg-white/20"
                >
                  계속 플레이
                </button>
                <button
                  onClick={initGame}
                  className="rounded-lg bg-amber-500 px-6 py-2 font-medium text-white transition hover:bg-amber-600"
                >
                  새 게임
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls Info */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <h3 className="mb-2 text-sm font-medium text-white/60">조작법</h3>
        <div className="grid grid-cols-2 gap-2 text-xs text-white/40">
          <p>⬆️ ⬇️ ⬅️ ➡️ 방향키로 이동</p>
          <p>W A S D 키로도 이동 가능</p>
          <p>같은 숫자 타일을 합쳐 2048을 만드세요</p>
          <p>모바일: 스와이프로 조작</p>
        </div>
      </div>
    </div>
  );
}
