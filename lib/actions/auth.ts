"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signInAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email dan password wajib diisi." };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // If Supabase env is not configured yet
  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    return { error: "Supabase Environment belum dikonfigurasi di server." };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        return { error: "Email atau password yang Anda masukkan salah." };
      }
      return { error: error.message };
    }

    if (!data.user) {
      return { error: "Pengguna tidak ditemukan." };
    }

    return { success: true };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { error: e.message || "Gagal verifikasi login Supabase." };
  }
}

export async function signOutAction() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (supabaseUrl && !supabaseUrl.includes("placeholder")) {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
  }

  redirect("/login");
}

export async function getCurrentUserAction() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    return { email: "owner@sultansf.id", role: "Owner" };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    return {
      id: user.id,
      email: user.email || "user@sultansf.id",
      role: (user.user_metadata?.role as string) || "User",
    };
  } catch {
    return null;
  }
}

export async function updatePasswordAction(newPassword: string) {
  if (!newPassword || newPassword.length < 6) {
    return { error: "Password minimal harus 6 karakter." };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    return { success: true, message: "Password berhasil diperbarui (Demo Mode)." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { error: error.message };
    }

    return { success: true, message: "Password akun Supabase Auth berhasil diperbarui." };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { error: e.message || "Gagal memperbarui password." };
  }
}
