"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  LuArrowLeftRight,
  LuFileSpreadsheet,
  LuRefreshCw,
  LuSearch,
  LuCircleCheck,
  LuTriangleAlert,
  LuCirclePlus,
  LuDatabase,
  LuDownload,
  LuCopy,
  LuSparkles,
  LuChevronLeft,
  LuChevronRight,
  LuEye,
  LuLayers,
  LuGraduationCap,
  LuMail,
  LuX,
  LuArrowRight,
  LuFileCheck,
  LuExternalLink
} from "react-icons/lu";
import { Card, CardContent } from "@/app/Components/ui/card";
import { Button } from "@/app/Components/ui/button";
import { Input } from "@/app/Components/ui/input";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { normalizeStudentId, isValidEmail, isValidStudentId } from "@/lib/utils";
import { encryptPassword } from "@/lib/encryption";
import { Modal } from "@/app/Components/ui/modal";

// -------------------------------------------------------------
// Interfaces
// -------------------------------------------------------------

interface DbMember {
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
  memberships?: {
    status: string;
    payment: number;
    receipt?: string | null;
  } | null;
  accounts?: {
    role: number;
    username?: string;
  } | null;
}

interface ExcelMember {
  row_number: number;
  student_id: string;
  first_name: string;
  middle_initial: string;
  last_name: string;
  email: string;
  course: string;
  section: string;
  year: string;
  membership_status: string;
  payment: number;
  receipt: string;
}

interface FieldDiff {
  field: string;
  label: string;
  dbValue: string;
  excelValue: string;
}

type ComparisonStatus = "in_sync" | "modified" | "new_in_excel" | "db_only" | "excel_duplicate";

interface ComparisonItem {
  id: string; // Unique key for rendering
  student_id: string;
  full_name: string;
  email: string;
  course: string;
  section: string;
  year: string;
  status: ComparisonStatus;
  diffs: FieldDiff[];
  dbRecord?: DbMember;
  excelRecord?: ExcelMember;
  isInDb: boolean;
  isDuplicateInExcel: boolean;
  duplicateCountInExcel?: number;
}

