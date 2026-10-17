"use client";

import { CONTACT_FIELDS, CONTACT_FIELD_LABELS, type ContactField } from "@/lib/aram/contacts";
import { input } from "../../_components/utils";
import { IMPORTANCE, type ContactFormValue } from "./types";

const WIDE: ContactField[] = ["address", "memo", "tags"];

export default function ContactForm({
  value,
  onChange,
  showMeta = true,
}: {
  value: ContactFormValue;
  onChange: (v: ContactFormValue) => void;
  showMeta?: boolean;
}) {
  const set = (k: keyof ContactFormValue, v: string) => onChange({ ...value, [k]: v });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {CONTACT_FIELDS.map((f) => (
        <label key={f} className={`block ${WIDE.includes(f) ? "sm:col-span-2" : ""}`}>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {CONTACT_FIELD_LABELS[f]}
            {f === "name" && <span className="text-rose-500"> *</span>}
          </span>
          {f === "memo" ? (
            <textarea rows={3} className={`${input} mt-1`} value={value[f] ?? ""} onChange={(e) => set(f, e.target.value)} />
          ) : (
            <input
              className={`${input} mt-1`}
              value={value[f] ?? ""}
              placeholder={f === "tags" ? "콤마로 구분 (예: 바이어, 일본, 전시회)" : f === "language" ? "ko, en, ja ..." : undefined}
              type={f === "email" || f === "email2" ? "email" : "text"}
              onChange={(e) => set(f, e.target.value)}
            />
          )}
        </label>
      ))}
      {showMeta && (
        <>
          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">중요도</span>
            <select className={`${input} mt-1`} value={value.importance ?? "normal"} onChange={(e) => set("importance", e.target.value)}>
              {IMPORTANCE.map((i) => (
                <option key={i.value} value={i.value}>{i.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">공개 범위</span>
            <select className={`${input} mt-1`} value={value.visibility ?? "company"} onChange={(e) => set("visibility", e.target.value)}>
              <option value="company">전사 공유</option>
              <option value="private">나만 보기</option>
            </select>
          </label>
        </>
      )}
    </div>
  );
}
