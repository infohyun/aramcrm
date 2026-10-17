"use client";

import ReactMarkdown from "react-markdown";

// 아람 AI 결과(요약·전망·답변) 렌더러
export default function AramMarkdown({ content, className = "" }: { content: string; className?: string }) {
  return (
    <div className={`text-sm leading-relaxed text-gray-800 dark:text-gray-200 break-words ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h1 className="text-lg font-bold text-gray-900 dark:text-white mt-5 mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold text-gray-900 dark:text-white mt-5 mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold text-gray-900 dark:text-white mt-4 mb-1.5">{children}</h3>,
          p: ({ children }) => <p className="my-2">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>,
          strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-indigo-300 bg-indigo-50/60 dark:bg-indigo-500/10 pl-3 py-1 my-2 text-gray-700 dark:text-gray-300">{children}</blockquote>
          ),
          a: ({ href, children }) => <a href={href} className="text-indigo-600 underline">{children}</a>,
          code: ({ children }) => <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-[13px]">{children}</code>,
          table: ({ children }) => <div className="overflow-x-auto my-2"><table className="min-w-full text-xs border border-gray-200">{children}</table></div>,
          th: ({ children }) => <th className="border border-gray-200 bg-gray-50 px-2 py-1 text-left">{children}</th>,
          td: ({ children }) => <td className="border border-gray-200 px-2 py-1">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
