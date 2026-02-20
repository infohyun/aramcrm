"use client";

import { useState, useEffect, useRef } from "react";
import {
  User,
  Lock,
  Bell,
  Building2,
  Save,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  Palette,
  Sun,
  Moon,
  Upload,
  Camera,
  Menu,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { navGroups, ALWAYS_VISIBLE_MENUS, DEFAULT_AS_MENUS } from "@/components/Sidebar";

type TabId = "profile" | "password" | "notifications" | "system" | "appearance" | "menus";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

const tabs: Tab[] = [
  { id: "profile", label: "내 프로필", icon: User },
  { id: "password", label: "비밀번호 변경", icon: Lock },
  { id: "menus", label: "메뉴 관리", icon: Menu },
  { id: "notifications", label: "알림 설정", icon: Bell },
  { id: "appearance", label: "외관 설정", icon: Palette },
  { id: "system", label: "시스템 설정", icon: Building2 },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const { theme, setTheme } = useTheme();

  // Profile state
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
  });
  const [avatar, setAvatar] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Password state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Notification state
  const [notifications, setNotifications] = useState({
    emailNotify: true,
    pushNotify: true,
    taskReminder: true,
    approvalNotify: true,
    chatNotify: true,
  });
  const [notificationSaving, setNotificationSaving] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // System settings state
  const [systemForm, setSystemForm] = useState({
    companyName: "",
    companyEmail: "",
    companyPhone: "",
    companyAddress: "",
    defaultCustomerGrade: "normal",
    defaultPageSize: "20",
  });
  const [systemSaving, setSystemSaving] = useState(false);
  const [systemMessage, setSystemMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Appearance: hidden widgets
  const [hiddenWidgets, setHiddenWidgets] = useState<string[]>([]);
  const [appearanceSaving, setAppearanceSaving] = useState(false);
  const [appearanceMessage, setAppearanceMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Menu management
  const [enabledMenus, setEnabledMenus] = useState<string[]>([...DEFAULT_AS_MENUS]);
  const [menuSaving, setMenuSaving] = useState(false);
  const [menuMessage, setMenuMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [menuInitialized, setMenuInitialized] = useState(false);

  const WIDGET_OPTIONS = [
    { key: "stats", label: "통계 카드" },
    { key: "quickActions", label: "빠른 작업" },
    { key: "tasks", label: "내 태스크" },
    { key: "approvals", label: "결재 현황" },
    { key: "calendar", label: "캘린더" },
    { key: "notices", label: "공지사항" },
    { key: "recentActivity", label: "최근 활동" },
  ];

  // Load profile on mount
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/settings/profile");
        if (res.ok) {
          const data = await res.json();
          setProfileForm({
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
            department: data.department || "",
          });
          setAvatar(data.avatar || null);
        }
      } catch {
        // ignore
      } finally {
        setProfileLoading(false);
      }
    }
    loadProfile();
  }, []);

  // Load notification preferences
  useEffect(() => {
    async function loadPreferences() {
      try {
        const res = await fetch("/api/settings/preferences");
        if (res.ok) {
          const data = await res.json();
          setNotifications({
            emailNotify: data.emailNotify ?? true,
            pushNotify: data.pushNotify ?? true,
            taskReminder: data.taskReminder ?? true,
            approvalNotify: data.approvalNotify ?? true,
            chatNotify: data.chatNotify ?? true,
          });
          const hw = data.hiddenWidgets;
          if (hw) {
            try {
              setHiddenWidgets(JSON.parse(hw));
            } catch {
              setHiddenWidgets([]);
            }
          }
          // enabledMenus 로드
          if (data.enabledMenus) {
            try {
              setEnabledMenus(JSON.parse(data.enabledMenus));
            } catch {
              setEnabledMenus([...DEFAULT_AS_MENUS]);
            }
          } else {
            setEnabledMenus([...DEFAULT_AS_MENUS]);
          }
          setMenuInitialized(true);
        }
      } catch {
        // ignore
      }
    }
    loadPreferences();
  }, []);

  // Load system settings
  useEffect(() => {
    async function loadSystemSettings() {
      try {
        const res = await fetch("/api/settings/system");
        if (res.ok) {
          const data = await res.json();
          setSystemForm({
            companyName: data.companyName || "아람휴비스",
            companyEmail: data.companyEmail || "",
            companyPhone: data.companyPhone || "",
            companyAddress: data.companyAddress || "",
            defaultCustomerGrade: data.defaultCustomerGrade || "normal",
            defaultPageSize: data.defaultPageSize || "20",
          });
        }
      } catch {
        // ignore
      }
    }
    loadSystemSettings();
  }, []);

  // Profile handlers
  const handleProfileSave = async () => {
    setProfileSaving(true);
    setProfileMessage(null);

    try {
      const res = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileForm.name,
          phone: profileForm.phone,
          department: profileForm.department,
        }),
      });

      if (res.ok) {
        setProfileMessage({ type: "success", text: "프로필이 업데이트되었습니다." });
      } else {
        const data = await res.json();
        setProfileMessage({ type: "error", text: data.error || "프로필 저장에 실패했습니다." });
      }
    } catch {
      setProfileMessage({ type: "error", text: "프로필 저장 중 오류가 발생했습니다." });
    } finally {
      setProfileSaving(false);
    }
  };

  // Avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch("/api/settings/avatar", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setAvatar(data.avatar);
        setProfileMessage({ type: "success", text: "아바타가 업데이트되었습니다." });
      } else {
        const data = await res.json();
        setProfileMessage({ type: "error", text: data.error || "아바타 업로드에 실패했습니다." });
      }
    } catch {
      setProfileMessage({ type: "error", text: "아바타 업로드 중 오류가 발생했습니다." });
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  // Password handlers
  const handlePasswordSave = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: "error", text: "새 비밀번호가 일치하지 않습니다." });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "비밀번호는 최소 6자 이상이어야 합니다." });
      return;
    }

    setPasswordSaving(true);
    setPasswordMessage(null);

    try {
      const res = await fetch("/api/settings/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (res.ok) {
        setPasswordMessage({ type: "success", text: "비밀번호가 변경되었습니다." });
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        const data = await res.json();
        setPasswordMessage({ type: "error", text: data.error || "비밀번호 변경에 실패했습니다." });
      }
    } catch {
      setPasswordMessage({ type: "error", text: "비밀번호 변경 중 오류가 발생했습니다." });
    } finally {
      setPasswordSaving(false);
    }
  };

  // Notification handlers
  const handleNotificationSave = async () => {
    setNotificationSaving(true);
    setNotificationMessage(null);

    try {
      const res = await fetch("/api/settings/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notifications),
      });

      if (res.ok) {
        setNotificationMessage({ type: "success", text: "알림 설정이 저장되었습니다." });
      } else {
        setNotificationMessage({ type: "error", text: "알림 설정 저장에 실패했습니다." });
      }
    } catch {
      setNotificationMessage({ type: "error", text: "알림 설정 저장 중 오류가 발생했습니다." });
    } finally {
      setNotificationSaving(false);
    }
  };

  // Appearance handlers
  const handleAppearanceSave = async () => {
    setAppearanceSaving(true);
    setAppearanceMessage(null);

    try {
      const res = await fetch("/api/settings/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hiddenWidgets }),
      });

      if (res.ok) {
        setAppearanceMessage({ type: "success", text: "외관 설정이 저장되었습니다." });
      } else {
        setAppearanceMessage({ type: "error", text: "외관 설정 저장에 실패했습니다." });
      }
    } catch {
      setAppearanceMessage({ type: "error", text: "외관 설정 저장 중 오류가 발생했습니다." });
    } finally {
      setAppearanceSaving(false);
    }
  };

  // System settings handlers
  const handleSystemSave = async () => {
    setSystemSaving(true);
    setSystemMessage(null);

    try {
      const res = await fetch("/api/settings/system", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(systemForm),
      });

      if (res.ok) {
        setSystemMessage({ type: "success", text: "시스템 설정이 저장되었습니다." });
      } else {
        setSystemMessage({ type: "error", text: "시스템 설정 저장에 실패했습니다." });
      }
    } catch {
      setSystemMessage({ type: "error", text: "시스템 설정 저장 중 오류가 발생했습니다." });
    } finally {
      setSystemSaving(false);
    }
  };

  // Menu management handlers
  const handleMenuSave = async () => {
    setMenuSaving(true);
    setMenuMessage(null);

    try {
      const res = await fetch("/api/settings/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabledMenus }),
      });

      if (res.ok) {
        setMenuMessage({ type: "success", text: "메뉴 설정이 저장되었습니다. 사이드바에 즉시 반영됩니다." });
        // 사이드바 리프레시를 위해 페이지 새로고침
        setTimeout(() => window.location.reload(), 800);
      } else {
        setMenuMessage({ type: "error", text: "메뉴 설정 저장에 실패했습니다." });
      }
    } catch {
      setMenuMessage({ type: "error", text: "메뉴 설정 저장 중 오류가 발생했습니다." });
    } finally {
      setMenuSaving(false);
    }
  };

  const toggleMenu = (href: string) => {
    setEnabledMenus((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]
    );
  };

  const enableAllMenus = () => {
    const allHrefs = navGroups.flatMap((g) => g.items.map((i) => i.href))
      .filter((h) => !ALWAYS_VISIBLE_MENUS.includes(h));
    setEnabledMenus(allHrefs);
  };

  const resetToDefault = () => {
    setEnabledMenus([...DEFAULT_AS_MENUS]);
  };

  const ToggleSwitch = ({
    checked,
    onChange,
  }: {
    checked: boolean;
    onChange: (value: boolean) => void;
  }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
        checked ? "bg-indigo-600" : "bg-gray-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );

  const MessageBox = ({ message }: { message: { type: "success" | "error"; text: string } | null }) => {
    if (!message) return null;
    return (
      <div
        className={`mt-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
          message.type === "success"
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-red-50 text-red-700 border border-red-200"
        }`}
      >
        {message.type === "success" && <CheckCircle2 className="h-4 w-4" />}
        {message.text}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">설정</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          계정 및 시스템 설정을 관리합니다
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Tabs Sidebar */}
        <div className="w-full lg:w-56 shrink-0">
          <nav className="space-y-1 rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400"}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {/* Profile Section */}
          {activeTab === "profile" && (
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]">
              <div className="border-b border-gray-100 dark:border-gray-700 px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">내 프로필</h3>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  기본 프로필 정보를 수정합니다
                </p>
              </div>
              <div className="space-y-4 px-6 py-5">
                {/* Avatar Upload */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden border-2 border-gray-200 dark:border-gray-600">
                      {avatar ? (
                        <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={avatarUploading}
                      className="absolute -bottom-1 -right-1 p-1.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      {avatarUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                    </button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">프로필 사진</p>
                    <p className="text-xs text-gray-400">JPG, PNG, GIF. 최대 5MB</p>
                  </div>
                </div>

                {profileLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">이름</label>
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        placeholder="이름을 입력하세요"
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3.5 py-2.5 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">이메일</label>
                      <input
                        type="email"
                        value={profileForm.email}
                        disabled
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 px-3.5 py-2.5 text-sm text-gray-500 cursor-not-allowed"
                      />
                      <p className="mt-1 text-xs text-gray-400">이메일은 변경할 수 없습니다</p>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">전화번호</label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        placeholder="010-0000-0000"
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3.5 py-2.5 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">부서</label>
                      <input
                        type="text"
                        value={profileForm.department}
                        onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                        placeholder="소속 부서"
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3.5 py-2.5 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                  </div>
                )}
                <MessageBox message={profileMessage} />
              </div>
              <div className="flex justify-end border-t border-gray-100 dark:border-gray-700 px-6 py-4">
                <button
                  onClick={handleProfileSave}
                  disabled={profileSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
                >
                  {profileSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  프로필 저장
                </button>
              </div>
            </div>
          )}

          {/* Password Section */}
          {activeTab === "password" && (
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]">
              <div className="border-b border-gray-100 dark:border-gray-700 px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">비밀번호 변경</h3>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  계정의 비밀번호를 변경합니다
                </p>
              </div>
              <div className="space-y-4 px-6 py-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">현재 비밀번호</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      placeholder="현재 비밀번호를 입력하세요"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3.5 py-2.5 pr-10 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">새 비밀번호</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="새 비밀번호 (최소 6자)"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3.5 py-2.5 pr-10 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">새 비밀번호 확인</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="새 비밀번호를 다시 입력하세요"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3.5 py-2.5 pr-10 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <MessageBox message={passwordMessage} />
              </div>
              <div className="flex justify-end border-t border-gray-100 dark:border-gray-700 px-6 py-4">
                <button
                  onClick={handlePasswordSave}
                  disabled={passwordSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
                >
                  {passwordSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  비밀번호 변경
                </button>
              </div>
            </div>
          )}

          {/* Notifications Section */}
          {activeTab === "notifications" && (
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]">
              <div className="border-b border-gray-100 dark:border-gray-700 px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">알림 설정</h3>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  알림 수신 방법과 항목을 설정합니다
                </p>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700 px-6">
                <div className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">이메일 알림</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">중요 알림을 이메일로 수신합니다</p>
                  </div>
                  <ToggleSwitch
                    checked={notifications.emailNotify}
                    onChange={(value) => setNotifications({ ...notifications, emailNotify: value })}
                  />
                </div>
                <div className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">푸시 알림</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">브라우저 푸시 알림을 수신합니다</p>
                  </div>
                  <ToggleSwitch
                    checked={notifications.pushNotify}
                    onChange={(value) => setNotifications({ ...notifications, pushNotify: value })}
                  />
                </div>
                <div className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">태스크 리마인더</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">마감일이 다가오는 태스크 알림</p>
                  </div>
                  <ToggleSwitch
                    checked={notifications.taskReminder}
                    onChange={(value) => setNotifications({ ...notifications, taskReminder: value })}
                  />
                </div>
                <div className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">결재 알림</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">결재 요청 및 승인/반려 알림</p>
                  </div>
                  <ToggleSwitch
                    checked={notifications.approvalNotify}
                    onChange={(value) => setNotifications({ ...notifications, approvalNotify: value })}
                  />
                </div>
                <div className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">채팅 알림</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">새 메시지 수신 알림</p>
                  </div>
                  <ToggleSwitch
                    checked={notifications.chatNotify}
                    onChange={(value) => setNotifications({ ...notifications, chatNotify: value })}
                  />
                </div>
              </div>
              <div className="flex justify-end border-t border-gray-100 dark:border-gray-700 px-6 py-4">
                <MessageBox message={notificationMessage} />
                <button
                  onClick={handleNotificationSave}
                  disabled={notificationSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 shadow-sm ml-4"
                >
                  {notificationSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  알림 설정 저장
                </button>
              </div>
            </div>
          )}

          {/* Menu Management Section */}
          {activeTab === "menus" && (
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]">
              <div className="border-b border-gray-100 dark:border-gray-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">메뉴 관리</h3>
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                      사이드바에 표시할 메뉴를 선택합니다. 기본값은 AS 관련 메뉴만 표시됩니다.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={enableAllMenus}
                      className="rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      전체 활성화
                    </button>
                    <button
                      onClick={resetToDefault}
                      className="rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      AS 기본값
                    </button>
                  </div>
                </div>
              </div>
              {menuInitialized ? (
                <div className="px-6 py-4 space-y-5">
                  {navGroups.map((group) => {
                    const toggleableItems = group.items.filter(
                      (item) => !ALWAYS_VISIBLE_MENUS.includes(item.href)
                    );
                    if (toggleableItems.length === 0) return null;
                    return (
                      <div key={group.label}>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                          {group.label}
                        </h4>
                        <div className="space-y-0 divide-y divide-gray-100 dark:divide-gray-700">
                          {toggleableItems.map((item) => {
                            const isDefault = DEFAULT_AS_MENUS.includes(item.href);
                            const Icon = item.icon;
                            return (
                              <div key={item.href} className="flex items-center justify-between py-2.5">
                                <div className="flex items-center gap-3">
                                  <Icon className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                                  {isDefault && (
                                    <span className="rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">
                                      AS 기본
                                    </span>
                                  )}
                                </div>
                                <ToggleSwitch
                                  checked={enabledMenus.includes(item.href)}
                                  onChange={() => toggleMenu(item.href)}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-2 text-xs text-gray-400 dark:text-gray-500">
                    * 대시보드와 설정은 항상 표시됩니다.
                  </div>
                </div>
              ) : (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                </div>
              )}
              <div className="flex justify-end border-t border-gray-100 dark:border-gray-700 px-6 py-4">
                <MessageBox message={menuMessage} />
                <button
                  onClick={handleMenuSave}
                  disabled={menuSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 shadow-sm ml-4"
                >
                  {menuSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  메뉴 설정 저장
                </button>
              </div>
            </div>
          )}

          {/* Appearance Section */}
          {activeTab === "appearance" && (
            <div className="space-y-6">
              {/* Theme */}
              <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]">
                <div className="border-b border-gray-100 dark:border-gray-700 px-6 py-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">테마</h3>
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    화면 테마를 선택합니다
                  </p>
                </div>
                <div className="px-6 py-5">
                  <div className="flex gap-4">
                    <button
                      onClick={() => setTheme("light")}
                      className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        theme === "light"
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                          : "border-gray-200 dark:border-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <Sun className={`w-5 h-5 ${theme === "light" ? "text-indigo-600" : "text-gray-400"}`} />
                      <div className="text-left">
                        <p className={`text-sm font-semibold ${theme === "light" ? "text-indigo-700" : "text-gray-700 dark:text-gray-300"}`}>라이트</p>
                        <p className="text-xs text-gray-400">밝은 배경 테마</p>
                      </div>
                    </button>
                    <button
                      onClick={() => setTheme("dark")}
                      className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        theme === "dark"
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                          : "border-gray-200 dark:border-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <Moon className={`w-5 h-5 ${theme === "dark" ? "text-indigo-600" : "text-gray-400"}`} />
                      <div className="text-left">
                        <p className={`text-sm font-semibold ${theme === "dark" ? "text-indigo-700 dark:text-indigo-400" : "text-gray-700 dark:text-gray-300"}`}>다크</p>
                        <p className="text-xs text-gray-400">어두운 배경 테마</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Dashboard Widget Visibility */}
              <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]">
                <div className="border-b border-gray-100 dark:border-gray-700 px-6 py-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">대시보드 위젯</h3>
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    대시보드에 표시할 위젯을 선택합니다
                  </p>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700 px-6">
                  {WIDGET_OPTIONS.map((w) => (
                    <div key={w.key} className="flex items-center justify-between py-3">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{w.label}</span>
                      <ToggleSwitch
                        checked={!hiddenWidgets.includes(w.key)}
                        onChange={(visible) => {
                          if (visible) {
                            setHiddenWidgets(hiddenWidgets.filter((k) => k !== w.key));
                          } else {
                            setHiddenWidgets([...hiddenWidgets, w.key]);
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end border-t border-gray-100 dark:border-gray-700 px-6 py-4">
                  <MessageBox message={appearanceMessage} />
                  <button
                    onClick={handleAppearanceSave}
                    disabled={appearanceSaving}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 shadow-sm ml-4"
                  >
                    {appearanceSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    외관 설정 저장
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* System Settings Section */}
          {activeTab === "system" && (
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]">
              <div className="border-b border-gray-100 dark:border-gray-700 px-6 py-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">시스템 설정</h3>
                  <span className="rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-400">
                    관리자 전용
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  회사 정보 및 기본 설정을 관리합니다
                </p>
              </div>
              <div className="space-y-4 px-6 py-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">회사명</label>
                    <input
                      type="text"
                      value={systemForm.companyName}
                      onChange={(e) => setSystemForm({ ...systemForm, companyName: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3.5 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">대표 이메일</label>
                    <input
                      type="email"
                      value={systemForm.companyEmail}
                      onChange={(e) => setSystemForm({ ...systemForm, companyEmail: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3.5 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">대표 전화번호</label>
                    <input
                      type="tel"
                      value={systemForm.companyPhone}
                      onChange={(e) => setSystemForm({ ...systemForm, companyPhone: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3.5 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">주소</label>
                    <input
                      type="text"
                      value={systemForm.companyAddress}
                      onChange={(e) => setSystemForm({ ...systemForm, companyAddress: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3.5 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <hr className="border-gray-100 dark:border-gray-700" />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">기본 고객 등급</label>
                    <select
                      value={systemForm.defaultCustomerGrade}
                      onChange={(e) => setSystemForm({ ...systemForm, defaultCustomerGrade: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3.5 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="new">신규</option>
                      <option value="normal">일반</option>
                      <option value="gold">골드</option>
                      <option value="vip">VIP</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">기본 페이지 크기</label>
                    <select
                      value={systemForm.defaultPageSize}
                      onChange={(e) => setSystemForm({ ...systemForm, defaultPageSize: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3.5 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="10">10개</option>
                      <option value="20">20개</option>
                      <option value="50">50개</option>
                      <option value="100">100개</option>
                    </select>
                  </div>
                </div>
                <MessageBox message={systemMessage} />
              </div>
              <div className="flex justify-end border-t border-gray-100 dark:border-gray-700 px-6 py-4">
                <button
                  onClick={handleSystemSave}
                  disabled={systemSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
                >
                  {systemSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  시스템 설정 저장
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
