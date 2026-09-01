"use client";

import React, { useEffect, useState, useMemo, useRef, useId, useCallback } from "react";
import { 
  LuUsers, 
  LuCalendar, 
  LuPhilippinePeso, 
  LuLoader, 
  LuGraduationCap, 
  LuTrendingUp, 
  LuLayers, 
  LuCircleCheck, 
  LuClock, 
  LuCircleAlert, 
  LuCircleX, 
  LuIdCard,
  LuChartPie,
  LuSparkles,
  LuCheckCheck,
  LuArrowUpRight,
  LuFilter,
  LuRefreshCw,
  LuSearch,
  LuAward,
  LuActivity,
  LuChartBar,
  LuTarget
} from "react-icons/lu";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

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
  BSCE: "Civil Engineering",
  BITM: "Industrial Technology Management",
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

interface EventOption {
  id: string;
  title: string;
  active: number;
  start_time: string;
}

interface AttendanceItem {
  id: string;
  event_id: string;
  course: string;
  time_in: string | null;
  time_out: string | null;
  status: string;
  student_id: string;
}

// -------------------------------------------------------------
// 1. SaaS Animated Counter Component with Ease-Out
// -------------------------------------------------------------
function AnimatedCounter({
  value,
  duration = 900,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    startValueRef.current = displayValue;
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing: easeOutExpo for slick SaaS metric animation
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = startValueRef.current + (value - startValueRef.current) * ease;
      
      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  const formatted = decimals > 0 
    ? displayValue.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : Math.round(displayValue).toLocaleString();

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}{formatted}{suffix}
    </span>
  );
}

// -------------------------------------------------------------
// 2. SaaS Dynamic Sparkline Mini-Graph Component
// -------------------------------------------------------------
function SaaSSparkline({
  data = [10, 22, 18, 30, 28, 42, 38, 50],
  color = "#f97316",
  height = 36,
  className = ""
}: {
  data?: number[];
  color?: string;
  height?: number;
  className?: string;
}) {
  const gradId = useId();
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 120;
  
  // Calculate SVG curve path using cubic bezier smoothing
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 10) - 5;
    return { x, y };
  });

  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const mx = (p0.x + p1.x) / 2;
    pathD += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  const fillD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  return (
    <div className={`relative ${className}`}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={fillD} fill={`url(#${gradId})`} />
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-700"
        />
        {points.length > 0 && (
          <g transform={`translate(${points[points.length - 1].x}, ${points[points.length - 1].y})`}>
            <circle r="4" fill={color} className="animate-ping opacity-60" />
            <circle r="3" fill="#ffffff" stroke={color} strokeWidth="2" />
          </g>
        )}
      </svg>
    </div>
  );
}

// -------------------------------------------------------------
// 3. SaaS Radial Gauge Component
// -------------------------------------------------------------
function RadialProgressGauge({
  percentage,
  size = 46,
  strokeWidth = 4.5,
  color = "#3b82f6",
  trackColor = "#f1f5f9",
  children,
  className = "",
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percentage));
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-center">
        {children}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// MAIN DASHBOARD COMPONENT
