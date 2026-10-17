"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Building2, CalendarClock, CheckCircle2, Circle, Globe, Inbox, Loader2, Mail, MapPin, Mic, Pencil,
  Phone, Printer, RefreshCw, Send, Smartphone, Sparkles, Star, Tag, Trash2, UserRound, Video,
} from "lucide-react";
import { Modal } from "@/components/ui";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import AramNav from "../../_components/AramNav";
import AramMarkdown from "../../_components/AramMarkdown";
import {
  api, btnGhost, btnPrimary, card, fmtDate, fmtDuration, input, isOverdue, PRIORITY_LABEL, relDay, SENTIMENT_LABEL, STATUS_LABEL,
} from "../../_components/utils";
import ContactForm from "../_components/ContactForm";
import { IMPORTANCE, importanceOf, type ContactFormValue } from "../_components/types";
import EmailComposer from "./_components/EmailComposer";
import InboundEmailModal from "./_components/InboundEmailModal";
import type { ContactDetail } from "./_components/types";
import { CONTACT_FIELDS } from "@/lib/aram/contacts";

type Tab = "timeline" | "meetings" | "emails" | "actions";

interface TimelineItem {
  key: string;
  date: string;
  kind: "meeting" | "email-in" | "email-out" | "action";
  title: string;
  sub?: string | null;
  href?: string;
}

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useCurrentUser();
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("timeline");
  const [editOpen, setEditOpen] = useState(false);
  const [editValue, setEditValue] = useState<ContactFormValue>({});
  const [saving, setSaving] = useState(false);
  const [briefLoading, setBriefLoading] = useState<"brief" | "prep" | null>(null);
  const [prep, setPrep] = useState<string | null>(null);
  const [inboundOpen, setInboundOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState("");
  const [gmailSyncing, setGmailSyncing] = useState(false);
  const [gmailMessage, setGmailMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const c = await api<ContactDetail>(`/api/aram/contacts/${id}`);
      setContact(c);
      setFollowUp(c.nextFollowUpAt ? c.nextFollowUpAt.slice(0, 10) : "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기 실패");
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const syncGmail = async () => {
    setGmailSyncing(true);
    setGmailMessage("");
    try {
      const r = await api<{ imported: number; total: number }>(`/api/aram/contacts/${id}/gmail-sync`, { method: "POST" });
      setGmailMessage(r.imported ? `Gmail 에서 ${r.imported}건을 가져왔습니다.` : "새로 가져올 메일이 없습니다.");
      await load();
    } catch (e) {
      setGmailMessage(e instanceof Error ? e.message : "Gmail 동기화 실패");
    } finally {
      setGmailSyncing(false);
    }
  };

  const patch = async (data: Record<string, unknown>) => {
    await api(`/api/aram/contacts/${id}`, { method: "PATCH", json: data });
    await load();
  };

  const openEdit = () => {
    if (!contact) return;
    const v: ContactFormValue = { importance: contact.importance, visibility: contact.visibility };
    for (const f of CONTACT_FIELDS) v[f] = contact[f];
    setEditValue(v);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await patch(editValue as Record<string, unknown>);
      setEditOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm("이 명함을 삭제할까요? 연결된 미팅 기록은 유지됩니다.")) return;
    try {
      await api(`/api/aram/contacts/${id}`, { method: "DELETE" });
      router.push("/aram/contacts");
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제 실패");
    }
  };

  const brief = async (mode: "brief" | "prep") => {
    setBriefLoading(mode);
    try {
      const r = await api<{ content: string }>(`/api/aram/contacts/${id}/brief`, { method: "POST", json: { mode } });
      if (mode === "prep") setPrep(r.content);
      else await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "브리핑 생성 실패");
    } finally {
      setBriefLoading(null);
    }
  };

  const toggleAction = async (actionId: string, done: boolean) => {
    await api(`/api/aram/actions/${actionId}`, { method: "PATCH", json: { status: done ? "open" : "done" } });
    await load();
  };

  if (error) return <div className="max-w-6xl mx-auto"><AramNav title="명함" /><p className="text-rose-600">{error}</p></div>;
  if (!contact) return <div className="flex justify-center py-32"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  const imp = importanceOf(contact.importance);
  const canDelete = user?.id === contact.owner.id || (user as { role?: string } | null)?.role === "admin";

  const timeline: TimelineItem[] = [
    ...contact.meetings.map((m) => ({ key: `m${m.id}`, date: m.startedAt, kind: "meeting" as const, title: m.title, sub: m.oneLiner, href: `/aram/meetings/${m.id}` })),
    ...contact.emails.map((e) => ({
      key: `e${e.id}`,
      date: e.sentAt ?? e.createdAt,
      kind: e.direction === "inbound" ? ("email-in" as const) : ("email-out" as const),
      title: e.subject,
      sub: `${e.direction === "inbound" ? "받은 메일" : e.status === "sent" ? "보낸 메일" : e.status === "failed" ? "발송 실패" : "초안"} · ${e.body.slice(0, 120)}`,
    })),
    ...contact.actionItems.map((a) => ({
      key: `a${a.id}`,
      date: a.dueDate ?? a.createdAt,
      kind: "action" as const,
      title: a.title,
      sub: `${a.assignee?.name ?? a.assigneeName ?? "담당 미정"} · ${a.status === "done" ? "완료" : relDay(a.dueDate)}`,
      href: a.meeting ? `/aram/meetings/${a.meeting.id}` : undefined,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const KIND_ICON = {
    meeting: { icon: Video, cls: "bg-indigo-100 text-indigo-600" },
    "email-in": { icon: Inbox, cls: "bg-sky-100 text-sky-600" },
    "email-out": { icon: Send, cls: "bg-emerald-100 text-emerald-600" },
    action: { icon: CheckCircle2, cls: "bg-amber-100 text-amber-600" },
  };

  const info: { icon: React.ElementType; value: string | null; href?: string }[] = [
    { icon: Mail, value: contact.email, href: contact.email ? `mailto:${contact.email}` : undefined },
    { icon: Mail, value: contact.email2, href: contact.email2 ? `mailto:${contact.email2}` : undefined },
    { icon: Smartphone, value: contact.mobile, href: contact.mobile ? `tel:${contact.mobile}` : undefined },
    { icon: Phone, value: contact.phone, href: contact.phone ? `tel:${contact.phone}` : undefined },
    { icon: Printer, value: contact.fax ? `팩스 ${contact.fax}` : null },
    { icon: MapPin, value: contact.address },
    { icon: Globe, value: contact.website, href: contact.website ? (contact.website.startsWith("http") ? contact.website : `https://${contact.website}`) : undefined },
    { icon: Globe, value: [contact.country, contact.language ? `언어: ${contact.language}` : null].filter(Boolean).join(" · ") || null },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <AramNav title="명함첩" subtitle="사람 중심으로 쌓이는 대화 기록" />
      <Link href="/aram/contacts" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-3">
        <ArrowLeft className="w-4 h-4" />목록
      </Link>

      {/* 프로필 헤더 */}
      <div className={`${card} p-5 mb-4`}>
        <div className="flex flex-col md:flex-row gap-5">
          {contact.cardImageUrl && (
            <a href={contact.cardImageUrl} target="_blank" rel="noreferrer" className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={contact.cardImageUrl} alt="명함" className="w-full md:w-56 rounded-xl border border-gray-200 object-cover" />
            </a>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white break-words">{contact.name}</h2>
                  {contact.nameEn && <span className="text-gray-400">{contact.nameEn}</span>}
                  <select
                    className={`text-xs rounded-full px-2 py-0.5 border-0 ${imp.cls}`}
                    value={contact.importance}
                    onChange={(e) => patch({ importance: e.target.value })}
                    title="중요도"
                  >
                    {IMPORTANCE.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
                  </select>
                  {contact.importance === "vip" && <Star className="w-5 h-5 fill-amber-400 text-amber-400" />}
                </div>
                <p className="text-gray-600 dark:text-gray-300 mt-1 flex items-center gap-1.5 flex-wrap">
                  {contact.company && <><Building2 className="w-4 h-4 text-gray-400" />{contact.company}</>}
                  {(contact.department || contact.position) && <span className="text-gray-500">· {[contact.department, contact.position].filter(Boolean).join(" ")}</span>}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  등록 {contact.owner.name} · {fmtDate(contact.createdAt)} · 출처 {contact.source} · 최근 연락 {contact.lastContactAt ? relDay(contact.lastContactAt) : "없음"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/aram/record?contactId=${contact.id}`} className={btnPrimary}><Mic className="w-4 h-4" />이 분과 미팅 시작</Link>
                <button className={btnGhost} onClick={() => brief("prep")} disabled={!!briefLoading}>
                  {briefLoading === "prep" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}미팅 준비 브리핑
                </button>
                <button className={btnGhost} onClick={openEdit}><Pencil className="w-4 h-4" />편집</button>
                {canDelete && <button className={`${btnGhost} text-rose-600`} onClick={remove}><Trash2 className="w-4 h-4" /></button>}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 mt-4 text-sm">
              {info.filter((i) => i.value).map((i, idx) => {
                const Icon = i.icon;
                return (
                  <p key={idx} className="flex items-start gap-2 text-gray-700 dark:text-gray-300 break-all">
                    <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    {i.href ? <a href={i.href} className="hover:text-indigo-600" target={i.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{i.value}</a> : i.value}
                  </p>
                );
              })}
            </div>
            {contact.tags && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {contact.tags.split(",").map((t) => t.trim()).filter(Boolean).map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full"><Tag className="w-3 h-3" />{t}</span>
                ))}
              </div>
            )}
            {contact.memo && <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 rounded-lg p-3 whitespace-pre-wrap break-words">{contact.memo}</p>}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-4">
        <div className="space-y-4 min-w-0">
          {/* 관계 브리핑 */}
          <div className={`${card} p-5`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-violet-500" />관계 브리핑</h3>
              <button className={btnGhost} onClick={() => brief("brief")} disabled={!!briefLoading}>
                {briefLoading === "brief" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {contact.aiBrief ? "갱신" : "생성"}
              </button>
            </div>
            {contact.aiBrief ? (
              <>
                <p className="text-xs text-gray-400 mb-2">{fmtDate(contact.aiBriefAt, true)} 기준</p>
                <AramMarkdown content={contact.aiBrief} />
              </>
            ) : (
              <p className="text-sm text-gray-500">미팅·이메일·할 일을 종합해 관계의 흐름, 향후 전망, 액션 플랜을 정리합니다.</p>
            )}
          </div>

          {/* 탭 */}
          <div className={card}>
            <div className="flex gap-1 p-2 border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
              {([
                ["timeline", `타임라인 ${timeline.length}`],
                ["meetings", `미팅 ${contact.meetings.length}`],
                ["emails", `이메일 ${contact.emails.length}`],
                ["actions", `할 일 ${contact.actionItems.length}`],
              ] as [Tab, string][]).map(([t, label]) => (
                <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${tab === t ? "bg-indigo-50 text-indigo-700 font-medium dark:bg-indigo-500/20 dark:text-indigo-300" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="p-4">
              {tab === "timeline" && (
                timeline.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">아직 기록이 없습니다</p> : (
                  <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-3 space-y-4">
                    {timeline.map((t) => {
                      const k = KIND_ICON[t.kind];
                      const Icon = k.icon;
                      const body = (
                        <>
                          <p className="text-sm font-medium text-gray-900 dark:text-white break-words">{t.title}</p>
                          {t.sub && <p className="text-xs text-gray-500 mt-0.5 break-words line-clamp-2">{t.sub}</p>}
                          <p className="text-[11px] text-gray-400 mt-0.5">{fmtDate(t.date, t.kind !== "action")}</p>
                        </>
                      );
                      return (
                        <li key={t.key} className="ml-5">
                          <span className={`absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full ${k.cls}`}><Icon className="w-3.5 h-3.5" /></span>
                          {t.href ? <Link href={t.href} className="block hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg -mx-2 px-2 py-1">{body}</Link> : <div className="py-1">{body}</div>}
                        </li>
                      );
                    })}
                  </ol>
                )
              )}

              {tab === "meetings" && (
                contact.meetings.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">함께한 미팅이 없습니다</p> : (
                  <div className="space-y-2">
                    {contact.meetings.map((m) => (
                      <Link key={m.id} href={`/aram/meetings/${m.id}`} className="block rounded-xl border border-gray-100 dark:border-gray-700 p-3 hover:border-indigo-200">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white break-words">{m.title}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_LABEL[m.status]?.cls}`}>{STATUS_LABEL[m.status]?.label}</span>
                          {m.sentiment && <span className={`text-[10px] px-1.5 py-0.5 rounded ${SENTIMENT_LABEL[m.sentiment]?.cls}`}>{SENTIMENT_LABEL[m.sentiment]?.label}</span>}
                        </div>
                        {m.oneLiner && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 break-words">{m.oneLiner}</p>}
                        <p className="text-xs text-gray-400 mt-1">{fmtDate(m.startedAt, true)} · {fmtDuration(m.durationSec)} · 기록 {m.owner.name}</p>
                      </Link>
                    ))}
                  </div>
                )
              )}

              {tab === "emails" && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {gmailMessage && <span className="text-xs text-gray-500 mr-auto">{gmailMessage}</span>}
                    <button className={btnGhost} onClick={syncGmail} disabled={gmailSyncing}>
                      {gmailSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}Gmail 가져오기
                    </button>
                    <button className={btnGhost} onClick={() => setInboundOpen(true)}><Inbox className="w-4 h-4" />받은 메일 기록</button>
                  </div>
                  {contact.emails.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">주고받은 메일이 없습니다</p> : contact.emails.map((e) => (
                    <details key={e.id} className="rounded-xl border border-gray-100 dark:border-gray-700 p-3">
                      <summary className="cursor-pointer list-none">
                        <div className="flex flex-wrap items-center gap-2">
                          {e.direction === "inbound" ? <Inbox className="w-4 h-4 text-sky-500" /> : <Send className="w-4 h-4 text-emerald-500" />}
                          <span className="font-medium text-sm text-gray-900 dark:text-white break-words">{e.subject}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${e.status === "sent" ? "bg-emerald-50 text-emerald-700" : e.status === "failed" ? "bg-rose-50 text-rose-700" : e.status === "received" ? "bg-sky-50 text-sky-700" : "bg-gray-100 text-gray-600"}`}>
                            {{ sent: "보냄", failed: "실패", received: "받음", draft: "초안" }[e.status] ?? e.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">{fmtDate(e.sentAt ?? e.createdAt, true)} {e.direction === "inbound" ? `· ${e.fromAddr ?? ""}` : `· ${e.toAddr ?? ""}`}</p>
                      </summary>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">{e.body}</p>
                      {e.direction === "inbound" && (
                        <button className={`${btnGhost} mt-3`} onClick={() => setReplyTo(e.id)}><Sparkles className="w-4 h-4" />AI 답장 작성</button>
                      )}
                    </details>
                  ))}
                </div>
              )}

              {tab === "actions" && (
                contact.actionItems.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">관련 할 일이 없습니다</p> : (
                  <div className="space-y-1.5">
                    {contact.actionItems.map((a) => {
                      const done = a.status === "done";
                      const late = isOverdue(a.dueDate, a.status);
                      return (
                        <div key={a.id} className="flex items-start gap-2 rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <button onClick={() => toggleAction(a.id, done)} className="mt-0.5">
                            {done ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5 text-gray-300 hover:text-indigo-500" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm break-words ${done ? "line-through text-gray-400" : "text-gray-900 dark:text-white"}`}>{a.title}</p>
                            <p className="text-xs text-gray-500 flex flex-wrap gap-2 mt-0.5">
                              <span className="flex items-center gap-0.5"><UserRound className="w-3 h-3" />{a.assignee?.name ?? a.assigneeName ?? "미정"}</span>
                              <span className={late ? "text-rose-600 font-medium" : ""}>{relDay(a.dueDate)}</span>
                              <span className={`px-1.5 rounded ${PRIORITY_LABEL[a.priority]?.cls}`}>{PRIORITY_LABEL[a.priority]?.label}</span>
                              {a.meeting && <Link href={`/aram/meetings/${a.meeting.id}`} className="text-indigo-600 hover:underline break-words">{a.meeting.title}</Link>}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* 사이드 */}
        <div className="space-y-4 min-w-0">
          <div className={`${card} p-5`}>
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 mb-2"><CalendarClock className="w-4 h-4 text-orange-500" />다음 연락 예정일</h3>
            <div className="flex gap-2">
              <input type="date" className={input} value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
              <button className={btnGhost} onClick={() => patch({ nextFollowUpAt: followUp || null })}>저장</button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">예정일 하루 전 알림을 보내며, 알림을 받은 후 초기화됩니다.</p>
          </div>

          <EmailComposer contact={contact} replyTo={replyTo} onReplyToChange={setReplyTo} onSent={load} />

          {(contact.colleagues.length > 0 || contact.customer) && (
            <div className={`${card} p-5`}>
              {contact.customer && (
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">연결된 CRM 고객</h3>
                  <Link href={`/customers/${contact.customer.id}`} className="text-sm text-indigo-600 hover:underline">{contact.customer.name} · {contact.customer.grade}</Link>
                </div>
              )}
              {contact.colleagues.length > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{contact.company}의 다른 분들</h3>
                  <div className="space-y-1">
                    {contact.colleagues.map((c) => (
                      <Link key={c.id} href={`/aram/contacts/${c.id}`} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600">
                        <UserRound className="w-4 h-4 text-gray-400" />{c.name}<span className="text-xs text-gray-400">{c.position}</span>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="명함 편집" size="lg">
        <ContactForm value={editValue} onChange={setEditValue} />
        <div className="flex justify-end gap-2 mt-5">
          <button className={btnGhost} onClick={() => setEditOpen(false)}>취소</button>
          <button className={btnPrimary} onClick={saveEdit} disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin" />}저장</button>
        </div>
      </Modal>

      <Modal isOpen={prep !== null} onClose={() => setPrep(null)} title={`${contact.name} 님 미팅 준비 브리핑`} size="xl">
        {prep && <AramMarkdown content={prep} />}
        <div className="flex justify-end mt-4">
          <Link href={`/aram/record?contactId=${contact.id}`} className={btnPrimary}><Mic className="w-4 h-4" />미팅 시작</Link>
        </div>
      </Modal>

      <InboundEmailModal
        open={inboundOpen}
        onClose={() => setInboundOpen(false)}
        contactId={contact.id}
        defaultFrom={contact.email}
        onSaved={async (email, replyNow) => {
          await load();
          if (replyNow) setReplyTo(email.id);
        }}
      />
    </div>
  );
}
