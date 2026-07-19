"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  LuCalendar, 
  LuHistory, 
  LuIdCard, 
  LuWallet,
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
  const [polls, setPolls] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
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

        // 3. Fetch active events list
        const { data: eventsData } = await supabase
          .from("events")
          .select("*")
          .eq("active", 1)
          .order("start_time", { ascending: true })
          .limit(5);

        const { count: upcomingCount } = await supabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .eq("active", 1)
          .gt("start_time", nowStr);

        // 3.5 Fetch active polls
        const { data: pollsData } = await supabase
          .from("polls")
          .select("*")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(5);

        // 4. Fetch membership and payments details
        const { data: membershipData } = await supabase
          .from("memberships")
          .select("*")
          .eq("user_id", userData.id)
          .maybeSingle();

        // 4.5 Fetch finance items and transactions
        const { data: items } = await supabase
          .from("finance_items")
          .select("*")
          .order("deadline", { ascending: true })
          .limit(5);

        const { data: txs } = await supabase
          .from("finance_audit_view")
          .select("*")
          .eq("student_id", userData.student_id);

        const paidItemIds = new Set((txs || []).map((t: any) => t.finance_id));

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
        if (eventsData) {
          const mapped = eventsData.map((ev: any) => {
            const evDate = new Date(ev.start_time);
            return {
              id: ev.id,
              title: ev.title,
              date: evDate.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
              time: evDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              location: ev.location || "Online / TBD",
              type: ev.description?.slice(0, 15) || "Activity"
            };
          });
          setUpcomingEvents(mapped);
        }

        if (pollsData) {
          const mappedPolls = pollsData.map((p: any) => {
            const endDate = new Date(p.end_time);
            return {
              id: p.id,
              title: p.title,
              deadline: endDate.toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
              status: p.status
            };
          });
          setPolls(mappedPolls);
        }

        if (items) {
          const mappedFees = items.map((item: any) => {
            const isPaid = paidItemIds.has(item.id);
            return {
              id: item.id,
              title: item.title,
              amount: `₱${(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
              isPaid
            };
          });
          setFees(mappedFees);
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
      {/* Simple Dashboard Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">Dashboard</h1>
        <p className="text-slate-500 font-medium tracking-tight">Welcome back, {user?.first_name || "Member"}. Track your attendance, status, and upcoming events.</p>
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
        {/* Left Column: Activities & Vote Polls */}
        <div className="lg:col-span-2 space-y-8">
          {/* The Activities List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">The Activities</h2>
              <Link href="/student/events">
                <Button variant="ghost" className="text-xs font-black text-orange-600 hover:bg-orange-50 rounded-xl">View All</Button>
              </Link>
            </div>
            {upcomingEvents.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center text-slate-400 font-medium">
                No activities scheduled.
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm divide-y divide-slate-100">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="size-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                        <LuCalendar className="size-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 leading-tight">{event.title}</p>
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <LuMapPin className="size-3" /> {event.location}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-left sm:text-right">
                        <p className="text-xs font-bold text-slate-700">{event.date}</p>
                        <p className="text-[10px] font-medium text-slate-400 mt-0.5">{event.time}</p>
                      </div>
                      <Link href="/student/events">
                        <Button variant="outline" className="h-9 px-4 rounded-xl text-xs font-bold border-slate-200 hover:bg-slate-50">
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Polls List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Active Vote Polls</h2>
              <Link href="/student/voting">
                <Button variant="ghost" className="text-xs font-black text-orange-600 hover:bg-orange-50 rounded-xl">Go to Voting</Button>
              </Link>
            </div>
            {polls.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center text-slate-400 font-medium">
                No active voting polls.
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm divide-y divide-slate-100">
                {polls.map((poll) => (
                  <div key={poll.id} className="flex items-center justify-between gap-4 p-5 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="size-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                        <LuClock className="size-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 leading-tight">{poll.title}</p>
                        <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mt-1">Active</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <p className="text-xs font-bold text-slate-400">Ends: {poll.deadline}</p>
                      <Link href="/student/voting">
                        <Button variant="outline" className="h-9 px-4 rounded-xl text-xs font-bold border-slate-200 hover:bg-slate-50">
                          Vote
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Fees & Quick Actions */}
        <div className="space-y-8">
          {/* Fees & Dues List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Fees & Dues</h2>
              <Link href="/student/finance">
                <Button variant="ghost" className="text-xs font-black text-orange-600 hover:bg-orange-50 rounded-xl">View Details</Button>
              </Link>
            </div>
            {fees.length === 0 ? (
              <div className="p-6 rounded-3xl bg-white border border-slate-200 text-center text-slate-400 font-medium">
                No fee records.
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm divide-y divide-slate-100">
                {fees.map((fee) => (
                  <div key={fee.id} className="flex items-center justify-between gap-3 p-4 hover:bg-slate-50/50 transition-colors">
                    <div>
                      <p className="text-sm font-bold text-slate-900 leading-tight">{fee.title}</p>
                      <p className="text-xs font-black text-slate-950 mt-1">{fee.amount}</p>
                    </div>
                    <div>
                      {fee.isPaid ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 font-black text-[9px] uppercase tracking-widest border border-emerald-100/50">
                          Paid
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 font-black text-[9px] uppercase tracking-widest border border-amber-100/50">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Quick Actions</h2>
            <div className="bg-white rounded-3xl p-6 border border-slate-200 divide-y divide-slate-100 shadow-sm">
              <Link href="/student/id">
                <button className="flex items-center gap-4 py-4 w-full text-left group">
                  <div className="size-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-600 transition-all">
                    <LuIdCard className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">View ID</p>
                    <p className="text-xs text-slate-400">Scan at attendance desk</p>
                  </div>
                </button>
              </Link>
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
    </div>
  );
}

// Utility for conditional classes
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
