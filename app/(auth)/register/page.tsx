"use client";

import { useState } from "react";
import { Fish, Eye, EyeOff, Loader2, UserPlus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { signUpAction } from "@/lib/actions/auth";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!fullName || !email || !password || !confirmPassword) {
      setError("Semua kolom wajib diisi.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak cocok dengan password.");
      return;
    }

    if (password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("fullName", fullName);
    formData.append("email", email);
    formData.append("password", password);
    formData.append("confirmPassword", confirmPassword);

    const res = await signUpAction(formData);
    setLoading(false);

    if (res?.error) {
      const errStr = res.error ? String(res.error) : "";
      if (!errStr || errStr === "{}" || errStr === "[object Object]") {
        setError("Gagal mendaftar. Email mungkin sudah terdaftar atau terjadi kendala server.");
      } else {
        setError(errStr);
      }
    } else if (res?.success) {
      setSuccessMessage(
        res.message ||
          "Pendaftaran berhasil! Akun Anda sedang menunggu persetujuan (ACC) dari Owner sebelum dapat masuk."
      );
    }
  };

  return (
    <main id="main-content" className="flex min-h-[100dvh] items-center justify-center bg-sidebar px-4 py-8 sm:px-6">
      <div className="w-full max-w-md">
        {/* Header Logo */}
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-2xl border border-white/15 bg-white shadow-lg">
            <Fish className="size-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Sultan Seafood</h1>
          <p className="mt-1 text-xs text-sidebar-foreground">Pendaftaran akun ERP</p>
        </div>

        {/* Card Form */}
        <div className="space-y-5 rounded-[24px] border border-white/70 bg-white p-5 shadow-[0_32px_90px_-34px_rgba(0,0,0,0.75)] sm:p-7">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-[-0.025em] text-foreground">
                Daftar Akun Baru
              </h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Isi formulir untuk mengajukan akun pengguna baru.
              </p>
            </div>
            <div className="rounded-xl bg-primary/9 p-2.5 text-primary">
              <UserPlus className="size-4" />
            </div>
          </div>

          {successMessage ? (
            <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-800">
                <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                <span>Menunggu Persetujuan (ACC) Owner</span>
              </div>
              <p className="text-xs leading-relaxed text-amber-700">
                {successMessage}
              </p>
              <div className="border-t border-amber-200 pt-3">
                <Link
                  href="/login"
                  className="inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-primary/90"
                >
                  Kembali ke Halaman Login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label
                  htmlFor="fullName"
                  className="mb-1.5 block text-xs font-medium text-foreground"
                >
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Contoh: Budi Santoso"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-10 text-sm"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-xs font-medium text-foreground"
                >
                  Email <span className="text-red-500">*</span>
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="budi@sultansf.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 text-sm"
                  autoComplete="email"
                  required
                />
              </div>

              <p className="rounded-lg bg-muted/60 p-2.5 text-[11px] leading-5 text-muted-foreground">Akun baru didaftarkan sebagai Staff. Owner dapat menetapkan peran lain saat menyetujui akun.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="password"
                    className="mb-1.5 block text-xs font-medium text-foreground"
                  >
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-10 pr-10 text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-1.5 block text-xs font-medium text-foreground"
                  >
                    Konfirmasi <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-10 text-sm"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="space-y-0.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700" role="alert">
                  <p className="font-semibold">Pendaftaran Gagal</p>
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
                {loading ? "Mengirim Pendaftaran..." : "Daftar Akun"}
              </Button>
            </form>
          )}

          <div className="border-t border-border pt-4 text-center text-xs text-muted-foreground">
            Sudah memiliki akun?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Masuk di sini
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-sidebar-foreground/70">
          © 2026 Sultan Seafood. Semua hak dilindungi.
        </p>
      </div>
    </main>
  );
}
