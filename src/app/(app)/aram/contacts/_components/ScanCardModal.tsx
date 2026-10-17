"use client";

import { useRef, useState } from "react";
import { Camera, Check, Loader2, ScanLine, Trash2, Upload } from "lucide-react";
import { Modal } from "@/components/ui";
import { api, btnGhost, btnPrimary } from "../../_components/utils";
import ContactForm from "./ContactForm";
import type { ContactFormValue } from "./types";

interface OcrContact extends ContactFormValue {
  confidence?: string;
}

const CONF: Record<string, { label: string; cls: string }> = {
  high: { label: "인식 정확도 높음", cls: "bg-emerald-100 text-emerald-700" },
  medium: { label: "인식 정확도 보통 · 확인 필요", cls: "bg-amber-100 text-amber-700" },
  low: { label: "인식 정확도 낮음 · 꼭 확인", cls: "bg-rose-100 text-rose-700" },
};

// 촬영 이미지를 최대 2000px JPEG 로 축소
async function downscale(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const scale = Math.min(1, 2000 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("이미지 변환 실패"))), "image/jpeg", 0.88)
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function ScanCardModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contacts, setContacts] = useState<OcrContact[]>([]);
  const [cardImageUrl, setCardImageUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  const reset = () => {
    setPreview(null);
    setContacts([]);
    setCardImageUrl(null);
    setError("");
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    reset();
    setScanning(true);
    try {
      const blob = await downscale(file);
      setPreview(URL.createObjectURL(blob));
      const form = new FormData();
      form.append("file", new File([blob], "card.jpg", { type: "image/jpeg" }));
      const res = await api<{ contacts: OcrContact[]; cardImageUrl: string }>("/api/aram/contacts/ocr", { method: "POST", body: form });
      if (!res.contacts.length) setError("명함에서 정보를 찾지 못했습니다. 다시 촬영해주세요.");
      setContacts(res.contacts.map((c) => ({ ...c, importance: "normal", visibility: "company" })));
      setCardImageUrl(res.cardImageUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "인식 실패");
    } finally {
      setScanning(false);
    }
  };

  const saveAll = async () => {
    const valid = contacts.filter((c) => c.name?.trim());
    if (!valid.length) return setError("이름이 있는 명함이 없습니다.");
    setSaving(true);
    setError("");
    try {
      for (const c of valid) {
        const { confidence: _confidence, ...data } = c;
        void _confidence;
        await api("/api/aram/contacts", { method: "POST", json: { ...data, source: "ocr", cardImageUrl } });
      }
      onSaved();
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={close} title="명함 촬영 · 스캔" size="xl">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />

      {!preview && !scanning && (
        <div className="grid sm:grid-cols-2 gap-3">
          <button onClick={() => cameraRef.current?.click()} className="flex flex-col items-center gap-2 p-8 rounded-2xl border-2 border-dashed border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-500/10">
            <Camera className="w-8 h-8 text-indigo-500" />
            <span className="font-medium text-gray-800 dark:text-gray-100">카메라로 촬영</span>
            <span className="text-xs text-gray-500">휴대폰에서 바로 명함을 찍으세요</span>
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex flex-col items-center gap-2 p-8 rounded-2xl border-2 border-dashed border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
            <Upload className="w-8 h-8 text-gray-500" />
            <span className="font-medium text-gray-800 dark:text-gray-100">이미지 업로드</span>
            <span className="text-xs text-gray-500">JPG · PNG · WEBP · 여러 장이 찍힌 사진도 가능</span>
          </button>
          <p className="sm:col-span-2 text-xs text-gray-500">
            AI가 한국어·영어·일본어·중국어 등 모든 언어의 명함을 인식합니다. 저장 전에 내용을 확인·수정할 수 있습니다.
          </p>
        </div>
      )}

      {(preview || scanning) && (
        <div className="grid lg:grid-cols-[240px_1fr] gap-5">
          <div>
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="명함" className="w-full rounded-xl border border-gray-200" />
            )}
            <button className={`${btnGhost} w-full mt-3`} onClick={reset} disabled={scanning || saving}>
              <ScanLine className="w-4 h-4" />다시 촬영
            </button>
          </div>
          <div className="space-y-5 min-w-0">
            {scanning && (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-10 justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />명함을 읽는 중...
              </div>
            )}
            {contacts.map((c, i) => (
              <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${CONF[c.confidence ?? "medium"]?.cls}`}>
                    {CONF[c.confidence ?? "medium"]?.label}
                  </span>
                  {contacts.length > 1 && (
                    <button className="text-gray-400 hover:text-rose-500" onClick={() => setContacts(contacts.filter((_, j) => j !== i))}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <ContactForm value={c} onChange={(v) => setContacts(contacts.map((x, j) => (j === i ? { ...x, ...v } : x)))} />
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-rose-600 mt-3">{error}</p>}
      {contacts.length > 0 && (
        <div className="flex justify-end gap-2 mt-5">
          <button className={btnGhost} onClick={close}>취소</button>
          <button className={btnPrimary} onClick={saveAll} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {contacts.length > 1 ? `${contacts.length}장 저장` : "명함 저장"}
          </button>
        </div>
      )}
    </Modal>
  );
}
