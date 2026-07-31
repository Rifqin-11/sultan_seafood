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
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-3 shadow-lg">
            <Fish className="w-6 h-6 text-[#121212]" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Sultan Seafood</h1>
          <p className="text-xs text-neutral-400 mt-0.5">Pendaftaran Akun Pengguna ERP</p>
        </div>

        {/* Card Form */}
        <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-2xl p-6 shadow-2xl space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">
                Daftar Akun Baru
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Isi formulir untuk mengajukan akun pengguna baru.
              </p>
            </div>
            <div className="p-2 bg-[#262626] rounded-lg text-neutral-400">
              <UserPlus className="w-4 h-4" />
            </div>
          </div>

          {successMessage ? (
            <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-5 space-y-3 text-amber-200">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-300">
                <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                <span>Menunggu Persetujuan (ACC) Owner</span>
              </div>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                {successMessage}
              </p>
              <div className="pt-2 border-t border-amber-900/60">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center w-full py-2 bg-amber-400 text-slate-950 hover:bg-amber-300 font-bold text-xs rounded-lg transition-colors"
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
                  className="block text-xs font-medium text-neutral-300 mb-1"
                >
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Contoh: Budi Santoso"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-9 bg-[#242424] border-[#333] text-white placeholder:text-neutral-600 focus-visible:ring-white/20 text-xs"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-medium text-neutral-300 mb-1"
                >
                  Email <span className="text-red-500">*</span>
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="budi@sultansf.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 bg-[#242424] border-[#333] text-white placeholder:text-neutral-600 focus-visible:ring-white/20 text-xs"
                  autoComplete="email"
                  required
                />
              </div>

              <p className="text-[11px] text-neutral-500">Akun baru didaftarkan sebagai Staff. Owner dapat menetapkan peran lain saat menyetujui akun.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs font-medium text-neutral-300 mb-1"
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
                      className="h-9 bg-[#242424] border-[#333] text-white placeholder:text-neutral-600 focus-visible:ring-white/20 pr-8 text-xs"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
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
                    className="block text-xs font-medium text-neutral-300 mb-1"
                  >
                    Konfirmasi <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-9 bg-[#242424] border-[#333] text-white placeholder:text-neutral-600 focus-visible:ring-white/20 text-xs"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="text-xs text-red-400 bg-red-950/40 border border-red-900/60 rounded-lg p-3 space-y-0.5">
                  <p className="font-semibold">Pendaftaran Gagal</p>
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
                {loading ? "Mengirim Pendaftaran..." : "Daftar Akun"}
              </Button>
            </form>
          )}

          <div className="pt-2 border-t border-[#262626] text-center text-xs text-neutral-400">
            Sudah memiliki akun?{" "}
            <Link href="/login" className="text-white font-medium hover:underline">
              Masuk di sini
            </Link>
          </div>
        </div>

        <p className="text-xs text-neutral-600 text-center mt-6">
          © 2026 Sultan Seafood. Semua hak dilindungi.
        </p>
      </div>
    </div>
  );
}
