"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Paintbrush,
  Eraser,
  Download,
  Trash2,
  Pipette,
  Square,
  Grid3X3,
  Undo2,
  Redo2,
  PaintBucket,
} from "lucide-react";

type Tool = "brush" | "eraser" | "picker" | "fill";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#f43f5e", "#14b8a6",
  "#84cc16", "#a855f7", "#ffffff", "#a3a3a3", "#525252",
  "#000000", "#78350f", "#7c2d12", "#713f12", "#1e3a5f",
  "#fbbf24", "#34d399", "#60a5fa", "#c084fc", "#fb7185",
  "#fde68a", "#bbf7d0", "#bfdbfe", "#e9d5ff", "#fecdd3",
];

const GRID_SIZES = [16, 24, 32, 48, 64];

export default function PixelArtPage() {
  const [gridSize, setGridSize] = useState(32);
  const [pixels, setPixels] = useState<string[][]>(() =>
    Array.from({ length: 32 }, () => Array(32).fill(""))
  );
  const [color, setColor] = useState("#ef4444");
  const [tool, setTool] = useState<Tool>("brush");
  const [showGrid, setShowGrid] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<string[][][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [customColor, setCustomColor] = useState("#ef4444");

  const cellSize = Math.min(Math.floor(560 / gridSize), 32);

  const pushHistory = useCallback(
    (newPixels: string[][]) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newPixels.map((r) => [...r]));
      if (newHistory.length > 50) newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    },
    [history, historyIndex]
  );

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setPixels(prev.map((r) => [...r]));
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setPixels(next.map((r) => [...r]));
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);

  const floodFill = useCallback(
    (startR: number, startC: number, fillColor: string) => {
      const targetColor = pixels[startR][startC];
      if (targetColor === fillColor) return;

      const newPixels = pixels.map((r) => [...r]);
      const stack: [number, number][] = [[startR, startC]];
      const visited = new Set<string>();

      while (stack.length > 0) {
        const [r, c] = stack.pop()!;
        const key = `${r},${c}`;
        if (visited.has(key)) continue;
        if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) continue;
        if (newPixels[r][c] !== targetColor) continue;

        visited.add(key);
        newPixels[r][c] = fillColor;
        stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
      }

      setPixels(newPixels);
      pushHistory(newPixels);
    },
    [pixels, gridSize, pushHistory]
  );

  const handleCellAction = useCallback(
    (r: number, c: number) => {
      if (tool === "picker") {
        const pickedColor = pixels[r][c];
        if (pickedColor) {
          setColor(pickedColor);
          setCustomColor(pickedColor);
        }
        setTool("brush");
        return;
      }
      if (tool === "fill") {
        floodFill(r, c, tool === "fill" ? color : "");
        return;
      }

      const newPixels = pixels.map((row) => [...row]);
      newPixels[r][c] = tool === "eraser" ? "" : color;
      setPixels(newPixels);
      return newPixels;
    },
    [tool, color, pixels, floodFill]
  );

  const handleMouseDown = useCallback(
    (r: number, c: number) => {
      setIsDrawing(true);
      const result = handleCellAction(r, c);
      if (result) {
        // Will push history on mouse up
      }
    },
    [handleCellAction]
  );

  const handleMouseMove = useCallback(
    (r: number, c: number) => {
      if (!isDrawing || tool === "picker" || tool === "fill") return;
      const newPixels = pixels.map((row) => [...row]);
      newPixels[r][c] = tool === "eraser" ? "" : color;
      setPixels(newPixels);
    },
    [isDrawing, tool, color, pixels]
  );

  const handleMouseUp = useCallback(() => {
    if (isDrawing) {
      pushHistory(pixels);
      setIsDrawing(false);
    }
  }, [isDrawing, pixels, pushHistory]);

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseUp]);

  const clearCanvas = useCallback(() => {
    const newPixels = Array.from({ length: gridSize }, () =>
      Array(gridSize).fill("")
    );
    setPixels(newPixels);
    pushHistory(newPixels);
  }, [gridSize, pushHistory]);

  const changeGridSize = useCallback(
    (newSize: number) => {
      const newPixels = Array.from({ length: newSize }, (_, r) =>
        Array.from({ length: newSize }, (_, c) =>
          r < pixels.length && c < pixels[0].length ? pixels[r][c] : ""
        )
      );
      setGridSize(newSize);
      setPixels(newPixels);
      pushHistory(newPixels);
    },
    [pixels, pushHistory]
  );

  const exportImage = useCallback(() => {
    const canvas = document.createElement("canvas");
    const scale = Math.max(1, Math.floor(512 / gridSize));
    canvas.width = gridSize * scale;
    canvas.height = gridSize * scale;
    const ctx = canvas.getContext("2d")!;

    // Transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (pixels[r][c]) {
          ctx.fillStyle = pixels[r][c];
          ctx.fillRect(c * scale, r * scale, scale, scale);
        }
      }
    }

    const link = document.createElement("a");
    link.download = `pixel-art-${gridSize}x${gridSize}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [gridSize, pixels]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z") {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        }
      }
      switch (e.key) {
        case "b":
          setTool("brush");
          break;
        case "e":
          setTool("eraser");
          break;
        case "g":
          setTool("fill");
          break;
        case "i":
          setTool("picker");
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = gridSize * cellSize;
    canvas.width = size;
    canvas.height = size;

    // Background
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, size, size);

    // Checkerboard pattern for transparency
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const x = c * cellSize;
        const y = r * cellSize;

        if (!pixels[r][c]) {
          ctx.fillStyle = (r + c) % 2 === 0 ? "#1a1a1a" : "#222222";
          ctx.fillRect(x, y, cellSize, cellSize);
        } else {
          ctx.fillStyle = pixels[r][c];
          ctx.fillRect(x, y, cellSize, cellSize);
        }
      }
    }

    // Grid
    if (showGrid && cellSize > 4) {
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 0.5;
      for (let r = 0; r <= gridSize; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * cellSize);
        ctx.lineTo(size, r * cellSize);
        ctx.stroke();
      }
      for (let c = 0; c <= gridSize; c++) {
        ctx.beginPath();
        ctx.moveTo(c * cellSize, 0);
        ctx.lineTo(c * cellSize, size);
        ctx.stroke();
      }
    }
  }, [pixels, gridSize, cellSize, showGrid]);

  const getCellFromEvent = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const c = Math.floor(x / cellSize);
    const r = Math.floor(y / cellSize);
    if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) return { r, c };
    return null;
  };

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
            <h1 className="text-2xl font-bold text-white">
              픽셀 아트 크리에이터
            </h1>
            <p className="text-xs text-white/40">
              나만의 픽셀 아트를 만들어보세요
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportImage}
            className="flex items-center gap-2 rounded-lg bg-white/[0.06] px-4 py-2 text-sm text-white/70 transition hover:bg-white/[0.1] hover:text-white"
          >
            <Download size={16} />
            PNG 저장
          </button>
          <button
            onClick={clearCanvas}
            className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400 transition hover:bg-red-500/20"
          >
            <Trash2 size={16} />
            초기화
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Toolbar */}
        <div className="flex flex-col gap-4 lg:w-56">
          {/* Tools */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="mb-3 text-xs font-medium text-white/40">도구</p>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  { id: "brush" as Tool, icon: Paintbrush, label: "브러시 (B)", key: "B" },
                  { id: "eraser" as Tool, icon: Eraser, label: "지우개 (E)", key: "E" },
                  { id: "fill" as Tool, icon: PaintBucket, label: "채우기 (G)", key: "G" },
                  { id: "picker" as Tool, icon: Pipette, label: "스포이드 (I)", key: "I" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTool(t.id)}
                  title={t.label}
                  className={`flex h-10 w-full items-center justify-center rounded-lg transition ${
                    tool === t.id
                      ? "bg-white/[0.12] text-white"
                      : "bg-white/[0.03] text-white/40 hover:bg-white/[0.06] hover:text-white/60"
                  }`}
                >
                  <t.icon size={18} />
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="mb-3 text-xs font-medium text-white/40">작업</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={undo}
                disabled={historyIndex <= 0}
                title="실행취소 (Ctrl+Z)"
                className="flex h-10 items-center justify-center rounded-lg bg-white/[0.03] text-white/40 transition hover:bg-white/[0.06] hover:text-white/60 disabled:opacity-30"
              >
                <Undo2 size={18} />
              </button>
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                title="다시실행 (Ctrl+Shift+Z)"
                className="flex h-10 items-center justify-center rounded-lg bg-white/[0.03] text-white/40 transition hover:bg-white/[0.06] hover:text-white/60 disabled:opacity-30"
              >
                <Redo2 size={18} />
              </button>
              <button
                onClick={() => setShowGrid(!showGrid)}
                title="그리드 토글"
                className={`flex h-10 items-center justify-center rounded-lg transition ${
                  showGrid
                    ? "bg-white/[0.12] text-white"
                    : "bg-white/[0.03] text-white/40 hover:bg-white/[0.06]"
                }`}
              >
                <Grid3X3 size={18} />
              </button>
            </div>
          </div>

          {/* Color Picker */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="mb-3 text-xs font-medium text-white/40">색상</p>

            {/* Current color */}
            <div className="mb-3 flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-lg border border-white/10"
                style={{ backgroundColor: color }}
              />
              <div className="flex-1">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => {
                    setCustomColor(e.target.value);
                    setColor(e.target.value);
                  }}
                  className="h-8 w-full cursor-pointer rounded bg-transparent"
                />
              </div>
            </div>

            {/* Preset colors */}
            <div className="grid grid-cols-5 gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setColor(c);
                    setCustomColor(c);
                  }}
                  className={`h-8 w-full rounded-md border transition hover:scale-110 ${
                    color === c
                      ? "border-white/40 ring-1 ring-white/20"
                      : "border-white/10"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Grid Size */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="mb-3 text-xs font-medium text-white/40">
              캔버스 크기
            </p>
            <div className="flex flex-wrap gap-2">
              {GRID_SIZES.map((size) => (
                <button
                  key={size}
                  onClick={() => changeGridSize(size)}
                  className={`rounded-lg px-3 py-1.5 text-xs transition ${
                    gridSize === size
                      ? "bg-white/[0.12] text-white"
                      : "bg-white/[0.03] text-white/40 hover:bg-white/[0.06]"
                  }`}
                >
                  {size}x{size}
                </button>
              ))}
            </div>
          </div>

          {/* Shortcuts */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="mb-3 text-xs font-medium text-white/40">단축키</p>
            <div className="space-y-1.5 text-xs text-white/30">
              <p>
                <span className="text-white/50">B</span> 브러시
              </p>
              <p>
                <span className="text-white/50">E</span> 지우개
              </p>
              <p>
                <span className="text-white/50">G</span> 채우기
              </p>
              <p>
                <span className="text-white/50">I</span> 스포이드
              </p>
              <p>
                <span className="text-white/50">Ctrl+Z</span> 실행취소
              </p>
              <p>
                <span className="text-white/50">Ctrl+Shift+Z</span> 다시실행
              </p>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex flex-1 justify-center">
          <div className="inline-block rounded-2xl border border-white/[0.08] bg-[#0f0f0f] p-3">
            <canvas
              ref={canvasRef}
              width={gridSize * cellSize}
              height={gridSize * cellSize}
              className="cursor-crosshair rounded-xl"
              style={{
                cursor:
                  tool === "picker"
                    ? "crosshair"
                    : tool === "eraser"
                    ? "cell"
                    : "crosshair",
              }}
              onMouseDown={(e) => {
                const cell = getCellFromEvent(e);
                if (cell) handleMouseDown(cell.r, cell.c);
              }}
              onMouseMove={(e) => {
                const cell = getCellFromEvent(e);
                if (cell) handleMouseMove(cell.r, cell.c);
              }}
              onMouseUp={handleMouseUp}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
