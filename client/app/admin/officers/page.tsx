"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  LuUsers,
  LuPlus,
  LuSearch,
  LuPencil,
  LuTrash2,
  LuShieldCheck,
  LuCrown,
  LuAward,
  LuBriefcase,
  LuGraduationCap,
  LuLoader,
  LuCamera,
  LuEye,
  LuLayoutGrid,
  LuList,
  LuRotateCcw,
  LuCode,
} from "react-icons/lu";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Button } from "@/app/Components/ui/button";
import { Card, CardContent } from "@/app/Components/ui/card";
import { Modal } from "@/app/Components/ui/modal";
import { ConfirmModal } from "@/app/Components/ui/confirm-modal";
import { ImageCropperModal } from "@/app/Components/ui/image-cropper-modal";

export interface Officer {
  id: string;
  name: string;
  position: string;
  order_index: number;
  image_url: string | null;
  department: string | null;
  term: string;
  created_at: string;
}

export const OFFICER_POSITIONS = [
  { label: "Adviser", order: 1, category: "Adviser" },
  { label: "Co-Adviser", order: 2, category: "Adviser" },
  { label: "Governor", order: 3, category: "Executive" },
  { label: "Vice-Governor", order: 4, category: "Executive" },
  { label: "Secretary", order: 5, category: "Officer" },
  { label: "Treasurer", order: 6, category: "Officer" },
  { label: "Auditor", order: 7, category: "Officer" },
  { label: "Business Manager", order: 8, category: "Officer" },
  { label: "P.I.O.", order: 9, category: "Officer" },
  { label: "Senator", order: 10, category: "Senator" },
  { label: "Developer of ACETRACK", order: 11, category: "Developer" },
  { label: "Developer", order: 11, category: "Developer" },
];

