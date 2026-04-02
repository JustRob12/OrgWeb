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
  LuCamera
} from "react-icons/lu";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

export default function StudentProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

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
      const stored = localStorage.getItem("orgweb_user");
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

  return (
    <div className="max-w-2xl mx-auto space-y-8">
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
            {user?.first_name} {user?.last_name}
          </h1>
          <p className="text-slate-500 font-medium">Official Member Account</p>
        </div>
      </div>

      {/* Information Grid */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <LuShieldCheck className="size-5 text-emerald-500" />
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Verified Identity</h2>
        </div>
        
        <div className="divide-y divide-slate-100">
          <ProfileItem 
            icon={LuUser} 
            label="Full Name" 
            value={`${user?.first_name} ${user?.last_name}`} 
          />
          <ProfileItem 
            icon={LuHash} 
            label="Student ID" 
            value={user?.student_id || "Not set"} 
          />
          <ProfileItem 
            icon={LuMail} 
            label="Email Address" 
            value={user?.email} 
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
      </div>

      <div className="bg-amber-50 rounded-2xl border border-amber-100 p-6">
        <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest mb-1">Administration Note</p>
        <p className="text-xs text-amber-700 font-medium leading-relaxed">
          Profile Information is currently locked for verification. Contact the IT administrator if any information is incorrect.
        </p>
      </div>
    </div>
  );
}

function ProfileItem({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex items-center gap-4 p-5 px-6">
      <div className="p-3 bg-slate-50 rounded-xl text-slate-400">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-sm font-bold text-slate-700">{value}</p>
      </div>
    </div>
  );
}
