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
  LuPhilippinePeso,
  LuTriangleAlert,
  LuWrench,
  LuSparkles,
  LuRefreshCw,
  LuCopy
} from "react-icons/lu";
import { Button } from "@/app/Components/ui/button";
import { Card, CardContent } from "@/app/Components/ui/card";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { isValidEmail, isValidStudentId, formatStudentIdInput, normalizeStudentId } from "@/lib/utils";
import { encryptPassword } from "@/lib/encryption";
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
  accounts?: {
    role: number;
    username?: string;
  } | null;
  hasAccountError?: boolean;
}

export default function ViewMembersPage() {
  const [members, setMembers] = useState<MemberWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [photoFilter, setPhotoFilter] = useState("All");
  const [idFormatFilter, setIdFormatFilter] = useState<"All" | "Valid" | "Invalid">("All");
  const [accountFilter, setAccountFilter] = useState<"All" | "Active" | "Missing">("All");
  const [duplicateFilter, setDuplicateFilter] = useState<"All" | "AllDuplicates" | "DuplicateName" | "DuplicateEmail" | "DuplicateId">("All");
  const [isFixingBatch, setIsFixingBatch] = useState(false);
  const [isCreatingAccounts, setIsCreatingAccounts] = useState(false);
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
    setEditStudentId(normalizeStudentId(member.student_id || ""));
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

    const sId = normalizeStudentId(editStudentId.trim());

    if (!sId) {
      toast.error("Please enter a Student ID.");
      return;
    }

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
          student_id: sId,
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

      // 3. Ensure account record exists or insert if missing
      const { data: existingAccount } = await supabase
        .from("accounts")
        .select("id")
        .eq("user_id", selectedMemberForEdit.id)
        .maybeSingle();

      if (!existingAccount) {
        const defaultPassword = sId || "0000-0000";
        const encDefault = encryptPassword(defaultPassword);
        await supabase.from("accounts").insert({
          user_id: selectedMemberForEdit.id,
          username: editEmail.trim(),
          password: defaultPassword,
          encrypted_password: encDefault,
          role: 1,
          must_change_password: true,
        });
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
                student_id: sId,
                course: editCourse.trim(),
                section: editSection.trim(),
                year: editYear.trim(),
                email: editEmail.trim(),
                accounts: m.accounts || { role: 1, username: editEmail.trim() },
                hasAccountError: false,
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
      let allUsers: MemberWithStatus[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        // Fetch users with LEFT JOIN on memberships and accounts (without !inner so users missing accounts are preserved)
        const { data, error } = await supabase
          .from("users")
          .select(`
            *,
            memberships:memberships(status, payment, receipt, created_at),
            accounts:accounts(role, username)
          `)
          .order('created_at', { ascending: false })
          .range(from, from + step - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          const flattenedData = (data as unknown[]).map((item) => {
            const row = item as Record<string, unknown>;
            const rawAccounts = Array.isArray(row.accounts) ? row.accounts[0] : row.accounts;
            const rawMemberships = Array.isArray(row.memberships) ? row.memberships[0] : row.memberships;
            const hasAccountError = !rawAccounts || !rawAccounts.username;

            return {
              ...row,
              memberships: rawMemberships || null,
              accounts: rawAccounts || null,
              hasAccountError,
            } as unknown as MemberWithStatus;
          });

          // Keep all non-admins (role !== 0) and users with missing accounts
          const studentAndUnassignedUsers = flattenedData.filter((u) => u.accounts?.role !== 0);
          allUsers = allUsers.concat(studentAndUnassignedUsers);

          if (data.length < step) {
            hasMore = false;
          } else {
            from += step;
          }
        } else {
          hasMore = false;
        }
      }

      setMembers(allUsers);
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
      if (isMounted) {
        await fetchMembers();
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [fetchMembers]);

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

  const idFormatCounts = useMemo(() => {
    let valid = 0;
    let invalid = 0;
    let fixable = 0;
    members.forEach((m) => {
      const raw = (m.student_id || "").trim();
      if (isValidStudentId(raw)) {
        valid++;
      } else {
        invalid++;
        if (/^\d{8}$/.test(raw)) {
          fixable++;
        }
      }
    });
    return { valid, invalid, fixable, total: members.length };
  }, [members]);

  const accountErrorCounts = useMemo(() => {
    let active = 0;
    let missing = 0;
    members.forEach((m) => {
      if (m.hasAccountError || !m.accounts) {
        missing++;
      } else {
        active++;
      }
    });
    return { active, missing, total: members.length };
  }, [members]);

  // Calculate duplicate sets for names, emails, and student IDs
  const duplicateMetadata = useMemo(() => {
    const nameCounts = new Map<string, number>();
    const emailCounts = new Map<string, number>();
    const idCounts = new Map<string, number>();

    members.forEach((m) => {
      const nameKey = `${m.first_name || ""} ${m.last_name || ""}`.trim().toLowerCase();
      if (nameKey) {
        nameCounts.set(nameKey, (nameCounts.get(nameKey) || 0) + 1);
      }

      const emailKey = (m.email || "").trim().toLowerCase();
      if (emailKey) {
        emailCounts.set(emailKey, (emailCounts.get(emailKey) || 0) + 1);
      }

      const idKey = normalizeStudentId(m.student_id || "").toLowerCase();
      if (idKey) {
        idCounts.set(idKey, (idCounts.get(idKey) || 0) + 1);
      }
    });

    let duplicateNamesCount = 0;
    let duplicateEmailsCount = 0;
    let duplicateIdsCount = 0;
    let totalDuplicatesCount = 0;

    members.forEach((m) => {
      const nameKey = `${m.first_name || ""} ${m.last_name || ""}`.trim().toLowerCase();
      const emailKey = (m.email || "").trim().toLowerCase();
      const idKey = normalizeStudentId(m.student_id || "").toLowerCase();

      const isDupName = Boolean(nameKey && (nameCounts.get(nameKey) || 0) > 1);
      const isDupEmail = Boolean(emailKey && (emailCounts.get(emailKey) || 0) > 1);
      const isDupId = Boolean(idKey && (idCounts.get(idKey) || 0) > 1);

      if (isDupName) duplicateNamesCount++;
      if (isDupEmail) duplicateEmailsCount++;
      if (isDupId) duplicateIdsCount++;
      if (isDupName || isDupEmail || isDupId) totalDuplicatesCount++;
    });

    return {
      nameCounts,
      emailCounts,
      idCounts,
      duplicateNamesCount,
      duplicateEmailsCount,
      duplicateIdsCount,
      totalDuplicatesCount,
    };
  }, [members]);

  // Batch 1-click helper to generate login accounts for users missing accounts
  const handleGenerateMissingAccounts = async () => {
    const missingMembers = members.filter((m) => m.hasAccountError || !m.accounts);
    if (missingMembers.length === 0) {
      toast.info("All members already have active login accounts.");
      return;
    }

    setIsCreatingAccounts(true);
    let createdCount = 0;
    try {
      for (const m of missingMembers) {
        const defaultPassword = m.student_id ? m.student_id.trim() : "0000-0000";
        const encDefault = encryptPassword(defaultPassword);

        const { error } = await supabase.from("accounts").insert({
          user_id: m.id,
          username: m.email.trim(),
          password: defaultPassword,
          encrypted_password: encDefault,
          role: 1, // Student
          must_change_password: true,
        });

        if (!error) {
          createdCount++;
          setMembers((prev) =>
            prev.map((item) =>
              item.id === m.id
                ? {
                    ...item,
                    accounts: { role: 1, username: m.email.trim() },
                    hasAccountError: false,
                  }
                : item
            )
          );
        }
      }
      toast.success(`Successfully created login accounts for ${createdCount} member(s)!`);
      if (accountFilter === "Missing") {
        setAccountFilter("All");
      }
    } catch (err) {
      console.error("Generate accounts error:", err);
      toast.error("An error occurred while creating missing accounts.");
    } finally {
      setIsCreatingAccounts(false);
    }
  };

  // Batch 1-click helper to auto-format unhyphenated 8-digit IDs (e.g. 20222703 -> 2022-2703)
  const handleAutoFormatFixableIds = async () => {
    const fixableMembers = members.filter((m) => {
      const raw = (m.student_id || "").trim();
      return !isValidStudentId(raw) && /^\d{8}$/.test(raw);
    });

    if (fixableMembers.length === 0) {
      toast.info("No 8-digit unhyphenated student IDs found to auto-format.");
      return;
    }

    setIsFixingBatch(true);
    let updatedCount = 0;
    try {
      for (const m of fixableMembers) {
        const newId = normalizeStudentId(m.student_id);
        const { error } = await supabase
          .from("users")
          .update({ student_id: newId })
          .eq("id", m.id);

        if (!error) {
          updatedCount++;
          setMembers((prev) =>
            prev.map((item) => (item.id === m.id ? { ...item, student_id: newId } : item))
          );
        }
      }
      toast.success(`Successfully auto-formatted ${updatedCount} Student ID(s) to 0000-0000 format!`);
      if (idFormatFilter === "Invalid" && updatedCount === fixableMembers.length) {
        setIdFormatFilter("All");
      }
    } catch (err) {
      console.error("Auto-format error:", err);
      toast.error("An error occurred while auto-formatting IDs.");
    } finally {
      setIsFixingBatch(false);
    }
  };

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

    let matchesIdFormat = true;
    const isValidId = isValidStudentId(member.student_id);
    if (idFormatFilter === "Valid") {
      matchesIdFormat = isValidId;
    } else if (idFormatFilter === "Invalid") {
      matchesIdFormat = !isValidId;
    }

    let matchesAccount = true;
    const isMissingAccount = member.hasAccountError || !member.accounts;
    if (accountFilter === "Active") {
      matchesAccount = !isMissingAccount;
    } else if (accountFilter === "Missing") {
      matchesAccount = isMissingAccount;
    }

    let matchesDuplicate = true;
    const memberNameKey = `${member.first_name || ""} ${member.last_name || ""}`.trim().toLowerCase();
    const memberEmailKey = (member.email || "").trim().toLowerCase();
    const memberIdKey = normalizeStudentId(member.student_id || "").toLowerCase();

    const isDupName = Boolean(memberNameKey && (duplicateMetadata.nameCounts.get(memberNameKey) || 0) > 1);
    const isDupEmail = Boolean(memberEmailKey && (duplicateMetadata.emailCounts.get(memberEmailKey) || 0) > 1);
    const isDupId = Boolean(memberIdKey && (duplicateMetadata.idCounts.get(memberIdKey) || 0) > 1);
    const isAnyDup = isDupName || isDupEmail || isDupId;

    if (duplicateFilter === "AllDuplicates") {
      matchesDuplicate = isAnyDup;
    } else if (duplicateFilter === "DuplicateName") {
      matchesDuplicate = isDupName;
    } else if (duplicateFilter === "DuplicateEmail") {
      matchesDuplicate = isDupEmail;
    } else if (duplicateFilter === "DuplicateId") {
      matchesDuplicate = isDupId;
    }

    return (
      matchesSearch &&
      matchesStatus &&
      matchesYear &&
      matchesPhoto &&
      matchesIdFormat &&
      matchesAccount &&
      matchesDuplicate
    );
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

      {/* Duplicate Records Alert Banner */}
      {duplicateMetadata.totalDuplicatesCount > 0 && (
        <div className="bg-gradient-to-r from-purple-50 via-indigo-50/80 to-purple-50 border border-purple-200 rounded-3xl p-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="size-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-purple-300/40 shrink-0">
                <LuCopy className="size-5.5" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-black text-purple-950 flex items-center gap-2">
                  <span>⚠️ Detected {duplicateMetadata.totalDuplicatesCount} Duplicate Member Record(s) in Database</span>
                </h4>
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                  {duplicateMetadata.duplicateNamesCount > 0 && (
                    <span className="bg-purple-100 border border-purple-300 px-2.5 py-0.5 rounded-full text-purple-950 font-bold">
                      👥 {duplicateMetadata.duplicateNamesCount} Sharing Same Name
                    </span>
                  )}
                  {duplicateMetadata.duplicateEmailsCount > 0 && (
                    <span className="bg-rose-100 border border-rose-300 px-2.5 py-0.5 rounded-full text-rose-950 font-bold">
                      ✉️ {duplicateMetadata.duplicateEmailsCount} Sharing Same Email
                    </span>
                  )}
                  {duplicateMetadata.duplicateIdsCount > 0 && (
                    <span className="bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full text-amber-950 font-bold">
                      🪪 {duplicateMetadata.duplicateIdsCount} Sharing Same ID
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-center">
              {duplicateMetadata.duplicateNamesCount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDuplicateFilter(duplicateFilter === "DuplicateName" ? "All" : "DuplicateName");
                    setCurrentPage(1);
                  }}
                  className={`rounded-xl h-9 text-xs font-bold border-purple-300 shadow-xs cursor-pointer ${
                    duplicateFilter === "DuplicateName"
                      ? "bg-purple-700 text-white hover:bg-purple-800"
                      : "bg-white hover:bg-purple-50 text-purple-950"
                  }`}
                >
                  <LuUsers className="size-3.5 mr-1" />
                  {duplicateFilter === "DuplicateName" ? "Showing Duplicate Names" : `Filter Duplicate Names (${duplicateMetadata.duplicateNamesCount})`}
                </Button>
              )}
              {duplicateMetadata.duplicateEmailsCount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDuplicateFilter(duplicateFilter === "DuplicateEmail" ? "All" : "DuplicateEmail");
                    setCurrentPage(1);
                  }}
                  className={`rounded-xl h-9 text-xs font-bold border-rose-300 shadow-xs cursor-pointer ${
                    duplicateFilter === "DuplicateEmail"
                      ? "bg-rose-700 text-white hover:bg-rose-800"
                      : "bg-white hover:bg-rose-50 text-rose-950"
                  }`}
                >
                  <LuMail className="size-3.5 mr-1" />
                  {duplicateFilter === "DuplicateEmail" ? "Showing Duplicate Emails" : `Filter Duplicate Emails (${duplicateMetadata.duplicateEmailsCount})`}
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => {
                  setDuplicateFilter(duplicateFilter === "AllDuplicates" ? "All" : "AllDuplicates");
                  setCurrentPage(1);
                }}
                className={`rounded-xl h-9 text-xs font-bold shadow-xs cursor-pointer ${
                  duplicateFilter === "AllDuplicates"
                    ? "bg-slate-900 text-white hover:bg-black"
                    : "bg-purple-600 hover:bg-purple-700 text-white"
                }`}
              >
                {duplicateFilter === "AllDuplicates" ? "Clear Duplicate Filter" : `View All Duplicates (${duplicateMetadata.totalDuplicatesCount})`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Missing Login Accounts Alert Banner */}
      {accountErrorCounts.missing > 0 && (
        <div className="bg-gradient-to-r from-rose-50 via-red-50/80 to-rose-50 border border-rose-200 rounded-3xl p-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="size-11 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-bold shadow-md shadow-rose-300/40 shrink-0">
                <LuCircleAlert className="size-5.5" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-black text-rose-950 flex items-center gap-2">
                  <span>⚠️ {accountErrorCounts.missing} Registered Member(s) Missing Login Accounts</span>
                </h4>
                <p className="text-xs text-rose-800/80 font-medium mt-0.5">
                  These records exist in the students database but are missing a corresponding login account. Click below to generate login credentials for them.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-center">
              <Button
                size="sm"
                disabled={isCreatingAccounts}
                onClick={handleGenerateMissingAccounts}
                className="rounded-xl h-9 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm cursor-pointer"
              >
                {isCreatingAccounts ? (
                  <>
                    <LuRefreshCw className="size-3.5 mr-1.5 animate-spin" /> Generating Accounts...
                  </>
                ) : (
                  <>
                    <LuUserPlus className="size-3.5 mr-1.5" /> Generate {accountErrorCounts.missing} Account(s)
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setAccountFilter(accountFilter === "Missing" ? "All" : "Missing");
                  setCurrentPage(1);
                }}
                className={`rounded-xl h-9 text-xs font-bold border-rose-300 shadow-xs cursor-pointer ${
                  accountFilter === "Missing"
                    ? "bg-rose-600 text-white hover:bg-rose-700"
                    : "bg-white hover:bg-rose-50 text-rose-900"
                }`}
              >
                {accountFilter === "Missing" ? "Show All Members" : `Filter Missing (${accountErrorCounts.missing})`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Outdated Student ID Format Correction Banner */}
      {idFormatCounts.invalid > 0 && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50/80 to-amber-50 border border-amber-200 rounded-3xl p-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="size-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-300/40 shrink-0">
                <LuTriangleAlert className="size-5.5" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-black text-amber-950 flex items-center gap-2">
                  <span>⚠️ {idFormatCounts.invalid} Member(s) Have Unformatted / Outdated Student IDs</span>
                  {idFormatCounts.fixable > 0 && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 border border-amber-300">
                      {idFormatCounts.fixable} Auto-Fixable
                    </span>
                  )}
                </h4>
                <p className="text-xs text-amber-800/80 font-medium mt-0.5">
                  These records do not follow the strict <strong>0000-0000</strong> format (e.g. unhyphenated 8 digits like <em>20222703</em> or missing characters).
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-center">
              {idFormatCounts.fixable > 0 && (
                <Button
                  size="sm"
                  disabled={isFixingBatch}
                  onClick={handleAutoFormatFixableIds}
                  className="rounded-xl h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer"
                >
                  {isFixingBatch ? (
                    <>
                      <LuRefreshCw className="size-3.5 mr-1.5 animate-spin" /> Auto-Fixing...
                    </>
                  ) : (
                    <>
                      <LuSparkles className="size-3.5 mr-1.5" /> Auto-Format {idFormatCounts.fixable} ID(s)
                    </>
                  )}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIdFormatFilter(idFormatFilter === "Invalid" ? "All" : "Invalid");
                  setCurrentPage(1);
                }}
                className={`rounded-xl h-9 text-xs font-bold border-amber-300 shadow-xs cursor-pointer ${
                  idFormatFilter === "Invalid"
                    ? "bg-amber-600 text-white hover:bg-amber-700"
                    : "bg-white hover:bg-amber-50 text-amber-900"
                }`}
              >
                {idFormatFilter === "Invalid" ? "Show All Members" : `Filter Needs Fix (${idFormatCounts.invalid})`}
              </Button>
            </div>
          </div>
        </div>
      )}

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

              {/* ID Format Filter */}
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl flex-wrap">
                <span className="text-[10px] font-black uppercase text-slate-400 px-2.5">ID Format:</span>
                {[
                  { label: "All IDs", value: "All" as const, count: idFormatCounts.total, isWarning: false },
                  { label: "Valid Format", value: "Valid" as const, count: idFormatCounts.valid, isWarning: false },
                  { label: "Needs Fix", value: "Invalid" as const, count: idFormatCounts.invalid, isWarning: true },
                ].map((fmt) => (
                  <button
                    key={fmt.value}
                    onClick={() => {
                      setIdFormatFilter(fmt.value);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      idFormatFilter === fmt.value 
                        ? fmt.isWarning && fmt.count > 0
                          ? "bg-amber-500 text-white shadow-sm"
                          : "bg-white text-primary shadow-sm" 
                        : fmt.isWarning && fmt.count > 0
                        ? "text-amber-700 hover:bg-amber-100/60 font-black"
                        : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                    }`}
                  >
                    {fmt.isWarning && fmt.count > 0 && <LuTriangleAlert className="size-3 text-amber-500" />}
                    <span>{fmt.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      idFormatFilter === fmt.value 
                        ? "bg-black/15 text-white"
                        : fmt.isWarning && fmt.count > 0
                        ? "bg-amber-200 text-amber-900"
                        : "bg-slate-200/80 text-slate-600"
                    }`}>
                      {fmt.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Account Status Filter */}
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl flex-wrap">
                <span className="text-[10px] font-black uppercase text-slate-400 px-2.5">Account:</span>
                {[
                  { label: "All", value: "All" as const, count: accountErrorCounts.total, isError: false },
                  { label: "Active", value: "Active" as const, count: accountErrorCounts.active, isError: false },
                  { label: "Missing Account", value: "Missing" as const, count: accountErrorCounts.missing, isError: true },
                ].map((acc) => (
                  <button
                    key={acc.value}
                    onClick={() => {
                      setAccountFilter(acc.value);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      accountFilter === acc.value 
                        ? acc.isError && acc.count > 0
                          ? "bg-rose-500 text-white shadow-sm"
                          : "bg-white text-primary shadow-sm" 
                        : acc.isError && acc.count > 0
                        ? "text-rose-700 hover:bg-rose-100/60 font-black"
                        : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                    }`}
                  >
                    {acc.isError && acc.count > 0 && <LuCircleAlert className="size-3 text-rose-500" />}
                    <span>{acc.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      accountFilter === acc.value 
                        ? "bg-black/15 text-white"
                        : acc.isError && acc.count > 0
                        ? "bg-rose-200 text-rose-900"
                        : "bg-slate-200/80 text-slate-600"
                    }`}>
                      {acc.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Duplicates Filter */}
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl flex-wrap">
                <span className="text-[10px] font-black uppercase text-slate-400 px-2.5">Duplicates:</span>
                {[
                  { label: "All", value: "All" as const, count: members.length, isWarning: false },
                  { label: "All Duplicates", value: "AllDuplicates" as const, count: duplicateMetadata.totalDuplicatesCount, isWarning: true },
                  { label: "Dup Names", value: "DuplicateName" as const, count: duplicateMetadata.duplicateNamesCount, isWarning: true },
                  { label: "Dup Emails", value: "DuplicateEmail" as const, count: duplicateMetadata.duplicateEmailsCount, isWarning: true },
                ].map((dup) => (
                  <button
                    key={dup.value}
                    onClick={() => {
                      setDuplicateFilter(dup.value);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      duplicateFilter === dup.value 
                        ? dup.isWarning && dup.count > 0
                          ? "bg-purple-600 text-white shadow-sm"
                          : "bg-white text-primary shadow-sm" 
                        : dup.isWarning && dup.count > 0
                        ? "text-purple-800 hover:bg-purple-100/60 font-black"
                        : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                    }`}
                  >
                    {dup.isWarning && dup.count > 0 && <LuCopy className="size-3 text-purple-600" />}
                    <span>{dup.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      duplicateFilter === dup.value 
                        ? "bg-black/15 text-white"
                        : dup.isWarning && dup.count > 0
                        ? "bg-purple-200 text-purple-950"
                        : "bg-slate-200/80 text-slate-600"
                    }`}>
                      {dup.count}
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
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className={`text-xs font-bold font-mono ${!isValidStudentId(member.student_id) ? 'text-amber-800' : 'text-primary'}`}>
                              ID: {member.student_id || 'NOT SET'}
                            </span>
                            {!isValidStudentId(member.student_id) ? (
                              <button
                                type="button"
                                onClick={() => handleEditClick(member)}
                                title="This Student ID does not follow 0000-0000 format. Click to fix."
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition-colors cursor-pointer"
                              >
                                <LuTriangleAlert className="size-2.5 text-amber-700" /> Needs Fix
                              </button>
                            ) : null}
                            {(() => {
                              const nameK = `${member.first_name || ""} ${member.last_name || ""}`.trim().toLowerCase();
                              const isDupN = Boolean(nameK && (duplicateMetadata.nameCounts.get(nameK) || 0) > 1);
                              return isDupN ? (
                                <span 
                                  title={`Duplicate Name: ${duplicateMetadata.nameCounts.get(nameK)} students share the name "${member.first_name} ${member.last_name}"`}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-300"
                                >
                                  <LuCopy className="size-2.5 text-purple-700" /> Dup Name ({duplicateMetadata.nameCounts.get(nameK)})
                                </span>
                              ) : null;
                            })()}
                            {(() => {
                              const idK = normalizeStudentId(member.student_id || "").toLowerCase();
                              const isDupI = Boolean(idK && (duplicateMetadata.idCounts.get(idK) || 0) > 1);
                              return isDupI ? (
                                <span 
                                  title={`Duplicate ID: ${duplicateMetadata.idCounts.get(idK)} records share the ID "${member.student_id}"`}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300"
                                >
                                  <LuCopy className="size-2.5 text-amber-700" /> Dup ID ({duplicateMetadata.idCounts.get(idK)})
                                </span>
                              ) : null;
                            })()}
                            {member.hasAccountError || !member.accounts ? (
                              <span 
                                title="This user record is missing a login account in the accounts table. Use the Generate Account button above or click edit to create one."
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-900 border border-rose-300"
                              >
                                <LuCircleAlert className="size-2.5 text-rose-700" /> No Account
                              </span>
                            ) : null}
                          </div>
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
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                          <LuMail className="size-4 text-slate-300 shrink-0" />
                          <span className="truncate max-w-[200px]">{member.email}</span>
                        </div>
                        {(() => {
                          const emailK = (member.email || "").trim().toLowerCase();
                          const isDupE = Boolean(emailK && (duplicateMetadata.emailCounts.get(emailK) || 0) > 1);
                          return isDupE ? (
                            <span 
                              title={`Duplicate Email: ${duplicateMetadata.emailCounts.get(emailK)} records share the email "${member.email}"`}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-900 border border-rose-300"
                            >
                              <LuCopy className="size-2.5 text-rose-700" /> Dup Email ({duplicateMetadata.emailCounts.get(emailK)})
                            </span>
                          ) : null;
                        })()}
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
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-500 uppercase">Student ID *</label>
                {editStudentId && (
                  !isValidStudentId(editStudentId) ? (
                    <span className="text-[10px] font-bold text-rose-500">Format: 0000-0000</span>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-600">Valid Format</span>
                  )
                )}
              </div>
              <input
                type="text"
                required
                maxLength={9}
                placeholder="2022-2703"
                value={editStudentId}
                onChange={(e) => setEditStudentId(formatStudentIdInput(e.target.value))}
                className={`w-full h-11 px-3 bg-slate-50 border rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-4 transition-all font-medium ${
                  editStudentId && !isValidStudentId(editStudentId)
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10"
                    : "border-slate-200 focus:ring-primary/10"
                }`}
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
