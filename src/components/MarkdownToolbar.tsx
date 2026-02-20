"use client";

import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Code,
  Link,
  Minus,
} from "lucide-react";

interface MarkdownToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
}

export default function MarkdownToolbar({ textareaRef, value, onChange }: MarkdownToolbarProps) {
  const insertMarkdown = (before: string, after: string = "", placeholder: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end);
    const text = selected || placeholder;

    const newValue = value.substring(0, start) + before + text + after + value.substring(end);
    onChange(newValue);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      const cursorPos = start + before.length + text.length;
      textarea.setSelectionRange(
        selected ? start + before.length : cursorPos,
        selected ? start + before.length + text.length : cursorPos
      );
    }, 0);
  };

  const insertLineStart = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const newValue = value.substring(0, lineStart) + prefix + value.substring(lineStart);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  };

  const buttons = [
    { icon: Bold, title: "굵게 (Ctrl+B)", action: () => insertMarkdown("**", "**", "굵은 텍스트") },
    { icon: Italic, title: "기울임 (Ctrl+I)", action: () => insertMarkdown("*", "*", "기울임 텍스트") },
    { divider: true },
    { icon: Heading1, title: "제목 1", action: () => insertLineStart("# ") },
    { icon: Heading2, title: "제목 2", action: () => insertLineStart("## ") },
    { divider: true },
    { icon: List, title: "목록", action: () => insertLineStart("- ") },
    { icon: ListOrdered, title: "번호 목록", action: () => insertLineStart("1. ") },
    { icon: Quote, title: "인용", action: () => insertLineStart("> ") },
    { divider: true },
    { icon: Code, title: "코드", action: () => insertMarkdown("`", "`", "코드") },
    { icon: Link, title: "링크", action: () => insertMarkdown("[", "](url)", "링크 텍스트") },
    { icon: Minus, title: "구분선", action: () => insertMarkdown("\n---\n", "") },
  ];

  return (
    <div className="flex items-center gap-0.5 p-1.5 bg-gray-50 border border-gray-200 rounded-t-xl border-b-0 flex-wrap">
      {/* eslint-disable-next-line react-hooks/refs -- ref is accessed in click handlers, not during render */}
      {buttons.map((btn, i) => {
        if ("divider" in btn && btn.divider) {
          return <div key={i} className="w-px h-5 bg-gray-200 mx-1" />;
        }
        const Icon = btn.icon!;
        return (
          <button
            key={i}
            type="button"
            onClick={btn.action}
            title={btn.title}
            className="p-1.5 rounded-md hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
}
