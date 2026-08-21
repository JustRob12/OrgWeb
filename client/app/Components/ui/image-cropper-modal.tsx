"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  LuX,
  LuZoomIn,
  LuZoomOut,
  LuRotateCw,
  LuCheck,
  LuMove,
  LuLoader,
  LuImage,
} from "react-icons/lu";
import { Button } from "./button";

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropComplete: (croppedBlob: Blob) => void;
  isUploading?: boolean;
}

export function ImageCropperModal({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
  isUploading = false,
}: ImageCropperModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset state on modal open
  useEffect(() => {
    if (isOpen && imageSrc) {
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
      setImageLoaded(true);
    }
  }, [isOpen, imageSrc]);

  // Check if image is already cached / complete
  useEffect(() => {
    if (imgRef.current?.complete) {
      setImageLoaded(true);
    }
  }, [imageSrc]);

  // Mouse & Touch Pan Handlers
  const handlePointerDown = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({
      x: clientX - offset.x,
      y: clientY - offset.y,
    });
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    setOffset({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.min(3, Math.max(0.8, Number((prev + delta).toFixed(2)))));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleCrop = useCallback(() => {
    if (!imgRef.current) return;

    try {
      const canvas = document.createElement("canvas");
      const outputSize = 512; // 512x512 crisp square profile picture
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = imgRef.current;
      const naturalWidth = img.naturalWidth || 512;
      const naturalHeight = img.naturalHeight || 512;

      // Fill white background for safety
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, outputSize, outputSize);

      // Center coordinates & rotate
      ctx.save();
      ctx.translate(outputSize / 2, outputSize / 2);
      ctx.rotate((rotation * Math.PI) / 180);

      // Calculate scale factor relative to container display size
      const cropBoxSize = 260; // preview mask size in px
      const scaleFactor = (outputSize / cropBoxSize) * zoom;

      // Draw the image
      const aspect = naturalWidth / naturalHeight;
      let drawWidth = cropBoxSize * scaleFactor;
      let drawHeight = cropBoxSize * scaleFactor;

      if (aspect > 1) {
        drawWidth = cropBoxSize * aspect * scaleFactor;
      } else {
        drawHeight = (cropBoxSize / aspect) * scaleFactor;
      }

      ctx.drawImage(
        img,
        -drawWidth / 2 + offset.x * (outputSize / cropBoxSize),
        -drawHeight / 2 + offset.y * (outputSize / cropBoxSize),
        drawWidth,
        drawHeight
      );
      ctx.restore();

      canvas.toBlob(
        (blob) => {
          if (blob) {
            onCropComplete(blob);
          }
        },
        "image/jpeg",
        0.92
      );
    } catch (err) {
      console.error("Cropping error:", err);
    }
  }, [zoom, rotation, offset, onCropComplete]);

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl sm:rounded-[2.5rem] shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-primary/10 text-primary">
              <LuImage className="size-4 sm:size-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                Crop Profile Picture
              </h3>
              <p className="text-[11px] sm:text-xs font-bold text-slate-400">
                Drag to reposition and zoom to fit your ID card.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
          >
            <LuX className="size-5" />
          </button>
        </div>

        {/* Workspace Canvas Area */}
        <div
          ref={containerRef}
          onWheel={handleWheel}
          onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
          onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={(e) => {
            if (e.touches[0]) handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
          }}
          onTouchMove={(e) => {
            if (e.touches[0]) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
          }}
          onTouchEnd={handlePointerUp}
          className="relative h-64 sm:h-96 bg-slate-900 overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing select-none touch-none"
        >
          {/* Target Image with Transformations */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Source for cropping"
            onLoad={() => setImageLoaded(true)}
            crossOrigin="anonymous"
            draggable={false}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
              transition: isDragging ? "none" : "transform 0.05s ease-out",
              maxHeight: "100%",
              maxWidth: "100%",
              objectFit: "contain",
            }}
            className="pointer-events-none"
          />

          {/* Mask Overlay with Circular Crop Guide */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="relative size-[220px] xs:size-[250px] sm:size-[260px] rounded-full border-4 border-primary/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.7)] flex items-center justify-center">
              {/* Corner Guide Crosshairs */}
              <div className="absolute inset-0 rounded-full border border-white/30 pointer-none" />
              <div className="size-3.5 sm:size-4 border-t-2 border-l-2 border-white/60 absolute top-3 sm:top-4 left-3 sm:left-4" />
              <div className="size-3.5 sm:size-4 border-t-2 border-r-2 border-white/60 absolute top-3 sm:top-4 right-3 sm:right-4" />
              <div className="size-3.5 sm:size-4 border-b-2 border-l-2 border-white/60 absolute bottom-3 sm:bottom-4 left-3 sm:left-4" />
              <div className="size-3.5 sm:size-4 border-b-2 border-r-2 border-white/60 absolute bottom-3 sm:bottom-4 right-3 sm:right-4" />
            </div>
          </div>

          <div className="absolute bottom-2.5 left-3 sm:bottom-3 sm:left-4 px-2.5 sm:px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[9px] sm:text-[10px] font-black text-white/80 flex items-center gap-1.5 pointer-events-none">
            <LuMove className="size-3 text-primary" /> Drag to align • Scroll to zoom
          </div>
        </div>

        {/* Controls Bar */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 space-y-3 sm:space-y-4">
          {/* Zoom Slider & Rotate Button */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 flex-1">
              <LuZoomOut className="size-3.5 sm:size-4 text-slate-400 shrink-0" />
              <input
                type="range"
                min="0.8"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <LuZoomIn className="size-3.5 sm:size-4 text-slate-400 shrink-0" />
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 w-9 sm:w-10 text-right">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            <button
              type="button"
              onClick={handleRotate}
              className="p-2 sm:p-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer"
              title="Rotate 90°"
            >
              <LuRotateCw className="size-3.5 sm:size-4 text-primary" />
              <span>Rotate</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 sm:gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isUploading}
              className="flex-1 h-11 sm:h-12 rounded-xl text-xs sm:text-sm font-bold text-slate-600 border-slate-200 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCrop}
              disabled={isUploading}
              className="flex-1 h-11 sm:h-12 rounded-xl text-xs sm:text-sm font-black bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/20 transition-all cursor-pointer"
            >
              {isUploading ? (
                <>
                  <LuLoader className="size-4 mr-2 animate-spin" /> Uploading...
                </>
              ) : (
                <>
                  <LuCheck className="size-4 mr-2" /> Crop & Save
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
