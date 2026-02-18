"use client";

import { FolderOpen, Folder, ChevronRight, ChevronDown } from "lucide-react";
import { useState } from "react";

interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  _count: { documents: number };
}

interface FolderTreeProps {
  folders: FolderItem[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
}

export default function FolderTree({ folders, selectedFolderId, onSelectFolder }: FolderTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const rootFolders = folders.filter((f) => !f.parentId);

  const getChildren = (parentId: string) => {
    return folders.filter((f) => f.parentId === parentId);
  };

  const renderFolder = (folder: FolderItem, depth: number = 0) => {
    const children = getChildren(folder.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(folder.id);
    const isSelected = selectedFolderId === folder.id;

    return (
      <div key={folder.id}>
        <button
          onClick={() => {
            onSelectFolder(folder.id);
            if (hasChildren) toggleExpand(folder.id);
          }}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
            isSelected
              ? "bg-indigo-50 text-indigo-700 font-semibold"
              : "text-gray-700 hover:bg-gray-100"
          }`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            )
          ) : (
            <span className="w-3.5 shrink-0" />
          )}
          {isSelected ? (
            <FolderOpen className="w-4 h-4 text-indigo-500 shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-gray-400 shrink-0" />
          )}
          <span className="truncate flex-1 text-left">{folder.name}</span>
          <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full shrink-0">
            {folder._count.documents}
          </span>
        </button>
        {hasChildren && isExpanded && (
          <div>
            {children.map((child) => renderFolder(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-0.5">
      {/* 전체 문서 */}
      <button
        onClick={() => onSelectFolder(null)}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
          selectedFolderId === null
            ? "bg-indigo-50 text-indigo-700 font-semibold"
            : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        <span className="w-3.5 shrink-0" />
        <FolderOpen className="w-4 h-4 text-indigo-500 shrink-0" />
        <span className="flex-1 text-left">전체 문서</span>
      </button>

      {rootFolders.map((folder) => renderFolder(folder))}
    </div>
  );
}
