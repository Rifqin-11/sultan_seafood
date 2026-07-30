"use client";

import { useState } from "react";
import { Fish, Eye, EyeOff, Loader2 } from "lucide-react";
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
    <div className="min-h-screen bg-[#151515] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-4">
            <Fish className="w-6 h-6 text-[#151515]" />
          </div>
          <h1 className="text-xl font-bold text-white">Sultan Seafood</h1>
          <p className="text-sm text-neutral-400 mt-0.5">ERP Internal</p>
        </div>

        {/* Form */}
        <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-2xl p-6 shadow-2xl">
          <h2 className="text-base font-semibold text-white mb-5">
            Masuk ke akun Anda
          </h2>

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
                placeholder="email@sultansf.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 bg-[#252525] border-[#333] text-white placeholder:text-neutral-600 focus-visible:ring-white/20"
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
                  className="h-10 bg-[#252525] border-[#333] text-white placeholder:text-neutral-600 focus-visible:ring-white/20 pr-10"
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
              className="w-full h-10 bg-white text-[#151515] hover:bg-neutral-100 font-semibold mt-1"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {loading ? "Memproses..." : "Masuk"}
            </Button>
          </form>

          <p className="text-xs text-neutral-500 text-center mt-4">
            Sistem ERP internal. Akses hanya untuk pengguna terdaftar.
          </p>
        </div>

        <p className="text-xs text-neutral-600 text-center mt-6">
          © 2026 Sultan Seafood. Semua hak dilindungi.
        </p>
      </div>
    </div>
  );
}
