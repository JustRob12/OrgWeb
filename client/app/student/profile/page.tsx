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
  LuPencil,
  LuSave,
  LuX,
  LuLock
} from "react-icons/lu";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Button } from "@/app/Components/ui/button";
import { Input } from "@/app/Components/ui/input";
import { Label } from "@/app/Components/ui/label";

export default function StudentProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const [formData, setFormData] = useState({
    first_name: "",
    middle_initial: "",
    last_name: "",
    course: "",
    section: "",
    year: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    let userEmail = "";

    // 1. Try Supabase Auth
    const { data: { user: authUser } } = await supabase.auth.getUser();
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
        setFormData({
          first_name: data.first_name || "",
          middle_initial: data.middle_initial || "",
          last_name: data.last_name || "",
          course: data.course || "",
          section: data.section || "",
          year: data.year || "",
        });
      }
    }
    setLoading(false);
  };

  const handleStartEdit = () => {
    if (user) {
      setFormData({
        first_name: user.first_name || "",
        middle_initial: user.middle_initial || "",
        last_name: user.last_name || "",
        course: user.course || "",
        section: user.section || "",
        year: user.year || "",
      });
    }
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (user) {
      setFormData({
        first_name: user.first_name || "",
        middle_initial: user.middle_initial || "",
        last_name: user.last_name || "",
        course: user.course || "",
        section: user.section || "",
        year: user.year || "",
      });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast.error("First Name and Last Name are required.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({
          first_name: formData.first_name.trim(),
          middle_initial: formData.middle_initial.trim() || null,
          last_name: formData.last_name.trim(),
          course: formData.course.trim() || null,
          section: formData.section.trim() || null,
          year: formData.year.trim() || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      // Sync local storage if applicable
      const stored = localStorage.getItem("acetrack_user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          parsed.first_name = formData.first_name.trim();
          parsed.last_name = formData.last_name.trim();
          localStorage.setItem("acetrack_user", JSON.stringify(parsed));
        } catch (e) {
          console.error("Failed to sync local user:", e);
        }
      }

      toast.success("Profile updated successfully!");
      setIsEditing(false);
      await fetchProfile();
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File exceeds 2MB limit.");
      return;
    }

    setUploading(true);
    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", uploadPreset || "ml_default");

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: fd
      });

      const data = await res.json();
      if (!data.secure_url) throw new Error("Upload failed");

      // Delete old photo if exists to prevent orphans
      if (user?.profile_picture?.includes('cloudinary.com')) {
        try {
          const parts = user.profile_picture.split('/upload/');
          if (parts.length === 2) {
            let publicId = parts[1];
            if (publicId.match(/^v\d+\//)) publicId = publicId.replace(/^v\d+\//, '');
            const dotIndex = publicId.lastIndexOf('.');
            if (dotIndex !== -1) publicId = publicId.substring(0, dotIndex);
            
            await fetch('/api/cloudinary/delete', {
               method: 'POST',
               body: JSON.stringify({ public_id: publicId, resource_type: 'image' }),
               headers: { 'Content-Type': 'application/json' }
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

      toast.success("Profile photo updated!");
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
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="relative inline-block group/avatar">
          <div className="size-32 rounded-full bg-slate-100 border-4 border-white shadow-lg mx-auto overflow-hidden flex items-center justify-center text-slate-300">
            {user?.profile_picture ? (
              <img src={user.profile_picture} alt="Profile" className="size-full object-cover" />
            ) : (
              <LuUser className="size-16" />
            )}
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 p-2.5 bg-primary text-white rounded-full border-4 border-white shadow-xl hover:scale-110 active:scale-95 transition-all"
            title="Upload new photo"
          >
            {uploading ? (
              <LuLoader className="size-4 animate-spin" />
            ) : (
              <LuCamera className="size-4" />
            )}
          </button>
          <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {fullName || "Student Member"}
          </h1>
          <p className="text-slate-500 font-medium text-sm">
            {user?.course ? `${user.course} ` : ""}{user?.section ? `• Section ${user.section} ` : ""}{user?.year ? `• ${user.year} Year` : ""}
          </p>
        </div>
      </div>

      {/* Information Card */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm transition-all">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LuShieldCheck className="size-5 text-emerald-500" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">
              {isEditing ? "Edit Profile Details" : "Verified Identity"}
            </h2>
          </div>

          {!isEditing ? (
            <Button 
              id="edit-profile-btn"
              onClick={handleStartEdit} 
              variant="outline" 
              size="sm"
              className="rounded-xl border-slate-200 hover:border-slate-300 font-bold text-slate-700 hover:bg-slate-100 transition-all gap-1.5"
            >
              <LuPencil className="size-3.5" />
              Edit Profile
            </Button>
          ) : (
            <Button 
              id="cancel-edit-btn"
              onClick={handleCancelEdit} 
              variant="ghost" 
              size="sm"
              className="rounded-xl font-bold text-slate-500 hover:text-slate-800 transition-all gap-1.5"
            >
              <LuX className="size-4" />
              Cancel
            </Button>
          )}
        </div>
        
        {!isEditing ? (
          /* View Mode */
          <div className="divide-y divide-slate-100">
            <ProfileItem 
              icon={LuUser} 
              label="Full Name" 
              value={fullName || "Not set"} 
            />
            <ProfileItem 
              icon={LuHash} 
              label="Student ID" 
              value={user?.student_id || "Not set"} 
              isLocked
            />
            <ProfileItem 
              icon={LuMail} 
              label="Email Address" 
              value={user?.email || "Not set"} 
              isLocked
            />
            <ProfileItem 
              icon={LuGraduationCap} 
              label="Course" 
              value={user?.course || "Not set"} 
            />
            <ProfileItem 
              icon={LuBookOpen} 
              label="Section" 
              value={user?.section || "Not set"} 
            />
            <ProfileItem 
              icon={LuMilestone} 
              label="Year Level" 
              value={user?.year || "Not set"} 
            />
          </div>
        ) : (
          /* Edit Mode */
          <form onSubmit={handleSaveProfile} className="p-6 space-y-6">
            {/* Name Fields Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                <LuUser className="size-4 text-primary" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Name Information</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="first-name-input" className="text-xs font-bold text-slate-600">First Name *</Label>
                  <Input 
                    id="first-name-input"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="First Name"
                    required
                    className="rounded-xl h-10 border-slate-200 focus:border-primary"
                  />
                </div>

                <div className="sm:col-span-1 space-y-1.5">
                  <Label htmlFor="middle-initial-input" className="text-xs font-bold text-slate-600">M.I.</Label>
                  <Input 
                    id="middle-initial-input"
                    value={formData.middle_initial}
                    onChange={(e) => setFormData({ ...formData, middle_initial: e.target.value })}
                    placeholder="M.I."
                    maxLength={5}
                    className="rounded-xl h-10 border-slate-200 focus:border-primary text-center"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="last-name-input" className="text-xs font-bold text-slate-600">Last Name *</Label>
                  <Input 
                    id="last-name-input"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Last Name"
                    required
                    className="rounded-xl h-10 border-slate-200 focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                <LuGraduationCap className="size-4 text-primary" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Academic Details</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="course-select" className="text-xs font-bold text-slate-600">Course</Label>
                  <select 
                    id="course-select"
                    value={formData.course}
                    onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-800"
                  >
                    <option value="">Select Course</option>
                    <option value="BSIT">BSIT</option>
                    <option value="BSCE">BSCE</option>
                    <option value="BITM">BITM</option>
                    <option value="BSM">BSM</option>
                    <option value="BSMRS">BSMRS</option>
                    {formData.course && !["BSIT", "BSCE", "BITM", "BSM", "BSMRS"].includes(formData.course) && (
                      <option value={formData.course}>{formData.course}</option>
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="section-input" className="text-xs font-bold text-slate-600">Section</Label>
                  <Input 
                    id="section-input"
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    placeholder="e.g. A, B, C"
                    className="rounded-xl h-10 border-slate-200 focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="year-input" className="text-xs font-bold text-slate-600">Year Level</Label>
                  <Input 
                    id="year-input"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    placeholder="e.g. 1st, 2nd, 3rd, 4th"
                    className="rounded-xl h-10 border-slate-200 focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Locked Credentials (Non-editable) */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                <LuLock className="size-4 text-amber-500" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Locked Credentials (Read-Only)</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-500">Student ID</Label>
                    <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                      <LuLock className="size-3" /> Locked
                    </span>
                  </div>
                  <Input 
                    value={user?.student_id || "Not set"} 
                    disabled 
                    className="rounded-xl h-10 bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed font-medium select-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-500">Email Address</Label>
                    <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                      <LuLock className="size-3" /> Locked
                    </span>
                  </div>
                  <Input 
                    value={user?.email || "Not set"} 
                    disabled 
                    className="rounded-xl h-10 bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed font-medium select-none"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelEdit}
                disabled={saving}
                className="rounded-xl h-10 px-5 font-bold text-slate-600 border-slate-200 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                id="save-profile-btn"
                type="submit"
                disabled={saving}
                className="rounded-xl h-10 px-6 font-bold shadow-md hover:shadow-lg transition-all gap-2"
              >
                {saving ? (
                  <>
                    <LuLoader className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <LuSave className="size-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Note Banner */}
      <div className="bg-amber-50/80 rounded-2xl border border-amber-200/60 p-6 flex items-start gap-4 shadow-sm">
        <div className="p-2.5 bg-amber-100/80 rounded-xl text-amber-700 shrink-0">
          <LuLock className="size-5" />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest">Account & Security Policy</p>
          <p className="text-xs text-amber-800 font-medium leading-relaxed">
            Student ID and Email Address are permanently locked for account verification. You can edit your Name, Course, Section, and Year Level above. If you need to change your Student ID or Email, please contact the IT Administrator.
          </p>
        </div>
      </div>
    </div>
  );
}

function ProfileItem({ 
  icon: Icon, 
  label, 
  value, 
  isLocked = false 
}: { 
  icon: any, 
  label: string, 
  value: string, 
  isLocked?: boolean 
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

