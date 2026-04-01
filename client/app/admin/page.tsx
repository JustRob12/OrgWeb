import React from "react";
import { LuLayoutDashboard, LuUsers, LuCalendar, LuCircleDollarSign } from "react-icons/lu";

export default function AdminDashboard() {
  const stats = [
    { name: "Total Members", value: "42", icon: LuUsers, color: "text-blue-600", bg: "bg-blue-50" },
    { name: "Upcoming Events", value: "3", icon: LuCalendar, color: "text-emerald-600", bg: "bg-emerald-50" },
    { name: "Total Funds", value: "₱12,450", icon: LuCircleDollarSign, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard Overview</h1>
        <p className="text-slate-500 mt-1">Welcome back, Roberto. Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="size-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.name}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm min-h-[300px] flex items-center justify-center text-slate-400 font-medium">
          Activity Chart Placeholder
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm min-h-[300px] flex items-center justify-center text-slate-400 font-medium">
          Recent Requests Placeholder
        </div>
      </div>
    </div>
  );
}
