"use client";

import React, { useState, useEffect } from "react";
import {
  LuShieldAlert,
  LuPlus,
  LuSearch,
  LuPencil,
  LuTrash2,
  LuCircleCheck,
  LuClock,
  LuTriangleAlert,
  LuLoader,
  LuUser,
  LuCalendar,
  LuRotateCcw,
  LuCheck,
  LuSlidersHorizontal,
  LuUsers,
  LuSparkles,
  LuShieldCheck,
  LuChevronLeft,
  LuChevronRight,
  LuInfo,
} from "react-icons/lu";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Button } from "@/app/Components/ui/button";
import { Card, CardContent } from "@/app/Components/ui/card";
import { Modal } from "@/app/Components/ui/modal";
import { ConfirmModal } from "@/app/Components/ui/confirm-modal";

export interface SanctionRule {
  id: string;
  min_absent: number;
  max_absent: number;
  title: string;
  sanction_type: string;
  penalty_details: string;
  description: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface SanctionOverride {
  id: string;
  student_id: string;
  status: "Pending" | "In Progress" | "Completed" | "Waived";
  due_date: string | null;
  notes: string | null;
  penalty_details?: string | null;
  cleared_at?: string | null;
}

interface StudentUser {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string;
  email: string;
  course: string | null;
  section: string | null;
  year: string | null;
}

interface EventItem {
  id: string;
  title: string;
  date?: string;
  created_at?: string;
}

export interface AutoSanctionItem {
  student: StudentUser;
  totalEvents: number;
  attendedCount: number;
  absentCount: number;
  missedEvents: EventItem[];
  matchedRule: SanctionRule | null;
  status: "Pending" | "In Progress" | "Completed" | "Waived";
  dueDate: string | null;
  customNotes: string | null;
  overrideId?: string;
}

const SANCTION_TYPES = [
  "Community Service",
  "Fine / Fee",
  "Written Warning",
  "Attendance Makeup",
  "Suspension of Privilege",
  "Others",
];

const STATUS_OPTIONS = ["Pending", "In Progress", "Completed", "Waived"] as const;

export default function AdminSanctionsPage() {
  const [activeTab, setActiveTab] = useState<"sanctions" | "rules">("sanctions");

  // Data States
  const [students, setStudents] = useState<StudentUser[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Array<{ event_id: string; student_id: string; status?: string }>>([]);
  const [rules, setRules] = useState<SanctionRule[]>([]);
  const [sanctionOverrides, setSanctionOverrides] = useState<SanctionOverride[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination (5 per page)
  const [searchQuery, setSearchQuery] = useState("");
  const [absentFilter, setAbsentFilter] = useState<string>("AbsentsOnly");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Edit / Notes Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AutoSanctionItem | null>(null);
  const [formStatus, setFormStatus] = useState<"Pending" | "In Progress" | "Completed" | "Waived">("Pending");
  const [formDueDate, setFormDueDate] = useState("");
  const [formCustomNotes, setFormCustomNotes] = useState("");
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  // Rule Setup Modal State
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SanctionRule | null>(null);
  const [isSavingRule, setIsSavingRule] = useState(false);
  const [ruleMinAbsent, setRuleMinAbsent] = useState(1);
  const [ruleMaxAbsent, setRuleMaxAbsent] = useState(1);
  const [ruleTitle, setRuleTitle] = useState("");
  const [ruleType, setRuleType] = useState("Community Service");
  const [rulePenaltyDetails, setRulePenaltyDetails] = useState("");
  const [ruleDescription, setRuleDescription] = useState("");

  // Delete Rule State
  const [isDeleteRuleModalOpen, setIsDeleteRuleModalOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<SanctionRule | null>(null);
  const [isDeletingRule, setIsDeletingRule] = useState(false);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [isClearingAllRules, setIsClearingAllRules] = useState(false);

  const supabase = React.useMemo(() => createClient(), []);

  const fetchData = React.useCallback(async () => {
    try {
      // 1. Fetch Events
      const { data: eventsData } = await supabase
        .from("events")
        .select("id, title, date, created_at")
        .order("created_at", { ascending: false });
      setEvents(eventsData || []);

      // 2. Fetch Students
      const { data: studentsData } = await supabase
        .from("users")
        .select("id, first_name, last_name, student_id, email, course, section, year")
        .not("student_id", "is", null)
        .order("last_name", { ascending: true });
      setStudents(studentsData || []);

      // 3. Fetch Attendance
      const { data: attData } = await supabase.from("attendance").select("event_id, student_id, status");
      setAttendanceRecords(attData || []);

      // 4. Fetch Sanction Rules
      const { data: rulesData } = await supabase
        .from("sanction_rules")
        .select("*")
        .order("min_absent", { ascending: true });

      setRules(rulesData || []);

      // 5. Fetch Sanctions Table (for status overrides / custom notes)
      const { data: sanctionsData } = await supabase.from("sanctions").select("*");
      setSanctionOverrides(sanctionsData || []);
    } catch (err) {
      console.error("Error loading sanctions hub data:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (isMounted) {
        await fetchData();
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [fetchData]);

  const totalEventsCount = events.length;

  // Real-time automatic evaluation of sanctions for all students
  const allSanctionItems: AutoSanctionItem[] = students.map((student) => {
    const studentAttendance = attendanceRecords.filter((a) => a.student_id === student.student_id);
    const attendedEventIds = new Set(studentAttendance.map((a) => a.event_id));

    const missedEvents = events.filter((e) => !attendedEventIds.has(e.id));
    const attendedCount = events.filter((e) => attendedEventIds.has(e.id)).length;
    const absentCount = missedEvents.length;

    // Auto-match rule based on absent count
    const matchedRule =
      rules.find((r) => r.is_active && absentCount >= r.min_absent && absentCount <= r.max_absent) || null;

    // Check existing stored override in DB
    const override = sanctionOverrides.find((s) => s.student_id === student.student_id);

    return {
      student,
      totalEvents: totalEventsCount,
      attendedCount,
      absentCount,
      missedEvents,
      matchedRule,
      status: override?.status || "Pending",
      dueDate: override?.due_date || null,
      customNotes: override?.notes || null,
      overrideId: override?.id,
    };
  });

  // Filter items
  const filteredItems = allSanctionItems.filter((item) => {
    const matchesSearch =
      `${item.student.first_name} ${item.student.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.student.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.student.course || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Absent Filter
    if (absentFilter === "AbsentsOnly" && item.absentCount === 0) return false;
    if (absentFilter === "1" && item.absentCount !== 1) return false;
    if (absentFilter === "2" && item.absentCount !== 2) return false;
    if (absentFilter === "3+" && item.absentCount < 3) return false;
    if (absentFilter === "0" && item.absentCount !== 0) return false;

    // Status Filter
    if (statusFilter !== "All" && item.status !== statusFilter) return false;

    return true;
  });

  // 5 items per page pagination
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedItems = filteredItems.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage);

  // Handlers for Status Updates
  const handleQuickStatusChange = async (
    item: AutoSanctionItem,
    newStatus: "Pending" | "In Progress" | "Completed" | "Waived"
  ) => {
    try {
      const payload = {
        student_id: item.student.student_id,
        student_name: `${item.student.first_name} ${item.student.last_name}`,
        email: item.student.email || null,
        course: item.student.course || null,
        year_section: `${item.student.year || ""} - ${item.student.section || ""}`.trim() || null,
        title: item.matchedRule?.title || `${item.absentCount} Event Absence(s)`,
        description: `Automated detection for ${item.absentCount} missed event(s): ${item.missedEvents
          .map((e) => e.title)
          .join(", ")}.`,
        sanction_type: item.matchedRule?.sanction_type || "Community Service",
        penalty_details:
          item.matchedRule?.penalty_details || `${item.absentCount * 1.5} Hours Community Service`,
        status: newStatus,
        due_date: item.dueDate || null,
        notes: item.customNotes || null,
        issued_by: "ACES Attendance Auto-Detector",
        absent_count: item.absentCount,
        missed_events: item.missedEvents.map((e) => e.title).join(", "),
        cleared_at: newStatus === "Completed" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      if (item.overrideId) {
        const { error } = await supabase.from("sanctions").update(payload).eq("id", item.overrideId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sanctions").insert(payload);
        if (error) throw error;
      }

      toast.success(`Updated status of ${item.student.first_name} to ${newStatus}`);
      fetchData();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to update sanction status.";
      toast.error(errMsg);
    }
  };

  const handleOpenEditModal = (item: AutoSanctionItem) => {
    setEditingItem(item);
    setFormStatus(item.status);
    setFormDueDate(item.dueDate || "");
    setFormCustomNotes(item.customNotes || "");
    setIsEditModalOpen(true);
  };

  const handleSaveModalStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsSavingStatus(true);
    try {
      const payload = {
        student_id: editingItem.student.student_id,
        student_name: `${editingItem.student.first_name} ${editingItem.student.last_name}`,
        email: editingItem.student.email || null,
        course: editingItem.student.course || null,
        year_section: `${editingItem.student.year || ""} - ${editingItem.student.section || ""}`.trim() || null,
        title: editingItem.matchedRule?.title || `${editingItem.absentCount} Event Absence(s)`,
        description: `Automated detection for ${editingItem.absentCount} missed event(s): ${editingItem.missedEvents
          .map((e) => e.title)
          .join(", ")}.`,
        sanction_type: editingItem.matchedRule?.sanction_type || "Community Service",
        penalty_details:
          editingItem.matchedRule?.penalty_details || `${editingItem.absentCount * 1.5} Hours Community Service`,
        status: formStatus,
        due_date: formDueDate || null,
        notes: formCustomNotes.trim() || null,
        issued_by: "ACES Attendance Auto-Detector",
        absent_count: editingItem.absentCount,
        missed_events: editingItem.missedEvents.map((e) => e.title).join(", "),
        cleared_at: formStatus === "Completed" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      if (editingItem.overrideId) {
        const { error } = await supabase.from("sanctions").update(payload).eq("id", editingItem.overrideId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sanctions").insert(payload);
        if (error) throw error;
      }

      toast.success("Sanction details updated!");
      setIsEditModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to save details.";
      toast.error(errMsg);
    } finally {
      setIsSavingStatus(false);
    }
  };

  // Rule Setup Handlers
  const handleOpenAddRuleModal = () => {
    setEditingRule(null);
    setRuleMinAbsent(1);
    setRuleMaxAbsent(1);
    setRuleTitle("1 Event Absence Warning");
    setRuleType("Written Warning");
    setRulePenaltyDetails("Warning Letter & 30-min Counseling");
    setRuleDescription("Automatic rule for students with 1 absence.");
    setIsRuleModalOpen(true);
  };

  const handleOpenEditRuleModal = (r: SanctionRule) => {
    setEditingRule(r);
    setRuleMinAbsent(r.min_absent);
    setRuleMaxAbsent(r.max_absent);
    setRuleTitle(r.title);
    setRuleType(r.sanction_type);
    setRulePenaltyDetails(r.penalty_details);
    setRuleDescription(r.description || "");
    setIsRuleModalOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ruleTitle.trim()) {
      toast.error("Please enter a rule title.");
      return;
    }
    if (ruleMinAbsent < 1) {
      toast.error("Minimum absences must be at least 1.");
      return;
    }
    if (ruleMaxAbsent < ruleMinAbsent) {
      toast.error("Maximum absences cannot be less than minimum absences.");
      return;
    }

    // Constraint: You cannot create a rule starting higher than the total number of concluded events
    if (totalEventsCount > 0 && ruleMinAbsent > totalEventsCount) {
      toast.error(
        `Cannot create rule starting at ${ruleMinAbsent} absent(s) because only ${totalEventsCount} event(s) have been conducted.`
      );
      return;
    }

    setIsSavingRule(true);
    try {
      const payload = {
        min_absent: ruleMinAbsent,
        max_absent: ruleMaxAbsent,
        title: ruleTitle.trim(),
        sanction_type: ruleType,
        penalty_details: rulePenaltyDetails.trim(),
        description: ruleDescription.trim() || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      if (editingRule && editingRule.id) {
        const { error } = await supabase.from("sanction_rules").update(payload).eq("id", editingRule.id);
        if (error) throw error;
        toast.success("Sanction rule tier updated!");
      } else {
        const { error } = await supabase.from("sanction_rules").insert(payload);
        if (error) throw error;
        toast.success("New sanction rule tier created!");
      }

      setIsRuleModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to save rule tier.";
      toast.error(errMsg);
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleDeleteRule = async () => {
    if (!ruleToDelete) return;
    setIsDeletingRule(true);
    try {
      if (ruleToDelete.id) {
        const { error } = await supabase.from("sanction_rules").delete().eq("id", ruleToDelete.id);
        if (error) throw error;
      }
      toast.success("Rule tier deleted.");
      setRules((prev) => prev.filter((r) => r.id !== ruleToDelete.id));
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to delete rule.";
      toast.error(errMsg);
    } finally {
      setIsDeletingRule(false);
      setIsDeleteRuleModalOpen(false);
      setRuleToDelete(null);
    }
  };

  const handleClearAllRules = async () => {
    setIsClearingAllRules(true);
    try {
      const { error } = await supabase.from("sanction_rules").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      toast.success("All sanction rules removed!");
      setRules([]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to clear rules.";
      toast.error(errMsg);
    } finally {
      setIsClearingAllRules(false);
      setIsClearAllModalOpen(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "In Progress":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Waived":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const totalAbsentStudents = allSanctionItems.filter((p) => p.absentCount > 0).length;
  const pendingSanctionCount = allSanctionItems.filter(
    (p) => p.absentCount > 0 && p.status === "Pending"
  ).length;
  const inProgressSanctions = allSanctionItems.filter(
    (p) => p.absentCount > 0 && p.status === "In Progress"
  ).length;
  const completedSanctions = allSanctionItems.filter(
    (p) => p.absentCount > 0 && (p.status === "Completed" || p.status === "Waived")
  ).length;

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-tight">
              Attendance Sanctions Hub
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-orange-100 border border-orange-200 text-primary text-[10px] font-black uppercase tracking-wider">
              {totalEventsCount} Total Events
            </span>
          </div>
          <p className="text-slate-500 font-medium text-sm sm:text-base">
            Automatically detects event absences and auto-assigns graduated sanctions in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {activeTab === "rules" && (
            <Button
              onClick={handleOpenAddRuleModal}
              className="h-11 px-5 rounded-2xl font-black bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <LuPlus className="size-4" /> Add Sanction Tier
            </Button>
          )}

          <Button
            variant="outline"
            onClick={fetchData}
            disabled={loading}
            className="h-11 px-4 rounded-2xl font-bold bg-white text-slate-700 border-slate-200 shadow-xs hover:bg-slate-50 transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <LuRotateCcw className={`size-4 ${loading ? "animate-spin text-primary" : ""}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <Card className="rounded-2xl sm:rounded-3xl border-slate-200/90 shadow-xs bg-white">
          <CardContent className="p-3.5 sm:p-5 flex items-center gap-2.5 sm:gap-4">
            <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-orange-50 text-primary border border-orange-100 shrink-0">
              <LuCalendar className="size-4 sm:size-6" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Total Events</p>
              <h3 className="text-lg sm:text-2xl font-black text-slate-900 leading-tight">{totalEventsCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl sm:rounded-3xl border-slate-200/90 shadow-xs bg-white">
          <CardContent className="p-3.5 sm:p-5 flex items-center gap-2.5 sm:gap-4">
            <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 shrink-0">
              <LuTriangleAlert className="size-4 sm:size-6" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Absent Students</p>
              <h3 className="text-lg sm:text-2xl font-black text-rose-600 leading-tight">{totalAbsentStudents}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl sm:rounded-3xl border-slate-200/90 shadow-xs bg-white">
          <CardContent className="p-3.5 sm:p-5 flex items-center gap-2.5 sm:gap-4">
            <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 shrink-0">
              <LuClock className="size-4 sm:size-6" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">In Progress</p>
              <h3 className="text-lg sm:text-2xl font-black text-amber-600 leading-tight">{inProgressSanctions}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl sm:rounded-3xl border-slate-200/90 shadow-xs bg-white">
          <CardContent className="p-3.5 sm:p-5 flex items-center gap-2.5 sm:gap-4">
            <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
              <LuCircleCheck className="size-4 sm:size-6" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Resolved</p>
              <h3 className="text-lg sm:text-2xl font-black text-emerald-600 leading-tight">{completedSanctions}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-3">
        <button
          onClick={() => setActiveTab("sanctions")}
          className={`px-3 sm:px-4 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 ${
            activeTab === "sanctions"
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <LuShieldAlert className="size-3.5 sm:size-4 shrink-0" /> Sanctions ({totalAbsentStudents})
        </button>

        <button
          onClick={() => setActiveTab("rules")}
          className={`px-3 sm:px-4 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 ${
            activeTab === "rules"
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <LuSlidersHorizontal className="size-3.5 sm:size-4 shrink-0" /> Rules ({rules.length} Tiers)
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: AUTO-DETECTED ATTENDANCE SANCTIONS */}
      {/* ========================================================================= */}
      {activeTab === "sanctions" && (
        <Card className="rounded-2xl sm:rounded-3xl border-slate-200/90 shadow-xs bg-white overflow-hidden">
          <div className="p-3.5 sm:p-6 border-b border-slate-100 space-y-3.5">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              {/* Search Bar */}
              <div className="relative flex-1">
                <LuSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 sm:size-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by student name, ID, or course..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 sm:h-11 pl-9 sm:pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>

              {/* Absent Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {[
                  { label: "Absents Only", val: "AbsentsOnly" },
                  { label: "1 Absent", val: "1" },
                  { label: "2 Absents", val: "2" },
                  { label: "3+ Absents", val: "3+" },
                  { label: "All Students", val: "All" },
                  { label: "0 Clean", val: "0" },
                ].map((f) => (
                  <button
                    key={f.val}
                    onClick={() => setAbsentFilter(f.val)}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      absentFilter === f.val
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filter Sub-Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 scrollbar-none">
              <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Status:</span>
              {["All", "Pending", "In Progress", "Completed", "Waived"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === st
                      ? "bg-primary text-white font-bold"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
              <LuLoader className="size-6 sm:size-8 animate-spin text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest">Auto-detecting student attendance...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-16 sm:py-24 flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="p-3 sm:p-4 bg-emerald-50 text-emerald-600 rounded-2xl sm:rounded-3xl border border-emerald-100">
                <LuCircleCheck className="size-6 sm:size-10" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">No sanction records found</h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-sm">
                {absentFilter === "AbsentsOnly"
                  ? "All students have attended their events with zero recorded absences!"
                  : "No students match your search or status filter."}
              </p>
            </div>
          ) : (
            <>
              {/* 1. Mobile Cards View (Hidden on Tablet / Desktop) */}
              <div className="block md:hidden divide-y divide-slate-100">
                {paginatedItems.map((item) => {
                  const hasAbsence = item.absentCount > 0;

                  return (
                    <div key={item.student.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-xl bg-orange-50 border border-orange-100 text-primary font-black text-xs flex items-center justify-center shrink-0">
                            {item.student.first_name[0]}
                            {item.student.last_name[0]}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs sm:text-sm leading-tight">
                              {item.student.first_name} {item.student.last_name}
                            </p>
                            <p className="text-[11px] font-semibold text-slate-400 font-mono mt-0.5">
                              {item.student.student_id} {item.student.course && `• ${item.student.course}`}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Edit Details"
                        >
                          <LuPencil className="size-3.5" />
                        </button>
                      </div>

                      {/* Attendance Badge & Dropdown */}
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div>
                          {!hasAbsence ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                              <LuCircleCheck className="size-3" /> Clean (0 Absents)
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black">
                                <LuTriangleAlert className="size-2.5" /> {item.absentCount} Absent{item.absentCount > 1 ? "s" : ""}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">({item.attendedCount}/{item.totalEvents} attended)</span>
                            </div>
                          )}
                        </div>

                        {hasAbsence ? (
                          <select
                            value={item.status}
                            onChange={(e) =>
                              handleQuickStatusChange(
                                item,
                                e.target.value as "Pending" | "In Progress" | "Completed" | "Waived"
                              )
                            }
                            className={`text-[10px] font-black px-2.5 py-1 rounded-full border shadow-xs cursor-pointer focus:outline-none ${getStatusBadge(
                              item.status
                            )}`}
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-600">Exempt</span>
                        )}
                      </div>

                      {/* Sanction Details */}
                      {hasAbsence && (
                        <div className="text-xs space-y-1 bg-orange-50/40 p-2.5 rounded-xl border border-orange-100/60">
                          <p className="font-bold text-slate-800 text-[11px]">
                            {item.matchedRule ? item.matchedRule.title : `${item.absentCount} Event Absence(s)`}
                          </p>
                          <p className="text-[11px] font-bold text-primary">
                            Penalty: {item.matchedRule ? item.matchedRule.penalty_details : `${item.absentCount * 1.5} Hours Community Service`}
                          </p>
                          {item.missedEvents.length > 0 && (
                            <p className="text-[10px] text-slate-500 font-medium line-clamp-1">
                              Missed: {item.missedEvents.map((e) => e.title).join(", ")}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 2. Desktop Table View (Hidden on Mobile) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-4 sm:px-6">Student Information</th>
                      <th className="py-3.5 px-4">Attendance & Missed Events</th>
                      <th className="py-3.5 px-4">Auto-Assigned Sanction</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {paginatedItems.map((item) => {
                      const hasAbsence = item.absentCount > 0;

                      return (
                        <tr key={item.student.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Student Info */}
                          <td className="py-4 px-4 sm:px-6">
                            <div className="flex items-center gap-3">
                              <div className="size-10 rounded-2xl bg-orange-50 border border-orange-100 text-primary font-black text-xs flex items-center justify-center shrink-0">
                                {item.student.first_name[0]}
                                {item.student.last_name[0]}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 leading-tight">
                                  {item.student.first_name} {item.student.last_name}
                                </p>
                                <p className="text-xs font-semibold text-slate-400 font-mono mt-0.5">
                                  {item.student.student_id} {item.student.course && `• ${item.student.course}`}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Attendance & Missed Events */}
                          <td className="py-4 px-4">
                            {!hasAbsence ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black">
                                <LuCircleCheck className="size-3.5" /> 100% Attendance (0 Absents)
                              </span>
                            ) : (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-black">
                                    <LuTriangleAlert className="size-3" /> {item.absentCount} Absence
                                    {item.absentCount > 1 ? "s" : ""}
                                  </span>
                                  <span className="text-xs font-semibold text-slate-500">
                                    ({item.attendedCount}/{item.totalEvents} attended)
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 font-medium line-clamp-1">
                                  Missed: {item.missedEvents.map((e) => e.title).join(", ")}
                                </p>
                              </div>
                            )}
                          </td>

                          {/* Auto-Assigned Sanction */}
                          <td className="py-4 px-4">
                            {!hasAbsence ? (
                              <span className="text-xs font-semibold text-emerald-600">Clean Standing</span>
                            ) : item.matchedRule ? (
                              <div>
                                <p className="text-xs font-bold text-slate-800">{item.matchedRule.title}</p>
                                <p className="text-[11px] font-semibold text-primary">
                                  {item.matchedRule.penalty_details}
                                </p>
                              </div>
                            ) : (
                              <span className="text-xs font-semibold text-amber-600">
                                {item.absentCount * 1.5} Hours Community Service
                              </span>
                            )}
                          </td>

                          {/* Quick Status Dropdown */}
                          <td className="py-4 px-4">
                            {!hasAbsence ? (
                              <span className="inline-block text-xs font-bold text-emerald-600">Exempt</span>
                            ) : (
                              <select
                                value={item.status}
                                onChange={(e) =>
                                  handleQuickStatusChange(
                                    item,
                                    e.target.value as "Pending" | "In Progress" | "Completed" | "Waived"
                                  )
                                }
                                className={`text-xs font-black px-3 py-1.5 rounded-full border shadow-xs cursor-pointer focus:outline-none ${getStatusBadge(
                                  item.status
                                )}`}
                              >
                                {STATUS_OPTIONS.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>

                          {/* Details Modal Trigger */}
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-2 rounded-xl text-slate-500 hover:text-primary hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Edit Notes & Deadline"
                            >
                              <LuPencil className="size-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* 5-Item Pagination Footer */}
          <div className="p-4 sm:p-6 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Showing{" "}
              <span className="text-slate-900">
                {filteredItems.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-
                {Math.min(filteredItems.length, currentPage * itemsPerPage)}
              </span>{" "}
              of <span className="text-slate-900">{filteredItems.length}</span> students
            </p>

            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className="rounded-xl px-3 py-1.5 h-9 border-slate-200 hover:bg-white transition-all disabled:opacity-50 text-xs font-bold cursor-pointer"
              >
                <LuChevronLeft className="size-4 mr-1" /> Prev
              </Button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
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
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                className="rounded-xl px-3 py-1.5 h-9 border-slate-200 hover:bg-white transition-all disabled:opacity-50 text-xs font-bold cursor-pointer"
              >
                Next <LuChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SANCTION RULES SETUP */}
      {/* ========================================================================= */}
      {activeTab === "rules" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-orange-50/70 border border-orange-200/80 rounded-3xl p-5 sm:p-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <LuSlidersHorizontal className="size-5 text-primary" />
                <h3 className="text-base font-black text-slate-900">Graduated Absent Rules System</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                Set how many absences trigger specific penalties (e.g. 1 absent = Warning, 2 absents = Community Service, 3-4 absents = Penalty).
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {rules.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setIsClearAllModalOpen(true)}
                  className="h-10 px-3.5 rounded-xl font-bold border-rose-200 text-rose-600 hover:bg-rose-50 text-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <LuTrash2 className="size-3.5" /> Clear All Rules
                </Button>
              )}
              <Button
                onClick={handleOpenAddRuleModal}
                className="h-10 px-4 rounded-xl font-bold bg-primary hover:bg-primary/95 text-white text-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <LuPlus className="size-4" /> Add Rule Tier
              </Button>
            </div>
          </div>

          {rules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rules.map((rule) => {
                const isSingle = rule.min_absent === rule.max_absent;
                const rangeText = isSingle
                  ? `${rule.min_absent} Event Absence`
                  : rule.max_absent >= 99
                  ? `${rule.min_absent}+ Event Absences`
                  : `${rule.min_absent} to ${rule.max_absent} Event Absences`;

                return (
                  <div
                    key={rule.id}
                    className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-block px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-primary text-xs font-black uppercase tracking-wider">
                          {rangeText}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                          {rule.sanction_type}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-base font-black text-slate-900 leading-tight">{rule.title}</h4>
                        <p className="text-xs font-bold text-primary mt-1 flex items-center gap-1.5">
                          <LuShieldAlert className="size-3.5" /> Penalty: {rule.penalty_details}
                        </p>
                      </div>

                      {rule.description && (
                        <p className="text-xs text-slate-500 font-medium leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          {rule.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                      <span className="font-semibold text-slate-400">
                        Matches {allSanctionItems.filter((p) => p.matchedRule?.id === rule.id).length} student(s)
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditRuleModal(rule)}
                          className="p-2 rounded-xl text-slate-500 hover:text-primary hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Edit Rule"
                        >
                          <LuPencil className="size-4" />
                        </button>
                        <button
                          onClick={() => {
                            setRuleToDelete(rule);
                            setIsDeleteRuleModalOpen(true);
                          }}
                          className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Rule"
                        >
                          <LuTrash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center flex flex-col items-center justify-center space-y-3 shadow-xs">
              <div className="size-12 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-primary">
                <LuSlidersHorizontal className="size-6" />
              </div>
              <h4 className="text-base font-black text-slate-800">No Sanction Rules Defined</h4>
              <p className="text-xs text-slate-500 max-w-md font-medium">
                No automatic penalties are currently configured. Click below to add an absence threshold rule.
              </p>
              <Button
                onClick={handleOpenAddRuleModal}
                className="h-10 px-5 rounded-xl font-bold bg-primary hover:bg-primary/95 text-white text-xs cursor-pointer inline-flex items-center gap-1.5 mt-2"
              >
                <LuPlus className="size-4" /> Add Rule Tier
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT SANCTION NOTES & DEADLINE */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Sanction Notes & Deadline"
        className="max-w-lg"
      >
        {editingItem && (
          <form onSubmit={handleSaveModalStatus} className="space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Student Profile</p>
              <p className="text-base font-black text-slate-900">
                {editingItem.student.first_name} {editingItem.student.last_name}
              </p>
              <p className="text-xs text-slate-500 font-mono">
                {editingItem.student.student_id} • {editingItem.absentCount} Event Absence(s)
              </p>
              <p className="text-xs text-slate-600 pt-1 font-medium">
                Missed: {editingItem.missedEvents.map((e) => e.title).join(", ")}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Sanction Status
                </label>
                <select
                  value={formStatus}
                  onChange={(e) =>
                    setFormStatus(e.target.value as "Pending" | "In Progress" | "Completed" | "Waived")
                  }
                  className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Due Date / Deadline
                </label>
                <input
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Officer Notes & Instructions
              </label>
              <textarea
                rows={3}
                placeholder="Compliance instructions, specific service tasks, or meeting location..."
                value={formCustomNotes}
                onChange={(e) => setFormCustomNotes(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                className="h-11 px-5 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSavingStatus}
                className="h-11 px-6 rounded-xl font-black bg-primary hover:bg-primary/95 text-white shadow-md shadow-primary/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                {isSavingStatus ? <LuLoader className="size-4 animate-spin mr-2" /> : null}
                Save Sanction Info
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT SANCTION RULE */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        title={editingRule ? "Edit Sanction Rule Tier" : "Add New Absent Sanction Tier"}
        className="max-w-lg"
      >
        <form onSubmit={handleSaveRule} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Min Absents <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={totalEventsCount > 0 ? totalEventsCount : 99}
                required
                value={ruleMinAbsent}
                onChange={(e) => setRuleMinAbsent(parseInt(e.target.value, 10) || 1)}
                className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Max Absents <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={ruleMinAbsent}
                max={99}
                required
                value={ruleMaxAbsent}
                onChange={(e) => setRuleMaxAbsent(parseInt(e.target.value, 10) || 1)}
                className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>
          </div>

          <p className="text-[11px] font-semibold text-slate-400">
            {ruleMinAbsent === ruleMaxAbsent
              ? `Triggers strictly when a student has exactly ${ruleMinAbsent} absent(s).`
              : `Triggers when a student has between ${ruleMinAbsent} and ${ruleMaxAbsent} absent(s).`}
          </p>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Rule Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 1-2 Events Absence Penalty"
              value={ruleTitle}
              onChange={(e) => setRuleTitle(e.target.value)}
              className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Sanction Type
            </label>
            <select
              value={ruleType}
              onChange={(e) => setRuleType(e.target.value)}
              className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer"
            >
              {SANCTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Penalty Details <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 3 Hours Campus Service & ₱50 Org Contribution"
              value={rulePenaltyDetails}
              onChange={(e) => setRulePenaltyDetails(e.target.value)}
              className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Rule Description & Instructions
            </label>
            <textarea
              rows={3}
              placeholder="Guidelines for students placed under this sanction..."
              value={ruleDescription}
              onChange={(e) => setRuleDescription(e.target.value)}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRuleModalOpen(false)}
              className="h-11 px-5 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSavingRule}
              className="h-11 px-6 rounded-xl font-black bg-primary hover:bg-primary/95 text-white shadow-md shadow-primary/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              {isSavingRule ? <LuLoader className="size-4 animate-spin mr-2" /> : null}
              {editingRule ? "Save Rule" : "Create Rule Tier"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Rule Modal */}
      <ConfirmModal
        isOpen={isDeleteRuleModalOpen}
        onClose={() => setIsDeleteRuleModalOpen(false)}
        onConfirm={handleDeleteRule}
        title="Delete Sanction Rule Tier?"
        description={`Are you sure you want to delete the rule "${ruleToDelete?.title}"?`}
        confirmText="Delete Tier"
        variant="danger"
        isLoading={isDeletingRule}
      />

      {/* Clear All Rules Modal */}
      <ConfirmModal
        isOpen={isClearAllModalOpen}
        onClose={() => setIsClearAllModalOpen(false)}
        onConfirm={handleClearAllRules}
        title="Clear All Sanction Rules?"
        description="Are you sure you want to remove all default sanction rules? This will completely clear all automated penalty tiers from your database."
        confirmText="Clear All Rules"
        variant="danger"
        isLoading={isClearingAllRules}
      />
    </div>
  );
}
