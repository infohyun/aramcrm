"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare, Send, Search, Filter,
  ChevronLeft, ChevronRight, X, Users, Plus, FileText
} from "lucide-react";

interface Brand { id: string; code: string; name: string; }

interface MessageLog {
  id: string; channel: string; direction: string; customerName: string | null;
  customerPhone: string | null; customerEmail: string | null; subject: string | null;
  content: string; status: string; sentAt: string | null; deliveredAt: string | null;
  readAt: string | null; failReason: string | null; brand: { name: string; code: string } | null;
  createdAt: string;
}

interface MessageTemplate {
  id: string; name: string; channel: string; category: string;
  subject: string | null; content: string; variables: string | null;
}

const channelConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  kakao: { label: "카카오톡", color: "text-yellow-700", bg: "bg-yellow-100", icon: "K" },
  sms: { label: "SMS", color: "text-green-700", bg: "bg-green-100", icon: "S" },
  email: { label: "이메일", color: "text-blue-700", bg: "bg-blue-100", icon: "E" },
  messenger: { label: "메신저", color: "text-indigo-700", bg: "bg-indigo-100", icon: "M" },
  slack: { label: "슬랙", color: "text-purple-700", bg: "bg-purple-100", icon: "#" },
  push: { label: "푸시알림", color: "text-pink-700", bg: "bg-pink-100", icon: "P" },
};

const statusLabels: Record<string, string> = {
  pending: "대기", sent: "발송", delivered: "수신", failed: "실패", read: "읽음",
};

