"use client";

import { useState, useEffect, useCallback } from "react";
import {
  GitBranch,
  Plus,
  Trash2,
  Power,
  PowerOff,
  Loader2,
  Play,
  X,
  ChevronDown,
  ArrowDown,
  Zap,
  GitMerge,
  Bell,
  Clock,
  ShieldCheck,
  CircleDot,
} from "lucide-react";

// ─── Interfaces ─────────────────────────────────────────────
interface WorkflowNode {
  id: string;
  type: "trigger" | "condition" | "action" | "notification" | "delay" | "approval";
  label: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  isActive: boolean;
  runCount: number;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Constants ──────────────────────────────────────────────
const TRIGGERS: Record<string, string> = {
  customer_created: "고객생성",
  order_created: "주문생성",
  ticket_created: "티켓생성",
  schedule: "일정",
};

const TRIGGER_COLORS: Record<string, string> = {
  customer_created: "bg-blue-100 text-blue-700",
  order_created: "bg-green-100 text-green-700",
  ticket_created: "bg-orange-100 text-orange-700",
  schedule: "bg-purple-100 text-purple-700",
};

const NODE_TYPES: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  trigger: { label: "트리거", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-300", icon: Play },
  condition: { label: "조건", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-300", icon: GitMerge },
  action: { label: "액션", color: "text-green-700", bg: "bg-green-50", border: "border-green-300", icon: Zap },
  notification: { label: "알림", color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-300", icon: Bell },
  delay: { label: "대기", color: "text-gray-700", bg: "bg-gray-50", border: "border-gray-300", icon: Clock },
  approval: { label: "승인", color: "text-red-700", bg: "bg-red-50", border: "border-red-300", icon: ShieldCheck },
};

// ─── Helpers ────────────────────────────────────────────────
function generateId() {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// ─── Flow Canvas Component ──────────────────────────────────
function FlowCanvas({
  nodes,
  edges,
  onRemoveNode,
  readonly = false,
}: {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  onRemoveNode?: (id: string) => void;
  readonly?: boolean;
}) {
  // Build ordered list from edges
  const orderedNodes: WorkflowNode[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  if (nodes.length > 0) {
    // Find root node (a node that is not a target of any edge)
    const targetIds = new Set(edges.map((e) => e.target));
    let currentId = nodes.find((n) => !targetIds.has(n.id))?.id || nodes[0].id;

    const visited = new Set<string>();
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const node = nodeMap.get(currentId);
      if (node) orderedNodes.push(node);
      const nextEdge = edges.find((e) => e.source === currentId);
      currentId = nextEdge?.target || "";
    }

    // Add any orphan nodes
    nodes.forEach((n) => {
      if (!visited.has(n.id)) orderedNodes.push(n);
    });
  }

  if (orderedNodes.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <div className="text-center">
          <CircleDot className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">노드를 추가해서 워크플로우를 구성하세요</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-6 px-4">
      {orderedNodes.map((node, index) => {
        const typeInfo = NODE_TYPES[node.type] || NODE_TYPES.action;
        const IconComp = typeInfo.icon;
        const edgeToNext = index < orderedNodes.length - 1
          ? edges.find((e) => e.source === node.id && e.target === orderedNodes[index + 1].id)
          : null;

        return (
          <div key={node.id} className="flex flex-col items-center w-full max-w-md">
            {/* Node Box */}
            <div
              className={`relative w-full rounded-xl border-2 ${typeInfo.border} ${typeInfo.bg} px-5 py-4 shadow-sm transition-all hover:shadow-md`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-white/70 ${typeInfo.color}`}>
                  <IconComp className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold uppercase tracking-wide ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mt-0.5 truncate">
                    {node.label}
                  </p>
                </div>
                {!readonly && onRemoveNode && (
                  <button
                    onClick={() => onRemoveNode(node.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="노드 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Connector arrow to next node */}
            {index < orderedNodes.length - 1 && (
              <div className="flex flex-col items-center py-1">
                <div className="w-0.5 h-6 bg-gray-300" />
                {edgeToNext?.label && (
                  <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200 my-1">
                    {edgeToNext.label}
                  </span>
                )}
                <ArrowDown className="w-4 h-4 text-gray-400 -mt-0.5" />
                <div className="w-0.5 h-2 bg-gray-300" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page Component ────────────────────────────────────
export default function WorkflowBuilderPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [editorLoading, setEditorLoading] = useState(false);

  // Create form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formTrigger, setFormTrigger] = useState("customer_created");
  const [saving, setSaving] = useState(false);

  // Editor state
  const [editNodes, setEditNodes] = useState<WorkflowNode[]>([]);
  const [editEdges, setEditEdges] = useState<WorkflowEdge[]>([]);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [showAddNode, setShowAddNode] = useState(false);
  const [newNodeType, setNewNodeType] = useState<string>("action");
  const [newNodeLabel, setNewNodeLabel] = useState("");
  const [editorSaving, setEditorSaving] = useState(false);

  // ─── Fetch workflows ──────────────────────────────────────
  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workflows");
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data.workflows || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  // ─── Create workflow ──────────────────────────────────────
  const handleCreate = async () => {
    if (!formName.trim() || !formTrigger) return;
    setSaving(true);
    try {
      const triggerNode: WorkflowNode = {
        id: generateId(),
        type: "trigger",
        label: TRIGGERS[formTrigger] || formTrigger,
        config: { trigger: formTrigger },
        position: { x: 0, y: 0 },
      };
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDesc.trim() || null,
          trigger: formTrigger,
          nodes: [triggerNode],
          edges: [],
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setFormName("");
        setFormDesc("");
        setFormTrigger("customer_created");
        fetchWorkflows();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // ─── Open workflow editor ─────────────────────────────────
  const openEditor = async (workflowId: string) => {
    setEditorLoading(true);
    try {
      const res = await fetch(`/api/workflows/${workflowId}`);
      if (res.ok) {
        const data = await res.json();
        const wf: Workflow = {
          ...data,
          nodes: Array.isArray(data.nodes) ? data.nodes : [],
          edges: Array.isArray(data.edges) ? data.edges : [],
        };
        setSelectedWorkflow(wf);
        setEditNodes(wf.nodes);
        setEditEdges(wf.edges);
        setEditName(wf.name);
        setEditDesc(wf.description || "");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEditorLoading(false);
    }
  };

  const closeEditor = () => {
    setSelectedWorkflow(null);
    setEditNodes([]);
    setEditEdges([]);
    setShowAddNode(false);
  };

  // ─── Toggle active ─────────────────────────────────────────
  const handleToggle = async (e: React.MouseEvent, id: string, isActive: boolean) => {
    e.stopPropagation();
    try {
      await fetch(`/api/workflows/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      fetchWorkflows();
    } catch (err) {
      console.error(err);
    }
  };

  // ─── Delete workflow ──────────────────────────────────────
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("이 워크플로우를 삭제하시겠습니까?")) return;
    try {
      await fetch(`/api/workflows/${id}`, { method: "DELETE" });
      if (selectedWorkflow?.id === id) closeEditor();
      fetchWorkflows();
    } catch (err) {
      console.error(err);
    }
  };

  // ─── Add node in editor ───────────────────────────────────
  const handleAddNode = () => {
    if (!newNodeLabel.trim()) return;
    const newNode: WorkflowNode = {
      id: generateId(),
      type: newNodeType as WorkflowNode["type"],
      label: newNodeLabel.trim(),
      config: {},
      position: { x: 0, y: editNodes.length * 120 },
    };

    const updatedNodes = [...editNodes, newNode];

    // Auto-create edge from the last node to the new node
    let updatedEdges = [...editEdges];
    if (editNodes.length > 0) {
      // Find the last node in the chain (a node that is not the source of any edge)
      const sourceIds = new Set(editEdges.map((e) => e.source));
      const lastNode = editNodes.find((n) => !sourceIds.has(n.id)) || editNodes[editNodes.length - 1];
      updatedEdges.push({
        id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        source: lastNode.id,
        target: newNode.id,
      });
    }

    setEditNodes(updatedNodes);
    setEditEdges(updatedEdges);
    setNewNodeLabel("");
    setNewNodeType("action");
    setShowAddNode(false);
  };

  // ─── Remove node in editor ────────────────────────────────
  const handleRemoveNode = (nodeId: string) => {
    // Find edges involving this node
    const incomingEdge = editEdges.find((e) => e.target === nodeId);
    const outgoingEdge = editEdges.find((e) => e.source === nodeId);

    let updatedEdges = editEdges.filter((e) => e.source !== nodeId && e.target !== nodeId);

    // Reconnect: if the node had both an incoming and outgoing edge, bridge them
    if (incomingEdge && outgoingEdge) {
      updatedEdges.push({
        id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        source: incomingEdge.source,
        target: outgoingEdge.target,
      });
    }

    setEditNodes(editNodes.filter((n) => n.id !== nodeId));
    setEditEdges(updatedEdges);
  };

  // ─── Save editor changes ──────────────────────────────────
  const handleSaveEditor = async () => {
    if (!selectedWorkflow) return;
    setEditorSaving(true);
    try {
      const res = await fetch(`/api/workflows/${selectedWorkflow.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim() || selectedWorkflow.name,
          description: editDesc.trim() || null,
          nodes: editNodes,
          edges: editEdges,
        }),
      });
      if (res.ok) {
        fetchWorkflows();
        closeEditor();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEditorSaving(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <GitBranch className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">워크플로우 빌더</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  시각적 워크플로우 설계 및 자동화 관리
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              워크플로우 추가
            </button>
          </div>
        </div>
      </div>

      {/* Workflow List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : workflows.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <GitBranch className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 mb-4">워크플로우가 없습니다</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
            >
              첫 워크플로우 만들기
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workflows.map((wf) => {
              let nodeCount = 0;
              try {
                const parsed = Array.isArray(wf.nodes) ? wf.nodes : JSON.parse(wf.nodes as unknown as string);
                nodeCount = parsed.length;
              } catch {
                nodeCount = 0;
              }

              return (
                <div
                  key={wf.id}
                  onClick={() => openEditor(wf.id)}
                  className={`bg-white rounded-xl border-2 p-5 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 ${
                    wf.isActive
                      ? "border-purple-200 hover:border-purple-300"
                      : "border-gray-100 opacity-70 hover:border-gray-200"
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{wf.name}</h3>
                      {wf.description && (
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{wf.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <button
                        onClick={(e) => handleToggle(e, wf.id, wf.isActive)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        title={wf.isActive ? "비활성화" : "활성화"}
                      >
                        {wf.isActive ? (
                          <Power className="w-4 h-4 text-green-600" />
                        ) : (
                          <PowerOff className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, wf.id)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600 transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Trigger Badge */}
                  <div className="mb-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                        TRIGGER_COLORS[wf.trigger] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      <Play className="w-3 h-3" />
                      {TRIGGERS[wf.trigger] || wf.trigger}
                    </span>
                    {wf.isActive && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                        활성
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-gray-400 pt-3 border-t border-gray-100">
                    <span className="flex items-center gap-1">
                      <CircleDot className="w-3.5 h-3.5" />
                      노드 {nodeCount}개
                    </span>
                    <span className="flex items-center gap-1">
                      <Play className="w-3.5 h-3.5" />
                      실행 {wf.runCount}회
                    </span>
                    <span className="flex items-center gap-1 ml-auto">
                      {wf.lastRunAt ? formatDate(wf.lastRunAt) : "미실행"}
                    </span>
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
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">새 워크플로우 만들기</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  워크플로우 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="예: 신규 고객 환영 워크플로우"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <input
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="워크플로우에 대한 간단한 설명 (선택사항)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  트리거 이벤트 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formTrigger}
                  onChange={(e) => setFormTrigger(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  {Object.entries(TRIGGERS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2.5 text-sm text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !formName.trim()}
                className="flex items-center gap-2 px-5 py-2.5 text-sm bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 font-medium transition-colors"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                생성
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Editor Modal */}
      {(selectedWorkflow || editorLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeEditor} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
            {editorLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : selectedWorkflow ? (
              <>
                {/* Editor Header */}
                <div className="px-6 py-4 border-b border-gray-200 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <GitBranch className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">워크플로우 편집</h2>
                        <p className="text-xs text-gray-400">노드를 추가/삭제하여 흐름을 구성하세요</p>
                      </div>
                    </div>
                    <button
                      onClick={closeEditor}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Editor Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  {/* Name & Description */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                      <input
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="선택사항"
                      />
                    </div>
                  </div>

                  {/* Trigger Info */}
                  <div className="mb-4 flex items-center gap-2">
                    <span className="text-sm text-gray-500">트리거:</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                        TRIGGER_COLORS[selectedWorkflow.trigger] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      <Play className="w-3 h-3" />
                      {TRIGGERS[selectedWorkflow.trigger] || selectedWorkflow.trigger}
                    </span>
                  </div>

                  {/* Flow Canvas */}
                  <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 min-h-[300px] mb-4">
                    <FlowCanvas
                      nodes={editNodes}
                      edges={editEdges}
                      onRemoveNode={handleRemoveNode}
                    />
                  </div>

                  {/* Add Node */}
                  {!showAddNode ? (
                    <button
                      onClick={() => setShowAddNode(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:text-purple-600 hover:border-purple-300 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      노드 추가
                    </button>
                  ) : (
                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">새 노드 추가</h4>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {Object.entries(NODE_TYPES).map(([key, info]) => {
                          const IconComp = info.icon;
                          return (
                            <button
                              key={key}
                              onClick={() => setNewNodeType(key)}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                                newNodeType === key
                                  ? `${info.border} ${info.bg} ${info.color}`
                                  : "border-gray-200 text-gray-600 hover:border-gray-300"
                              }`}
                            >
                              <IconComp className="w-4 h-4" />
                              {info.label}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={newNodeLabel}
                          onChange={(e) => setNewNodeLabel(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddNode();
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="노드 이름 (예: VIP 등급 확인)"
                          autoFocus
                        />
                        <button
                          onClick={handleAddNode}
                          disabled={!newNodeLabel.trim()}
                          className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm hover:bg-purple-700 disabled:opacity-50 font-medium transition-colors"
                        >
                          추가
                        </button>
                        <button
                          onClick={() => {
                            setShowAddNode(false);
                            setNewNodeLabel("");
                          }}
                          className="px-3 py-2 text-sm text-gray-500 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Editor Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
                  <div className="text-xs text-gray-400">
                    노드 {editNodes.length}개 / 엣지 {editEdges.length}개
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => handleDelete(e, selectedWorkflow.id)}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      삭제
                    </button>
                    <button
                      onClick={closeEditor}
                      className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleSaveEditor}
                      disabled={editorSaving}
                      className="flex items-center gap-2 px-5 py-2 text-sm bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 font-medium transition-colors"
                    >
                      {editorSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                      저장
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
