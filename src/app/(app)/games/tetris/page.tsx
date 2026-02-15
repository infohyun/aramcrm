"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw, Trophy, Play, Pause } from "lucide-react";

const COLS = 10;
const ROWS = 20;
const CELL = 28;

type Board = number[][];
type Piece = { shape: number[][]; x: number; y: number; color: number };

const SHAPES = [
  [[1, 1, 1, 1]],                           // I
  [[1, 1], [1, 1]],                          // O
  [[0, 1, 0], [1, 1, 1]],                    // T
  [[1, 0, 0], [1, 1, 1]],                    // L
  [[0, 0, 1], [1, 1, 1]],                    // J
  [[0, 1, 1], [1, 1, 0]],                    // S
  [[1, 1, 0], [0, 1, 1]],                    // Z
];

const COLORS = [
  "transparent",
  "#06b6d4", // cyan - I
  "#eab308", // yellow - O
  "#a855f7", // purple - T
  "#f97316", // orange - L
  "#3b82f6", // blue - J
  "#22c55e", // green - S
  "#ef4444", // red - Z
];

const GHOST_COLORS = [
  "transparent",
  "rgba(6,182,212,0.15)",
  "rgba(234,179,8,0.15)",
  "rgba(168,85,247,0.15)",
  "rgba(249,115,22,0.15)",
  "rgba(59,130,246,0.15)",
  "rgba(34,197,94,0.15)",
  "rgba(239,68,68,0.15)",
];

function createBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function randomPiece(): Piece {
  const idx = Math.floor(Math.random() * SHAPES.length);
  return {
    shape: SHAPES[idx].map((r) => [...r]),
    x: Math.floor(COLS / 2) - Math.floor(SHAPES[idx][0].length / 2),
    y: 0,
    color: idx + 1,
  };
}

function rotate(shape: number[][]): number[][] {
  const rows = shape.length;
  const cols = shape[0].length;
  const rotated: number[][] = Array.from({ length: cols }, () =>
    Array(rows).fill(0)
  );
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rotated[c][rows - 1 - r] = shape[r][c];
    }
  }
  return rotated;
}

function isValid(board: Board, piece: Piece): boolean {
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (!piece.shape[r][c]) continue;
      const nx = piece.x + c;
      const ny = piece.y + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
      if (ny >= 0 && board[ny][nx]) return false;
    }
  }
  return true;
}

function placePiece(board: Board, piece: Piece): Board {
  const newBoard = board.map((r) => [...r]);
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (!piece.shape[r][c]) continue;
      const ny = piece.y + r;
      const nx = piece.x + c;
      if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
        newBoard[ny][nx] = piece.color;
      }
    }
  }
  return newBoard;
}

function clearLines(board: Board): { board: Board; cleared: number } {
  const newBoard = board.filter((row) => row.some((cell) => cell === 0));
  const cleared = ROWS - newBoard.length;
  while (newBoard.length < ROWS) {
    newBoard.unshift(Array(COLS).fill(0));
  }
  return { board: newBoard, cleared };
}

function getGhostY(board: Board, piece: Piece): number {
  let ghostY = piece.y;
  while (isValid(board, { ...piece, y: ghostY + 1 })) {
    ghostY++;
  }
  return ghostY;
}

const POINTS = [0, 100, 300, 500, 800];

