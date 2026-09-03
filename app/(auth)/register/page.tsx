"use client";

import { useState } from "react";
import Image from "next/image";
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
    <main
      id="main-content"
      className="flex min-h-[100dvh] items-center justify-center bg-[#edf0ef] p-3 sm:p-5 lg:h-[100dvh] lg:overflow-hidden lg:p-7"
    >
      <div className="mx-auto grid min-h-[calc(100dvh-1.5rem)] w-full max-w-[1080px] overflow-hidden rounded-[26px] border border-white/80 bg-white p-2 shadow-[0_24px_80px_-40px_rgba(23,48,53,0.42)] sm:min-h-[calc(100dvh-2.5rem)] sm:p-3 lg:h-[min(720px,calc(100dvh-3.5rem))] lg:min-h-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
        <section className="relative hidden min-h-0 overflow-hidden rounded-[20px] bg-[#225568] lg:block" aria-label="Sultan Seafood">
          <Image
            src="/sultan-seafood-login.jpg"
            alt="Nelayan memegang ikan segar di atas laut"
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,45,56,0.3)_0%,rgba(10,45,56,0.02)_42%,rgba(10,45,56,0.78)_100%)]" />
          <div className="relative flex h-full min-h-0 flex-col justify-between p-7 text-white xl:p-9">
            <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl border border-white/25 bg-white/15 backdrop-blur-sm"><Fish className="size-5" /></span><div><p className="text-sm font-semibold tracking-[-0.02em]">Sultan Seafood</p><p className="text-[10px] uppercase tracking-[0.18em] text-white/65">Workspace operasional</p></div></div>
            <div className="max-w-md"><p className="mb-3 text-xs font-medium text-white/75">Ruang kerja untuk tim</p><h2 className="max-w-[11ch] text-4xl font-semibold leading-[0.98] tracking-[-0.06em] xl:text-5xl">Mulai kelola seafood dengan rapi.</h2><p className="mt-4 max-w-sm text-sm leading-6 text-white/75">Buat akun untuk mencatat muatan, invoice, pembayaran, dan aktivitas Sultan Seafood.</p></div>
            <div className="flex items-end justify-between gap-4 text-xs text-white/65"><span>Designed &amp; Developed by <a href="https://github.com/Rifqin-11" target="_blank" rel="noreferrer" className="font-semibold text-white underline decoration-white/40 underline-offset-4 transition-colors hover:text-white hover:decoration-white">Rifqin11</a></span><UserPlus className="size-4" /></div>
          </div>
        </section>

        <section className="flex min-h-0 flex-col justify-center px-5 py-6 sm:px-9 lg:px-11 xl:px-14" aria-labelledby="register-title">
          <div className="mx-auto w-full max-w-[370px]">
            <div className="mb-5 flex items-center gap-3 lg:hidden"><span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Fish className="size-5" /></span><div><p className="text-sm font-semibold">Sultan Seafood</p><p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Workspace operasional</p></div></div>
            <div className="mb-4"><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Akses workspace</p><h1 id="register-title" className="text-3xl font-semibold tracking-[-0.055em] text-foreground">Buat akun Sultan Seafood</h1><p className="mt-1.5 text-sm leading-5 text-muted-foreground">Isi formulir untuk mengajukan akun pengguna baru.</p></div>

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

            <div className="mt-4 border-t border-border pt-3 text-center text-xs text-muted-foreground">Sudah memiliki akun? <Link href="/login" className="font-semibold text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">Masuk di sini</Link></div>
            <p className="mt-4 text-center text-[10px] text-muted-foreground">© 2026 Sultan Seafood. Semua hak dilindungi.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
