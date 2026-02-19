"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ClipboardList,
  Plus,
  X,
  Trash2,
  Loader2,
  Eye,
  Users,
  Calendar,
  GripVertical,
  ToggleLeft,
  ToggleRight,
  BarChart3,
  Star,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SurveyQuestion {
  id?: string;
  type: "text" | "radio" | "checkbox" | "rating";
  question: string;
  options: string[] | null;
  required: boolean;
  sortOrder: number;
}

interface Survey {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: string;
  _count: { responses: number };
  questions?: SurveyQuestion[];
}

interface SurveyDetail extends Survey {
  questions: SurveyQuestion[];
}

interface ResponseStats {
  totalResponses: number;
  questionStats: {
    questionId: string;
    question: string;
    type: string;
    distribution?: Record<string, number>;
    averageRating?: number;
    textAnswers?: string[];
  }[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "초안", color: "bg-gray-100 text-gray-700", icon: Clock },
  active: { label: "진행중", color: "bg-green-100 text-green-700", icon: CheckCircle },
  closed: { label: "마감", color: "bg-red-100 text-red-700", icon: XCircle },
};

const QUESTION_TYPE_LABELS: Record<string, string> = {
  text: "텍스트",
  radio: "단일선택",
  checkbox: "복수선택",
  rating: "평점",
};

// ---------------------------------------------------------------------------
// Toggle Switch
// ---------------------------------------------------------------------------

