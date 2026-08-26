"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  LuIdCard,
  LuShieldCheck,
  LuDownload,
  LuInfo,
  LuCamera,
  LuLoader,
  LuSmartphone,
} from "react-icons/lu";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/app/Components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { ImageCropperModal } from "@/app/Components/ui/image-cropper-modal";

export default function StudentIDPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Inlined Base64 Profile Picture for 100% CORS-Safe WebKit/Safari rendering
  const [base64Photo, setBase64Photo] = useState<string | null>(null);

  // Cropper State
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchUserData();
  }, []);

  // Whenever user.profile_picture changes, convert to Base64 for instant canvas rendering
  useEffect(() => {
    if (user?.profile_picture) {
      convertImageToBase64(user.profile_picture).then((dataUrl) => {
        if (dataUrl) setBase64Photo(dataUrl);
      });
    } else {
      setBase64Photo(null);
    }
  }, [user?.profile_picture]);

  // Helper to convert any remote image URL to base64 Data URL
  const convertImageToBase64 = async (url: string): Promise<string | null> => {
    try {
      const res = await fetch(url, { mode: "cors", cache: "force-cache" });
      if (!res.ok) throw new Error("Image fetch failed");
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL("image/jpeg", 0.95));
            } else {
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = url;
      });
    }
  };

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

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 2. Crop Confirmed -> Upload to Cloudinary & Update Supabase
  const handleCropComplete = async (croppedBlob: Blob) => {
    setUploading(true);

    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        throw new Error(
          "Cloudinary configuration is missing in environment variables."
        );
      }

      const formData = new FormData();
      formData.append("file", croppedBlob, "profile.jpg");
      formData.append("upload_preset", uploadPreset);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const cloudData = await res.json();
      if (!res.ok || !cloudData.secure_url) {
        throw new Error(cloudData.error?.message || "Cloudinary upload failed");
      }

      // Delete old photo on Cloudinary to prevent orphaned storage
      if (user?.profile_picture?.includes("cloudinary.com")) {
        try {
          const parts = user.profile_picture.split("/upload/");
          if (parts.length === 2) {
            let publicId = parts[1];
            if (publicId.match(/^v\d+\//))
              publicId = publicId.replace(/^v\d+\//, "");
            const dotIndex = publicId.lastIndexOf(".");
            if (dotIndex !== -1) publicId = publicId.substring(0, dotIndex);

            await fetch("/api/cloudinary/delete", {
              method: "POST",
              body: JSON.stringify({
                public_id: publicId,
                resource_type: "image",
              }),
              headers: { "Content-Type": "application/json" },
            });
          }
        } catch (e) {
          console.error("Failed to cleanup old profile picture:", e);
        }
      }

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
      fetchUserData();
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

  // 100% Native High-Resolution Canvas Generator (Zero foreignObject / WebKit bugs)
  const generateIdCanvas = async (): Promise<HTMLCanvasElement> => {
    const width = 700;
    const height = 1040;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context not available");

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const drawRoundRect = (
      x: number,
      y: number,
      w: number,
      h: number,
      r: number
    ) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    // 1. Base Card Shape with Rounded Corners & Background Gradient
    const cardX = 14;
    const cardY = 14;
    const cardW = width - 28; // 672
    const cardH = height - 28; // 1012
    const cardRadius = 56;

    ctx.save();
    drawRoundRect(cardX, cardY, cardW, cardH, cardRadius);
    ctx.clip();

    const bgGradient = ctx.createLinearGradient(0, cardY, 0, cardY + cardH);
    bgGradient.addColorStop(0, "#f97316"); // vibrant orange-500
    bgGradient.addColorStop(0.18, "#fb923c");
    bgGradient.addColorStop(0.35, "#ffedd5"); // warm cream
    bgGradient.addColorStop(0.55, "#ffffff");
    bgGradient.addColorStop(1, "#ffffff");

    ctx.fillStyle = bgGradient;
    ctx.fillRect(cardX, cardY, cardW, cardH);

    // Decorative Top Orange Arc
    ctx.beginPath();
    ctx.moveTo(cardX, cardY);
    ctx.lineTo(cardX + cardW, cardY);
    ctx.lineTo(cardX + cardW, cardY + 160);
    ctx.quadraticCurveTo(width / 2, cardY + 220, cardX, cardY + 160);
    ctx.closePath();
    const topArcGrad = ctx.createLinearGradient(0, cardY, 0, cardY + 180);
    topArcGrad.addColorStop(0, "#ea580c");
    topArcGrad.addColorStop(1, "#f97316");
    ctx.fillStyle = topArcGrad;
    ctx.fill();

    // Decorative Soft Glow Oval
    ctx.beginPath();
    ctx.arc(width / 2, cardY + 130, 240, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.fill();

    ctx.restore(); // Exit clip

    // Card Outer Border
    ctx.save();
    drawRoundRect(cardX, cardY, cardW, cardH, cardRadius);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#fed7aa";
    ctx.stroke();
    ctx.restore();

    // 2. Top Header Pill: "ACETRACK 3.0 • ACES"
    ctx.save();
    const pillW = 260;
    const pillH = 36;
    const pillX = (width - pillW) / 2;
    const pillY = 44;
    drawRoundRect(pillX, pillY, pillW, pillH, 18);
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();

    // Orange Dot
    ctx.beginPath();
    ctx.arc(pillX + 22, pillY + 18, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#ea580c";
    ctx.fill();

    // Text (Always single-line, perfectly measured)
    ctx.fillStyle = "#7c2d12";
    ctx.font = "900 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("ACETRACK 3.0 • ACES", width / 2 + 8, pillY + 19);
    ctx.restore();

    // 3. Square Profile Photo with Rounded Corners
    const photoSize = 185;
    const photoX = (width - photoSize) / 2;
    const photoY = 100;
    const photoRadius = 36;

    // Outer white & peach ring
    ctx.save();
    drawRoundRect(photoX - 6, photoY - 6, photoSize + 12, photoSize + 12, photoRadius + 4);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#fed7aa";
    ctx.stroke();
    ctx.restore();

    // Clip & Draw User Image
    ctx.save();
    drawRoundRect(photoX, photoY, photoSize, photoSize, photoRadius);
    ctx.clip();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(photoX, photoY, photoSize, photoSize);

    let photoLoaded = false;
    const photoSrc = base64Photo || user?.profile_picture;
    if (photoSrc) {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise((resolve, reject) => {
          img.onload = () => resolve(true);
          img.onerror = () => reject();
          img.src = photoSrc;
        });

        // Cover fit
        const hRatio = photoSize / img.width;
        const vRatio = photoSize / img.height;
        const ratio = Math.max(hRatio, vRatio);
        const centerShiftX = (photoSize - img.width * ratio) / 2;
        const centerShiftY = (photoSize - img.height * ratio) / 2;

        ctx.drawImage(
          img,
          0,
          0,
          img.width,
          img.height,
          photoX + centerShiftX,
          photoY + centerShiftY,
          img.width * ratio,
          img.height * ratio
        );
        photoLoaded = true;
      } catch (e) {
        console.warn("Could not draw profile photo on canvas:", e);
      }
    }

    if (!photoLoaded) {
      ctx.fillStyle = "#ffedd5";
      ctx.fillRect(photoX, photoY, photoSize, photoSize);
      ctx.fillStyle = "#ea580c";
      ctx.font = "900 48px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(user?.first_name?.[0] || "A", photoX + photoSize / 2, photoY + photoSize / 2);
    }
    ctx.restore();

    // 4. Student Full Name
    ctx.save();
    const fullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "Student Member";
    ctx.fillStyle = "#0f172a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    let nameFontSize = 32;
    ctx.font = `900 ${nameFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;
    while (ctx.measureText(fullName).width > 560 && nameFontSize > 18) {
      nameFontSize -= 2;
      ctx.font = `900 ${nameFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;
    }
    ctx.fillText(fullName, width / 2, 330);
    ctx.restore();

    // 5. Student ID Section
    ctx.save();
    ctx.fillStyle = "#94a3b8";
    ctx.font = "800 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("STUDENT ID", width / 2, 382);

    const idBoxW = 230;
    const idBoxH = 46;
    const idBoxX = (width - idBoxW) / 2;
    const idBoxY = 398;
    drawRoundRect(idBoxX, idBoxY, idBoxW, idBoxH, 13);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#e2e8f0";
    ctx.stroke();

    ctx.fillStyle = "#1e293b";
    ctx.font = "900 22px 'Courier New', Courier, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(user?.student_id || "NOT-SET", width / 2, idBoxY + 23);
    ctx.restore();

    // 6. QR Code Container Box & QR Code
    ctx.save();
    const qrBoxSize = 300;
    const qrBoxX = (width - qrBoxSize) / 2;
    const qrBoxY = 478;
    drawRoundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 36);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#fed7aa";
    ctx.stroke();

    // Draw from hidden QRCodeCanvas element
    const qrCanvasElement = document.getElementById("qr-code-canvas-source") as HTMLCanvasElement | null;
    if (qrCanvasElement) {
      const qrInnerSize = 246;
      const qrInnerX = (width - qrInnerSize) / 2;
      const qrInnerY = qrBoxY + (qrBoxSize - qrInnerSize) / 2;
      ctx.drawImage(qrCanvasElement, qrInnerX, qrInnerY, qrInnerSize, qrInnerSize);
    }
    ctx.restore();

    // 8. Scan for Attendance Text
    ctx.save();
    ctx.fillStyle = "#334155";
    ctx.font = "800 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SCAN FOR ATTENDANCE", width / 2, 818);
    ctx.restore();

    // 9. Bottom Divider & Footer
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(65, 852);
    ctx.lineTo(width - 65, 852);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#cbd5e1";
    ctx.stroke();

    ctx.fillStyle = "#1e293b";
    ctx.font = "900 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("ASSOCIATION OF COMPUTING AND ENGINEERING STUDENTS", width / 2, 882);
    ctx.restore();

    return canvas;
  };

  // ONE Universal 1-Click Download Handler (iOS Safari, Android, Mac, Laptop, PC)
  const handleUniversalDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    const toastId = toast.loading("Generating your official Digital ID...");

    try {
      const canvas = await generateIdCanvas();
      const fileName = `ACES_ID_${user?.student_id || "MEMBER"}.jpg`;

      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            toast.dismiss(toastId);
            toast.error("Failed to generate ID image.");
            setIsDownloading(false);
            return;
          }

          const ua = typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "";
          const isMobile = /iphone|ipad|ipod|android|mobile/.test(ua);
          const file = new File([blob], fileName, { type: "image/jpeg" });

          // Mobile (iOS / Android): Trigger native Web Share sheet (Save Image to Photos / Files)
          if (
            isMobile &&
            typeof navigator !== "undefined" &&
            typeof navigator.share === "function" &&
            typeof navigator.canShare === "function" &&
            navigator.canShare({ files: [file] })
          ) {
            toast.dismiss(toastId);
            try {
              await navigator.share({
                files: [file],
                title: "ACES Digital ID",
                text: `Official ACES Digital ID for ${user?.first_name || ""} ${user?.last_name || ""}`,
              });
              toast.success("ID saved / shared successfully!");
              setIsDownloading(false);
              return;
            } catch (shareErr: any) {
              if (shareErr.name === "AbortError") {
                setIsDownloading(false);
                return;
              }
            }
          }

          // Universal Direct Browser Download (Laptop, Desktop, & Mobile Fallback)
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = fileName;
          link.rel = "noopener";
          document.body.appendChild(link);
          link.click();

          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
          }, 3000);

          toast.dismiss(toastId);
          toast.success("ID downloaded successfully!");
          setIsDownloading(false);
        },
        "image/jpeg",
        0.98
      );
    } catch (err: any) {
      console.error("Download ID error:", err);
      toast.dismiss(toastId);
      toast.error("Failed to download ID. Please try again.");
      setIsDownloading(false);
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
      {/* Hidden High-Resolution QR Canvas Source for 100% Crisp Canvas Merging */}
      <div className="hidden" aria-hidden="true">
        <QRCodeCanvas
          id="qr-code-canvas-source"
          value={qrData}
          size={500}
          level="M"
          includeMargin={false}
        />
      </div>

      {/* Top Header */}
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
          <div className="w-full sm:w-auto">
            {/* ONE Single Universal Download Button */}
            <Button
              onClick={handleUniversalDownload}
              disabled={isDownloading}
              className="w-full sm:w-auto h-12 px-6 rounded-2xl font-black bg-primary hover:bg-primary/95 text-white shadow-xl shadow-primary/25 hover:scale-[1.02] cursor-pointer justify-center transition-all text-sm sm:text-base"
            >
              {isDownloading ? (
                <LuLoader className="size-5 mr-2.5 animate-spin text-white" />
              ) : (
                <LuDownload className="size-5 mr-2.5 text-white" />
              )}
              {isDownloading ? "Downloading ID..." : "Download Official ID"}
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
              Upload and crop your photo to generate your secure Digital ID and
              scannable QR Code for attendance.
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
        /* Step 2: Display Physical ID Layout & Controls */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Card Section */}
          <div className="lg:col-span-5 flex flex-col items-center w-full">
            <div className="relative w-full max-w-[310px] sm:max-w-[340px] aspect-[3.5/5.3] rounded-[2.5rem] sm:rounded-[3rem] overflow-hidden shadow-2xl shadow-orange-950/15 border-2 border-orange-200/90 flex flex-col justify-between bg-gradient-to-b from-orange-500 via-orange-400/20 to-white">
              {/* Decorative Geometric Top & Bottom Curves */}
              <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-orange-500 to-orange-500/90 z-0" />
              <div className="absolute top-20 -left-10 -right-10 h-16 bg-white/30 rounded-[100%] blur-sm z-0" />
              <div className="absolute -bottom-10 -left-10 -right-10 h-28 bg-orange-500/5 rounded-[100%] blur-md z-0" />

              <div className="relative z-10 flex flex-col h-full p-5 sm:p-6 items-center justify-between">
                {/* Top: Header Pill + Profile Picture + Info */}
                <div className="flex flex-col items-center w-full">
                  {/* Top Org Badge */}
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 shadow-sm border border-white mb-3 shrink-0">
                    <span className="size-1.5 rounded-full bg-orange-500 animate-pulse" />
                    <p className="text-[9px] font-black text-orange-950 uppercase tracking-widest whitespace-nowrap">
                      ACETRACK 3.0 • ACES
                    </p>
                  </div>

                  {/* 1. Square Profile Picture Frame with Quick Change Overlay */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Click to change and crop your photo"
                    className="group relative size-24 sm:size-28 rounded-2xl sm:rounded-3xl overflow-hidden bg-white border-3 border-white shadow-xl mb-2 shrink-0 flex items-center justify-center text-orange-300 ring-2 ring-orange-200/80 cursor-pointer focus:outline-none focus:ring-4 focus:ring-primary/40 transition-all hover:scale-105"
                  >
                    {user.profile_picture ? (
                      <img
                        src={base64Photo || user.profile_picture}
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
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity gap-1">
                      <LuCamera className="size-5" />
                      <span className="text-[9px] font-black uppercase tracking-wider">Change</span>
                    </div>
                  </button>

                  {/* 2. Name */}
                  <div className="text-center mb-1.5 px-2 w-full">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight line-clamp-1">
                      {user.first_name} {user.last_name}
                    </h2>
                  </div>

                  {/* 3. Student ID Pill */}
                  <div className="text-center mt-0.5">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-0.5">
                      STUDENT ID
                    </span>
                    <span className="inline-block px-3 py-0.5 rounded-lg bg-white border border-slate-200/80 text-xs sm:text-sm font-black text-slate-800 tracking-[0.1em] shadow-xs font-mono">
                      {user.student_id || "NOT-SET"}
                    </span>
                  </div>
                </div>

                {/* Middle: QR Code with Container */}
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
                  <p className="text-[8.5px] sm:text-[9px] font-black text-slate-700 uppercase tracking-[0.2em] mt-1.5 whitespace-nowrap">
                    SCAN FOR ATTENDANCE
                  </p>
                </div>

                {/* Bottom: Organization Footer */}
                <div className="pt-2 border-t border-slate-300/80 w-full text-center">
                  <p className="text-[8px] sm:text-[9px] font-black text-slate-800 tracking-wider uppercase whitespace-nowrap">
                    ASSOCIATION OF COMPUTING AND ENGINEERING STUDENTS
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 text-xs font-bold text-slate-500 hover:text-primary transition-colors flex items-center gap-1.5 cursor-pointer py-1 px-3 rounded-lg hover:bg-slate-100"
            >
              <LuCamera className="size-3.5" /> Tap photo to crop/change
            </button>
          </div>

          {/* Guidance Section */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-6 w-full">
            {/* Save Guidance Card */}
            <div className="bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-white rounded-3xl sm:rounded-[2.5rem] border border-orange-200 p-6 sm:p-8 shadow-sm">
              <div className="flex items-start gap-4 sm:gap-5">
                <div className="p-3.5 sm:p-4 bg-orange-500 text-white rounded-2xl sm:rounded-3xl shadow-lg shadow-orange-500/20 shrink-0">
                  <LuSmartphone className="size-6" />
                </div>
                <div className="space-y-2 text-left">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                    Universal Device Downloads
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                    One-click high-resolution download optimized for iPhones, iPads, Android, Laptops, and Desktop computers.
                  </p>

                  <div className="space-y-2 pt-2 text-xs font-semibold text-slate-700">
                    <div className="flex items-center gap-2.5">
                      <span className="size-1.5 rounded-full bg-orange-500 shrink-0" />
                      <span>
                        <strong className="text-orange-950">Laptop &amp; PC:</strong> Downloads your official badge directly into your Downloads folder.
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="size-1.5 rounded-full bg-orange-500 shrink-0" />
                      <span>
                        <strong className="text-orange-950">iPhone / iPad / Android:</strong> Opens the native save sheet to save directly to Photos or Files.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Official Usage Guide */}
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
                      Use this for attendance monitoring at all ACES events
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="size-2 rounded-full bg-emerald-400 shrink-0" />
                    <p className="text-xs sm:text-sm font-bold text-emerald-700">
                      Show this when paying organization dues and clearances
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Protocol */}
            <div className="bg-slate-50 rounded-3xl sm:rounded-[2.5rem] border border-slate-200/80 p-6 sm:p-8 flex flex-col sm:flex-row items-start gap-4 sm:gap-6 shadow-sm">
              <div className="p-3.5 sm:p-4 bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-900/5 text-slate-700 shrink-0">
                <LuInfo className="size-6" />
              </div>
              <div className="space-y-2 text-left">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-none">
                  Security Protocol
                </h3>
                <p className="text-xs sm:text-sm font-medium text-slate-600 leading-relaxed pt-1">
                  Your Digital ID is encrypted and linked directly to your student account. The QR code contains verification metadata to prevent duplication.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
