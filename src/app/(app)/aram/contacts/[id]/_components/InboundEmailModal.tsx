"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui";
import { api, btnGhost, btnPrimary, input } from "../../../_components/utils";
import type { ContactEmail } from "./types";

// 받은 메일 기록 (붙여넣기) → 이후 AI 답장 작성
export default function InboundEmailModal({
  open,
  onClose,
  contactId,
  defaultFrom,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  contactId: string;
  defaultFrom: string | null;
  onSaved: (email: ContactEmail, replyNow: boolean) => void;
}) {
  const [form, setForm] = useState({ fromAddr: defaultFrom ?? "", subject: "", body: "", sentAt: new Date().toISOString().slice(0, 16) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async (replyNow: boolean) => {
    if (!form.subject.trim() || !form.body.trim()) return setError("제목과 본문을 입력하세요.");
    setSaving(true);
    setError("");
    try {
      const email = await api<ContactEmail>("/api/aram/emails", {
        method: "POST",
        json: { contactId, direction: "inbound", fromAddr: form.fromAddr, subject: form.subject, body: form.body, sentAt: form.sentAt },
      });
      setForm({ fromAddr: defaultFrom ?? "", subject: "", body: "", sentAt: new Date().toISOString().slice(0, 16) });
      onSaved(email, replyNow);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="받은 메일 기록" size="lg">
      <div className="space-y-3">
        <p className="text-xs text-gray-500">받은 메일 내용을 붙여넣으면 이 분과의 대화 기록에 쌓이고, 아람이 맥락을 반영해 답장을 작성합니다.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-gray-500">보낸 사람</span>
            <input className={`${input} mt-1`} value={form.fromAddr} onChange={(e) => setForm({ ...form, fromAddr: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">받은 일시</span>
            <input type="datetime-local" className={`${input} mt-1`} value={form.sentAt} onChange={(e) => setForm({ ...form, sentAt: e.target.value })} />
          </label>
        </div>
        <label className="block">
          <span className="text-xs text-gray-500">제목</span>
          <input className={`${input} mt-1`} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500">본문</span>
          <textarea rows={10} className={`${input} mt-1`} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </label>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button className={btnGhost} onClick={() => save(false)} disabled={saving}>기록만 저장</button>
          <button className={btnPrimary} onClick={() => save(true)} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}저장 후 AI 답장 작성
          </button>
        </div>
      </div>
    </Modal>
  );
}
