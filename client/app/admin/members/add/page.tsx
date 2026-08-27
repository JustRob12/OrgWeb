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
  LuCheck,
  LuExternalLink,
  LuFileSpreadsheet,
  LuClock,
  LuPlay,
  LuPause
} from "react-icons/lu";
import { Button } from "@/app/Components/ui/button";
import { Card, CardContent } from "@/app/Components/ui/card";
import { Input } from "@/app/Components/ui/input";
import { Label } from "@/app/Components/ui/label";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { Modal } from "@/app/Components/ui/modal";
import { ConfirmModal } from "@/app/Components/ui/confirm-modal";

import { isValidEmail, isValidStudentId, formatStudentIdInput, normalizeStudentId } from "@/lib/utils";
import { encryptPassword } from "@/lib/encryption";

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

export interface SkippedMemberData {
  rowNumber: number;
  student_id: string;
  first_name: string;
  middle_initial?: string;
  last_name: string;
  course?: string;
  section?: string;
  year?: string;
  email: string;
  membership_status?: string;
  payment?: number;
  receipt?: string;
  reasons: string[];
}

interface PostSaveReport {
  savedCount: number;
  remainingCount: number;
  inDbCount: number;
  duplicateInListCount: number;
  failedCount: number;
  failedDetails: { name: string; student_id: string; reason: string }[];
}

