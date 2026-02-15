"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  User,
  Phone,
  Building2,
  FileText,
} from "lucide-react";

interface FormData {
  name: string;
  email: string;
  phone: string;
  mobile: string;
  company: string;
  position: string;
  department: string;
  address: string;
  addressDetail: string;
  zipCode: string;
  grade: string;
  source: string;
  memo: string;
  tags: string;
  birthday: string;
}

const INITIAL_FORM: FormData = {
  name: "",
  email: "",
  phone: "",
  mobile: "",
  company: "",
  position: "",
  department: "",
  address: "",
  addressDetail: "",
  zipCode: "",
  grade: "normal",
  source: "",
  memo: "",
  tags: "",
  birthday: "",
};

export default function NewCustomerPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) {
      newErrors.name = "고객 이름을 입력해 주세요.";
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "올바른 이메일 형식이 아닙니다.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "고객 등록에 실패했습니다.");
      }

      router.push("/customers");
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "고객 등록에 실패했습니다."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/customers")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">고객 등록</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                새로운 고객 정보를 입력해 주세요.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 기본 정보 */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 bg-gray-50/60 border-b border-gray-200">
              <User className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-semibold text-gray-900">
                기본 정보
              </h2>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* 이름 */}
              <div className="sm:col-span-2 sm:max-w-xs">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="고객 이름"
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm outline-none transition-shadow focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.name ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                )}
              </div>

              {/* 등급 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  등급
                </label>
                <select
                  name="grade"
                  value={form.grade}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="new">신규</option>
                  <option value="normal">일반</option>
                  <option value="gold">Gold</option>
                  <option value="vip">VIP</option>
                </select>
              </div>

              {/* 유입경로 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  유입경로
                </label>
                <input
                  type="text"
                  name="source"
                  value={form.source}
                  onChange={handleChange}
                  placeholder="예: 홈페이지, 박람회, 소개"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* 생일 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  생일
                </label>
                <input
                  type="text"
                  name="birthday"
                  value={form.birthday}
                  onChange={handleChange}
                  placeholder="예: 1990-01-01"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* 태그 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  태그
                </label>
                <input
                  type="text"
                  name="tags"
                  value={form.tags}
                  onChange={handleChange}
                  placeholder="쉼표로 구분 (예: VIP고객, 서울)"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </section>

          {/* 연락처 */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 bg-gray-50/60 border-b border-gray-200">
              <Phone className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-semibold text-gray-900">연락처</h2>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* 이메일 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  이메일
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="email@example.com"
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm outline-none transition-shadow focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.email ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                )}
              </div>

              {/* 전화번호 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  전화번호
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="02-1234-5678"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* 휴대폰 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  휴대폰
                </label>
                <input
                  type="tel"
                  name="mobile"
                  value={form.mobile}
                  onChange={handleChange}
                  placeholder="010-1234-5678"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </section>

          {/* 회사 정보 */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 bg-gray-50/60 border-b border-gray-200">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-semibold text-gray-900">
                회사 정보
              </h2>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* 회사명 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  회사명
                </label>
                <input
                  type="text"
                  name="company"
                  value={form.company}
                  onChange={handleChange}
                  placeholder="회사명"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* 직책 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  직책
                </label>
                <input
                  type="text"
                  name="position"
                  value={form.position}
                  onChange={handleChange}
                  placeholder="직책"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* 부서 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  부서
                </label>
                <input
                  type="text"
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  placeholder="부서"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* 우편번호 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  우편번호
                </label>
                <input
                  type="text"
                  name="zipCode"
                  value={form.zipCode}
                  onChange={handleChange}
                  placeholder="12345"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* 주소 */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  주소
                </label>
                <input
                  type="text"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="주소"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* 상세주소 */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  상세주소
                </label>
                <input
                  type="text"
                  name="addressDetail"
                  value={form.addressDetail}
                  onChange={handleChange}
                  placeholder="상세주소"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </section>

          {/* 기타 */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 bg-gray-50/60 border-b border-gray-200">
              <FileText className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-semibold text-gray-900">기타</h2>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                메모
              </label>
              <textarea
                name="memo"
                value={form.memo}
                onChange={handleChange}
                rows={4}
                placeholder="고객에 대한 메모를 입력해 주세요."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              />
            </div>
          </section>

          {/* 버튼 */}
          <div className="flex items-center justify-end gap-3 pb-8">
            <button
              type="button"
              onClick={() => router.push("/customers")}
              className="px-6 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <Save className="w-4 h-4" />
              {submitting ? "등록 중..." : "고객 등록"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
