"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import {
  Building2, Camera, Download, Loader2, Mail, Phone, Plus, Search, Star, Upload, Users, Video,
} from "lucide-react";
import AramNav from "../_components/AramNav";
import { api, btnGhost, btnPrimary, card, input, relDay } from "../_components/utils";
import { useDebounce } from "@/hooks/useDebounce";
import AddContactModal from "./_components/AddContactModal";
import ScanCardModal from "./_components/ScanCardModal";
import ImportModal from "./_components/ImportModal";
import { IMPORTANCE, importanceOf, type ContactListItem } from "./_components/types";

interface ListResponse {
  data: ContactListItem[];
  companies: { company: string; count: number }[];
  pagination: { page: number; total: number; totalPages: number };
}

const SORTS = [
  { value: "recent", label: "최근 연락순" },
  { value: "name", label: "이름순" },
  { value: "company", label: "회사순" },
];

export default function ContactsPage() {
  const [q, setQ] = useState("");
  const debounced = useDebounce(q, 300);
  const [company, setCompany] = useState("");
  const [importance, setImportance] = useState("");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [res, setRes] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"add" | "scan" | "import" | null>(null);

  // 홈 온보딩 링크(/aram/contacts?import=1)로 들어오면 가져오기 창을 바로 연다
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("import") === "1") setModal("import");
    else if (p.get("scan") === "1") setModal("scan");
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ sort, page: String(page), limit: "60" });
      if (debounced) params.set("q", debounced);
      if (company) params.set("company", company);
      if (importance) params.set("importance", importance);
      setRes(await api<ListResponse>(`/api/aram/contacts?${params}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, [debounced, company, importance, sort, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [debounced, company, importance, sort]);

  const exportCsv = async () => {
    const params = new URLSearchParams({ sort, limit: "500" });
    if (debounced) params.set("q", debounced);
    if (company) params.set("company", company);
    if (importance) params.set("importance", importance);
    const all = await api<ListResponse>(`/api/aram/contacts?${params}`);
    const csv = Papa.unparse(
      all.data.map((c) => ({
        이름: c.name, 영문이름: c.nameEn ?? "", 회사: c.company ?? "", 부서: c.department ?? "", 직책: c.position ?? "",
        이메일: c.email ?? "", 휴대폰: c.mobile ?? "", 전화: c.phone ?? "", 태그: c.tags ?? "",
        중요도: importanceOf(c.importance).label, 최근연락: c.lastContactAt?.slice(0, 10) ?? "", 미팅수: c._count.meetings,
      }))
    );
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `아람_명함첩_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <AramNav
        title="명함첩"
        subtitle="만난 모든 사람 — 명함·미팅·이메일이 하나로 연결됩니다"
        actions={
          <>
            <button className={btnGhost} onClick={exportCsv}><Download className="w-4 h-4" />내보내기</button>
            <button className={btnGhost} onClick={() => setModal("import")}><Upload className="w-4 h-4" />가져오기</button>
            <button className={btnGhost} onClick={() => setModal("scan")}><Camera className="w-4 h-4" />명함 촬영</button>
            <button className={btnPrimary} onClick={() => setModal("add")}><Plus className="w-4 h-4" />명함 추가</button>
          </>
        }
      />

      <div className={`${card} p-4 mb-4 space-y-3`}>
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input className={`${input} pl-9`} placeholder="이름, 회사, 이메일, 전화번호, 태그, 메모 검색" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className={`${input} md:w-36`} value={importance} onChange={(e) => setImportance(e.target.value)}>
            <option value="">중요도 전체</option>
            {IMPORTANCE.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
          </select>
          <select className={`${input} md:w-36`} value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        {res && res.companies.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setCompany("")}
              className={`px-3 py-1 rounded-full text-xs border whitespace-nowrap ${!company ? "bg-indigo-600 text-white border-indigo-600" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600"}`}
            >
              전체
            </button>
            {res.companies.map((c) => (
              <button
                key={c.company}
                onClick={() => setCompany(company === c.company ? "" : c.company)}
                className={`px-3 py-1 rounded-full text-xs border whitespace-nowrap ${company === c.company ? "bg-indigo-600 text-white border-indigo-600" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600"}`}
              >
                {c.company} <span className="opacity-60">{c.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-3 text-sm text-gray-500">
        <span>{res ? `${res.pagination.total.toLocaleString()}명` : ""}</span>
      </div>

      {error && <p className="text-sm text-rose-600 mb-3">{error}</p>}
      {loading && !res ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : res && res.data.length === 0 ? (
        <div className={`${card} text-center py-16`}>
          <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600 dark:text-gray-300 font-medium">아직 명함이 없습니다</p>
          <p className="text-sm text-gray-400 mt-1">리멤버에서 내보낸 엑셀을 가져오거나 명함을 촬영해보세요</p>
          <div className="flex justify-center gap-2 mt-5">
            <button className={btnGhost} onClick={() => setModal("import")}><Upload className="w-4 h-4" />리멤버 가져오기</button>
            <button className={btnPrimary} onClick={() => setModal("scan")}><Camera className="w-4 h-4" />명함 촬영</button>
          </div>
        </div>
      ) : (
        <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 ${loading ? "opacity-60" : ""}`}>
          {res?.data.map((c) => {
            const imp = importanceOf(c.importance);
            return (
              <Link key={c.id} href={`/aram/contacts/${c.id}`} className={`${card} p-4 hover:shadow-md hover:border-indigo-200 transition-all flex gap-3`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-gray-900 dark:text-white break-words">{c.name}</span>
                    {(c.importance === "vip" || c.importance === "high") && (
                      <Star className={`w-4 h-4 ${c.importance === "vip" ? "fill-amber-400 text-amber-400" : "text-orange-400"}`} />
                    )}
                    {c.importance !== "normal" && <span className={`text-[10px] px-1.5 py-0.5 rounded ${imp.cls}`}>{imp.label}</span>}
                  </div>
                  {c.position && <p className="text-xs text-gray-500 break-words">{[c.department, c.position].filter(Boolean).join(" · ")}</p>}
                  {c.company && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 flex items-center gap-1 break-words">
                      <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />{c.company}
                    </p>
                  )}
                  <div className="mt-2 space-y-0.5 text-xs text-gray-500">
                    {c.email && <p className="flex items-center gap-1 break-all"><Mail className="w-3 h-3 shrink-0" />{c.email}</p>}
                    {(c.mobile || c.phone) && <p className="flex items-center gap-1"><Phone className="w-3 h-3 shrink-0" />{c.mobile || c.phone}</p>}
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-[11px] text-gray-400">
                    <span>최근 연락 {c.lastContactAt ? relDay(c.lastContactAt) : "없음"}</span>
                    {c._count.meetings > 0 && <span className="flex items-center gap-0.5"><Video className="w-3 h-3" />미팅 {c._count.meetings}</span>}
                    {c._count.emails > 0 && <span className="flex items-center gap-0.5"><Mail className="w-3 h-3" />{c._count.emails}</span>}
                  </div>
                </div>
                {c.cardImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.cardImageUrl} alt="" className="w-20 h-12 object-cover rounded-md border border-gray-200 shrink-0" loading="lazy" />
                )}
              </Link>
            );
          })}
        </div>
      )}

      {res && res.pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button className={btnGhost} disabled={page <= 1} onClick={() => setPage(page - 1)}>이전</button>
          <span className="text-sm text-gray-500">{page} / {res.pagination.totalPages}</span>
          <button className={btnGhost} disabled={page >= res.pagination.totalPages} onClick={() => setPage(page + 1)}>다음</button>
        </div>
      )}

      <AddContactModal open={modal === "add"} onClose={() => setModal(null)} onSaved={load} />
      <ScanCardModal open={modal === "scan"} onClose={() => setModal(null)} onSaved={load} />
      <ImportModal open={modal === "import"} onClose={() => setModal(null)} onDone={load} />
    </div>
  );
}
