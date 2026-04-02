"use client";

import React from "react";
import { 
  LuCalendar, 
  LuHistory, 
  LuIdCard, 
  LuWallet,
  LuSparkles,
  LuArrowUpRight,
  LuClock,
  LuMapPin
} from "react-icons/lu";
import { Button } from "@/app/Components/ui/button";

export default function StudentDashboard() {
  const stats = [
    { name: "Attendance Rate", value: "85%", icon: LuHistory, color: "text-emerald-600", bg: "bg-emerald-50" },
    { name: "Upcoming Events", value: "3", icon: LuCalendar, color: "text-indigo-600", bg: "bg-indigo-50" },
    { name: "Membership ID", value: "Active", icon: LuIdCard, color: "text-amber-600", bg: "bg-amber-50" },
    { name: "Total Fees Paid", value: "₱1,200", icon: LuWallet, color: "text-rose-600", bg: "bg-rose-50" },
  ];

  const upcomingEvents = [
    { title: "Organization Assembly", date: "April 15, 2026", time: "1:00 PM", location: "Grand Hall", type: "Assembly" },
    { title: "React Workshop v2", date: "April 18, 2026", time: "9:00 AM", location: "Lab 402", type: "Workshop" },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Hero */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-black uppercase tracking-widest text-indigo-300">
            <LuSparkles className="size-3" /> Welcome Back, Member
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
            Ready for your next <span className="text-indigo-400">organization adventure?</span>
          </h1>
          <p className="text-slate-400 font-medium text-lg leading-relaxed max-w-lg">
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
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-indigo-500/20 to-transparent pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 size-64 bg-indigo-600/30 rounded-full blur-[100px]" />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("size-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", stat.bg, stat.color)}>
                <stat.icon className="size-6" />
              </div>
              <LuArrowUpRight className="size-4 text-slate-300 group-hover:text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-500 mb-1">{stat.name}</p>
            <h3 className="text-2xl font-black text-slate-900">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Attendance */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Upcoming Activities</h2>
            <Button variant="ghost" className="text-xs font-black text-indigo-600 hover:bg-indigo-50 rounded-xl">View All</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingEvents.map((event) => (
              <div key={event.title} className="p-6 rounded-[2rem] bg-white border border-slate-200 shadow-sm hover:border-indigo-200 group transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest border border-indigo-100">
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
        </div>

        {/* Profile Snapshot */}
        <div className="space-y-6">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Quick Actions</h2>
          <div className="bg-white rounded-[2rem] p-6 border border-slate-200 divide-y divide-slate-100">
            <button className="flex items-center gap-4 py-4 w-full text-left group">
              <div className="size-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                <LuIdCard className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Download ID</p>
                <p className="text-xs text-slate-400">Offline digital copy</p>
              </div>
            </button>
            <button className="flex items-center gap-4 py-4 w-full text-left group">
              <div className="size-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                <LuHistory className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Last Scanned</p>
                <p className="text-xs text-slate-400">10:45 AM, Yesterday</p>
              </div>
            </button>
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
