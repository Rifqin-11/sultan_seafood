"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle2, KeyRound } from "lucide-react";
import { ChangePasswordDialog } from "./change-password-dialog";

interface UserProfileCardProps {
  userEmail: string;
  userRole: string;
}

export function UserProfileCard({
  userEmail,
  userRole,
}: UserProfileCardProps) {
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);

  return (
    <>
      <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg shrink-0">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {userEmail.split("@")[0]}
              </h3>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold px-2.5 py-1"
            >
              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
              Aktif
            </Badge>
            <Badge className="bg-slate-900 text-white text-xs px-2.5 py-1">
              {userRole}
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpenPasswordDialog(true)}
              className="ml-auto sm:ml-2 h-10 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200 gap-1.5 transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-600" />
              Ubah Password
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
              Email Utama
            </p>
            <p className="text-sm font-semibold text-slate-900">{userEmail}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
              Role & Otoritas
            </p>
            <p className="text-sm font-semibold text-slate-900">{userRole}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
              Metode Keamanan
            </p>
            <p className="text-sm font-semibold text-blue-700 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              Supabase Auth Session
            </p>
          </div>
        </div>
      </div>

      <ChangePasswordDialog
        open={openPasswordDialog}
        onOpenChange={setOpenPasswordDialog}
      />
    </>
  );
}