export default function TetrisPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);

  const [board, setBoard] = useState<Board>(createBoard);
  const [piece, setPiece] = useState<Piece>(randomPiece);
  const [nextPiece, setNextPiece] = useState<Piece>(randomPiece);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const boardRef = useRef(board);
  const pieceRef = useRef(piece);
  const nextRef = useRef(nextPiece);
  const scoreRef = useRef(score);
  const linesRef = useRef(lines);
  const levelRef = useRef(level);
  const gameOverRef = useRef(false);
  const isPlayingRef = useRef(false);

  boardRef.current = board;
  pieceRef.current = piece;
  nextRef.current = nextPiece;
  scoreRef.current = score;
  linesRef.current = lines;
  levelRef.current = level;

  const initGame = useCallback(() => {
    const b = createBoard();
    const p = randomPiece();
    const n = randomPiece();
    setBoard(b);
    setPiece(p);
    setNextPiece(n);
    setScore(0);
    setLines(0);
    setLevel(1);
    setGameOver(false);
    setIsPlaying(false);
    boardRef.current = b;
    pieceRef.current = p;
    nextRef.current = n;
    scoreRef.current = 0;
    linesRef.current = 0;
    levelRef.current = 1;
    gameOverRef.current = false;
    isPlayingRef.current = false;
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("bestTetris");
    if (saved) setBestScore(parseInt(saved));
  }, []);

  const lockPiece = useCallback(() => {
    let newBoard = placePiece(boardRef.current, pieceRef.current);
    const { board: clearedBoard, cleared } = clearLines(newBoard);
    newBoard = clearedBoard;

    const newLines = linesRef.current + cleared;
    const newLevel = Math.floor(newLines / 10) + 1;
    const newScore = scoreRef.current + POINTS[cleared] * levelRef.current;

    setBoard(newBoard);
    setLines(newLines);
    setLevel(newLevel);
    setScore(newScore);
    boardRef.current = newBoard;
    linesRef.current = newLines;
    levelRef.current = newLevel;
    scoreRef.current = newScore;

    if (newScore > parseInt(localStorage.getItem("bestTetris") || "0")) {
      setBestScore(newScore);
      localStorage.setItem("bestTetris", newScore.toString());
    }

    const np = nextRef.current;
    if (!isValid(newBoard, np)) {
      gameOverRef.current = true;
      setGameOver(true);
      setIsPlaying(false);
      isPlayingRef.current = false;
      return;
    }

    const nn = randomPiece();
    setPiece(np);
    setNextPiece(nn);
    pieceRef.current = np;
    nextRef.current = nn;
  }, []);

  const moveDown = useCallback(() => {
    const p = pieceRef.current;
    const moved = { ...p, y: p.y + 1 };
    if (isValid(boardRef.current, moved)) {
      setPiece(moved);
      pieceRef.current = moved;
    } else {
      lockPiece();
    }
  }, [lockPiece]);

  // Game loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;
    isPlayingRef.current = true;
    const speed = Math.max(50, 800 - (level - 1) * 70);
    const interval = setInterval(() => {
      if (!gameOverRef.current && isPlayingRef.current) {
        moveDown();
      }
    }, speed);
    return () => {
      clearInterval(interval);
      isPlayingRef.current = false;
    };
  }, [isPlaying, gameOver, level, moveDown]);

  // Draw main board
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, COLS * CELL, ROWS * CELL);

    // Grid background
    ctx.fillStyle = "rgba(255,255,255,0.01)";
    ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 0.5;
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL);
      ctx.lineTo(COLS * CELL, r * CELL);
      ctx.stroke();
    }
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL, 0);
      ctx.lineTo(c * CELL, ROWS * CELL);
      ctx.stroke();
    }

    // Board cells
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c]) {
          ctx.fillStyle = COLORS[board[r][c]];
          ctx.shadowColor = COLORS[board[r][c]];
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.roundRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2, 3);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    }

    // Ghost piece
    const ghostY = getGhostY(board, piece);
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (!piece.shape[r][c]) continue;
        const gx = (piece.x + c) * CELL;
        const gy = (ghostY + r) * CELL;
        ctx.fillStyle = GHOST_COLORS[piece.color];
        ctx.strokeStyle = COLORS[piece.color];
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.roundRect(gx + 1, gy + 1, CELL - 2, CELL - 2, 3);
        ctx.fill();
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // Current piece
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (!piece.shape[r][c]) continue;
        const px = (piece.x + c) * CELL;
        const py = (piece.y + r) * CELL;
        if (py < 0) continue;
        ctx.fillStyle = COLORS[piece.color];
        ctx.shadowColor = COLORS[piece.color];
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.roundRect(px + 1, py + 1, CELL - 2, CELL - 2, 3);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }, [board, piece]);

  // Draw next piece preview
  useEffect(() => {
    const canvas = nextCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, 120, 80);
    const shape = nextPiece.shape;
    const cellSize = 22;
    const offsetX = (120 - shape[0].length * cellSize) / 2;
    const offsetY = (80 - shape.length * cellSize) / 2;

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        ctx.fillStyle = COLORS[nextPiece.color];
        ctx.shadowColor = COLORS[nextPiece.color];
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.roundRect(
          offsetX + c * cellSize + 1,
          offsetY + r * cellSize + 1,
          cellSize - 2,
          cellSize - 2,
          3
        );
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }, [nextPiece]);

  // Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOverRef.current) {
        if (e.key === " ") {
          e.preventDefault();
          initGame();
        }
        return;
      }

      if (e.key === " ") {
        e.preventDefault();
        setIsPlaying((p) => {
          isPlayingRef.current = !p;
          return !p;
        });
        return;
      }

      if (!isPlayingRef.current) return;

      const p = pieceRef.current;
      switch (e.key) {
        case "ArrowLeft":
        case "a": {
          e.preventDefault();
          const moved = { ...p, x: p.x - 1 };
          if (isValid(boardRef.current, moved)) {
            setPiece(moved);
            pieceRef.current = moved;
          }
          break;
        }
        case "ArrowRight":
        case "d": {
          e.preventDefault();
          const moved = { ...p, x: p.x + 1 };
          if (isValid(boardRef.current, moved)) {
            setPiece(moved);
            pieceRef.current = moved;
          }
          break;
        }
        case "ArrowDown":
        case "s": {
          e.preventDefault();
          moveDown();
          break;
        }
        case "ArrowUp":
        case "w": {
          e.preventDefault();
          const rotated = { ...p, shape: rotate(p.shape) };
          if (isValid(boardRef.current, rotated)) {
            setPiece(rotated);
            pieceRef.current = rotated;
          } else {
            // Wall kick
            for (const offset of [-1, 1, -2, 2]) {
              const kicked = { ...rotated, x: rotated.x + offset };
              if (isValid(boardRef.current, kicked)) {
                setPiece(kicked);
                pieceRef.current = kicked;
                break;
              }
            }
          }
          break;
        }
        case "x": {
          e.preventDefault();
          // Hard drop
          const ghostY = getGhostY(boardRef.current, p);
          const dropped = { ...p, y: ghostY };
          setPiece(dropped);
          pieceRef.current = dropped;
          setTimeout(() => lockPiece(), 0);
          break;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [initGame, moveDown, lockPiece]);

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
            <h1 className="text-2xl font-bold text-white">테트리스</h1>
            <p className="text-xs text-white/40">
              방향키: 이동/회전 | X: 하드드롭 | Space: 시작/일시정지
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (gameOver) {
                initGame();
              } else {
                setIsPlaying((p) => {
                  isPlayingRef.current = !p;
                  return !p;
                });
              }
            }}
            className="flex items-center gap-2 rounded-lg bg-white/[0.06] px-4 py-2 text-sm text-white/70 transition hover:bg-white/[0.1] hover:text-white"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            {gameOver ? "시작" : isPlaying ? "일시정지" : "시작"}
          </button>
          <button
            onClick={initGame}
            className="flex items-center gap-2 rounded-lg bg-white/[0.06] px-4 py-2 text-sm text-white/70 transition hover:bg-white/[0.1] hover:text-white"
          >
            <RotateCcw size={16} />
            리셋
          </button>
        </div>
      </div>

      {/* Game Area */}
      <div className="flex justify-center gap-6">
        {/* Main Board */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={COLS * CELL}
            height={ROWS * CELL}
            className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a]"
          />

          {/* Overlays */}
          {!isPlaying && !gameOver && score === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-black/60 backdrop-blur-sm">
              <p className="mb-2 text-xl font-bold text-white">테트리스</p>
              <p className="mb-4 text-sm text-white/50">
                Space를 눌러 시작하세요
              </p>
            </div>
          )}

          {gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-black/70 backdrop-blur-sm">
              <p className="mb-2 text-3xl font-bold text-white">게임 오버!</p>
              <p className="mb-4 text-lg text-white/60">
                점수: {score.toLocaleString()}
              </p>
              <button
                onClick={initGame}
                className="rounded-lg bg-blue-500 px-6 py-2 font-medium text-white transition hover:bg-blue-600"
              >
                다시 하기
              </button>
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div className="flex w-40 flex-col gap-4">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="mb-2 text-xs text-white/40">다음 블록</p>
            <canvas
              ref={nextCanvasRef}
              width={120}
              height={80}
              className="rounded-lg"
            />
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
            <p className="text-xs text-white/40">점수</p>
            <p className="text-xl font-bold text-blue-400">
              {score.toLocaleString()}
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
            <p className="text-xs text-white/40">최고 점수</p>
            <p className="flex items-center justify-center gap-1 text-xl font-bold text-yellow-300">
              <Trophy size={16} />
              {bestScore.toLocaleString()}
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
            <p className="text-xs text-white/40">라인</p>
            <p className="text-xl font-bold text-cyan-400">{lines}</p>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
            <p className="text-xs text-white/40">레벨</p>
            <p className="text-xl font-bold text-purple-400">{level}</p>
          </div>
        </div>
      </div>

      {/* Mobile Controls */}
      <div className="flex justify-center gap-8 lg:hidden">
        <div className="grid grid-cols-3 gap-2">
          <div />
          <button
            onTouchStart={() => {
              if (!isPlayingRef.current) return;
              const p = pieceRef.current;
              const rotated = { ...p, shape: rotate(p.shape) };
              if (isValid(boardRef.current, rotated)) {
                setPiece(rotated);
                pieceRef.current = rotated;
              }
            }}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.06] text-lg text-white/60"
          >
            ↻
          </button>
          <div />
          <button
            onTouchStart={() => {
              if (!isPlayingRef.current) return;
              const p = pieceRef.current;
              const moved = { ...p, x: p.x - 1 };
              if (isValid(boardRef.current, moved)) {
                setPiece(moved);
                pieceRef.current = moved;
              }
            }}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.06] text-lg text-white/60"
          >
            ◀
          </button>
          <button
            onTouchStart={() => {
              if (!isPlayingRef.current) return;
              moveDown();
            }}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.06] text-lg text-white/60"
          >
            ▼
          </button>
          <button
            onTouchStart={() => {
              if (!isPlayingRef.current) return;
              const p = pieceRef.current;
              const moved = { ...p, x: p.x + 1 };
              if (isValid(boardRef.current, moved)) {
                setPiece(moved);
                pieceRef.current = moved;
              }
            }}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.06] text-lg text-white/60"
          >
            ▶
          </button>
        </div>
        <button
          onTouchStart={() => {
            if (!isPlayingRef.current) return;
            const p = pieceRef.current;
            const ghostY = getGhostY(boardRef.current, p);
            const dropped = { ...p, y: ghostY };
            setPiece(dropped);
            pieceRef.current = dropped;
            setTimeout(() => lockPiece(), 0);
          }}
          className="flex h-12 items-center justify-center self-end rounded-xl bg-white/[0.06] px-4 text-sm text-white/60"
        >
          하드드롭
        </button>
      </div>

      {/* Info */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <h3 className="mb-2 text-sm font-medium text-white/60">조작법</h3>
        <div className="grid grid-cols-2 gap-2 text-xs text-white/40">
          <p>⬅️ ➡️ 좌우 이동</p>
          <p>⬆️ 블록 회전</p>
          <p>⬇️ 소프트 드롭</p>
          <p>X 키: 하드 드롭</p>
          <p>Space: 시작/일시정지</p>
          <p>레벨이 올라갈수록 속도 증가</p>
        </div>
      </div>
    </div>
  );
}
