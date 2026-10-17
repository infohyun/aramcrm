// 미팅 상세 화면 타입 (GET /api/aram/meetings/[id])

export interface Speaker {
  id: string;
  label: string;
  name: string | null;
  role: string | null;
  contactId: string | null;
  userId: string | null;
  color: string | null;
  talkTimeSec: number;
  summary: string | null;
}

export interface Segment {
  id: string;
  speakerId: string | null;
  seq: number;
  startMs: number;
  endMs: number;
  text: string;
  language: string | null;
  translation: string | null;
  isHighlight: boolean;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  assignee: { id: string; name: string } | null;
  contact: { id: string; name: string } | null;
  dueDate: string | null;
  priority: string;
  status: string;
  source: string;
  taskId: string | null;
  calendarEventId: string | null;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  segmentId: string | null;
  user: { id: string; name: string };
}

export interface Email {
  id: string;
  direction: string;
  status: string;
  toAddr: string | null;
  subject: string;
  body: string;
  sentAt: string | null;
  createdAt: string;
  contact: { id: string; name: string } | null;
}

export interface MeetingContact {
  id: string;
  name: string;
  company: string | null;
  position: string | null;
  email: string | null;
  language: string | null;
}

export interface Meeting {
  id: string;
  title: string;
  ownerId: string;
  owner: { id: string; name: string; email: string };
  visibility: string;
  projectId: string | null;
  project: { id: string; name: string } | null;
  status: string;
  source: string;
  meetingType: string;
  template: string;
  language: string | null;
  detectedLanguages: string | null;
  summaryLanguage: string;
  location: string | null;
  startedAt: string;
  endedAt: string | null;
  durationSec: number;
  audioUrl: string | null;
  userNotes: string | null;
  customPrompt: string | null;
  summary: string | null;
  oneLiner: string | null;
  keyPoints: string | null;
  decisions: string | null;
  openQuestions: string | null;
  risks: string | null;
  businessOutlook: string | null;
  nextMeetingAgenda: string | null;
  sentiment: string | null;
  topics: string | null;
  translations: string | null;
  followUpEmail: string | null;
  analyzedAt: string | null;
  errorMessage: string | null;
  contacts: MeetingContact[];
  speakers: Speaker[];
  segments: Segment[];
  actionItems: ActionItem[];
  comments: Comment[];
  emails: Email[];
  canEdit: boolean;
}

export interface UserLite {
  id: string;
  name: string;
  position?: string | null;
}

export interface ProjectLite {
  id: string;
  name: string;
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function speakerDisplay(s: Speaker | undefined | null): string {
  return s?.name || s?.label || "화자";
}
