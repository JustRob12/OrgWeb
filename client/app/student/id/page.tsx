"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  LuIdCard,
  LuShieldCheck,
  LuDownload,
  LuInfo,
  LuCamera,
  LuLoader,
  LuCrop,
  LuSparkles,
} from "react-icons/lu";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/app/Components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { toJpeg } from "html-to-image";
import { QRCodeSVG } from "qrcode.react";
import { ImageCropperModal } from "@/app/Components/ui/image-cropper-modal";

export default function StudentIDPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Cropper State
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);

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
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (authUser?.email) {
      userEmail = authUser.email;
    } else {
      // 2. Check localStorage (Manual login fallback)
      const storedUser = localStorage.getItem("acetrack_user");
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

  // 1. File Selected -> Open Image Cropper Modal
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be below 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);

    // Reset input so re-selecting same file triggers onChange
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 2. Crop Confirmed -> Upload to Cloudinary & Delete Old Image
  const handleCropComplete = async (croppedBlob: Blob) => {
    setUploading(true);

    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        throw new Error("Cloudinary configuration is missing in environment variables.");
      }

      // 1. Upload new cropped photo to Cloudinary
      const formData = new FormData();
      formData.append("file", croppedBlob, "profile.jpg");
      formData.append("upload_preset", uploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      const cloudData = await res.json();
      if (!res.ok || !cloudData.secure_url) {
        throw new Error(cloudData.error?.message || "Cloudinary upload failed");
      }

      // 2. Delete old photo on Cloudinary to prevent orphaned storage
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

      // 3. Update Supabase users table with new secure URL
      if (!user?.id) {
        throw new Error("User session expired or invalid. Please refresh.");
      }

      const { error } = await supabase
        .from("users")
        .update({ profile_picture: cloudData.secure_url })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profile photo cropped and updated successfully!");
      setShowCropper(false);
      setCropImageSrc(null);
      fetchUserData(); // Refresh ID card display
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // Generate QR Value (JSON)
  const qrData = user
    ? JSON.stringify({
        id: user.student_id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
      })
    : "";

  const downloadIDCard = async () => {
    if (!cardRef.current) return;
    setDownloading(true);

    try {
      const dataUrl = await toJpeg(cardRef.current, {
        cacheBust: true,
        quality: 0.95,
        pixelRatio: 3, // Ultra-high-res crisp quality
        backgroundColor: "#ffffff",
        style: {
          transform: "scale(1)",
        },
      });

      const link = document.createElement("a");
      link.download = `ACES_ID_${user.student_id || "MEMBER"}.jpg`;
      link.href = dataUrl;
      link.click();
      toast.success("ID saved as JPG image!");
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Failed to save JPG image. Try again.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <LuLoader className="size-10 text-primary animate-spin" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
          Synchronizing Identity...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight mb-1 sm:mb-2">
            My Digital ID
          </h1>
          <p className="text-sm sm:text-base text-slate-500 font-medium tracking-tight">
            Your official scannable organization credentials.
          </p>
        </div>
        {user?.profile_picture && (
          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2 sm:gap-2.5">
            <Button
              variant="outline"
              onClick={downloadIDCard}
              disabled={downloading}
              className="w-full sm:w-auto h-11 rounded-xl font-bold bg-white text-slate-700 border-slate-200 shadow-sm cursor-pointer justify-center hover:bg-orange-50 hover:text-primary hover:border-orange-300 transition-all"
            >
              {downloading ? (
                <LuLoader className="size-4 mr-2 animate-spin text-primary" />
              ) : (
                <LuDownload className="size-4 mr-2 text-primary" />
              )}
              {downloading ? "Saving JPG..." : "Save as JPG"}
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full sm:w-auto h-11 rounded-xl font-bold bg-white text-slate-700 border-slate-200 shadow-sm cursor-pointer justify-center hover:bg-slate-50 transition-all"
            >
              <LuCrop className="size-4 mr-2 text-primary" /> Change & Crop Photo
            </Button>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        className="hidden"
      />

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

      {!user?.profile_picture ? (
        /* Step 1: Upload & Crop Profile Gateway */
        <div className="bg-white rounded-3xl sm:rounded-[3rem] p-6 sm:p-12 md:p-20 border-2 border-dashed border-slate-200 flex flex-col items-center text-center space-y-6 sm:space-y-8 shadow-sm">
          <div className="relative group">
            <div className="size-32 sm:size-40 rounded-3xl sm:rounded-[3rem] bg-slate-50 border-4 border-white shadow-2xl flex items-center justify-center text-slate-200 overflow-hidden ring-1 ring-slate-100">
              <LuIdCard className="size-16 sm:size-20" />
            </div>
            <div className="absolute -bottom-2 -right-2 p-3 sm:p-4 bg-primary text-white rounded-2xl shadow-xl animate-bounce">
              <LuCamera className="size-5 sm:size-6" />
            </div>
          </div>

          <div className="max-w-md space-y-3 sm:space-y-4">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight transition-all">
              Upload Your Profile Photo
            </h2>
            <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed">
              Upload and crop your photo to generate your secure Digital ID and scannable QR Code for attendance.
            </p>
          </div>

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full sm:w-auto h-12 sm:h-14 px-8 sm:px-10 rounded-2xl font-black bg-primary hover:bg-primary/95 text-white shadow-xl shadow-primary/20 hover:scale-105 transition-all text-base sm:text-lg cursor-pointer"
          >
            {uploading ? (
              <LuLoader className="size-5 animate-spin mr-2" />
            ) : (
              <LuCamera className="size-5 mr-3" />
            )}
            {uploading ? "Uploading..." : "Upload & Crop Photo"}
          </Button>

          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            Select an image to crop and adjust
          </p>
        </div>
      ) : (
        /* Step 2: Display Physical ID Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Card Section */}
          <div className="lg:col-span-5 flex justify-center w-full">
            <div
              ref={cardRef}
              className="relative w-full max-w-[300px] xs:max-w-[320px] sm:max-w-[340px] aspect-[3.5/5.6] rounded-[2.5rem] sm:rounded-[3rem] overflow-hidden shadow-2xl shadow-orange-950/15 border-2 border-orange-200/90 flex flex-col justify-between bg-gradient-to-b from-orange-500 via-orange-400/20 to-white"
            >
              {/* Decorative Geometric Top & Bottom Curves */}
              <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-orange-500 to-orange-500/90 z-0" />
              <div className="absolute top-20 -left-10 -right-10 h-16 bg-white/30 rounded-[100%] blur-sm z-0" />
              <div className="absolute -bottom-10 -left-10 -right-10 h-28 bg-orange-500/5 rounded-[100%] blur-md z-0" />

              <div className="relative z-10 flex flex-col h-full p-5 sm:p-6 items-center justify-between">
                {/* Top: Header Pill + Profile Picture + Info */}
                <div className="flex flex-col items-center w-full">
                  {/* Top Org Badge */}
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 shadow-sm border border-white mb-3">
                    <span className="size-1.5 rounded-full bg-orange-500 animate-pulse" />
                    <p className="text-[9px] font-black text-orange-950 uppercase tracking-widest">
                      ACETRACK 3.0 • ACES
                    </p>
                  </div>

                  {/* 1. Square Profile Picture Frame */}
                  <div className="size-24 sm:size-28 rounded-2xl sm:rounded-3xl overflow-hidden bg-white border-3 border-white shadow-xl mb-2.5 shrink-0 flex items-center justify-center text-orange-300 ring-2 ring-orange-200/80">
                    {user.profile_picture ? (
                      <img
                        src={user.profile_picture}
                        alt="ID Photo"
                        className="size-full object-cover"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "";
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <LuIdCard className="size-12 sm:size-14" />
                    )}
                  </div>

                  {/* 2. Name */}
                  <div className="text-center space-y-0.5 mb-1 px-2 w-full">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight line-clamp-1">
                      {user.first_name} {user.last_name}
                    </h2>
                    <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/25 text-orange-600 text-[8px] sm:text-[9px] font-black uppercase tracking-widest">
                      <LuShieldCheck className="size-2.5" /> Official Member
                    </div>
                  </div>

                  {/* 3. Student ID Pill */}
                  <div className="text-center mt-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.25em] block mb-0.5">
                      Student ID
                    </span>
                    <span className="inline-block px-3 py-0.5 rounded-lg bg-white border border-slate-200/80 text-xs sm:text-sm font-black text-slate-800 tracking-[0.1em] shadow-xs">
                      {user.student_id || "NOT-SET"}
                    </span>
                  </div>
                </div>

                {/* Middle: QR Code with Subtle Container */}
                <div className="flex flex-col items-center justify-center w-full my-1 sm:my-2">
                  <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg border border-orange-200/90 p-2.5 flex items-center justify-center">
                    <QRCodeSVG
                      value={qrData}
                      size={110}
                      level="M"
                      includeMargin={false}
                      className="size-24 sm:size-28"
                    />
                  </div>
                  <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.25em] mt-2">
                    Scan for Attendance
                  </p>
                </div>

                {/* Bottom: Organization Footer */}
                <div className="pt-2 border-t border-slate-300/80 w-full text-center">
                  <p className="text-[9px] sm:text-[10px] font-black text-slate-800 tracking-widest uppercase">
                    ASSOCIATION OF COMPUTING AND ENGINEERING STUDENTS
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Details & Usage Section */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-6 w-full">
            <div className="bg-emerald-50 rounded-3xl sm:rounded-[2.5rem] border border-emerald-100 p-6 sm:p-8 lg:p-10 flex flex-col sm:flex-row items-start gap-4 sm:gap-6 shadow-sm">
              <div className="p-3.5 sm:p-4 bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-emerald-900/5 text-emerald-600 shrink-0">
                <LuShieldCheck className="size-6" />
              </div>
              <div className="space-y-2 text-left">
                <h3 className="text-base sm:text-lg font-black text-emerald-800 tracking-tight leading-none">
                  Official Usage Guide
                </h3>
                <div className="space-y-2.5 pt-1 sm:pt-2">
                  <div className="flex items-center gap-3">
                    <div className="size-2 rounded-full bg-emerald-400 shrink-0" />
                    <p className="text-xs sm:text-sm font-bold text-emerald-700">
                      Use this for attendance monitoring
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="size-2 rounded-full bg-emerald-400 shrink-0" />
                    <p className="text-xs sm:text-sm font-bold text-emerald-700">
                      Show this when paying other organization fees
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 rounded-3xl sm:rounded-[2.5rem] border border-orange-100 p-6 sm:p-8 lg:p-10 flex flex-col sm:flex-row items-start gap-4 sm:gap-6 shadow-sm">
              <div className="p-3.5 sm:p-4 bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-orange-900/5 text-orange-600 shrink-0">
                <LuInfo className="size-6" />
              </div>
              <div className="space-y-2 text-left">
                <h3 className="text-base sm:text-lg font-black text-orange-900 tracking-tight leading-none">
                  Security Protocol
                </h3>
                <p className="text-xs sm:text-sm font-medium text-orange-700 leading-relaxed pt-1">
                  Your Digital ID is encrypted and linked directly to your student account. The QR code contains verification metadata to prevent duplication.
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
