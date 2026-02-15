"use client";

import Link from "next/link";
import { Grid3X3, Joystick, Blocks, Paintbrush } from "lucide-react";

const games = [
  {
    title: "2048 퍼즐",
    description: "숫자 타일을 합쳐 2048을 만드세요! 중독성 있는 퍼즐 게임",
    icon: Grid3X3,
    href: "/games/puzzle-2048",
    color: "from-amber-500 to-orange-600",
    bgColor: "bg-amber-500/10",
  },
  {
    title: "스네이크",
    description: "뱀을 조종해 먹이를 먹고 점점 길어지세요! 클래식 아케이드",
    icon: Joystick,
    href: "/games/snake",
    color: "from-green-500 to-emerald-600",
    bgColor: "bg-green-500/10",
  },
  {
    title: "테트리스",
    description: "떨어지는 블록을 맞추어 줄을 완성하세요! 명작 퍼즐 게임",
    icon: Blocks,
    href: "/games/tetris",
    color: "from-blue-500 to-indigo-600",
    bgColor: "bg-blue-500/10",
  },
  {
    title: "픽셀 아트 크리에이터",
    description: "나만의 픽셀 아트를 만들어보세요! 창작 도구",
    icon: Paintbrush,
    href: "/games/pixel-art",
    color: "from-pink-500 to-purple-600",
    bgColor: "bg-pink-500/10",
  },
];

export default function GamesPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">게임 허브</h1>
        <p className="mt-1 text-sm text-white/50">
          혼자서 즐길 수 있는 다양한 게임을 플레이하세요
        </p>
      </div>

      {/* Game Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {games.map((game) => {
          const Icon = game.icon;
          return (
            <Link
              key={game.href}
              href={game.href}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.05] hover:shadow-lg hover:shadow-black/20"
            >
              {/* Gradient Background */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-0 transition-opacity duration-300 group-hover:opacity-[0.05]`}
              />

              <div className="relative">
                <div
                  className={`mb-4 inline-flex rounded-xl ${game.bgColor} p-3`}
                >
                  <Icon
                    size={28}
                    className="text-white/80"
                    strokeWidth={1.5}
                  />
                </div>

                <h3 className="mb-2 text-lg font-semibold text-white/90">
                  {game.title}
                </h3>
                <p className="text-sm leading-relaxed text-white/40">
                  {game.description}
                </p>

                <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-white/30 transition-colors group-hover:text-white/60">
                  플레이하기
                  <span className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Stats */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
        <h2 className="mb-4 text-sm font-medium text-white/60">게임 정보</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-white/90">4</p>
            <p className="text-xs text-white/40">총 게임 수</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white/90">2</p>
            <p className="text-xs text-white/40">아케이드 게임</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white/90">1</p>
            <p className="text-xs text-white/40">퍼즐 게임</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white/90">1</p>
            <p className="text-xs text-white/40">크리에이팅 게임</p>
          </div>
        </div>
      </div>
    </div>
  );
}
