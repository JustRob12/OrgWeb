"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  LuUser,
  LuMail,
  LuGraduationCap,
  LuHash,
  LuBookOpen,
  LuMilestone,
  LuShieldCheck,
  LuLoader,
  LuCamera,
  LuLock,
  LuInfo,
  LuSmartphone,
  LuDownload,
  LuShare,
  LuSquarePlus,
  LuCheck,
  LuX,
  LuSparkles,
  LuKeyRound,
} from "react-icons/lu";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { ImageCropperModal } from "@/app/Components/ui/image-cropper-modal";
import { ChangePasswordModal } from "@/app/Components/ui/change-password-modal";
import { Button } from "@/app/Components/ui/button";

export default function StudentProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // PWA Installation State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    fetchProfile();

    // Check if app is already running in standalone mode (installed PWA)
    if (typeof window !== "undefined") {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);

      // Detect iOS device
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(isIosDevice);

      // Listen for Android/Chrome beforeinstallprompt
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      };
    }
  }, []);

  const handleInstallPwa = async () => {
    if (isStandalone) {
      toast.success("ACETRACK is already installed on your device!");
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        toast.success("Thank you for installing ACETRACK!");
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      setShowIOSModal(true);
    }
  };

  const fetchProfile = async () => {
    setLoading(true);
    let userEmail = "";

    // 1. Try Supabase Auth
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (authUser?.email) {
      userEmail = authUser.email;
    } else {
      // 2. Try localStorage Fallback
      const stored = localStorage.getItem("acetrack_user");
      if (stored) {
        try {
          userEmail = JSON.parse(stored).email;
        } catch (e) {
          console.error("Session parse error:", e);
        }
      }
    }

    if (userEmail) {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", userEmail)
        .single();

      if (!error && data) {
        setUser(data);
      }
    }
    setLoading(false);
  };

  // 1. Photo Selected -> Open Image Cropper
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File exceeds 5MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 2. Crop Confirmed -> Upload to Cloudinary & Delete Old Image
  const handleCropComplete = async (croppedBlob: Blob) => {
    setUploading(true);
    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        throw new Error("Cloudinary configuration is missing.");
      }

      const fd = new FormData();
      fd.append("file", croppedBlob, "profile.jpg");
      fd.append("upload_preset", uploadPreset || "ml_default");

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok || !data.secure_url) throw new Error(data.error?.message || "Upload failed");

      // Delete old photo if exists to prevent orphans
      if (user?.profile_picture?.includes("cloudinary.com")) {
        try {
          const parts = user.profile_picture.split("/upload/");
          if (parts.length === 2) {
            let publicId = parts[1];
            if (publicId.match(/^v\d+\//)) publicId = publicId.replace(/^v\d+\//, "");
            const dotIndex = publicId.lastIndexOf(".");
            if (dotIndex !== -1) publicId = publicId.substring(0, dotIndex);

            await fetch("/api/cloudinary/delete", {
              method: "POST",
              body: JSON.stringify({ public_id: publicId, resource_type: "image" }),
              headers: { "Content-Type": "application/json" },
            });
          }
        } catch (e) {
          console.error("Failed to cleanup old profile picture:", e);
        }
      }

      // Update Supabase
      const { error } = await supabase
        .from("users")
        .update({ profile_picture: data.secure_url })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profile photo cropped and updated!");
      setShowCropper(false);
      setCropImageSrc(null);
      fetchProfile();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <LuLoader className="size-10 text-primary animate-spin" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Profile...</p>
      </div>
    );
  }

  const fullName = `${user?.first_name || ""} ${user?.middle_initial ? user.middle_initial + " " : ""}${user?.last_name || ""}`.trim();

  return (
    <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8 pb-12">
      {/* Hidden File Input */}
      <input type="file" ref={fileInputRef} onChange={handlePhotoSelect} accept="image/*" className="hidden" />

      {/* Image Cropper Modal */}
      <ImageCropperModal
        isOpen={showCropper}
        imageSrc={cropImageSrc}
        onClose={() => {
          setShowCropper(false);
          setCropImageSrc(null);
        }}
        onCropComplete={handleCropComplete}
        isUploading={uploading}
      />

      {/* Header Avatar & Name */}
      <div className="text-center space-y-4">
        <div className="relative inline-block group/avatar">
          <div className="size-28 sm:size-32 rounded-full bg-slate-100 border-4 border-white shadow-lg mx-auto overflow-hidden flex items-center justify-center text-slate-300">
            {user?.profile_picture ? (
              <img src={user.profile_picture} alt="Profile" className="size-full object-cover" />
            ) : (
              <LuUser className="size-16" />
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 p-2.5 bg-primary hover:bg-primary/95 text-white rounded-full border-4 border-white shadow-xl hover:scale-110 active:scale-95 transition-all cursor-pointer"
            title="Upload and crop photo"
          >
            {uploading ? <LuLoader className="size-4 animate-spin" /> : <LuCamera className="size-4" />}
          </button>
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{fullName || "Student Member"}</h1>
          <p className="text-slate-500 font-medium text-xs sm:text-sm mt-1">
            {user?.course ? `${user.course} ` : ""}
            {user?.section ? `• Section ${user.section} ` : ""}
            {user?.year ? `• Year ${user.year}` : ""}
          </p>
        </div>
      </div>

      {/* PWA Mobile App Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-white border border-orange-200/80 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="size-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/25 shrink-0">
              <LuSmartphone className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 tracking-tight">ACETRACK Mobile App</h3>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider">
                  PWA
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                {isStandalone
                  ? "App is installed and running in fullscreen standalone mode."
                  : "Install ACETRACK on your phone for fast QR scanning and instant access."}
              </p>
            </div>
          </div>

          {isStandalone ? (
            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black shrink-0">
              <LuCheck className="size-4 text-emerald-600" />
              <span>Installed</span>
            </div>
          ) : (
            <Button
              onClick={handleInstallPwa}
              className="w-full sm:w-auto h-11 px-5 rounded-2xl font-black text-xs uppercase tracking-wider bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/20 shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition-all"
            >
              <LuDownload className="size-4 mr-2" />
              Add to Mobile App
            </Button>
          )}
        </div>
      </div>

      {/* Verified Information Card (Read-Only) */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm transition-all">
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LuShieldCheck className="size-5 text-emerald-500" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">
              Verified Student Details
            </h2>
          </div>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-[10px] font-black uppercase text-emerald-700 border border-emerald-200/60 tracking-wider">
            <LuShieldCheck className="size-3 text-emerald-600" />
            Official Record
          </span>
        </div>

        {/* Read-Only Details List */}
        <div className="divide-y divide-slate-100">
          <ProfileItem icon={LuUser} label="Full Name" value={fullName || "Not set"} />
          <ProfileItem icon={LuHash} label="Student ID" value={user?.student_id || "Not set"} isLocked />
          <ProfileItem icon={LuMail} label="Email Address" value={user?.email || "Not set"} isLocked />
          <ProfileItem icon={LuGraduationCap} label="Course" value={user?.course || "Not set"} isLocked />
          <ProfileItem icon={LuBookOpen} label="Section" value={user?.section ? `Section ${user.section}` : "Not set"} isLocked />
          <ProfileItem icon={LuMilestone} label="Year Level" value={user?.year ? `Year ${user.year}` : "Not set"} isLocked />
        </div>
      </div>

      {/* Account Security & Password Card */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="size-12 rounded-2xl bg-orange-50 border border-orange-100 text-primary flex items-center justify-center shadow-xs shrink-0">
            <LuKeyRound className="size-6 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Portal Account Password
            </h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Keep your account secure by maintaining a strong, confidential password.
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowPasswordModal(true)}
          variant="outline"
          className="w-full sm:w-auto h-11 px-5 rounded-2xl font-bold text-xs border-slate-200 hover:bg-slate-50 hover:text-primary text-slate-700 shadow-xs shrink-0 cursor-pointer"
        >
          <LuLock className="size-4 mr-2" />
          Change Password
        </Button>
      </div>

      {/* Notice Banner */}
      <div className="bg-blue-50/80 rounded-2xl border border-blue-200/60 p-5 sm:p-6 flex items-start gap-4 shadow-sm">
        <div className="p-2.5 bg-blue-100/80 rounded-xl text-blue-700 shrink-0">
          <LuInfo className="size-5" />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest">
            Administrator Managed Profile
          </p>
          <p className="text-xs text-blue-800 font-medium leading-relaxed">
            Your official student record (Name, Student ID, Email, Course, Section, and Year) is maintained by the organization administrators. If you need any corrections to your details, please contact an organization officer or administrator.
          </p>
        </div>
      </div>

      {/* iOS / Mobile Installation Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                  <LuSmartphone className="size-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    Add to Mobile Home Screen
                  </h3>
                  <p className="text-xs font-bold text-slate-400">Install ACETRACK on iOS & Android</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                <LuX className="size-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="size-6 rounded-full bg-primary/10 text-primary font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-bold text-slate-800">Tap the Share Button</p>
                  <p className="text-slate-500 mt-0.5 flex items-center gap-1.5">
                    In Safari or Chrome, tap the <LuShare className="size-3.5 text-primary inline" /> Share button in the browser toolbar.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="size-6 rounded-full bg-primary/10 text-primary font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-bold text-slate-800">Select &quot;Add to Home Screen&quot;</p>
                  <p className="text-slate-500 mt-0.5 flex items-center gap-1.5">
                    Scroll down in the share menu and tap <LuSquarePlus className="size-3.5 text-primary inline" /> <span className="font-semibold text-slate-700">&quot;Add to Home Screen&quot;</span>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="size-6 rounded-full bg-primary/10 text-primary font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-bold text-slate-800">Confirm & Enjoy Fullscreen</p>
                  <p className="text-slate-500 mt-0.5">
                    Tap <span className="font-semibold text-slate-700">&quot;Add&quot;</span> at top right. ACETRACK will now appear on your home screen like a native mobile app!
                  </p>
                </div>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full h-12 rounded-2xl font-black bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/20 cursor-pointer"
            >
              Got it!
            </Button>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && user && (
        <ChangePasswordModal
          isOpen={showPasswordModal}
          userId={user.id}
          isForced={false}
          title="Change Your Password"
          description="Update your portal password anytime."
          onSuccess={() => setShowPasswordModal(false)}
          onClose={() => setShowPasswordModal(false)}
        />
      )}
    </div>
  );
}

function ProfileItem({
  icon: Icon,
  label,
  value,
  isLocked = false,
}: {
  icon: any;
  label: string;
  value: string;
  isLocked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-5 px-6 hover:bg-slate-50/50 transition-colors">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-slate-100 rounded-2xl text-slate-500">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
          <p className="text-sm font-bold text-slate-800">{value}</p>
        </div>
      </div>
      {isLocked && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-[10px] font-black uppercase text-slate-400 border border-slate-200/60 tracking-wider">
          <LuLock className="size-3 text-slate-400" />
          Locked
        </span>
      )}
    </div>
  );
}
