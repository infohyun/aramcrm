"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { CheckCircle2, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { Modal } from "@/components/ui";
import {
  CONTACT_FIELDS,
  CONTACT_FIELD_LABELS,
  mapHeaders,
  parseVCards,
  rowsToContacts,
  type ContactField,
  type ContactInput,
} from "@/lib/aram/contacts";
import { api, btnGhost, btnPrimary, input } from "../../_components/utils";

type Tab = "remember" | "vcard" | "csv";

const TABS: { id: Tab; label: string }[] = [
  { id: "remember", label: "리멤버 (엑셀/CSV)" },
  { id: "vcard", label: "vCard (.vcf)" },
  { id: "csv", label: "구글 · 아웃룩 CSV" },
];

const GUIDE: Record<Tab, React.ReactNode> = {
  remember: (
    <ol className="list-decimal pl-5 space-y-1">
      <li>리멤버 앱 → <b>명함첩</b> → 우측 상단 메뉴(또는 설정)에서 <b>&quot;명함 데이터 내보내기(엑셀)&quot;</b>를 선택합니다.</li>
      <li>이메일로 받은 엑셀 파일(.xlsx)을 PC에 저장한 뒤 아래에 올려주세요.</li>
      <li>PC 웹(remember.co.kr)에서도 명함 내보내기가 가능합니다. 메뉴 위치는 앱 버전에 따라 다를 수 있습니다.</li>
    </ol>
  ),
  vcard: (
    <ol className="list-decimal pl-5 space-y-1">
      <li>아이폰 연락처 앱 / 구글 연락처 / 아웃룩에서 연락처를 <b>vCard(.vcf)</b>로 내보냅니다.</li>
      <li>여러 연락처가 하나의 .vcf 파일에 담겨 있어도 모두 가져옵니다.</li>
    </ol>
  ),
  csv: (
    <ol className="list-decimal pl-5 space-y-1">
      <li>구글 연락처 → 내보내기 → <b>Google CSV</b>, 또는 아웃룩 → 파일 → 내보내기 → <b>CSV</b>.</li>
      <li>다른 프로그램의 엑셀/CSV도 열 이름을 자동 인식하며, 아래에서 직접 지정할 수 있습니다.</li>
    </ol>
  ),
};

