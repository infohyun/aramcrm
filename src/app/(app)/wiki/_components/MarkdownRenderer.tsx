"use client";

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const renderMarkdown = (text: string): string => {
    let html = text;

    // 코드 블록 (```)
    html = html.replace(
      /```(\w*)\n([\s\S]*?)```/g,
      (_match, _lang, code) =>
        `<pre class="bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto my-4 text-sm leading-relaxed"><code>${escapeHtml(code.trim())}</code></pre>`
    );

    // 인라인 코드 (`)
    html = html.replace(
      /`([^`]+)`/g,
      '<code class="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>'
    );

    // 제목 (### ## #)
    html = html.replace(
      /^### (.+)$/gm,
      '<h3 class="text-lg font-bold text-gray-900 mt-6 mb-3">$1</h3>'
    );
    html = html.replace(
      /^## (.+)$/gm,
      '<h2 class="text-xl font-bold text-gray-900 mt-8 mb-4 pb-2 border-b border-gray-200">$1</h2>'
    );
    html = html.replace(
      /^# (.+)$/gm,
      '<h1 class="text-2xl font-bold text-gray-900 mt-8 mb-4 pb-2 border-b border-gray-200">$1</h1>'
    );

    // 볼드 (**)
    html = html.replace(
      /\*\*([^*]+)\*\*/g,
      '<strong class="font-bold text-gray-900">$1</strong>'
    );

    // 이탤릭 (*)
    html = html.replace(
      /\*([^*]+)\*/g,
      '<em class="italic">$1</em>'
    );

    // 링크 [text](url)
    html = html.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" class="text-indigo-600 hover:text-indigo-800 underline" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    // 수평선 (---, ***)
    html = html.replace(
      /^(---|\*\*\*)$/gm,
      '<hr class="my-6 border-gray-200" />'
    );

    // 목록 (- item)
    html = html.replace(
      /^- (.+)$/gm,
      '<li class="ml-4 list-disc text-gray-700 mb-1">$1</li>'
    );

    // 순서 목록 (1. item)
    html = html.replace(
      /^\d+\. (.+)$/gm,
      '<li class="ml-4 list-decimal text-gray-700 mb-1">$1</li>'
    );

    // 연속된 li를 ul/ol로 감싸기
    html = html.replace(
      /(<li class="ml-4 list-disc[^"]*">[\s\S]*?<\/li>\n?)+/g,
      (match) => `<ul class="my-3 space-y-1">${match}</ul>`
    );
    html = html.replace(
      /(<li class="ml-4 list-decimal[^"]*">[\s\S]*?<\/li>\n?)+/g,
      (match) => `<ol class="my-3 space-y-1">${match}</ol>`
    );

    // 인용문 (> text)
    html = html.replace(
      /^> (.+)$/gm,
      '<blockquote class="border-l-4 border-indigo-300 bg-indigo-50 pl-4 py-2 my-3 text-gray-700 italic">$1</blockquote>'
    );

    // 단락 (빈 줄로 구분된 텍스트)
    html = html.replace(
      /^(?!<[a-z])((?!<\/?\w).+)$/gm,
      '<p class="text-gray-700 leading-relaxed mb-3">$1</p>'
    );

    // 빈 줄 정리
    html = html.replace(/\n{3,}/g, "\n\n");

    return html;
  };

  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  return (
    <div
      className="prose-custom max-w-none"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}
