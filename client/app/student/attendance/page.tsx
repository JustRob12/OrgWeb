"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  LuCalendar,
  LuClock,
  LuMapPin,
  LuCircleCheck,
  LuCircleX,
  LuLoader,
  LuSearch,
  LuX,
  LuUserCheck,
  LuFilter,
  LuSparkles,
  LuRotateCcw,
  LuTrendingUp,
  LuShieldAlert
} from "react-icons/lu";
import { Button } from "@/app/Components/ui/button";
import { Input } from "@/app/Components/ui/input";
import { createClient } from "@/utils/supabase/client";

interface AttendanceRecord {
  eventId: string;
  title: string;
  date: string;
  rawDate: string;
  timeIn: string;
  timeOut: string;
  location: string;
  status: "Present" | "Absent";
  eventActive: number;
  hasTimeIn: boolean;
  hasTimeOut: boolean;
}

export default function StudentAttendancePage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ present: 0, absent: 0, total: 0, rate: 100 });
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "present" | "absent">("all");

  const supabase = useMemo(() => createClient(), []);

  const getAttendanceData = useCallback(async () => {
    try {
      const localUser = localStorage.getItem("acetrack_user");
      if (!localUser) return;

      const parsed = JSON.parse(localUser);
      const email = parsed.email || parsed.username;
      const cachedStudentId = parsed.student_id;

      let studentId = cachedStudentId;

      if (!studentId && email) {
        const { data: userData } = await supabase
          .from("users")
          .select("student_id")
          .eq("email", email)
          .single();

        if (userData?.student_id) {
          studentId = userData.student_id;
        }
      }

      if (!studentId) return;

      // 1. Fetch ALL events (both active AND inactive).
      // Inactive events have scanning closed, but their attendance records MUST still display for students!
      const { data: allEvents, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .order("start_time", { ascending: false });

      if (eventsError) {
        console.error("Error fetching events for attendance:", eventsError);
      }

      // 2. Fetch student check-ins for all events
      const { data: checkins, error: attError } = await supabase
        .from("attendance")
        .select("*")
        .eq("student_id", studentId);

      if (attError) {
        console.error("Error fetching student attendance logs:", attError);
      }

      const checkinMap = new Map();
      if (checkins) {
        checkins.forEach((c) => {
          checkinMap.set(c.event_id, c);
        });
      }

      const now = new Date();
      let presentCount = 0;
      let absentCount = 0;

      // Filter to events that are relevant for attendance:
      // - Events where the student has an attendance check-in record
      // - OR Events that have already started (start_time <= now)
      // - OR Inactive events (active === 0, meaning scanning was closed/concluded by officers)
      const relevantEvents = (allEvents || []).filter((ev) => {
        const hasCheckin = checkinMap.has(ev.id);
        const isPastOrCurrent = new Date(ev.start_time) <= now;
        const isInactive = ev.active === 0;
        return hasCheckin || isPastOrCurrent || isInactive;
      });

      const mappedRecords: AttendanceRecord[] = relevantEvents.map((ev) => {
        const hasCheckin = checkinMap.get(ev.id);
        const evDate = new Date(ev.start_time);

        const isPresent = Boolean(hasCheckin);
        if (isPresent) {
          presentCount++;
        } else {
          absentCount++;
        }

        let timeInStr = "--:--";
        let hasTimeIn = false;
        if (hasCheckin?.time_in) {
          timeInStr = new Date(hasCheckin.time_in).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          hasTimeIn = true;
        }

        let timeOutStr = "--:--";
        let hasTimeOut = false;
        if (hasCheckin?.time_out) {
          timeOutStr = new Date(hasCheckin.time_out).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          hasTimeOut = true;
        }

        return {
          eventId: ev.id,
          title: ev.title,
          date: evDate.toLocaleDateString("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
          }),
          rawDate: ev.start_time,
          timeIn: timeInStr,
          timeOut: timeOutStr,
          location: ev.location || "TBD",
          status: isPresent ? "Present" : "Absent",
          eventActive: ev.active ?? 1,
          hasTimeIn,
          hasTimeOut,
        };
      });

      const totalRecorded = presentCount + absentCount;
      const rate = totalRecorded > 0 ? Math.round((presentCount / totalRecorded) * 100) : 100;

      setRecords(mappedRecords);
      setStats({
        present: presentCount,
        absent: absentCount,
        total: totalRecorded,
        rate,
      });
    } catch (err) {
      console.error("Attendance load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase]);

  useEffect(() => {
    getAttendanceData();
  }, [getAttendanceData]);

  const handleRefresh = () => {
    setRefreshing(true);
    getAttendanceData();
  };

  // Filter records based on status tab and search
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      if (statusFilter === "present" && rec.status !== "Present") return false;
      if (statusFilter === "absent" && rec.status !== "Absent") return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = rec.title?.toLowerCase().includes(query);
        const locMatch = rec.location?.toLowerCase().includes(query);
        const dateMatch = rec.date?.toLowerCase().includes(query);
        return titleMatch || locMatch || dateMatch;
      }
      return true;
    });
  }, [records, statusFilter, searchQuery]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <LuLoader className="size-10 animate-spin text-primary" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
          Synchronizing attendance history...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-black uppercase tracking-wider border border-primary/20">
            <LuUserCheck className="size-3.5" /> Official Attendance History
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-none">
            My Attendance Record
          </h1>
          <p className="text-slate-500 text-sm sm:text-base font-medium tracking-tight">
            Track your participation and time-in/out timestamps across all organization events.
          </p>
        </div>

        {/* Action button */}
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
          className="h-10 sm:h-11 px-4 rounded-xl font-bold bg-white text-slate-700 border-slate-200 shadow-xs hover:bg-slate-50 transition-all cursor-pointer inline-flex items-center gap-2"
        >
          <LuRotateCcw className={`size-4 ${refreshing ? "animate-spin text-primary" : ""}`} />
          Refresh Records
        </Button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Events Evaluated */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-tight">
            Total Events
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{stats.total}</span>
            <LuCalendar className="size-5 text-slate-300" />
          </div>
        </div>

        {/* Present Count */}
        <div className="bg-emerald-50/70 p-5 rounded-3xl border border-emerald-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-emerald-800 tracking-widest leading-tight">
            Total Present
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-700">{stats.present}</span>
            <LuCircleCheck className="size-5 text-emerald-500" />
          </div>
        </div>

        {/* Absent Count */}
        <div className="bg-rose-50/70 p-5 rounded-3xl border border-rose-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-rose-800 tracking-widest leading-tight">
            Absences
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-black text-rose-600">{stats.absent}</span>
            <LuCircleX className="size-5 text-rose-400" />
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="bg-orange-50/70 p-5 rounded-3xl border border-orange-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-orange-800 tracking-widest leading-tight">
            Compliance Rate
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-black text-orange-700">{stats.rate}%</span>
            <LuTrendingUp className="size-5 text-primary" />
          </div>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
        <div className="flex bg-slate-100/90 p-1.5 rounded-2xl gap-1.5 self-start sm:self-auto w-full sm:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === "all"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            All Logs ({records.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("present")}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === "present"
                ? "bg-emerald-500 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <LuCircleCheck className="size-3.5" /> Present ({stats.present})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("absent")}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === "absent"
                ? "bg-rose-500 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <LuCircleX className="size-3.5" /> Absent ({stats.absent})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <LuSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Search event or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-9 h-11 rounded-2xl bg-white border-slate-200 text-xs sm:text-sm font-medium focus:ring-primary/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <LuX className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Table / Mobile Cards */}
      <div className="bg-white rounded-2xl sm:rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        {/* Desktop Table View (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Event & Location
                </th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Date
                </th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Time In
                </th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Time Out
                </th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Event Status
                </th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">
                  Attendance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-16 text-center text-slate-400 font-medium">
                    <LuCalendar className="size-10 text-slate-200 mx-auto mb-3" />
                    <p className="font-bold text-slate-600 text-base">No attendance records found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchQuery
                        ? "Try adjusting your search query or filter criteria."
                        : "Your attendance check-ins for organization events will appear here."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record, index) => (
                  <tr key={index} className="group hover:bg-slate-50/60 transition-colors">
                    {/* Event & Location */}
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="size-11 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-primary group-hover:shadow-md transition-all shrink-0 border border-slate-100">
                          <LuCalendar className="size-5" />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-sm leading-snug">{record.title}</p>
                          <p className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mt-0.5">
                            <LuMapPin className="size-3 text-slate-400" /> {record.location}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-5">
                      <p className="text-xs font-black text-slate-700 tracking-tight leading-none">{record.date}</p>
                    </td>

                    {/* Time In */}
                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                          record.hasTimeIn ? "text-emerald-700" : "text-slate-300"
                        }`}
                      >
                        <LuClock className="size-3.5 text-slate-400" /> {record.timeIn}
                      </span>
                    </td>

                    {/* Time Out */}
                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                          record.hasTimeOut ? "text-blue-700" : "text-slate-300"
                        }`}
                      >
                        <LuClock className="size-3.5 text-slate-400" /> {record.timeOut}
                      </span>
                    </td>

                    {/* Event Status (Active vs Inactive) */}
                    <td className="px-6 py-5">
                      {record.eventActive === 1 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] uppercase tracking-wider border border-emerald-200/60">
                          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active (Open)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-wider border border-slate-200">
                          <LuCircleX className="size-3 text-slate-400" /> Inactive (Closed)
                        </span>
                      )}
                    </td>

                    {/* Attendance Badge */}
                    <td className="px-8 py-5 text-right">
                      {record.status === "Present" ? (
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-black text-[10px] uppercase tracking-widest border border-emerald-200/80 shadow-2xs">
                          <LuCircleCheck className="size-3.5 text-emerald-600" /> Present
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-50 text-rose-600 font-black text-[10px] uppercase tracking-widest border border-rose-200/80 shadow-2xs">
                          <LuCircleX className="size-3.5 text-rose-500" /> Absent
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List (< md) */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredRecords.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <LuCalendar className="size-10 text-slate-200 mx-auto mb-3" />
              <p className="font-bold text-slate-600 text-sm">No attendance records found</p>
              <p className="text-xs text-slate-400 mt-1">Check back once attendance has been scanned.</p>
            </div>
          ) : (
            filteredRecords.map((record, index) => (
              <div key={index} className="p-4 sm:p-5 space-y-3 bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-black text-slate-900 text-sm leading-snug">{record.title}</h4>
                    <p className="flex items-center gap-1 text-xs font-medium text-slate-400 mt-0.5">
                      <LuMapPin className="size-3" /> {record.location}
                    </p>
                  </div>

                  {/* Attendance badge */}
                  {record.status === "Present" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-black text-[9px] uppercase tracking-wider border border-emerald-200 shrink-0">
                      <LuCircleCheck className="size-3 text-emerald-600" /> Present
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 font-black text-[9px] uppercase tracking-wider border border-rose-200 shrink-0">
                      <LuCircleX className="size-3 text-rose-500" /> Absent
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-0.5">
                      Date & Mode
                    </span>
                    <span className="font-bold text-slate-800 text-xs block">{record.date}</span>
                    <span className="text-[10px] font-semibold text-slate-500 block mt-0.5">
                      {record.eventActive === 1 ? "Active Event" : "Inactive (Scanning Closed)"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-0.5">
                      Logged Times
                    </span>
                    <span className="font-bold text-emerald-700 text-xs block">In: {record.timeIn}</span>
                    <span className="font-bold text-blue-700 text-xs block mt-0.5">Out: {record.timeOut}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