export default function ImportModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>("remember");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<Partial<Record<string, ContactField>>>({});
  const [vcards, setVcards] = useState<ContactInput[] | null>(null);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ created: number; updated: number; skipped: number } | null>(null);
  const [error, setError] = useState("");

  const reset = () => {
    setFileName("");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setVcards(null);
    setProgress(null);
    setResult(null);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const close = () => {
    if (progress && !result) return;
    reset();
    onClose();
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    reset();
    setFileName(file.name);
    try {
      if (/\.vcf$/i.test(file.name)) {
        const list = parseVCards(await file.text());
        if (!list.length) throw new Error("vCard 에서 연락처를 찾지 못했습니다.");
        setVcards(list);
        return;
      }
      const buf = await file.arrayBuffer();
      const wb = /\.csv$/i.test(file.name)
        ? XLSX.read(new TextDecoder("utf-8").decode(buf).replace(/^﻿/, ""), { type: "string" })
        : XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      if (!data.length) throw new Error("파일에 데이터가 없습니다.");
      const hs = Object.keys(data[0]);
      setHeaders(hs);
      setRows(data);
      setMapping(mapHeaders(hs));
    } catch (e) {
      setError(e instanceof Error ? e.message : "파일을 읽지 못했습니다.");
    }
  };

  const contacts: ContactInput[] = vcards ?? (rows.length ? rowsToContacts(rows, mapping) : []);
  const mappedFields = Object.values(mapping).filter(Boolean) as ContactField[];
  const hasName = vcards !== null || mappedFields.includes("name") || mappedFields.includes("email");

  const runImport = async () => {
    if (!contacts.length) return setError("가져올 명함이 없습니다.");
    setError("");
    const total = { created: 0, updated: 0, skipped: 0 };
    setProgress({ done: 0, total: contacts.length });
    try {
      for (let i = 0; i < contacts.length; i += 1000) {
        const batch = contacts.slice(i, i + 1000);
        const r = await api<typeof total>("/api/aram/contacts/import", {
          method: "POST",
          json: { contacts: batch, source: tab === "remember" ? "remember" : tab === "vcard" ? "vcard" : "csv", updateExisting },
        });
        total.created += r.created;
        total.updated += r.updated;
        total.skipped += r.skipped;
        setProgress({ done: Math.min(i + batch.length, contacts.length), total: contacts.length });
      }
      setResult(total);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "가져오기 실패");
      setProgress(null);
    }
  };

  const previewFields: ContactField[] = vcards
    ? ["name", "company", "position", "email", "mobile"]
    : CONTACT_FIELDS.filter((f) => mappedFields.includes(f));

  return (
    <Modal isOpen={open} onClose={close} title="명함 가져오기" size="xl">
      {result ? (
        <div className="text-center py-8">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <p className="text-lg font-semibold text-gray-900">가져오기 완료</p>
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <div><p className="text-2xl font-bold text-indigo-600">{result.created}</p><p className="text-gray-500">새로 추가</p></div>
            <div><p className="text-2xl font-bold text-emerald-600">{result.updated}</p><p className="text-gray-500">업데이트</p></div>
            <div><p className="text-2xl font-bold text-gray-400">{result.skipped}</p><p className="text-gray-500">건너뜀</p></div>
          </div>
          <button className={`${btnPrimary} mt-6`} onClick={close}>닫기</button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl w-fit max-w-full overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); reset(); }}
                className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${tab === t.id ? "bg-white dark:bg-gray-700 shadow-sm font-medium text-gray-900 dark:text-white" : "text-gray-500"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-300 bg-indigo-50/60 dark:bg-indigo-500/10 rounded-xl p-4">{GUIDE[tab]}</div>

          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept={tab === "vcard" ? ".vcf,text/vcard" : ".xlsx,.xls,.csv"}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 p-6 rounded-2xl border-2 border-dashed border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-sm text-gray-600"
          >
            {fileName ? <FileSpreadsheet className="w-5 h-5 text-indigo-500" /> : <Upload className="w-5 h-5" />}
            {fileName || "파일 선택"}
          </button>

          {headers.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 mb-2">열 매핑 <span className="text-gray-400 font-normal">(자동 인식 · 필요 시 수정)</span></p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                {headers.map((h) => (
                  <div key={h} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-28 shrink-0 break-words">{h}</span>
                    <select
                      className={`${input} py-1.5 text-xs`}
                      value={mapping[h] ?? ""}
                      onChange={(e) => setMapping({ ...mapping, [h]: (e.target.value || undefined) as ContactField | undefined })}
                    >
                      <option value="">무시</option>
                      {CONTACT_FIELDS.map((f) => (
                        <option key={f} value={f}>{CONTACT_FIELD_LABELS[f]}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              {!hasName && <p className="text-xs text-rose-600 mt-2">&quot;이름&quot; 또는 &quot;이메일&quot; 열을 지정해야 합니다.</p>}
            </div>
          )}

          {contacts.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 mb-2">미리보기 <span className="text-gray-400 font-normal">총 {contacts.length.toLocaleString()}건 중 10건</span></p>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>{previewFields.map((f) => <th key={f} className="px-2 py-1.5 text-left font-medium text-gray-500 whitespace-nowrap">{CONTACT_FIELD_LABELS[f]}</th>)}</tr>
                  </thead>
                  <tbody>
                    {contacts.slice(0, 10).map((c, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        {previewFields.map((f) => <td key={f} className="px-2 py-1.5 text-gray-700 max-w-[200px] break-words">{c[f] ?? ""}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {contacts.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <input type="checkbox" checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)} />
              기존 명함 정보 업데이트 (이메일·휴대폰이 같은 명함은 병합)
            </label>
          )}

          {progress && (
            <div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </div>
              <p className="text-xs text-gray-500 mt-1">{progress.done.toLocaleString()} / {progress.total.toLocaleString()}</p>
            </div>
          )}
          {error && <p className="text-sm text-rose-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <button className={btnGhost} onClick={close} disabled={!!progress}>취소</button>
            <button className={btnPrimary} onClick={runImport} disabled={!contacts.length || !hasName || !!progress}>
              {progress && <Loader2 className="w-4 h-4 animate-spin" />}
              {contacts.length ? `${contacts.length.toLocaleString()}건 가져오기` : "가져오기"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
