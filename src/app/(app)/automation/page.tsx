"use client";

import { useState, useEffect, useCallback } from "react";
import { Zap, Plus, Trash2, Power, PowerOff, Loader2, Play } from "lucide-react";

interface AutomationRule {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  conditions: string;
  actions: string;
  isActive: boolean;
  runCount: number;
  lastRunAt: string | null;
  createdAt: string;
}

const TRIGGERS: Record<string, string> = {
  customer_created: "새 고객 등록 시",
  customer_grade_changed: "고객 등급 변경 시",
  order_created: "새 주문 생성 시",
  ticket_created: "AS 티켓 생성 시",
  ticket_status_changed: "AS 티켓 상태 변경 시",
  voc_created: "VOC 등록 시",
  approval_completed: "결재 완료 시",
};

const CONDITION_FIELDS: Record<string, string> = {
  "customer.grade": "고객 등급",
  "customer.status": "고객 상태",
  "customer.company": "고객 회사",
  "order.totalPrice": "주문 금액",
  "order.status": "주문 상태",
  "ticket.priority": "티켓 우선순위",
  "ticket.category": "티켓 카테고리",
  "voc.category": "VOC 카테고리",
  "voc.priority": "VOC 우선순위",
};

const OPERATORS: Record<string, string> = {
  equals: "같음",
  not_equals: "같지 않음",
  contains: "포함",
  greater_than: "보다 큼",
  less_than: "보다 작음",
};

const ACTION_TYPES: Record<string, string> = {
  send_notification: "알림 발송",
  send_email: "이메일 발송",
  update_field: "필드 값 변경",
  assign_user: "담당자 배정",
  create_task: "태스크 생성",
};

export default function AutomationPage() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formTrigger, setFormTrigger] = useState("customer_created");
  const [formConditions, setFormConditions] = useState<{ field: string; operator: string; value: string }[]>([
    { field: "customer.grade", operator: "equals", value: "vip" },
  ]);
  const [formActions, setFormActions] = useState<{ type: string; config: string }[]>([
    { type: "send_notification", config: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/automation-rules");
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const handleCreate = async () => {
    if (!formName || !formTrigger) return;
    setSaving(true);
    try {
      const res = await fetch("/api/automation-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          description: formDesc,
          trigger: formTrigger,
          conditions: formConditions,
          actions: formActions,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setFormName(""); setFormDesc("");
        setFormConditions([{ field: "customer.grade", operator: "equals", value: "vip" }]);
        setFormActions([{ type: "send_notification", config: "" }]);
        fetchRules();
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    await fetch(`/api/automation-rules/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    fetchRules();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 규칙을 삭제하시겠습니까?")) return;
    await fetch(`/api/automation-rules/${id}`, { method: "DELETE" });
    fetchRules();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Zap className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">업무 자동화</h1>
                <p className="text-sm text-gray-500 mt-0.5">IF-THEN 자동화 규칙 관리</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              규칙 추가
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : rules.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <Zap className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 mb-4">자동화 규칙이 없습니다</p>
            <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm">첫 규칙 만들기</button>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => {
              let conditions: { field: string; operator: string; value: string }[] = [];
              let actions: { type: string; config: string }[] = [];
              try { conditions = JSON.parse(rule.conditions); } catch {}
              try { actions = JSON.parse(rule.actions); } catch {}

              return (
                <div key={rule.id} className={`bg-white rounded-xl border p-5 ${rule.isActive ? "border-amber-200" : "border-gray-100 opacity-60"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Zap className={`w-5 h-5 ${rule.isActive ? "text-amber-500" : "text-gray-300"}`} />
                      <h3 className="font-semibold text-gray-900">{rule.name}</h3>
                      {rule.isActive && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">활성</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">실행 {rule.runCount}회</span>
                      <button onClick={() => handleToggle(rule.id, rule.isActive)} className="p-2 rounded-lg hover:bg-gray-50" title={rule.isActive ? "비활성화" : "활성화"}>
                        {rule.isActive ? <Power className="w-4 h-4 text-green-600" /> : <PowerOff className="w-4 h-4 text-gray-400" />}
                      </button>
                      <button onClick={() => handleDelete(rule.id)} className="p-2 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {rule.description && <p className="text-sm text-gray-500 mb-3">{rule.description}</p>}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-medium">
                      WHEN: {TRIGGERS[rule.trigger] || rule.trigger}
                    </span>
                    {conditions.map((c, i) => (
                      <span key={i} className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg">
                        IF: {CONDITION_FIELDS[c.field] || c.field} {OPERATORS[c.operator] || c.operator} &quot;{c.value}&quot;
                      </span>
                    ))}
                    {actions.map((a, i) => (
                      <span key={i} className="px-2.5 py-1 bg-green-50 text-green-700 rounded-lg">
                        THEN: {ACTION_TYPES[a.type] || a.type}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold mb-4">자동화 규칙 추가</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">규칙 이름</label>
                <input value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500" placeholder="예: VIP 고객 알림" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm outline-none" placeholder="선택사항" />
              </div>

              {/* Trigger */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WHEN (트리거)</label>
                <select value={formTrigger} onChange={(e) => setFormTrigger(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm outline-none">
                  {Object.entries(TRIGGERS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Conditions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IF (조건)</label>
                {formConditions.map((cond, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <select value={cond.field} onChange={(e) => { const c = [...formConditions]; c[i].field = e.target.value; setFormConditions(c); }} className="flex-1 px-2 py-1.5 border rounded-lg text-sm">
                      {Object.entries(CONDITION_FIELDS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <select value={cond.operator} onChange={(e) => { const c = [...formConditions]; c[i].operator = e.target.value; setFormConditions(c); }} className="px-2 py-1.5 border rounded-lg text-sm">
                      {Object.entries(OPERATORS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <input value={cond.value} onChange={(e) => { const c = [...formConditions]; c[i].value = e.target.value; setFormConditions(c); }} className="flex-1 px-2 py-1.5 border rounded-lg text-sm" placeholder="값" />
                    {formConditions.length > 1 && (
                      <button onClick={() => setFormConditions(formConditions.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 px-1">×</button>
                    )}
                  </div>
                ))}
                <button onClick={() => setFormConditions([...formConditions, { field: "customer.grade", operator: "equals", value: "" }])} className="text-xs text-indigo-600 hover:underline">+ 조건 추가</button>
              </div>

              {/* Actions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">THEN (실행)</label>
                {formActions.map((act, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <select value={act.type} onChange={(e) => { const a = [...formActions]; a[i].type = e.target.value; setFormActions(a); }} className="flex-1 px-2 py-1.5 border rounded-lg text-sm">
                      {Object.entries(ACTION_TYPES).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <input value={act.config} onChange={(e) => { const a = [...formActions]; a[i].config = e.target.value; setFormActions(a); }} className="flex-1 px-2 py-1.5 border rounded-lg text-sm" placeholder="설정값 (선택)" />
                    {formActions.length > 1 && (
                      <button onClick={() => setFormActions(formActions.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 px-1">×</button>
                    )}
                  </div>
                ))}
                <button onClick={() => setFormActions([...formActions, { type: "send_notification", config: "" }])} className="text-xs text-indigo-600 hover:underline">+ 실행 추가</button>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">취소</button>
              <button onClick={handleCreate} disabled={saving || !formName} className="flex items-center gap-2 px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                생성
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