// -------------------------------------------------------------
export default function AdminDashboard() {
  const [membersData, setMembersData] = useState<any[]>([]);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [totalFunds, setTotalFunds] = useState<number>(0);
  const [eventsList, setEventsList] = useState<EventOption[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const [hoveredPieIndex, setHoveredPieIndex] = useState<number | null>(null);
  const [attendanceViewMode, setAttendanceViewMode] = useState<"donut" | "leaderboard" | "gauges">("donut");
  const [courseSearch, setCourseSearch] = useState<string>("");
  const [courseSortBy, setCourseSortBy] = useState<"students" | "funds" | "photos" | "paid">("students");
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");

  const supabase = createClient();

  const fetchStatsAndCharts = useCallback(async (showToast = false) => {
    if (showToast) setIsRefreshing(true);
    else setLoading(true);

    try {
      // 1. Fetch Users with Memberships (paginated)
      let allRecords: any[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("users")
          .select(`
            id,
            course,
            year,
            section,
            profile_picture,
            memberships:memberships(status, payment, created_at),
            accounts:accounts(role)
          `)
          .range(from, from + step - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          const nonAdmins = (data as any[]).filter((item) => {
            const acc = Array.isArray(item.accounts) ? item.accounts[0] : item.accounts;
            return acc?.role !== 0;
          });
          allRecords = allRecords.concat(nonAdmins);
          if (data.length < step) {
            hasMore = false;
          } else {
            from += step;
          }
        } else {
          hasMore = false;
        }
      }

      setMembersData(allRecords);
      setMemberCount(allRecords.length);

      // Sum payments
      const sum = allRecords.reduce((acc, curr) => {
        const ms = getMembership(curr);
        return acc + (Number(ms?.payment) || 0);
      }, 0);
      setTotalFunds(sum);

      // 2. Fetch Events
      const { data: events, error: evErr } = await supabase
        .from("events")
        .select("id, title, active, start_time")
        .order("start_time", { ascending: false });

      if (!evErr && events) {
        setEventsList(events as EventOption[]);
      }

      // 3. Fetch Attendance records (paginated)
      let allAtt: AttendanceItem[] = [];
      let attFrom = 0;
      const attStep = 1000;
      let attHasMore = true;

      while (attHasMore) {
        const { data: attData, error: attErr } = await supabase
          .from("attendance")
          .select("id, event_id, course, time_in, time_out, status, student_id")
          .range(attFrom, attFrom + attStep - 1);

        if (attErr) throw attErr;

        if (attData && attData.length > 0) {
          allAtt = allAtt.concat(attData as AttendanceItem[]);
          if (attData.length < attStep) {
            attHasMore = false;
          } else {
            attFrom += attStep;
          }
        } else {
          attHasMore = false;
        }
      }

      setAttendanceLogs(allAtt);
      setLastSyncTime(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));

      if (showToast) {
        toast.success("Dashboard metrics synced with live database");
      }
    } catch (err) {
      console.error("Dashboard Fetch Error:", err);
      toast.error("Failed to refresh live data");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchStatsAndCharts();
  }, [fetchStatsAndCharts]);

  // Profile Picture Stats
  const profilePicCount = useMemo(() => {
    return membersData.filter(m => Boolean(m.profile_picture && m.profile_picture.trim() !== "")).length;
  }, [membersData]);

  // Year Level Demographics Data
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
        gradient: "from-blue-500 to-indigo-600",
        primaryColor: "#3b82f6",
        tagBg: "bg-blue-50 text-blue-700 border-blue-100",
        barColor: "bg-blue-500",
        sparklineData: [5, 12, 18, 22, 28, y1],
      },
      {
        year: "2nd Year",
        subtitle: "Sophomore",
        count: y2,
        photoCount: y2Photos,
        percentage: (y2 / total) * 100,
        gradient: "from-cyan-500 to-teal-600",
        primaryColor: "#06b6d4",
        tagBg: "bg-cyan-50 text-cyan-700 border-cyan-100",
        barColor: "bg-cyan-500",
        sparklineData: [8, 14, 20, 25, 22, y2],
      },
      {
        year: "3rd Year",
        subtitle: "Junior",
        count: y3,
        photoCount: y3Photos,
        percentage: (y3 / total) * 100,
        gradient: "from-purple-500 to-fuchsia-600",
        primaryColor: "#8b5cf6",
        tagBg: "bg-purple-50 text-purple-700 border-purple-100",
        barColor: "bg-purple-500",
        sparklineData: [4, 9, 15, 18, 24, y3],
      },
      {
        year: "4th Year",
        subtitle: "Senior",
        count: y4,
        photoCount: y4Photos,
        percentage: (y4 / total) * 100,
        gradient: "from-emerald-500 to-teal-600",
        primaryColor: "#10b981",
        tagBg: "bg-emerald-50 text-emerald-700 border-emerald-100",
        barColor: "bg-emerald-500",
        sparklineData: [6, 11, 14, 19, 21, y4],
      }
    ];
  }, [membersData]);

  // Course Member Totals Map (for Turnout Rate Calculation)
  const courseTotalMembersMap = useMemo(() => {
    const map: Record<string, number> = {};
    membersData.forEach((m) => {
      const c = (m.course || "Other").trim().toUpperCase();
      map[c] = (map[c] || 0) + 1;
    });
    return map;
  }, [membersData]);

  // Event Attendance by Course (Pie Chart & Leaderboard Calculation)
  const attendancePieData = useMemo(() => {
    const filtered = attendanceLogs.filter((att) => {
      const isPresent = att.time_in !== null || att.status === "Present";
      if (!isPresent) return false;

      if (selectedEventId === "all") {
        return true;
      }
      return att.event_id === selectedEventId;
    });

    const courseCounts: Record<string, number> = {};
    filtered.forEach((att) => {
      const c = (att.course || "Other").trim().toUpperCase();
      courseCounts[c] = (courseCounts[c] || 0) + 1;
    });

    const totalPresent = filtered.length;

    // Convert to sorted array
    const sortedCourses = Object.entries(courseCounts)
      .map(([course, count], idx) => {
        const percentage = totalPresent > 0 ? (count / totalPresent) * 100 : 0;
        const totalEnrolled = courseTotalMembersMap[course] || count;
        const turnoutRate = totalEnrolled > 0 ? Math.min(100, Math.round((count / totalEnrolled) * 100)) : 0;

        return {
          course,
          count,
          percentage,
          totalEnrolled,
          turnoutRate,
          theme: getCourseTheme(course, idx),
        };
      })
      .sort((a, b) => b.count - a.count);

    // Calculate SVG Pie/Donut Arc Geometry
    const cx = 140;
    const cy = 140;
    const outerR = 105;
    const innerR = 66;

    let cumulativeAngle = -Math.PI / 2; // Start at 12 o'clock

    const slices = sortedCourses.map((item, index) => {
      const sliceAngle = totalPresent > 0 ? (item.count / totalPresent) * 2 * Math.PI : 0;
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + sliceAngle;
      cumulativeAngle += sliceAngle;

      // Outer arc points
      const x1 = cx + outerR * Math.cos(startAngle);
      const y1 = cy + outerR * Math.sin(startAngle);
      const x2 = cx + outerR * Math.cos(endAngle);
      const y2 = cy + outerR * Math.sin(endAngle);

      // Inner arc points
      const x3 = cx + innerR * Math.cos(endAngle);
      const y3 = cy + innerR * Math.sin(endAngle);
      const x4 = cx + innerR * Math.cos(startAngle);
      const y4 = cy + innerR * Math.sin(startAngle);

      const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;
      const pathData = `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`;

      return {
        ...item,
        pathData,
        startAngle,
        endAngle,
        midAngle: (startAngle + endAngle) / 2,
      };
    });

    return {
      totalPresent,
      slices,
      selectedEvent: eventsList.find((e) => e.id === selectedEventId),
      hasData: totalPresent > 0,
    };
  }, [attendanceLogs, selectedEventId, courseTotalMembersMap, eventsList]);

  // Course Program Demographics Cards with Filtering & Sorting
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

    let list = Object.values(grouped).map((item, idx) => ({
      ...item,
      percentage: (item.students / totalStudents) * 100,
      theme: getCourseTheme(item.course, idx)
    }));

    // Search filter
    if (courseSearch.trim()) {
      const q = courseSearch.toLowerCase();
      list = list.filter(item => 
        item.course.toLowerCase().includes(q) || 
        (COURSE_FULL_NAMES[item.course] && COURSE_FULL_NAMES[item.course].toLowerCase().includes(q))
      );
    }

    // Sorting
    list.sort((a, b) => {
      if (courseSortBy === "students") return b.students - a.students;
      if (courseSortBy === "funds") return b.funds - a.funds;
      if (courseSortBy === "photos") return b.photoCount - a.photoCount;
      if (courseSortBy === "paid") return (b.fullyPaid / (b.students || 1)) - (a.fullyPaid / (a.students || 1));
      return 0;
    });

    return list;
  }, [membersData, courseSearch, courseSortBy]);

  const activePieSlice = hoveredPieIndex !== null ? attendancePieData.slices[hoveredPieIndex] : null;

  // Render SaaS Shimmer Skeleton while initially loading
  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in-up pb-16">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-slate-200 rounded-2xl animate-shimmer" />
            <div className="h-4 w-96 bg-slate-100 rounded-xl animate-shimmer" />
          </div>
          <div className="flex gap-3">
            <div className="h-12 w-36 bg-slate-200 rounded-2xl animate-shimmer" />
            <div className="h-12 w-36 bg-slate-200 rounded-2xl animate-shimmer" />
          </div>
        </div>

        {/* Top 4 KPI Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white rounded-3xl border border-slate-200/80 p-5 space-y-3 animate-shimmer">
              <div className="flex justify-between items-center">
                <div className="h-4 w-24 bg-slate-200 rounded-md" />
                <div className="size-8 rounded-xl bg-slate-200" />
              </div>
              <div className="h-7 w-32 bg-slate-300 rounded-lg" />
              <div className="h-3 w-40 bg-slate-100 rounded-md" />
            </div>
          ))}
        </div>

        {/* Section 1 Chart Skeleton */}
        <div className="h-96 bg-white rounded-3xl border border-slate-200/80 p-8 animate-shimmer flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <LuLoader className="size-8 text-primary animate-spin" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Loading SaaS Analytics Engine...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up pb-16">
      {/* ============================================================= */}
      {/* SaaS HEADER: LIVE METRICS & REAL-TIME SYNC STATUS            */}
      {/* ============================================================= */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-white via-slate-50/50 to-orange-50/30 p-6 rounded-3xl border border-slate-200/80 shadow-xs backdrop-blur-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
              Live Database Connected
            </span>
            {lastSyncTime && (
              <span className="text-[10px] font-semibold text-slate-400">
                Synced at {lastSyncTime}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            Admin Analytics Dashboard
          </h1>
          <p className="text-slate-500 font-medium text-xs sm:text-sm">
            Live interactive overview of ACES student memberships, event turnout, financial health, and ID readiness.
          </p>
        </div>

        {/* Live Refresh Action */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={() => fetchStatsAndCharts(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-black border border-slate-200 shadow-xs hover:shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-60"
            title="Sync latest records from Supabase"
          >
            <LuRefreshCw className={`size-3.5 text-primary ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Syncing..." : "Sync Live Data"}</span>
          </button>
        </div>
      </div>

      {/* ============================================================= */}
      {/* 4 TOP SaaS KPI HERO METRIC CARDS                             */}
      {/* ============================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Members */}
        <div className="relative group p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-orange-200 transition-all duration-300 flex flex-col justify-between overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-orange-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-orange-500/10 transition-colors" />
          
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Enrolled Members</span>
            <div className="p-2.5 rounded-2xl bg-orange-50 text-primary border border-orange-100 flex items-center justify-center group-hover:scale-110 transition-transform">
              <LuUsers className="size-4" />
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-2">
            <div>
              <div className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-none">
                <AnimatedCounter value={memberCount} />
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">
                  <LuArrowUpRight className="size-3" /> Active
                </span>
                <span className="text-[10px] font-bold text-slate-400">All Departments</span>
              </div>
            </div>

            {/* Micro Sparkline */}
            <div className="w-20">
              <SaaSSparkline data={[15, 28, 40, 52, 68, memberCount || 80]} color="#f97316" height={28} />
            </div>
          </div>
        </div>

        {/* KPI 2: Digital ID Adoption */}
        <div className="relative group p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all duration-300 flex flex-col justify-between overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
          
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Digital IDs Ready</span>
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform">
              <LuIdCard className="size-4" />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-none">
                <AnimatedCounter value={profilePicCount} />
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[10px] font-bold text-slate-400">
                  of {memberCount} students
                </span>
              </div>
            </div>

            {/* Radial ID Meter */}
            <RadialProgressGauge
              percentage={memberCount > 0 ? (profilePicCount / memberCount) * 100 : 0}
              size={48}
              strokeWidth={4.5}
              color="#10b981"
            >
              <span className="text-[9px] font-black text-emerald-600">
                {memberCount > 0 ? Math.round((profilePicCount / memberCount) * 100) : 0}%
              </span>
            </RadialProgressGauge>
          </div>
        </div>

        {/* KPI 3: Total Treasury Funds */}
        <div className="relative group p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-amber-200 transition-all duration-300 flex flex-col justify-between overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/10 transition-colors" />
          
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Treasury Funds</span>
            <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center group-hover:scale-110 transition-transform">
              <LuPhilippinePeso className="size-4" />
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-2">
            <div>
              <div className="text-2xl sm:text-3xl lg:text-3xl font-black text-slate-900 tracking-tight leading-none">
                <AnimatedCounter value={totalFunds} prefix="₱" />
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100">
                  <LuCheckCheck className="size-3" /> Collected
                </span>
                <span className="text-[10px] font-bold text-slate-400">Paid Fees</span>
              </div>
            </div>

            {/* Micro Sparkline */}
            <div className="w-20">
              <SaaSSparkline data={[2000, 8000, 15000, 22000, 30000, totalFunds || 35000]} color="#f59e0b" height={28} />
            </div>
          </div>
        </div>

        {/* KPI 4: Event Participation / Turnout Index */}
        <div className="relative group p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-200 transition-all duration-300 flex flex-col justify-between overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/10 transition-colors" />
          
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Check-ins Logged</span>
            <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
              <LuActivity className="size-4" />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-none">
                <AnimatedCounter value={attendanceLogs.length} />
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[10px] font-bold text-slate-400">
                  Across {eventsList.length} recorded events
                </span>
              </div>
            </div>

            <RadialProgressGauge
              percentage={memberCount > 0 ? (attendancePieData.totalPresent / memberCount) * 100 : 0}
              size={48}
              strokeWidth={4.5}
              color="#3b82f6"
            >
              <span className="text-[9px] font-black text-blue-600">
                {memberCount > 0 ? Math.min(100, Math.round((attendancePieData.totalPresent / memberCount) * 100)) : 0}%
              </span>
            </RadialProgressGauge>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* SECTION 1: INTERACTIVE EVENT TURNOUT & COURSE ANALYTICS       */}
      {/* ============================================================= */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-wider border border-primary/20 mb-1.5">
              <LuChartPie className="size-3" /> Event Turnout Analytics
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Active Attendees by Course Program
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Real-time distribution of checked-in / present students across academic programs.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* View Mode Switcher Pills */}
            <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200/60 self-start">
              <button
                onClick={() => setAttendanceViewMode("donut")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  attendanceViewMode === "donut"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <LuChartPie className="size-3.5" /> Donut
              </button>
              <button
                onClick={() => setAttendanceViewMode("leaderboard")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  attendanceViewMode === "leaderboard"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <LuChartBar className="size-3.5" /> Leaderboard
              </button>
              <button
                onClick={() => setAttendanceViewMode("gauges")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  attendanceViewMode === "gauges"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <LuTarget className="size-3.5" /> Gauges
              </button>
            </div>

            {/* Event Dropdown Filter */}
            <div className="relative w-full sm:w-64">
              <LuCalendar className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full h-10 pl-10 pr-8 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl text-xs font-black text-slate-800 outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all cursor-pointer appearance-none"
              >
                <option value="all">🌟 All Events (Combined)</option>
                {eventsList.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} {ev.active === 1 ? "• Active" : "• Inactive"}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                ▼
              </div>
            </div>
          </div>
        </div>

        {/* View Mode 1: Donut Visualization & Cards */}
        {attendanceViewMode === "donut" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Donut Chart */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center p-4">
              {attendancePieData.hasData ? (
                <div className="relative size-64 sm:size-72 flex items-center justify-center">
                  <svg viewBox="0 0 280 280" className="size-full -rotate-90">
                    {attendancePieData.slices.map((slice, idx) => {
                      const isHovered = hoveredPieIndex === idx;
                      if (attendancePieData.slices.length === 1) {
                        return (
                          <circle
                            key={slice.course}
                            cx="140"
                            cy="140"
                            r="85"
                            fill="none"
                            stroke={slice.theme.primary}
                            strokeWidth="39"
                            className="transition-all duration-300 cursor-pointer"
                            onMouseEnter={() => setHoveredPieIndex(idx)}
                            onMouseLeave={() => setHoveredPieIndex(null)}
                          />
                        );
                      }

                      return (
                        <path
                          key={slice.course}
                          d={slice.pathData}
                          fill={slice.theme.primary}
                          className={`transition-all duration-300 cursor-pointer ${
                            isHovered 
                              ? "opacity-100 filter drop-shadow-[0_0_14px_rgba(0,0,0,0.3)] scale-[1.04] origin-center" 
                              : hoveredPieIndex !== null 
                                ? "opacity-35" 
                                : "opacity-95 hover:opacity-100"
                          }`}
                          stroke="#ffffff"
                          strokeWidth="2.5"
                          onMouseEnter={() => setHoveredPieIndex(idx)}
                          onMouseLeave={() => setHoveredPieIndex(null)}
                        />
                      );
                    })}
                  </svg>

                  {/* Donut Center Animated Stats */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="size-32 rounded-full bg-white shadow-inner flex flex-col items-center justify-center p-3 text-center border border-slate-100">
                      {activePieSlice ? (
                        <div className="animate-fade-in-up">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block leading-tight">
                            {activePieSlice.course}
                          </span>
                          <span className="text-2xl font-black text-slate-900 block leading-tight mt-0.5">
                            <AnimatedCounter value={activePieSlice.count} />
                          </span>
                          <span className="text-[10px] font-black text-primary block leading-tight mt-0.5">
                            <AnimatedCounter value={activePieSlice.percentage} decimals={1} suffix="%" /> Share
                          </span>
                        </div>
                      ) : (
                        <div className="animate-fade-in-up">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block leading-tight">
                            Total Present
                          </span>
                          <span className="text-2xl sm:text-3xl font-black text-slate-900 block leading-tight mt-0.5">
                            <AnimatedCounter value={attendancePieData.totalPresent} />
                          </span>
                          <span className="text-[9px] font-bold text-slate-500 block leading-tight mt-0.5">
                            {selectedEventId === "all" ? "All Events" : "Selected Event"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="size-64 sm:size-72 rounded-full bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-6 space-y-2">
                  <div className="size-12 rounded-2xl bg-white flex items-center justify-center text-slate-300 shadow-xs">
                    <LuUsers className="size-6" />
                  </div>
                  <p className="text-xs font-black text-slate-700">No Check-ins Yet</p>
                  <p className="text-[11px] text-slate-400 font-medium leading-tight max-w-[160px]">
                    No attendance records recorded for this selected event.
                  </p>
                </div>
              )}

              <p className="text-[11px] font-bold text-slate-400 mt-2 text-center">
                Hover over pie slices or course cards below to inspect details.
              </p>
            </div>

            {/* Right Column: Breakdown Cards */}
            <div className="lg:col-span-7 space-y-3">
              {/* Quick KPI Bar */}
              <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50/80 border border-slate-100 mb-4 text-center">
                <div className="p-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Total Checked In</span>
                  <span className="text-base sm:text-lg font-black text-slate-900 mt-0.5 block">
                    <AnimatedCounter value={attendancePieData.totalPresent} />
                  </span>
                </div>
                <div className="p-2 border-x border-slate-200/60">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Active Programs</span>
                  <span className="text-base sm:text-lg font-black text-emerald-600 mt-0.5 block">
                    <AnimatedCounter value={attendancePieData.slices.length} suffix=" Courses" />
                  </span>
                </div>
                <div className="p-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Leading Program</span>
                  <span className="text-base sm:text-lg font-black text-primary truncate mt-0.5 block">
                    {attendancePieData.slices[0]?.course || "None"}
                  </span>
                </div>
              </div>

              {/* Breakdown List */}
              {attendancePieData.slices.length === 0 ? (
                <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs font-bold text-slate-400">
                    Select another event from the dropdown to review historical attendance.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {attendancePieData.slices.map((item, idx) => {
                    const isHovered = hoveredPieIndex === idx;
                    return (
                      <div
                        key={item.course}
                        onMouseEnter={() => setHoveredPieIndex(idx)}
                        onMouseLeave={() => setHoveredPieIndex(null)}
                        className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                          isHovered
                            ? "bg-slate-50 border-slate-400 shadow-md scale-[1.02]"
                            : "bg-white border-slate-100 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="size-3 rounded-full shrink-0"
                              style={{ backgroundColor: item.theme.primary }}
                            />
                            <span className="font-black text-slate-900 text-xs">{item.course}</span>
                          </div>
                          <span className="text-xs font-black text-slate-900">
                            <AnimatedCounter value={item.count} /> <span className="text-[10px] font-bold text-slate-400">Present</span>
                          </span>
                        </div>

                        {/* Animated Percentage Bar */}
                        <div className="mt-2.5 space-y-1">
                          <div className="flex justify-between text-[10px] font-bold text-slate-400">
                            <span>{COURSE_FULL_NAMES[item.course] || "Academic Unit"}</span>
                            <span className="font-black text-slate-700">{item.percentage.toFixed(1)}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              style={{
                                width: `${item.percentage}%`,
                                backgroundColor: item.theme.primary,
                              }}
                              className="h-full rounded-full transition-all duration-700 ease-out"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* View Mode 2: Ranked Program Leaderboard */}
        {attendanceViewMode === "leaderboard" && (
          <div className="space-y-3">
            {attendancePieData.slices.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-xs font-bold text-slate-400">No attendance data logged for this event.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {attendancePieData.slices.map((item, idx) => (
                  <div
                    key={item.course}
                    className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 w-full sm:w-1/3">
                      <div className={`size-7 rounded-xl flex items-center justify-center font-black text-xs ${
                        idx === 0 ? "bg-amber-100 text-amber-700 border border-amber-200" :
                        idx === 1 ? "bg-slate-200 text-slate-700 border border-slate-300" :
                        idx === 2 ? "bg-orange-100 text-orange-700 border border-orange-200" :
                        "bg-slate-100 text-slate-500"
                      }`}>
                        #{idx + 1}
                      </div>
                      <div>
                        <span className="font-black text-sm text-slate-900">{item.course}</span>
                        <p className="text-[10px] text-slate-400 font-bold leading-tight">
                          {COURSE_FULL_NAMES[item.course] || "Academic Unit"}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar Representation */}
                    <div className="flex-1 w-full space-y-1">
                      <div className="flex justify-between text-xs font-black text-slate-700">
                        <span>{item.count} Checked-In</span>
                        <span className="text-primary">{item.percentage.toFixed(1)}% Share</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: item.theme.primary,
                          }}
                          className="h-full rounded-full transition-all duration-1000 ease-out"
                        />
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100">
                        {item.turnoutRate}% Turnout
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* View Mode 3: Radial Turnout Gauges */}
        {attendanceViewMode === "gauges" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {attendancePieData.slices.length === 0 ? (
              <div className="col-span-full p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-xs font-bold text-slate-400">No attendance data logged for this event.</p>
              </div>
            ) : (
              attendancePieData.slices.map((item) => (
                <div
                  key={item.course}
                  className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col items-center text-center space-y-2"
                >
                  <RadialProgressGauge
                    percentage={item.turnoutRate}
                    size={64}
                    strokeWidth={5.5}
                    color={item.theme.primary}
                  >
                    <span className="text-xs font-black text-slate-900">{item.turnoutRate}%</span>
                  </RadialProgressGauge>

                  <div>
                    <h5 className="font-black text-sm text-slate-900">{item.course}</h5>
                    <p className="text-[10px] text-slate-400 font-bold">
                      {item.count} / {item.totalEnrolled} students
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* SECTION 2: COMPACT YEAR LEVEL DEMOGRAPHICS                    */}
      {/* ============================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <LuLayers className="size-4 text-primary" />
              Year Level Demographics
            </h3>
            <p className="text-[11px] text-slate-400 font-bold">
              Enrollment distribution and Digital ID status across 1st to 4th year levels.
            </p>
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded-xl">
            4 Academic Levels
          </span>
        </div>

        {/* Compact Grid with Animated Bars & Mini Gauges */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {yearStats.map((item, idx) => (
            <div 
              key={item.year} 
              style={{ animationDelay: `${idx * 80}ms` }}
              className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all hover:scale-[1.01] flex flex-col justify-between space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${item.tagBg}`}>
                  {item.subtitle}
                </span>
                <span className="text-xs font-black text-slate-700">
                  <AnimatedCounter value={item.percentage} decimals={1} suffix="%" />
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-500">{item.year}</h4>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mt-0.5">
                  <AnimatedCounter value={item.count} /> <span className="text-[10px] font-bold text-slate-400 uppercase">Students</span>
                </p>
              </div>

              {/* Animated Progress Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    style={{ width: `${item.percentage}%` }} 
                    className={`h-full rounded-full ${item.barColor} transition-all duration-1000 ease-out`}
                  />
                </div>

                {/* Compact ID Ready Info */}
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <LuIdCard className="size-3 text-emerald-500" /> Digital IDs
                  </span>
                  <span className="text-emerald-600 font-black">
                    <AnimatedCounter value={item.photoCount} /> ({item.count > 0 ? Math.round((item.photoCount / item.count) * 100) : 0}%)
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================= */}
      {/* SECTION 3: COURSE / PROGRAM DEMOGRAPHICS                      */}
      {/* ============================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <LuGraduationCap className="size-5 text-primary" />
              Course Program Demographics & Finance
            </h3>
            <p className="text-xs text-slate-400 font-bold mt-0.5">
              Live student counts, treasury collections, and fee payment status by academic program.
            </p>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search course..."
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 font-medium"
              />
            </div>

            <div className="relative">
              <select
                value={courseSortBy}
                onChange={(e: any) => setCourseSortBy(e.target.value)}
                className="h-9 px-3 pr-7 text-xs font-black bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer appearance-none"
              >
                <option value="students">Sort: Most Students</option>
                <option value="funds">Sort: Highest Funds</option>
                <option value="photos">Sort: Most IDs</option>
                <option value="paid">Sort: Highest % Paid</option>
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                ▼
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Course Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {courseStats.map((item, idx) => (
            <div 
              key={item.course} 
              style={{ animationDelay: `${idx * 60}ms` }}
              className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs transition-all duration-300 hover:shadow-lg hover:border-slate-300 hover:scale-[1.01] flex flex-col justify-between group relative overflow-hidden"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`size-10 sm:size-11 rounded-2xl flex items-center justify-center font-black text-white shadow-sm bg-gradient-to-br ${item.theme.gradient} group-hover:scale-105 transition-transform`}>
                    <LuGraduationCap className="size-5" />
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${item.theme.bgLight} ${item.theme.text} border ${item.theme.border}`}>
                    <AnimatedCounter value={item.percentage} decimals={1} suffix="%" />
                  </span>
                </div>

                {/* Course Name */}
                <h4 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">
                  {item.course}
                </h4>
                <p className="text-[10px] font-bold text-slate-400 leading-snug line-clamp-1 mb-2">
                  {COURSE_FULL_NAMES[item.course] || "Academic Program"}
                </p>
                
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    <AnimatedCounter value={item.students} />
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{item.students === 1 ? "Student" : "Students"}</span>
                </div>

                {/* Course Financial Metric & Digital ID Stats */}
                <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 mt-3 mb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                    <LuIdCard className="size-3 text-emerald-500" />
                    <span><AnimatedCounter value={item.photoCount} /> IDs</span>
                  </div>
                  <span className="text-xs font-black text-slate-900">
                    <AnimatedCounter value={item.funds} prefix="₱" />
                  </span>
                </div>

                {/* Multi-Segment Animated Payment Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-wider">
                    <span>Payment Progress</span>
                    <span className="text-emerald-600 font-bold">
                      {item.students > 0 ? `${((item.fullyPaid / item.students) * 100).toFixed(0)}% Paid` : "0%"}
                    </span>
                  </div>

                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    {item.students > 0 ? (
                      <>
                        <div 
                          style={{ width: `${(item.fullyPaid / item.students) * 100}%` }} 
                          className="bg-emerald-500 h-full transition-all duration-1000 ease-out" 
                          title={`Fully Paid: ${item.fullyPaid}`} 
                        />
                        <div 
                          style={{ width: `${(item.halfPaid / item.students) * 100}%` }} 
                          className="bg-blue-500 h-full transition-all duration-1000 ease-out" 
                          title={`Half Paid: ${item.halfPaid}`} 
                        />
                        <div 
                          style={{ width: `${(item.partial / item.students) * 100}%` }} 
                          className="bg-amber-500 h-full transition-all duration-1000 ease-out" 
                          title={`Partial: ${item.partial}`} 
                        />
                        <div 
                          style={{ width: `${(item.unpaid / item.students) * 100}%` }} 
                          className="bg-rose-500 h-full transition-all duration-1000 ease-out" 
                          title={`Unpaid: ${item.unpaid}`} 
                        />
                      </>
                    ) : (
                      <div className="w-full bg-slate-200 h-full" />
                    )}
                  </div>

                  {/* Quick breakdown mini tags */}
                  <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 pt-0.5 px-0.5">
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