export default function DataComparisonPage() {
  const supabase = useMemo(() => createClient(), []);

  // Database State
  const [dbMembers, setDbMembers] = useState<DbMember[]>([]);
  const [isFetchingDb, setIsFetchingDb] = useState(true);

  // Excel File State
  const [excelFileName, setExcelFileName] = useState<string | null>(null);
  const [excelMembers, setExcelMembers] = useState<ExcelMember[]>([]);
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Google Sheet Live Sync States
  const DEFAULT_GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1ddZMsmpNXSCF1BmsWf_ethCaTD_4DAyVf9ERvPgPias/edit?gid=258554365#gid=258554365";
  const [googleSheetUrl, setGoogleSheetUrl] = useState(DEFAULT_GOOGLE_SHEET_URL);
  const [isFetchingSheet, setIsFetchingSheet] = useState(false);
  const [autoFetchSheet, setAutoFetchSheet] = useState(false);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ComparisonStatus | "all">("all");
  const [courseFilter, setCourseFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals & Action States
  const [selectedItemForDiff, setSelectedItemForDiff] = useState<ComparisonItem | null>(null);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [isSyncingNew, setIsSyncingNew] = useState(false);
  const [isApplyingUpdates, setIsApplyingUpdates] = useState(false);

  // -------------------------------------------------------------
  // 1. Fetch All Database Members (Paginated Continuous Fetch)
  // -------------------------------------------------------------
  const fetchDbMembers = useCallback(async () => {
    setIsFetchingDb(true);
    try {
      let allUsers: DbMember[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("users")
          .select(`
            *,
            memberships:memberships(status, payment, receipt),
            accounts:accounts(role, username)
          `)
          .order("created_at", { ascending: false })
          .range(from, from + step - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          const formatted = (data as unknown[]).map((item) => {
            const row = item as Record<string, unknown>;
            const rawAccounts = Array.isArray(row.accounts) ? row.accounts[0] : row.accounts;
            const rawMemberships = Array.isArray(row.memberships) ? row.memberships[0] : row.memberships;

            return {
              ...row,
              accounts: rawAccounts || null,
              memberships: rawMemberships || null,
            } as unknown as DbMember;
          });

          // Exclude Admin roles (role === 0)
          const students = formatted.filter((u) => u.accounts?.role !== 0);
          allUsers = allUsers.concat(students);

          if (data.length < step) {
            hasMore = false;
          } else {
            from += step;
          }
        } else {
          hasMore = false;
        }
      }

      setDbMembers(allUsers);
      toast.success(`Loaded ${allUsers.length} student records from database.`);
    } catch (err: unknown) {
      console.error("Fetch DB error:", err);
      toast.error("Failed to load database members.");
    } finally {
      setIsFetchingDb(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchDbMembers();
  }, [fetchDbMembers]);

  // -------------------------------------------------------------
  // 2. Parse Uploaded Excel / CSV
  // -------------------------------------------------------------
  const processExcelFile = (file: File) => {
    setIsParsingExcel(true);
    setExcelFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const bstr = e.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary", raw: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as Record<string, unknown>[];

        const parsedList: ExcelMember[] = [];

        rows.forEach((row, idx) => {
          const rawId = String(row.student_id || row["Student ID"] || row["ID"] || row["id"] || "").trim();
          const studentId = normalizeStudentId(rawId);
          const firstName = String(row.first_name || row["First Name"] || row["Firstname"] || row["firstname"] || "").trim();
          const lastName = String(row.last_name || row["Last Name"] || row["Lastname"] || row["lastname"] || "").trim();
          const email = String(row.email || row["Email"] || row["Email Address"] || "").trim().toLowerCase();

          // Skip completely empty rows
          if (!studentId && !firstName && !lastName && !email) return;

          const rawStatus = String(row.membership_status || row["Membership Status"] || row["Status"] || row["status"] || "Not Paid").trim();
          const validStatuses = ["Fully Paid", "Half Semester Paid", "Partial", "Not Paid"];
          const status = validStatuses.includes(rawStatus) ? rawStatus : "Not Paid";

          parsedList.push({
            row_number: idx + 2, // Excel 1-based index (header is row 1)
            student_id: studentId || rawId,
            first_name: firstName,
            middle_initial: String(row.middle_initial || row["Middle Initial"] || row["MI"] || row["M.I."] || "").trim(),
            last_name: lastName,
            course: String(row.course || row["Course"] || row["program"] || "").trim(),
            section: String(row.section || row["Section"] || row["sec"] || "").trim(),
            year: String(row.year || row["Year"] || row["yr"] || "").trim(),
            email: email,
            membership_status: status,
            payment: Number(row.payment || row["Payment"] || row["Amount"] || row["amount"] || 0) || 0,
            receipt: String(row.receipt || row["Receipt"] || row["Receipt No"] || "").trim(),
          });
        });

        setExcelMembers(parsedList);
        setCurrentPage(1);
        toast.success(`Successfully parsed ${parsedList.length} rows from "${file.name}".`);
      } catch (err) {
        console.error("Excel parse error:", err);
        toast.error("Failed to parse the file. Please check file format.");
      } finally {
        setIsParsingExcel(false);
        setIsDragging(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  // Google Sheet Live Fetcher for Comparison
  const handleFetchFromGoogleSheet = async (customUrl?: string) => {
    const targetUrl = customUrl || googleSheetUrl;
    setIsFetchingSheet(true);
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
      const parsedList: ExcelMember[] = [];

      rows.forEach((row, idx) => {
        const rawId = String(row.student_id || row["Student ID"] || row["ID"] || row["id"] || "").trim();
        const studentId = normalizeStudentId(rawId);
        const firstName = String(row.first_name || row["First Name"] || row["Firstname"] || row["firstname"] || "").trim();
        const lastName = String(row.last_name || row["Last Name"] || row["Lastname"] || row["lastname"] || "").trim();
        const email = String(row.email || row["Email"] || row["Email Address"] || "").trim().toLowerCase();

        if (!studentId && !firstName && !lastName && !email) return;

        const rawStatus = String(row.membership_status || row["Membership Status"] || row["Status"] || row["status"] || "Not Paid").trim();
        const validStatuses = ["Fully Paid", "Half Semester Paid", "Partial", "Not Paid"];
        const status = validStatuses.includes(rawStatus) ? rawStatus : "Not Paid";

        parsedList.push({
          row_number: idx + 2,
          student_id: studentId || rawId,
          first_name: firstName,
          middle_initial: String(row.middle_initial || row["Middle Initial"] || row["MI"] || row["M.I."] || "").trim(),
          last_name: lastName,
          course: String(row.course || row["Course"] || row["program"] || "").trim(),
          section: String(row.section || row["Section"] || row["sec"] || "").trim(),
          year: String(row.year || row["Year"] || row["yr"] || "").trim(),
          email: email,
          membership_status: status,
          payment: Number(row.payment || row["Payment"] || row["Amount"] || row["amount"] || 0) || 0,
          receipt: String(row.receipt || row["Receipt"] || row["Receipt No"] || "").trim(),
        });
      });

      setExcelMembers(parsedList);
      setExcelFileName("Google Sheet (Live Linked)");
      setCurrentPage(1);
      toast.success(`Fetched ${parsedList.length} rows directly from Google Sheet.`);
    } catch (err: any) {
      console.error("Google sheet compare error:", err);
      toast.error(err.message || "Failed to fetch from Google Sheet.");
    } finally {
      setIsFetchingSheet(false);
    }
  };

  useEffect(() => {
    const savedAuto = typeof window !== "undefined" && localStorage.getItem("acetrack_autofetch_compare") === "true";
    setAutoFetchSheet(savedAuto);
    if (savedAuto) {
      handleFetchFromGoogleSheet();
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processExcelFile(file);
  };

  // -------------------------------------------------------------
  // 3. Comparison Engine
  // -------------------------------------------------------------
  const comparisonResults = useMemo(() => {
    if (excelMembers.length === 0 && dbMembers.length === 0) return [];

    const results: ComparisonItem[] = [];

    // Helper map of DB records by normalized student_id and email
    const dbById = new Map<string, DbMember>();
    const dbByEmail = new Map<string, DbMember>();

    dbMembers.forEach((dbM) => {
      const idKey = normalizeStudentId(dbM.student_id || "").toLowerCase();
      const rawIdKey = (dbM.student_id || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      const emailKey = (dbM.email || "").trim().toLowerCase();

      if (idKey) dbById.set(idKey, dbM);
      if (rawIdKey) dbById.set(rawIdKey, dbM);
      if (emailKey) dbByEmail.set(emailKey, dbM);
    });

    // Track matched DB record IDs so we can find "DB Only" records afterwards
    const matchedDbIds = new Set<string>();

    // Track duplicate occurrences in Excel
    const seenExcelIds = new Map<string, number>();
    const seenExcelEmails = new Map<string, number>();

    excelMembers.forEach((exM) => {
      const idK = normalizeStudentId(exM.student_id || "").toLowerCase();
      const emailK = (exM.email || "").trim().toLowerCase();

      if (idK) seenExcelIds.set(idK, (seenExcelIds.get(idK) || 0) + 1);
      if (emailK) seenExcelEmails.set(emailK, (seenExcelEmails.get(emailK) || 0) + 1);
    });

    // 1. Process Excel Rows
    excelMembers.forEach((exM) => {
      const idKey = normalizeStudentId(exM.student_id || "").toLowerCase();
      const rawIdKey = (exM.student_id || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      const emailKey = (exM.email || "").trim().toLowerCase();

      const isDupInExcel = Boolean((idKey && (seenExcelIds.get(idKey) || 0) > 1) || (emailKey && (seenExcelEmails.get(emailKey) || 0) > 1));

      // Find matching DB record
      const dbMatch = (idKey && dbById.get(idKey)) || (rawIdKey && dbById.get(rawIdKey)) || (emailKey && dbByEmail.get(emailKey));

      if (dbMatch) {
        matchedDbIds.add(dbMatch.id);

        // Compare individual fields to detect discrepancies
        const diffs: FieldDiff[] = [];

        // First Name
        if ((dbMatch.first_name || "").trim().toLowerCase() !== (exM.first_name || "").trim().toLowerCase()) {
          diffs.push({
            field: "first_name",
            label: "First Name",
            dbValue: dbMatch.first_name || "—",
            excelValue: exM.first_name || "—",
          });
        }

        // Middle Initial
        if ((dbMatch.middle_initial || "").trim().toLowerCase() !== (exM.middle_initial || "").trim().toLowerCase()) {
          diffs.push({
            field: "middle_initial",
            label: "Middle Initial",
            dbValue: dbMatch.middle_initial || "—",
            excelValue: exM.middle_initial || "—",
          });
        }

        // Last Name
        if ((dbMatch.last_name || "").trim().toLowerCase() !== (exM.last_name || "").trim().toLowerCase()) {
          diffs.push({
            field: "last_name",
            label: "Last Name",
            dbValue: dbMatch.last_name || "—",
            excelValue: exM.last_name || "—",
          });
        }

        // Student ID
        if (normalizeStudentId(dbMatch.student_id) !== normalizeStudentId(exM.student_id)) {
          diffs.push({
            field: "student_id",
            label: "Student ID",
            dbValue: dbMatch.student_id || "—",
            excelValue: exM.student_id || "—",
          });
        }

        // Course
        if (exM.course && (dbMatch.course || "").trim().toLowerCase() !== (exM.course || "").trim().toLowerCase()) {
          diffs.push({
            field: "course",
            label: "Course",
            dbValue: dbMatch.course || "—",
            excelValue: exM.course || "—",
          });
        }

        // Section
        if (exM.section && (dbMatch.section || "").trim().toLowerCase() !== (exM.section || "").trim().toLowerCase()) {
          diffs.push({
            field: "section",
            label: "Section",
            dbValue: dbMatch.section || "—",
            excelValue: exM.section || "—",
          });
        }

        // Year Level
        if (exM.year && (dbMatch.year || "").trim().toLowerCase() !== (exM.year || "").trim().toLowerCase()) {
          diffs.push({
            field: "year",
            label: "Year Level",
            dbValue: dbMatch.year || "—",
            excelValue: exM.year || "—",
          });
        }

        // Email
        if (exM.email && (dbMatch.email || "").trim().toLowerCase() !== (exM.email || "").trim().toLowerCase()) {
          diffs.push({
            field: "email",
            label: "Email Address",
            dbValue: dbMatch.email || "—",
            excelValue: exM.email || "—",
          });
        }

        // Membership Status
        const dbStatus = dbMatch.memberships?.status || "Not Paid";
        if (exM.membership_status && dbStatus.toLowerCase() !== exM.membership_status.toLowerCase()) {
          diffs.push({
            field: "membership_status",
            label: "Membership Status",
            dbValue: dbStatus,
            excelValue: exM.membership_status,
          });
        }

        // Payment Amount
        const dbPayment = Number(dbMatch.memberships?.payment || 0);
        if (exM.payment !== undefined && dbPayment !== exM.payment) {
          diffs.push({
            field: "payment",
            label: "Payment Amount",
            dbValue: `₱${dbPayment}`,
            excelValue: `₱${exM.payment}`,
          });
        }

        const isModified = diffs.length > 0;
        const status: ComparisonStatus = isDupInExcel
          ? "excel_duplicate"
          : isModified
          ? "modified"
          : "in_sync";

        const dupCount = Math.max(
          idKey ? seenExcelIds.get(idKey) || 1 : 1,
          emailKey ? seenExcelEmails.get(emailKey) || 1 : 1
        );

        results.push({
          id: `match_${dbMatch.id}_row_${exM.row_number}`,
          student_id: exM.student_id || dbMatch.student_id,
          full_name: `${exM.first_name || dbMatch.first_name} ${exM.last_name || dbMatch.last_name}`,
          email: exM.email || dbMatch.email,
          course: exM.course || dbMatch.course,
          section: exM.section || dbMatch.section,
          year: exM.year || dbMatch.year,
          status,
          diffs,
          dbRecord: dbMatch,
          excelRecord: exM,
          isInDb: true,
          isDuplicateInExcel: isDupInExcel,
          duplicateCountInExcel: dupCount,
        });
      } else {
        // Not found in DB -> New in Excel
        const dupCount = Math.max(
          idKey ? seenExcelIds.get(idKey) || 1 : 1,
          emailKey ? seenExcelEmails.get(emailKey) || 1 : 1
        );

        results.push({
          id: `excel_only_${exM.row_number}`,
          student_id: exM.student_id,
          full_name: `${exM.first_name} ${exM.middle_initial ? exM.middle_initial + " " : ""}${exM.last_name}`.trim(),
          email: exM.email,
          course: exM.course,
          section: exM.section,
          year: exM.year,
          status: isDupInExcel ? "excel_duplicate" : "new_in_excel",
          diffs: [],
          excelRecord: exM,
          isInDb: false,
          isDuplicateInExcel: isDupInExcel,
          duplicateCountInExcel: dupCount,
        });
      }
    });

    // 2. Process DB Records missing from Excel (DB Only)
    dbMembers.forEach((dbM) => {
      if (!matchedDbIds.has(dbM.id)) {
        results.push({
          id: `db_only_${dbM.id}`,
          student_id: dbM.student_id,
          full_name: `${dbM.first_name || ""} ${dbM.middle_initial ? dbM.middle_initial + " " : ""}${dbM.last_name || ""}`.trim(),
          email: dbM.email,
          course: dbM.course,
          section: dbM.section,
          year: dbM.year,
          status: "db_only",
          diffs: [],
          dbRecord: dbM,
          isInDb: true,
          isDuplicateInExcel: false,
        });
      }
    });

    return results;
  }, [excelMembers, dbMembers]);

  // -------------------------------------------------------------
  // 4. Metrics & Breakdown
  // -------------------------------------------------------------
  const summaryMetrics = useMemo(() => {
    let inSync = 0;
    let modified = 0;
    let newInExcel = 0;
    let dbOnly = 0;
    let excelDuplicates = 0;
    let excelDuplicatesInDb = 0;
    let excelDuplicatesNotInDb = 0;

    comparisonResults.forEach((item) => {
      if (item.status === "in_sync") inSync++;
      else if (item.status === "modified") modified++;
      else if (item.status === "new_in_excel") newInExcel++;
      else if (item.status === "db_only") dbOnly++;
      else if (item.status === "excel_duplicate") {
        excelDuplicates++;
        if (item.isInDb) excelDuplicatesInDb++;
        else excelDuplicatesNotInDb++;
      }
    });

    return {
      total: comparisonResults.length,
      excelTotal: excelMembers.length,
      dbTotal: dbMembers.length,
      inSync,
      modified,
      newInExcel,
      dbOnly,
      excelDuplicates,
      excelDuplicatesInDb,
      excelDuplicatesNotInDb,
    };
  }, [comparisonResults, excelMembers.length, dbMembers.length]);

  // -------------------------------------------------------------
  // 5. Filtered Results & Pagination
  // -------------------------------------------------------------
  const filteredResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return comparisonResults.filter((item) => {
      // Status Filter
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      // Course Filter
      if (courseFilter !== "All" && (item.course || "").toLowerCase() !== courseFilter.toLowerCase()) {
        return false;
      }

      // Search Query
      if (q) {
        const nameMatch = (item.full_name || "").toLowerCase().includes(q);
        const idMatch = (item.student_id || "").toLowerCase().includes(q);
        const emailMatch = (item.email || "").toLowerCase().includes(q);
        const sectionMatch = (item.section || "").toLowerCase().includes(q);
        const courseMatch = (item.course || "").toLowerCase().includes(q);
        return nameMatch || idMatch || emailMatch || sectionMatch || courseMatch;
      }

      return true;
    });
  }, [comparisonResults, searchQuery, statusFilter, courseFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredResults.length / itemsPerPage));
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredResults.slice(start, start + itemsPerPage);
  }, [filteredResults, currentPage]);

  // -------------------------------------------------------------
  // 6. Action: Export Full Comparison Report (.xlsx)
  // -------------------------------------------------------------
  const exportComparisonReport = () => {
    if (comparisonResults.length === 0) {
      toast.error("No comparison data available to export.");
      return;
    }

    try {
      const exportData = comparisonResults.map((item, idx) => {
        const diffSummary = item.diffs.map((d) => `${d.label}: [DB: ${d.dbValue}] -> [Excel: ${d.excelValue}]`).join("; ");

        let statusLabel = "In Sync / Identical";
        if (item.status === "modified") statusLabel = "Discrepancy (Modified)";
        else if (item.status === "new_in_excel") statusLabel = "New in Excel (Missing in DB)";
        else if (item.status === "db_only") statusLabel = "In Database Only (Missing in Excel)";
        else if (item.status === "excel_duplicate") statusLabel = "Duplicate Row in Excel";

        return {
          "No.": idx + 1,
          "Comparison Status": statusLabel,
          "Student ID": item.student_id,
          "Full Name": item.full_name,
          "Email Address": item.email,
          "Course": item.course,
          "Year & Section": `Year ${item.year || "—"} - ${item.section || "—"}`,
          "Discrepancies / Differences": diffSummary || "None",
          "Excel Status": item.excelRecord?.membership_status || "—",
          "Excel Payment": item.excelRecord ? `₱${item.excelRecord.payment}` : "—",
          "DB Status": item.dbRecord?.memberships?.status || "—",
          "DB Payment": item.dbRecord ? `₱${item.dbRecord.memberships?.payment || 0}` : "—",
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Comparison Report");

      const timestamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `Data_Comparison_Report_${timestamp}.xlsx`);
      toast.success("Comparison Report downloaded successfully.");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to export comparison report.");
    }
  };

  // -------------------------------------------------------------
  // 7. Action: Batch Sync New Students (Insert into DB)
  // -------------------------------------------------------------
  const handleBatchSyncNewStudents = async () => {
    const newItems = comparisonResults.filter((item) => item.status === "new_in_excel" && item.excelRecord);
    if (newItems.length === 0) {
      toast.info("No new students in Excel to insert.");
      return;
    }

    setIsSyncingNew(true);
    let insertedCount = 0;
    try {
      for (const item of newItems) {
        const ex = item.excelRecord!;
        const sId = normalizeStudentId(ex.student_id);

        // 1. Insert User
        const { data: newUser, error: uErr } = await supabase
          .from("users")
          .insert({
            student_id: sId || ex.student_id,
            first_name: ex.first_name,
            middle_initial: ex.middle_initial || null,
            last_name: ex.last_name,
            course: ex.course,
            section: ex.section,
            year: ex.year,
            email: ex.email,
          })
          .select("id")
          .single();

        if (uErr || !newUser) continue;

        // 2. Insert Account
        const defaultPassword = sId || "0000-0000";
        const encDefault = encryptPassword(defaultPassword);
        await supabase.from("accounts").insert({
          user_id: newUser.id,
          username: ex.email,
          password: defaultPassword,
          encrypted_password: encDefault,
          role: 1,
          must_change_password: true,
        });

        // 3. Insert Membership
        await supabase.from("memberships").insert({
          user_id: newUser.id,
          status: ex.membership_status || "Not Paid",
          payment: ex.payment || 0,
          receipt: ex.receipt || null,
        });

        insertedCount++;
      }

      toast.success(`Successfully added ${insertedCount} new student(s) into the database!`);
      await fetchDbMembers();
    } catch (err) {
      console.error("Batch sync error:", err);
      toast.error("An error occurred during batch sync.");
    } finally {
      setIsSyncingNew(false);
    }
  };

  // -------------------------------------------------------------
  // 8. Action: Batch Apply Excel Updates to DB
  // -------------------------------------------------------------
  const handleBatchApplyUpdates = async () => {
    const modifiedItems = comparisonResults.filter((item) => item.status === "modified" && item.dbRecord && item.excelRecord);
    if (modifiedItems.length === 0) {
      toast.info("No modified records to update.");
      return;
    }

    setIsApplyingUpdates(true);
    let updatedCount = 0;
    try {
      for (const item of modifiedItems) {
        const db = item.dbRecord!;
        const ex = item.excelRecord!;

        // 1. Update users table
        const { error: uErr } = await supabase
          .from("users")
          .update({
            first_name: ex.first_name || db.first_name,
            middle_initial: ex.middle_initial !== undefined ? ex.middle_initial : db.middle_initial,
            last_name: ex.last_name || db.last_name,
            student_id: normalizeStudentId(ex.student_id) || db.student_id,
            course: ex.course || db.course,
            section: ex.section || db.section,
            year: ex.year || db.year,
            email: ex.email || db.email,
          })
          .eq("id", db.id);

        if (uErr) continue;

        // 2. Update memberships table
        const { error: mErr } = await supabase
          .from("memberships")
          .update({
            status: ex.membership_status || db.memberships?.status || "Not Paid",
            payment: ex.payment !== undefined ? ex.payment : db.memberships?.payment || 0,
            receipt: ex.receipt || db.memberships?.receipt || null,
          })
          .eq("user_id", db.id);

        if (!mErr) {
          updatedCount++;
        }
      }

      toast.success(`Successfully updated ${updatedCount} student record(s) in the database!`);
      await fetchDbMembers();
    } catch (err) {
      console.error("Apply updates error:", err);
      toast.error("An error occurred while applying updates.");
    } finally {
      setIsApplyingUpdates(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl shadow-slate-900/10">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-2xl bg-white/10 flex items-center justify-center text-primary-foreground backdrop-blur-md">
              <LuArrowLeftRight className="size-5 text-amber-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Database vs. Excel Comparison</h1>
          </div>
          <p className="text-sm text-slate-300 max-w-2xl font-normal leading-relaxed">
            Upload an official Excel or CSV student list to compare against the live database. Identify field discrepancies, find missing or new records, and sync data in 1 click.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDbMembers}
            disabled={isFetchingDb}
            className="rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white backdrop-blur-md h-10 font-bold text-xs cursor-pointer shadow-xs"
          >
            <LuRefreshCw className={`size-3.5 mr-2 ${isFetchingDb ? "animate-spin text-amber-400" : ""}`} />
            {isFetchingDb ? "Refreshing DB..." : "Refresh Database"}
          </Button>

          {excelMembers.length > 0 && (
            <Button
              size="sm"
              onClick={exportComparisonReport}
              className="rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white h-10 font-bold text-xs cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <LuDownload className="size-3.5 mr-2" />
              Export Comparison Report
            </Button>
          )}
        </div>
      </div>

      {/* Connected Google Sheet Sync Banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50/70 to-emerald-50 border border-emerald-200 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="size-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-200 shrink-0">
            <LuFileSpreadsheet className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-black text-emerald-950">Linked Google Sheet</h4>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                Live Source Connected
              </span>
            </div>
            <p className="text-xs text-emerald-800/80 font-medium mt-0.5 truncate max-w-xl">
              {googleSheetUrl}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-end md:self-center">
          <a
            href={googleSheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white text-emerald-900 border border-emerald-300 hover:bg-emerald-100/60 transition-colors shadow-xs"
          >
            <LuExternalLink className="size-3.5" /> Open Sheet ↗
          </a>

          <Button
            size="sm"
            disabled={isFetchingSheet}
            onClick={() => handleFetchFromGoogleSheet()}
            className="rounded-xl h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
          >
            <LuRefreshCw className={`size-3.5 mr-1.5 ${isFetchingSheet ? "animate-spin" : ""}`} />
            {isFetchingSheet ? "Fetching Live..." : "Compare with Google Sheet"}
          </Button>

          <button
            type="button"
            onClick={() => {
              const next = !autoFetchSheet;
              setAutoFetchSheet(next);
              if (typeof window !== "undefined") {
                localStorage.setItem("acetrack_autofetch_compare", String(next));
              }
              toast.info(next ? "Auto-compare on page open enabled." : "Auto-compare disabled.");
            }}
            title="Automatically compare with Google Sheet on page open"
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              autoFetchSheet
                ? "bg-emerald-700 text-white border-emerald-700"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            Auto-Sync: {autoFetchSheet ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {/* Upload Zone & Source Indicator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Drag & Drop Upload */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) processExcelFile(file);
          }}
          className={`lg:col-span-2 rounded-3xl border-2 border-dashed transition-all p-6 text-center relative flex flex-col items-center justify-center min-h-[170px] ${
            isDragging
              ? "border-primary bg-primary/5 scale-[0.99]"
              : excelFileName
              ? "border-emerald-300 bg-emerald-50/40"
              : "border-slate-300 hover:border-slate-400 bg-white"
          }`}
        >
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            id="compare-excel-upload"
          />
          <div className="size-12 rounded-2xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center mb-3 shadow-xs">
            <LuFileSpreadsheet className="size-6" />
          </div>
          {excelFileName ? (
            <div className="space-y-1">
              <p className="text-sm font-black text-slate-800 flex items-center justify-center gap-1.5">
                <LuFileCheck className="size-4 text-emerald-600" />
                Active Spreadsheet: <span className="text-emerald-700">{excelFileName}</span>
              </p>
              <p className="text-xs text-slate-500 font-medium">
                {excelMembers.length} row(s) loaded. Drop or click to upload a different file.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-sm font-black text-slate-800">
                Drop your Excel (.xlsx, .xls) or CSV file here to start comparison
              </p>
              <p className="text-xs text-slate-400 font-medium">
                or click anywhere inside this box to browse from your computer
              </p>
            </div>
          )}
        </div>

        {/* Database Status Card */}
        <Card className="rounded-3xl border-slate-200 bg-white shadow-xs p-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <LuDatabase className="size-3.5 text-primary" /> Live Database Status
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                Connected
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{dbMembers.length}</span>
              <span className="text-xs text-slate-500 font-bold">Registered Members</span>
            </div>
            <p className="text-xs text-slate-400 font-medium leading-tight">
              Fetched via paginated multi-batch loader without 1,000 ceiling.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Spreadsheet Rows:</span>
            <span className="font-mono font-bold text-slate-800">{excelMembers.length}</span>
          </div>
        </Card>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* In Sync */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter(statusFilter === "in_sync" ? "all" : "in_sync");
            setCurrentPage(1);
          }}
          className={`p-4 rounded-3xl border text-left transition-all cursor-pointer ${
            statusFilter === "in_sync"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200"
              : "bg-emerald-50/50 border-emerald-200 hover:bg-emerald-100/60 text-slate-800"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-black uppercase tracking-wider ${statusFilter === "in_sync" ? "text-emerald-100" : "text-emerald-700"}`}>
              In Sync
            </span>
            <LuCircleCheck className={`size-4 ${statusFilter === "in_sync" ? "text-emerald-200" : "text-emerald-600"}`} />
          </div>
          <div className="text-2xl font-black">{summaryMetrics.inSync}</div>
          <p className={`text-[11px] font-medium mt-0.5 ${statusFilter === "in_sync" ? "text-emerald-100" : "text-slate-500"}`}>
            Exact matches
          </p>
        </button>

        {/* Discrepancies */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter(statusFilter === "modified" ? "all" : "modified");
            setCurrentPage(1);
          }}
          className={`p-4 rounded-3xl border text-left transition-all cursor-pointer ${
            statusFilter === "modified"
              ? "bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-200"
              : "bg-amber-50/50 border-amber-200 hover:bg-amber-100/60 text-slate-800"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-black uppercase tracking-wider ${statusFilter === "modified" ? "text-amber-100" : "text-amber-700"}`}>
              Modified
            </span>
            <LuTriangleAlert className={`size-4 ${statusFilter === "modified" ? "text-amber-200" : "text-amber-600"}`} />
          </div>
          <div className="text-2xl font-black">{summaryMetrics.modified}</div>
          <p className={`text-[11px] font-medium mt-0.5 ${statusFilter === "modified" ? "text-amber-100" : "text-slate-500"}`}>
            Field differences
          </p>
        </button>

        {/* New in Excel */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter(statusFilter === "new_in_excel" ? "all" : "new_in_excel");
            setCurrentPage(1);
          }}
          className={`p-4 rounded-3xl border text-left transition-all cursor-pointer ${
            statusFilter === "new_in_excel"
              ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200"
              : "bg-blue-50/50 border-blue-200 hover:bg-blue-100/60 text-slate-800"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-black uppercase tracking-wider ${statusFilter === "new_in_excel" ? "text-blue-100" : "text-blue-700"}`}>
              New in Excel
            </span>
            <LuCirclePlus className={`size-4 ${statusFilter === "new_in_excel" ? "text-blue-200" : "text-blue-600"}`} />
          </div>
          <div className="text-2xl font-black">{summaryMetrics.newInExcel}</div>
          <p className={`text-[11px] font-medium mt-0.5 ${statusFilter === "new_in_excel" ? "text-blue-100" : "text-slate-500"}`}>
            Missing in DB
          </p>
        </button>

        {/* DB Only */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter(statusFilter === "db_only" ? "all" : "db_only");
            setCurrentPage(1);
          }}
          className={`p-4 rounded-3xl border text-left transition-all cursor-pointer ${
            statusFilter === "db_only"
              ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200"
              : "bg-purple-50/50 border-purple-200 hover:bg-purple-100/60 text-slate-800"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-black uppercase tracking-wider ${statusFilter === "db_only" ? "text-purple-100" : "text-purple-700"}`}>
              In DB Only
            </span>
            <LuDatabase className={`size-4 ${statusFilter === "db_only" ? "text-purple-200" : "text-purple-600"}`} />
          </div>
          <div className="text-2xl font-black">{summaryMetrics.dbOnly}</div>
          <p className={`text-[11px] font-medium mt-0.5 ${statusFilter === "db_only" ? "text-purple-100" : "text-slate-500"}`}>
            Missing in file
          </p>
        </button>

        {/* Excel Duplicates Card */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter(statusFilter === "excel_duplicate" ? "all" : "excel_duplicate");
            setCurrentPage(1);
          }}
          className={`p-4 rounded-3xl border text-left transition-all cursor-pointer col-span-2 sm:col-span-1 ${
            statusFilter === "excel_duplicate"
              ? "bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-200"
              : "bg-rose-50/50 border-rose-200 hover:bg-rose-100/60 text-slate-800"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-black uppercase tracking-wider ${statusFilter === "excel_duplicate" ? "text-rose-100" : "text-rose-700"}`}>
              Excel Dups
            </span>
            <LuCopy className={`size-4 ${statusFilter === "excel_duplicate" ? "text-rose-200" : "text-rose-600"}`} />
          </div>
          <div className="text-2xl font-black">{summaryMetrics.excelDuplicates}</div>
          <p className={`text-[10px] font-bold mt-0.5 ${statusFilter === "excel_duplicate" ? "text-rose-100" : "text-slate-500"}`}>
            {summaryMetrics.excelDuplicatesInDb} in DB • {summaryMetrics.excelDuplicatesNotInDb} New
          </p>
        </button>
      </div>

      {/* Action Banners */}
      {summaryMetrics.newInExcel > 0 && (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50/80 to-blue-50 border border-blue-200 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-300">
              <LuCirclePlus className="size-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-blue-950">
                Found {summaryMetrics.newInExcel} New Student(s) in Excel
              </h4>
              <p className="text-xs text-blue-800/80 font-medium">
                These students exist in your uploaded spreadsheet but are not yet registered in the database.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            disabled={isSyncingNew}
            onClick={handleBatchSyncNewStudents}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 shadow-xs cursor-pointer shrink-0 self-end sm:self-center"
          >
            <LuSparkles className="size-3.5 mr-1.5" />
            {isSyncingNew ? "Syncing..." : `Import ${summaryMetrics.newInExcel} New Student(s)`}
          </Button>
        </div>
      )}

      {summaryMetrics.modified > 0 && (
        <div className="bg-gradient-to-r from-amber-50 via-yellow-50/80 to-amber-50 border border-amber-200 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-300">
              <LuTriangleAlert className="size-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-950">
                Detected {summaryMetrics.modified} Record(s) with Field Discrepancies
              </h4>
              <p className="text-xs text-amber-800/80 font-medium">
                These students exist in both sources, but details like section, course, spelling, or payment status differ.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            disabled={isApplyingUpdates}
            onClick={handleBatchApplyUpdates}
            className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9 shadow-xs cursor-pointer shrink-0 self-end sm:self-center"
          >
            <LuSparkles className="size-3.5 mr-1.5" />
            {isApplyingUpdates ? "Applying..." : `Apply Excel Updates (${summaryMetrics.modified})`}
          </Button>
        </div>
      )}

      {/* Main Table Card */}
      <Card className="border-slate-200 shadow-sm rounded-3xl bg-white overflow-hidden">
        {/* Table Filter Bar */}
        <div className="p-6 border-b border-slate-100 space-y-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            {/* Search Input */}
            <div className="relative w-full lg:w-96">
              <LuSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
              <Input
                placeholder="Search by Name, Student ID, Email, Section..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 h-11 bg-slate-50 border-slate-200 rounded-2xl text-sm focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <LuX className="size-4" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Status Filter */}
              <div className="flex bg-slate-100 p-1 rounded-2xl flex-wrap">
                {[
                  { label: "All", value: "all" as const, count: summaryMetrics.total },
                  { label: "Modified", value: "modified" as const, count: summaryMetrics.modified, color: "text-amber-700" },
                  { label: "New in Excel", value: "new_in_excel" as const, count: summaryMetrics.newInExcel, color: "text-blue-700" },
                  { label: "In DB Only", value: "db_only" as const, count: summaryMetrics.dbOnly, color: "text-purple-700" },
                  { label: "In Sync", value: "in_sync" as const, count: summaryMetrics.inSync, color: "text-emerald-700" },
                ].map((s) => (
                  <button
                    key={s.value}
                    onClick={() => {
                      setStatusFilter(s.value);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      statusFilter === s.value
                        ? "bg-white text-primary shadow-xs font-black"
                        : `${s.color || "text-slate-500"} hover:bg-white/50`
                    }`}
                  >
                    <span>{s.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/5 font-black">
                      {s.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Course Filter */}
              <select
                value={courseFilter}
                onChange={(e) => {
                  setCourseFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 px-3 bg-slate-100 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="All">All Courses</option>
                <option value="BSIT">BSIT</option>
                <option value="BSCE">BSCE</option>
                <option value="BITM">BITM</option>
                <option value="BSM">BSM</option>
                <option value="BSMRS">BSMRS</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-black uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Student Info</th>
                <th className="px-6 py-4">Academic Info</th>
                <th className="px-6 py-4">Field Differences / Discrepancies</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {paginatedResults.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400">
                    <div className="size-16 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-300">
                      <LuSearch className="size-7" />
                    </div>
                    <p className="text-base font-bold text-slate-700">No records found</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {excelMembers.length === 0
                        ? "Upload an Excel or CSV file to start comparing records against the live database."
                        : "Try adjusting your search keywords or filter settings."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedResults.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors group">
                    {/* Status Column */}
                    <td className="px-6 py-5 whitespace-nowrap">
                      {item.status === "in_sync" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <LuCircleCheck className="size-3.5 text-emerald-600" /> In Sync
                        </span>
                      )}
                      {item.status === "modified" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <LuTriangleAlert className="size-3.5 text-amber-600" /> Modified ({item.diffs.length})
                        </span>
                      )}
                      {item.status === "new_in_excel" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <LuCirclePlus className="size-3.5 text-blue-600" /> New in Excel
                        </span>
                      )}
                      {item.status === "db_only" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          <LuDatabase className="size-3.5 text-purple-600" /> In DB Only
                        </span>
                      )}
                      {item.status === "excel_duplicate" && (
                        <div className="flex flex-col gap-1 items-start">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            <LuCopy className="size-3 text-rose-600" /> Excel Dup ({item.duplicateCountInExcel || 2}x)
                          </span>
                          {item.isInDb ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300">
                              <LuDatabase className="size-2.5 text-emerald-700" /> In Database
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-300">
                              📄 Not In DB
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Student Info */}
                    <td className="px-6 py-5">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-slate-900 leading-tight">{item.full_name || "—"}</span>
                          {item.excelRecord && (
                            <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              Row #{item.excelRecord.row_number}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-primary">
                            ID: {item.student_id || "NOT SET"}
                          </span>
                          {item.isInDb && item.status !== "in_sync" && item.status !== "db_only" && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              DB Record Exists
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                          <LuMail className="size-3 text-slate-400" />
                          <span className="truncate max-w-[200px]">{item.email || "—"}</span>
                        </div>
                      </div>
                    </td>

                    {/* Academic Info */}
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                          <LuGraduationCap className="size-3.5 text-slate-400" />
                          {item.course || "—"}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                          <LuLayers className="size-3.5 text-slate-300" />
                          Year {item.year || "—"} • Sec {item.section || "—"}
                        </div>
                      </div>
                    </td>

                    {/* Differences / Diff Pills */}
                    <td className="px-6 py-5">
                      {item.diffs.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-w-md">
                          {item.diffs.slice(0, 3).map((diff, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200"
                            >
                              <span className="text-slate-500 font-semibold">{diff.label}:</span>
                              <span className="line-through text-rose-600 opacity-80">{diff.dbValue}</span>
                              <LuArrowRight className="size-2.5 text-amber-600" />
                              <span className="text-emerald-700 font-black">{diff.excelValue}</span>
                            </span>
                          ))}
                          {item.diffs.length > 3 && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedItemForDiff(item);
                                setIsDiffModalOpen(true);
                              }}
                              className="text-[11px] font-black text-amber-800 underline hover:text-amber-950 px-1 py-1 cursor-pointer"
                            >
                              +{item.diffs.length - 3} more diffs
                            </button>
                          )}
                        </div>
                      ) : item.status === "in_sync" ? (
                        <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                          <LuCircleCheck className="size-3.5" /> All fields matching
                        </span>
                      ) : item.status === "new_in_excel" ? (
                        <span className="text-xs font-medium text-blue-600">
                          New record ready to import into DB
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">
                          No spreadsheet record found
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-5 text-right whitespace-nowrap">
                      {item.diffs.length > 0 ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedItemForDiff(item);
                            setIsDiffModalOpen(true);
                          }}
                          className="rounded-xl h-8 text-xs font-bold border-slate-200 hover:bg-slate-50 cursor-pointer"
                        >
                          <LuEye className="size-3 mr-1" /> View Diff
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <p className="text-xs font-bold text-slate-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredResults.length)} of {filteredResults.length} records
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-xl h-8 w-8 p-0 cursor-pointer"
              >
                <LuChevronLeft className="size-4" />
              </Button>
              <span className="text-xs font-black text-slate-700 px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-xl h-8 w-8 p-0 cursor-pointer"
              >
                <LuChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Side-by-Side Diff Modal */}
      <Modal
        isOpen={isDiffModalOpen}
        onClose={() => setIsDiffModalOpen(false)}
        title="Side-by-Side Field Comparison"
      >
        {selectedItemForDiff && (
          <div className="space-y-6">
            {/* Header info */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <h3 className="text-base font-black text-slate-900">{selectedItemForDiff.full_name}</h3>
              <p className="text-xs font-mono font-bold text-primary">Student ID: {selectedItemForDiff.student_id}</p>
              <p className="text-xs text-slate-500">Found {selectedItemForDiff.diffs.length} differing field(s) between Database and Excel.</p>
            </div>

            {/* Field-by-Field Diff Comparison Grid */}
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-2 text-[11px] font-black uppercase tracking-wider text-slate-400 px-3">
                <span className="col-span-4">Field Name</span>
                <span className="col-span-4 text-rose-600">Database Value</span>
                <span className="col-span-4 text-emerald-600">Excel Value</span>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                {selectedItemForDiff.diffs.map((d, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 p-3 text-xs items-center hover:bg-slate-50">
                    <span className="col-span-4 font-bold text-slate-700">{d.label}</span>
                    <span className="col-span-4 font-medium text-rose-700 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200">
                      {d.dbValue}
                    </span>
                    <span className="col-span-4 font-black text-emerald-800 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                      {d.excelValue}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setIsDiffModalOpen(false)}
                className="rounded-xl h-10 text-xs font-bold cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
