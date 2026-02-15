"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw, Trophy, Play, Pause } from "lucide-react";

type Point = { x: number; y: number };
type Direction = "up" | "down" | "left" | "right";

const GRID_SIZE = 20;
const CELL_SIZE = 24;
const INITIAL_SPEED = 150;
const SPEED_INCREMENT = 2;
const MIN_SPEED = 50;

export default function SnakePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Point>({ x: 15, y: 10 });
  const [direction, setDirection] = useState<Direction>("right");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(INITIAL_SPEED);

  const dirRef = useRef<Direction>("right");
  const snakeRef = useRef<Point[]>([{ x: 10, y: 10 }]);
  const foodRef = useRef<Point>({ x: 15, y: 10 });
  const scoreRef = useRef(0);
  const speedRef = useRef(INITIAL_SPEED);
  const gameOverRef = useRef(false);
  const isPlayingRef = useRef(false);

  const generateFood = useCallback((currentSnake: Point[]): Point => {
    let newFood: Point;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (
      currentSnake.some((s) => s.x === newFood.x && s.y === newFood.y)
    );
    return newFood;
  }, []);

  const initGame = useCallback(() => {
    const initialSnake = [{ x: 10, y: 10 }];
    const initialFood = generateFood(initialSnake);
    setSnake(initialSnake);
    setFood(initialFood);
    setDirection("right");
    setScore(0);
    setGameOver(false);
    setIsPlaying(false);
    setSpeed(INITIAL_SPEED);

    snakeRef.current = initialSnake;
    foodRef.current = initialFood;
    dirRef.current = "right";
    scoreRef.current = 0;
    speedRef.current = INITIAL_SPEED;
    gameOverRef.current = false;
    isPlayingRef.current = false;
  }, [generateFood]);

  useEffect(() => {
    const saved = localStorage.getItem("bestSnake");
    if (saved) setBestScore(parseInt(saved));
    initGame();
  }, [initGame]);

  // Game loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;
    isPlayingRef.current = true;

    const gameLoop = () => {
      if (gameOverRef.current || !isPlayingRef.current) return;

      const currentSnake = [...snakeRef.current];
      const head = { ...currentSnake[0] };
      const dir = dirRef.current;

      switch (dir) {
        case "up": head.y--; break;
        case "down": head.y++; break;
        case "left": head.x--; break;
        case "right": head.x++; break;
      }

      // Wall collision
      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        gameOverRef.current = true;
        setGameOver(true);
        setIsPlaying(false);
        isPlayingRef.current = false;
        return;
      }

      // Self collision
      if (currentSnake.some((s) => s.x === head.x && s.y === head.y)) {
        gameOverRef.current = true;
        setGameOver(true);
        setIsPlaying(false);
        isPlayingRef.current = false;
        return;
      }

      const newSnake = [head, ...currentSnake];

      // Eat food
      if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
        const newScore = scoreRef.current + 10;
        scoreRef.current = newScore;
        setScore(newScore);

        const newSpeed = Math.max(MIN_SPEED, speedRef.current - SPEED_INCREMENT);
        speedRef.current = newSpeed;
        setSpeed(newSpeed);

        const newFood = generateFood(newSnake);
        foodRef.current = newFood;
        setFood(newFood);

        if (newScore > (parseInt(localStorage.getItem("bestSnake") || "0"))) {
          setBestScore(newScore);
          localStorage.setItem("bestSnake", newScore.toString());
        }
      } else {
        newSnake.pop();
      }

      snakeRef.current = newSnake;
      setSnake(newSnake);

      setTimeout(gameLoop, speedRef.current);
    };

    const timeout = setTimeout(gameLoop, speedRef.current);
    return () => {
      clearTimeout(timeout);
      isPlayingRef.current = false;
    };
  }, [isPlaying, gameOver, generateFood]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = GRID_SIZE * CELL_SIZE;
    ctx.clearRect(0, 0, size, size);

    // Grid
    ctx.fillStyle = "rgba(255,255,255,0.01)";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(size, i * CELL_SIZE);
      ctx.stroke();
    }

    // Food
    ctx.fillStyle = "#ef4444";
    ctx.shadowColor = "#ef4444";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(
      food.x * CELL_SIZE + CELL_SIZE / 2,
      food.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // Snake
    snake.forEach((segment, i) => {
      const isHead = i === 0;
      const alpha = 1 - (i / snake.length) * 0.5;
      ctx.fillStyle = isHead
        ? `rgba(74, 222, 128, ${alpha})`
        : `rgba(34, 197, 94, ${alpha})`;
      ctx.shadowColor = isHead ? "#4ade80" : "transparent";
      ctx.shadowBlur = isHead ? 8 : 0;

      const padding = isHead ? 1 : 2;
      const radius = isHead ? 6 : 4;

      const x = segment.x * CELL_SIZE + padding;
      const y = segment.y * CELL_SIZE + padding;
      const w = CELL_SIZE - padding * 2;
      const h = CELL_SIZE - padding * 2;

      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radius);
      ctx.fill();
    });
    ctx.shadowBlur = 0;
  }, [snake, food]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap: Record<string, Direction> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        s: "down",
        a: "left",
        d: "right",
      };
      const dir = keyMap[e.key];
      if (!dir) {
        if (e.key === " ") {
          e.preventDefault();
          if (gameOverRef.current) {
            initGame();
          } else {
            setIsPlaying((p) => {
              isPlayingRef.current = !p;
              return !p;
            });
          }
        }
        return;
      }
      e.preventDefault();

      const opposites: Record<Direction, Direction> = {
        up: "down",
        down: "up",
        left: "right",
        right: "left",
      };
      if (opposites[dir] !== dirRef.current) {
        dirRef.current = dir;
        setDirection(dir);
        if (!isPlayingRef.current && !gameOverRef.current) {
          setIsPlaying(true);
          isPlayingRef.current = true;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [initGame]);

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
            <h1 className="text-2xl font-bold text-white">스네이크</h1>
            <p className="text-xs text-white/40">
              방향키로 뱀을 조종하세요 | Space로 시작/일시정지
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

      {/* Score */}
      <div className="flex gap-4">
        <div className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
          <p className="text-xs text-white/40">점수</p>
          <p className="text-2xl font-bold text-green-400">
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
        <div className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
          <p className="text-xs text-white/40">길이</p>
          <p className="text-2xl font-bold text-emerald-400">{snake.length}</p>
        </div>
      </div>

      {/* Game Board */}
      <div className="flex justify-center">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={GRID_SIZE * CELL_SIZE}
            height={GRID_SIZE * CELL_SIZE}
            className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a]"
          />

          {/* Start overlay */}
          {!isPlaying && !gameOver && score === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-black/60 backdrop-blur-sm">
              <p className="mb-2 text-xl font-bold text-white">
                스네이크 게임
              </p>
              <p className="mb-4 text-sm text-white/50">
                방향키를 누르면 시작됩니다
              </p>
            </div>
          )}

          {/* Game Over */}
          {gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-black/70 backdrop-blur-sm">
              <p className="mb-2 text-3xl font-bold text-white">게임 오버!</p>
              <p className="mb-4 text-lg text-white/60">
                점수: {score.toLocaleString()}
              </p>
              <button
                onClick={initGame}
                className="rounded-lg bg-green-500 px-6 py-2 font-medium text-white transition hover:bg-green-600"
              >
                다시 하기
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Controls */}
      <div className="flex justify-center lg:hidden">
        <div className="grid grid-cols-3 gap-2">
          <div />
          <button
            onTouchStart={() => {
              if (dirRef.current !== "down") {
                dirRef.current = "up";
                if (!isPlayingRef.current && !gameOverRef.current) {
                  setIsPlaying(true);
                  isPlayingRef.current = true;
                }
              }
            }}
            className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/[0.06] text-2xl text-white/60"
          >
            ▲
          </button>
          <div />
          <button
            onTouchStart={() => {
              if (dirRef.current !== "right") {
                dirRef.current = "left";
                if (!isPlayingRef.current && !gameOverRef.current) {
                  setIsPlaying(true);
                  isPlayingRef.current = true;
                }
              }
            }}
            className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/[0.06] text-2xl text-white/60"
          >
            ◀
          </button>
          <button
            onTouchStart={() => {
              if (dirRef.current !== "up") {
                dirRef.current = "down";
                if (!isPlayingRef.current && !gameOverRef.current) {
                  setIsPlaying(true);
                  isPlayingRef.current = true;
                }
              }
            }}
            className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/[0.06] text-2xl text-white/60"
          >
            ▼
          </button>
          <button
            onTouchStart={() => {
              if (dirRef.current !== "left") {
                dirRef.current = "right";
                if (!isPlayingRef.current && !gameOverRef.current) {
                  setIsPlaying(true);
                  isPlayingRef.current = true;
                }
              }
            }}
            className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/[0.06] text-2xl text-white/60"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <h3 className="mb-2 text-sm font-medium text-white/60">조작법</h3>
        <div className="grid grid-cols-2 gap-2 text-xs text-white/40">
          <p>⬆️ ⬇️ ⬅️ ➡️ 방향키로 이동</p>
          <p>W A S D 키로도 이동 가능</p>
          <p>Space 키로 시작/일시정지</p>
          <p>빨간 먹이를 먹으면 점수 획득</p>
        </div>
      </div>
    </div>
  );
}