export default function AddMembersPage() {
  const [members, setMembers] = useState<RawMemberData[]>([]);
  const [skippedMembers, setSkippedMembers] = useState<SkippedMemberData[]>([]);
  const [dbExistingStudentIds, setDbExistingStudentIds] = useState<Set<string>>(new Set());
  const [dbExistingEmails, setDbExistingEmails] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isRemoveDuplicatesModalOpen, setIsRemoveDuplicatesModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<{ type: "error" | "warning" | "success"; text: string } | null>(null);
  const [saveReport, setSaveReport] = useState<PostSaveReport | null>(null);
  const [memberErrors, setMemberErrors] = useState<Record<string, string>>({});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Google Sheet Link and Live Sync States (Auto-fetch every 2 minutes while page is open)
  const DEFAULT_GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1ddZMsmpNXSCF1BmsWf_ethCaTD_4DAyVf9ERvPgPias/edit?gid=258554365#gid=258554365";
  const [googleSheetUrl, setGoogleSheetUrl] = useState(DEFAULT_GOOGLE_SHEET_URL);
  const [isFetchingSheet, setIsFetchingSheet] = useState(false);
  const [autoFetchSheet, setAutoFetchSheet] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("acetrack_autofetch_add") !== "false";
    }
    return true;
  });
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [timeUntilNextSync, setTimeUntilNextSync] = useState<number>(120); // 120s = 2 minutes
  const isBusySyncingRef = React.useRef(false);
  const [isSheetUrlModalOpen, setIsSheetUrlModalOpen] = useState(false);
  const [customSheetUrlInput, setCustomSheetUrlInput] = useState(DEFAULT_GOOGLE_SHEET_URL);

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Table filtering and pagination states
  const [filterStatus, setFilterStatus] = useState<"all" | "new" | "existing" | "skipped">("all");
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

  // Helper to add all possible format variations of a student ID to a lookup set
  const addIdVariations = (id: string, targetSet: Set<string>) => {
    const clean = String(id || "").trim().toLowerCase();
    if (!clean) return;
    targetSet.add(clean);
    targetSet.add(clean.replace(/[^a-z0-9]/g, ""));
    const normalized = normalizeStudentId(clean).toLowerCase();
    if (normalized) {
      targetSet.add(normalized);
      targetSet.add(normalized.replace(/[^a-z0-9]/g, ""));
    }
  };

  // Helper to test if a student ID matches any variation in a lookup set
  const isIdInSet = (id: string, targetSet: Set<string>): boolean => {
    const clean = String(id || "").trim().toLowerCase();
    if (!clean) return false;
    if (targetSet.has(clean)) return true;
    if (targetSet.has(clean.replace(/[^a-z0-9]/g, ""))) return true;
    const normalized = normalizeStudentId(clean).toLowerCase();
    if (normalized && (targetSet.has(normalized) || targetSet.has(normalized.replace(/[^a-z0-9]/g, "")))) return true;
    return false;
  };

  // Fetch ALL existing student IDs and emails from database with pagination (handles >1000 rows)
  const fetchAllExistingRecords = useCallback(async () => {
    try {
      let allUsers: { student_id?: string | null; email?: string | null }[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("users")
          .select("student_id, email")
          .range(from, from + step - 1);

        if (error) throw error;
        if (data && data.length > 0) {
          allUsers = allUsers.concat(data);
          if (data.length < step) {
            hasMore = false;
          } else {
            from += step;
          }
        } else {
          hasMore = false;
        }
      }

      const idSet = new Set<string>();
      const emailSet = new Set<string>();

      allUsers.forEach((u) => {
        if (u.student_id) addIdVariations(u.student_id, idSet);
        if (u.email) emailSet.add(String(u.email).trim().toLowerCase());
      });

      setDbExistingStudentIds(idSet);
      setDbExistingEmails(emailSet);
      return { idSet, emailSet };
    } catch (err: unknown) {
      console.error("Error fetching existing records:", err);
      return { idSet: new Set<string>(), emailSet: new Set<string>() };
    }
  }, [supabase]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (isMounted) {
        await fetchAllExistingRecords();
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [fetchAllExistingRecords]);

  // Google Sheet Live Fetcher & Auto-Add New Members
  const syncAndAutoAddMembers = useCallback(
    async (isManualTrigger = false, customUrl?: string) => {
      if (isBusySyncingRef.current || isSaving) {
        return;
      }

      isBusySyncingRef.current = true;
      setIsFetchingSheet(true);

      const targetUrl = customUrl || googleSheetUrl;
      try {
        const response = await fetch("/api/sheets/fetch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: targetUrl }),
        });

        const resData = await response.json();

        if (!response.ok || !resData.success) {
          throw new Error(resData.error || "Failed to fetch data from Google Sheet.");
        }

        const rows: Record<string, unknown>[] = resData.data || [];
        if (rows.length === 0) {
          if (isManualTrigger) {
            toast.warning("Google Sheet was fetched, but contains 0 rows.");
          }
          setLastSyncTime(new Date());
          setTimeUntilNextSync(120);
          return;
        }

        const validatedData: RawMemberData[] = [];
        const skippedData: SkippedMemberData[] = [];

        rows.forEach((row, idx) => {
          const rowNum = idx + 2; // header is row 1
          const rawStudentId = String(row.student_id || row["Student ID"] || row["ID"] || row["id"] || "").trim();
          const studentId = normalizeStudentId(rawStudentId) || rawStudentId;
          const firstName = String(row.first_name || row["First Name"] || row["Firstname"] || row["firstname"] || "").trim();
          const lastName = String(row.last_name || row["Last Name"] || row["Lastname"] || row["lastname"] || "").trim();
          const email = String(row.email || row["Email"] || row["Email Address"] || "").trim().toLowerCase();

          const reasons: string[] = [];
          if (!studentId) reasons.push("Missing Student ID");
          if (!firstName) reasons.push("Missing First Name");
          if (!lastName) reasons.push("Missing Last Name");
          if (!email) {
            reasons.push("Missing Email");
          } else if (!isValidEmail(email)) {
            reasons.push("Invalid Email Address");
          }

          if (reasons.length > 0) {
            skippedData.push({
              rowNumber: rowNum,
              student_id: rawStudentId,
              first_name: firstName,
              middle_initial: String(row.middle_initial || row["Middle Initial"] || row["MI"] || row["M.I."] || "").trim(),
              last_name: lastName,
              course: String(row.course || row["Course"] || row["program"] || "").trim(),
              section: String(row.section || row["Section"] || row["sec"] || "").trim(),
              year: String(row.year || row["Year"] || row["yr"] || "").trim(),
              email: email,
              membership_status: "Not Paid",
              payment: Number(row.payment || row["Payment"] || row["Amount"] || row["amount"] || 0) || 0,
              receipt: String(row.receipt || row["Receipt"] || row["Receipt Number"] || row["Receipt No"] || "").trim(),
              reasons,
            });
            return;
          }

          const rawStatus = String(row.membership_status || row["Membership Status"] || row["Status"] || row["status"] || "Not Paid").trim();
          const validStatuses = ["Partial", "Fully Paid", "Not Paid", "Half Semester Paid"] as const;
          const membershipStatus = (validStatuses.includes(rawStatus as typeof validStatuses[number])
            ? rawStatus
            : "Not Paid") as RawMemberData["membership_status"];

          validatedData.push({
            student_id: studentId,
            first_name: firstName,
            middle_initial: String(row.middle_initial || row["Middle Initial"] || row["MI"] || row["M.I."] || "").trim(),
            last_name: lastName,
            course: String(row.course || row["Course"] || row["program"] || "").trim(),
            section: String(row.section || row["Section"] || row["sec"] || "").trim(),
            year: String(row.year || row["Year"] || row["yr"] || "").trim(),
            email: email,
            membership_status: membershipStatus,
            payment: Number(row.payment || row["Payment"] || row["Amount"] || row["amount"] || 0) || 0,
            receipt: String(row.receipt || row["Receipt"] || row["Receipt Number"] || row["Receipt No"] || "").trim(),
          });
        });

        setSkippedMembers([...skippedData].reverse());

        // Fetch fresh database records with pagination
        const { idSet: freshExistingStudentIds, emailSet: freshExistingEmails } = await fetchAllExistingRecords();

        // Identify new members to auto-add
        const membersToAutoAdd: RawMemberData[] = [];
        const seenInBatch = new Set<string>();
        const seenEmailsInBatch = new Set<string>();

        validatedData.forEach((m) => {
          const sKey = String(m.student_id || "").trim().toLowerCase();
          const emailKey = String(m.email || "").trim().toLowerCase();

          const inDb = isIdInSet(sKey, freshExistingStudentIds) || (emailKey && freshExistingEmails.has(emailKey));
          const seenInBatchCheck = isIdInSet(sKey, seenInBatch) || (emailKey && seenEmailsInBatch.has(emailKey));

          if (!inDb && !seenInBatchCheck) {
            if (sKey) addIdVariations(sKey, seenInBatch);
            if (emailKey) seenEmailsInBatch.add(emailKey);
            membersToAutoAdd.push(m);
          }
        });

        // Automatically save new people into Supabase
        let autoAddedCount = 0;
        if (membersToAutoAdd.length > 0) {
          for (const member of membersToAutoAdd) {
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

              // 2. Concurrently insert Account and Membership
              const defaultPassword = member.student_id ? member.student_id.trim() : "0000-0000";
              const encDefault = encryptPassword(defaultPassword);

              const { error: accErr } = await supabase.from("accounts").insert({
                user_id: userData.id,
                username: member.email.trim(),
                password: defaultPassword,
                encrypted_password: encDefault,
                role: 1, // Student
                must_change_password: true,
              });

              if (accErr) {
                await supabase.from("accounts").insert({
                  user_id: userData.id,
                  username: member.email.trim(),
                  password: defaultPassword,
                  role: 1,
                });
              }

              const { error: memErr } = await supabase.from("memberships").insert({
                user_id: userData.id,
                status: member.membership_status,
                payment: member.payment || 0,
                receipt: member.receipt?.trim() || null,
              });

              if (memErr) throw memErr;

              autoAddedCount++;
              addIdVariations(member.student_id, freshExistingStudentIds);
              freshExistingEmails.add(member.email.trim().toLowerCase());
            } catch (memberErr) {
              console.error("Auto-sync error adding member:", member.student_id, memberErr);
            }
          }

          // Update cached database student IDs & Emails
          setDbExistingStudentIds(new Set(freshExistingStudentIds));
          setDbExistingEmails(new Set(freshExistingEmails));

          toast.success(
            `🎉 Auto-Sync: Automatically added ${autoAddedCount} new member(s) from Google Sheet into the database!`
          );
        } else if (isManualTrigger) {
          toast.info(
            `Google Sheet checked: All ${validatedData.length} records are already up to date in the database.`
          );
        }

        // Set members preview to the validated rows from sheet (newest / last inserted displayed first)
        setMembers([...validatedData].reverse());

        if (skippedData.length > 0 && isManualTrigger) {
          setErrorMessage({
            type: "warning",
            text: `Skipped ${skippedData.length} row(s) due to missing Student ID, missing name, or invalid email address.`,
          });
        }
      } catch (err: any) {
        console.error("Google sheet auto-sync error:", err);
        if (isManualTrigger) {
          toast.error(err.message || "Failed to fetch from Google Sheet.");
          setErrorMessage({
            type: "error",
            text: err.message || "Failed to fetch Google Sheet data. Please check permissions.",
          });
        }
      } finally {
        setLastSyncTime(new Date());
        setTimeUntilNextSync(120);
        isBusySyncingRef.current = false;
        setIsFetchingSheet(false);
      }
    },
    [googleSheetUrl, isSaving, fetchAllExistingRecords, supabase]
  );

  // Auto-sync polling every 2 minutes (120 seconds), ONLY while on this page
  useEffect(() => {
    if (!autoFetchSheet) return;

    // Initial fetch and auto-add when opening page
    syncAndAutoAddMembers(false);
    setTimeUntilNextSync(120);

    // 1-second interval to update countdown and trigger every 120s (2 minutes)
    const interval = setInterval(() => {
      setTimeUntilNextSync((prev) => {
        if (prev <= 1) {
          syncAndAutoAddMembers(false);
          return 120;
        }
        return prev - 1;
      });
    }, 1000);

    // Clear interval when navigating away from this page (component unmounts)
    return () => {
      clearInterval(interval);
    };
  }, [autoFetchSheet, syncAndAutoAddMembers]);

  const handleToggleAutoSync = () => {
    const next = !autoFetchSheet;
    setAutoFetchSheet(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("acetrack_autofetch_add", String(next));
    }
    if (next) {
      toast.info("Auto-sync enabled: Fetching and automatically adding new members every 2 minutes.");
      syncAndAutoAddMembers(true);
      setTimeUntilNextSync(120);
    } else {
      toast.info("Auto-sync turned OFF. You can now fetch data for preview and save manually.");
    }
  };

  // Google Sheet Fetch for Preview Only (Used when Auto-Sync is OFF so user can review before saving)
  const handleFetchPreviewOnly = async (customUrl?: string) => {
    if (isBusySyncingRef.current || isSaving) return;

    isBusySyncingRef.current = true;
    setIsFetchingSheet(true);
    setErrorMessage(null);

    const targetUrl = customUrl || googleSheetUrl;
    try {
      const response = await fetch("/api/sheets/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || "Failed to fetch data from Google Sheet.");
      }

      const rows: Record<string, unknown>[] = resData.data || [];
      if (rows.length === 0) {
        toast.warning("Google Sheet was fetched, but contains 0 rows.");
        return;
      }

      const validatedData: RawMemberData[] = [];
      const skippedData: SkippedMemberData[] = [];

      rows.forEach((row, idx) => {
        const rowNum = idx + 2; // header is row 1
        const rawStudentId = String(row.student_id || row["Student ID"] || row["ID"] || row["id"] || "").trim();
        const studentId = normalizeStudentId(rawStudentId) || rawStudentId;
        const firstName = String(row.first_name || row["First Name"] || row["Firstname"] || row["firstname"] || "").trim();
        const lastName = String(row.last_name || row["Last Name"] || row["Lastname"] || row["lastname"] || "").trim();
        const email = String(row.email || row["Email"] || row["Email Address"] || "").trim().toLowerCase();

        const reasons: string[] = [];
        if (!studentId) reasons.push("Missing Student ID");
        if (!firstName) reasons.push("Missing First Name");
        if (!lastName) reasons.push("Missing Last Name");
        if (!email) {
          reasons.push("Missing Email");
        } else if (!isValidEmail(email)) {
          reasons.push("Invalid Email Address");
        }

        if (reasons.length > 0) {
          skippedData.push({
            rowNumber: rowNum,
            student_id: rawStudentId,
            first_name: firstName,
            middle_initial: String(row.middle_initial || row["Middle Initial"] || row["MI"] || row["M.I."] || "").trim(),
            last_name: lastName,
            course: String(row.course || row["Course"] || row["program"] || "").trim(),
            section: String(row.section || row["Section"] || row["sec"] || "").trim(),
            year: String(row.year || row["Year"] || row["yr"] || "").trim(),
            email: email,
            membership_status: "Not Paid",
            payment: Number(row.payment || row["Payment"] || row["Amount"] || row["amount"] || 0) || 0,
            receipt: String(row.receipt || row["Receipt"] || row["Receipt Number"] || row["Receipt No"] || "").trim(),
            reasons,
          });
          return;
        }

        const rawStatus = String(row.membership_status || row["Membership Status"] || row["Status"] || row["status"] || "Not Paid").trim();
        const validStatuses = ["Partial", "Fully Paid", "Not Paid", "Half Semester Paid"] as const;
        const membershipStatus = (validStatuses.includes(rawStatus as typeof validStatuses[number])
          ? rawStatus
          : "Not Paid") as RawMemberData["membership_status"];

        validatedData.push({
          student_id: studentId,
          first_name: firstName,
          middle_initial: String(row.middle_initial || row["Middle Initial"] || row["MI"] || row["M.I."] || "").trim(),
          last_name: lastName,
          course: String(row.course || row["Course"] || row["program"] || "").trim(),
          section: String(row.section || row["Section"] || row["sec"] || "").trim(),
          year: String(row.year || row["Year"] || row["yr"] || "").trim(),
          email: email,
          membership_status: membershipStatus,
          payment: Number(row.payment || row["Payment"] || row["Amount"] || row["amount"] || 0) || 0,
          receipt: String(row.receipt || row["Receipt"] || row["Receipt Number"] || row["Receipt No"] || "").trim(),
        });
      });

      // Display in reverse (latest row on page 1)
      setMembers([...validatedData].reverse());
      setSkippedMembers([...skippedData].reverse());
      setCurrentPage(1);

      const { idSet: existingDbSet, emailSet: existingEmailSet } = await fetchAllExistingRecords();
      const seenInFile = new Set<string>();
      const seenEmailsInFile = new Set<string>();
      let inDbCount = 0;
      let inBatchDuplicateCount = 0;
      let newMemberCount = 0;

      validatedData.forEach((m) => {
        const sKey = String(m.student_id || "").trim().toLowerCase();
        const emailKey = String(m.email || "").trim().toLowerCase();

        const inDb = isIdInSet(sKey, existingDbSet) || (emailKey && existingEmailSet.has(emailKey));
        const seenInBatch = isIdInSet(sKey, seenInFile) || (emailKey && seenEmailsInFile.has(emailKey));

        if (inDb) {
          inDbCount++;
        } else if (seenInBatch) {
          inBatchDuplicateCount++;
        } else {
          newMemberCount++;
        }

        if (sKey) addIdVariations(sKey, seenInFile);
        if (emailKey) seenEmailsInFile.add(emailKey);
      });

      toast.success(
        `Fetched ${validatedData.length} rows from Google Sheet (${newMemberCount} new to review/save, ${inDbCount} already in database).`
      );

      if (skippedData.length > 0) {
        setErrorMessage({
          type: "warning",
          text: `Skipped ${skippedData.length} row(s) due to missing Student ID, missing name, or invalid email address.`,
        });
      }
    } catch (err: any) {
      console.error("Google sheet fetch preview error:", err);
      toast.error(err.message || "Failed to fetch from Google Sheet.");
      setErrorMessage({
        type: "error",
        text: err.message || "Failed to fetch Google Sheet data. Please check connection or permissions.",
      });
    } finally {
      isBusySyncingRef.current = false;
      setIsFetchingSheet(false);
    }
  };

  const processFile = async (file: File) => {
    setIsUploading(true);
    setErrorMessage(null);
    setSaveReport(null);
    setMemberErrors({});

    // Refresh all existing student IDs & emails from database with full pagination
    const { idSet: existingDbSet, emailSet: existingEmailSet } = await fetchAllExistingRecords();

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary", raw: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as Record<string, unknown>[];

        const validatedData: RawMemberData[] = [];
        const skippedData: SkippedMemberData[] = [];

        data.forEach((row, idx) => {
          const rowNum = idx + 2;
          const rawStudentId = String(row.student_id || row["Student ID"] || row["ID"] || "").trim();
          const studentId = normalizeStudentId(rawStudentId);
          const firstName = String(row.first_name || row["First Name"] || "").trim();
          const lastName = String(row.last_name || row["Last Name"] || "").trim();
          const email = String(row.email || row["Email"] || "").trim().toLowerCase();

          const reasons: string[] = [];
          if (!studentId) reasons.push("Missing Student ID");
          if (!firstName) reasons.push("Missing First Name");
          if (!lastName) reasons.push("Missing Last Name");
          if (!email) {
            reasons.push("Missing Email");
          } else if (!isValidEmail(email)) {
            reasons.push("Invalid Email Address");
          }

          if (reasons.length > 0) {
            skippedData.push({
              rowNumber: rowNum,
              student_id: rawStudentId,
              first_name: firstName,
              middle_initial: String(row.middle_initial || row["Middle Initial"] || row["MI"] || "").trim(),
              last_name: lastName,
              course: String(row.course || row["Course"] || "").trim(),
              section: String(row.section || row["Section"] || "").trim(),
              year: String(row.year || row["Year"] || "").trim(),
              email: email,
              membership_status: "Not Paid",
              payment: Number(row.payment || row["Payment"] || row["Amount"] || 0) || 0,
              receipt: String(row.receipt || row["Receipt"] || row["Receipt Number"] || row["Receipt No"] || "").trim(),
              reasons,
            });
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

        // Display latest / last inserted rows first on the first page
        setMembers([...validatedData].reverse());
        setSkippedMembers([...skippedData].reverse());
        setCurrentPage(1);

        // Accurate breakdown of incoming file rows
        const seenInFile = new Set<string>();
        const seenEmailsInFile = new Set<string>();
        let inDbCount = 0;
        let inBatchDuplicateCount = 0;
        let newMemberCount = 0;

        validatedData.forEach((m) => {
          const sKey = String(m.student_id || "").trim().toLowerCase();
          const emailKey = String(m.email || "").trim().toLowerCase();

          const inDb = isIdInSet(sKey, existingDbSet) || (emailKey && existingEmailSet.has(emailKey));
          const seenInBatch = isIdInSet(sKey, seenInFile) || (emailKey && seenEmailsInFile.has(emailKey));

          if (inDb) {
            inDbCount++;
          } else if (seenInBatch) {
            inBatchDuplicateCount++;
          } else {
            newMemberCount++;
          }

          if (sKey) addIdVariations(sKey, seenInFile);
          if (emailKey) seenEmailsInFile.add(emailKey);
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

        if (skippedData.length > 0) {
          setErrorMessage({
            type: "warning",
            text: `Skipped ${skippedData.length} row(s) due to missing Student ID, missing name, or invalid email address.`
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

    const sId = normalizeStudentId(manualMember.student_id.trim());

    // Basic required fields validation
    if (!sId || !manualMember.first_name || !manualMember.last_name || !manualMember.email) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (!isValidEmail(manualMember.email)) {
      toast.error("Please enter a complete email address (e.g. name@gmail.com). Incomplete domains like @gma are not allowed.");
      return;
    }

    const sIdKey = sId.toLowerCase();
    const isAlreadyInDb = isIdInSet(sIdKey, dbExistingStudentIds) || (manualMember.email && dbExistingEmails.has(manualMember.email.trim().toLowerCase()));
    const isAlreadyInList = members.some((m) => {
      const mId = m.student_id.trim().toLowerCase();
      const mEmail = m.email.trim().toLowerCase();
      return isIdInSet(mId, new Set([sIdKey])) || (manualMember.email && mEmail === manualMember.email.trim().toLowerCase());
    });

    setErrorMessage(null);
    setMembers((prev) => [{ ...manualMember, student_id: sId }, ...prev]);
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

    const sId = normalizeStudentId(manualMember.student_id.trim());

    if (!sId || !manualMember.first_name || !manualMember.last_name || !manualMember.email) {
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
        next[editingIndex] = { ...manualMember, student_id: sId };
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
    setSaveReport(null);
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

  // Compute members with metadata (isNew, isExistingInDb, isDuplicateInBatch, failureReason)
  const seenSoFar = new Set<string>();
  const seenEmailsSoFar = new Set<string>();

  const membersWithStatus = members.map((member, originalIndex) => {
    const sId = String(member.student_id || "").trim().toLowerCase();
    const email = String(member.email || "").trim().toLowerCase();

    const isExistingId = isIdInSet(sId, dbExistingStudentIds);
    const isExistingEmail = email ? dbExistingEmails.has(email) : false;
    const isExistingInDb = isExistingId || isExistingEmail;

    const isDuplicateId = isIdInSet(sId, seenSoFar);
    const isDuplicateEmail = email ? seenEmailsSoFar.has(email) : false;
    const isDuplicateInBatch = isDuplicateId || isDuplicateEmail;

    const failureReason = memberErrors[member.student_id] || null;
    const isNew = !isExistingInDb && !isDuplicateInBatch && !failureReason;

    if (sId) addIdVariations(sId, seenSoFar);
    if (email) seenEmailsSoFar.add(email);

    return {
      member,
      originalIndex,
      isExistingInDb,
      isExistingId,
      isExistingEmail,
      isDuplicateInBatch,
      isDuplicateId,
      isDuplicateEmail,
      failureReason,
      isNew,
    };
  });

  // Accurate non-overlapping counts for summary & filter tabs
  const totalCount = members.length;
  const newCount = membersWithStatus.filter((item) => item.isNew).length;
  const existingCount = totalCount - newCount;
  const inDbCount = membersWithStatus.filter((item) => item.isExistingInDb).length;
  const duplicateInFileCount = membersWithStatus.filter((item) => !item.isExistingInDb && item.isDuplicateInBatch).length;

  // Handle fixing a skipped row
  const handleFixSkippedRow = (skipped: SkippedMemberData) => {
    setManualMember({
      student_id: skipped.student_id || "",
      first_name: skipped.first_name || "",
      middle_initial: skipped.middle_initial || "",
      last_name: skipped.last_name || "",
      course: skipped.course || "",
      section: skipped.section || "",
      year: skipped.year || "",
      email: skipped.email || "",
      membership_status: (skipped.membership_status as any) || "Not Paid",
      payment: skipped.payment || 0,
      receipt: skipped.receipt || "",
    });
    setEditingIndex(null);
    setIsManualModalOpen(true);
  };

  // Filtered skipped members
  const filteredSkippedMembers = useMemo(() => {
    return skippedMembers.filter((item) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = `${item.first_name} ${item.last_name}`.toLowerCase().includes(query);
        const matchesId = item.student_id.toLowerCase().includes(query);
        const matchesEmail = item.email.toLowerCase().includes(query);
        const matchesCourse = (item.course || "").toLowerCase().includes(query);
        const matchesSection = (item.section || "").toLowerCase().includes(query);
        const matchesReasons = item.reasons.some((r) => r.toLowerCase().includes(query));

        if (!matchesName && !matchesId && !matchesEmail && !matchesCourse && !matchesSection && !matchesReasons) {
          return false;
        }
      }
      return true;
    });
  }, [skippedMembers, searchQuery]);

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
  const isSkippedTab = filterStatus === "skipped";
  const activeTotalForPagination = isSkippedTab ? filteredSkippedMembers.length : filteredMembers.length;
  const totalPages = Math.max(1, Math.ceil(activeTotalForPagination / itemsPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedMembers = useMemo(() => {
    const start = (validCurrentPage - 1) * itemsPerPage;
    return filteredMembers.slice(start, start + itemsPerPage);
  }, [filteredMembers, validCurrentPage, itemsPerPage]);

  const paginatedSkippedMembers = useMemo(() => {
    const start = (validCurrentPage - 1) * itemsPerPage;
    return filteredSkippedMembers.slice(start, start + itemsPerPage);
  }, [filteredSkippedMembers, validCurrentPage, itemsPerPage]);

  const saveMembers = async () => {
    if (members.length === 0) return;

    setIsSaving(true);
    setErrorMessage(null);
    setSaveReport(null);
    let successCount = 0;
    let errorCount = 0;
    const failedDetailsList: { name: string; student_id: string; reason: string }[] = [];

    try {
      // 1. Fresh check against DB with full pagination to get all existing student IDs and emails
      const { idSet: freshExistingStudentIds, emailSet: freshExistingEmails } = await fetchAllExistingRecords();

      // Separate new members to save vs already recorded members to keep untouched
      const membersToProcess: RawMemberData[] = [];
      const duplicateMembers: RawMemberData[] = [];
      const seenInBatch = new Set<string>();
      const seenEmailsInBatch = new Set<string>();

      for (const m of members) {
        const sKey = String(m.student_id || "").trim().toLowerCase();
        const eKey = String(m.email || "").trim().toLowerCase();

        const inDb = isIdInSet(sKey, freshExistingStudentIds) || (eKey && freshExistingEmails.has(eKey));
        const inBatch = isIdInSet(sKey, seenInBatch) || (eKey && seenEmailsInBatch.has(eKey));

        if (inDb || inBatch) {
          duplicateMembers.push(m);
        } else {
          if (sKey) addIdVariations(sKey, seenInBatch);
          if (eKey) seenEmailsInBatch.add(eKey);
          membersToProcess.push(m);
        }
      }

      if (membersToProcess.length === 0) {
        const inDb = duplicateMembers.filter((m) => {
          const sId = String(m.student_id || "").trim().toLowerCase();
          const email = String(m.email || "").trim().toLowerCase();
          return isIdInSet(sId, freshExistingStudentIds) || (email && freshExistingEmails.has(email));
        }).length;
        const dups = duplicateMembers.length - inDb;

        setSaveReport({
          savedCount: 0,
          remainingCount: duplicateMembers.length,
          inDbCount: inDb,
          duplicateInListCount: dups,
          failedCount: 0,
          failedDetails: [],
        });

        setErrorMessage({
          type: "warning",
          text: `No new members were saved because all ${duplicateMembers.length} student ID(s) are already recorded in the database or duplicated in the list. Their existing data was kept intact.`
        });
        toast.warning("All records already exist in the database or are duplicates. No changes were made.");
        setIsSaving(false);
        return;
      }

      const totalToSave = membersToProcess.length;
      let currentProgressIndex = 0;

      // Process each new student sequentially with high-speed parallel inserts and live animated removal
      for (const member of membersToProcess) {
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
          const encDefault = encryptPassword(defaultPassword);
          
          let accountError = null;
          const { error: accErr } = await supabase.from("accounts").insert({
            user_id: userData.id,
            username: member.email.trim(),
            password: defaultPassword,
            encrypted_password: encDefault,
            role: 1, // Student
            must_change_password: true,
          });

          if (accErr) {
            const { error: retryAccErr } = await supabase.from("accounts").insert({
              user_id: userData.id,
              username: member.email.trim(),
              password: defaultPassword,
              role: 1,
            });
            if (retryAccErr) accountError = retryAccErr;
          }

          const { error: memErr } = await supabase.from("memberships").insert({
            user_id: userData.id,
            status: member.membership_status,
            payment: member.payment || 0,
            receipt: member.receipt?.trim() || null,
          });

          if (accountError) throw accountError;
          if (memErr) throw memErr;

          successCount++;
          addIdVariations(member.student_id, freshExistingStudentIds);
          freshExistingEmails.add(member.email.trim().toLowerCase());

          // Mark as saved for brief visual feedback animation
          setJustSavedIds((prev) => new Set([...prev, member.student_id]));

          // Brief delay so user perceives the row's dynamic completion animation
          await new Promise((resolve) => setTimeout(resolve, 140));

          // Animate-out: remove the saved student row live from the table list!
          setMembers((prev) => prev.filter((m) => m.student_id !== member.student_id));
        } catch (error: any) {
          const errorMsg = error?.message || error?.error_description || (error instanceof Error ? error.message : JSON.stringify(error));
          console.error("Error saving member:", member.email, errorMsg);
          errorCount++;
          
          const isUniqueConstraint = errorMsg.includes("duplicate key value") || errorMsg.includes("unique constraint");
          const cleanReason = isUniqueConstraint
            ? errorMsg.includes("users_email_key") || errorMsg.includes("accounts_username_key")
              ? "Email is already registered to another account"
              : "Student ID is already recorded in the database"
            : errorMsg;

          // If database rejected due to uniqueness, record it in existing sets so it appears in the In DB tab
          if (isUniqueConstraint) {
            addIdVariations(member.student_id, freshExistingStudentIds);
            freshExistingEmails.add(member.email.trim().toLowerCase());
          }

          failedDetailsList.push({
            name: `${member.first_name} ${member.last_name}`,
            student_id: member.student_id,
            reason: cleanReason,
          });

          setMemberErrors((prev) => ({
            ...prev,
            [member.student_id]: cleanReason,
          }));
        }
      }

      // Update cached database student IDs & Emails
      setDbExistingStudentIds(new Set(freshExistingStudentIds));
      setDbExistingEmails(new Set(freshExistingEmails));

      const remainingTotal = duplicateMembers.length + errorCount;
      const alreadyInDbRemaining = duplicateMembers.filter((m) => {
        const sId = String(m.student_id || "").trim().toLowerCase();
        const email = String(m.email || "").trim().toLowerCase();
        return isIdInSet(sId, freshExistingStudentIds) || (email && freshExistingEmails.has(email));
      }).length + failedDetailsList.filter((f) => f.reason.includes("already")).length;

      const duplicatesInListRemaining = Math.max(0, remainingTotal - alreadyInDbRemaining);

      setSaveReport({
        savedCount: successCount,
        remainingCount: remainingTotal,
        inDbCount: alreadyInDbRemaining,
        duplicateInListCount: duplicatesInListRemaining,
        failedCount: errorCount,
        failedDetails: failedDetailsList,
      });

      if (successCount > 0 && remainingTotal === 0) {
        setErrorMessage({
          type: "success",
          text: `🎉 Successfully saved all ${successCount} new member(s) to the database!`
        });
        toast.success(`Successfully saved all ${successCount} members!`);
      } else if (successCount > 0 && remainingTotal > 0) {
        setErrorMessage({
          type: "warning",
          text: `Saved ${successCount} new member(s). ${remainingTotal} student(s) remain unsaved in your list (see detailed reasons below).`
        });
        toast.warning(
          `Saved ${successCount} students. ${remainingTotal} student(s) were not added.`
        );
      } else if (successCount === 0) {
        setErrorMessage({
          type: "error",
          text: `Unable to save members. All ${remainingTotal} student(s) are already recorded in the database or encountered errors.`
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
    <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">Add New Members</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Upload Excel/CSV files to bulk-create student accounts.</p>
        </div>

        {members.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              size="sm"
              disabled={isSaving}
              onClick={() => setIsManualModalOpen(true)}
              className="rounded-xl h-9 sm:h-10 px-3 sm:px-4 font-semibold text-xs sm:text-sm text-slate-700 hover:bg-slate-100 cursor-pointer disabled:opacity-50 flex-1 sm:flex-initial justify-center"
            >
              <LuPlus className="size-4 mr-1 text-primary" /> Manually Add
            </Button>
            
            {existingCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                disabled={isSaving}
                onClick={() => setIsRemoveDuplicatesModalOpen(true)}
                className="rounded-xl h-9 sm:h-10 px-3 sm:px-4 font-semibold text-xs sm:text-sm border-amber-200 text-amber-800 bg-amber-50 hover:bg-amber-100 cursor-pointer disabled:opacity-50 flex-1 sm:flex-initial justify-center"
              >
                <LuTrash2 className="size-4 mr-1 text-amber-600" /> Remove Already Recorded ({existingCount})
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              disabled={isSaving}
              onClick={() => setIsClearModalOpen(true)}
              className="rounded-xl h-9 sm:h-10 px-3 sm:px-4 font-semibold text-xs sm:text-sm text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 cursor-pointer disabled:opacity-50 flex-1 sm:flex-initial justify-center"
            >
              <LuX className="size-4 mr-1" /> Clear List
            </Button>

            <Button
              size="sm"
              onClick={() => setIsSaveModalOpen(true)}
              loading={isSaving}
              disabled={newCount === 0 || isSaving}
              className="rounded-xl h-9 sm:h-10 px-4 sm:px-5 font-bold text-xs sm:text-sm gradient-primary text-white shadow-lg shadow-primary/20 hover:shadow-primary/40 cursor-pointer disabled:opacity-50 w-full sm:w-auto justify-center"
            >
              <LuSave className="size-4 mr-1.5" /> {isSaving ? "Saving..." : `Save ${newCount > 0 ? `(${newCount} New)` : ""}`}
            </Button>
          </div>
        )}
      </div>

      {/* Live Saving Animated Progress Banner */}
      {isSaving && savingProgress && (
        <div className="bg-gradient-to-r from-emerald-50 via-primary/5 to-emerald-50 border-2 border-emerald-400/40 rounded-3xl p-4 sm:p-5 shadow-lg shadow-emerald-500/10 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="size-10 sm:size-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-200 shrink-0">
                <LuRefreshCw className="size-5 animate-spin" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2 flex-wrap">
                  <span>Adding Students to Database</span>
                  <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black">
                    {savingProgress.current} / {savingProgress.total}
                  </span>
                </h4>
                <p className="text-xs font-semibold text-slate-500 mt-0.5 truncate max-w-xs sm:max-w-md">
                  Currently adding: <strong className="text-emerald-700">{savingProgress.currentName}</strong> ({savingProgress.currentId})
                </p>
              </div>
            </div>
            <div className="text-right sm:text-right shrink-0">
              <span className="text-xl sm:text-2xl font-black text-emerald-600">
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

      {/* Summary Banner / Post-Save Detailed Status Banner */}
      {saveReport ? (
        <div className={`p-4 sm:p-6 rounded-3xl border shadow-md animate-in fade-in slide-in-from-top-3 duration-300 ${
          saveReport.remainingCount === 0 && saveReport.savedCount > 0
            ? "bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-emerald-300 text-emerald-950"
            : saveReport.savedCount > 0
            ? "bg-gradient-to-r from-amber-50 via-orange-50/70 to-amber-50 border-amber-300 text-amber-950"
            : "bg-gradient-to-r from-rose-50 via-red-50 to-rose-50 border-rose-300 text-rose-950"
        }`}>
          <div className="flex flex-col md:flex-row items-start justify-between gap-4 sm:gap-5">
            <div className="flex items-start gap-3 sm:gap-4 w-full md:w-auto">
              <div className={`size-10 sm:size-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                saveReport.remainingCount === 0 && saveReport.savedCount > 0
                  ? "bg-emerald-500 text-white shadow-emerald-500/20"
                  : saveReport.savedCount > 0
                  ? "bg-amber-500 text-white shadow-amber-500/20"
                  : "bg-rose-500 text-white shadow-rose-500/20"
              }`}>
                {saveReport.remainingCount === 0 && saveReport.savedCount > 0 ? (
                  <LuCircleCheck className="size-5 sm:size-6" />
                ) : saveReport.savedCount > 0 ? (
                  <LuTriangleAlert className="size-5 sm:size-6" />
                ) : (
                  <LuCircleAlert className="size-5 sm:size-6" />
                )}
              </div>

              <div className="space-y-2 min-w-0 flex-1">
                <div>
                  <h3 className="text-sm sm:text-base md:text-lg font-black tracking-tight text-slate-900 leading-snug">
                    {saveReport.remainingCount === 0 && saveReport.savedCount > 0 ? (
                      `🎉 All ${saveReport.savedCount} Members Successfully Added to Database!`
                    ) : saveReport.savedCount > 0 ? (
                      `✅ Saved ${saveReport.savedCount} Student(s) • ⚠️ ${saveReport.remainingCount} Student(s) Remain Unsaved`
                    ) : (
                      `⚠️ Unable to Save ${saveReport.remainingCount} Student(s)`
                    )}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
                    Batch saving animation completed. See the detailed breakdown below for why remaining students were not saved.
                  </p>
                </div>

                {saveReport.remainingCount > 0 && (
                  <div className="bg-white/80 border border-slate-200/80 rounded-2xl p-3 sm:p-3.5 space-y-2 text-xs font-semibold text-slate-700 shadow-xs">
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      <LuCircleAlert className="size-4 text-amber-600 shrink-0" />
                      Detailed reason(s) why remaining students were not added:
                    </p>
                    <ul className="space-y-1.5 pl-1 text-slate-600">
                      {saveReport.inDbCount > 0 && (
                        <li className="flex items-start gap-2">
                          <span className="size-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                          <span>
                            <strong className="text-amber-900">{saveReport.inDbCount} student(s)</strong> are already recorded in the database. Their existing student records were preserved to prevent overwriting.
                          </span>
                        </li>
                      )}
                      {saveReport.duplicateInListCount > 0 && (
                        <li className="flex items-start gap-2">
                          <span className="size-2 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                          <span>
                            <strong className="text-orange-900">{saveReport.duplicateInListCount} student(s)</strong> have duplicate Student IDs inside your uploaded preview file.
                          </span>
                        </li>
                      )}
                      {saveReport.failedCount > 0 && (
                        <li className="flex items-start gap-2">
                          <span className="size-2 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                          <span>
                            <strong className="text-rose-900">{saveReport.failedCount} student(s)</strong> encountered database insertion errors (e.g. email or username conflict with another account).
                          </span>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Direct Action Buttons on Banner */}
            {saveReport.remainingCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto justify-stretch sm:justify-end">
                {saveReport.inDbCount + saveReport.duplicateInListCount > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRemoveAlreadyRecorded}
                    className="rounded-xl h-9 text-xs font-bold border-amber-300 bg-white hover:bg-amber-50 text-amber-900 shadow-xs cursor-pointer flex-1 sm:flex-none justify-center"
                  >
                    <LuTrash2 className="size-3.5 mr-1 text-amber-700" />
                    Remove Recorded ({saveReport.inDbCount + saveReport.duplicateInListCount})
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setMembers([]);
                    setSaveReport(null);
                    setMemberErrors({});
                    setErrorMessage(null);
                    toast.success("Preview list cleared.");
                  }}
                  className="rounded-xl h-9 text-xs font-bold border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs cursor-pointer flex-1 sm:flex-none justify-center"
                >
                  <LuX className="size-3.5 mr-1" /> Clear Remaining
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : errorMessage ? (
        <div className={`p-3.5 sm:p-4 rounded-2xl flex items-start justify-between gap-3 border animate-in fade-in slide-in-from-top-2 duration-300 ${
          errorMessage.type === "error" 
            ? "bg-rose-50 border-rose-200 text-rose-800" 
            : errorMessage.type === "warning"
            ? "bg-amber-50 border-amber-200 text-amber-900"
            : "bg-emerald-50 border-emerald-200 text-emerald-800"
        }`}>
          <div className="flex items-start gap-3">
            {errorMessage.type === "error" ? (
              <LuCircleAlert className="size-5 shrink-0 text-rose-500 mt-0.5" />
            ) : errorMessage.type === "warning" ? (
              <LuTriangleAlert className="size-5 shrink-0 text-amber-500 mt-0.5" />
            ) : (
              <LuCircleCheck className="size-5 shrink-0 text-emerald-500 mt-0.5" />
            )}
            <div className="text-xs font-semibold leading-relaxed">
              <span>{errorMessage.text}</span>
              {skippedMembers.length > 0 && filterStatus !== "skipped" && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterStatus("skipped");
                    setCurrentPage(1);
                  }}
                  className="ml-2 font-black underline hover:text-amber-950 cursor-pointer inline-flex items-center gap-1"
                >
                  View {skippedMembers.length} Skipped Row(s) →
                </button>
              )}
            </div>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer shrink-0"
          >
            <LuX className="size-4" />
          </button>
        </div>
      ) : null}

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
          setSkippedMembers([]);
          setErrorMessage(null);
          setSaveReport(null);
          setFilterStatus("all");
          setCurrentPage(1);
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
        <div className="flex justify-stretch sm:justify-end mb-4 sm:mb-6">
          <Button
            variant="outline"
            className="w-full sm:w-auto rounded-2xl border-slate-200 h-11 px-6 font-semibold items-center justify-center gap-2 shadow-sm text-slate-600 hover:bg-white hover:text-slate-600 cursor-pointer"
            onClick={() => setIsManualModalOpen(true)}
          >
            <LuUserPlus className="size-4.5 text-primary/70" />
            <span>Add member manually</span>
          </Button>
        </div>
      )}

      {/* Connected Google Sheet Sync Banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50/70 to-emerald-50 border border-emerald-200 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-3.5 w-full md:w-auto">
          <div className="size-10 sm:size-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-200 shrink-0">
            <LuFileSpreadsheet className="size-5 sm:size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-black text-emerald-950">Linked Google Sheet</h4>
              {autoFetchSheet ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300/60 shadow-xs shrink-0">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Auto-Sync Active (Every 2 min)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                  <LuPause className="size-3" /> Auto-Sync Paused
                </span>
              )}
              {autoFetchSheet && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white text-emerald-900 border border-emerald-200 shadow-xs shrink-0">
                  <LuClock className="size-3 text-emerald-600" />
                  Next sync in: {formatCountdown(timeUntilNextSync)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <p className="text-[11px] sm:text-xs text-emerald-800/80 font-medium truncate max-w-full sm:max-w-md md:max-w-xl">
                {googleSheetUrl}
              </p>
              {lastSyncTime && (
                <span className="text-[10px] text-emerald-700/70 font-semibold">
                  • Last checked: {lastSyncTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-stretch sm:justify-end">
          <a
            href={googleSheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white text-emerald-900 border border-emerald-300 hover:bg-emerald-100/60 transition-colors shadow-xs flex-1 sm:flex-none text-center"
          >
            <LuExternalLink className="size-3.5" /> Open Sheet ↗
          </a>

          <Button
            size="sm"
            disabled={isFetchingSheet || isSaving}
            onClick={() => {
              if (autoFetchSheet) {
                syncAndAutoAddMembers(true);
              } else {
                handleFetchPreviewOnly();
              }
            }}
            className="rounded-xl h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer flex-1 sm:flex-none justify-center"
          >
            <LuRefreshCw className={`size-3.5 mr-1.5 ${isFetchingSheet ? "animate-spin" : ""}`} />
            {isFetchingSheet
              ? autoFetchSheet
                ? "Syncing..."
                : "Fetching..."
              : autoFetchSheet
              ? "Sync & Add Now"
              : "Fetch from Google Sheet"}
          </Button>

          <button
            type="button"
            onClick={handleToggleAutoSync}
            title="Automatically fetch latest Google Sheet rows and add new members every 2 minutes while this page is open"
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-1.5 flex-1 sm:flex-none text-center ${
              autoFetchSheet
                ? "bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-700 shadow-xs"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {autoFetchSheet ? <LuPlay className="size-3 fill-current" /> : <LuPause className="size-3" />}
            Auto-Sync: {autoFetchSheet ? "ON (2m)" : "OFF"}
          </button>
        </div>
      </div>

      {members.length === 0 && skippedMembers.length === 0 ? (
        <Card
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed transition-all duration-300 group rounded-[2rem] sm:rounded-[2.5rem] ${isDragging
            ? "border-primary bg-primary/5 scale-[1.01] shadow-2xl shadow-primary/10"
            : "border-slate-200 bg-slate-50/50 hover:border-primary/50"
            }`}
        >
          <CardContent className="p-6 sm:p-12 text-center py-12 sm:py-20">
            <div className={`mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-5 sm:mb-6 transition-all duration-500 ${isDragging ? "scale-110 rotate-12 shadow-primary/20" : "shadow-slate-200/50 group-hover:scale-110"
              }`}>
              <LuUpload className={`size-8 sm:size-10 transition-colors ${isDragging ? "text-primary" : "text-primary/60 group-hover:text-primary"}`} />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
              {isDragging ? "Drop your file here" : "Upload Members List"}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-6 sm:mb-8 px-2">
              Drop your .xlsx, .xls, or .csv file here. Existing students in the database will be preserved and won&apos;t be overwritten.
            </p>
            <div className="relative inline-block w-full sm:w-auto">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                disabled={isUploading}
              />
              <Button disabled={isUploading} className="w-full sm:w-auto h-11 sm:h-12 px-8 rounded-xl font-bold gradient-primary shadow-xl shadow-primary/10 cursor-pointer justify-center">
                {isUploading ? "Processing..." : "Select File"}
              </Button>
            </div>
            <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400">
              <span className="flex items-center gap-1.5"><LuCircleCheck className="size-3.5" /> Fast Parallel Additions</span>
              <span className="flex items-center gap-1.5"><LuCircleCheck className="size-3.5" /> Live Row Animations</span>
              <span className="flex items-center gap-1.5"><LuCircleCheck className="size-3.5" /> Duplicate Protection</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Summary Metric Cards */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${skippedMembers.length > 0 ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-3 sm:gap-4`}>
            <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 shadow-sm flex items-center gap-3">
              <div className="size-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold shrink-0">
                <LuUsers className="size-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Valid in Preview</p>
                <p className="text-xl sm:text-2xl font-black text-slate-900">{totalCount}</p>
              </div>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-3.5 sm:p-4 shadow-sm flex items-center gap-3">
              <div className="size-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-200 shrink-0">
                <LuSparkles className="size-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">New Members to Save</p>
                <p className="text-xl sm:text-2xl font-black text-emerald-950">{newCount}</p>
              </div>
            </div>

            <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-3.5 sm:p-4 shadow-sm flex items-center gap-3">
              <div className="size-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-200 shrink-0">
                <LuDatabase className="size-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">
                  {inDbCount > 0 && duplicateInFileCount > 0
                    ? "In DB & File Dups"
                    : inDbCount > 0
                    ? "Already in Database"
                    : "Duplicates in File"} (Skipped)
                </p>
                <p className="text-xl sm:text-2xl font-black text-amber-950">{existingCount}</p>
              </div>
            </div>

            {skippedMembers.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setFilterStatus("skipped");
                  setCurrentPage(1);
                }}
                className="bg-rose-50/80 border border-rose-200/90 rounded-2xl p-3.5 sm:p-4 shadow-sm flex items-center gap-3 text-left hover:bg-rose-100/80 transition-all cursor-pointer group"
              >
                <div className="size-10 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold shadow-md shadow-rose-200 shrink-0 group-hover:scale-105 transition-transform">
                  <LuCircleAlert className="size-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">
                    Skipped / Invalid Rows
                  </p>
                  <p className="text-xl sm:text-2xl font-black text-rose-950">
                    {skippedMembers.length}
                  </p>
                </div>
              </button>
            )}
          </div>

          {/* Filter Bar & Controls */}
          <Card className="border-slate-200 shadow-sm rounded-2xl p-3 sm:p-4">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
              {/* Filter Tabs */}
              <div className="overflow-x-auto no-scrollbar flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl w-full lg:w-auto pb-1 lg:pb-1">
                <button
                  type="button"
                  onClick={() => {
                    setFilterStatus("all");
                    setCurrentPage(1);
                  }}
                  className={`shrink-0 flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                  className={`shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                  className={`shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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

                {skippedMembers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterStatus("skipped");
                      setCurrentPage(1);
                    }}
                    className={`shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterStatus === "skipped"
                        ? "bg-rose-600 text-white shadow-sm"
                        : "text-rose-700 hover:bg-rose-50"
                    }`}
                  >
                    <LuCircleAlert className="size-3.5" />
                    <span>Skipped / Invalid</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                      filterStatus === "skipped" ? "bg-rose-700 text-white" : "bg-rose-100 text-rose-800"
                    }`}>
                      {skippedMembers.length}
                    </span>
                  </button>
                )}
              </div>

              {/* Search & Items Per Page Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
                <div className="relative w-full sm:w-64">
                  <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                  <Input
                    placeholder={filterStatus === "skipped" ? "Search skipped rows..." : "Search by ID, name, email..."}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9 pr-8 h-9 text-xs rounded-xl border-slate-200 w-full"
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

                <div className="flex items-center justify-between sm:justify-start gap-2">
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

          {/* Members Content: Desktop Table & Mobile Card List */}
          <Card className="overflow-hidden border-slate-200 shadow-xl shadow-slate-200/50 rounded-2xl sm:rounded-3xl">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              {filterStatus === "skipped" ? (
                <table className="w-full text-left border-collapse min-w-[850px]">
                  <thead>
                    <tr className="bg-rose-50/70 border-b border-rose-200">
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-rose-950">Source Row</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-rose-950">Student ID</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-rose-950">Full Name</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-rose-950">Email Address</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-rose-950">Course & Section</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-rose-950">Reason(s) Skipped</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-rose-950 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedSkippedMembers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                          <div className="max-w-xs mx-auto space-y-2">
                            <LuFilter className="size-8 mx-auto text-slate-300" />
                            <p className="text-sm font-semibold text-slate-600">No skipped rows match your current search</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedSkippedMembers.map((skipped, idx) => (
                        <tr key={idx} className="hover:bg-rose-50/40 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                              Row #{skipped.rowNumber}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {skipped.student_id ? (
                              <span className="font-mono font-bold text-slate-900">{skipped.student_id}</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-black bg-rose-100 text-rose-700">
                                MISSING ID
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {skipped.first_name || skipped.last_name ? (
                              <div className="font-bold text-slate-900">{skipped.first_name} {skipped.last_name}</div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-black bg-rose-100 text-rose-700">
                                MISSING NAME
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {skipped.email ? (
                              <div className="text-xs font-medium text-slate-700">{skipped.email}</div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-black bg-rose-100 text-rose-700">
                                MISSING EMAIL
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs text-slate-600 font-medium">{skipped.course || "—"} {skipped.section ? `• ${skipped.section}` : ""}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              {skipped.reasons.map((reason, rIdx) => (
                                <span
                                  key={rIdx}
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200"
                                >
                                  <LuCircleAlert className="size-3 text-rose-600 shrink-0" /> {reason}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleFixSkippedRow(skipped)}
                              className="h-8 px-3 rounded-lg text-xs font-bold border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                            >
                              <LuPencil className="size-3 mr-1" /> Fix &amp; Add
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left border-collapse min-w-[850px]">
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
                      paginatedMembers.map(({ member, originalIndex, isExistingInDb, isExistingId, isExistingEmail, isDuplicateInBatch, failureReason, isNew }) => {
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
                                : failureReason && !isExistingInDb
                                ? "bg-rose-50/40 hover:bg-rose-50/70"
                                : !isNew 
                                ? "bg-amber-50/30 hover:bg-slate-50/70" 
                                : "hover:bg-slate-50/70"
                            }`}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-slate-900 font-mono">{member.student_id}</span>
                                {isCurrentlySaving ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-emerald-600 text-white shadow-sm animate-pulse">
                                    <LuRefreshCw className="size-3 animate-spin" /> Saving...
                                  </span>
                                ) : wasJustSaved ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-emerald-700 text-white shadow-sm">
                                    <LuCheck className="size-3" /> Saved!
                                  </span>
                                ) : failureReason && !isExistingInDb ? (
                                  <span 
                                    title={failureReason}
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-rose-100 text-rose-800 border border-rose-200"
                                  >
                                    <LuCircleAlert className="size-3 text-rose-600" /> Error: {failureReason}
                                  </span>
                                ) : isExistingId ? (
                                  <span 
                                    title="This Student ID already exists in the database. When saving, this record was NOT saved to preserve the existing account."
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-amber-100 text-amber-800 border border-amber-200"
                                  >
                                    <LuDatabase className="size-3" /> Already in DB (ID exists)
                                  </span>
                                ) : isExistingEmail ? (
                                  <span 
                                    title="This Email address is already registered to another user in the database."
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-amber-100 text-amber-800 border border-amber-200"
                                  >
                                    <LuDatabase className="size-3" /> Already in DB (Email exists)
                                  </span>
                                ) : isDuplicateInBatch ? (
                                  <span 
                                    title="This Student ID or Email is duplicated within your uploaded list."
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-orange-100 text-orange-800 border border-orange-200"
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
              )}
            </div>

            {/* Mobile Card List View (< md) */}
            <div className="md:hidden divide-y divide-slate-100">
              {filterStatus === "skipped" ? (
                paginatedSkippedMembers.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 space-y-2">
                    <LuFilter className="size-7 mx-auto text-slate-300" />
                    <p className="text-sm font-semibold text-slate-600">No skipped rows match your search</p>
                  </div>
                ) : (
                  paginatedSkippedMembers.map((skipped, idx) => (
                    <div key={idx} className="p-4 space-y-2.5 bg-rose-50/20 border-l-4 border-l-rose-500">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-600 bg-white px-2.5 py-0.5 rounded border border-slate-200">
                          Row #{skipped.rowNumber}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {skipped.reasons.map((reason, rIdx) => (
                            <span key={rIdx} className="text-[10px] font-black bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">
                          {skipped.first_name || skipped.last_name ? `${skipped.first_name} ${skipped.last_name}` : "Missing Name"}
                        </h4>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          ID: {skipped.student_id || "MISSING"} • {skipped.email || "No Email"}
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5 font-medium">
                          {skipped.course || "No Course"} {skipped.section ? `• Sec ${skipped.section}` : ""}
                        </p>
                      </div>
                      <div className="pt-2 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFixSkippedRow(skipped)}
                          className="h-8 px-3 rounded-lg text-xs font-bold border-rose-200 bg-white text-rose-700 hover:bg-rose-50 cursor-pointer"
                        >
                          <LuPencil className="size-3 mr-1" /> Fix &amp; Add to List
                        </Button>
                      </div>
                    </div>
                  ))
                )
              ) : (
                paginatedMembers.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 space-y-2">
                    <LuFilter className="size-7 mx-auto text-slate-300" />
                    <p className="text-sm font-semibold text-slate-600">No members match your filter</p>
                    <p className="text-xs text-slate-400">Try changing status or search keywords.</p>
                  </div>
                ) : (
                  paginatedMembers.map(({ member, originalIndex, isExistingInDb, isExistingId, isExistingEmail, isDuplicateInBatch, failureReason, isNew }) => {
                    const isCurrentlySaving = activeSavingId === member.student_id;
                    const wasJustSaved = justSavedIds.has(member.student_id);

                    return (
                      <div
                        key={originalIndex}
                        className={`p-4 space-y-3 transition-all ${
                          isCurrentlySaving
                            ? "bg-emerald-50/90 border-l-4 border-l-emerald-500"
                            : wasJustSaved
                            ? "bg-emerald-100/60 opacity-50"
                            : failureReason && !isExistingInDb
                            ? "bg-rose-50/40 border-l-4 border-l-rose-500"
                            : !isNew
                            ? "bg-amber-50/30 border-l-4 border-l-amber-400"
                            : "bg-white"
                        }`}
                      >
                        {/* Top Row: ID & Status Badge */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-mono font-black text-slate-900 text-sm">
                            {member.student_id}
                          </span>

                          <div>
                            {isCurrentlySaving ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white shadow-sm animate-pulse">
                                <LuRefreshCw className="size-3 animate-spin" /> Saving...
                              </span>
                            ) : wasJustSaved ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-700 text-white shadow-sm">
                                <LuCheck className="size-3" /> Saved!
                              </span>
                            ) : failureReason && !isExistingInDb ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                                <LuCircleAlert className="size-3 text-rose-600" /> Error
                              </span>
                            ) : isExistingId ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                                <LuDatabase className="size-3" /> Already in DB (ID)
                              </span>
                            ) : isExistingEmail ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                                <LuDatabase className="size-3" /> Already in DB (Email)
                              </span>
                            ) : isDuplicateInBatch ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-800 border border-orange-200">
                                <LuTriangleAlert className="size-3" /> File Duplicate
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <LuSparkles className="size-3" /> New
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Name & Academic Info */}
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">
                            {member.first_name} {member.middle_initial ? `${member.middle_initial} ` : ""}{member.last_name}
                          </h4>
                          <p className="text-xs text-slate-500 font-medium">
                            {member.course || "No Course"} • Year {member.year || "—"} • Sec {member.section || "—"}
                          </p>
                          <p className="text-xs text-slate-600 font-medium mt-0.5 truncate">
                            {member.email}
                          </p>
                        </div>

                        {/* Payment & Receipt Details */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                              member.membership_status === 'Fully Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                              member.membership_status === 'Half Semester Paid' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                              member.membership_status === 'Partial' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                              'bg-rose-50 text-rose-600 border-rose-100'
                            }`}>
                              {member.membership_status}
                            </span>
                            <span className="font-bold text-slate-900">₱{member.payment.toLocaleString()}</span>
                          </div>

                          {member.receipt && (
                            <span className="text-[11px] font-mono text-slate-500 font-semibold truncate max-w-[120px]">
                              Rcpt: {member.receipt}
                            </span>
                          )}
                        </div>

                        {/* Error or Warning message if present */}
                        {failureReason && (
                          <div className="p-2 bg-rose-50 rounded-xl text-[11px] font-semibold text-rose-700 border border-rose-200">
                            {failureReason}
                          </div>
                        )}

                        {/* Action Buttons for Mobile */}
                        <div className="flex items-center gap-2 pt-1">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={isSaving}
                            onClick={() => handleEditRowClick(originalIndex)}
                            className="flex-1 h-8 rounded-xl text-xs font-bold text-slate-700 hover:bg-primary hover:text-white transition-all cursor-pointer justify-center"
                          >
                            <LuPencil className="size-3.5 mr-1" /> Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={isSaving}
                            onClick={() => handleDeleteRow(originalIndex)}
                            className="flex-1 h-8 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-500 hover:text-white border-rose-200 transition-all cursor-pointer justify-center"
                          >
                            <LuTrash2 className="size-3.5 mr-1" /> Remove
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>

            {/* Pagination Controls */}
            <div className="p-3.5 sm:p-6 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <p className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest text-center sm:text-left">
                Showing <span className="text-slate-900">{activeTotalForPagination > 0 ? (validCurrentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(activeTotalForPagination, validCurrentPage * itemsPerPage)}</span> of <span className="text-slate-900">{activeTotalForPagination}</span> {isSkippedTab ? "skipped records" : "members"}
                {!isSkippedTab && filteredMembers.length !== totalCount && ` (filtered from ${totalCount})`}
              </p>
              
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={validCurrentPage <= 1 || isSaving} 
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  className="rounded-xl px-2.5 sm:px-3 py-1.5 h-8 sm:h-9 border-slate-200 hover:bg-white transition-all disabled:opacity-50 text-xs font-bold cursor-pointer"
                >
                  <LuChevronLeft className="size-3.5 sm:size-4 mr-0.5 sm:mr-1" /> Prev
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
                          className={`size-8 sm:size-9 rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-50 ${
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
                  className="rounded-xl px-2.5 sm:px-3 py-1.5 h-8 sm:h-9 border-slate-200 hover:bg-white transition-all disabled:opacity-50 text-xs font-bold cursor-pointer"
                >
                  Next <LuChevronRight className="size-3.5 sm:size-4 ml-0.5 sm:ml-1" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Safety Notice */}
          <div className="bg-emerald-50/60 border border-emerald-200/80 p-3.5 sm:p-4 rounded-2xl flex items-start gap-2.5 sm:gap-3">
            <LuCircleCheck className="text-emerald-600 size-4 sm:size-5 mt-0.5 shrink-0" />
            <p className="text-xs sm:text-sm text-emerald-900 font-medium leading-relaxed">
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
        <form onSubmit={editingIndex !== null ? handleManualEditSave : handleManualAdd} className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Student ID *</Label>
                {manualMember.student_id && (
                  <div className="flex items-center gap-2">
                    {!isValidStudentId(manualMember.student_id) ? (
                      <span className="text-[11px] font-semibold text-amber-600 flex items-center gap-1">
                        <LuTriangleAlert className="size-3.5" /> 0000-0000 format
                      </span>
                    ) : dbExistingStudentIds.has(manualMember.student_id.trim().toLowerCase()) ? (
                      <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
                        <LuTriangleAlert className="size-3.5" /> In DB
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                        <LuCircleCheck className="size-3.5" /> Valid Format
                      </span>
                    )}
                  </div>
                )}
              </div>
              <Input
                placeholder="2022-2703"
                value={manualMember.student_id}
                maxLength={9}
                onChange={(e) =>
                  setManualMember({
                    ...manualMember,
                    student_id: formatStudentIdInput(e.target.value),
                  })
                }
                required
                className={`rounded-xl h-10 sm:h-11 font-mono text-sm ${
                  manualMember.student_id && !isValidStudentId(manualMember.student_id)
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
                    : ""
                }`}
              />
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                Format: 4 digits, hyphen, 4 digits (e.g., <span className="font-mono font-bold text-slate-600">2022-2703</span>).
              </p>
            </div>
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">First Name *</Label>
                <Input
                  placeholder="John"
                  value={manualMember.first_name}
                  onChange={(e) => setManualMember({ ...manualMember, first_name: e.target.value })}
                  required
                  className="rounded-xl h-10 sm:h-11 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Middle Initial</Label>
                <Input
                  placeholder="M."
                  value={manualMember.middle_initial || ""}
                  onChange={(e) => setManualMember({ ...manualMember, middle_initial: e.target.value })}
                  maxLength={5}
                  className="rounded-xl h-10 sm:h-11 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Last Name *</Label>
                <Input
                  placeholder="Doe"
                  value={manualMember.last_name}
                  onChange={(e) => setManualMember({ ...manualMember, last_name: e.target.value })}
                  required
                  className="rounded-xl h-10 sm:h-11 text-sm"
                />
              </div>
            </div>
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Course *</Label>
                <select
                  value={manualMember.course}
                  onChange={(e) => setManualMember({ ...manualMember, course: e.target.value })}
                  required
                  className="w-full h-10 sm:h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-800"
                >
                  <option value="">Select Course</option>
                  <option value="BSIT">BSIT</option>
                  <option value="BSCE">BSCE</option>
                  <option value="BITM">BITM</option>
                  <option value="BSM">BSM</option>
                  <option value="BSMRS">BSMRS</option>
                  {manualMember.course && !["BSIT", "BSCE", "BITM", "BSM", "BSMRS"].includes(manualMember.course) && (
                    <option value={manualMember.course}>{manualMember.course}</option>
                  )}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Section</Label>
                <Input
                  placeholder="e.g. A, B, C, 1, 2"
                  value={manualMember.section || ""}
                  onChange={(e) => setManualMember({ ...manualMember, section: e.target.value })}
                  className="rounded-xl h-10 sm:h-11 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Year Level</Label>
                <Input
                  placeholder="1, 2, 3 or 4"
                  value={manualMember.year || ""}
                  onChange={(e) => setManualMember({ ...manualMember, year: e.target.value })}
                  className="rounded-xl h-10 sm:h-11 text-sm"
                />
              </div>
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Email Address *</Label>
              <Input
                type="email"
                placeholder="student@school.edu.ph"
                value={manualMember.email}
                onChange={(e) => setManualMember({ ...manualMember, email: e.target.value })}
                required
                className="rounded-xl h-10 sm:h-11 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 pt-3 sm:pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11 sm:h-12 rounded-xl font-bold justify-center"
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
              className="flex-1 h-11 sm:h-12 rounded-xl font-bold gradient-primary text-white shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all cursor-pointer justify-center"
            >
              {editingIndex !== null ? "Save Changes" : "Add to Preview"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
