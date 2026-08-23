"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import { 
  LuUpload, 
  LuSave, 
  LuX, 
  LuCircleCheck, 
  LuUsers, 
  LuCircleAlert, 
  LuUserPlus, 
  LuPlus, 
  LuPencil, 
  LuTrash2,
  LuSearch,
  LuFilter,
  LuChevronLeft,
  LuChevronRight,
  LuDatabase,
  LuSparkles,
  LuTriangleAlert,
  LuRefreshCw,
  LuCheck
} from "react-icons/lu";
import { Button } from "@/app/Components/ui/button";
import { Card, CardContent } from "@/app/Components/ui/card";
import { Input } from "@/app/Components/ui/input";
import { Label } from "@/app/Components/ui/label";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { Modal } from "@/app/Components/ui/modal";
import { ConfirmModal } from "@/app/Components/ui/confirm-modal";

import { isValidEmail } from "@/lib/utils";

interface RawMemberData {
  student_id: string;
  first_name: string;
  middle_initial?: string;
  last_name: string;
  course?: string;
  section?: string;
  year?: string;
  email: string;
  membership_status: "Partial" | "Fully Paid" | "Not Paid" | "Half Semester Paid";
  payment: number;
  receipt?: string;
}

export default function AddMembersPage() {
  const [members, setMembers] = useState<RawMemberData[]>([]);
  const [dbExistingStudentIds, setDbExistingStudentIds] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isRemoveDuplicatesModalOpen, setIsRemoveDuplicatesModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<{ type: "error" | "warning" | "success"; text: string } | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Table filtering and pagination states
  const [filterStatus, setFilterStatus] = useState<"all" | "new" | "existing">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Live Saving Animation & Progress States
  const [savingProgress, setSavingProgress] = useState<{
    current: number;
    total: number;
    currentName: string;
    currentId: string;
  } | null>(null);
  const [activeSavingId, setActiveSavingId] = useState<string | null>(null);
  const [justSavedIds, setJustSavedIds] = useState<Set<string>>(new Set());

  const [manualMember, setManualMember] = useState<RawMemberData>({
    student_id: "",
    first_name: "",
    middle_initial: "",
    last_name: "",
    course: "",
    section: "",
    year: "",
    email: "",
    membership_status: "Not Paid",
    payment: 0,
    receipt: ""
  });

  const supabase = useMemo(() => createClient(), []);

  // Fetch all existing student IDs from database
  const fetchExistingStudentIds = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("student_id");

      if (error) throw error;

      const idSet = new Set(
        (data || [])
          .map((u) => String(u.student_id || "").trim().toLowerCase())
          .filter(Boolean)
      );
      setDbExistingStudentIds(idSet);
      return idSet;
    } catch (err: unknown) {
      console.error("Error fetching existing student IDs:", err);
      return new Set<string>();
    }
  }, [supabase]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("student_id");

        if (!error && data && isMounted) {
          const idSet = new Set(
            data
              .map((u) => String(u.student_id || "").trim().toLowerCase())
              .filter(Boolean)
          );
          setDbExistingStudentIds(idSet);
        }
      } catch (err: unknown) {
        console.error("Error loading initial student IDs:", err);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const processFile = async (file: File) => {
    setIsUploading(true);
    setErrorMessage(null);

    // Refresh existing student IDs from database to ensure up-to-date check
    const existingDbSet = await fetchExistingStudentIds();

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary", raw: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as Record<string, unknown>[];

        let invalidCount = 0;
        const validatedData: RawMemberData[] = [];

        data.forEach((row) => {
          const studentId = String(row.student_id || row["Student ID"] || row["ID"] || "").trim();
          const firstName = String(row.first_name || row["First Name"] || "").trim();
          const lastName = String(row.last_name || row["Last Name"] || "").trim();
          const email = String(row.email || row["Email"] || "").trim().toLowerCase();

          if (!studentId || !firstName || !lastName || !email || !isValidEmail(email)) {
            invalidCount++;
            return;
          }

          const rawStatus = String(row.membership_status || row["Membership Status"] || "Not Paid").trim();
          const validStatuses = ["Partial", "Fully Paid", "Not Paid", "Half Semester Paid"] as const;
          const membershipStatus = (validStatuses.includes(rawStatus as typeof validStatuses[number])
            ? rawStatus
            : "Not Paid") as RawMemberData["membership_status"];

          validatedData.push({
            student_id: studentId,
            first_name: firstName,
            middle_initial: String(row.middle_initial || row["Middle Initial"] || row["MI"] || "").trim(),
            last_name: lastName,
            course: String(row.course || row["Course"] || "").trim(),
            section: String(row.section || row["Section"] || "").trim(),
            year: String(row.year || row["Year"] || "").trim(),
            email: email,
            membership_status: membershipStatus,
            payment: Number(row.payment || row["Payment"] || row["Amount"] || 0) || 0,
            receipt: String(row.receipt || row["Receipt"] || row["Receipt Number"] || row["Receipt No"] || "").trim(),
          });
        });

        setMembers(validatedData);
        setCurrentPage(1);

        // Accurate breakdown of incoming file rows
        const seenInFile = new Set<string>();
        let inDbCount = 0;
        let inBatchDuplicateCount = 0;
        let newMemberCount = 0;

        validatedData.forEach((m) => {
          const sKey = String(m.student_id || "").trim().toLowerCase();
          const inDb = existingDbSet.has(sKey);
          const seenInBatch = seenInFile.has(sKey);

          if (inDb) {
            inDbCount++;
          } else if (seenInBatch) {
            inBatchDuplicateCount++;
          } else {
            newMemberCount++;
          }
          seenInFile.add(sKey);
        });

        if (inDbCount > 0 && inBatchDuplicateCount > 0) {
          toast.info(
            `Parsed ${validatedData.length} rows: ${newMemberCount} new to save, ${inDbCount} already in database, ${inBatchDuplicateCount} duplicate in file.`
          );
          setErrorMessage({
            type: "warning",
            text: `Detected ${inDbCount} student(s) already in the database and ${inBatchDuplicateCount} duplicate row(s) within the file. Only ${newMemberCount} unique new student(s) will be saved.`
          });
        } else if (inDbCount > 0) {
          toast.info(
            `Parsed ${validatedData.length} rows: ${newMemberCount} new to save, ${inDbCount} already in database.`
          );
          setErrorMessage({
            type: "warning",
            text: `Detected ${inDbCount} student ID(s) that are already recorded in the database. Only ${newMemberCount} new student(s) will be saved.`
          });
        } else if (inBatchDuplicateCount > 0) {
          toast.info(
            `Parsed ${validatedData.length} rows: ${newMemberCount} unique members, ${inBatchDuplicateCount} duplicate rows found in your file.`
          );
          setErrorMessage({
            type: "warning",
            text: `Your uploaded spreadsheet contains ${inBatchDuplicateCount} duplicate row(s). Only ${newMemberCount} unique student(s) will be saved.`
          });
        } else {
          toast.success(`Successfully parsed ${validatedData.length} new members.`);
        }

        if (invalidCount > 0) {
          setErrorMessage({
            type: "warning",
            text: `Skipped ${invalidCount} rows due to missing required fields or incomplete email addresses (must include complete domain like @gmail.com).`
          });
        }
      } catch (error) {
        console.error("Error parsing file:", error);
        toast.error("Failed to parse file. Please ensure it follows the correct format.");
      } finally {
        setIsUploading(false);
        setIsDragging(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!manualMember.student_id || !manualMember.first_name || !manualMember.last_name || !manualMember.email) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (!isValidEmail(manualMember.email)) {
      toast.error("Please enter a complete email address (e.g. name@gmail.com). Incomplete domains like @gma are not allowed.");
      return;
    }

    const sIdKey = manualMember.student_id.trim().toLowerCase();
    const isAlreadyInDb = dbExistingStudentIds.has(sIdKey);
    const isAlreadyInList = members.some((m) => m.student_id.trim().toLowerCase() === sIdKey);

    setErrorMessage(null);
    setMembers((prev) => [...prev, manualMember]);
    setIsManualModalOpen(false);

    // Reset form
    setManualMember({
      student_id: "",
      first_name: "",
      middle_initial: "",
      last_name: "",
      course: "",
      section: "",
      year: "",
      email: "",
      membership_status: "Not Paid",
      payment: 0,
      receipt: ""
    });

    if (isAlreadyInDb) {
      toast.warning(`Student ID "${manualMember.student_id}" is already recorded in the database.`);
    } else if (isAlreadyInList) {
      toast.warning(`Student ID "${manualMember.student_id}" is duplicated in the current preview list.`);
    } else {
      toast.success("Member added to preview list.");
    }
  };

  const handleDeleteRow = (originalIndex: number) => {
    setMembers((prev) => prev.filter((_, idx) => idx !== originalIndex));
    toast.success("Member removed from preview list.");
  };

  const handleEditRowClick = (originalIndex: number) => {
    setManualMember(members[originalIndex]);
    setEditingIndex(originalIndex);
    setIsManualModalOpen(true);
  };

  const handleManualEditSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!manualMember.student_id || !manualMember.first_name || !manualMember.last_name || !manualMember.email) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (!isValidEmail(manualMember.email)) {
      toast.error("Please enter a complete email address (e.g. name@gmail.com). Incomplete domains like @gma are not allowed.");
      return;
    }

    setMembers((prev) => {
      const next = [...prev];
      if (editingIndex !== null && next[editingIndex]) {
        next[editingIndex] = manualMember;
      }
      return next;
    });
    setIsManualModalOpen(false);
    setEditingIndex(null);

    // Reset form
    setManualMember({
      student_id: "",
      first_name: "",
      middle_initial: "",
      last_name: "",
      course: "",
      section: "",
      year: "",
      email: "",
      membership_status: "Not Paid",
      payment: 0,
      receipt: ""
    });

    toast.success("Member details updated.");
  };

  const handleRemoveAlreadyRecorded = () => {
    const onlyNew = membersWithStatus.filter((item) => item.isNew).map((item) => item.member);
    const removedCount = members.length - onlyNew.length;
    setMembers(onlyNew);
    setIsRemoveDuplicatesModalOpen(false);
    setFilterStatus("all");
    setCurrentPage(1);
    toast.success(`Removed ${removedCount} duplicate / already recorded member(s) from the preview list.`);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // Compute members with metadata (isNew, isExistingInDb, isDuplicateInBatch)
  const seenSoFar = new Set<string>();
  const membersWithStatus = members.map((member, originalIndex) => {
    const sId = String(member.student_id || "").trim().toLowerCase();
    const isExistingInDb = dbExistingStudentIds.has(sId);
    const isDuplicateInBatch = seenSoFar.has(sId);
    const isNew = !isExistingInDb && !isDuplicateInBatch;

    seenSoFar.add(sId);

    return {
      member,
      originalIndex,
      isExistingInDb,
      isDuplicateInBatch,
      isNew,
    };
  });

  // Accurate non-overlapping counts for summary & filter tabs
  const totalCount = members.length;
  const newCount = membersWithStatus.filter((item) => item.isNew).length;
  const existingCount = totalCount - newCount;
  const inDbCount = membersWithStatus.filter((item) => item.isExistingInDb).length;
  const duplicateInFileCount = membersWithStatus.filter((item) => !item.isExistingInDb && item.isDuplicateInBatch).length;

  // Filtered members according to selected filter tab and search query
  const filteredMembers = useMemo(() => {
    return membersWithStatus.filter((item) => {
      // 1. Status Filter
      if (filterStatus === "new" && !item.isNew) return false;
      if (filterStatus === "existing" && item.isNew) return false;

      // 2. Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = `${item.member.first_name} ${item.member.last_name}`.toLowerCase().includes(query);
        const matchesId = item.member.student_id.toLowerCase().includes(query);
        const matchesEmail = item.member.email.toLowerCase().includes(query);
        const matchesCourse = (item.member.course || "").toLowerCase().includes(query);
        const matchesSection = (item.member.section || "").toLowerCase().includes(query);

        if (!matchesName && !matchesId && !matchesEmail && !matchesCourse && !matchesSection) {
          return false;
        }
      }

      return true;
    });
  }, [membersWithStatus, filterStatus, searchQuery]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / itemsPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedMembers = useMemo(() => {
    const start = (validCurrentPage - 1) * itemsPerPage;
    return filteredMembers.slice(start, start + itemsPerPage);
  }, [filteredMembers, validCurrentPage, itemsPerPage]);

  const saveMembers = async () => {
    if (members.length === 0) return;

    setIsSaving(true);
    setErrorMessage(null);
    let successCount = 0;
    let errorCount = 0;

    try {
      // 1. Fresh check against DB to get the latest list of existing student IDs
      const { data: existingUsers, error: fetchError } = await supabase
        .from("users")
        .select("student_id");

      if (fetchError) throw fetchError;

      const freshExistingStudentIds = new Set(
        (existingUsers || [])
          .map((u) => String(u.student_id || "").trim().toLowerCase())
          .filter(Boolean)
      );

      // Separate new members to save vs already recorded members to keep untouched
      const membersToProcess: RawMemberData[] = [];
      const duplicateMembers: RawMemberData[] = [];
      const seenInBatch = new Set<string>();

      for (const m of members) {
        const sKey = String(m.student_id || "").trim().toLowerCase();
        if (freshExistingStudentIds.has(sKey) || seenInBatch.has(sKey)) {
          duplicateMembers.push(m);
        } else {
          seenInBatch.add(sKey);
          membersToProcess.push(m);
        }
      }

      if (membersToProcess.length === 0) {
        setErrorMessage({
          type: "warning",
          text: `No new members were saved because all ${duplicateMembers.length} student ID(s) are already recorded in the database. Their existing data was kept intact.`
        });
        toast.warning("All records already exist in the database. No changes were made.");
        setIsSaving(false);
        return;
      }

      const totalToSave = membersToProcess.length;
      let currentProgressIndex = 0;

      // Process each new student sequentially with high-speed parallel inserts and live animated removal
      for (const member of membersToProcess) {
        const studentIdKey = String(member.student_id || "").trim().toLowerCase();
        currentProgressIndex++;

        // Update live progress and highlight row being saved
        setActiveSavingId(member.student_id);
        setSavingProgress({
          current: currentProgressIndex,
          total: totalToSave,
          currentName: `${member.first_name} ${member.last_name}`,
          currentId: member.student_id,
        });

        try {
          // 1. Insert new User record
          const { data: userData, error: userError } = await supabase
            .from("users")
            .insert({
              student_id: member.student_id.trim(),
              first_name: member.first_name.trim(),
              middle_initial: member.middle_initial?.trim() || null,
              last_name: member.last_name.trim(),
              email: member.email.trim(),
              course: member.course?.trim() || null,
              section: member.section?.trim() || null,
              year: member.year?.trim() || null,
            })
            .select()
            .single();

          if (userError) throw userError;

          // 2. Concurrently insert Account and Membership for maximum speed
          const defaultPassword = member.student_id ? member.student_id.trim() : "0000-0000";
          const [accountRes, membershipRes] = await Promise.all([
            supabase.from("accounts").insert({
              user_id: userData.id,
              username: member.email.trim(),
              password: defaultPassword,
              role: 1, // Student
              must_change_password: true,
            }),
            supabase.from("memberships").insert({
              user_id: userData.id,
              status: member.membership_status,
              payment: member.payment || 0,
              receipt: member.receipt?.trim() || null,
            }),
          ]);

          if (accountRes.error) throw accountRes.error;
          if (membershipRes.error) throw membershipRes.error;

          successCount++;
          freshExistingStudentIds.add(studentIdKey);

          // Mark as saved for brief visual feedback animation
          setJustSavedIds((prev) => new Set([...prev, member.student_id]));

          // Brief delay so user perceives the row's dynamic completion animation
          await new Promise((resolve) => setTimeout(resolve, 140));

          // Animate-out: remove the saved student row live from the table list!
          setMembers((prev) => prev.filter((m) => m.student_id !== member.student_id));
        } catch (error: unknown) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error("Error saving member:", member.email, errorMsg);
          errorCount++;
          // Retain failed member on preview list
        }
      }

      // Update cached database student IDs
      setDbExistingStudentIds(freshExistingStudentIds);

      if (successCount > 0) {
        if (duplicateMembers.length > 0 || errorCount > 0) {
          setErrorMessage({
            type: "warning",
            text: `Successfully saved ${successCount} new member(s). Kept existing data and skipped ${duplicateMembers.length} duplicate/already recorded student ID(s).`
          });
          toast.success(
            `Saved ${successCount} new members. ${duplicateMembers.length} already recorded student ID(s) were kept unchanged.`
          );
        } else {
          setErrorMessage({
            type: "success",
            text: `Successfully saved all ${successCount} new members!`
          });
          toast.success(`Successfully saved all ${successCount} members!`);
        }
      } else {
        setErrorMessage({
          type: "error",
          text: "Failed to save members. Database save encountered errors."
        });
        toast.error("Failed to save members. Please check the logs.");
      }
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      console.error("Bulk save error:", err);
      toast.error(`An error occurred during save: ${errMessage}`);
    } finally {
      setIsSaving(false);
      setActiveSavingId(null);
      setSavingProgress(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Add New Members</h1>
          <p className="text-slate-500 mt-1">Upload Excel/CSV files to bulk-create student accounts.</p>
        </div>

        {members.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isSaving}
              onClick={() => setIsManualModalOpen(true)}
              className="rounded-xl h-10 px-4 font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
            >
              <LuPlus className="size-4 mr-1 text-primary" /> Manually Add
            </Button>
            
            {existingCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                disabled={isSaving}
                onClick={() => setIsRemoveDuplicatesModalOpen(true)}
                className="rounded-xl h-10 px-4 font-semibold border-amber-200 text-amber-800 bg-amber-50 hover:bg-amber-100 cursor-pointer disabled:opacity-50"
              >
                <LuTrash2 className="size-4 mr-1 text-amber-600" /> Remove Already Recorded ({existingCount})
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              disabled={isSaving}
              onClick={() => setIsClearModalOpen(true)}
              className="rounded-xl h-10 px-4 font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 cursor-pointer disabled:opacity-50"
            >
              <LuX className="size-4 mr-1" /> Clear List
            </Button>

            <Button
              size="sm"
              onClick={() => setIsSaveModalOpen(true)}
              loading={isSaving}
              disabled={newCount === 0 || isSaving}
              className="rounded-xl h-10 px-5 font-bold gradient-primary text-white shadow-lg shadow-primary/20 hover:shadow-primary/40 cursor-pointer disabled:opacity-50"
            >
              <LuSave className="size-4 mr-1.5" /> {isSaving ? "Saving..." : `Save ${newCount > 0 ? `(${newCount} New)` : ""}`}
            </Button>
          </div>
        )}
      </div>

      {/* Live Saving Animated Progress Banner */}
      {isSaving && savingProgress && (
        <div className="bg-gradient-to-r from-emerald-50 via-primary/5 to-emerald-50 border-2 border-emerald-400/40 rounded-3xl p-5 shadow-lg shadow-emerald-500/10 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-200">
                <LuRefreshCw className="size-5 animate-spin" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span>Adding Students to Database</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black">
                    {savingProgress.current} / {savingProgress.total}
                  </span>
                </h4>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  Currently adding: <strong className="text-emerald-700">{savingProgress.currentName}</strong> ({savingProgress.currentId})
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-emerald-600">
                {Math.round((savingProgress.current / savingProgress.total) * 100)}%
              </span>
            </div>
          </div>

          {/* Smooth Animated Progress Bar */}
          <div className="w-full h-3 bg-white/80 rounded-full overflow-hidden p-0.5 border border-emerald-200 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-primary to-emerald-400 rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${Math.max(4, Math.round((savingProgress.current / savingProgress.total) * 100))}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Summary Banner / Alert Messages */}
      {errorMessage && (
        <div className={`p-4 rounded-2xl flex items-start gap-3 border animate-in fade-in slide-in-from-top-2 duration-300 ${
          errorMessage.type === "error" 
            ? "bg-rose-50 border-rose-200 text-rose-800" 
            : errorMessage.type === "warning"
            ? "bg-amber-50 border-amber-200 text-amber-800"
            : "bg-emerald-50 border-emerald-200 text-emerald-800"
        }`}>
          {errorMessage.type === "error" ? (
            <LuCircleAlert className="size-5 shrink-0 text-rose-500 mt-0.5" />
          ) : errorMessage.type === "warning" ? (
            <LuTriangleAlert className="size-5 shrink-0 text-amber-500 mt-0.5" />
          ) : (
            <LuCircleCheck className="size-5 shrink-0 text-emerald-500 mt-0.5" />
          )}
          <div className="text-xs font-semibold leading-relaxed">
            {errorMessage.text}
          </div>
        </div>
      )}

      {/* Modals */}
      <ConfirmModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onConfirm={() => {
          setIsSaveModalOpen(false);
          saveMembers();
        }}
        title="Save Members to Database"
        description={
          newCount > 0
            ? `You are about to save ${newCount} new members with live progress. ${
                existingCount > 0
                  ? `${existingCount} already recorded student ID(s) will NOT be overwritten and will retain their existing data.`
                  : "All members will have new accounts created."
              }`
            : `All ${existingCount} members are already recorded in the database. No new records will be saved.`
        }
        confirmText={newCount > 0 ? `Save ${newCount} New Members` : "OK"}
        variant={newCount > 0 ? "success" : "warning"}
        isLoading={isSaving}
      />

      <ConfirmModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={() => {
          setMembers([]);
          setErrorMessage(null);
          setIsClearModalOpen(false);
          toast.success("Preview list cleared.");
        }}
        title="Clear List"
        description="Are you sure you want to clear the entire preview list? All unsaved data will be lost."
        confirmText="Clear List"
        variant="danger"
      />

      <ConfirmModal
        isOpen={isRemoveDuplicatesModalOpen}
        onClose={() => setIsRemoveDuplicatesModalOpen(false)}
        onConfirm={handleRemoveAlreadyRecorded}
        title="Remove Already Recorded Members"
        description={`This will remove ${existingCount} member(s) from the preview list whose student IDs are already recorded in the database. Only new members will remain in your list.`}
        confirmText="Remove Already Recorded"
        variant="warning"
      />

      {!members.length && (
        <div className="flex justify-end mb-6">
          <Button
            variant="outline"
            className="rounded-2xl border-slate-200 h-11 px-6 font-semibold items-center gap-2 shadow-sm text-slate-600 hover:bg-white hover:text-slate-600 cursor-pointer"
            onClick={() => setIsManualModalOpen(true)}
          >
            <LuUserPlus className="size-4.5 text-primary/70" />
            <span>Add member manually</span>
          </Button>
        </div>
      )}

      {members.length === 0 ? (
        <Card
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed transition-all duration-300 group rounded-[2.5rem] ${isDragging
            ? "border-primary bg-primary/5 scale-[1.01] shadow-2xl shadow-primary/10"
            : "border-slate-200 bg-slate-50/50 hover:border-primary/50"
            }`}
        >
          <CardContent className="p-12 text-center py-24">
            <div className={`mx-auto w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6 transition-all duration-500 ${isDragging ? "scale-110 rotate-12 shadow-primary/20" : "shadow-slate-200/50 group-hover:scale-110"
              }`}>
              <LuUpload className={`size-10 transition-colors ${isDragging ? "text-primary" : "text-primary/60 group-hover:text-primary"}`} />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              {isDragging ? "Drop your file here" : "Upload Members List"}
            </h3>
            <p className="text-slate-500 max-w-sm mx-auto mb-8">
              Drop your .xlsx, .xls, or .csv file here. Make sure it has a <strong>Student ID</strong> column.
            </p>
            <div className="relative inline-block">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              <Button disabled={isUploading} className="h-12 px-8 rounded-xl font-bold gradient-primary shadow-xl shadow-primary/10 cursor-pointer">
                {isUploading ? "Processing..." : "Select File"}
              </Button>
            </div>
            <div className="mt-8 flex items-center justify-center gap-6 text-xs font-bold uppercase tracking-widest text-slate-400">
              <span className="flex items-center gap-2"><LuCircleCheck /> Fast Parallel Additions</span>
              <span className="flex items-center gap-2"><LuCircleCheck /> Live Row Animations</span>
              <span className="flex items-center gap-2"><LuCircleCheck /> Duplicate Protection</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="size-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                <LuUsers className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total in Preview</p>
                <p className="text-2xl font-black text-slate-900">{totalCount}</p>
              </div>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="size-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-200">
                <LuSparkles className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">New Members to Save</p>
                <p className="text-2xl font-black text-emerald-950">{newCount}</p>
              </div>
            </div>

            <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="size-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-200">
                <LuDatabase className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                  {inDbCount > 0 && duplicateInFileCount > 0
                    ? "In DB & File Duplicates"
                    : inDbCount > 0
                    ? "Already in Database"
                    : "Duplicates in File"} (Skipped)
                </p>
                <p className="text-2xl font-black text-amber-950">{existingCount}</p>
              </div>
            </div>
          </div>

          {/* Filter Bar & Controls */}
          <Card className="border-slate-200 shadow-sm rounded-2xl p-4">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setFilterStatus("all");
                    setCurrentPage(1);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterStatus === "all"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span>All Records</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                    filterStatus === "all" ? "bg-slate-100 text-slate-800" : "bg-slate-200 text-slate-600"
                  }`}>
                    {totalCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFilterStatus("new");
                    setCurrentPage(1);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterStatus === "new"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  <LuSparkles className="size-3.5" />
                  <span>New Only</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                    filterStatus === "new" ? "bg-emerald-700 text-white" : "bg-emerald-100 text-emerald-800"
                  }`}>
                    {newCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFilterStatus("existing");
                    setCurrentPage(1);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterStatus === "existing"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "text-amber-700 hover:bg-amber-50"
                  }`}
                >
                  <LuDatabase className="size-3.5" />
                  <span>
                    {inDbCount > 0 && duplicateInFileCount > 0
                      ? "Duplicates & In DB"
                      : inDbCount > 0
                      ? "In Database"
                      : "Duplicates in File"}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                    filterStatus === "existing" ? "bg-amber-700 text-white" : "bg-amber-100 text-amber-800"
                  }`}>
                    {existingCount}
                  </span>
                </button>
              </div>

              {/* Search & Items Per Page Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 sm:w-64">
                  <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                  <Input
                    placeholder="Search by ID, name, email..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9 pr-8 h-9 text-xs rounded-xl border-slate-200"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setCurrentPage(1);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      <LuX className="size-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400">Show:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-9 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    <option value={5}>5 / page</option>
                    <option value={10}>10 / page</option>
                    <option value={25}>25 / page</option>
                    <option value={50}>50 / page</option>
                  </select>
                </div>
              </div>
            </div>
          </Card>

          {/* Members Table */}
          <Card className="overflow-hidden border-slate-200 shadow-xl shadow-slate-200/50 rounded-3xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Student ID & Record Status</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Name</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Course & Year</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Email</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Payment Status</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Amount Paid</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Receipt</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedMembers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                        <div className="max-w-xs mx-auto space-y-2">
                          <LuFilter className="size-8 mx-auto text-slate-300" />
                          <p className="text-sm font-semibold text-slate-600">No members match your current filter</p>
                          <p className="text-xs text-slate-400">Try changing the status tab or search keyword.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedMembers.map(({ member, originalIndex, isExistingInDb, isDuplicateInBatch, isNew }) => {
                      const isCurrentlySaving = activeSavingId === member.student_id;
                      const wasJustSaved = justSavedIds.has(member.student_id);

                      return (
                        <tr 
                          key={originalIndex} 
                          className={`transition-all duration-300 ${
                            isCurrentlySaving 
                              ? "bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-400/50 shadow-md animate-pulse" 
                              : wasJustSaved
                              ? "bg-emerald-100/60 opacity-40 translate-x-3"
                              : !isNew 
                              ? "bg-amber-50/30 hover:bg-slate-50/70" 
                              : "hover:bg-slate-50/70"
                          }`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900">{member.student_id}</span>
                              {isCurrentlySaving ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-emerald-600 text-white shadow-sm animate-pulse">
                                  <LuRefreshCw className="size-3 animate-spin" /> Saving...
                                </span>
                              ) : wasJustSaved ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-emerald-700 text-white shadow-sm">
                                  <LuCheck className="size-3" /> Saved!
                                </span>
                              ) : isExistingInDb ? (
                                <span 
                                  title="This Student ID already exists in the database. When saving, this new entry will NOT overwrite the existing record."
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-amber-100 text-amber-800 border border-amber-200"
                                >
                                  <LuDatabase className="size-3" /> Already Recorded
                                </span>
                              ) : isDuplicateInBatch ? (
                                <span 
                                  title="This Student ID is duplicated in the uploaded list."
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-rose-100 text-rose-800 border border-rose-200"
                                >
                                  <LuTriangleAlert className="size-3" /> Duplicate in List
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <LuSparkles className="size-3" /> New
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">{member.first_name} {member.last_name}</div>
                            <div className="text-xs text-slate-400 font-medium">MI: {member.middle_initial || "N/A"}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-slate-700 font-medium">{member.course || "N/A"} - {member.year || "N/A"}</div>
                            <div className="text-xs text-slate-400 font-medium">Sec: {member.section || "N/A"}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-slate-900 font-medium">{member.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                              member.membership_status === 'Fully Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                              member.membership_status === 'Half Semester Paid' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                              member.membership_status === 'Partial' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                              'bg-rose-50 text-rose-600 border-rose-100'
                            }`}>
                              {member.membership_status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">₱{member.payment.toLocaleString()}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-slate-600">{member.receipt || "—"}</div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                disabled={isSaving}
                                onClick={() => handleEditRowClick(originalIndex)}
                                className="size-9 p-0 rounded-xl hover:bg-primary hover:text-white hover:border-primary transition-all cursor-pointer disabled:opacity-50"
                                title="Edit Member"
                              >
                                <LuPencil className="size-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                disabled={isSaving}
                                onClick={() => handleDeleteRow(originalIndex)}
                                className="size-9 p-0 rounded-xl hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all cursor-pointer disabled:opacity-50"
                                title="Remove from List"
                              >
                                <LuTrash2 className="size-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 sm:p-6 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Showing <span className="text-slate-900">{filteredMembers.length > 0 ? (validCurrentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(filteredMembers.length, validCurrentPage * itemsPerPage)}</span> of <span className="text-slate-900">{filteredMembers.length}</span> members
                {filteredMembers.length !== totalCount && ` (filtered from ${totalCount} total)`}
              </p>
              
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={validCurrentPage <= 1 || isSaving} 
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  className="rounded-xl px-3 py-1.5 h-9 border-slate-200 hover:bg-white transition-all disabled:opacity-50 text-xs font-bold cursor-pointer"
                >
                  <LuChevronLeft className="size-4 mr-1" /> Prev
                </Button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - validCurrentPage) <= 1)
                  .map((pageNum, index, array) => {
                    const prevNum = array[index - 1];
                    const showEllipsis = prevNum && pageNum - prevNum > 1;

                    return (
                      <React.Fragment key={pageNum}>
                        {showEllipsis && <span className="px-1 text-slate-400 text-xs font-bold">...</span>}
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`size-9 rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-50 ${
                            validCurrentPage === pageNum
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
                  disabled={validCurrentPage >= totalPages || isSaving} 
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  className="rounded-xl px-3 py-1.5 h-9 border-slate-200 hover:bg-white transition-all disabled:opacity-50 text-xs font-bold cursor-pointer"
                >
                  Next <LuChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Safety Notice */}
          <div className="bg-emerald-50/60 border border-emerald-200/80 p-4 rounded-2xl flex items-start gap-3">
            <LuCircleCheck className="text-emerald-600 size-5 mt-0.5 shrink-0" />
            <p className="text-sm text-emerald-900 font-medium">
              <strong>Safe Save Active:</strong> If a student ID is already recorded in the database, its existing record and profile data will remain untouched and <strong>will not be overwritten</strong>. Only new student records will be created.
            </p>
          </div>
        </div>
      )}

      {/* Manual Add / Edit Member Modal */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => {
          setIsManualModalOpen(false);
          setEditingIndex(null);
          setManualMember({
            student_id: "",
            first_name: "",
            middle_initial: "",
            last_name: "",
            course: "",
            section: "",
            year: "",
            email: "",
            membership_status: "Not Paid",
            payment: 0,
            receipt: ""
          });
        }}
        title={editingIndex !== null ? "Edit Member Details" : "Add Specific Member"}
      >
        <form onSubmit={editingIndex !== null ? handleManualEditSave : handleManualAdd} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Student ID *</Label>
                {manualMember.student_id && dbExistingStudentIds.has(manualMember.student_id.trim().toLowerCase()) && (
                  <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                    <LuTriangleAlert className="size-3.5" /> Already recorded in DB
                  </span>
                )}
              </div>
              <Input
                placeholder="2024-0001"
                value={manualMember.student_id}
                onChange={(e) => setManualMember({ ...manualMember, student_id: e.target.value })}
                required
                className="rounded-xl h-11"
              />
            </div>
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">First Name *</Label>
                <Input
                  placeholder="John"
                  value={manualMember.first_name}
                  onChange={(e) => setManualMember({ ...manualMember, first_name: e.target.value })}
                  required
                  className="rounded-xl h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Middle Initial</Label>
                <Input
                  placeholder="M."
                  value={manualMember.middle_initial || ""}
                  onChange={(e) => setManualMember({ ...manualMember, middle_initial: e.target.value })}
                  maxLength={5}
                  className="rounded-xl h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Last Name *</Label>
                <Input
                  placeholder="Doe"
                  value={manualMember.last_name}
                  onChange={(e) => setManualMember({ ...manualMember, last_name: e.target.value })}
                  required
                  className="rounded-xl h-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Course *</Label>
              <select
                value={manualMember.course}
                onChange={(e) => setManualMember({ ...manualMember, course: e.target.value })}
                required
                className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-800"
              >
                <option value="">Select Course</option>
                <option value="BSIT">BSIT</option>
                <option value="BSCE">BSCE</option>
                <option value="BITM">BITM</option>
                <option value="BSM">BSM</option>
                <option value="BSMRS">BSMRS</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Year Level</Label>
              <Input
                placeholder="1, 2, 3 or 4"
                value={manualMember.year}
                onChange={(e) => setManualMember({ ...manualMember, year: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Email Address *</Label>
              <Input
                type="email"
                placeholder="student@school.edu.ph"
                value={manualMember.email}
                onChange={(e) => setManualMember({ ...manualMember, email: e.target.value })}
                required
                className="rounded-xl h-11"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12 rounded-xl font-bold"
              onClick={() => {
                setIsManualModalOpen(false);
                setEditingIndex(null);
                setManualMember({
                  student_id: "",
                  first_name: "",
                  middle_initial: "",
                  last_name: "",
                  course: "",
                  section: "",
                  year: "",
                  email: "",
                  membership_status: "Not Paid",
                  payment: 0,
                  receipt: ""
                });
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 h-12 rounded-xl font-bold gradient-primary text-white shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all cursor-pointer"
            >
              {editingIndex !== null ? "Save Changes" : "Add to Preview"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
