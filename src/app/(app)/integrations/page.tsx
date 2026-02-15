"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  MessageSquare,
  MessageCircle,
  Database,
  Contact,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Key,
  ExternalLink,
} from "lucide-react";

interface IntegrationCard {
  id: string;
  name: string;
  label: string;
  description: string;
  type: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

interface IntegrationData {
  id: string;
  name: string;
  type: string;
  config: string | null;
  isActive: boolean;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ConfigFields {
  [key: string]: string;
}

const integrationCards: IntegrationCard[] = [
  {
    id: "gmail",
    name: "gmail",
    label: "Gmail",
    description: "Gmail 계정을 연결하여 이메일을 직접 주고받을 수 있습니다",
    type: "email",
    icon: Mail,
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  {
    id: "slack",
    name: "slack",
    label: "Slack",
    description: "슬랙 채널과 연동하여 알림을 받을 수 있습니다",
    type: "messaging",
    icon: MessageSquare,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    id: "kakao",
    name: "kakao",
    label: "카카오톡",
    description: "카카오 플러스친구를 통해 메시지를 발송할 수 있습니다",
    type: "messaging",
    icon: MessageCircle,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
  },
  {
    id: "douzone",
    name: "douzone",
    label: "더존 ERP",
    description: "더존 ERP와 연동하여 거래 데이터를 동기화합니다",
    type: "erp",
    icon: Database,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    id: "remember",
    name: "remember",
    label: "리멤버",
    description: "리멤버 앱의 명함 데이터를 가져올 수 있습니다",
    type: "contacts",
    icon: Contact,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
];

const configFieldsByService: Record<string, { key: string; label: string; placeholder: string; type?: string }[]> = {
  gmail: [
    { key: "clientId", label: "클라이언트 ID", placeholder: "Google OAuth Client ID" },
    { key: "clientSecret", label: "클라이언트 시크릿", placeholder: "Google OAuth Client Secret", type: "password" },
    { key: "refreshToken", label: "리프레시 토큰", placeholder: "OAuth Refresh Token", type: "password" },
  ],
  slack: [
    { key: "webhookUrl", label: "웹훅 URL", placeholder: "https://hooks.slack.com/services/..." },
    { key: "botToken", label: "봇 토큰", placeholder: "xoxb-...", type: "password" },
    { key: "channel", label: "채널", placeholder: "#crm-notifications" },
  ],
  kakao: [
    { key: "appKey", label: "앱 키", placeholder: "카카오 REST API 키", type: "password" },
    { key: "senderId", label: "발신 프로필 키", placeholder: "플러스친구 프로필 키" },
    { key: "templateId", label: "템플릿 ID", placeholder: "알림톡 템플릿 ID" },
  ],
  douzone: [
    { key: "apiUrl", label: "API URL", placeholder: "https://erp.douzone.com/api/..." },
    { key: "companyCode", label: "회사 코드", placeholder: "ERP 회사 코드" },
    { key: "apiKey", label: "API 키", placeholder: "더존 API 인증 키", type: "password" },
  ],
  remember: [
    { key: "apiToken", label: "API 토큰", placeholder: "리멤버 API 토큰", type: "password" },
    { key: "syncInterval", label: "동기화 주기 (분)", placeholder: "60" },
  ],
};

const integrationSubtitles: Record<string, string> = {
  gmail: "이메일 연동",
  slack: "슬랙 연동",
  kakao: "카카오 연동",
  douzone: "ERP 연동",
  remember: "명함 연동",
};

export default function IntegrationsPage() {
  const [savedIntegrations, setSavedIntegrations] = useState<Record<string, IntegrationData>>({});
  const [selectedCard, setSelectedCard] = useState<IntegrationCard | null>(null);
  const [configValues, setConfigValues] = useState<ConfigFields>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch existing integrations
  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const res = await fetch("/api/integrations");
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, IntegrationData> = {};
        data.integrations.forEach((integration: IntegrationData) => {
          map[integration.name] = integration;
        });
        setSavedIntegrations(map);
      }
    } catch (error) {
      console.error("Failed to fetch integrations:", error);
    } finally {
      setLoading(false);
    }
  };

