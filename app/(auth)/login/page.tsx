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
    <main id="main-content" className="flex min-h-[100dvh] items-center justify-center bg-sidebar px-4 py-8 sm:px-6">
      <div className="w-full max-w-sm">
        {/* Header Logo */}
        <div className="mb-7 flex flex-col items-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-2xl border border-white/15 bg-white shadow-lg">
            <Fish className="size-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Sultan Seafood</h1>
          <p className="mt-1 text-xs text-sidebar-foreground">Workspace operasional</p>
        </div>

        {/* Card Form */}
        <div className="space-y-5 rounded-[24px] border border-white/70 bg-white p-5 shadow-[0_32px_90px_-34px_rgba(0,0,0,0.75)] sm:p-7">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-[-0.025em] text-foreground">
                Selamat datang kembali
              </h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Masuk menggunakan akun ERP yang telah disetujui.
              </p>
            </div>
            <div className="rounded-xl bg-primary/9 p-2.5 text-primary">
              <Lock className="size-4" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-medium text-foreground"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 text-sm"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-medium text-foreground"
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
                  className="h-11 pr-11 text-sm"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
              <div className="space-y-0.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700" role="alert">
                <p className="font-semibold">Gagal Masuk</p>
                <p className="text-red-600">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="mt-2 h-11 w-full text-sm font-semibold"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {loading ? "Memverifikasi..." : "Masuk Sistem"}
            </Button>
          </form>

          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            Sesi akun dilindungi melalui autentikasi terenkripsi.
          </p>

          <div className="border-t border-border pt-4 text-center text-xs text-muted-foreground">
            Belum memiliki akun?{" "}
            <a href="/register" className="font-semibold text-primary hover:underline">
              Daftar Akun Baru
            </a>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-sidebar-foreground/70">
          © 2026 Sultan Seafood. Semua hak dilindungi.
        </p>
      </div>
    </main>
  );
}
