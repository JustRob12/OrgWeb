"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { 
  LuSearch, 
  LuPencil, 
  LuTrash2, 
  LuUserPlus,
  LuPlus,
  LuChevronLeft,
  LuChevronRight,
  LuCircleCheck,
  LuClock,
  LuCircleAlert,
  LuMail,
  LuGraduationCap,
  LuLayers,
  LuUsers,
  LuEye,
  LuExternalLink,
  LuUser,
  LuIdCard,
  LuCalendar,
  LuPhilippinePeso
} from "react-icons/lu";
import { Button } from "@/app/Components/ui/button";
import { Card, CardContent } from "@/app/Components/ui/card";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { isValidEmail } from "@/lib/utils";
import { ConfirmModal } from "@/app/Components/ui/confirm-modal";
import { Modal } from "@/app/Components/ui/modal";

interface MemberWithStatus {
  id: string;
  student_id: string;
  first_name: string;
  middle_initial: string;
  last_name: string;
  email: string;
  course: string;
  section: string;
  year: string;
  profile_picture?: string | null;
  created_at?: string;
  memberships: {
    status: string;
    payment: number;
    receipt?: string | null;
    created_at?: string;
  } | null;
}

export default function ViewMembersPage() {
  const [members, setMembers] = useState<MemberWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [photoFilter, setPhotoFilter] = useState("All");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const supabase = useMemo(() => createClient(), []);

  // View Profile Modal State
  const [isViewProfileModalOpen, setIsViewProfileModalOpen] = useState(false);
  const [selectedMemberForView, setSelectedMemberForView] = useState<MemberWithStatus | null>(null);

  const handleViewProfileClick = (member: MemberWithStatus) => {
    setSelectedMemberForView(member);
    setIsViewProfileModalOpen(true);
  };

  // Edit Member Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMemberForEdit, setSelectedMemberForEdit] = useState<MemberWithStatus | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editMiddleInitial, setEditMiddleInitial] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editStudentId, setEditStudentId] = useState("");
  const [editCourse, setEditCourse] = useState("");
  const [editSection, setEditSection] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editStatus, setEditStatus] = useState("Not Paid");
  const [editPayment, setEditPayment] = useState(0);
  const [editReceipt, setEditReceipt] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleEditClick = (member: MemberWithStatus) => {
    setSelectedMemberForEdit(member);
    setEditFirstName(member.first_name || "");
    setEditMiddleInitial(member.middle_initial || "");
    setEditLastName(member.last_name || "");
    setEditStudentId(member.student_id || "");
    setEditCourse(member.course || "");
    setEditSection(member.section || "");
    setEditYear(member.year || "");
    setEditEmail(member.email || "");
    setEditStatus(member.memberships?.status || "Not Paid");
    setEditPayment(member.memberships?.payment || 0);
    setEditReceipt(member.memberships?.receipt || "");
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberForEdit) return;

    if (!isValidEmail(editEmail)) {
      toast.error("Please enter a complete email address (e.g. name@gmail.com). Incomplete domains like @gma are not allowed.");
      return;
    }

    setIsSavingEdit(true);
    try {
      // 1. Update user details in the users table
      const { error: userError } = await supabase
        .from("users")
        .update({
          first_name: editFirstName.trim(),
          middle_initial: editMiddleInitial.trim() || null,
          last_name: editLastName.trim(),
          student_id: editStudentId.trim(),
          course: editCourse.trim(),
          section: editSection.trim(),
          year: editYear.trim(),
          email: editEmail.trim(),
        })
        .eq("id", selectedMemberForEdit.id);

      if (userError) throw userError;

      // 2. Check if a membership record exists
      const { data: membershipData } = await supabase
        .from("memberships")
        .select("id")
        .eq("user_id", selectedMemberForEdit.id)
        .maybeSingle();

      if (membershipData) {
        // Update existing record
        const { error: membershipError } = await supabase
          .from("memberships")
          .update({
            status: editStatus,
            payment: editPayment,
            receipt: editReceipt.trim() || null,
          })
          .eq("user_id", selectedMemberForEdit.id);

        if (membershipError) throw membershipError;
      } else {
        // Insert new record
        const { error: membershipError } = await supabase
          .from("memberships")
          .insert({
            user_id: selectedMemberForEdit.id,
            status: editStatus,
            payment: editPayment,
            receipt: editReceipt.trim() || null,
          });

        if (membershipError) throw membershipError;
      }

      toast.success("Member details updated successfully.");
      
      // Update local state
      setMembers((prev) =>
        prev.map((m) =>
          m.id === selectedMemberForEdit.id
            ? {
                ...m,
                first_name: editFirstName.trim(),
                middle_initial: editMiddleInitial.trim(),
                last_name: editLastName.trim(),
                student_id: editStudentId.trim(),
                course: editCourse.trim(),
                section: editSection.trim(),
                year: editYear.trim(),
                email: editEmail.trim(),
                memberships: {
                  status: editStatus,
                  payment: editPayment,
                  receipt: editReceipt.trim() || null,
                  created_at: m.memberships?.created_at,
                },
              }
            : m
        )
      );

      setIsEditModalOpen(false);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("Save edit failed:", err);
      toast.error(errMsg || "Failed to save member details.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select(`
          *,
          memberships:memberships(status, payment, receipt, created_at),
          accounts:accounts!inner(role)
        `)
        .neq('accounts.role', 0)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const flattenedData = (data as unknown[]).map(item => {
        const row = item as Record<string, unknown>;
        return {
          ...row,
          memberships: Array.isArray(row.memberships) ? row.memberships[0] : row.memberships
        } as unknown as MemberWithStatus;
      });

      setMembers(flattenedData);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Error fetching members:", errMsg);
      toast.error("Failed to load members list.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("users")
          .select(`
            *,
            memberships:memberships(status, payment, receipt, created_at),
            accounts:accounts!inner(role)
          `)
          .neq('accounts.role', 0)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        if (isMounted && data) {
          const flattenedData = (data as unknown[]).map(item => {
            const row = item as Record<string, unknown>;
            return {
              ...row,
              memberships: Array.isArray(row.memberships) ? row.memberships[0] : row.memberships
            } as unknown as MemberWithStatus;
          });
          setMembers(flattenedData);
        }
      } catch (err: unknown) {
        console.error("Error loading members:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const handleDeleteClick = (userId: string) => {
    setMemberToDelete(userId);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!memberToDelete) return;

    setIsDeleting(true);
    try {
      const member = members.find(m => m.id === memberToDelete);

      // Clean up child table records first to avoid foreign key constraint violations
      await Promise.allSettled([
        supabase.from("memberships").delete().eq("user_id", memberToDelete),
        supabase.from("finance_transactions").delete().eq("user_id", memberToDelete),
        supabase.from("attendance").delete().eq("user_id", memberToDelete),
        supabase.from("ballots").delete().eq("user_id", memberToDelete),
        supabase.from("votes").delete().eq("user_id", memberToDelete),
        supabase.from("accounts").delete().eq("user_id", memberToDelete).neq("role", 0),
      ]);

      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", memberToDelete);

      if (error) throw error;

      toast.success("Member deleted successfully.");
      setMembers(prev => prev.filter(m => m.id !== memberToDelete));

      // Delete profile picture from Cloudinary if it exists
      if (member?.profile_picture?.includes("cloudinary.com")) {
        try {
          const parts = member.profile_picture.split("/upload/");
          if (parts.length === 2) {
            let publicId = parts[1];
            if (publicId.match(/^v\d+\//)) {
              publicId = publicId.replace(/^v\d+\//, "");
            }
            const dotIndex = publicId.lastIndexOf(".");
            if (dotIndex !== -1) {
              publicId = publicId.substring(0, dotIndex);
            }

            await fetch("/api/cloudinary/delete", {
              method: "POST",
              body: JSON.stringify({ public_id: publicId, resource_type: "image" }),
              headers: { "Content-Type": "application/json" },
            });
          }
        } catch (cloudinaryErr) {
          console.error("Failed to delete profile picture from Cloudinary:", cloudinaryErr);
        }
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      toast.error(`Delete failed: ${errMsg}`);
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setMemberToDelete(null);
    }
  };



  const yearCounts = useMemo(() => {
    let y1 = 0, y2 = 0, y3 = 0, y4 = 0;
    members.forEach((m) => {
      const y = (m.year || "").toLowerCase().trim();
      if (y === "1" || y.startsWith("1") || y.includes("1st") || y.includes("first")) {
        y1++;
      } else if (y === "2" || y.startsWith("2") || y.includes("2nd") || y.includes("second")) {
        y2++;
      } else if (y === "3" || y.startsWith("3") || y.includes("3rd") || y.includes("third")) {
        y3++;
      } else if (y === "4" || y.startsWith("4") || y.includes("4th") || y.includes("fourth")) {
        y4++;
      }
    });
    return { y1, y2, y3, y4, total: members.length };
  }, [members]);

  const photoCounts = useMemo(() => {
    let withPhoto = 0;
    let noPhoto = 0;
    members.forEach((m) => {
      if (m.profile_picture && m.profile_picture.trim() !== "") {
        withPhoto++;
      } else {
        noPhoto++;
      }
    });
    return { withPhoto, noPhoto, total: members.length };
  }, [members]);

  const filteredMembers = members.filter(member => {
    const query = searchQuery.toLowerCase().trim();
    const fullName = `${member.first_name || ""} ${member.middle_initial || ""} ${member.last_name || ""}`.toLowerCase();
    const studentId = (member.student_id || "").toLowerCase();
    const email = (member.email || "").toLowerCase();
    const course = (member.course || "").toLowerCase();
    const section = (member.section || "").toLowerCase();

    const matchesSearch = 
      !query ||
      fullName.includes(query) ||
      studentId.includes(query) ||
      email.includes(query) ||
      course.includes(query) ||
      section.includes(query);
    
    const matchesStatus = statusFilter === "All" || member.memberships?.status === statusFilter;

    let matchesYear = true;
    if (yearFilter !== "All") {
      const y = (member.year || "").toLowerCase().trim();
      if (yearFilter === "1") {
        matchesYear = y === "1" || y.startsWith("1") || y.includes("1st") || y.includes("first");
      } else if (yearFilter === "2") {
        matchesYear = y === "2" || y.startsWith("2") || y.includes("2nd") || y.includes("second");
      } else if (yearFilter === "3") {
        matchesYear = y === "3" || y.startsWith("3") || y.includes("3rd") || y.includes("third");
      } else if (yearFilter === "4") {
        matchesYear = y === "4" || y.startsWith("4") || y.includes("4th") || y.includes("fourth");
      } else {
        matchesYear = y === yearFilter.toLowerCase();
      }
    }

    let matchesPhoto = true;
    const hasPhoto = Boolean(member.profile_picture && member.profile_picture.trim() !== "");
    if (photoFilter === "With Profile") {
      matchesPhoto = hasPhoto;
    } else if (photoFilter === "Without Profile") {
      matchesPhoto = !hasPhoto;
    }

    return matchesSearch && matchesStatus && matchesYear && matchesPhoto;
  });

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / itemsPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedMembers = filteredMembers.slice(
    (validCurrentPage - 1) * itemsPerPage,
    validCurrentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Registered Members</h1>
          <p className="text-slate-500 mt-1">Manage, edit, and track registered students and their membership status.</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <Link href="/admin/members/add" className="flex-1 md:flex-initial">
            <Button className="w-full h-12 px-6 rounded-2xl font-bold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all cursor-pointer">
              <LuPlus className="size-5 mr-2" /> Add Members
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Year Level Distribution & Total Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* 1st Year Card */}
        <Card 
          onClick={() => { setYearFilter(yearFilter === "1" ? "All" : "1"); setCurrentPage(1); }}
          className={`cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] rounded-3xl overflow-hidden ${
            yearFilter === "1" ? "ring-2 ring-indigo-500 bg-indigo-50/80 border-indigo-200 shadow-sm" : "bg-white border-slate-200 hover:border-indigo-200 shadow-xs"
          }`}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="size-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm border border-indigo-100 shadow-xs">
                1st
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-100/70 px-2.5 py-0.5 rounded-full">
                Freshmen
              </span>
            </div>
            <div className="mt-3">
              <p className="text-2xl sm:text-3xl font-black text-slate-900">{yearCounts.y1}</p>
              <p className="text-xs font-bold text-slate-400 mt-0.5">1st Year Students</p>
            </div>
          </CardContent>
        </Card>

        {/* 2nd Year Card */}
        <Card 
          onClick={() => { setYearFilter(yearFilter === "2" ? "All" : "2"); setCurrentPage(1); }}
          className={`cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] rounded-3xl overflow-hidden ${
            yearFilter === "2" ? "ring-2 ring-sky-500 bg-sky-50/80 border-sky-200 shadow-sm" : "bg-white border-slate-200 hover:border-sky-200 shadow-xs"
          }`}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="size-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-black text-sm border border-sky-100 shadow-xs">
                2nd
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 bg-sky-100/70 px-2.5 py-0.5 rounded-full">
                Sophomore
              </span>
            </div>
            <div className="mt-3">
              <p className="text-2xl sm:text-3xl font-black text-slate-900">{yearCounts.y2}</p>
              <p className="text-xs font-bold text-slate-400 mt-0.5">2nd Year Students</p>
            </div>
          </CardContent>
        </Card>

        {/* 3rd Year Card */}
        <Card 
          onClick={() => { setYearFilter(yearFilter === "3" ? "All" : "3"); setCurrentPage(1); }}
          className={`cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] rounded-3xl overflow-hidden ${
            yearFilter === "3" ? "ring-2 ring-purple-500 bg-purple-50/80 border-purple-200 shadow-sm" : "bg-white border-slate-200 hover:border-purple-200 shadow-xs"
          }`}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="size-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-black text-sm border border-purple-100 shadow-xs">
                3rd
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 bg-purple-100/70 px-2.5 py-0.5 rounded-full">
                Junior
              </span>
            </div>
            <div className="mt-3">
              <p className="text-2xl sm:text-3xl font-black text-slate-900">{yearCounts.y3}</p>
              <p className="text-xs font-bold text-slate-400 mt-0.5">3rd Year Students</p>
            </div>
          </CardContent>
        </Card>

        {/* 4th Year Card */}
        <Card 
          onClick={() => { setYearFilter(yearFilter === "4" ? "All" : "4"); setCurrentPage(1); }}
          className={`cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] rounded-3xl overflow-hidden ${
            yearFilter === "4" ? "ring-2 ring-emerald-500 bg-emerald-50/80 border-emerald-200 shadow-sm" : "bg-white border-slate-200 hover:border-emerald-200 shadow-xs"
          }`}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="size-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm border border-emerald-100 shadow-xs">
                4th
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                Senior
              </span>
            </div>
            <div className="mt-3">
              <p className="text-2xl sm:text-3xl font-black text-slate-900">{yearCounts.y4}</p>
              <p className="text-xs font-bold text-slate-400 mt-0.5">4th Year Students</p>
            </div>
          </CardContent>
        </Card>

        {/* Total Members Card */}
        <Card 
          onClick={() => { setYearFilter("All"); setCurrentPage(1); }}
          className={`col-span-2 sm:col-span-1 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] rounded-3xl overflow-hidden ${
            yearFilter === "All" ? "ring-2 ring-primary bg-orange-50/70 border-orange-200 shadow-sm" : "bg-white border-slate-200 hover:border-orange-200 shadow-xs"
          }`}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-xs">
                <LuUsers className="size-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                All Years
              </span>
            </div>
            <div className="mt-3">
              <p className="text-2xl sm:text-3xl font-black text-slate-900">{yearCounts.total}</p>
              <p className="text-xs font-bold text-slate-400 mt-0.5">Total Members</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Payment Stats Cards */}
        <Card className="bg-emerald-50/50 border-emerald-100 rounded-3xl overflow-hidden group">
          <CardContent className="p-5">
            <div className="flex items-center gap-3.5">
              <div className="size-11 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform">
                <LuCircleCheck className="size-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Fully Paid</p>
                <p className="text-2xl font-black text-emerald-950">{members.filter(m => m.memberships?.status === 'Fully Paid').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50/50 border-blue-100 rounded-3xl overflow-hidden group">
          <CardContent className="p-5">
            <div className="flex items-center gap-3.5">
              <div className="size-11 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                <LuClock className="size-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Half Sem Paid</p>
                <p className="text-2xl font-black text-blue-950">{members.filter(m => m.memberships?.status === 'Half Semester Paid').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-50/50 border-amber-100 rounded-3xl overflow-hidden group">
          <CardContent className="p-5">
            <div className="flex items-center gap-3.5">
              <div className="size-11 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-200 group-hover:scale-110 transition-transform">
                <LuClock className="size-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Partial</p>
                <p className="text-2xl font-black text-amber-950">{members.filter(m => m.memberships?.status === 'Partial').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-rose-50/50 border-rose-100 rounded-3xl overflow-hidden group">
          <CardContent className="p-5">
            <div className="flex items-center gap-3.5">
              <div className="size-11 bg-rose-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-200 group-hover:scale-110 transition-transform">
                <LuCircleAlert className="size-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">Unpaid</p>
                <p className="text-2xl font-black text-rose-950">{members.filter(m => !m.memberships || m.memberships?.status === 'Not Paid').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm rounded-3xl bg-white">
        <div className="p-6 border-b border-slate-100 space-y-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="relative w-full lg:w-80 group">
              <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Search name, ID, email, sec..." 
                className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              {/* Year Filter */}
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl flex-wrap">
                <span className="text-[10px] font-black uppercase text-slate-400 px-2.5">Year:</span>
                {[
                  { label: "All", value: "All", count: yearCounts.total },
                  { label: "1st", value: "1", count: yearCounts.y1 },
                  { label: "2nd", value: "2", count: yearCounts.y2 },
                  { label: "3rd", value: "3", count: yearCounts.y3 },
                  { label: "4th", value: "4", count: yearCounts.y4 },
                ].map((yr) => (
                  <button
                    key={yr.value}
                    onClick={() => {
                      setYearFilter(yr.value);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      yearFilter === yr.value 
                        ? "bg-white text-primary shadow-sm" 
                        : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                    }`}
                  >
                    <span>{yr.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      yearFilter === yr.value ? "bg-primary/10 text-primary" : "bg-slate-200/80 text-slate-600"
                    }`}>
                      {yr.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Profile Filter */}
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl flex-wrap">
                <span className="text-[10px] font-black uppercase text-slate-400 px-2.5">Profile:</span>
                {[
                  { label: "All", value: "All", count: photoCounts.total },
                  { label: "With Profile", value: "With Profile", count: photoCounts.withPhoto },
                  { label: "Without Profile", value: "Without Profile", count: photoCounts.noPhoto },
                ].map((pf) => (
                  <button
                    key={pf.value}
                    onClick={() => {
                      setPhotoFilter(pf.value);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      photoFilter === pf.value 
                        ? "bg-white text-primary shadow-sm" 
                        : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                    }`}
                  >
                    <span>{pf.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      photoFilter === pf.value ? "bg-primary/10 text-primary" : "bg-slate-200/80 text-slate-600"
                    }`}>
                      {pf.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Status Filter */}
              <div className="flex bg-slate-100 p-1 rounded-2xl flex-wrap">
                {["All", "Fully Paid", "Half Semester Paid", "Partial", "Not Paid"].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status);
                      setCurrentPage(1);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === status 
                        ? "bg-white text-primary shadow-sm" 
                        : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Student Info</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Academic</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Contact</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Date Added</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Status</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Paid</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Receipt</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="px-6 py-10 space-y-4">
                      <div className="h-4 bg-slate-100 rounded-full w-3/4"></div>
                      <div className="h-4 bg-slate-100 rounded-full w-1/2"></div>
                    </td>
                  </tr>
                ))
              ) : paginatedMembers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-slate-500 font-bold italic">
                    No results match your search.
                  </td>
                </tr>
              ) : (
                paginatedMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleViewProfileClick(member)}
                          title="Click to view profile & photo"
                          className="relative size-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 font-black shadow-inner overflow-hidden border border-slate-200/80 shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/40 hover:scale-105 transition-all group/avatar"
                        >
                          {member.profile_picture ? (
                            <>
                              <img
                                src={member.profile_picture}
                                alt={`${member.first_name} ${member.last_name}`}
                                className="size-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                              <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <LuEye className="size-4 drop-shadow-sm" />
                              </div>
                            </>
                          ) : (
                            <span className="text-xs font-bold text-slate-500">
                              {(member.first_name?.[0] || "").toUpperCase()}
                              {(member.last_name?.[0] || "").toUpperCase()}
                            </span>
                          )}
                        </button>
                        <div>
                          <button
                            type="button"
                            onClick={() => handleViewProfileClick(member)}
                            className="font-black text-slate-900 text-left hover:text-primary transition-colors cursor-pointer block leading-tight"
                          >
                            {member.first_name} {member.middle_initial ? member.middle_initial + " " : ""}{member.last_name}
                          </button>
                          <div className="text-xs font-bold text-primary tracking-tight mt-0.5">ID: {member.student_id || 'NOT SET'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                          <LuGraduationCap className="size-3.5 text-slate-400" />
                          {member.course}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                          <LuLayers className="size-3.5 text-slate-300" />
                          Year {member.year} • Sec {member.section}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                        <LuMail className="size-4 text-slate-300" />
                        {member.email}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-slate-700">
                          {(() => {
                            const addedAt = member.created_at || member.memberships?.created_at;
                            return addedAt 
                              ? new Date(addedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                              : 'N/A';
                          })()}
                        </div>
                        <div className="text-xs font-medium text-slate-400">
                          {(() => {
                            const addedAt = member.created_at || member.memberships?.created_at;
                            return addedAt 
                              ? new Date(addedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
                              : '';
                          })()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-current transition-all ${
                        member.memberships?.status === 'Fully Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        member.memberships?.status === 'Half Semester Paid' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        member.memberships?.status === 'Partial' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        'bg-rose-50 text-rose-600 border-rose-100'
                      }`}>
                        <div className={`size-1.5 rounded-full mr-2 ${
                          member.memberships?.status === 'Fully Paid' ? 'bg-emerald-500' :
                          member.memberships?.status === 'Half Semester Paid' ? 'bg-blue-500' :
                          member.memberships?.status === 'Partial' ? 'bg-amber-500' :
                          'bg-rose-500'
                        }`} />
                        {member.memberships?.status || 'Not Paid'}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm font-black text-slate-900 leading-none">
                        ₱{(member.memberships?.payment || 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm font-bold text-slate-600 leading-none">
                        {member.memberships?.receipt || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleViewProfileClick(member)}
                          title="View Profile"
                          className="size-9 p-0 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
                        >
                          <LuEye className="size-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEditClick(member)}
                          title="Edit Details"
                          className="size-9 p-0 rounded-xl hover:bg-primary hover:text-white hover:border-primary transition-all cursor-pointer"
                        >
                          <LuPencil className="size-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDeleteClick(member.id)}
                          title="Delete Member"
                          className="size-9 p-0 rounded-xl hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all cursor-pointer"
                        >
                          <LuTrash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 sm:p-6 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Showing <span className="text-slate-900">{filteredMembers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(filteredMembers.length, currentPage * itemsPerPage)}</span> of <span className="text-slate-900">{filteredMembers.length}</span> members
          </p>
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={currentPage <= 1} 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="rounded-xl px-3 py-1.5 h-9 border-slate-200 hover:bg-white transition-all disabled:opacity-50 text-xs font-bold cursor-pointer"
            >
              <LuChevronLeft className="size-4 mr-1" /> Prev
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((pageNum, index, array) => {
                const prevNum = array[index - 1];
                const showEllipsis = prevNum && pageNum - prevNum > 1;

                return (
                  <React.Fragment key={pageNum}>
                    {showEllipsis && <span className="px-1 text-slate-400 text-xs font-bold">...</span>}
                    <button
                      onClick={() => setCurrentPage(pageNum)}
                      className={`size-9 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        currentPage === pageNum
                          ? "bg-primary text-white shadow-xs"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  </React.Fragment>
                );
              })}

            <Button 
              variant="outline" 
              size="sm" 
              disabled={currentPage >= totalPages} 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="rounded-xl px-3 py-1.5 h-9 border-slate-200 hover:bg-white transition-all disabled:opacity-50 text-xs font-bold cursor-pointer"
            >
              Next <LuChevronRight className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      {/* View Profile Modal */}
      <Modal
        isOpen={isViewProfileModalOpen}
        onClose={() => {
          setIsViewProfileModalOpen(false);
          setSelectedMemberForView(null);
        }}
        title="Member Profile"
        className="max-w-xl"
      >
        {selectedMemberForView && (
          <div className="space-y-6">
            {/* Top Avatar Banner */}
            <div className="flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-slate-50 to-white rounded-3xl border border-slate-100 shadow-xs relative">
              {/* Profile Image Display */}
              <div className="relative group/pic mb-4">
                <div className="size-36 sm:size-44 rounded-3xl bg-slate-100 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center text-slate-400 font-black text-3xl ring-1 ring-slate-200/80">
                  {selectedMemberForView.profile_picture ? (
                    <img
                      src={selectedMemberForView.profile_picture}
                      alt={`${selectedMemberForView.first_name} ${selectedMemberForView.last_name}`}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <LuUser className="size-16 text-slate-300" />
                      <span className="text-sm font-bold text-slate-400">No Photo</span>
                    </div>
                  )}
                </div>

                {selectedMemberForView.profile_picture && (
                  <a
                    href={selectedMemberForView.profile_picture}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute -bottom-2 -right-2 p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 shadow-md hover:bg-primary hover:text-white hover:border-primary transition-all text-xs font-bold flex items-center gap-1"
                    title="Open Full Image in New Tab"
                  >
                    <LuExternalLink className="size-3.5" />
                  </a>
                )}
              </div>

              {/* Name and Student ID */}
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                {selectedMemberForView.first_name} {selectedMemberForView.middle_initial ? selectedMemberForView.middle_initial + " " : ""}{selectedMemberForView.last_name}
              </h3>
              <p className="text-xs font-extrabold text-primary tracking-wider uppercase mt-1">
                Student ID: {selectedMemberForView.student_id || "NOT SET"}
              </p>

              {/* Photo Status Pill */}
              <div className="mt-3">
                {selectedMemberForView.profile_picture ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <LuCircleCheck className="size-3.5 text-emerald-600" />
                    Digital ID Photo Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <LuCircleAlert className="size-3.5 text-amber-600" />
                    No Profile Picture Uploaded
                  </span>
                )}
              </div>
            </div>

            {/* Member Detailed Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <LuGraduationCap className="size-3.5 text-primary" /> Program & Course
                </p>
                <p className="text-sm font-black text-slate-900 mt-1">{selectedMemberForView.course || "Not Set"}</p>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Year {selectedMemberForView.year || "—"} • Section {selectedMemberForView.section || "—"}
                </p>
              </div>

              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <LuMail className="size-3.5 text-primary" /> Email Address
                </p>
                <p className="text-sm font-black text-slate-900 mt-1 truncate" title={selectedMemberForView.email}>
                  {selectedMemberForView.email || "Not Set"}
                </p>
                <a
                  href={`mailto:${selectedMemberForView.email}`}
                  className="text-xs text-primary font-bold hover:underline inline-block mt-0.5"
                >
                  Send Email &rarr;
                </a>
              </div>

              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <LuPhilippinePeso className="size-3.5 text-primary" /> Membership Payment
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-black text-slate-900">
                    ₱{Number(selectedMemberForView.memberships?.payment || 0).toLocaleString()}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    selectedMemberForView.memberships?.status === 'Fully Paid' ? 'bg-emerald-100 text-emerald-700' :
                    selectedMemberForView.memberships?.status === 'Half Semester Paid' ? 'bg-blue-100 text-blue-700' :
                    selectedMemberForView.memberships?.status === 'Partial' ? 'bg-amber-100 text-amber-700' :
                    'bg-rose-100 text-rose-700'
                  }`}>
                    {selectedMemberForView.memberships?.status || 'Not Paid'}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <LuCalendar className="size-3.5 text-primary" /> Date Registered
                </p>
                <p className="text-sm font-black text-slate-900 mt-1">
                  {selectedMemberForView.created_at
                    ? new Date(selectedMemberForView.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"}
                </p>
                {selectedMemberForView.memberships?.receipt && (
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    Receipt: {selectedMemberForView.memberships.receipt}
                  </p>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsViewProfileModalOpen(false);
                  setSelectedMemberForView(null);
                }}
                className="rounded-2xl px-5 h-11 border-slate-200 hover:bg-slate-50 font-bold"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  const m = selectedMemberForView;
                  setIsViewProfileModalOpen(false);
                  setSelectedMemberForView(null);
                  if (m) handleEditClick(m);
                }}
                className="rounded-2xl px-5 h-11 bg-primary hover:bg-primary/90 text-white font-bold shadow-md shadow-primary/20"
              >
                <LuPencil className="size-4 mr-2" /> Edit Member
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Member"
        description="Are you sure you want to delete this member? This will permanently remove their account and all associated records."
        confirmText="Delete Member"
        variant="danger"
        isLoading={isDeleting}
      />



      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        title="Edit Member Details"
        className="max-w-2xl"
      >
        <form onSubmit={handleSaveEdit} className="space-y-6">
          {selectedMemberForEdit && (
            <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
              <div className="size-14 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center text-slate-400 font-black shadow-sm overflow-hidden shrink-0">
                {selectedMemberForEdit.profile_picture ? (
                  <img
                    src={selectedMemberForEdit.profile_picture}
                    alt={`${selectedMemberForEdit.first_name} ${selectedMemberForEdit.last_name}`}
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="text-base text-slate-500 font-bold">
                    {(selectedMemberForEdit.first_name?.[0] || "").toUpperCase()}{(selectedMemberForEdit.last_name?.[0] || "").toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-base leading-tight">
                  {selectedMemberForEdit.first_name} {selectedMemberForEdit.middle_initial ? selectedMemberForEdit.middle_initial + " " : ""}{selectedMemberForEdit.last_name}
                </h4>
                <p className="text-xs font-bold text-primary tracking-tight mt-0.5">
                  ID: {selectedMemberForEdit.student_id || "NOT SET"} • {selectedMemberForEdit.course || "No course"}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">First Name</label>
              <input
                type="text"
                required
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Last Name</label>
              <input
                type="text"
                required
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1 col-span-1">
              <label className="text-xs font-bold text-slate-500 uppercase">M.I.</label>
              <input
                type="text"
                maxLength={2}
                value={editMiddleInitial}
                onChange={(e) => setEditMiddleInitial(e.target.value)}
                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
              />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Student ID</label>
              <input
                type="text"
                required
                value={editStudentId}
                onChange={(e) => setEditStudentId(e.target.value)}
                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
            <input
              type="email"
              required
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Course</label>
              <select
                required
                value={editCourse}
                onChange={(e) => setEditCourse(e.target.value)}
                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium text-slate-800"
              >
                <option value="">Select Course</option>
                <option value="BSIT">BSIT</option>
                <option value="BSCE">BSCE</option>
                <option value="BITM">BITM</option>
                <option value="BSM">BSM</option>
                <option value="BSMRS">BSMRS</option>
                {editCourse && !["BSIT", "BSCE", "BITM", "BSM", "BSMRS"].includes(editCourse) && (
                  <option value={editCourse}>{editCourse}</option>
                )}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Section</label>
              <input
                type="text"
                required
                value={editSection}
                onChange={(e) => setEditSection(e.target.value)}
                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Year</label>
              <input
                type="text"
                required
                value={editYear}
                onChange={(e) => setEditYear(e.target.value)}
                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Membership Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
              >
                <option value="Not Paid">Not Paid</option>
                <option value="Partial">Partial</option>
                <option value="Half Semester Paid">Half Semester Paid</option>
                <option value="Fully Paid">Fully Paid</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Payment Amount (₱)</label>
              <input
                type="number"
                min={0}
                required
                value={editPayment}
                onChange={(e) => setEditPayment(parseFloat(e.target.value) || 0)}
                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Receipt No.</label>
              <input
                type="text"
                placeholder="e.g. 131234"
                value={editReceipt}
                onChange={(e) => setEditReceipt(e.target.value)}
                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
              />
            </div>
          </div>

          <div className="pt-6 flex justify-end gap-3 border-t border-slate-100 shrink-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsEditModalOpen(false)}
              className="rounded-xl font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSavingEdit}
              className="rounded-xl font-bold bg-primary text-white hover:bg-primary/90"
            >
              {isSavingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