  const openConfigModal = (card: IntegrationCard) => {
    setSelectedCard(card);
    setMessage(null);

    // Load existing config values
    const existing = savedIntegrations[card.name];
    if (existing?.config) {
      try {
        const parsed = JSON.parse(existing.config);
        setConfigValues(parsed);
      } catch {
        setConfigValues({});
      }
    } else {
      setConfigValues({});
    }
  };

  const closeModal = () => {
    setSelectedCard(null);
    setConfigValues({});
    setMessage(null);
  };

  const handleSaveConfig = async () => {
    if (!selectedCard) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedCard.name,
          type: selectedCard.type,
          config: configValues,
          isActive: true,
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "설정이 저장되었습니다." });
        await fetchIntegrations();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "저장에 실패했습니다." });
      }
    } catch {
      setMessage({ type: "error", text: "저장 중 오류가 발생했습니다." });
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async (card: IntegrationCard, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: card.name,
          type: card.type,
          config: null,
          isActive: false,
        }),
      });

      if (res.ok) {
        await fetchIntegrations();
      }
    } catch (error) {
      console.error("Failed to disconnect:", error);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">외부 서비스 연동</h2>
        <p className="mt-1 text-sm text-gray-500">
          외부 서비스를 연동하여 CRM의 기능을 확장하세요
        </p>
      </div>

      {/* Integration Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {integrationCards.map((card) => {
          const saved = savedIntegrations[card.name];
          const isConnected = saved?.isActive ?? false;
          const Icon = card.icon;

          return (
            <div
              key={card.id}
              onClick={() => openConfigModal(card)}
              className="group cursor-pointer rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] transition-all hover:border-indigo-200 hover:shadow-md"
            >
              {/* Icon + Status */}
              <div className="mb-4 flex items-start justify-between">
                <div className={`rounded-xl p-3 ${card.bgColor}`}>
                  <Icon className={`h-6 w-6 ${card.color}`} />
                </div>
                {isConnected ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    연결됨
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                    <XCircle className="h-3.5 w-3.5" />
                    미연결
                  </span>
                )}
              </div>

              {/* Name + Subtitle */}
              <h3 className="text-lg font-semibold text-gray-900">
                {card.label}
              </h3>
              <p className="mt-0.5 text-xs font-medium text-indigo-600">
                {integrationSubtitles[card.name]}
              </p>

              {/* Description */}
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                {card.description}
              </p>

              {/* Last Sync */}
              {isConnected && saved?.lastSyncAt && (
                <div className="mt-4 flex items-center gap-1.5 text-xs text-gray-400">
                  <RefreshCw className="h-3 w-3" />
                  <span>마지막 동기화: {formatDate(saved.lastSyncAt)}</span>
                </div>
              )}

              {/* Action Button */}
              <div className="mt-4 flex gap-2">
                {isConnected ? (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openConfigModal(card);
                      }}
                      className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      설정
                    </button>
                    <button
                      onClick={(e) => handleDisconnect(card, e)}
                      className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                    >
                      연결 해제
                    </button>
                  </>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openConfigModal(card);
                    }}
                    className="w-full rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 shadow-sm"
                  >
                    연결하기
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Configuration Modal */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Modal Content */}
          <div className="relative z-10 mx-4 w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${selectedCard.bgColor}`}>
                  <selectedCard.icon className={`h-5 w-5 ${selectedCard.color}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedCard.label} 연동 설정
                  </h3>
                  <p className="text-xs text-gray-500">
                    {integrationSubtitles[selectedCard.name]}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 px-6 py-5">
              <p className="text-sm text-gray-500">
                {selectedCard.description}
              </p>

              {/* Config Fields */}
              <div className="space-y-3">
                {configFieldsByService[selectedCard.name]?.map((field) => (
                  <div key={field.key}>
                    <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                      <Key className="h-3.5 w-3.5 text-gray-400" />
                      {field.label}
                    </label>
                    <input
                      type={field.type || "text"}
                      value={configValues[field.key] || ""}
                      onChange={(e) =>
                        setConfigValues((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                      placeholder={field.placeholder}
                      className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 transition-colors focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                ))}
              </div>

              {/* Help Link */}
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <ExternalLink className="h-3 w-3" />
                <span>API 키 발급 방법은 각 서비스의 개발자 문서를 참고하세요</span>
              </div>

              {/* Message */}
              {message && (
                <div
                  className={`rounded-lg px-4 py-3 text-sm ${
                    message.type === "success"
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {message.text}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={closeModal}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                설정 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