export default function MessagingHubPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [channelStats, setChannelStats] = useState<{ channel: string; _count: number }[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [search, setSearch] = useState("");
  const [showCompose, setShowCompose] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const [composeForm, setComposeForm] = useState({
    channel: "kakao", brandId: "", customerName: "", customerPhone: "", customerEmail: "",
    subject: "", content: "",
  });

  useEffect(() => {
    fetch("/api/brands").then(r => r.ok ? r.json() : []).then(setBrands).catch(() => {});
    fetch("/api/messaging/templates").then(r => r.ok ? r.json() : []).then(setTemplates).catch(() => {});
  }, []);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (selectedChannel) params.set("channel", selectedChannel);
      if (selectedBrand) params.set("brandId", selectedBrand);
      if (search) params.set("search", search);
      const res = await fetch(`/api/messaging?${params}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        setTotal(data.total);
        setChannelStats(data.channelStats || []);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [page, selectedChannel, selectedBrand, search]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/messaging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(composeForm),
      });
      if (res.ok) {
        setShowCompose(false);
        setComposeForm({ channel: "kakao", brandId: "", customerName: "", customerPhone: "", customerEmail: "", subject: "", content: "" });
        fetchMessages();
      }
    } catch { /* ignore */ }
  };

  const applyTemplate = (t: MessageTemplate) => {
    setComposeForm(f => ({ ...f, channel: t.channel, subject: t.subject || "", content: t.content }));
    setShowTemplates(false);
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111]">멀티채널 메시징 허브</h1>
          <p className="text-sm text-gray-500 mt-1">카카오톡, SMS, 이메일, 메신저, 슬랙 통합 메시징</p>
        </div>
        <button onClick={() => setShowCompose(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#111] text-white rounded-xl text-sm font-medium hover:bg-[#333]">
          <Send size={16} /> 메시지 발송
        </button>
      </div>

      {/* Channel Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {Object.entries(channelConfig).map(([ch, cfg]) => {
          const stat = channelStats.find(s => s.channel === ch);
          return (
            <button key={ch} onClick={() => { setSelectedChannel(selectedChannel === ch ? "" : ch); setPage(1); }}
              className={`bg-white rounded-2xl border p-4 text-center transition-all ${
                selectedChannel === ch ? "ring-2 ring-[#111] border-[#111]" : "hover:shadow-sm"
              }`}>
              <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center mx-auto mb-2`}>
                <span className={`text-sm font-bold ${cfg.color}`}>{cfg.icon}</span>
              </div>
              <p className="text-lg font-bold">{stat?._count || 0}</p>
              <p className="text-xs text-gray-400">{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white rounded-xl border px-3 py-2 flex-1 max-w-md">
          <Search size={16} className="text-gray-400" />
          <input type="text" placeholder="고객명, 연락처, 내용 검색..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="bg-transparent text-sm outline-none w-full" />
        </div>
        <select value={selectedBrand} onChange={(e) => { setSelectedBrand(e.target.value); setPage(1); }}
          className="bg-white rounded-xl border px-3 py-2 text-sm">
          <option value="">전체 브랜드</option>
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Messages Table */}
      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-center px-4 py-3 font-medium text-gray-500 w-16">채널</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">수신자</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">내용</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">상태</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">발송일</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">로딩 중...</td></tr>
            ) : messages.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">메시지가 없습니다</td></tr>
            ) : messages.map((m) => {
              const cfg = channelConfig[m.channel] || { label: m.channel, color: "text-gray-700", bg: "bg-gray-100", icon: "?" };
              return (
                <tr key={m.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${cfg.bg}`}>
                      <span className={`text-xs font-bold ${cfg.color}`}>{cfg.icon}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{m.customerName || "-"}</p>
                    <p className="text-xs text-gray-400">{m.customerPhone || m.customerEmail || "-"}</p>
                  </td>
                  <td className="px-4 py-3">
                    {m.subject && <p className="font-medium text-xs text-gray-600 mb-0.5">{m.subject}</p>}
                    <p className="text-gray-500">{m.content}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      m.status === "sent" || m.status === "delivered" || m.status === "read" ? "bg-green-100 text-green-700" :
                      m.status === "failed" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                    }`}>{statusLabels[m.status] || m.status}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-400 text-xs">
                    {m.sentAt ? new Date(m.sentAt).toLocaleString("ko") : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <p className="text-sm text-gray-500">총 {total}건</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronLeft size={16} /></button>
              <span className="px-3 text-sm">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">메시지 발송</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowTemplates(true)} className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700">
                  <FileText size={14} /> 템플릿
                </button>
                <button onClick={() => setShowCompose(false)}><X size={20} className="text-gray-400" /></button>
              </div>
            </div>
            <form onSubmit={handleSend} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">채널 *</label>
                  <select value={composeForm.channel} onChange={e => setComposeForm(f => ({ ...f, channel: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm">
                    {Object.entries(channelConfig).map(([ch, cfg]) => <option key={ch} value={ch}>{cfg.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">브랜드</label>
                  <select value={composeForm.brandId} onChange={e => setComposeForm(f => ({ ...f, brandId: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm">
                    <option value="">선택안함</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">수신자명 *</label>
                  <input type="text" value={composeForm.customerName} required
                    onChange={e => setComposeForm(f => ({ ...f, customerName: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    {composeForm.channel === "email" ? "이메일 *" : "연락처 *"}
                  </label>
                  {composeForm.channel === "email" ? (
                    <input type="email" value={composeForm.customerEmail} required
                      onChange={e => setComposeForm(f => ({ ...f, customerEmail: e.target.value }))}
                      className="w-full border rounded-xl px-3 py-2 text-sm" />
                  ) : (
                    <input type="text" value={composeForm.customerPhone} required
                      onChange={e => setComposeForm(f => ({ ...f, customerPhone: e.target.value }))}
                      placeholder="010-0000-0000" className="w-full border rounded-xl px-3 py-2 text-sm" />
                  )}
                </div>
              </div>
              {(composeForm.channel === "email" || composeForm.channel === "slack") && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">제목</label>
                  <input type="text" value={composeForm.subject}
                    onChange={e => setComposeForm(f => ({ ...f, subject: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">내용 *</label>
                <textarea value={composeForm.content} required rows={5}
                  onChange={e => setComposeForm(f => ({ ...f, content: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCompose(false)} className="px-4 py-2 border rounded-xl text-sm hover:bg-gray-50">취소</button>
                <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-[#111] text-white rounded-xl text-sm font-medium hover:bg-[#333]">
                  <Send size={14} /> 발송
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[70vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">메시지 템플릿</h3>
              <button onClick={() => setShowTemplates(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            {templates.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">등록된 템플릿이 없습니다</p>
            ) : (
              <div className="space-y-2">
                {templates.map(t => (
                  <button key={t.id} onClick={() => applyTemplate(t)}
                    className="w-full text-left p-3 border rounded-xl hover:bg-gray-50">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        channelConfig[t.channel]?.bg || "bg-gray-100"
                      } ${channelConfig[t.channel]?.color || "text-gray-700"}`}>
                        {channelConfig[t.channel]?.label || t.channel}
                      </span>
                      <span className="text-sm font-medium">{t.name}</span>
                    </div>
                    <p className="text-xs text-gray-400">{t.content}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
