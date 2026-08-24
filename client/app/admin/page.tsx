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
  LuCircleX,
  LuIdCard
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

const COURSE_FULL_NAMES: Record<string, string> = {
  BSIT: "Information Technology",
  BSCE: "Computer Engineering",
  BITM: "Bachelor of Industrial Technology Management",
  BSM: "Mathematics",
  BSMRS: "Mathematics w/ Research Statistics",
  BSCS: "Computer Science",
  BSEMC: "Entertainment & Multimedia Computing",
  ACT: "Associate in Computer Technology",
};

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
        // Fetch all student members, their courses, year, profile picture, and membership status/payment details
        const { data, error } = await supabase
          .from("users")
          .select(`
            id,
            course,
            year,
            section,
            profile_picture,
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
  // Profile Picture Stats
  // -------------------------------------------------------------
  const profilePicCount = useMemo(() => {
    return membersData.filter(m => Boolean(m.profile_picture && m.profile_picture.trim() !== "")).length;
  }, [membersData]);

  // -------------------------------------------------------------
  // Year Level Data Processing
  // -------------------------------------------------------------
  const yearStats = useMemo(() => {
    let y1 = 0, y2 = 0, y3 = 0, y4 = 0;
    let y1Photos = 0, y2Photos = 0, y3Photos = 0, y4Photos = 0;
    
    membersData.forEach(member => {
      const hasPhoto = Boolean(member.profile_picture && member.profile_picture.trim() !== "");
      const y = (member.year || "").toLowerCase().trim();
      if (y === "1" || y.startsWith("1") || y.includes("1st") || y.includes("first")) {
        y1++;
        if (hasPhoto) y1Photos++;
      } else if (y === "2" || y.startsWith("2") || y.includes("2nd") || y.includes("second")) {
        y2++;
        if (hasPhoto) y2Photos++;
      } else if (y === "3" || y.startsWith("3") || y.includes("3rd") || y.includes("third")) {
        y3++;
        if (hasPhoto) y3Photos++;
      } else if (y === "4" || y.startsWith("4") || y.includes("4th") || y.includes("fourth")) {
        y4++;
        if (hasPhoto) y4Photos++;
      }
    });

    const total = membersData.length || 1;

    return [
      {
        year: "1st Year",
        subtitle: "Freshmen",
        count: y1,
        photoCount: y1Photos,
        percentage: (y1 / total) * 100,
        gradient: "from-indigo-500 to-blue-600",
        bgLight: "bg-indigo-50",
        border: "border-indigo-200",
        text: "text-indigo-600",
        tagBg: "bg-indigo-100 text-indigo-700",
      },
      {
        year: "2nd Year",
        subtitle: "Sophomore",
        count: y2,
        photoCount: y2Photos,
        percentage: (y2 / total) * 100,
        gradient: "from-sky-500 to-teal-600",
        bgLight: "bg-sky-50",
        border: "border-sky-200",
        text: "text-sky-600",
        tagBg: "bg-sky-100 text-sky-700",
      },
      {
        year: "3rd Year",
        subtitle: "Junior",
        count: y3,
        photoCount: y3Photos,
        percentage: (y3 / total) * 100,
        gradient: "from-purple-500 to-fuchsia-600",
        bgLight: "bg-purple-50",
        border: "border-purple-200",
        text: "text-purple-600",
        tagBg: "bg-purple-100 text-purple-700",
      },
      {
        year: "4th Year",
        subtitle: "Senior",
        count: y4,
        photoCount: y4Photos,
        percentage: (y4 / total) * 100,
        gradient: "from-emerald-500 to-teal-600",
        bgLight: "bg-emerald-50",
        border: "border-emerald-200",
        text: "text-emerald-600",
        tagBg: "bg-emerald-100 text-emerald-700",
      }
    ];
  }, [membersData]);

  // -------------------------------------------------------------
  // Course Data Processing for Bar Graph & Cards
  // -------------------------------------------------------------
  const courseStats = useMemo(() => {
    if (membersData.length === 0) return [];

    const grouped: Record<string, {
      course: string;
      students: number;
      photoCount: number;
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
          photoCount: 0,
          funds: 0,
          fullyPaid: 0,
          halfPaid: 0,
          partial: 0,
          unpaid: 0
        };
      }

      grouped[course].students += 1;
      if (member.profile_picture && member.profile_picture.trim() !== "") {
        grouped[course].photoCount += 1;
      }

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

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Dashboard Top Header with Total, Photos, & Funds badges */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-2">Dashboard Overview</h1>
          <p className="text-slate-500 font-medium tracking-tight">Welcome back. Live metrics of registered students by year level, program, and financial collection.</p>
        </div>

        {/* Top Summary Badges */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="p-2 rounded-xl bg-orange-50 text-primary border border-orange-100 flex items-center justify-center">
              <LuUsers className="size-4" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Members</p>
              <p className="text-lg font-black text-slate-900 tracking-tight leading-none mt-1">
                {loading ? "..." : (memberCount?.toString() || "0")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
              <LuIdCard className="size-4" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Digital IDs</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <p className="text-lg font-black text-slate-900 tracking-tight leading-none">
                  {loading ? "..." : profilePicCount}
                </p>
                {!loading && memberCount ? (
                  <span className="text-xs font-bold text-emerald-600">
                    ({Math.round((profilePicCount / memberCount) * 100)}%)
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
              <LuPhilippinePeso className="size-4" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Funds</p>
              <p className="text-lg font-black text-slate-900 tracking-tight leading-none mt-1">
                {loading ? "..." : `₱${(totalFunds || 0).toLocaleString()}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Year Level Demographics Row */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <LuLayers className="size-5 text-primary" />
              Year Level Demographics
            </h3>
            <p className="text-xs text-slate-400 font-bold mt-0.5">
              Enrollment distribution across 1st to 4th year levels.
            </p>
          </div>
          <span className="text-xs font-black text-slate-400 uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded-xl">
            4 Year Levels
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {yearStats.map((item) => (
            <div key={item.year} className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all hover:scale-[1.01]">
              <div className="flex items-center justify-between mb-3">
                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${item.tagBg}`}>
                  {item.subtitle}
                </span>
                <span className="text-xs font-black text-slate-400">{item.percentage.toFixed(1)}%</span>
              </div>
              <h4 className="text-lg font-black text-slate-900 tracking-tight">{item.year}</h4>
              <p className="text-3xl sm:text-4xl font-black text-slate-900 mt-1">{item.count} <span className="text-xs font-bold text-slate-400 uppercase">Students</span></p>

              {/* Progress Bar */}
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mt-4">
                <div 
                  style={{ width: `${item.percentage}%` }} 
                  className={`h-full rounded-full bg-gradient-to-r ${item.gradient}`}
                />
              </div>

              {/* Digital ID Ready Info */}
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mt-3 pt-2.5 border-t border-slate-100">
                <span className="flex items-center gap-1 text-slate-400">
                  <LuIdCard className="size-3 text-emerald-500" /> Digital ID Ready
                </span>
                <span className="text-emerald-600 font-black">
                  {item.photoCount} ({item.count > 0 ? Math.round((item.photoCount / item.count) * 100) : 0}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Course / Program Demographics with BIG Course Titles */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <LuGraduationCap className="size-5 text-primary" />
              Course Program Demographics
            </h3>
            <p className="text-xs text-slate-400 font-bold mt-0.5">
              Live count of students enrolled per academic program.
            </p>
          </div>
          <span className="text-xs font-black text-slate-400 uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded-xl">
            {courseStats.length} Programs
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {courseStats.map((item, idx) => (
            <div 
              key={item.course} 
              onMouseEnter={() => setHoveredCourseIndex(idx)}
              onMouseLeave={() => setHoveredCourseIndex(null)}
              className={`p-6 rounded-3xl bg-white border transition-all duration-300 hover:shadow-lg hover:scale-[1.02] flex flex-col justify-between group ${
                hoveredCourseIndex === idx ? "border-slate-400 shadow-md ring-2 ring-slate-900/5" : "border-slate-200/80 shadow-sm"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`size-12 rounded-2xl flex items-center justify-center font-black text-white shadow-md bg-gradient-to-br ${item.theme.gradient}`}>
                    <LuGraduationCap className="size-6" />
                  </div>
                  <span className={`px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider ${item.theme.bgLight} ${item.theme.text} border ${item.theme.border}`}>
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>

                {/* BIG COURSE NAME DISPLAY */}
                <h4 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">
                  {item.course}
                </h4>
                <p className="text-[11px] font-bold text-slate-400 leading-snug line-clamp-1 mb-2">
                  {COURSE_FULL_NAMES[item.course] || "Academic Program"}
                </p>
                
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">{item.students}</span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{item.students === 1 ? "Student" : "Students"}</span>
                </div>

                {/* Course Financial Metric & Digital ID Stats */}
                <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 mt-4 mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                    <LuIdCard className="size-3 text-emerald-500" />
                    <span>{item.photoCount} IDs Ready</span>
                  </div>
                  <span className="text-xs font-black text-slate-900">₱{item.funds.toLocaleString()}</span>
                </div>

                {/* Status Proportion Multi-Segment Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <span>Payment</span>
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

                  {/* Quick breakdown mini tags */}
                  <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 pt-1 px-0.5">
                    <span className="flex items-center gap-1" title="Fully Paid">
                      <span className="size-1.5 rounded-full bg-emerald-500" /> {item.fullyPaid}
                    </span>
                    <span className="flex items-center gap-1" title="Half Semester">
                      <span className="size-1.5 rounded-full bg-blue-500" /> {item.halfPaid}
                    </span>
                    <span className="flex items-center gap-1" title="Partial">
                      <span className="size-1.5 rounded-full bg-amber-500" /> {item.partial}
                    </span>
                    <span className="flex items-center gap-1" title="Unpaid">
                      <span className="size-1.5 rounded-full bg-rose-500" /> {item.unpaid}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

