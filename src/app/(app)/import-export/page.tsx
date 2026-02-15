"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderUp,
  Table,
  ArrowRight,
  FileDown,
  Filter,
  BookOpen,
} from "lucide-react";

interface ImportResult {
  imported: number;
  total: number;
  skipped: number;
  errors: { row: number; field?: string; message: string }[];
}

interface ColumnPreview {
  headers: string[];
  rows: string[][];
}

const GRADE_OPTIONS = [
  { value: "", label: "전체 등급" },
  { value: "vip", label: "VIP" },
  { value: "gold", label: "Gold" },
  { value: "normal", label: "일반" },
  { value: "new", label: "신규" },
];

const STATUS_OPTIONS = [
  { value: "", label: "전체 상태" },
  { value: "active", label: "활성" },
  { value: "inactive", label: "비활성" },
  { value: "dormant", label: "휴면" },
];

export default function ImportExportPage() {
  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [columnPreview, setColumnPreview] = useState<ColumnPreview | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export state
  const [exportFormat, setExportFormat] = useState("xlsx");
  const [exportGrade, setExportGrade] = useState("");
  const [exportStatus, setExportStatus] = useState("");
  const [exportDateFrom, setExportDateFrom] = useState("");
  const [exportDateTo, setExportDateTo] = useState("");
  const [exportRemember, setExportRemember] = useState(false);
  const [exporting, setExporting] = useState(false);

  const parsePreview = useCallback(async (file: File) => {
    try {
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith(".csv")) {
        const text = await file.text();
        const lines = text.split("\n").filter((l) => l.trim());
        const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
        const rows = lines.slice(1, 6).map((line) =>
          line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""))
        );
        setColumnPreview({ headers, rows });
      } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        // For Excel, we'll show a simple message since we can't parse it client-side without xlsx
        // The actual parsing happens server-side
        setColumnPreview({
          headers: ["Excel 파일 업로드됨"],
          rows: [["서버에서 파싱됩니다. 가져오기 버튼을 클릭하세요."]],
        });
      }
    } catch {
      setColumnPreview(null);
    }
  }, []);

  const handleFileSelect = useCallback(
    (file: File) => {
      const validExtensions = [".csv", ".xlsx", ".xls"];
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));

      if (!validExtensions.includes(ext)) {
        setImportError("CSV, XLSX, XLS 파일만 업로드 가능합니다.");
        return;
      }

      setImportFile(file);
      setImportResult(null);
      setImportError("");
      parsePreview(file);
    },
    [parsePreview]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleImport = async () => {
    if (!importFile) return;

    setImporting(true);
    setImportError("");
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", importFile);

      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setImportError(data.error || "가져오기에 실패했습니다.");
        return;
      }

      setImportResult(data);
    } catch (error) {
      console.error("Import error:", error);
      setImportError("파일 업로드 중 오류가 발생했습니다.");
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);

    try {
      const params = new URLSearchParams();
      params.set("format", exportFormat);
      if (exportGrade) params.set("grade", exportGrade);
      if (exportStatus) params.set("status", exportStatus);
      if (exportDateFrom) params.set("dateFrom", exportDateFrom);
      if (exportDateTo) params.set("dateTo", exportDateTo);
      if (exportRemember) params.set("remember", "true");

      const res = await fetch(`/api/export?${params}`);

      if (!res.ok) {
        throw new Error("Export failed");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Get filename from Content-Disposition header or generate one
      const disposition = res.headers.get("Content-Disposition");
      let filename = `aramcrm_export.${exportFormat === "xlsx" ? "xlsx" : "csv"}`;
      if (disposition) {
        const match = disposition.match(/filename="?(.+?)"?$/);
        if (match) filename = match[1];
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setExporting(false);
    }
  };

  const resetImport = () => {
    setImportFile(null);
    setImportResult(null);
    setImportError("");
    setColumnPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">데이터 가져오기 / 내보내기</h1>
                <p className="text-sm text-gray-500">고객 데이터를 일괄로 관리하세요</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* ===== IMPORT SECTION ===== */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Upload className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">데이터 가져오기</h2>
                  <p className="text-sm text-gray-500">CSV, Excel 파일로 고객을 일괄 등록</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Drag and drop zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  dragActive
                    ? "border-indigo-400 bg-indigo-50"
                    : importFile
                    ? "border-green-300 bg-green-50"
                    : "border-gray-300 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                {importFile ? (
                  <div className="space-y-2">
                    <div className="inline-flex p-3 bg-green-100 rounded-full">
                      {importFile.name.endsWith(".csv") ? (
                        <FileText className="w-8 h-8 text-green-600" />
                      ) : (
                        <FileSpreadsheet className="w-8 h-8 text-green-600" />
                      )}
                    </div>
                    <p className="font-medium text-gray-900">{importFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(importFile.size / 1024).toFixed(1)} KB
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resetImport();
                      }}
                      className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                    >
                      <X className="w-3 h-3" />
                      파일 제거
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="inline-flex p-3 bg-gray-100 rounded-full">
                      <FolderUp className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600">
                      파일을 여기에 드래그하거나{" "}
                      <span className="text-indigo-600 font-medium">클릭하여 선택</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      지원 형식: .csv, .xlsx, .xls
                    </p>
                  </div>
                )}
              </div>

              {/* Column preview */}
              {columnPreview && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Table className="w-4 h-4 text-gray-500" />
                    <h3 className="text-sm font-medium text-gray-700">컬럼 미리보기</h3>
                  </div>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50/60">
                          {columnPreview.headers.map((h, i) => (
                            <th
                              key={i}
                              className="px-3 py-2 text-left font-medium text-gray-700 border-b border-gray-200 whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {columnPreview.rows.map((row, ri) => (
                          <tr key={ri} className="border-b border-gray-100 last:border-0">
                            {row.map((cell, ci) => (
                              <td
                                key={ci}
                                className="px-3 py-2 text-gray-600 whitespace-nowrap max-w-[200px] truncate"
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Import error */}
              {importError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{importError}</p>
                </div>
              )}

              {/* Import result */}
              {importResult && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        가져오기 완료
                      </p>
                      <div className="text-sm text-green-700 mt-1 space-y-0.5">
                        <p>
                          전체: <strong>{importResult.total}</strong>건 /
                          성공: <strong>{importResult.imported}</strong>건 /
                          건너뜀: <strong>{importResult.skipped}</strong>건
                        </p>
                        {importResult.errors.length > 0 && (
                          <p>
                            실패: <strong className="text-red-600">{importResult.errors.length}</strong>건
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="border border-red-200 rounded-lg overflow-hidden">
                      <div className="px-3 py-2 bg-red-50 border-b border-red-200">
                        <p className="text-xs font-medium text-red-700">
                          오류 내역 ({importResult.errors.length}건)
                        </p>
                      </div>
                      <div className="max-h-40 overflow-y-auto">
                        {importResult.errors.map((err, i) => (
                          <div
                            key={i}
                            className="px-3 py-2 text-xs text-red-600 border-b border-red-100 last:border-0"
                          >
                            행 {err.row}
                            {err.field ? ` [${err.field}]` : ""}: {err.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Import button */}
              <button
                onClick={handleImport}
                disabled={!importFile || importing}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    가져오는 중...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    가져오기
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ===== EXPORT SECTION ===== */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Download className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">데이터 내보내기</h2>
                  <p className="text-sm text-gray-500">고객 데이터를 파일로 다운로드</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Filter options */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-medium text-gray-700">필터 옵션</h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">등급</label>
                    <select
                      value={exportGrade}
                      onChange={(e) => setExportGrade(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {GRADE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">상태</label>
                    <select
                      value={exportStatus}
                      onChange={(e) => setExportStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">시작일</label>
                    <input
                      type="date"
                      value={exportDateFrom}
                      onChange={(e) => setExportDateFrom(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">종료일</label>
                    <input
                      type="date"
                      value={exportDateTo}
                      onChange={(e) => setExportDateTo(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Format selection */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">내보내기 형식</h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => setExportFormat("xlsx")}
                    className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-colors ${
                      exportFormat === "xlsx"
                        ? "border-indigo-300 bg-indigo-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <FileSpreadsheet
                      className={`w-8 h-8 ${
                        exportFormat === "xlsx" ? "text-indigo-600" : "text-gray-400"
                      }`}
                    />
                    <div className="text-left">
                      <p
                        className={`text-sm font-medium ${
                          exportFormat === "xlsx" ? "text-indigo-700" : "text-gray-700"
                        }`}
                      >
                        Excel (.xlsx)
                      </p>
                      <p className="text-xs text-gray-500">Microsoft Excel 형식</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setExportFormat("csv")}
                    className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-colors ${
                      exportFormat === "csv"
                        ? "border-indigo-300 bg-indigo-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <FileText
                      className={`w-8 h-8 ${
                        exportFormat === "csv" ? "text-indigo-600" : "text-gray-400"
                      }`}
                    />
                    <div className="text-left">
                      <p
                        className={`text-sm font-medium ${
                          exportFormat === "csv" ? "text-indigo-700" : "text-gray-700"
                        }`}
                      >
                        CSV (.csv)
                      </p>
                      <p className="text-xs text-gray-500">범용 텍스트 형식</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Remember format option */}
              <div className="border border-gray-200 rounded-xl p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportRemember}
                    onChange={(e) => setExportRemember(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-600" />
                      <span className="text-sm font-medium text-gray-900">
                        리멤버 앱 형식 내보내기
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      리멤버 앱에 맞는 형식 (이름, 회사, 직책, 부서, 휴대폰, 이메일)으로 내보냅니다.
                    </p>
                  </div>
                </label>
              </div>

              {/* Export button */}
              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {exporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    내보내는 중...
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4" />
                    내보내기
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
