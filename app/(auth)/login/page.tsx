"use client";

import { useState } from "react";
import { Fish, Eye, EyeOff, Loader2, Sparkles, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { signInAction } from "@/lib/actions/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("owner@sultansf.id");
  const [password, setPassword] = useState("123456");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLoginWithCredentials = async (targetEmail: string, targetPass: string) => {
    setError("");
    setLoading(true);

    const formData = new FormData();
    formData.append("email", targetEmail);
    formData.append("password", targetPass);

    const res = await signInAction(formData);
    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }
    await handleLoginWithCredentials(email, password);
  };

  const handleQuickDemoLogin = async (demoEmail: string, demoRole: string) => {
    setEmail(demoEmail);
    setPassword("123456");
    await handleLoginWithCredentials(demoEmail, "123456");
  };

  return (
    <div className="min-h-screen bg-[#151515] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-3 shadow-lg">
            <Fish className="w-6 h-6 text-[#151515]" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Sultan Seafood</h1>
          <p className="text-xs text-neutral-400 mt-0.5">ERP Internal Restoran</p>
        </div>

        {/* Form Card */}
        <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-2xl p-6 shadow-2xl space-y-5">
          <div>
            <h2 className="text-base font-semibold text-white">
              Masuk ke Akun ERP
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Gunakan kredensial terdaftar atau akses demo cepat.
            </p>
          </div>

          {/* Quick Demo Access Box */}
          <div className="bg-[#242424] border border-[#333] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Akun Demo Pengujian:
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin("owner@sultansf.id", "Owner")}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-[#2d2d2d] hover:bg-[#383838] border border-[#404040] text-xs font-medium text-white rounded-lg transition-all text-center"
              >
                <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                Demo Owner
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin("admin@sultansf.id", "Staff Admin")}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-[#2d2d2d] hover:bg-[#383838] border border-[#404040] text-xs font-medium text-white rounded-lg transition-all text-center"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                Demo Admin
              </button>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-[#2a2a2a] w-full" />
            <span className="bg-[#1c1c1c] px-2 text-[10px] text-neutral-500 uppercase tracking-widest absolute">
              atau masuk manual
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-neutral-400 mb-1.5"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="owner@sultansf.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 bg-[#252525] border-[#333] text-white placeholder:text-neutral-600 focus-visible:ring-white/20 text-xs"
                autoComplete="email"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-neutral-400 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 bg-[#252525] border-[#333] text-white placeholder:text-neutral-600 focus-visible:ring-white/20 pr-10 text-xs"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full h-10 bg-white text-[#151515] hover:bg-neutral-100 font-semibold text-xs mt-1"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {loading ? "Memproses..." : "Masuk"}
            </Button>
          </form>

          <p className="text-[11px] text-neutral-500 text-center">
            Sistem ERP Internal Sultan Seafood.
          </p>
        </div>

        <p className="text-xs text-neutral-600 text-center mt-6">
          © 2026 Sultan Seafood. Semua hak dilindungi.
        </p>
      </div>
    </div>
  );
}
