"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LuShieldAlert,
  LuCircleCheck,
  LuClock,
  LuTriangleAlert,
  LuCalendar,
  LuLoader,
  LuSparkles,
  LuRotateCcw,
  LuInfo,
  LuShieldCheck,
  LuUserCheck,
} from "react-icons/lu";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent } from "@/app/Components/ui/card";
import { Button } from "@/app/Components/ui/button";

interface Sanction {
  id: string;
  student_id: string;
  student_name: string;
  email: string | null;
  course: string | null;
  year_section: string | null;
  title: string;
  description: string | null;
  sanction_type: string;
  penalty_details: string | null;
  status: "Pending" | "In Progress" | "Completed" | "Waived";
  due_date: string | null;
  issued_by: string;
  absent_count?: number;
  missed_events?: string | null;
  cleared_at: string | null;
  notes: string | null;
  created_at: string;
}

interface SanctionRule {
  id: string;
  min_absent: number;
  max_absent: number;
  title: string;
  sanction_type: string;
  penalty_details: string;
  description: string | null;
  is_active: boolean;
}

interface EventItem {
  id: string;
  title: string;
  date?: string;
  status?: string;
}

interface UserProfile {
  first_name?: string;
  last_name?: string;
  email?: string;
  course?: string;
  section?: string;
  student_id?: string;
}

