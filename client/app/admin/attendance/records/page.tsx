"use client";

import React, { useState, useEffect } from "react";
import { 
  LuFileSpreadsheet, 
  LuChevronLeft, 
  LuChevronRight, 
  LuSearch, 
  LuCalendar,
  LuUserCheck,
  LuClock,
  LuLoader,
  LuInbox,
  LuDownload
} from "react-icons/lu";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/app/Components/ui/button";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const ITEMS_PER_PAGE = 10;

export default function AttendanceRecordsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [stats, setStats] = useState({ in: 0, out: 0, both: 0 });
  
  const supabase = createClient();

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchAttendance();
      fetchStats();
    } else {
      setAttendance([]);
      setTotalRecords(0);
      setStats({ in: 0, out: 0, both: 0 });
    }
  }, [selectedEventId, currentPage, searchQuery]);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (!error && data) {
      setEvents(data);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
      .from("attendance")
      .select("*", { count: "exact" })
      .eq("event_id", selectedEventId)
      .order("created_at", { ascending: false });

    if (searchQuery) {
      query = query.or(`full_name.ilike.%${searchQuery}%,student_id.ilike.%${searchQuery}%`);
    }

    const { data, error, count } = await query.range(from, to);

    if (!error && data) {
      setAttendance(data);
      setTotalRecords(count || 0);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    let query = supabase
      .from("attendance")
      .select("time_in, time_out")
      .eq("event_id", selectedEventId);

    if (searchQuery) {
      query = query.or(`full_name.ilike.%${searchQuery}%,student_id.ilike.%${searchQuery}%`);
    }

    const { data, error } = await query;

    if (!error && data) {
      const inCount = data.filter(r => r.time_in && !r.time_out).length;
      const outCount = data.filter(r => r.time_out && !r.time_in).length;
      const bothCount = data.filter(r => r.time_in && r.time_out).length;
      setStats({ in: inCount, out: outCount, both: bothCount });
    }
  };

  const handleExport = async () => {
    if (!selectedEventId) {
      toast.error("Please select an event first.");
      return;
    }
    const eventName = events.find(e => e.id === selectedEventId)?.title || "Event";
    
    let query = supabase
      .from("attendance")
      .select("student_id, full_name, email, course, section, year, time_in, time_out, status")
      .eq("event_id", selectedEventId);

    if (searchQuery) {
      query = query.or(`full_name.ilike.%${searchQuery}%,student_id.ilike.%${searchQuery}%`);
    }

    const { data, error } = await query;

    if (error || !data) {
      toast.error("Failed to fetch data for export.");
      return;
    }

    const formattedData = data.map(record => ({
      "Student ID": record.student_id,
      "Full Name": record.full_name,
      "Email": record.email,
      "Course": record.course,
      "Section": record.section,
      "Year": record.year,
      "Time In": record.time_in ? new Date(record.time_in).toLocaleString() : "-",
      "Time Out": record.time_out ? new Date(record.time_out).toLocaleString() : "-",
      "Status": record.status
    }));

    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `${eventName}_Attendance_Report.xlsx`);
    toast.success("Excel report generated!");
  };

  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Attendance Records</h1>
          <p className="text-slate-500 font-medium">Historical logs and exports for all organization events.</p>
        </div>
        <Button 
          onClick={handleExport}
          disabled={!selectedEventId}
          className="h-12 px-6 rounded-2xl font-black gradient-primary shadow-xl shadow-primary/20 hover:scale-105 transition-all text-white disabled:opacity-50"
        >
          <LuDownload className="size-5 mr-3" /> Download Excel
        </Button>
      </div>

      {/* Primary Selector & Search (The focus area) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Official Event</label>
          <div className="relative group">
            <LuCalendar className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <select 
              value={selectedEventId}
              onChange={(e) => { setSelectedEventId(e.target.value); setCurrentPage(1); }}
              className="w-full h-14 pl-12 pr-4 bg-white border border-slate-200 rounded-2xl text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-primary/5 transition-all appearance-none"
            >
              <option value="">Select an Event</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quick Search</label>
          <div className="relative group">
            <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <input 
              type="text"
              placeholder="Search Name or Student ID..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              disabled={!selectedEventId}
              className="w-full h-14 pl-12 pr-4 bg-white border border-slate-200 rounded-2xl text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-primary/5 transition-all disabled:bg-slate-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {selectedEventId ? (
        <div className="space-y-8">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex items-center gap-5">
              <div className="size-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-emerald-600 border border-emerald-100">
                <LuUserCheck className="size-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-emerald-900">{stats.in}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700/60 leading-none mt-1">Time In Only</p>
              </div>
            </div>

            <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 flex items-center gap-5">
              <div className="size-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-rose-600 border border-rose-100">
                <LuClock className="size-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-rose-900">{stats.out}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-rose-700/60 leading-none mt-1">Time Out Only</p>
              </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-center gap-5">
              <div className="size-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-blue-600 border border-blue-100">
                <LuFileSpreadsheet className="size-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-blue-900">{stats.both}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-700/60 leading-none mt-1">Completed Both</p>
              </div>
            </div>
          </div>

          {/* Records Table */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Info</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Academics</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Time In</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Time Out</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <LuLoader className="size-8 text-primary animate-spin mx-auto mb-4" />
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Fetching Logs...</p>
                      </td>
                    </tr>
                  ) : attendance.length > 0 ? (
                    attendance.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6">
                          <p className="font-bold text-slate-900 leading-none">{row.full_name}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{row.student_id}</p>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-xs font-black text-slate-600 uppercase tracking-tight">{row.course}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{row.year} Year • {row.section}</p>
                        </td>
                        <td className="px-8 py-6">
                          {row.time_in ? (
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-emerald-600 tracking-tight">{new Date(row.time_in).toLocaleTimeString()}</span>
                              <span className="text-[10px] font-bold text-slate-400">{new Date(row.time_in).toLocaleDateString()}</span>
                            </div>
                          ) : <span className="text-slate-200">--:--</span>}
                        </td>
                        <td className="px-8 py-6">
                        {row.time_out ? (
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-blue-600 tracking-tight">{new Date(row.time_out).toLocaleTimeString()}</span>
                              <span className="text-[10px] font-bold text-slate-400">{new Date(row.time_out).toLocaleDateString()}</span>
                            </div>
                          ) : <span className="text-slate-200">--:--</span>}
                        </td>
                        <td className="px-8 py-6 text-right">
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ring-1 ring-inset ${
                            row.time_in && row.time_out ? 'bg-blue-50 text-blue-700 ring-blue-100' : 
                            row.time_in ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 
                            'bg-rose-50 text-rose-700 ring-rose-100'
                          }`}>
                            {row.time_in && row.time_out ? 'Complete' : row.time_in ? 'Logged In' : 'Logged Out'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <LuInbox className="size-10 text-slate-200 mx-auto mb-4" />
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No matching records found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {totalRecords > 0 && (
              <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Showing {attendance.length} of {totalRecords} Records
                </p>
                <div className="flex items-center gap-2">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all shadow-sm"
                  >
                    <LuChevronLeft className="size-5" />
                  </button>
                  <div className="px-4 text-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">Page</span>
                    <span className="text-sm font-black text-slate-900 whitespace-nowrap">{currentPage} / {totalPages || 1}</span>
                  </div>
                  <button 
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all shadow-sm"
                  >
                    <LuChevronRight className="size-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[3rem] border border-slate-200 p-20 text-center space-y-6">
          <div className="size-24 rounded-[2rem] bg-slate-50 flex items-center justify-center mx-auto ring-8 ring-slate-50/50">
            <LuCalendar className="size-10 text-slate-200" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Select an Event</h2>
            <p className="text-slate-500 text-sm max-w-sm mx-auto font-medium">Please choose an active or historical event from the dropdown above to view official attendance logs.</p>
          </div>
        </div>
      )}
    </div>
  );
}
