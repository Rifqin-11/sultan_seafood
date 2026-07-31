"use client";

import { useState } from "react";
import { Fish, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { signInAction } from "@/lib/actions/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    const res = await signInAction(formData);
    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-3 shadow-lg">
            <Fish className="w-6 h-6 text-[#121212]" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Sultan Seafood</h1>
          <p className="text-xs text-neutral-400 mt-0.5">ERP Internal Restoran</p>
        </div>

        {/* Card Form */}
        <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-2xl p-6 shadow-2xl space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">
                Masuk ke Akun
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Masukkan email dan password terdaftar Supabase Auth.
              </p>
            </div>
            <div className="p-2 bg-[#262626] rounded-lg text-neutral-400">
              <Lock className="w-4 h-4" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-neutral-300 mb-1.5"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 bg-[#242424] border-[#333] text-white placeholder:text-neutral-600 focus-visible:ring-white/20 text-xs"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-neutral-300 mb-1.5"
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
                  className="h-10 bg-[#242424] border-[#333] text-white placeholder:text-neutral-600 focus-visible:ring-white/20 pr-10 text-xs"
                  autoComplete="current-password"
                  required
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
              <div className="text-xs text-red-400 bg-red-950/40 border border-red-900/60 rounded-lg p-3 space-y-0.5">
                <p className="font-semibold">Gagal Masuk</p>
                <p className="text-red-300/90">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-10 bg-white text-[#121212] hover:bg-neutral-200 font-semibold text-xs transition-colors mt-2"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {loading ? "Memverifikasi..." : "Masuk Sistem"}
            </Button>
          </form>

          <p className="text-[11px] text-neutral-500 text-center leading-relaxed">
            Keamanan terenkripsi via Supabase Auth Session Cookie HTTP-Only.
          </p>

          <div className="pt-2 border-t border-[#262626] text-center text-xs text-neutral-400">
            Belum memiliki akun?{" "}
            <a href="/register" className="text-white font-medium hover:underline">
              Daftar Akun Baru
            </a>
          </div>
        </div>

        <p className="text-xs text-neutral-600 text-center mt-6">
          © 2026 Sultan Seafood. Semua hak dilindungi.
        </p>
      </div>
    </div>
  );
}
