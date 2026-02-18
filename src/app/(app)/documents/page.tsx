"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Search,
  Upload,
  FolderPlus,
  Loader2,
  X,
  RefreshCw,
} from "lucide-react";
import FolderTree from "./_components/FolderTree";
import FileGrid from "./_components/FileGrid";
import UploadModal from "./_components/UploadModal";

interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  _count: { documents: number };
}

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

export default function DocumentsPage() {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showFolderCreate, setShowFolderCreate] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  // 폴더 목록 조회
  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch("/api/documents/folders");
      if (res.ok) {
        const data = await res.json();
        setFolders(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch folders:", error);
    }
  }, []);

  // 문서 목록 조회
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedFolderId) params.set("folderId", selectedFolderId);
      if (searchQuery) params.set("search", searchQuery);
      params.set("limit", "100");

      const res = await fetch(`/api/documents?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedFolderId, searchQuery]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // 파일 업로드
  const handleUpload = async (formData: FormData) => {
    const res = await fetch("/api/documents/upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      fetchDocuments();
      fetchFolders();
    } else {
      throw new Error("Upload failed");
    }
  };

  // 폴더 생성
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    setCreatingFolder(true);
    try {
      const res = await fetch("/api/documents/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parentId: selectedFolderId || null,
        }),
      });

      if (res.ok) {
        setNewFolderName("");
        setShowFolderCreate(false);
        fetchFolders();
      }
    } catch (error) {
      console.error("Failed to create folder:", error);
    } finally {
      setCreatingFolder(false);
    }
  };

  // 다운로드 처리 (download count 증가)
  const handleDownload = async (doc: DocumentItem) => {
    try {
      await fetch(`/api/documents/${doc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ downloadCount: doc.downloadCount + 1 }),
      });

      // 실제 구현에서는 fileUrl로 다운로드
      window.open(doc.fileUrl, "_blank");
      fetchDocuments();
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-sm">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">문서 관리</h1>
                <p className="text-[11px] text-gray-400">파일 업로드 및 관리</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFolderCreate(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <FolderPlus className="w-4 h-4" />
                폴더 만들기
              </button>
              <button
                onClick={() => setShowUpload(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-sm font-semibold rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md shadow-indigo-200"
              >
                <Upload className="w-4 h-4" />
                업로드
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5">
        <div className="flex gap-5">
          {/* 좌측 사이드바: 폴더 트리 */}
          <div className="w-64 shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 p-3 sticky top-24">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                폴더
              </h3>
              <FolderTree
                folders={folders}
                selectedFolderId={selectedFolderId}
                onSelectFolder={setSelectedFolderId}
              />
            </div>
          </div>

          {/* 우측 메인: 파일 목록 */}
          <div className="flex-1 min-w-0">
            {/* 검색 바 */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="파일명, 설명, 태그로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
              <button
                onClick={() => fetchDocuments()}
                className="p-2.5 rounded-xl hover:bg-gray-100 transition-colors border border-gray-200 bg-white"
                title="새로고침"
              >
                <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* 현재 폴더 정보 */}
            {selectedFolderId && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-gray-500">현재 폴더:</span>
                <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg">
                  {folders.find((f) => f.id === selectedFolderId)?.name || "알 수 없음"}
                </span>
                <button
                  onClick={() => setSelectedFolderId(null)}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* 파일 그리드 */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  <p className="text-sm text-gray-400">문서를 불러오는 중...</p>
                </div>
              </div>
            ) : (
              <FileGrid documents={documents} onDownload={handleDownload} />
            )}
          </div>
        </div>
      </div>

      {/* 업로드 모달 */}
      <UploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onUpload={handleUpload}
        folders={folders}
      />

      {/* 폴더 만들기 모달 */}
      {showFolderCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl">
                  <FolderPlus className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">폴더 만들기</h2>
              </div>
              <button
                onClick={() => { setShowFolderCreate(false); setNewFolderName(""); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-5">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                폴더명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateFolder();
                }}
                placeholder="새 폴더 이름"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              {selectedFolderId && (
                <p className="text-xs text-gray-400 mt-2">
                  상위 폴더: {folders.find((f) => f.id === selectedFolderId)?.name}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => { setShowFolderCreate(false); setNewFolderName(""); }}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || creatingFolder}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200"
              >
                {creatingFolder ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FolderPlus className="w-4 h-4" />
                )}
                만들기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
