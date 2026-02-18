'use client';

import React from 'react';
import { Search, X } from 'lucide-react';

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
  onReset?: () => void;
  showReset?: boolean;
  className?: string;
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = '검색...',
  children,
  onReset,
  showReset,
  className = '',
}: FilterBarProps) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm
            placeholder:text-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 outline-none"
        />
      </div>
      {children}
      {showReset && (
        <button
          onClick={onReset}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X size={14} />
          필터 초기화
        </button>
      )}
    </div>
  );
}