export default function AdminOfficersPage() {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Add / Edit Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<Officer | null>(null);
  const [formName, setFormName] = useState("");
  const [formPosition, setFormPosition] = useState("Governor");
  const [formDepartment, setFormDepartment] = useState("");
  const [formTerm, setFormTerm] = useState("A.Y. 2025–2026");
  const [formOrderIndex, setFormOrderIndex] = useState(1);
  const [formImageUrl, setFormImageUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Cropper & Image Upload States
  const [showCropper, setShowCropper] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete Modal States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [officerToDelete, setOfficerToDelete] = useState<Officer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const supabase = createClient();

  const fetchOfficers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("officers")
        .select("*")
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true });

      if (!error && data) {
        setOfficers(data);
      } else {
        setOfficers([]);
      }
    } catch (err: any) {
      setOfficers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfficers();
  }, []);

  const handleOpenAddModal = () => {
    setEditingOfficer(null);
    setFormName("");
    setFormPosition("Governor");
    setFormDepartment("");
    setFormTerm("A.Y. 2025–2026");
    setFormOrderIndex(3);
    setFormImageUrl(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (officer: Officer) => {
    setEditingOfficer(officer);
    setFormName(officer.name);
    setFormPosition(officer.position);
    setFormDepartment(officer.department || "");
    setFormTerm(officer.term || "A.Y. 2025–2026");
    setFormOrderIndex(officer.order_index);
    setFormImageUrl(officer.image_url);
    setIsModalOpen(true);
  };

  const handlePositionChange = (pos: string) => {
    setFormPosition(pos);
    const found = OFFICER_POSITIONS.find((p) => p.label === pos);
    if (found) {
      setFormOrderIndex(found.order);
    }
  };

  // Image Selection Handler
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

  // Upload cropped image to Cloudinary
  const handleCropComplete = async (croppedBlob: Blob) => {
    setUploadingImage(true);
    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        throw new Error("Cloudinary environment variables missing.");
      }

      const fd = new FormData();
      fd.append("file", croppedBlob, "officer.jpg");
      fd.append("upload_preset", uploadPreset || "ml_default");

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok || !data.secure_url) throw new Error(data.error?.message || "Upload failed");

      // Delete old photo if it was changed
      if (formImageUrl && formImageUrl.includes("cloudinary.com") && formImageUrl !== data.secure_url) {
        try {
          const parts = formImageUrl.split("/upload/");
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
          console.error("Cleanup error:", e);
        }
      }

      setFormImageUrl(data.secure_url);
      toast.success("Photo uploaded successfully!");
      setShowCropper(false);
      setCropImageSrc(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload photo.");
    } finally {
      setUploadingImage(false);
    }
  };

  // Save Officer (Insert or Update)
  const handleSaveOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Please enter the officer's full name.");
      return;
    }

    const positionOrderMap: Record<string, number> = {
      "Adviser": 1,
      "Co-Adviser": 2,
      "Governor": 3,
      "Vice-Governor": 4,
      "Secretary": 5,
      "Treasurer": 6,
      "Auditor": 7,
      "Business Manager": 8,
      "P.I.O.": 9,
      "Senator": 10,
      "Developer of ACETRACK": 11,
      "Developer": 11,
    };

    setIsSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        position: formPosition,
        department: formDepartment.trim() || null,
        term: formTerm.trim() || "A.Y. 2025–2026",
        order_index: positionOrderMap[formPosition] ?? 99,
        image_url: formImageUrl,
      };

      if (editingOfficer) {
        const { error } = await supabase
          .from("officers")
          .update(payload)
          .eq("id", editingOfficer.id);

        if (error) throw error;
        toast.success("Officer updated successfully!");
      } else {
        const { error } = await supabase.from("officers").insert(payload);
        if (error) throw error;
        toast.success("Officer added successfully!");
      }

      setIsModalOpen(false);
      fetchOfficers();
    } catch (err: any) {
      toast.error(err.message || "Failed to save officer.");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Officer
  const handleDeleteClick = (officer: Officer) => {
    setOfficerToDelete(officer);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!officerToDelete) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase.from("officers").delete().eq("id", officerToDelete.id);
      if (error) throw error;

      // Delete photo from Cloudinary if exists
      if (officerToDelete.image_url?.includes("cloudinary.com")) {
        try {
          const parts = officerToDelete.image_url.split("/upload/");
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
          console.error("Cleanup error:", e);
        }
      }

      toast.success("Officer deleted successfully.");
      setOfficers((prev) => prev.filter((o) => o.id !== officerToDelete.id));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete officer.");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setOfficerToDelete(null);
    }
  };

  const POSITION_RANK: Record<string, number> = {
    "Adviser": 1,
    "Co-Adviser": 2,
    "Governor": 3,
    "Vice-Governor": 4,
    "Secretary": 5,
    "Treasurer": 6,
    "Auditor": 7,
    "Business Manager": 8,
    "P.I.O.": 9,
    "Senator": 10,
    "Developer of ACETRACK": 11,
    "Developer": 11,
  };

  const filteredOfficers = officers
    .filter((o) => {
      const matchesSearch =
        o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.department || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPosition =
        positionFilter === "All" ||
        (positionFilter === "Advisers" && (o.position === "Adviser" || o.position === "Co-Adviser")) ||
        (positionFilter === "Executive" && (o.position === "Governor" || o.position === "Vice-Governor")) ||
        (positionFilter === "Officers" &&
          ["Secretary", "Treasurer", "Auditor", "Business Manager", "P.I.O."].includes(o.position)) ||
        (positionFilter === "Senators" && o.position === "Senator") ||
        (positionFilter === "Developers" && (o.position === "Developer of ACETRACK" || o.position === "Developer")) ||
        o.position === positionFilter;

      return matchesSearch && matchesPosition;
    })
    .sort((a, b) => {
      const rankA = POSITION_RANK[a.position] ?? (a.order_index || 99);
      const rankB = POSITION_RANK[b.position] ?? (b.order_index || 99);
      if (rankA !== rankB) return rankA - rankB;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

  const getPositionBadge = (pos: string) => {
    if (pos === "Adviser" || pos === "Co-Adviser") {
      return "bg-purple-50 text-purple-700 border-purple-200";
    }
    if (pos === "Governor" || pos === "Vice-Governor") {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    if (pos === "Senator") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (pos.includes("Developer")) {
      return "bg-cyan-50 text-cyan-700 border-cyan-200";
    }
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Hidden File Input for Cropper */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handlePhotoSelect}
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
        isUploading={uploadingImage}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">Organization Officers</h1>
          <p className="text-slate-500 font-medium mt-1">
            Manage organization leaders, advisers, executive board, and senators.
          </p>
        </div>

        <Button
          onClick={handleOpenAddModal}
          className="rounded-2xl font-black bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all cursor-pointer h-12 px-6"
        >
          <LuPlus className="mr-2 size-5" /> Add Officer
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <Card className="bg-amber-50/50 border-amber-100 rounded-3xl overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="size-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-200 group-hover:scale-110 transition-transform">
                <LuCrown className="size-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Executive</p>
                <p className="text-3xl font-black text-amber-950">
                  {officers.filter((o) => o.position === "Governor" || o.position === "Vice-Governor").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50/50 border-purple-100 rounded-3xl overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="size-12 bg-purple-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-200 group-hover:scale-110 transition-transform">
                <LuAward className="size-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-purple-600 uppercase tracking-wider">Advisers</p>
                <p className="text-3xl font-black text-purple-950">
                  {officers.filter((o) => o.position === "Adviser" || o.position === "Co-Adviser").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50/50 border-blue-100 rounded-3xl overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="size-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                <LuBriefcase className="size-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Staff Officers</p>
                <p className="text-3xl font-black text-blue-950">
                  {
                    officers.filter((o) =>
                      ["Secretary", "Treasurer", "Auditor", "Business Manager", "P.I.O."].includes(o.position)
                    ).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50/50 border-emerald-100 rounded-3xl overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="size-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform">
                <LuGraduationCap className="size-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Senators</p>
                <p className="text-3xl font-black text-emerald-950">
                  {officers.filter((o) => o.position === "Senator").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Container */}
      <Card className="border-slate-200 shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
        {/* Search & Filter Header */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80 group">
            <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search officer name or position..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end flex-wrap">
            {/* Position Category Filters */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl flex-wrap">
              {["All", "Advisers", "Executive", "Officers", "Senators"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setPositionFilter(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    positionFilter === cat
                      ? "bg-white text-primary shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === "grid" ? "bg-white text-primary shadow-xs" : "text-slate-400 hover:text-slate-700"
                }`}
                title="Grid View"
              >
                <LuLayoutGrid className="size-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === "table" ? "bg-white text-primary shadow-xs" : "text-slate-400 hover:text-slate-700"
                }`}
                title="List View"
              >
                <LuList className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Officers Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-28 gap-4">
              <LuLoader className="size-10 text-primary animate-spin" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Fetching Officers Directory...
              </p>
            </div>
          ) : filteredOfficers.length === 0 ? (
            <div className="text-center py-20">
              <div className="size-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                <LuUsers className="size-8" />
              </div>
              <h3 className="text-base font-black text-slate-800">No officers found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery || positionFilter !== "All"
                  ? "No matching officers found for your search filter."
                  : "Start by clicking 'Add Officer' to set up your leadership directory."}
              </p>
              <Button
                onClick={handleOpenAddModal}
                className="mt-5 rounded-2xl font-bold bg-primary text-white cursor-pointer"
              >
                <LuPlus className="mr-2 size-4" /> Add Officer
              </Button>
            </div>
          ) : viewMode === "grid" ? (
            /* ================= GRID VIEW ================= */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredOfficers.map((officer) => (
                <div
                  key={officer.id}
                  className="group relative bg-white border border-slate-200/90 rounded-3xl p-5 flex flex-col items-center text-center hover:border-primary/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                >
                  {/* Big Square Photo Container */}
                  <div className="relative w-full aspect-square rounded-2xl bg-slate-100 border border-slate-200/80 shadow-inner overflow-hidden flex items-center justify-center text-slate-400 font-black text-2xl mb-4 group-hover:scale-[1.02] transition-transform shrink-0">
                    {officer.image_url ? (
                      <img
                        src={officer.image_url}
                        alt={officer.name}
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-black text-slate-300 uppercase tracking-wider">
                        {officer.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Position Badge Header */}
                  <span
                    className={`inline-block text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border mb-2 shadow-xs ${getPositionBadge(
                      officer.position
                    )}`}
                  >
                    {officer.position}
                  </span>

                  {/* Name & Details */}
                  <h4 className="font-black text-slate-900 text-base leading-snug group-hover:text-primary transition-colors">
                    {officer.name}
                  </h4>
                  {officer.department && (
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      {officer.department}
                    </p>
                  )}
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
                    {officer.term || "A.Y. 2025–2026"}
                  </p>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 w-full justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditModal(officer)}
                      className="size-9 p-0 rounded-xl hover:bg-primary hover:text-white hover:border-primary transition-all cursor-pointer"
                      title="Edit Officer"
                    >
                      <LuPencil className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(officer)}
                      className="size-9 p-0 rounded-xl hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all cursor-pointer"
                      title="Delete Officer"
                    >
                      <LuTrash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ================= TABLE VIEW ================= */
            <div className="overflow-x-auto border border-slate-200/90 rounded-2xl bg-white">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Officer Name</th>
                    <th className="py-3.5 px-4">Position</th>
                    <th className="py-3.5 px-4 hidden sm:table-cell">Department / Course</th>
                    <th className="py-3.5 px-4 hidden md:table-cell">Term</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredOfficers.map((officer) => (
                    <tr key={officer.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-slate-400 font-bold shrink-0">
                            {officer.image_url ? (
                              <img
                                src={officer.image_url}
                                alt={officer.name}
                                className="size-full object-cover"
                              />
                            ) : (
                              <span>
                                {officer.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </span>
                            )}
                          </div>
                          <span className="truncate max-w-xs">{officer.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getPositionBadge(
                            officer.position
                          )}`}
                        >
                          {officer.position}
                        </span>
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell text-xs font-semibold text-slate-500">
                        {officer.department || "—"}
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell text-xs font-semibold text-slate-400">
                        {officer.term || "A.Y. 2025–2026"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(officer)}
                            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all cursor-pointer"
                            title="Edit"
                          >
                            <LuPencil className="size-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(officer)}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                            title="Delete"
                          >
                            <LuTrash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Add / Edit Officer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingOfficer ? "Edit Officer Details" : "Add New Officer"}
        className="max-w-xl"
      >
        <form onSubmit={handleSaveOfficer} className="space-y-6">
          {/* Photo Preview and Upload */}
          <div className="flex flex-col items-center text-center p-4 bg-slate-50 border border-slate-100 rounded-3xl">
            <div className="relative group">
              <div className="size-28 rounded-full bg-white border-4 border-white shadow-md overflow-hidden flex items-center justify-center text-slate-300 font-bold">
                {formImageUrl ? (
                  <img src={formImageUrl} alt="Preview" className="size-full object-cover" />
                ) : (
                  <LuUsers className="size-12 text-slate-300" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="absolute bottom-0 right-0 p-2.5 bg-primary hover:bg-primary/95 text-white rounded-full border-2 border-white shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer"
                title="Select & Crop Photo"
              >
                {uploadingImage ? <LuLoader className="size-4 animate-spin" /> : <LuCamera className="size-4" />}
              </button>
            </div>
            <p className="text-xs font-bold text-slate-700 mt-3">Officer Photo</p>
            <p className="text-[11px] text-slate-400">Click the camera icon to upload and crop photo</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Jane Doe"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Position <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formPosition}
                  onChange={(e) => handlePositionChange(e.target.value)}
                  className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer"
                >
                  {OFFICER_POSITIONS.map((p) => (
                    <option key={p.label} value={p.label}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Academic Term
                </label>
                <input
                  type="text"
                  placeholder="e.g. A.Y. 2025–2026"
                  value={formTerm}
                  onChange={(e) => setFormTerm(e.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Department / Course
              </label>
              <input
                type="text"
                placeholder="e.g. BSIT 4-A or Faculty Department"
                value={formDepartment}
                onChange={(e) => setFormDepartment(e.target.value)}
                className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl font-bold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="rounded-xl font-bold bg-primary hover:bg-primary/95 text-white cursor-pointer px-6"
            >
              {isSaving ? "Saving..." : editingOfficer ? "Update Officer" : "Add Officer"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Officer"
        description={`Are you sure you want to delete ${officerToDelete?.name || "this officer"} (${officerToDelete?.position || ""})? This action cannot be undone.`}
        confirmText="Delete Officer"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
