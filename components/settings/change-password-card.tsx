"use client";

import { useState } from "react";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updatePasswordAction } from "@/lib/actions/auth";

export function ChangePasswordCard() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!newPassword || newPassword.length < 6) {
      setError("Password baru minimal harus 6 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak cocok dengan password baru.");
      return;
    }

    setLoading(true);
    const res = await updatePasswordAction(newPassword);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSuccessMsg(res.message || "Password berhasil diperbarui.");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-4">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <div className="p-2 bg-amber-50 rounded-xl text-amber-700 border border-amber-200">
          <Lock className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Ubah Password Akun</h3>
          <p className="text-xs text-muted-foreground">
            Perbarui kata sandi untuk akun Supabase Auth Anda
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md pt-1">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Password Baru <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Minimal 6 karakter..."
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-9 text-xs pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Konfirmasi Password Baru <span className="text-red-500">*</span>
          </label>
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Ulangi password baru..."
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-9 text-xs"
            required
          />
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">
            {error}
          </p>
        )}

        {successMsg && (
          <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {successMsg}
          </p>
        )}

        <Button type="submit" size="sm" className="h-9 px-4 text-xs font-semibold" disabled={loading}>
          {loading && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
          Simpan Password Baru
        </Button>
      </form>
    </div>
  );
}
