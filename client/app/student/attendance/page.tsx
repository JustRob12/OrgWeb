"use client";

import React, { useEffect, useState } from "react";
import {
  LuHistory,
  LuCalendar,
  LuClock,
  LuMapPin,
  LuCircleCheck,
  LuCircleX,
  LuLoader
} from "react-icons/lu";
import { Button } from "@/app/Components/ui/button";
import { createClient } from "@/utils/supabase/client";

interface AttendanceRecord {
  title: string;
  date: string;
  time: string;
  location: string;
  status: string;
}

export default function StudentAttendancePage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ present: 0, absent: 0 });
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  const supabase = createClient();

  useEffect(() => {
    const getAttendanceData = async () => {
      try {
        const localUser = localStorage.getItem("acetrack_user");
        if (!localUser) return;

        const parsed = JSON.parse(localUser);
        const email = parsed.email || parsed.username;
        if (!email) return;

        const { data: userData } = await supabase
          .from("users")
          .select("student_id")
          .eq("email", email)
          .single();

        if (!userData) return;

        // 1. Fetch all past active events
        const { data: pastEvents } = await supabase
          .from("events")
          .select("*")
          .eq("active", 1)
          .lt("start_time", new Date().toISOString())
          .order("start_time", { ascending: false });

        // 2. Fetch student check-ins
        const { data: checkins } = await supabase
          .from("attendance")
          .select("*")
          .eq("student_id", userData.student_id);

        const checkinMap = new Map();
        if (checkins) {
          checkins.forEach((c) => {
            checkinMap.set(c.event_id, c);
          });
        }

        let presentCount = 0;
        let absentCount = 0;
        const mappedRecords = (pastEvents || []).map((ev) => {
          const hasCheckin = checkinMap.get(ev.id);
          const evDate = new Date(ev.start_time);
          
          if (hasCheckin) presentCount++;
          else absentCount++;

          let timeStr = "----";
          if (hasCheckin?.time_in) {
            timeStr = new Date(hasCheckin.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }

          return {
            title: ev.title,
            date: evDate.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
            time: timeStr,
            location: ev.location || "TBD",
            status: hasCheckin ? "Present" : "Absent",
          };
        });

        setRecords(mappedRecords);
        setStats({ present: presentCount, absent: absentCount });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    getAttendanceData();
  }, []);

  const filteredRecords = records;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <LuLoader className="size-10 animate-spin text-orange-500" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading attendance...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">Attendance Record</h1>
          <p className="text-slate-500 font-medium tracking-tight">Track your participation across all organization activities.</p>
        </div>

        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm shadow-slate-200/50">
          <div className="px-6 py-2 border-r border-slate-100 flex flex-col items-center">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-tight">Total Present</span>
            <span className="text-xl font-black text-emerald-600 tracking-tight">{stats.present}</span>
          </div>
          <div className="px-6 py-2 flex flex-col items-center">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-tight">Absences</span>
            <span className="text-xl font-black text-rose-500 tracking-tight">{stats.absent}</span>
          </div>
        </div>
      </div>

      {/* Main Table/List */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-2xl shadow-slate-200/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Activity & Location</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Date & Time</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-12 text-center text-slate-400 font-medium">
                    No attendance records found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record, index) => (
                  <tr key={index} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="size-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-white group-hover:text-primary group-hover:shadow-lg group-hover:shadow-primary/10 transition-all">
                          <LuCalendar className="size-5" />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 leading-tight">{record.title}</p>
                          <p className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mt-0.5">
                            <LuMapPin className="size-3" /> {record.location}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-0.5">
                        <p className="text-sm font-black text-slate-700 tracking-tight leading-none">{record.date}</p>
                        <p className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          <LuClock className="size-3" /> {record.time}
                        </p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      {record.status === "Present" ? (
                        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-600 font-black text-[10px] uppercase tracking-widest border border-emerald-100/50">
                          <LuCircleCheck className="size-3.5" /> Present
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 text-rose-500 font-black text-[10px] uppercase tracking-widest border border-rose-100/50">
                          <LuCircleX className="size-3.5" /> Absent
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
