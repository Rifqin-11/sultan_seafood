"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeActionError, requireApprovedUser, requireRole } from "@/lib/security/auth";
import { defaultCompanyProfile, type CompanyProfile } from "@/lib/company-store";

export async function getCompanyProfileAction(): Promise<CompanyProfile> {
  await requireApprovedUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("company_profile").select("name,address,phone,email,website,npwp,bank_name,bank_account,bank_holder,logo_url").limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return defaultCompanyProfile;
  return {
    name: data.name,
    address: data.address ?? "",
    phone: data.phone ?? "",
    email: data.email ?? "",
    website: data.website ?? "",
    npwp: data.npwp ?? "",
    bankName: data.bank_name,
    bankAccount: data.bank_account,
    bankHolder: data.bank_holder,
    logoUrl: data.logo_url ?? undefined,
  };
}

export async function updateCompanyProfileAction(payload: CompanyProfile) {
  try {
    await requireRole(["OWNER"]);
    if (!payload.name.trim() || !payload.bankName.trim() || !payload.bankAccount.trim() || !payload.bankHolder.trim()) {
      return { error: "Nama bisnis dan informasi rekening wajib diisi." };
    }
    if (payload.logoUrl?.startsWith("data:")) return { error: "Logo harus diunggah ke Storage, bukan disimpan sebagai Base64." };
    const supabase = await createClient();
    const { error } = await supabase.rpc("update_company_profile", { p_payload: payload });
    if (error) throw error;
    revalidatePath("/settings/company");
    revalidatePath("/invoices");
    return { success: true, message: "Profil bisnis berhasil diperbarui." };
  } catch (error) {
    return { error: normalizeActionError(error, "Gagal menyimpan profil bisnis.") };
  }
}
