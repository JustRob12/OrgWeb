"use client";

import React, { useEffect, useState } from "react";
import { LuLayoutDashboard, LuUsers, LuCalendar, LuCircleDollarSign, LuLoader } from "react-icons/lu";
import { createClient } from "@/utils/supabase/client";

export default function AdminDashboard() {
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [totalFunds, setTotalFunds] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        // 1. Fetch Students count (Role 1)
        const { count, error: countError } = await supabase
          .from("accounts")
          .select("*", { count: "exact", head: true })
          .eq("role", 1);

        if (countError) throw countError;
        setMemberCount(count || 0);

        // 2. Fetch Total Funds (Sum of payments for students)
        const { data: memberPayments, error: paymentError } = await supabase
          .from("memberships")
          .select("payment")
          .not("payment", "is", null);

        if (paymentError) throw paymentError;
        
        const sum = memberPayments.reduce((acc, curr) => acc + (Number(curr.payment) || 0), 0);
        setTotalFunds(sum);

      } catch (err) {
        console.error("Dashboard Stats Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const stats = [
    { 
      name: "Total Members", 
      value: loading ? "..." : (memberCount?.toString() || "0"), 
      icon: LuUsers, 
      color: "text-blue-600", 
      bg: "bg-blue-50" 
    },
    { 
      name: "Upcoming Events", 
      value: "3", // Placeholder for now - can be linked later
      icon: LuCalendar, 
      color: "text-emerald-600", 
      bg: "bg-emerald-50" 
    },
    { 
      name: "Total Funds", 
      value: loading ? "..." : `₱${(totalFunds || 0).toLocaleString()}`, 
      icon: LuCircleDollarSign, 
      color: "text-amber-600", 
      bg: "bg-amber-50" 
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard Overview</h1>
        <p className="text-slate-500 mt-1">Welcome back. Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110`}>
                <stat.icon className="size-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-widest text-[10px]">{stat.name}</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-black text-slate-900 tracking-tight">{stat.value}</p>
                  {loading && <LuLoader className="size-4 animate-spin text-slate-300" />}
                </div>
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
