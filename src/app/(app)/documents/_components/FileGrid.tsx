"use client";

import {
  FileText,
  FileImage,
  FileSpreadsheet,
  File,
  FileArchive,
  FileVideo,
  FileAudio,
  Download,
  User,
  Calendar,
  Eye,
} from "lucide-react";

interface DocumentItem {
  id: string;
  name: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string | null;
  description: string | null;
  tags: string | null;
  downloadCount: number;
  createdAt: string;
  uploader: {
    id: string;
    name: string;
    email: string;
  };
  folder: {
    id: string;
    name: string;
  } | null;
}

interface FileGridProps {
  documents: DocumentItem[];
  onDownload: (doc: DocumentItem) => void;
}

function getFileIcon(mimeType: string | null, name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";

  if (mimeType?.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) {
    return <FileImage className="w-8 h-8 text-pink-500" />;
  }
  if (mimeType === "application/pdf" || ext === "pdf") {
    return <FileText className="w-8 h-8 text-red-500" />;
  }
  if (
    mimeType?.includes("spreadsheet") ||
    mimeType?.includes("excel") ||
    ["xls", "xlsx", "csv"].includes(ext)
  ) {
    return <FileSpreadsheet className="w-8 h-8 text-green-600" />;
  }
  if (
    mimeType?.includes("word") ||
    mimeType?.includes("document") ||
    ["doc", "docx"].includes(ext)
  ) {
    return <FileText className="w-8 h-8 text-blue-600" />;
  }
  if (
    mimeType?.includes("presentation") ||
    mimeType?.includes("powerpoint") ||
    ["ppt", "pptx"].includes(ext)
  ) {
    return <FileText className="w-8 h-8 text-orange-500" />;
  }
  if (mimeType?.startsWith("video/") || ["mp4", "avi", "mov", "wmv"].includes(ext)) {
    return <FileVideo className="w-8 h-8 text-purple-500" />;
  }
  if (mimeType?.startsWith("audio/") || ["mp3", "wav", "ogg", "flac"].includes(ext)) {
    return <FileAudio className="w-8 h-8 text-indigo-500" />;
  }
  if (
    mimeType?.includes("zip") ||
    mimeType?.includes("compressed") ||
    ["zip", "rar", "7z", "tar", "gz"].includes(ext)
  ) {
    return <FileArchive className="w-8 h-8 text-amber-600" />;
  }

  return <File className="w-8 h-8 text-gray-400" />;
}

function getFileTypeBadge(mimeType: string | null, name: string) {
  const ext = name.split(".").pop()?.toUpperCase() || "FILE";

  const colorMap: Record<string, string> = {
    PDF: "bg-red-100 text-red-700",
    DOC: "bg-blue-100 text-blue-700",
    DOCX: "bg-blue-100 text-blue-700",
    XLS: "bg-green-100 text-green-700",
    XLSX: "bg-green-100 text-green-700",
    CSV: "bg-green-100 text-green-700",
    PPT: "bg-orange-100 text-orange-700",
    PPTX: "bg-orange-100 text-orange-700",
    PNG: "bg-pink-100 text-pink-700",
    JPG: "bg-pink-100 text-pink-700",
    JPEG: "bg-pink-100 text-pink-700",
    GIF: "bg-pink-100 text-pink-700",
    SVG: "bg-pink-100 text-pink-700",
    ZIP: "bg-amber-100 text-amber-700",
    RAR: "bg-amber-100 text-amber-700",
    MP4: "bg-purple-100 text-purple-700",
    MP3: "bg-indigo-100 text-indigo-700",
  };

  return colorMap[ext] || "bg-gray-100 text-gray-700";
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function FileGrid({ documents, onDownload }: FileGridProps) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
        <File className="w-12 h-12 text-gray-200 mx-auto mb-3" />
        <p className="text-gray-500 text-sm mb-1">문서가 없습니다</p>
        <p className="text-gray-400 text-xs">파일을 업로드하거나 다른 폴더를 선택하세요</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {documents.map((doc) => {
        const ext = doc.name.split(".").pop()?.toUpperCase() || "FILE";
        const badgeColor = getFileTypeBadge(doc.mimeType, doc.name);

        return (
          <div
            key={doc.id}
            className="bg-white rounded-xl border border-gray-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer"
            onClick={() => onDownload(doc)}
          >
            <div className="p-4">
              {/* 아이콘 + 타입 배지 */}
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 bg-gray-50 rounded-xl group-hover:bg-indigo-50 transition-colors">
                  {getFileIcon(doc.mimeType, doc.name)}
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
                  {ext}
                </span>
              </div>

              {/* 파일명 */}
              <h4 className="text-sm font-semibold text-gray-900 truncate mb-1 group-hover:text-indigo-700 transition-colors">
                {doc.name}
              </h4>

              {/* 설명 */}
              {doc.description && (
                <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                  {doc.description}
                </p>
              )}

              {/* 파일 크기 */}
              <p className="text-[11px] text-gray-500 mb-3">
                {formatFileSize(doc.fileSize)}
              </p>

              {/* 하단 정보 */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                    <User className="w-3 h-3 text-gray-500" />
                  </div>
                  <span className="text-[11px] text-gray-500 truncate max-w-[80px]">
                    {doc.uploader.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                    <Download className="w-3 h-3" />
                    {doc.downloadCount}
                  </span>
                  <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                    <Calendar className="w-3 h-3" />
                    {formatDate(doc.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
