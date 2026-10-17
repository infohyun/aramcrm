import type { ContactInput } from "@/lib/aram/contacts";

export interface ContactListItem {
  id: string;
  name: string;
  nameEn: string | null;
  company: string | null;
  department: string | null;
  position: string | null;
  email: string | null;
  mobile: string | null;
  phone: string | null;
  tags: string | null;
  importance: string;
  visibility: string;
  cardImageUrl: string | null;
  lastContactAt: string | null;
  nextFollowUpAt: string | null;
  source: string;
  owner: { id: string; name: string };
  _count: { meetings: number; emails: number };
}

export interface ContactFormValue extends ContactInput {
  importance?: string;
  visibility?: string;
}

export const IMPORTANCE = [
  { value: "vip", label: "VIP", cls: "bg-amber-100 text-amber-700" },
  { value: "high", label: "중요", cls: "bg-orange-100 text-orange-700" },
  { value: "normal", label: "일반", cls: "bg-gray-100 text-gray-600" },
  { value: "low", label: "낮음", cls: "bg-gray-50 text-gray-400" },
];

export const importanceOf = (v: string) => IMPORTANCE.find((i) => i.value === v) ?? IMPORTANCE[2];
