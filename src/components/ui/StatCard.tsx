'use client';

import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: number; label?: string };
  color?: 'default' | 'blue' | 'green' | 'amber' | 'red' | 'indigo';
  className?: string;
}

const colorStyles = {
  default: 'bg-gray-50 text-gray-600',
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  indigo: 'bg-indigo-50 text-indigo-600',
};

export function StatCard({ title, value, icon, trend, color = 'default', className = '' }: StatCardProps) {
  return (
    <div className={`bg-white rounded-xl border border-[var(--card-border)] p-5 ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm text-gray-500">{title}</span>
        {icon && (
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorStyles[color]}`}>
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {trend && (
          <span
            className={`text-xs font-medium px-1.5 py-0.5 rounded-full mb-0.5
              ${trend.value >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}
          >
            {trend.value >= 0 ? '+' : ''}{trend.value}%
            {trend.label && ` ${trend.label}`}
          </span>
        )}
      </div>
    </div>
  );
}
