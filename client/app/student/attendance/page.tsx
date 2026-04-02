"use client";

import React from "react";
import {
  LuHistory,
  LuCalendar,
  LuClock,
  LuMapPin,
  LuCircleCheck,
  LuCircleX,
  LuFilter,
  LuDownload,
  LuSearch
} from "react-icons/lu";
import { Button } from "@/app/Components/ui/button";
import { Input } from "@/app/Components/ui/input";

export default function StudentAttendancePage() {
  const attendanceRecords = [
    { title: "General Assembly", date: "Apr 01, 2026", time: "1:15 PM", location: "Grand Hall", status: "Present" },
    { title: "Workshop: React Three Fiber", date: "Mar 28, 2026", time: "9:05 AM", location: "Lab 402", status: "Present" },
    { title: "Finance Committee Meeting", date: "Mar 25, 2026", time: "----", location: "Meeting Room 1", status: "Absent" },
    { title: "Organization Cleanup Day", date: "Mar 20, 2026", time: "7:30 AM", location: "Campus Plaza", status: "Present" },
    { title: "Strategic Planning", date: "Mar 15, 2026", time: "9:10 AM", location: "Conference Room", status: "Present" },
  ];

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
            <span className="text-xl font-black text-emerald-600 tracking-tight">12</span>
          </div>
          <div className="px-6 py-2 flex flex-col items-center">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-tight">Absences</span>
            <span className="text-xl font-black text-rose-500 tracking-tight">1</span>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input placeholder="Filter by event..." className="pl-12 h-11 rounded-xl bg-slate-50 border-none font-medium placeholder:text-slate-400 text-sm" />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" className="flex-1 sm:flex-none h-11 rounded-xl font-bold bg-white text-slate-600 border-slate-200">
            <LuFilter className="size-4 mr-2" /> Filter
          </Button>
          <Button variant="outline" className="flex-1 sm:flex-none h-11 rounded-xl font-bold bg-white text-slate-600 border-slate-200">
            <LuDownload className="size-4 mr-2" /> Export
          </Button>
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
              {attendanceRecords.map((record, index) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
