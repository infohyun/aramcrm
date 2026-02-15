"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("로그인 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f7f8]">
      <div className="w-full max-w-[400px] px-6">
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-10 border border-[#ebebeb]">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-[#111111] rounded-xl mb-5">
              <span className="text-white text-lg font-bold tracking-tight">AH</span>
            </div>
            <h1 className="text-[22px] font-semibold text-[#111111] tracking-tight">
              아람휴비스 CRM
            </h1>
            <p className="text-[#999999] mt-2 text-sm">계정에 로그인하세요</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3.5 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-[13px] text-red-600 text-center">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-[13px] font-medium text-[#555555] mb-2"
              >
                이메일
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@company.com"
                className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl text-[#111111] text-sm placeholder-[#999999] focus:outline-none focus:ring-2 focus:ring-[#111111]/10 focus:border-[#111111] transition-all bg-[#f7f7f8] focus:bg-white"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-[13px] font-medium text-[#555555] mb-2"
              >
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="비밀번호를 입력하세요"
                className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl text-[#111111] text-sm placeholder-[#999999] focus:outline-none focus:ring-2 focus:ring-[#111111]/10 focus:border-[#111111] transition-all bg-[#f7f7f8] focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#111111] text-white text-sm font-semibold rounded-xl hover:bg-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-[#111111]/20 focus:ring-offset-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  로그인 중...
                </span>
              ) : (
                "로그인"
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-[13px] text-[#999999]">
              계정이 없으신가요?{" "}
              <Link
                href="/register"
                className="text-[#111111] font-medium hover:underline transition-colors"
              >
                회원가입
              </Link>
            </p>
          </div>
        </div>

        {/* Bottom text */}
        <p className="text-center text-[11px] text-[#bbbbbb] mt-8">
          &copy; 2026 아람휴비스. All rights reserved.
        </p>
      </div>
    </div>
  );
}
