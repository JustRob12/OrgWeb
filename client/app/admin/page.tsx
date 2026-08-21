"use client";

import React, { useEffect, useState, useMemo } from "react";
import { 
  LuUsers, 
  LuCalendar, 
  LuPhilippinePeso, 
  LuLoader, 
  LuChartBar,
  LuGraduationCap,
  LuTrendingUp,
  LuLayers,
  LuCircleCheck,
  LuClock,
  LuCircleAlert,
  LuCircleX
} from "react-icons/lu";
import { createClient } from "@/utils/supabase/client";

// Safe helper to extract membership details whether they are an object or an array
const getMembership = (member: any) => {
  if (!member || !member.memberships) return null;
  if (Array.isArray(member.memberships)) return member.memberships[0] || null;
  return member.memberships;
};

// Course Color Presets
interface CourseTheme {
  primary: string;
  gradient: string;
  bgLight: string;
  border: string;
  text: string;
  shadow: string;
}

const PRESET_COURSE_THEMES: Record<string, CourseTheme> = {
  BSIT: {
    primary: "#3b82f6",
    gradient: "from-blue-500 via-blue-600 to-indigo-600",
    bgLight: "bg-blue-50/80",
    border: "border-blue-200",
    text: "text-blue-600",
    shadow: "shadow-blue-500/20"
  },
  BSCE: {
    primary: "#06b6d4",
    gradient: "from-cyan-500 via-cyan-600 to-teal-600",
    bgLight: "bg-cyan-50/80",
    border: "border-cyan-200",
    text: "text-cyan-600",
    shadow: "shadow-cyan-500/20"
  },
  BITM: {
    primary: "#8b5cf6",
    gradient: "from-violet-500 via-purple-600 to-fuchsia-600",
    bgLight: "bg-purple-50/80",
    border: "border-purple-200",
    text: "text-purple-600",
    shadow: "shadow-purple-500/20"
  },
  BSM: {
    primary: "#f97316",
    gradient: "from-orange-500 via-amber-600 to-yellow-600",
    bgLight: "bg-orange-50/80",
    border: "border-orange-200",
    text: "text-orange-600",
    shadow: "shadow-orange-500/20"
  },
  BSMRS: {
    primary: "#ec4899",
    gradient: "from-pink-500 via-rose-600 to-red-600",
    bgLight: "bg-pink-50/80",
    border: "border-pink-200",
    text: "text-pink-600",
    shadow: "shadow-pink-500/20"
  },
  BSCS: {
    primary: "#10b981",
    gradient: "from-emerald-500 via-emerald-600 to-teal-600",
    bgLight: "bg-emerald-50/80",
    border: "border-emerald-200",
    text: "text-emerald-600",
    shadow: "shadow-emerald-500/20"
  },
  BSEMC: {
    primary: "#6366f1",
    gradient: "from-indigo-500 via-indigo-600 to-blue-600",
    bgLight: "bg-indigo-50/80",
    border: "border-indigo-200",
    text: "text-indigo-600",
    shadow: "shadow-indigo-500/20"
  },
  ACT: {
    primary: "#eab308",
    gradient: "from-amber-400 via-amber-500 to-yellow-600",
    bgLight: "bg-amber-50/80",
    border: "border-amber-200",
    text: "text-amber-600",
    shadow: "shadow-amber-500/20"
  }
};

const FALLBACK_PALETTE: CourseTheme[] = [
  { primary: "#3b82f6", gradient: "from-blue-500 to-indigo-600", bgLight: "bg-blue-50/80", border: "border-blue-200", text: "text-blue-600", shadow: "shadow-blue-500/20" },
  { primary: "#8b5cf6", gradient: "from-violet-500 to-purple-600", bgLight: "bg-purple-50/80", border: "border-purple-200", text: "text-purple-600", shadow: "shadow-purple-500/20" },
  { primary: "#06b6d4", gradient: "from-cyan-500 to-teal-600", bgLight: "bg-cyan-50/80", border: "border-cyan-200", text: "text-cyan-600", shadow: "shadow-cyan-500/20" },
  { primary: "#f97316", gradient: "from-orange-500 to-amber-600", bgLight: "bg-orange-50/80", border: "border-orange-200", text: "text-orange-600", shadow: "shadow-orange-500/20" },
  { primary: "#10b981", gradient: "from-emerald-500 to-teal-600", bgLight: "bg-emerald-50/80", border: "border-emerald-200", text: "text-emerald-600", shadow: "shadow-emerald-500/20" },
  { primary: "#ec4899", gradient: "from-pink-500 to-rose-600", bgLight: "bg-pink-50/80", border: "border-pink-200", text: "text-pink-600", shadow: "shadow-pink-500/20" },
  { primary: "#6366f1", gradient: "from-indigo-500 to-blue-600", bgLight: "bg-indigo-50/80", border: "border-indigo-200", text: "text-indigo-600", shadow: "shadow-indigo-500/20" },
  { primary: "#14b8a6", gradient: "from-teal-500 to-emerald-600", bgLight: "bg-teal-50/80", border: "border-teal-200", text: "text-teal-600", shadow: "shadow-teal-500/20" },
  { primary: "#f43f5e", gradient: "from-rose-500 to-pink-600", bgLight: "bg-rose-50/80", border: "border-rose-200", text: "text-rose-600", shadow: "shadow-rose-500/20" }
];

