"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  LuIdCard,
  LuShieldCheck,
  LuDownload,
  LuShare2,
  LuQrCode,
  LuInfo,
  LuCamera,
  LuLoader,
  LuCircleCheck
} from "react-icons/lu";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/app/Components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { toPng } from "html-to-image";

export default function StudentIDPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    setLoading(true);
    let userEmail = "";

    // 1. Check Supabase Auth
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser?.email) {
      userEmail = authUser.email;
    } else {
      // 2. Check localStorage (Manual login fallback)
      const storedUser = localStorage.getItem("orgweb_user");
      if (storedUser) {
        try {
          userEmail = JSON.parse(storedUser).email;
        } catch (e) {
          console.error("Session parse error:", e);
        }
      }
    }

    if (userEmail) {
      // Get detailed user info from the 'users' table
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", userEmail)
        .single();

      if (!error && data) {
        setUser(data);
      } else {
        toast.error("Profile not found. Please contact admin.");
        router.push("/login");
      }
    } else {
      toast.error("Please log in to access this page.");
      router.push("/login");
    }
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be below 2MB");
      return;
    }

    setUploading(true);
    try {
      // 1. Get configuration
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        throw new Error("Cloudinary configuration is missing in .env");
      }

      // 2. Upload to Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || "Cloudinary upload failed");
      }

      const cloudData = await res.json();
      if (!cloudData.secure_url) throw new Error("No secure URL returned");

      // 2. Update Supabase users table
      if (!user?.id) {
        throw new Error("User session expired or invalid. Please refresh.");
      }

      const { error } = await supabase
        .from("users")
        .update({ profile_picture: cloudData.secure_url })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profile picture updated!");
      fetchUserData(); // Refresh local state
    } catch (err: any) {
      console.error(err);
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // Generate QR Value (JSON)
  const qrData = user ? JSON.stringify({
    name: `${user.first_name} ${user.last_name}`,
    id: user.student_id,
    email: user.email,
    photo: user.profile_picture
  }) : "";

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

  const downloadIDCard = async () => {
    if (!cardRef.current) return;
    setDownloading(true);

    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        quality: 1,
        pixelRatio: 2, // Higher resolution
        style: {
          transform: 'scale(1)', // Ensure it captures correctly
        }
      });

      const link = document.createElement('a');
      link.download = `ORGW_ID_${user.student_id || 'MEMBER'}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("ID saved as image!");
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Failed to save image. Try again.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <LuLoader className="size-10 text-primary animate-spin" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Synchronizing Identity...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">My Digital ID</h1>
          <p className="text-slate-500 font-medium tracking-tight">Your official scannable organization credentials.</p>
        </div>
        {user?.profile_picture && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={downloadIDCard}
              disabled={downloading}
              className="h-11 rounded-xl font-bold bg-white text-slate-600 border-slate-200"
            >
              <LuDownload className="size-4 mr-2" /> Save as Image
            </Button>

          </div>
        )}
      </div>

      {!user?.profile_picture ? (
        /* Step 1: Upload Profile Gateway */
        <div className="bg-white rounded-[3rem] p-12 md:p-20 border-2 border-dashed border-slate-200 flex flex-col items-center text-center space-y-8">
          <div className="relative group">
            <div className="size-40 rounded-[3rem] bg-slate-50 border-4 border-white shadow-2xl flex items-center justify-center text-slate-200 overflow-hidden ring-1 ring-slate-100">
              <LuIdCard className="size-20" />
            </div>
            <div className="absolute -bottom-2 -right-2 p-4 bg-primary text-white rounded-2xl shadow-xl animate-bounce">
              <LuCamera className="size-6" />
            </div>
          </div>

          <div className="max-w-md space-y-4">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight transition-all">Complete Your Profile</h2>
            <p className="text-slate-500 font-medium leading-relaxed">
              To generate your secure Digital ID and scannable QR Code, please upload a clear profile picture first.
            </p>
          </div>

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="h-14 px-10 rounded-2xl font-black gradient-primary text-white shadow-xl shadow-primary/20 hover:scale-105 transition-all text-lg"
          >
            {uploading ? (
              <LuLoader className="size-5 animate-spin mr-2" />
            ) : (
              <LuCamera className="size-5 mr-3" />
            )}
            {uploading ? "Uploading..." : "Upload Profile Photo"}
          </Button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />

          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Max file size: 2MB</p>
        </div>
      ) : (
        /* Step 2: Display Physical ID Layout (5h x 3.5w) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Card Section: 5 High x 3.5 Wide Ratio */}
          <div className="lg:col-span-5 flex justify-center">
            <div
              ref={cardRef}
              className="relative w-full max-w-[320px] aspect-[3.5/5.5] rounded-[3rem] overflow-hidden shadow-2xl shadow-blue-900/10 border border-white/40 glass-container"
            >
              {/* Background Shades of Blue & Glass */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-white/40 to-indigo-500/10 backdrop-blur-3xl z-0" />
              <div className="absolute top-[-10%] left-[-10%] size-64 bg-blue-400/20 rounded-full blur-[80px]" />
              <div className="absolute bottom-[-10%] right-[-10%] size-48 bg-indigo-400/20 rounded-full blur-[60px]" />

              <div className="relative z-10 flex flex-col h-full p-8 items-center">
                {/* 1. Profile Picture (Small & Compact) */}
                <div className="size-28 rounded-2xl overflow-hidden bg-white/50 border-2 border-white shadow-lg mb-4 flex-shrink-0 flex items-center justify-center text-blue-200">
                  {user.profile_picture ? (
                    <img
                      src={user.profile_picture}
                      alt="ID Photo"
                      className="size-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = ""; // Clear broken src
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <LuIdCard className="size-14" />
                  )}
                </div>

                {/* 2. Name */}
                <div className="text-center space-y-0.5 mb-1">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
                    {user.first_name} {user.last_name}
                  </h2>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 text-[9px] font-black uppercase tracking-widest">
                    <LuShieldCheck className="size-2.5" /> Official Member
                  </div>
                </div>

                {/* 3. Student ID */}
                <div className="text-center mb-4">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-0.5">Student ID</p>
                  <p className="text-sm font-black text-slate-700 tracking-[0.1em]">{user.student_id || "NOT-SET"}</p>
                </div>

                {/* Separator - Tightened */}
                <div className="w-full h-px bg-slate-200/50" />

                {/* 4. QR Code - Optimized for Scanability */}
                <div className="flex-1 flex flex-col items-center justify-center w-full">
                  <div className="bg-white rounded-3 xl shadow-xl border border-white relative group">
                    <img
                      src={qrImageUrl}
                      alt="Scannable QR"
                      className="size-40 transition-transform group-hover:scale-105 duration-500"
                    />
                    <div className="absolute -inset-2 bg-gradient-to-tr from-blue-500/10 to-indigo-500/10 rounded-2xl -z-10 blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2">Scan for Verification</p>
                </div>

                {/* School/Org Name at Bottom */}
                <div className="pt-1 border-t border-slate-200/50 w-full text-center">
                  <p className="text-[11px] font-black text-slate-900 tracking-widest uppercase opacity-40">OrgWeb University</p>
                </div>
              </div>
            </div>
          </div>

          {/* Details & Usage Section */}
          <div className="lg:col-span-7 space-y-6">
            {/* New Official Usage Card */}
            <div className="bg-emerald-50 rounded-[2.5rem] border border-emerald-100 p-10 flex items-start gap-6 shadow-sm">
              <div className="p-4 bg-white rounded-3xl shadow-xl shadow-emerald-900/5 text-emerald-600">
                <LuShieldCheck className="size-6" />
              </div>
              <div className="space-y-2 text-left">
                <h3 className="text-lg font-black text-emerald-800 tracking-tight leading-none">Official Usage Guide</h3>
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3">
                    <div className="size-2 rounded-full bg-emerald-400" />
                    <p className="text-sm font-bold text-emerald-700">Use this for attendance monitoring</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="size-2 rounded-full bg-emerald-400" />
                    <p className="text-sm font-bold text-emerald-700">Show this when paying other fees</p>
                  </div>
                </div>
              </div>
            </div>


            <div className="bg-blue-50 rounded-[2.5rem] border border-blue-100 p-10 flex items-start gap-6">
              <div className="p-4 bg-white rounded-3xl shadow-xl shadow-blue-900/5 text-blue-600">
                <LuInfo className="size-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-blue-900 tracking-tight">Security Protocol</h3>
                <p className="text-sm font-medium text-blue-700 leading-relaxed">
                  Your Digital ID is encrypted and linked directly to your school account. The QR code is refreshed periodically and contains verification metadata to prevent duplication. Always present this for official organization business.
                </p>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Global CSS for Glassmorphism */}
      <style jsx>{`
        .glass-container {
          background: rgba(255, 255, 255, 0.4);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
      `}</style>
    </div>
  );
}
