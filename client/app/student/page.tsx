"use client";

import React, { useEffect, useState } from "react";
import { 
  LuCalendar, 
  LuHistory, 
  LuIdCard, 
  LuWallet,
  LuSparkles,
  LuArrowUpRight,
  LuClock,
  LuMapPin,
  LuLoader
} from "react-icons/lu";
import { Button } from "@/app/Components/ui/button";
import { createClient } from "@/utils/supabase/client";

export default function StudentDashboard() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState([
    { name: "Attendance Rate", value: "0%", icon: LuHistory, color: "text-emerald-600", bg: "bg-emerald-50" },
    { name: "Upcoming Events", value: "0", icon: LuCalendar, color: "text-orange-600", bg: "bg-orange-50" },
    { name: "Membership Status", value: "Not Paid", icon: LuIdCard, color: "text-amber-600", bg: "bg-amber-50" },
    { name: "Total Fees Paid", value: "₱0.00", icon: LuWallet, color: "text-rose-600", bg: "bg-rose-50" },
  ]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [lastScanned, setLastScanned] = useState<string>("Never scanned");

  const supabase = createClient();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 1. Get logged in user from localStorage
        const localUser = localStorage.getItem("acetrack_user");
        if (!localUser) return;

        const parsed = JSON.parse(localUser);
        const email = parsed.email || parsed.username;
        if (!email) return;

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("email", email)
          .single();

        if (userError || !userData) return;
        setUser(userData);

        // 2. Fetch attendance rate
        const nowStr = new Date().toISOString();
        const { count: totalEvents } = await supabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .eq("active", 1)
          .lt("start_time", nowStr);

        const { count: totalPresent } = await supabase
          .from("attendance")
          .select("*", { count: "exact", head: true })
          .eq("student_id", userData.student_id);

        const attendanceRate = totalEvents && totalEvents > 0 
          ? Math.round(((totalPresent || 0) / totalEvents) * 100) 
          : 100;

        // 3. Fetch upcoming events count and actual events list
        const { data: upcomingEventsData } = await supabase
          .from("events")
          .select("*")
          .eq("active", 1)
          .gt("start_time", nowStr)
          .order("start_time", { ascending: true })
          .limit(2);

        const { count: upcomingCount } = await supabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .eq("active", 1)
          .gt("start_time", nowStr);

        // 4. Fetch membership and payments details
        const { data: membershipData } = await supabase
          .from("memberships")
          .select("*")
          .eq("user_id", userData.id)
          .maybeSingle();

        // 5. Fetch last check-in details
        const { data: lastScanData } = await supabase
          .from("attendance")
          .select("time_in")
          .eq("student_id", userData.student_id)
          .order("time_in", { ascending: false })
          .limit(1)
          .maybeSingle();

        let lastScanFormatted = "No scan records";
        if (lastScanData && lastScanData.time_in) {
          const scanDate = new Date(lastScanData.time_in);
          lastScanFormatted = `${scanDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, ${scanDate.toLocaleDateString()}`;
        }
        setLastScanned(lastScanFormatted);

        // Update stats state
        setStats([
          { 
            name: "Attendance Rate", 
            value: `${attendanceRate}%`, 
            icon: LuHistory, 
            color: "text-emerald-600", 
            bg: "bg-emerald-50" 
          },
          { 
            name: "Upcoming Events", 
            value: `${upcomingCount || 0}`, 
            icon: LuCalendar, 
            color: "text-orange-600", 
            bg: "bg-orange-50" 
          },
          { 
            name: "Membership Status", 
            value: membershipData?.status || "Not Paid", 
            icon: LuIdCard, 
            color: "text-amber-600", 
            bg: "bg-amber-50" 
          },
          { 
            name: "Total Fees Paid", 
            value: `₱${(membershipData?.payment || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 
            icon: LuWallet, 
            color: "text-rose-600", 
            bg: "bg-rose-50" 
          },
        ]);

        // Map events to display layout
        if (upcomingEventsData) {
          const mapped = upcomingEventsData.map((ev: any) => {
            const evDate = new Date(ev.start_time);
            return {
              title: ev.title,
              date: evDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
              time: evDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              location: ev.location || "Online / TBD",
              type: ev.description?.slice(0, 15) || "Activity"
            };
          });
          setUpcomingEvents(mapped);
        }

      } catch (err) {
        console.error("Dashboard load failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <LuLoader className="size-10 animate-spin text-orange-500" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Hero */}
      <div className="relative overflow-hidden bg-slate-900 rounded-3xl md:rounded-[2.5rem] p-6 sm:p-8 md:p-12 text-white">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[10px] sm:text-xs font-black uppercase tracking-widest text-orange-300">
            <LuSparkles className="size-3" /> Welcome Back, {user?.first_name || "Member"}
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
            Ready for your next <span className="text-orange-400">organization adventure?</span>
          </h1>
          <p className="text-xs sm:text-sm md:text-lg text-slate-400 font-medium leading-relaxed max-w-lg">
            Check your attendance, verify your digital ID, and stay updated with the latest organization activities and deadlines.
          </p>
          <div className="pt-4 flex flex-wrap gap-4">
            <Button className="h-12 px-8 rounded-xl font-bold bg-white text-slate-900 hover:bg-slate-100 shadow-xl shadow-white/5 transition-all">
              Join Event
            </Button>
            <Button variant="outline" className="h-12 px-8 rounded-xl font-bold border-white/20 text-white hover:bg-white/10 transition-all">
              View Schedule
            </Button>
          </div>
        </div>
        
        {/* Background Decor */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-orange-500/20 to-transparent pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 size-64 bg-orange-600/30 rounded-full blur-[100px]" />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("size-10 sm:size-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", stat.bg, stat.color)}>
                <stat.icon className="size-5 sm:size-6" />
              </div>
              <LuArrowUpRight className="size-4 text-slate-300 group-hover:text-slate-400" />
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-500 mb-1">{stat.name}</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Activities Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Attendance */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Upcoming Activities</h2>
            <Button variant="ghost" className="text-xs font-black text-orange-600 hover:bg-orange-50 rounded-xl">View All</Button>
          </div>
          {upcomingEvents.length === 0 ? (
            <div className="p-12 rounded-[2rem] bg-white border border-slate-200 text-center text-slate-400 font-medium">
              No upcoming activities scheduled.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {upcomingEvents.map((event) => (
                <div key={event.title} className="p-5 rounded-2xl sm:rounded-[2rem] bg-white border border-slate-200 shadow-sm hover:border-orange-200 group transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-[10px] font-black uppercase tracking-widest border border-orange-100">
                      {event.type}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mb-4">{event.title}</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                      <LuCalendar className="size-4 text-slate-300" /> {event.date}
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                      <LuClock className="size-4 text-slate-300" /> {event.time}
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                      <LuMapPin className="size-4 text-slate-300" /> {event.location}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Profile Snapshot */}
        <div className="space-y-6">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Quick Actions</h2>
          <div className="bg-white rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 border border-slate-200 divide-y divide-slate-100">
            <button className="flex items-center gap-4 py-4 w-full text-left group">
              <div className="size-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-600 transition-all">
                <LuIdCard className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Download ID</p>
                <p className="text-xs text-slate-400">Offline digital copy</p>
              </div>
            </button>
            <div className="flex items-center gap-4 py-4 w-full text-left group">
              <div className="size-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-600 transition-all">
                <LuHistory className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Last Scanned</p>
                <p className="text-xs text-slate-400">{lastScanned}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Utility for conditional classes
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
