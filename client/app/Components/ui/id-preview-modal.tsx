"use client";

import React, { useState, useEffect } from "react";
import {
  LuX,
  LuDownload,
  LuShare2,
  LuExternalLink,
  LuCopy,
  LuCheck,
  LuSmartphone,
  LuImage,
  LuSparkles,
} from "react-icons/lu";
import { Button } from "@/app/Components/ui/button";
import { toast } from "sonner";

interface IdPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  blob: Blob | null;
  pngBlob?: Blob | null;
  fileName: string;
  studentName?: string;
  studentId?: string;
}

export function IdPreviewModal({
  isOpen,
  onClose,
  imageSrc,
  blob,
  pngBlob,
  fileName,
  studentName,
  studentId,
}: IdPreviewModalProps) {
  const [copied, setCopied] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent.toLowerCase();
      const iOS =
        /iphone|ipad|ipod/.test(ua) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const mobile = /iphone|ipad|ipod|android|mobile/.test(ua);
      setIsIOS(iOS);
      setIsMobile(mobile);

      // Check if Web Share API is available
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        setCanShare(true);
      }
    }
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleEsc);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imageSrc) return null;

  // Convert Data URL to Blob synchronously (bulletproof for WebKit)
  const dataUrlToBlob = (dataUrl: string): Blob => {
    const parts = dataUrl.split(",");
    const mime = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const binary = atob(parts[1]);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return new Blob([array], { type: mime });
  };

  // Cross-browser direct download trigger
  const triggerDownload = (targetBlob: Blob | null, targetName: string) => {
    try {
      const activeBlob = targetBlob || (imageSrc ? dataUrlToBlob(imageSrc) : null);
      if (activeBlob) {
        const blobUrl = URL.createObjectURL(activeBlob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = targetName;
        link.rel = "noopener";
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        }, 3000);
        toast.success(`Download started for ${targetName}`);
        return;
      }

      if (imageSrc) {
        const link = document.createElement("a");
        link.href = imageSrc;
        link.download = targetName;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => document.body.removeChild(link), 1500);
        toast.success(`Download started for ${targetName}`);
      }
    } catch (err) {
      console.error("Direct download failed:", err);
      handleOpenNewTab();
    }
  };

  // 1. Native Web Share (iOS Share Sheet -> "Save Image" to Apple Photos)
  const handleShare = async () => {
    if (!blob && !imageSrc) return;

    try {
      const fileBlob = blob || dataUrlToBlob(imageSrc!);
      const currentFileName = fileName || `ACES_ID_${studentId || "MEMBER"}.jpg`;
      const file = new File([fileBlob], currentFileName, {
        type: fileBlob.type || "image/jpeg",
      });

      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "ACES Digital ID",
            text: `Official ACES Digital ID for ${studentName || "Member"}`,
          });
          toast.success("Saved / Shared successfully!");
          return;
        }

        // URL share fallback
        await navigator.share({
          title: "ACES Digital ID",
          text: `Official ACES Digital ID for ${studentName || "Member"} (${studentId || ""})`,
          url: window.location.href,
        });
        toast.success("Shared successfully!");
      } else {
        toast.info("Share not supported. Use direct download or tap & hold the image.");
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Share error:", err);
        toast.error("Share failed. Please use direct download or tap & hold the image.");
      }
    }
  };

  // 2. Direct File Download (JPG)
  const handleDownloadJpg = () => {
    const targetName = `ACES_ID_${studentId || "MEMBER"}.jpg`;
    triggerDownload(blob, targetName);
  };

  // 3. Direct File Download (PNG)
  const handleDownloadPng = () => {
    const targetName = `ACES_ID_${studentId || "MEMBER"}.png`;
    triggerDownload(pngBlob || blob, targetName);
  };

  // 4. Copy Image to Clipboard
  const handleCopyImage = async () => {
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const targetBlob = pngBlob || blob || (imageSrc ? dataUrlToBlob(imageSrc) : null);
        if (targetBlob) {
          let copyBlob = targetBlob;
          if (targetBlob.type !== "image/png") {
            const img = new Image();
            img.src = imageSrc;
            await new Promise((res) => (img.onload = res));
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(img, 0, 0);
            copyBlob = await new Promise<Blob>((res) =>
              canvas.toBlob((b) => res(b || targetBlob), "image/png")
            );
          }

          await navigator.clipboard.write([
            new ClipboardItem({
              "image/png": copyBlob,
            }),
          ]);
          setCopied(true);
          toast.success("ID image copied to clipboard!");
          setTimeout(() => setCopied(false), 2500);
          return;
        }
      }
      throw new Error("ClipboardItem not supported");
    } catch (err) {
      console.error("Clipboard error:", err);
      toast.info("Copying image is not supported by your browser. Please tap & hold the image to save.");
    }
  };

  // 5. Open Full Image in New Tab (Clean standalone page for tap-and-hold)
  const handleOpenNewTab = () => {
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>ACES Digital ID - ${studentId || "Member"}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0">
            <style>
              body {
                margin: 0;
                background-color: #0b1329;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                color: #ffffff;
                padding: 16px;
                box-sizing: border-box;
              }
              img {
                max-width: 100%;
                max-height: 80vh;
                border-radius: 28px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
                border: 2px solid rgba(255, 255, 255, 0.2);
              }
              .tip {
                margin-top: 20px;
                font-size: 14px;
                color: #fb923c;
                background: rgba(251, 146, 60, 0.15);
                border: 1px solid rgba(251, 146, 60, 0.3);
                padding: 10px 16px;
                border-radius: 16px;
                text-align: center;
                max-width: 320px;
              }
            </style>
          </head>
          <body>
            <img src="${imageSrc}" alt="ACES Digital ID" />
            <div class="tip">
              📲 <strong>Tap and hold</strong> (Long Press) the ID badge above, then select <strong>&quot;Save to Photos&quot;</strong>.
            </div>
          </body>
        </html>
      `);
      newWindow.document.close();
    } else {
      window.open(imageSrc, "_blank");
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col z-10 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 text-primary">
              <LuImage className="size-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                Digital ID Ready
              </h2>
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500">
                High-Resolution Scannable Badge
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <LuX className="size-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* iOS / Mobile Smart Save Tip Banner */}
          {isIOS ? (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/80 text-orange-950 flex items-start gap-3 shadow-xs">
              <div className="p-2 rounded-xl bg-orange-500 text-white shrink-0 shadow-sm mt-0.5">
                <LuSmartphone className="size-4" />
              </div>
              <div className="space-y-1 text-left">
                <p className="text-xs sm:text-sm font-black text-orange-900 leading-snug">
                  iOS / iPhone Save Instructions
                </p>
                <p className="text-[11px] sm:text-xs font-medium text-orange-800 leading-relaxed">
                  Tap & hold (<strong>Long Press</strong>) the card image below, then tap{" "}
                  <strong className="text-orange-950">&quot;Save to Photos&quot;</strong> or{" "}
                  <strong className="text-orange-950">&quot;Add to Photos&quot;</strong> to save directly into your Apple Photos gallery!
                </p>
              </div>
            </div>
          ) : isMobile ? (
            <div className="p-3 sm:p-3.5 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-950 flex items-start gap-3 shadow-xs">
              <div className="p-1.5 rounded-xl bg-blue-600 text-white shrink-0 mt-0.5">
                <LuSmartphone className="size-4" />
              </div>
              <div className="space-y-0.5 text-left">
                <p className="text-xs font-black text-blue-900">
                  Mobile Download Tip
                </p>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Tap & hold the card image to save, or use the <strong>Save to Photos / Share</strong> button below.
                </p>
              </div>
            </div>
          ) : null}

          {/* Rendered Card Image Preview */}
          <div className="flex flex-col items-center justify-center p-3 sm:p-4 bg-gradient-to-b from-slate-100 to-slate-50 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-inner relative group">
            <img
              src={imageSrc}
              alt="ACES Digital ID"
              className="w-full max-w-[260px] xs:max-w-[280px] sm:max-w-[300px] h-auto rounded-2xl sm:rounded-[2rem] shadow-xl border border-white/80 select-auto touch-manipulation transition-transform duration-200 group-hover:scale-[1.01]"
              style={{
                WebkitTouchCallout: "default",
                WebkitUserSelect: "auto",
                userSelect: "auto",
              }}
            />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-3 flex items-center gap-1.5">
              <LuSparkles className="size-3 text-primary" /> High-Resolution 300 DPI ID Badge
            </p>
          </div>

          {/* Action Buttons Grid */}
          <div className="space-y-2.5 pt-1">
            {/* Primary Mobile Action: Native Share / Save Sheet */}
            {canShare && (
              <Button
                onClick={handleShare}
                className="w-full h-12 rounded-xl font-black bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/20 hover:scale-[1.01] transition-all flex items-center justify-center text-sm sm:text-base cursor-pointer"
              >
                <LuShare2 className="size-4 sm:size-5 mr-2" />
                Save to Photos / Share
              </Button>
            )}

            {/* Direct Download Buttons */}
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
              <Button
                variant="outline"
                onClick={handleDownloadJpg}
                className="h-11 rounded-xl font-bold bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all text-xs sm:text-sm cursor-pointer justify-center shadow-xs"
              >
                <LuDownload className="size-4 mr-1.5 text-primary" />
                Download JPG
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadPng}
                className="h-11 rounded-xl font-bold bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all text-xs sm:text-sm cursor-pointer justify-center shadow-xs"
              >
                <LuDownload className="size-4 mr-1.5 text-primary" />
                Download PNG
              </Button>
            </div>

            {/* Utility Buttons: Copy Image & Open Full Tab */}
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
              <Button
                variant="outline"
                onClick={handleCopyImage}
                className="h-10 rounded-xl font-bold bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all text-xs cursor-pointer justify-center shadow-xs"
              >
                {copied ? (
                  <LuCheck className="size-3.5 mr-1.5 text-emerald-600" />
                ) : (
                  <LuCopy className="size-3.5 mr-1.5 text-slate-500" />
                )}
                {copied ? "Copied!" : "Copy Image"}
              </Button>
              <Button
                variant="outline"
                onClick={handleOpenNewTab}
                className="h-10 rounded-xl font-bold bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all text-xs cursor-pointer justify-center shadow-xs"
              >
                <LuExternalLink className="size-3.5 mr-1.5 text-slate-500" />
                Open Full Tab
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-400 font-medium shrink-0">
          <span>Official ACES ID Credential</span>
          <button
            onClick={onClose}
            className="text-slate-600 font-bold hover:text-slate-900 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
