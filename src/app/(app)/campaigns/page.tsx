"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Mail, Plus, Send, Eye, Trash2, Loader2,
  Users, CheckCircle, XCircle, Clock,
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  openCount: number;
  createdAt: string;
  sentAt: string | null;
  _count: { recipients: number };
}

interface Customer {
  id: string;
  name: string;
  email: string | null;
}

const STATUS_STYLES: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "초안", color: "bg-gray-100 text-gray-700", icon: Clock },
  scheduled: { label: "예약됨", color: "bg-blue-100 text-blue-700", icon: Clock },
  sending: { label: "발송중", color: "bg-amber-100 text-amber-700", icon: Loader2 },
  sent: { label: "발송완료", color: "bg-green-100 text-green-700", icon: CheckCircle },
  failed: { label: "실패", color: "bg-red-100 text-red-700", icon: XCircle },
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<Campaign & { recipients: { id: string; email: string; name: string; status: string }[] } | null>(null);

  // Create form state
  const [formName, setFormName] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formContent, setFormContent] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/campaigns");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const loadCustomers = async () => {
    const res = await fetch("/api/customers?limit=200");
    if (res.ok) {
      const data = await res.json();
      setCustomers(data.customers.filter((c: Customer) => c.email));
    }
  };

  const handleCreate = async () => {
    if (!formName || !formSubject || !formContent) return;
    setSending(true);

    const recipientEmails = customers
      .filter((c) => selectedCustomers.includes(c.id))
      .map((c) => ({ email: c.email!, name: c.name, customerId: c.id }));

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          subject: formSubject,
          content: formContent,
          recipientEmails,
        }),
      });

      if (res.ok) {
        setShowCreate(false);
        setFormName(""); setFormSubject(""); setFormContent(""); setSelectedCustomers([]);
        fetchCampaigns();
      }
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  const handleSend = async (id: string) => {
    if (!confirm("이 캠페인을 발송하시겠습니까?")) return;
    try {
      await fetch(`/api/campaigns/${id}/send`, { method: "POST" });
      fetchCampaigns();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 캠페인을 삭제하시겠습니까?")) return;
    await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    fetchCampaigns();
  };

  const handleViewDetail = async (id: string) => {
    setShowDetail(id);
    const res = await fetch(`/api/campaigns/${id}`);
    if (res.ok) setDetailData(await res.json());
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("ko-KR");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Mail className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">이메일 캠페인</h1>
                <p className="text-sm text-gray-500 mt-0.5">대량 이메일 발송 관리</p>
              </div>
            </div>
            <button
              onClick={() => { setShowCreate(true); loadCustomers(); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              캠페인 생성
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">아직 캠페인이 없습니다</p>
            <button onClick={() => { setShowCreate(true); loadCustomers(); }} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">
              첫 캠페인 만들기
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {campaigns.map((c) => {
              const st = STATUS_STYLES[c.status] || STATUS_STYLES.draft;
              const Icon = st.icon;
              return (
                <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-base font-semibold text-gray-900">{c.name}</h3>
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                          <Icon className="w-3 h-3" />{st.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{c.subject}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{c._count.recipients}명</span>
                        <span>발송: {c.sentCount}건</span>
                        {c.failedCount > 0 && <span className="text-red-400">실패: {c.failedCount}건</span>}
                        <span>{formatDate(c.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleViewDetail(c.id)} className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-gray-50">
                        <Eye className="w-4 h-4" />
                      </button>
                      {c.status === "draft" && (
                        <button onClick={() => handleSend(c.id)} className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-gray-50">
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(c.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-50">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">새 캠페인 생성</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">캠페인 이름</label>
                  <input value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="예: 2월 뉴스레터" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">이메일 제목</label>
                  <input value={formSubject} onChange={(e) => setFormSubject(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="이메일 제목" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
                  <textarea value={formContent} onChange={(e) => setFormContent(e.target.value)} rows={6} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="이메일 본문을 입력하세요..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">수신자 선택 ({selectedCustomers.length}명 선택)</label>
                  <div className="border rounded-lg max-h-48 overflow-y-auto p-2 space-y-1">
                    {customers.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">이메일이 있는 고객이 없습니다</p>
                    ) : (
                      <>
                        <button
                          onClick={() => setSelectedCustomers(selectedCustomers.length === customers.length ? [] : customers.map((c) => c.id))}
                          className="w-full text-left px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded"
                        >
                          {selectedCustomers.length === customers.length ? "전체 해제" : "전체 선택"}
                        </button>
                        {customers.map((c) => (
                          <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedCustomers.includes(c.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedCustomers([...selectedCustomers, c.id]);
                                else setSelectedCustomers(selectedCustomers.filter((id) => id !== c.id));
                              }}
                              className="rounded"
                            />
                            <span className="text-sm text-gray-700">{c.name}</span>
                            <span className="text-xs text-gray-400">{c.email}</span>
                          </label>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">취소</button>
                <button
                  onClick={handleCreate}
                  disabled={sending || !formName || !formSubject || !formContent}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {sending && <Loader2 className="w-4 h-4 animate-spin" />}
                  생성
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && detailData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowDetail(null); setDetailData(null); }} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold mb-2">{detailData.name}</h2>
            <p className="text-sm text-gray-500 mb-4">{detailData.subject}</p>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">전체</p>
                <p className="text-lg font-bold">{detailData.totalCount}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-xs text-green-600">발송</p>
                <p className="text-lg font-bold text-green-700">{detailData.sentCount}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <p className="text-xs text-red-600">실패</p>
                <p className="text-lg font-bold text-red-700">{detailData.failedCount}</p>
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">수신자 목록</h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {detailData.recipients.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm">
                  <span>{r.name || r.email}</span>
                  <span className={`text-xs ${r.status === "sent" ? "text-green-600" : r.status === "failed" ? "text-red-600" : "text-gray-400"}`}>{r.status}</span>
                </div>
              ))}
            </div>
            <button onClick={() => { setShowDetail(null); setDetailData(null); }} className="mt-4 w-full py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}
