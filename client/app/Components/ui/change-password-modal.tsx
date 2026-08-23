"use client";

import React, { useState } from "react";
import {
  LuKeyRound,
  LuLock,
  LuEye,
  LuEyeOff,
  LuTriangleAlert,
  LuBuilding,
  LuMessageSquare,
  LuCheck,
  LuX,
  LuLoader,
  LuCamera,
  LuFileText,
} from "react-icons/lu";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { createClient } from "@/utils/supabase/client";
import { encryptPassword } from "@/lib/encryption";
import { toast } from "sonner";

interface ChangePasswordModalProps {
  isOpen: boolean;
  userId: string;
  isForced?: boolean;
  title?: string;
  description?: string;
  onSuccess: () => void;
  onClose?: () => void;
}

export function ChangePasswordModal({
  isOpen,
  userId,
  isForced = false,
  title = "Change Your Password",
  description = "Please create a new, secure password for your student portal account.",
  onSuccess,
  onClose,
}: ChangePasswordModalProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const isMinLength = newPassword.length >= 6;
  const isMatching = newPassword !== "" && newPassword === confirmPassword;
  const isValid = isMinLength && isMatching;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isMinLength) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    if (!isMatching) {
      toast.error("Passwords do not match.");
      return;
    }

    if (!userId) {
      toast.error("User account ID is missing.");
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();

    try {
      const encSecret = encryptPassword(newPassword.trim());

      // 1. Try updating with AES-256 encrypted password field
      let updateSuccess = false;
      const { error: directError } = await supabase
        .from("accounts")
        .update({
          password: newPassword.trim(),
          encrypted_password: encSecret,
          must_change_password: false,
        })
        .eq("user_id", userId);

      if (!directError) {
        updateSuccess = true;
      } else {
        // Fallback without encrypted_password column if column not yet added to Supabase schema
        const { error: fallbackError } = await supabase
          .from("accounts")
          .update({
            password: newPassword.trim(),
            must_change_password: false,
          })
          .eq("user_id", userId);

        if (!fallbackError) {
          updateSuccess = true;
        } else {
          // 2. Try RPC function fallback
          const { data: rpcData, error: rpcError } = await supabase.rpc(
            "change_student_password",
            {
              p_user_id: userId,
              p_new_password: newPassword.trim(),
            }
          );
          if (!rpcError && rpcData) {
            updateSuccess = true;
          } else {
            throw fallbackError || rpcError;
          }
        }
      }

      if (updateSuccess) {
        // Update localStorage session if present
        try {
          const storedUser = localStorage.getItem("acetrack_user");
          if (storedUser) {
            const parsed = JSON.parse(storedUser);
            parsed.must_change_password = false;
            localStorage.setItem("acetrack_user", JSON.stringify(parsed));
          }
        } catch (e) {
          console.error("Failed to update localStorage session:", e);
        }

        toast.success("Password updated successfully!");
        setNewPassword("");
        setConfirmPassword("");
        onSuccess();
      }
    } catch (err: any) {
      console.error("Password update failed:", err);
      toast.error(err.message || "Failed to update password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl sm:rounded-[2.5rem] shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-orange-50/80 via-amber-50/50 to-white shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="size-11 sm:size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0 shadow-xs">
              <LuKeyRound className="size-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
                {title}
              </h3>
              <p className="text-[11px] sm:text-xs font-semibold text-slate-400 mt-0.5">
                {description}
              </p>
            </div>
          </div>
          {!isForced && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              title="Close"
            >
              <LuX className="size-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-5">
          {/* Prominent Warning Callout Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/95 border border-amber-200/90 text-amber-950 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-amber-800">
              <LuTriangleAlert className="size-5 text-amber-600 shrink-0" />
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider">
                Important Security Notice
              </h4>
            </div>

            {/* Screenshot / Note Reminder Box */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-white/80 border border-amber-300/80 flex items-start gap-3 shadow-xs">
              <div className="flex items-center gap-1 p-1.5 rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                <LuCamera className="size-4" />
                <LuFileText className="size-4" />
              </div>
              <div>
                <p className="text-xs sm:text-xs font-black text-amber-950 leading-snug">
                  Please take a screenshot of this page or save your new password in your notes!
                </p>
                <p className="text-[11px] sm:text-xs text-amber-800 font-medium mt-0.5 leading-relaxed">
                  Make sure you have saved your password before clicking update so you don&apos;t get locked out.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-amber-200/70 flex flex-col gap-2 text-[11px] sm:text-xs text-amber-900 font-medium">
              <div className="flex items-start gap-2">
                <LuBuilding className="size-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  <strong className="font-bold text-amber-950">If you forget your password:</strong> You can come to the <span className="underline decoration-amber-400 font-semibold">Organization Office</span> in person with your Student ID.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <LuMessageSquare className="size-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Or send a private message to our <span className="underline decoration-amber-400 font-semibold">Official Facebook / Organization Page</span> to ask for your credentials.
                </span>
              </div>
            </div>
          </div>

          {/* Form */}
          <form id="change-password-form" onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div className="space-y-1.5">
              <Label
                htmlFor="new-password"
                className="text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                New Password
              </Label>
              <div className="relative">
                <LuLock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 bg-slate-50 border-slate-200 rounded-xl text-sm focus:bg-white transition-all font-medium"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showNewPassword ? <LuEyeOff className="size-4" /> : <LuEye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <Label
                htmlFor="confirm-password"
                className="text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Confirm New Password
              </Label>
              <div className="relative">
                <LuLock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-type new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 bg-slate-50 border-slate-200 rounded-xl text-sm focus:bg-white transition-all font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <LuEyeOff className="size-4" /> : <LuEye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Validation Checklist */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <div
                  className={`size-4 rounded-full flex items-center justify-center text-[10px] ${
                    isMinLength
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-200 text-slate-400"
                  }`}
                >
                  <LuCheck className="size-2.5" />
                </div>
                <span className={isMinLength ? "text-emerald-700 font-semibold" : "text-slate-500 font-medium"}>
                  At least 6 characters
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`size-4 rounded-full flex items-center justify-center text-[10px] ${
                    isMatching
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-200 text-slate-400"
                  }`}
                >
                  <LuCheck className="size-2.5" />
                </div>
                <span className={isMatching ? "text-emerald-700 font-semibold" : "text-slate-500 font-medium"}>
                  Passwords match
                </span>
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center gap-2.5 sm:gap-3 shrink-0">
          {!isForced && onClose && (
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={onClose}
              className="w-full sm:flex-1 h-12 rounded-xl text-xs sm:text-sm font-bold text-slate-600 border-slate-200 cursor-pointer hover:bg-slate-100"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            form="change-password-form"
            disabled={!isValid || isSubmitting}
            className="w-full sm:flex-1 h-12 rounded-xl text-xs sm:text-sm font-black bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <LuLoader className="size-4 animate-spin" />
                <span>Updating Password...</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <LuCheck className="size-4" />
                <span>{isForced ? "Save & Enter Portal" : "Update Password"}</span>
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