export default function StudentSanctionsPage() {
  const [sanctions, setSanctions] = useState<Sanction[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [attendedEventIds, setAttendedEventIds] = useState<Set<string>>(new Set());
  const [rules, setRules] = useState<SanctionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const fetchStudentData = useCallback(async () => {
    let studentId = "";
    let userEmail = "";

    // 1. Check Auth User
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (authUser?.email) {
      userEmail = authUser.email;
    } else {
      // 2. Check localStorage session
      const stored = localStorage.getItem("acetrack_user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          userEmail = parsed.email || "";
          studentId = parsed.student_id || "";
        } catch (e) {
          console.error("Session parse error:", e);
        }
      }
    }

    let fetchedUser: UserProfile | null = null;
    if (userEmail || studentId) {
      const query = supabase.from("users").select("*");
      if (studentId) {
        query.eq("student_id", studentId);
      } else {
        query.eq("email", userEmail);
      }

      const { data: userData } = await query.maybeSingle();
      if (userData) {
        fetchedUser = userData as UserProfile;
        setUser(fetchedUser);
        studentId = userData.student_id;
      }
    }

    // Fetch all events
    const { data: eventsData } = await supabase
      .from("events")
      .select("id, title, date, status, created_at")
      .order("created_at", { ascending: false });
    const currentEvents = eventsData || [];
    setEvents(currentEvents);

    // Fetch rules
    const { data: rulesData } = await supabase
      .from("sanction_rules")
      .select("*")
      .order("min_absent", { ascending: true });
    const currentRules = rulesData || [];
    setRules(currentRules);

    if (studentId) {
      // Fetch student attendance records
      const { data: attData } = await supabase
        .from("attendance")
        .select("event_id, status")
        .eq("student_id", studentId);

      const attendedIds = new Set((attData || []).map((a) => a.event_id));
      setAttendedEventIds(attendedIds);

      const missed = currentEvents.filter((e) => !attendedIds.has(e.id));
      const currentAbsents = missed.length;

      // Fetch student manual sanctions/overrides
      try {
        const { data: sanctionsData, error } = await supabase
          .from("sanctions")
          .select("*")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false });

        if (!error && sanctionsData && sanctionsData.length > 0) {
          setSanctions(sanctionsData);
        } else if (currentAbsents > 0) {
          // Auto-synthesize sanction based on active rules if no manual record
          const matchedRule = currentRules.find(
            (r) => r.is_active && currentAbsents >= r.min_absent && currentAbsents <= r.max_absent
          );

          if (matchedRule) {
            const autoSanction: Sanction = {
              id: "auto-generated",
              student_id: studentId,
              student_name: fetchedUser ? `${fetchedUser.first_name || ""} ${fetchedUser.last_name || ""}`.trim() : "Student",
              email: fetchedUser?.email || null,
              course: fetchedUser?.course || null,
              year_section: fetchedUser?.section || null,
              title: matchedRule.title,
              description: matchedRule.description || `Automated notice for missing ${currentAbsents} mandatory event(s): ${missed.map((e) => e.title).join(", ")}.`,
              sanction_type: matchedRule.sanction_type || "Community Service",
              penalty_details: matchedRule.penalty_details,
              status: "Pending",
              due_date: null,
              issued_by: "ACES Attendance System",
              absent_count: currentAbsents,
              missed_events: missed.map((e) => e.title).join(", "),
              cleared_at: null,
              notes: null,
              created_at: new Date().toISOString(),
            };
            setSanctions([autoSanction]);
          } else {
            setSanctions([]);
          }
        } else {
          setSanctions([]);
        }
      } catch (err) {
        console.error("Error loading sanctions:", err);
        setSanctions([]);
      }
    } else {
      setSanctions([]);
    }

    setLoading(false);
    setRefreshing(false);
  }, [supabase]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (isMounted) {
        await fetchStudentData();
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [fetchStudentData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStudentData();
  };

  const totalEvents = events.length;
  const attendedCount = events.filter((e) => attendedEventIds.has(e.id)).length;
  const missedEvents = events.filter((e) => !attendedEventIds.has(e.id));
  const absentCount = missedEvents.length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return {
          bg: "bg-rose-50 border-rose-200 text-rose-700",
          icon: LuTriangleAlert,
          label: "Pending Compliance",
        };
      case "In Progress":
        return {
          bg: "bg-amber-50 border-amber-200 text-amber-700",
          icon: LuClock,
          label: "Under Review / In Progress",
        };
      case "Completed":
        return {
          bg: "bg-emerald-50 border-emerald-200 text-emerald-700",
          icon: LuCircleCheck,
          label: "Cleared & Resolved",
        };
      case "Waived":
        return {
          bg: "bg-slate-100 border-slate-200 text-slate-700",
          icon: LuShieldCheck,
          label: "Waived / Excused",
        };
      default:
        return {
          bg: "bg-slate-100 border-slate-200 text-slate-700",
          icon: LuInfo,
          label: status,
        };
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight mb-1">
            My Attendance & Sanctions
          </h1>
          <p className="text-sm sm:text-base text-slate-500 font-medium tracking-tight">
            Monitor your event attendance compliance, absences, and assigned disciplinary duties.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="h-10 sm:h-11 px-4 rounded-xl font-bold bg-white text-slate-700 border-slate-200 shadow-xs hover:bg-slate-50 transition-all cursor-pointer inline-flex items-center gap-2 self-start sm:self-auto"
        >
          <LuRotateCcw className={`size-4 ${refreshing ? "animate-spin text-primary" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center gap-3 text-slate-400">
          <LuLoader className="size-8 animate-spin text-primary" />
          <p className="text-xs font-black uppercase tracking-widest">Checking attendance & sanctions...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Attendance KPI Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="rounded-3xl border-slate-200/90 shadow-xs bg-white">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-orange-50 text-primary border border-orange-100">
                  <LuCalendar className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Events</p>
                  <h3 className="text-2xl font-black text-slate-900">{totalEvents}</h3>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-200/90 shadow-xs bg-white">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <LuUserCheck className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Events Attended</p>
                  <h3 className="text-2xl font-black text-emerald-600">{attendedCount}</h3>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-200/90 shadow-xs bg-white">
              <CardContent className="p-5 flex items-center gap-4">
                <div
                  className={`p-3 rounded-2xl border ${
                    absentCount === 0
                      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                      : "bg-rose-50 text-rose-600 border-rose-100"
                  }`}
                >
                  {absentCount === 0 ? (
                    <LuCircleCheck className="size-5" />
                  ) : (
                    <LuTriangleAlert className="size-5" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Absences</p>
                  <h3
                    className={`text-2xl font-black ${
                      absentCount === 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {absentCount}
                  </h3>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* If 0 Absences -> Clean Standing Banner */}
          {absentCount === 0 ? (
            <div className="bg-white rounded-3xl sm:rounded-[3rem] p-8 sm:p-14 md:p-16 border border-slate-200/80 shadow-xs flex flex-col items-center text-center space-y-6">
              <div className="relative">
                <div className="size-28 sm:size-36 rounded-3xl bg-emerald-50 border-4 border-white shadow-xl flex items-center justify-center text-emerald-500 ring-2 ring-emerald-100">
                  <LuShieldCheck className="size-14 sm:size-18" />
                </div>
                <div className="absolute -top-1 -right-1 p-2.5 bg-amber-400 text-white rounded-2xl shadow-lg animate-bounce">
                  <LuSparkles className="size-4 sm:size-5" />
                </div>
              </div>

              <div className="max-w-md space-y-2.5">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-black uppercase tracking-widest">
                  <LuCircleCheck className="size-3.5" /> Perfect Attendance
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  You Have Zero Sanctions!
                </h2>
                <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed">
                  Congratulations! You have attended all organizational events ({attendedCount}/{totalEvents}) and are in exemplary standing with zero penalties.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 w-full max-w-sm">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Exemplary Member Standing • ACETRACK 3.0
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Missed Events Notification */}
              {missedEvents.length > 0 && (
                <div className="bg-rose-50/80 border border-rose-200/80 rounded-3xl p-5 sm:p-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <LuTriangleAlert className="size-5 text-rose-600 shrink-0" />
                    <h3 className="text-base font-black text-rose-900">
                      Attendance Alert ({absentCount} Event Absence{absentCount > 1 ? "s" : ""})
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-rose-700 font-medium">
                    You were recorded absent from the following mandatory event(s). Please review your assigned sanction duties below.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {missedEvents.map((e) => (
                      <span
                        key={e.id}
                        className="px-3 py-1 rounded-xl bg-white border border-rose-200 text-rose-800 text-xs font-bold shadow-2xs"
                      >
                        {e.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Sanctions List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
                    Official Sanctions & Penalties ({sanctions.length})
                  </h3>
                </div>

                {sanctions.map((s) => {
                  const badge = getStatusBadge(s.status);
                  const BadgeIcon = badge.icon;

                  return (
                    <div
                      key={s.id}
                      className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs hover:border-primary/40 transition-all space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-2xl bg-orange-50 text-primary border border-orange-100/80 shrink-0">
                            <LuShieldAlert className="size-5" />
                          </div>
                          <div>
                            <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                              {s.title}
                            </h3>
                            <p className="text-xs font-semibold text-slate-400 mt-0.5">
                              Type: <span className="text-slate-600">{s.sanction_type}</span> • Assigned by:{" "}
                              <span className="text-slate-600">{s.issued_by}</span>
                            </p>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border self-start sm:self-auto shrink-0 ${badge.bg}`}
                        >
                          <BadgeIcon className="size-3.5" />
                          {badge.label}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                        {s.penalty_details && (
                          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-0.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              Penalty / Obligation
                            </p>
                            <p className="font-bold text-slate-800 text-sm">{s.penalty_details}</p>
                          </div>
                        )}

                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-0.5">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Due Date / Deadline
                          </p>
                          <p className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                            <LuCalendar className="size-3.5 text-slate-400" />
                            {s.due_date ? s.due_date : "No explicit deadline specified"}
                          </p>
                        </div>
                      </div>

                      {s.description && (
                        <div className="p-4 rounded-2xl bg-orange-50/50 border border-orange-100/60 text-xs sm:text-sm">
                          <p className="font-bold text-orange-950 mb-1 uppercase tracking-wider text-[10px]">
                            Details & Compliance Instructions:
                          </p>
                          <p className="text-slate-600 font-medium leading-relaxed">{s.description}</p>
                        </div>
                      )}

                      {s.notes && (
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs sm:text-sm">
                          <p className="font-bold text-slate-800 mb-1 uppercase tracking-wider text-[10px]">
                            Officer Notes:
                          </p>
                          <p className="text-slate-600 font-medium leading-relaxed">{s.notes}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 pt-1">
                        <span>Recorded: {new Date(s.created_at).toLocaleDateString()}</span>
                        {s.cleared_at && (
                          <span className="text-emerald-600">
                            Cleared on: {new Date(s.cleared_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
