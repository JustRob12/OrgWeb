"use client";

import React, { useEffect, useState, useMemo } from "react";
import { 
  LuUsers, 
  LuCalendar, 
  LuPhilippinePeso, 
  LuLoader, 
  LuTrendingUp, 
  LuChartPie,
  LuChevronDown
} from "react-icons/lu";
import { createClient } from "@/utils/supabase/client";

// Safe helper to extract membership details whether they are an object or an array
const getMembership = (member: any) => {
  if (!member || !member.memberships) return null;
  if (Array.isArray(member.memberships)) return member.memberships[0] || null;
  return member.memberships;
};

// Course Color Palette
const COURSE_COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#f97316", // orange
  "#06b6d4", // cyan
  "#14b8a6", // teal
  "#d946ef", // fuchsia
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f43f5e", // rose
];

const STATUS_COLORS: Record<string, string> = {
  "Fully Paid": "#10b981", // emerald
  "Half Semester Paid": "#3b82f6", // blue
  "Partial": "#f59e0b", // amber
  "Not Paid": "#f43f5e" // rose
};

export default function AdminDashboard() {
  const [membersData, setMembersData] = useState<any[]>([]);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [totalFunds, setTotalFunds] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Chart States
  const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);
  const [lineTooltipPos, setLineTooltipPos] = useState({ x: 0, y: 0 });
  const [pieMode, setPieMode] = useState<"course" | "status">("course"); // "course": courses per status, "status": statuses per course
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("Fully Paid");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>("All");
  const [hoveredSliceIndex, setHoveredSliceIndex] = useState<number | null>(null);

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
  // Line Chart Processing (X = Days, Y = Counts of Statuses)
  // -------------------------------------------------------------
  const lineChartData = useMemo(() => {
    const groupedByRawDate: Record<string, Record<string, number>> = {};

    membersData.forEach(member => {
      const ms = getMembership(member);
      if (ms && ms.created_at) {
        // Get date part "YYYY-MM-DD"
        const rawDate = ms.created_at.split("T")[0];
        if (!groupedByRawDate[rawDate]) {
          groupedByRawDate[rawDate] = {
            "Fully Paid": 0,
            "Half Semester Paid": 0,
            "Partial": 0,
            "Not Paid": 0
          };
        }
        const status = ms.status || "Not Paid";
        if (status in groupedByRawDate[rawDate]) {
          groupedByRawDate[rawDate][status]++;
        }
      }
    });

    // Sort chronologically
    const sortedRawDates = Object.keys(groupedByRawDate).sort();

    return sortedRawDates.map(rawDate => {
      const dateObj = new Date(rawDate);
      const formattedDate = dateObj.toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric",
        timeZone: "UTC" 
      });
      return {
        date: formattedDate,
        rawDate,
        ...groupedByRawDate[rawDate]
      } as { date: string; rawDate: string; [key: string]: any };
    });
  }, [membersData]);

  // Dimensions of line chart SVG
  const svgW = 500;
  const svgH = 300;
  const padL = 40;
  const padR = 20;
  const padT = 20;
  const padB = 40;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padT - padB;

  // Max value for line chart scaling
  const maxLineVal = useMemo(() => {
    if (lineChartData.length === 0) return 5;
    const maxVal = Math.max(
      ...lineChartData.map(d => 
        Math.max(
          d["Fully Paid"] || 0, 
          d["Half Semester Paid"] || 0, 
          d["Partial"] || 0, 
          d["Not Paid"] || 0
        )
      )
    );
    return Math.max(5, maxVal); // Default minimum scale of 5
  }, [lineChartData]);

  // SVG Bezier Curves Generator Helper
  const getBezierPathD = (key: string) => {
    if (lineChartData.length === 0) return "";
    if (lineChartData.length === 1) {
      const x = padL + chartW / 2;
      const y = padT + chartH - ((lineChartData[0][key] || 0) / maxLineVal) * chartH;
      return `M ${x} ${y} L ${x} ${y}`;
    }

    const points = lineChartData.map((d: any, i) => ({
      x: padL + (i / (lineChartData.length - 1)) * chartW,
      y: padT + chartH - ((d[key] || 0) / maxLineVal) * chartH
    }));

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const cpX1 = points[i - 1].x + (points[i].x - points[i - 1].x) / 3;
      const cpY1 = points[i - 1].y;
      const cpX2 = points[i - 1].x + (2 * (points[i].x - points[i - 1].x)) / 3;
      const cpY2 = points[i].y;
      path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${points[i].x} ${points[i].y}`;
    }
    return path;
  };

  const handleLineMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (lineChartData.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Map mouse X to the closest data index
    let closestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < lineChartData.length; i++) {
      const pointX = padL + (i / Math.max(1, lineChartData.length - 1)) * chartW;
      const dist = Math.abs(clientX - pointX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    }

    setHoveredLineIndex(closestIndex);
    const targetX = padL + (closestIndex / Math.max(1, lineChartData.length - 1)) * chartW;
    setLineTooltipPos({ x: targetX, y: clientY });
  };

  // -------------------------------------------------------------
  // Pie Chart Processing (Filter Status by Course / Course by Status)
  // -------------------------------------------------------------
  const uniqueCourses = useMemo(() => {
    const courses = membersData.map(m => m.course).filter(Boolean);
    return Array.from(new Set(courses)).sort();
  }, [membersData]);

  const pieChartData = useMemo(() => {
    if (membersData.length === 0) return { data: [], total: 0 };

    if (pieMode === "course") {
      // breakdown of courses for the selected status
      const counts: Record<string, number> = {};
      let sum = 0;

      membersData.forEach(member => {
        const ms = getMembership(member);
        const status = ms?.status || "Not Paid";
        if (status === selectedStatusFilter) {
          const course = member.course || "Unknown";
          counts[course] = (counts[course] || 0) + 1;
          sum++;
        }
      });

      const list = Object.entries(counts).map(([label, value]) => ({
        label,
        value,
        percentage: sum > 0 ? (value / sum) * 100 : 0
      })).sort((a, b) => b.value - a.value);

      return { data: list, total: sum };
    } else {
      // breakdown of statuses for the selected course
      const counts: Record<string, number> = {
        "Fully Paid": 0,
        "Half Semester Paid": 0,
        "Partial": 0,
        "Not Paid": 0
      };
      let sum = 0;

      membersData.forEach(member => {
        if (selectedCourseFilter === "All" || member.course === selectedCourseFilter) {
          const ms = getMembership(member);
          const status = ms?.status || "Not Paid";
          if (status in counts) {
            counts[status]++;
            sum++;
          }
        }
      });

      const list = Object.entries(counts)
        .map(([label, value]) => ({
          label,
          value,
          percentage: sum > 0 ? (value / sum) * 100 : 0
        }))
        .filter(item => item.value > 0);

      return { data: list, total: sum };
    }
  }, [membersData, pieMode, selectedStatusFilter, selectedCourseFilter]);

  // Compute SVG arc coordinates for pie chart slices
  const pieSlices = useMemo(() => {
    const { data, total } = pieChartData;
    if (total === 0) return [];

    let accumulatedPercent = 0;
    const cx = 100;
    const cy = 100;
    const r = 80;

    return data.map((item, idx) => {
      const percent = item.value / total;
      const startPercent = accumulatedPercent;
      accumulatedPercent += percent;

      // Color mapping
      let color = COURSE_COLORS[idx % COURSE_COLORS.length];
      if (pieMode === "status") {
        color = STATUS_COLORS[item.label] || "#cbd5e1";
      }

      // If there is only one item that represents 100%
      if (percent === 1) {
        return {
          path: `M ${cx} ${cy - r} A ${r} ${r} 0 1 0 ${cx} ${cy + r} A ${r} ${r} 0 1 0 ${cx} ${cy - r} Z`,
          label: item.label,
          value: item.value,
          percentage: 100,
          color
        };
      }

      const startAngle = 2 * Math.PI * startPercent - Math.PI / 2;
      const endAngle = 2 * Math.PI * accumulatedPercent - Math.PI / 2;

      const sX = cx + Math.cos(startAngle) * r;
      const sY = cy + Math.sin(startAngle) * r;
      const eX = cx + Math.cos(endAngle) * r;
      const eY = cy + Math.sin(endAngle) * r;

      const largeArc = percent > 0.5 ? 1 : 0;

      const pathData = `
        M ${cx} ${cy}
        L ${sX} ${sY}
        A ${r} ${r} 0 ${largeArc} 1 ${eX} ${eY}
        Z
      `;

      return {
        path: pathData,
        label: item.label,
        value: item.value,
        percentage: percent * 100,
        color
      };
    });
  }, [pieChartData, pieMode]);

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
        <p className="text-slate-500 font-medium tracking-tight">Welcome back. Here's a live audit of your organization's financials.</p>
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Card: SVG Line Chart (Daily trends) */}
        <div className="lg:col-span-7 bg-white p-8 rounded-[2.5rem] border border-slate-200/80 shadow-sm flex flex-col justify-between relative">
          <div className="flex justify-between items-start gap-4 mb-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <LuTrendingUp className="size-5 text-primary" />
                Payment Timelines
              </h3>
              <p className="text-xs text-slate-400 font-bold mt-1">Daily trend of memberships grouped by status.</p>
            </div>

            {/* Timelines Legend */}
            <div className="hidden sm:flex items-center gap-3 text-[10px] font-black uppercase tracking-wider flex-wrap">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ backgroundColor: STATUS_COLORS["Fully Paid"] }} /> Fully</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ backgroundColor: STATUS_COLORS["Half Semester Paid"] }} /> Half</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ backgroundColor: STATUS_COLORS["Partial"] }} /> Partial</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ backgroundColor: STATUS_COLORS["Not Paid"] }} /> Unpaid</span>
            </div>
          </div>

          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <LuLoader className="size-8 text-primary animate-spin" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Compiling Timelines...</p>
            </div>
          ) : lineChartData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-300 font-bold italic">
              No payments recorded yet to display trend.
            </div>
          ) : (
            <div className="relative w-full h-[280px]">
              <svg 
                className="w-full h-full overflow-visible select-none"
                viewBox={`0 0 ${svgW} ${svgH}`}
                onMouseMove={handleLineMouseMove}
                onMouseLeave={() => setHoveredLineIndex(null)}
              >
                {/* Horizontal dotted grid lines */}
                {Array.from({ length: 4 }).map((_, i) => {
                  const yVal = padT + (i / 3) * chartH;
                  const value = Math.round(maxLineVal - (i / 3) * maxLineVal);
                  return (
                    <g key={i} className="opacity-40">
                      <line 
                        x1={padL} 
                        y1={yVal} 
                        x2={padL + chartW} 
                        y2={yVal} 
                        stroke="#e2e8f0" 
                        strokeWidth="1.5" 
                        strokeDasharray="4 4" 
                      />
                      <text 
                        x={padL - 10} 
                        y={yVal + 4} 
                        textAnchor="end" 
                        className="text-[9px] font-black fill-slate-400"
                      >
                        {value}
                      </text>
                    </g>
                  );
                })}

                {/* X Axis Labels */}
                {lineChartData.map((d, i) => {
                  const x = padL + (i / Math.max(1, lineChartData.length - 1)) * chartW;
                  // Only display every Nth label to prevent overlapping if data is huge
                  const skip = Math.ceil(lineChartData.length / 7);
                  if (i % skip !== 0 && i !== lineChartData.length - 1) return null;

                  return (
                    <text
                      key={i}
                      x={x}
                      y={padT + chartH + 20}
                      textAnchor="middle"
                      className="text-[9px] font-black fill-slate-400 uppercase tracking-wider"
                    >
                      {d.date}
                    </text>
                  );
                })}

                {/* Vertical hover overlay bar */}
                {hoveredLineIndex !== null && (
                  <line
                    x1={padL + (hoveredLineIndex / Math.max(1, lineChartData.length - 1)) * chartW}
                    y1={padT}
                    x2={padL + (hoveredLineIndex / Math.max(1, lineChartData.length - 1)) * chartW}
                    y2={padT + chartH}
                    stroke="#6366f1"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                    className="opacity-70 animate-in fade-in duration-200"
                  />
                )}

                {/* Trend Lines */}
                {Object.keys(STATUS_COLORS).map(statusKey => {
                  const color = STATUS_COLORS[statusKey];
                  const dPath = getBezierPathD(statusKey);
                  return (
                    <path
                      key={statusKey}
                      d={dPath}
                      fill="none"
                      stroke={color}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      className="transition-all duration-500 drop-shadow-[0_4px_6px_rgba(0,0,0,0.05)]"
                    />
                  );
                })}

                {/* Highlight circles on hover */}
                {hoveredLineIndex !== null && lineChartData[hoveredLineIndex] && (
                  <g className="animate-in zoom-in-95 duration-150">
                    {Object.keys(STATUS_COLORS).map(statusKey => {
                      const color = STATUS_COLORS[statusKey];
                      const val = lineChartData[hoveredLineIndex][statusKey] || 0;
                      const cx = padL + (hoveredLineIndex / Math.max(1, lineChartData.length - 1)) * chartW;
                      const cy = padT + chartH - (val / maxLineVal) * chartH;
                      return (
                        <circle
                          key={statusKey}
                          cx={cx}
                          cy={cy}
                          r="5"
                          fill={color}
                          stroke="#ffffff"
                          strokeWidth="2.5"
                          className="shadow-sm"
                        />
                      );
                    })}
                  </g>
                )}
              </svg>

              {/* Custom HTML Tooltip */}
              {hoveredLineIndex !== null && lineChartData[hoveredLineIndex] && (
                <div 
                  className="absolute bg-white/95 backdrop-blur-md border border-slate-200/70 p-4 rounded-2xl shadow-xl z-20 pointer-events-none transition-all duration-75 space-y-1.5 min-w-[155px] text-xs font-bold text-slate-700"
                  style={{
                    left: `${(padL + (hoveredLineIndex / Math.max(1, lineChartData.length - 1)) * chartW) / svgW * 100}%`,
                    top: `${Math.max(10, Math.min(130, lineTooltipPos.y))}px`,
                    transform: hoveredLineIndex > lineChartData.length / 2 ? "translateX(-110%)" : "translateX(10%)"
                  }}
                >
                  <p className="font-black text-slate-900 border-b border-slate-100 pb-1.5 uppercase tracking-wider text-[9px]">
                    Timeline • {lineChartData[hoveredLineIndex].date}
                  </p>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-emerald-600 flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-emerald-500" /> Fully Paid
                    </span>
                    <span className="font-black text-slate-950">{lineChartData[hoveredLineIndex]["Fully Paid"]}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-blue-600 flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-blue-500" /> Half Paid
                    </span>
                    <span className="font-black text-slate-950">{lineChartData[hoveredLineIndex]["Half Semester Paid"]}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-amber-600 flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-amber-500" /> Partial
                    </span>
                    <span className="font-black text-slate-950">{lineChartData[hoveredLineIndex]["Partial"]}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-rose-600 flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-rose-500" /> Unpaid
                    </span>
                    <span className="font-black text-slate-950">{lineChartData[hoveredLineIndex]["Not Paid"]}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Card: SVG Pie Chart (Course distributions) */}
        <div className="lg:col-span-5 bg-white p-8 rounded-[2.5rem] border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="space-y-6">
            
            {/* Header with Switcher Tabs */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <LuChartPie className="size-5 text-primary" />
                  Demographics
                </h3>
                <p className="text-xs text-slate-400 font-bold mt-1">Audit status distributions across courses.</p>
              </div>

              {/* Mode Toggle Button */}
              <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto shrink-0 select-none">
                <button
                  onClick={() => { setPieMode("course"); setHoveredSliceIndex(null); }}
                  className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                    pieMode === "course"
                      ? "bg-white text-primary shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  By Status
                </button>
                <button
                  onClick={() => { setPieMode("status"); setHoveredSliceIndex(null); }}
                  className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                    pieMode === "status"
                      ? "bg-white text-primary shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  By Course
                </button>
              </div>
            </div>

            {/* Filter Dropdown */}
            <div className="flex items-center gap-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Filter:</label>
              <div className="relative flex-1 max-w-[200px] group">
                <select
                  value={pieMode === "course" ? selectedStatusFilter : selectedCourseFilter}
                  onChange={(e) => {
                    if (pieMode === "course") {
                      setSelectedStatusFilter(e.target.value);
                    } else {
                      setSelectedCourseFilter(e.target.value);
                    }
                    setHoveredSliceIndex(null);
                  }}
                  className="w-full h-10 pl-4 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all appearance-none cursor-pointer"
                >
                  {pieMode === "course" ? (
                    Object.keys(STATUS_COLORS).map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))
                  ) : (
                    <>
                      <option value="All">All Courses</option>
                      {uniqueCourses.map(course => (
                        <option key={course} value={course}>{course}</option>
                      ))}
                    </>
                  )}
                </select>
                <LuChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none group-focus-within:rotate-180 transition-transform" />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="h-60 flex flex-col items-center justify-center gap-3">
              <LuLoader className="size-8 text-primary animate-spin" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Generating Demographics...</p>
            </div>
          ) : pieChartData.total === 0 ? (
            <div className="h-60 flex flex-col items-center justify-center text-slate-300 font-bold italic">
              No matching records found for filter.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mt-4">
              
              {/* Pie SVG Container */}
              <div className="relative size-44 flex-shrink-0">
                <svg
                  className="size-full overflow-visible"
                  viewBox="0 0 200 200"
                >
                  {pieSlices.map((slice, index) => (
                    <path
                      key={slice.label}
                      d={slice.path}
                      fill={slice.color}
                      className="transition-all duration-300 cursor-pointer origin-[100px_100px]"
                      style={{
                        transform: hoveredSliceIndex === index ? "scale(1.06)" : "scale(1)",
                        opacity: hoveredSliceIndex !== null && hoveredSliceIndex !== index ? 0.6 : 1
                      }}
                      onMouseEnter={() => setHoveredSliceIndex(index)}
                      onMouseLeave={() => setHoveredSliceIndex(null)}
                    />
                  ))}
                  
                  {/* Center punch for Donut chart aesthetic */}
                  <circle cx="100" cy="100" r="45" fill="#ffffff" />
                  
                  {/* Center Text displaying sum */}
                  <g className="pointer-events-none select-none text-center">
                    <text x="100" y="97" textAnchor="middle" className="text-[9px] font-black fill-slate-400 uppercase tracking-widest leading-none">Total</text>
                    <text x="100" y="114" textAnchor="middle" className="text-lg font-black fill-slate-800 leading-none tracking-tighter">{pieChartData.total}</text>
                  </g>
                </svg>
              </div>

              {/* Legends Section */}
              <div className="flex-1 w-full space-y-2 max-h-[180px] overflow-y-auto pr-1.5 custom-scrollbar">
                {pieSlices.map((slice, index) => (
                  <div
                    key={slice.label}
                    className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                      hoveredSliceIndex === index 
                        ? "bg-slate-50 border-slate-200" 
                        : "border-transparent hover:bg-slate-50/50"
                    }`}
                    onMouseEnter={() => setHoveredSliceIndex(index)}
                    onMouseLeave={() => setHoveredSliceIndex(null)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="size-3 rounded-md shrink-0 transition-transform" style={{ backgroundColor: slice.color, transform: hoveredSliceIndex === index ? "scale(1.1)" : "scale(1)" }} />
                      <p className="text-xs font-black text-slate-800 truncate leading-none">{slice.label}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-slate-900 leading-none">{slice.value}</p>
                      <p className="text-[9px] font-black text-slate-400 leading-none mt-1">{slice.percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
