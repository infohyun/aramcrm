"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui";
import { api, btnGhost, btnPrimary } from "../../_components/utils";
import ContactForm from "./ContactForm";
import type { ContactFormValue } from "./types";

export default function AddContactModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [value, setValue] = useState<ContactFormValue>({ importance: "normal", visibility: "company" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!value.name?.trim()) return setError("이름을 입력하세요.");
    setSaving(true);
    setError("");
    try {
      await api("/api/aram/contacts", { method: "POST", json: { ...value, source: "manual" } });
      setValue({ importance: "normal", visibility: "company" });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="명함 추가" size="lg">
      <ContactForm value={value} onChange={setValue} />
      {error && <p className="text-sm text-rose-600 mt-3">{error}</p>}
      <div className="flex justify-end gap-2 mt-5">
        <button className={btnGhost} onClick={onClose}>취소</button>
        <button className={btnPrimary} onClick={save} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}저장
        </button>
      </div>
    </Modal>
  );
}
