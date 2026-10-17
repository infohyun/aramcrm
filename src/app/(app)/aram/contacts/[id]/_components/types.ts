export interface ContactEmail {
  id: string;
  direction: "inbound" | "outbound";
  status: string;
  fromAddr: string | null;
  toAddr: string | null;
  cc: string | null;
  subject: string;
  body: string;
  sentAt: string | null;
  createdAt: string;
  meetingId: string | null;
  user?: { name: string };
}

export interface ContactMeeting {
  id: string;
  title: string;
  oneLiner: string | null;
  startedAt: string;
  status: string;
  sentiment: string | null;
  durationSec: number;
  owner: { name: string };
}

export interface ContactAction {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
  assigneeName: string | null;
  assignee: { id: string; name: string } | null;
  meeting: { id: string; title: string } | null;
}

export interface ContactDetail {
  id: string;
  name: string;
  nameEn: string | null;
  company: string | null;
  department: string | null;
  position: string | null;
  email: string | null;
  email2: string | null;
  phone: string | null;
  mobile: string | null;
  fax: string | null;
  address: string | null;
  website: string | null;
  country: string | null;
  language: string | null;
  tags: string | null;
  memo: string | null;
  cardImageUrl: string | null;
  source: string;
  importance: string;
  visibility: string;
  lastContactAt: string | null;
  nextFollowUpAt: string | null;
  aiBrief: string | null;
  aiBriefAt: string | null;
  createdAt: string;
  owner: { id: string; name: string };
  meetings: ContactMeeting[];
  emails: ContactEmail[];
  actionItems: ContactAction[];
  colleagues: { id: string; name: string; position: string | null }[];
  customer: { id: string; name: string; grade: string } | null;
}