const getCourseTheme = (courseName: string, index: number): CourseTheme => {
  const clean = (courseName || "").toUpperCase().trim();
  if (PRESET_COURSE_THEMES[clean]) {
    return PRESET_COURSE_THEMES[clean];
  }
  return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  "Fully Paid": { label: "Fully Paid", color: "bg-emerald-500", bg: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: LuCircleCheck },
  "Half Semester Paid": { label: "Half Semester", color: "bg-blue-500", bg: "bg-blue-50 text-blue-700 border-blue-200", icon: LuClock },
  "Partial": { label: "Partial", color: "bg-amber-500", bg: "bg-amber-50 text-amber-700 border-amber-200", icon: LuCircleAlert },
  "Not Paid": { label: "Unpaid", color: "bg-rose-500", bg: "bg-rose-50 text-rose-700 border-rose-200", icon: LuCircleX }
};

export default function AdminDashboard() {
  const [membersData, setMembersData] = useState<any[]>([]);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [totalFunds, setTotalFunds] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Bar Graph View Metric: "members" | "funds" | "status"
  const [chartMetric, setChartMetric] = useState<"members" | "funds" | "status">("members");
  const [hoveredCourseIndex, setHoveredCourseIndex] = useState<number | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function fetchStatsAndCharts() {
      setLoading(true);
      try {
        // Fetch all student members, their courses, membership status/payment details
        const { data, error } = await supabase
          .from("users")
          .select(`
            id,
            course,
            memberships:memberships(status, payment, created_at),
            accounts:accounts!inner(role)
          `)
          .eq("accounts.role", 1);

        if (error) throw error;

        const records = data || [];
        setMembersData(records);
        setMemberCount(records.length);

        // Sum payments
        const sum = records.reduce((acc, curr) => {
          const ms = getMembership(curr);
          return acc + (Number(ms?.payment) || 0);
        }, 0);
        setTotalFunds(sum);

      } catch (err) {
        console.error("Dashboard Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStatsAndCharts();
  }, []);

  // -------------------------------------------------------------
  // Course Data Processing for Bar Graph & Cards
  // -------------------------------------------------------------
  const courseStats = useMemo(() => {
    if (membersData.length === 0) return [];

    const grouped: Record<string, {
      course: string;
      students: number;
      funds: number;
      fullyPaid: number;
      halfPaid: number;
      partial: number;
      unpaid: number;
    }> = {};

    membersData.forEach(member => {
      const course = (member.course || "Other").trim().toUpperCase();
      if (!grouped[course]) {
        grouped[course] = {
          course,
          students: 0,
          funds: 0,
          fullyPaid: 0,
          halfPaid: 0,
          partial: 0,
          unpaid: 0
        };
      }

      grouped[course].students += 1;

      const ms = getMembership(member);
      if (ms) {
        grouped[course].funds += Number(ms.payment) || 0;
        const status = ms.status || "Not Paid";
        if (status === "Fully Paid") grouped[course].fullyPaid += 1;
        else if (status === "Half Semester Paid") grouped[course].halfPaid += 1;
        else if (status === "Partial") grouped[course].partial += 1;
        else grouped[course].unpaid += 1;
      } else {
        grouped[course].unpaid += 1;
      }
    });

    const totalStudents = membersData.length || 1;

    return Object.values(grouped)
      .sort((a, b) => b.students - a.students)
      .map((item, idx) => ({
        ...item,
        percentage: (item.students / totalStudents) * 100,
        theme: getCourseTheme(item.course, idx)
      }));
  }, [membersData]);

  // Max value calculation for bar chart scaling
  const maxBarValue = useMemo(() => {
    if (courseStats.length === 0) return 10;
    if (chartMetric === "funds") {
      const maxFunds = Math.max(...courseStats.map(c => c.funds));
      return maxFunds > 0 ? maxFunds * 1.15 : 1000;
    }
    const maxStudents = Math.max(...courseStats.map(c => c.students));
    return maxStudents > 0 ? Math.ceil(maxStudents * 1.2) : 10;
  }, [courseStats, chartMetric]);

  // General dashboard stats
  const stats = [
    { 
      name: "Total Members", 
      value: loading ? "..." : (memberCount?.toString() || "0"), 
      icon: LuUsers, 
      color: "text-orange-600 border-orange-100 bg-orange-50/50 shadow-orange-100" 
    },
    { 
      name: "Upcoming Events", 
      value: "3", 
      icon: LuCalendar, 
      color: "text-emerald-600 border-emerald-100 bg-emerald-50/50 shadow-emerald-100" 
    },
    { 
      name: "Total Funds Collected", 
      value: loading ? "..." : `₱${(totalFunds || 0).toLocaleString()}`, 
      icon: LuPhilippinePeso, 
      color: "text-amber-600 border-amber-100 bg-amber-50/50 shadow-amber-100" 
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Dashboard Top Header */}
      <div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-2">Dashboard Overview</h1>
        <p className="text-slate-500 font-medium tracking-tight">Welcome back. Here's a live audit of your organization's financials and course demographics.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group flex items-center gap-5">
            <div className={`p-4 rounded-2xl border flex items-center justify-center transition-transform group-hover:scale-105 ${stat.color}`}>
              <stat.icon className="size-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{stat.name}</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-black text-slate-900 tracking-tight leading-none">{stat.value}</p>
                {loading && <LuLoader className="size-4 animate-spin text-slate-300" />}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Bar Graph Card */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/80 shadow-sm flex flex-col justify-between relative overflow-hidden">
        {/* Header & Metric View Switcher */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-primary/10 text-primary rounded-full mb-1.5">
              <LuChartBar className="size-3.5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Course Analytics</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              Course Distribution Bar Graph
            </h3>
            <p className="text-xs text-slate-400 font-bold mt-0.5">
              Compare member enrollment, financial collection, and payment statuses by course.
            </p>
          </div>

          {/* Metric Switcher Tabs */}
          <div className="flex items-center bg-slate-100/80 p-1.5 rounded-2xl gap-1 flex-wrap border border-slate-200/50">
            <button
              onClick={() => { setChartMetric("members"); setHoveredCourseIndex(null); }}
              className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                chartMetric === "members"
                  ? "bg-white text-slate-900 shadow-sm shadow-slate-200 ring-1 ring-slate-200/60"
                  : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <LuUsers className="size-3.5 text-blue-500" />
              Student Count
            </button>
            <button
              onClick={() => { setChartMetric("funds"); setHoveredCourseIndex(null); }}
              className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                chartMetric === "funds"
                  ? "bg-white text-slate-900 shadow-sm shadow-slate-200 ring-1 ring-slate-200/60"
                  : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <LuPhilippinePeso className="size-3.5 text-amber-500" />
              Funds Collected
            </button>
            <button
              onClick={() => { setChartMetric("status"); setHoveredCourseIndex(null); }}
              className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                chartMetric === "status"
                  ? "bg-white text-slate-900 shadow-sm shadow-slate-200 ring-1 ring-slate-200/60"
                  : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <LuLayers className="size-3.5 text-emerald-500" />
              Payment Statuses
            </button>
          </div>
        </div>

        {/* Content Loading & Empty States */}
        {loading ? (
          <div className="h-80 flex flex-col items-center justify-center gap-3">
            <LuLoader className="size-8 text-primary animate-spin" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Generating Bar Graph...</p>
          </div>
        ) : courseStats.length === 0 ? (
          <div className="h-80 flex flex-col items-center justify-center text-slate-300 font-bold italic">
            No registered students available to display course distribution.
          </div>
        ) : (
          <div>
            {/* Bar Graph Visual Area */}
            <div className="relative pt-6 pb-2">
              {/* Background Grid Lines */}
              <div className="absolute inset-0 top-6 bottom-10 flex flex-col justify-between pointer-events-none opacity-40">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="w-full border-b border-dashed border-slate-200" />
                ))}
              </div>

              {/* Bar Columns Container */}
              <div className="relative h-72 flex items-end justify-around gap-3 sm:gap-6 px-4 z-10">
                {courseStats.map((item, idx) => {
                  const isHovered = hoveredCourseIndex === idx;
                  const barValue = chartMetric === "funds" ? item.funds : item.students;
                  const heightPercent = Math.min(100, Math.max(8, (barValue / maxBarValue) * 100));

                  return (
                    <div 
                      key={item.course}
                      className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                      onMouseEnter={() => setHoveredCourseIndex(idx)}
                      onMouseLeave={() => setHoveredCourseIndex(null)}
                    >
                      {/* Floating Info Tooltip */}
                      {isHovered && (
                        <div className="absolute top-0 z-30 bg-slate-900/95 text-white p-3 rounded-2xl shadow-xl backdrop-blur-md text-xs pointer-events-none animate-in fade-in zoom-in-95 duration-150 border border-slate-700 min-w-[200px]">
                          <div className="flex items-center justify-between border-b border-slate-700 pb-1.5 mb-2">
                            <span className="font-black text-sm uppercase tracking-wider text-white flex items-center gap-1.5">
                              <span className="size-2.5 rounded-full" style={{ backgroundColor: item.theme.primary }} />
                              {item.course}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">{item.percentage.toFixed(1)}% of total</span>
                          </div>
                          <div className="space-y-1 font-medium">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Students:</span>
                              <span className="font-bold text-white">{item.students}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Collected:</span>
                              <span className="font-bold text-amber-400">₱{item.funds.toLocaleString()}</span>
                            </div>
                            <div className="pt-1.5 border-t border-slate-800 grid grid-cols-2 gap-1 text-[10px]">
                              <span className="text-emerald-400">Fully Paid: {item.fullyPaid}</span>
                              <span className="text-blue-400">Half Paid: {item.halfPaid}</span>
                              <span className="text-amber-400">Partial: {item.partial}</span>
                              <span className="text-rose-400">Unpaid: {item.unpaid}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Top Value Label Pill */}
                      <div className={`mb-2 px-2 py-0.5 rounded-full text-[10px] font-black transition-all ${
                        isHovered 
                          ? "bg-slate-900 text-white scale-110 shadow-md" 
                          : "text-slate-600 bg-slate-100"
                      }`}>
                        {chartMetric === "funds" ? `₱${item.funds.toLocaleString()}` : item.students}
                      </div>

                      {/* Bar Column Visual */}
                      <div className="w-full max-w-[64px] relative flex flex-col justify-end" style={{ height: `${heightPercent}%` }}>
                        {chartMetric === "status" && item.students > 0 ? (
                          /* Multi-Segment Status Stacked Bar */
                          <div className={`w-full h-full rounded-2xl overflow-hidden flex flex-col-reverse shadow-md transition-transform duration-300 ${
                            isHovered ? "scale-105 ring-2 ring-slate-900 shadow-xl" : ""
                          }`}>
                            {item.unpaid > 0 && (
                              <div 
                                style={{ height: `${(item.unpaid / item.students) * 100}%` }} 
                                className="bg-rose-500 transition-all hover:opacity-90"
                                title={`Unpaid: ${item.unpaid}`}
                              />
                            )}
                            {item.partial > 0 && (
                              <div 
                                style={{ height: `${(item.partial / item.students) * 100}%` }} 
                                className="bg-amber-500 transition-all hover:opacity-90"
                                title={`Partial: ${item.partial}`}
                              />
                            )}
                            {item.halfPaid > 0 && (
                              <div 
                                style={{ height: `${(item.halfPaid / item.students) * 100}%` }} 
                                className="bg-blue-500 transition-all hover:opacity-90"
                                title={`Half Paid: ${item.halfPaid}`}
                              />
                            )}
                            {item.fullyPaid > 0 && (
                              <div 
                                style={{ height: `${(item.fullyPaid / item.students) * 100}%` }} 
                                className="bg-emerald-500 transition-all hover:opacity-90"
                                title={`Fully Paid: ${item.fullyPaid}`}
                              />
                            )}
                          </div>
                        ) : (
                          /* Solid Gradient Course Bar */
                          <div 
                            className={`w-full h-full rounded-2xl bg-gradient-to-t ${item.theme.gradient} transition-all duration-300 relative overflow-hidden shadow-lg ${item.theme.shadow} ${
                              isHovered ? "scale-105 brightness-110 shadow-2xl" : "hover:brightness-105"
                            }`}
                          >
                            {/* Inner Glass Highlight Effect */}
                            <div className="absolute inset-x-0 top-0 h-1/3 bg-white/25 rounded-t-2xl pointer-events-none" />
                          </div>
                        )}
                      </div>

                      {/* X-Axis Course Label */}
                      <div className="mt-3 flex flex-col items-center gap-1">
                        <span className={`text-xs font-black tracking-tight px-2 py-0.5 rounded-lg transition-colors ${
                          isHovered 
                            ? "bg-slate-900 text-white" 
                            : "text-slate-700 bg-slate-100"
                        }`}>
                          {item.course}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400">
                          {item.percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status Legend if status view is active */}
            {chartMetric === "status" && (
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-6 flex-wrap text-xs font-bold text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-emerald-500" />
                  <span>Fully Paid</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-blue-500" />
                  <span>Half Semester</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-amber-500" />
                  <span>Partial</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-rose-500" />
                  <span>Unpaid</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Colorful Course Breakdown Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <LuGraduationCap className="size-5 text-primary" />
              Course Demographics & Details
            </h3>
            <p className="text-xs text-slate-400 font-bold mt-0.5">
              Detailed program cards highlighting student participation and payment distribution.
            </p>
          </div>
          <span className="text-xs font-black text-slate-400 uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded-xl">
            {courseStats.length} Programs Registered
          </span>
        </div>

        {/* Responsive Grid of Course Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {courseStats.map((item, idx) => (
            <div 
              key={item.course}
              onMouseEnter={() => setHoveredCourseIndex(idx)}
              onMouseLeave={() => setHoveredCourseIndex(null)}
              className={`p-5 rounded-3xl border transition-all duration-300 bg-white hover:shadow-lg relative overflow-hidden group ${
                hoveredCourseIndex === idx ? "border-slate-400 shadow-md scale-[1.02]" : "border-slate-200/80 shadow-sm"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className={`size-10 rounded-2xl flex items-center justify-center font-black text-white shadow-md bg-gradient-to-br ${item.theme.gradient}`}>
                    <LuGraduationCap className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-900 tracking-tight leading-none">
                      {item.course}
                    </h4>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">
                      {item.percentage.toFixed(1)}% of student body
                    </p>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${item.theme.bgLight} ${item.theme.text} border ${item.theme.border}`}>
                  {item.students} {item.students === 1 ? "Student" : "Students"}
                </span>
              </div>

              {/* Course Financial Metric */}
              <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100 mb-4 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Funds</span>
                <span className="text-sm font-black text-slate-900">₱{item.funds.toLocaleString()}</span>
              </div>

              {/* Status Proportion Multi-Segment Progress Bar */}
              <div>
                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  <span>Payment Audit</span>
                  <span className="text-emerald-600 font-bold">
                    {item.students > 0 ? `${((item.fullyPaid / item.students) * 100).toFixed(0)}% Paid` : "0%"}
                  </span>
                </div>

                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  {item.students > 0 ? (
                    <>
                      <div style={{ width: `${(item.fullyPaid / item.students) * 100}%` }} className="bg-emerald-500 h-full" title={`Fully Paid: ${item.fullyPaid}`} />
                      <div style={{ width: `${(item.halfPaid / item.students) * 100}%` }} className="bg-blue-500 h-full" title={`Half Paid: ${item.halfPaid}`} />
                      <div style={{ width: `${(item.partial / item.students) * 100}%` }} className="bg-amber-500 h-full" title={`Partial: ${item.partial}`} />
                      <div style={{ width: `${(item.unpaid / item.students) * 100}%` }} className="bg-rose-500 h-full" title={`Unpaid: ${item.unpaid}`} />
                    </>
                  ) : (
                    <div className="w-full bg-slate-200 h-full" />
                  )}
                </div>

                {/* Quick breakdown tags */}
                <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 mt-2 px-0.5">
                  <span className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-500" /> {item.fullyPaid}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-blue-500" /> {item.halfPaid}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-amber-500" /> {item.partial}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-rose-500" /> {item.unpaid}
                  </span>
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