const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className="flex items-center gap-1"
  >
    {checked ? (
      <ToggleRight className="w-6 h-6 text-amber-600" />
    ) : (
      <ToggleLeft className="w-6 h-6 text-gray-400" />
    )}
  </button>
);

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function SurveysPage() {
  // Data
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formQuestions, setFormQuestions] = useState<SurveyQuestion[]>([]);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Detail modal
  const [showDetail, setShowDetail] = useState(false);
  const [detailSurvey, setDetailSurvey] = useState<SurveyDetail | null>(null);
  const [detailStats, setDetailStats] = useState<ResponseStats | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // -------------------------------------------------------------------------
  // Fetch surveys
  // -------------------------------------------------------------------------

  const fetchSurveys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/surveys");
      if (res.ok) {
        const data = await res.json();
        setSurveys(Array.isArray(data) ? data : data.surveys || data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch surveys:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  // -------------------------------------------------------------------------
  // Create survey
  // -------------------------------------------------------------------------

  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormQuestions([]);
  };

  const addQuestion = () => {
    setFormQuestions((prev) => [
      ...prev,
      {
        type: "text",
        question: "",
        options: null,
        required: false,
        sortOrder: prev.length,
      },
    ]);
  };

  const updateQuestion = (index: number, updates: Partial<SurveyQuestion>) => {
    setFormQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...updates } : q))
    );
  };

  const removeQuestion = (index: number) => {
    setFormQuestions((prev) =>
      prev.filter((_, i) => i !== index).map((q, i) => ({ ...q, sortOrder: i }))
    );
  };

  const handleCreate = async () => {
    if (!formTitle.trim()) return;

    setFormSubmitting(true);
    try {
      const questionsPayload = formQuestions.map((q, i) => ({
        type: q.type,
        question: q.question,
        options: q.options,
        required: q.required,
        sortOrder: i,
      }));

      const res = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          questions: questionsPayload,
        }),
      });

      if (res.ok) {
        setShowCreate(false);
        resetForm();
        fetchSurveys();
      }
    } catch (error) {
      console.error("Failed to create survey:", error);
    } finally {
      setFormSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // View detail
  // -------------------------------------------------------------------------

  const handleViewDetail = async (surveyId: string) => {
    setShowDetail(true);
    setDetailLoading(true);
    setDetailSurvey(null);
    setDetailStats(null);
    setExpandedQuestionId(null);

    try {
      const [surveyRes, responsesRes] = await Promise.all([
        fetch(`/api/surveys/${surveyId}`),
        fetch(`/api/surveys/${surveyId}/responses`),
      ]);

      if (surveyRes.ok) {
        const surveyData = await surveyRes.json();
        setDetailSurvey(surveyData);
      }

      if (responsesRes.ok) {
        const responsesData = await responsesRes.json();
        setDetailStats(responsesData);
      }
    } catch (error) {
      console.error("Failed to load survey detail:", error);
    } finally {
      setDetailLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Status change (activate / close)
  // -------------------------------------------------------------------------

  const handleStatusChange = async (surveyId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/surveys/${surveyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        fetchSurveys();
        if (detailSurvey && detailSurvey.id === surveyId) {
          setDetailSurvey((prev) => prev ? { ...prev, status: newStatus } : prev);
        }
      }
    } catch (error) {
      console.error("Failed to update survey status:", error);
    }
  };

  // -------------------------------------------------------------------------
  // Delete survey
  // -------------------------------------------------------------------------

  const handleDelete = async (surveyId: string) => {
    if (!window.confirm("이 설문조사를 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.")) return;

    try {
      const res = await fetch(`/api/surveys/${surveyId}`, { method: "DELETE" });
      if (res.ok) {
        fetchSurveys();
        if (showDetail && detailSurvey?.id === surveyId) {
          setShowDetail(false);
          setDetailSurvey(null);
        }
      }
    } catch (error) {
      console.error("Failed to delete survey:", error);
    }
  };

  // -------------------------------------------------------------------------
  // Drag and drop reorder
  // -------------------------------------------------------------------------

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;

    setFormQuestions((prev) => {
      const updated = [...prev];
      const [dragged] = updated.splice(dragIndex, 1);
      updated.splice(index, 0, dragged);
      return updated.map((q, i) => ({ ...q, sortOrder: i }));
    });
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getQuestionStatForId = (questionId: string) => {
    if (!detailStats?.questionStats) return null;
    return detailStats.questionStats.find((qs) => qs.questionId === questionId);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-xl">
                <ClipboardList className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">설문조사</h1>
              </div>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowCreate(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white text-sm font-medium rounded-xl hover:bg-amber-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              설문 만들기
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Survey List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
          </div>
        ) : surveys.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]">
            <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">아직 설문조사가 없습니다.</p>
            <button
              onClick={() => {
                resetForm();
                setShowCreate(true);
              }}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-600 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              첫 설문조사를 만들어보세요
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {surveys.map((survey) => {
              const st = STATUS_CONFIG[survey.status] || STATUS_CONFIG.draft;
              const StatusIcon = st.icon;

              return (
                <div
                  key={survey.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-5 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleViewDetail(survey.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-base font-semibold text-gray-900 truncate">
                          {survey.title}
                        </h3>
                        <span
                          className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${st.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {st.label}
                        </span>
                      </div>
                      {survey.description && (
                        <p className="text-sm text-gray-500 truncate mb-2">
                          {survey.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          응답 {survey._count.responses}건
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(survey.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetail(survey.id);
                        }}
                        className="p-2 text-gray-400 hover:text-amber-600 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(survey.id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-50 transition-colors"
                      >
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

      {/* =================================================================== */}
      {/* Create Modal */}
      {/* =================================================================== */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-xl">
                  <Plus className="w-5 h-5 text-amber-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">새 설문조사 만들기</h2>
              </div>
              <button
                onClick={() => {
                  setShowCreate(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  설문 제목 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="설문조사 제목을 입력하세요"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">설명</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="설문조사에 대한 설명을 입력하세요..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Questions Builder */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    질문 목록
                  </label>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    질문 추가
                  </button>
                </div>

                {formQuestions.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <ClipboardList className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">질문을 추가해주세요</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formQuestions.map((q, index) => (
                      <div
                        key={index}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`bg-gray-50 rounded-xl border border-gray-200 p-4 transition-all ${
                          dragIndex === index ? "opacity-50 border-amber-300" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Drag handle */}
                          <div className="pt-2 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
                            <GripVertical className="w-4 h-4" />
                          </div>

                          <div className="flex-1 space-y-3">
                            {/* Row 1: Type + Question */}
                            <div className="flex items-center gap-3">
                              <select
                                value={q.type}
                                onChange={(e) =>
                                  updateQuestion(index, {
                                    type: e.target.value as SurveyQuestion["type"],
                                    options:
                                      e.target.value === "radio" || e.target.value === "checkbox"
                                        ? q.options || []
                                        : null,
                                  })
                                }
                                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 w-32 shrink-0"
                              >
                                <option value="text">텍스트</option>
                                <option value="radio">단일선택</option>
                                <option value="checkbox">복수선택</option>
                                <option value="rating">평점</option>
                              </select>
                              <input
                                type="text"
                                value={q.question}
                                onChange={(e) =>
                                  updateQuestion(index, { question: e.target.value })
                                }
                                placeholder={`질문 ${index + 1}`}
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                            </div>

                            {/* Options input (for radio/checkbox) */}
                            {(q.type === "radio" || q.type === "checkbox") && (
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">
                                  선택지 (쉼표로 구분)
                                </label>
                                <input
                                  type="text"
                                  value={
                                    Array.isArray(q.options) ? q.options.join(", ") : ""
                                  }
                                  onChange={(e) => {
                                    const opts = e.target.value
                                      .split(",")
                                      .map((o) => o.trim())
                                      .filter((o) => o.length > 0);
                                    updateQuestion(index, { options: opts });
                                  }}
                                  placeholder="옵션1, 옵션2, 옵션3"
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                              </div>
                            )}

                            {/* Required toggle + remove */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <ToggleSwitch
                                  checked={q.required}
                                  onChange={(v) => updateQuestion(index, { required: v })}
                                />
                                <span className="text-xs text-gray-500">필수 응답</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeQuestion(index)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                삭제
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowCreate(false);
                  resetForm();
                }}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={!formTitle.trim() || formSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-amber-600 rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {formSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                설문 만들기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* Detail Modal */}
      {/* =================================================================== */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {detailLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
              </div>
            ) : detailSurvey ? (
              <>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-amber-100 rounded-xl shrink-0">
                      <ClipboardList className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-gray-900 truncate">
                        {detailSurvey.title}
                      </h2>
                      {detailSurvey.description && (
                        <p className="text-sm text-gray-500 truncate">{detailSurvey.description}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowDetail(false);
                      setDetailSurvey(null);
                      setDetailStats(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors shrink-0 ml-3"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Stats summary */}
                <div className="p-6 border-b border-gray-100">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                      <p className="text-xs text-gray-500 mb-1">상태</p>
                      {(() => {
                        const st = STATUS_CONFIG[detailSurvey.status] || STATUS_CONFIG.draft;
                        const StatusIcon = st.icon;
                        return (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium ${st.color}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {st.label}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="bg-amber-50 rounded-xl p-4 text-center">
                      <p className="text-xs text-amber-600 mb-1">총 응답</p>
                      <p className="text-2xl font-bold text-amber-700">
                        {detailStats?.totalResponses ?? detailSurvey._count.responses}
                      </p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4 text-center">
                      <p className="text-xs text-blue-600 mb-1">질문 수</p>
                      <p className="text-2xl font-bold text-blue-700">
                        {detailSurvey.questions?.length ?? 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Questions list */}
                <div className="p-6 space-y-3">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">질문 목록</h3>

                  {detailSurvey.questions && detailSurvey.questions.length > 0 ? (
                    detailSurvey.questions
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((question, idx) => {
                        const stat = question.id ? getQuestionStatForId(question.id) : null;
                        const isExpanded = expandedQuestionId === (question.id || String(idx));

                        return (
                          <div
                            key={question.id || idx}
                            className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden"
                          >
                            <button
                              onClick={() =>
                                setExpandedQuestionId(
                                  isExpanded ? null : (question.id || String(idx))
                                )
                              }
                              className="w-full text-left p-4 hover:bg-gray-100/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-amber-600 shrink-0">
                                  Q{idx + 1}
                                </span>
                                <span className="flex-1 text-sm font-medium text-gray-900 truncate">
                                  {question.question}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-500 shrink-0">
                                  {QUESTION_TYPE_LABELS[question.type] || question.type}
                                </span>
                                {question.required && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 shrink-0">
                                    필수
                                  </span>
                                )}
                                <span className="shrink-0">
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-gray-400" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                  )}
                                </span>
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="border-t border-gray-200 p-4 bg-white">
                                {/* Options for radio/checkbox */}
                                {(question.type === "radio" || question.type === "checkbox") &&
                                  question.options &&
                                  Array.isArray(question.options) && (
                                    <div className="mb-3">
                                      <p className="text-xs text-gray-500 mb-2">선택지</p>
                                      <div className="flex flex-wrap gap-2">
                                        {question.options.map((opt, oi) => (
                                          <span
                                            key={oi}
                                            className="text-xs px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
                                          >
                                            {opt}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                {/* Stats: Distribution for radio/checkbox */}
                                {stat && stat.distribution && (
                                  <div className="mb-3">
                                    <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                                      <BarChart3 className="w-3.5 h-3.5" />
                                      응답 분포
                                    </p>
                                    <div className="space-y-2">
                                      {Object.entries(stat.distribution).map(([option, count]) => {
                                        const total = Object.values(stat.distribution!).reduce(
                                          (a, b) => a + b,
                                          0
                                        );
                                        const pct = total > 0 ? (count / total) * 100 : 0;
                                        return (
                                          <div key={option} className="flex items-center gap-2">
                                            <span className="text-xs text-gray-600 w-24 truncate shrink-0">
                                              {option}
                                            </span>
                                            <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                                              <div
                                                className="h-full bg-amber-400 rounded-full transition-all duration-500"
                                                style={{ width: `${pct}%` }}
                                              />
                                            </div>
                                            <span className="text-xs font-medium text-gray-700 w-16 text-right shrink-0">
                                              {count}건 ({pct.toFixed(0)}%)
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Stats: Average rating */}
                                {stat && stat.averageRating !== undefined && (
                                  <div className="mb-3">
                                    <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                                      <Star className="w-3.5 h-3.5" />
                                      평균 평점
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-0.5">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                          <Star
                                            key={star}
                                            className={`w-5 h-5 ${
                                              star <= Math.round(stat.averageRating!)
                                                ? "text-amber-400 fill-amber-400"
                                                : "text-gray-300"
                                            }`}
                                          />
                                        ))}
                                      </div>
                                      <span className="text-lg font-bold text-gray-900">
                                        {stat.averageRating.toFixed(1)}
                                      </span>
                                      <span className="text-xs text-gray-400">/ 5.0</span>
                                    </div>
                                  </div>
                                )}

                                {/* No stats available */}
                                {!stat && (
                                  <p className="text-xs text-gray-400">아직 응답 데이터가 없습니다.</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <p className="text-sm text-gray-400">등록된 질문이 없습니다.</p>
                    </div>
                  )}
                </div>

                {/* Footer actions */}
                <div className="flex items-center justify-between p-6 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    {detailSurvey.status === "draft" && (
                      <button
                        onClick={() => handleStatusChange(detailSurvey.id, "active")}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        설문 시작
                      </button>
                    )}
                    {detailSurvey.status === "active" && (
                      <button
                        onClick={() => handleStatusChange(detailSurvey.id, "closed")}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        설문 마감
                      </button>
                    )}
                    {detailSurvey.status === "closed" && (
                      <button
                        onClick={() => handleStatusChange(detailSurvey.id, "active")}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        다시 시작
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(detailSurvey.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      삭제
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setShowDetail(false);
                      setDetailSurvey(null);
                      setDetailStats(null);
                    }}
                    className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    닫기
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-20">
                <XCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">설문조사를 불러올 수 없습니다.</p>
                <button
                  onClick={() => {
                    setShowDetail(false);
                    setDetailSurvey(null);
                  }}
                  className="mt-4 px-4 py-2 text-sm text-gray-600 border rounded-xl hover:bg-gray-50"
                >
                  닫기
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
