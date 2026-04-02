"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  LuPlus,
  LuCircleCheck,
  LuCircleX,
  LuLoader,
  LuTrash,
  LuCircleAlert,
  LuImage,
  LuX,
  LuCalendar,
  LuMapPin,
  LuLayoutGrid,
  LuList,
  LuClock,
  LuEye,
  LuPencil,
  LuSave,
} from "react-icons/lu";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/app/Components/ui/button";
import { Input } from "@/app/Components/ui/input";
import { Textarea } from "@/app/Components/ui/textarea";
import { Label } from "@/app/Components/ui/label";
import { Modal } from "@/app/Components/ui/modal";
import { ConfirmModal } from "@/app/Components/ui/confirm-modal";
import { cn } from "@/lib/utils";
import { deleteEventImage } from "./actions";

interface Event {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  active: number;
  image_url?: string;
  location?: string;
  created_at: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Edit state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    location: "",
    active: 1,
  });

  // Confirm modal states
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [isCreateConfirmOpen, setIsCreateConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; imageUrl?: string } | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    location: "",
    active: 1,
  });

  const supabase = createClient();

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching events:", error);
    else setEvents(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("File size exceeds 2MB. Please select a smaller image.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
    setError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setEditError("File size exceeds 2MB. Please select a smaller image.");
      if (editFileInputRef.current) editFileInputRef.current.value = "";
      return;
    }

    setEditFile(file);
    setEditError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearEditImage = () => {
    setEditFile(null);
    setEditImagePreview(null);
    if (editFileInputRef.current) editFileInputRef.current.value = "";
  };

  const uploadImageToCloudinary = async (file: File) => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error(
        "Cloudinary configuration is missing. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in your .env"
      );
    }

    const uploadFormData = new FormData();
    uploadFormData.append("file", file);
    uploadFormData.append("upload_preset", uploadPreset);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: uploadFormData }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error?.message || "Failed to upload image to Cloudinary."
      );
    }

    const data = await response.json();
    return data.secure_url;
  };

  const toLocalDatetime = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(formData.start_time) >= new Date(formData.end_time)) {
      setError("Start time must be before end time.");
      return;
    }
    setIsCreateConfirmOpen(true);
  };

  const executeCreate = async () => {
    setIsCreateConfirmOpen(false);
    setSubmitting(true);
    setError(null);

    try {
      if (new Date(formData.start_time) >= new Date(formData.end_time)) {
        throw new Error("Start time must be before end time.");
      }

      let uploadedImageUrl = "";
      if (selectedFile) {
        uploadedImageUrl = await uploadImageToCloudinary(selectedFile);
      }

      const { error: supabaseError } = await supabase.from("events").insert([
        {
          ...formData,
          image_url: uploadedImageUrl || null,
          start_time: new Date(formData.start_time).toISOString(),
          end_time: new Date(formData.end_time).toISOString(),
        },
      ]);

      if (supabaseError) throw supabaseError;

      setIsModalOpen(false);
      setFormData({
        title: "",
        description: "",
        start_time: "",
        end_time: "",
        location: "",
        active: 1,
      });
      clearImage();
      fetchEvents();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    if (new Date(editFormData.start_time) >= new Date(editFormData.end_time)) {
      setEditError("Start time must be before end time.");
      return;
    }

    setIsSaveConfirmOpen(true);
  };

  const executeEditSave = async () => {
    if (!editingEvent) return;
    setEditSubmitting(true);
    setEditError(null);

    try {
      let uploadedImageUrl = editingEvent.image_url || "";
      if (editFile) {
        uploadedImageUrl = await uploadImageToCloudinary(editFile);
      }

      const { error: supabaseError } = await supabase
        .from("events")
        .update({
          ...editFormData,
          image_url: uploadedImageUrl || null,
          start_time: new Date(editFormData.start_time).toISOString(),
          end_time: new Date(editFormData.end_time).toISOString(),
        })
        .eq("id", editingEvent.id);

      if (supabaseError) throw supabaseError;

      setIsSaveConfirmOpen(false);
      setIsEditModalOpen(false);
      setEditingEvent(null);
      clearEditImage();
      fetchEvents();
    } catch (err: any) {
      setEditError(err.message);
      setIsSaveConfirmOpen(false);
    } finally {
      setEditSubmitting(false);
    }
  };

  const openEdit = (event: Event) => {
    setEditingEvent(event);
    setEditFormData({
      title: event.title,
      description: event.description,
      start_time: toLocalDatetime(event.start_time),
      end_time: toLocalDatetime(event.end_time),
      location: event.location || "",
      active: event.active,
    });
    setEditFile(null);
    setEditImagePreview(event.image_url || null);
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const requestDelete = (id: string, imageUrl?: string) => {
    setPendingDelete({ id, imageUrl });
    setIsDeleteConfirmOpen(true);
  };

  const executeDelete = async () => {
    if (!pendingDelete) return;

    const { error: supabaseError } = await supabase
      .from("events")
      .delete()
      .eq("id", pendingDelete.id);

    if (supabaseError) {
      alert("Error deleting event: " + supabaseError.message);
      setIsDeleteConfirmOpen(false);
      setPendingDelete(null);
      return;
    }

    if (pendingDelete.imageUrl) {
      const result = await deleteEventImage(pendingDelete.imageUrl);
      if (!result.success) {
        console.warn("Cloudinary delete failed:", result.error);
      }
    }

    if (selectedEvent?.id === pendingDelete.id) {
      setIsDetailModalOpen(false);
    }
    setIsDeleteConfirmOpen(false);
    setPendingDelete(null);
    fetchEvents();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const openReadMore = (event: Event) => {
    setSelectedEvent(event);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">
            Events
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Manage organization events and activities.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-2.5 rounded-xl text-xs font-black transition-all",
                viewMode === "grid"
                  ? "bg-white text-primary shadow-xl shadow-primary/10"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <LuLayoutGrid className="size-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "p-2.5 rounded-xl text-xs font-black transition-all",
                viewMode === "table"
                  ? "bg-white text-primary shadow-xl shadow-primary/10"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <LuList className="size-4" />
            </button>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="rounded-xl h-11 px-6 font-black gradient-primary shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all text-xs"
          >
            <LuPlus className="size-4" /> Add Event
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <LuLoader className="size-10 animate-spin text-primary" />
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">
            Gathering events...
          </p>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-24 flex flex-col items-center justify-center text-center">
          <div className="size-20 rounded-3xl bg-slate-50 shadow-xl shadow-slate-200/50 flex items-center justify-center mb-6">
            <LuCalendar className="size-10 text-slate-300" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">No events yet</h3>
          <p className="text-slate-500 mt-2 max-w-xs text-sm">
            Create your first organization event to get started.
          </p>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="mt-8 h-12 px-8 rounded-xl font-bold gradient-primary shadow-xl shadow-primary/10"
          >
            <LuPlus className="size-4" /> Create Event
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div
              key={event.id}
              className="group bg-white rounded-[2rem] border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden hover:shadow-primary/10 hover:-translate-y-1 transition-all flex flex-col"
            >
              {/* Image */}
              <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                {event.image_url ? (
                  <img
                    src={event.image_url}
                    alt={event.title}
                    className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="size-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                    <LuImage className="size-10 text-slate-200" />
                  </div>
                )}
                {event.active === 0 && (
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center">
                    <span className="bg-white/20 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border border-white/20">
                      Inactive
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-6 flex flex-col flex-1 space-y-4">
                <div className="space-y-2 flex-1">
                  <h3 className="text-lg font-black text-slate-900 tracking-tight leading-tight line-clamp-2">
                    {event.title}
                  </h3>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                      <LuCalendar className="size-4 text-primary/60" />
                      {formatDateShort(event.start_time)}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                        <LuMapPin className="size-4 text-slate-300" />
                        <span className="line-clamp-1">{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => openReadMore(event)}
                    className="flex-1 h-9 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-primary/5 hover:border-primary/20 hover:text-primary transition-all flex items-center justify-center gap-1.5"
                  >
                    <LuEye className="size-3.5" />
                    View
                  </button>
                  <button
                    onClick={() => openEdit(event)}
                    className="h-9 w-9 rounded-xl border border-slate-200 text-slate-400 hover:text-primary hover:bg-primary/5 hover:border-primary/20 transition-all flex items-center justify-center"
                  >
                    <LuPencil className="size-3.5" />
                  </button>
                  <button
                    onClick={() => requestDelete(event.id, event.image_url)}
                    className="h-9 w-9 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-all flex items-center justify-center"
                  >
                    <LuTrash className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-2xl shadow-slate-200/50">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Event
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Date
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Location
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.map((event) => (
                <tr
                  key={event.id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                        {event.image_url ? (
                          <img
                            src={event.image_url}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <LuImage className="size-5 text-slate-300" />
                        )}
                      </div>
                      <span className="font-bold text-slate-900">
                        {event.title}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-slate-600 font-medium text-sm">
                    {formatDateShort(event.start_time)}
                  </td>
                  <td className="px-6 py-5 text-slate-500 text-sm truncate max-w-[160px]">
                    {event.location || "\u2014"}
                  </td>
                  <td className="px-6 py-5">
                    {event.active === 1 ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 font-bold text-[10px] uppercase tracking-widest border border-emerald-100">
                        <LuCircleCheck className="size-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 text-slate-400 font-bold text-[10px] uppercase tracking-widest border border-slate-200">
                        <LuCircleX className="size-3" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openReadMore(event)}
                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-colors"
                      >
                        <LuEye className="size-4" />
                      </button>
                      <button
                        onClick={() => openEdit(event)}
                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-colors"
                      >
                        <LuPencil className="size-4" />
                      </button>
                      <button
                        onClick={() => requestDelete(event.id, event.image_url)}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                      >
                        <LuTrash className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Event Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Event"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-600 text-sm">
              <LuCircleAlert className="size-5 shrink-0 mt-0.5" />
              <p className="font-bold">{error}</p>
            </div>
          )}

          {/* Image Upload */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-full aspect-[2/1] rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all overflow-hidden relative group"
          >
            {imagePreview ? (
              <>
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="size-full object-cover"
                />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="text-white text-xs font-bold">
                    Change image
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="size-12 rounded-2xl bg-white shadow-lg shadow-slate-200/50 flex items-center justify-center mb-3">
                  <LuPlus className="size-6 text-primary/60" />
                </div>
                <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                  Upload Banner
                </span>
                <span className="text-[10px] text-slate-400 mt-1">
                  Max 2MB
                </span>
              </>
            )}
          </div>
          {imagePreview && (
            <button
              type="button"
              onClick={clearImage}
              className="text-xs font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1 mx-auto"
            >
              <LuX className="size-3" /> Remove Selection
            </button>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
                Event Title *
              </Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Event title"
                className="rounded-xl h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
                Location
              </Label>
              <Input
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="e.g. Activity Center"
                className="rounded-xl h-11"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
                  Start *
                </Label>
                <Input
                  name="start_time"
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={handleInputChange}
                  className="rounded-xl h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
                  End *
                </Label>
                <Input
                  name="end_time"
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={handleInputChange}
                  className="rounded-xl h-11"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the event..."
                className="min-h-[120px] rounded-xl resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 h-12 rounded-xl font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 h-12 rounded-xl font-bold gradient-primary text-white shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
            >
              {submitting ? (
                <LuLoader className="size-4 animate-spin" />
              ) : (
                "Publish Event"
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Event Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingEvent(null);
          clearEditImage();
        }}
        title="Edit Event"
      >
        <form onSubmit={handleEditSubmit} className="space-y-6">
          {editError && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-600 text-sm">
              <LuCircleAlert className="size-5 shrink-0 mt-0.5" />
              <p className="font-bold">{editError}</p>
            </div>
          )}

          {/* Image Upload */}
          <div
            onClick={() => editFileInputRef.current?.click()}
            className="w-full aspect-[2/1] rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all overflow-hidden relative group"
          >
            {editImagePreview ? (
              <>
                <img
                  src={editImagePreview}
                  alt="Preview"
                  className="size-full object-cover"
                />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="text-white text-xs font-bold">
                    Change image
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="size-12 rounded-2xl bg-white shadow-lg shadow-slate-200/50 flex items-center justify-center mb-3">
                  <LuPlus className="size-6 text-primary/60" />
                </div>
                <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                  Upload Banner
                </span>
                <span className="text-[10px] text-slate-400 mt-1">
                  Max 2MB
                </span>
              </>
            )}
          </div>
          {editImagePreview && (
            <button
              type="button"
              onClick={clearEditImage}
              className="text-xs font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1 mx-auto"
            >
              <LuX className="size-3" /> Remove Selection
            </button>
          )}
          <input
            type="file"
            ref={editFileInputRef}
            onChange={handleEditFileChange}
            accept="image/*"
            className="hidden"
          />

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
                Event Title *
              </Label>
              <Input
                id="edit-title"
                name="title"
                value={editFormData.title}
                onChange={handleEditInputChange}
                placeholder="Event title"
                className="rounded-xl h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
                Location
              </Label>
              <Input
                id="edit-location"
                name="location"
                value={editFormData.location}
                onChange={handleEditInputChange}
                placeholder="e.g. Activity Center"
                className="rounded-xl h-11"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
                  Start *
                </Label>
                <Input
                  name="start_time"
                  type="datetime-local"
                  value={editFormData.start_time}
                  onChange={handleEditInputChange}
                  className="rounded-xl h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
                  End *
                </Label>
                <Input
                  name="end_time"
                  type="datetime-local"
                  value={editFormData.end_time}
                  onChange={handleEditInputChange}
                  className="rounded-xl h-11"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
                Description
              </Label>
              <Textarea
                id="edit-description"
                name="description"
                value={editFormData.description}
                onChange={handleEditInputChange}
                placeholder="Describe the event..."
                className="min-h-[120px] rounded-xl resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingEvent(null);
                clearEditImage();
              }}
              className="flex-1 h-12 rounded-xl font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={editSubmitting}
              className="flex-1 h-12 rounded-xl font-bold gradient-primary text-white shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
            >
              {editSubmitting ? (
                <LuLoader className="size-4 animate-spin" />
              ) : (
                <>
                  <LuSave className="size-4" /> Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Event Details"
        className="max-w-2xl"
      >
        {selectedEvent && (
          <div className="space-y-6">
            {/* Hero Image */}
            {selectedEvent.image_url ? (
              <div className="rounded-2xl overflow-hidden aspect-[2/1] bg-slate-100 border border-slate-100">
                <img
                  src={selectedEvent.image_url}
                  alt={selectedEvent.title}
                  className="size-full object-cover"
                />
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden aspect-[2/1] bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-100 flex items-center justify-center">
                <LuImage className="size-12 text-slate-200" />
              </div>
            )}

            {/* Title & Status */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {selectedEvent.active === 1 ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 font-bold text-[10px] uppercase tracking-widest border border-emerald-100">
                    <LuCircleCheck className="size-3" /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 text-slate-400 font-bold text-[10px] uppercase tracking-widest border border-slate-200">
                    <LuCircleX className="size-3" /> Inactive
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                {selectedEvent.title}
              </h2>
            </div>

            {/* Meta Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-xl text-primary">
                    <LuCalendar className="size-4" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Start
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-700 pl-10">
                  {formatDate(selectedEvent.start_time)}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-slate-200/50 rounded-xl text-slate-500">
                    <LuClock className="size-4" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    End
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-700 pl-10">
                  {formatDate(selectedEvent.end_time)}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-rose-500/10 rounded-xl text-rose-500">
                    <LuMapPin className="size-4" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Location
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-700 pl-10">
                  {selectedEvent.location || "Not specified"}
                </p>
              </div>
            </div>

            {/* Description */}
            {selectedEvent.description && (
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="h-px bg-slate-100 flex-1" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                    Description
                  </span>
                  <div className="h-px bg-slate-100 flex-1" />
                </div>
                <p className="text-sm text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">
                  {selectedEvent.description}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => setIsDetailModalOpen(false)}
                className="flex-1 h-12 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all"
              >
                Close View
              </Button>
              <Button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  openEdit(selectedEvent);
                }}
                variant="outline"
                className="h-12 w-12 rounded-xl border-slate-200 text-primary hover:bg-primary/5 hover:border-primary/20 transition-all"
              >
                <LuPencil className="size-4" />
              </Button>
              <Button
                onClick={() =>
                  requestDelete(selectedEvent.id, selectedEvent.image_url)
                }
                variant="outline"
                className="h-12 w-12 rounded-xl border-slate-200 text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-all"
              >
                <LuTrash className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setPendingDelete(null);
        }}
        onConfirm={executeDelete}
        title="Delete Event"
        description="Are you sure you want to delete this event? This action will also remove the image from Cloudinary and cannot be undone."
        variant="danger"
        confirmText="Delete Event"
      />

      {/* Save Confirmation (Edit) */}
      <ConfirmModal
        isOpen={isSaveConfirmOpen}
        onClose={() => setIsSaveConfirmOpen(false)}
        onConfirm={executeEditSave}
        title="Save Changes"
        description="Do you want to save the changes made to this event?"
        variant="warning"
        confirmText="Save Changes"
        isLoading={editSubmitting}
      />

      {/* Create Confirmation (Add) */}
      <ConfirmModal
        isOpen={isCreateConfirmOpen}
        onClose={() => setIsCreateConfirmOpen(false)}
        onConfirm={executeCreate}
        title="Publish Event"
        description="Are you sure you want to publish this new event to the organization?"
        variant="success"
        confirmText="Publish Now"
        isLoading={submitting}
      />
    </div>
  );
}
