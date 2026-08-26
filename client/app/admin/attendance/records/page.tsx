"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  LuDownload,
  LuTrash2,
  LuX,
  LuTriangleAlert,
  LuCircleAlert,
  LuCircleCheck
} from "react-icons/lu";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/app/Components/ui/button";
import { Modal } from "@/app/Components/ui/modal";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const ITEMS_PER_PAGE = 10;

interface AttendanceRow {
  id: string;
  student_id: string;
  full_name: string;
  email: string;
  course: string;
  section: string;
  year: string;
  time_in: string | null;
  time_out: string | null;
  status: string;
  event_id: string;
  created_at: string;
}

export default function AttendanceRecordsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [stats, setStats] = useState({ in: 0, out: 0, both: 0 });

  // Delete & Clear Time Modal States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRecordForDelete, setSelectedRecordForDelete] = useState<AttendanceRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const supabase = React.useMemo(() => createClient(), []);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (!error && data) {
      setEvents(data);
    }
  };

  const fetchAttendance = useCallback(async () => {
    if (!selectedEventId) return;
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
      setAttendance(data as AttendanceRow[]);
      setTotalRecords(count || 0);
    }
    setLoading(false);
  }, [selectedEventId, currentPage, searchQuery, supabase]);

  const fetchStats = useCallback(async () => {
    if (!selectedEventId) return;
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
  }, [selectedEventId, searchQuery, supabase]);

  useEffect(() => {
    if (selectedEventId) {
      fetchAttendance();
      fetchStats();
    } else {
      setAttendance([]);
      setTotalRecords(0);
      setStats({ in: 0, out: 0, both: 0 });
    }
  }, [selectedEventId, fetchAttendance, fetchStats]);

  const handleOpenDeleteModal = (record: AttendanceRow) => {
    setSelectedRecordForDelete(record);
    setIsDeleteModalOpen(true);
  };

  // Delete entire attendance record from database
  const handleDeleteEntireRecord = async (recordId: string) => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("attendance").delete().eq("id", recordId);
      if (error) throw error;

      toast.success("Attendance record deleted successfully.");
      setIsDeleteModalOpen(false);
      setSelectedRecordForDelete(null);
      await fetchAttendance();
      await fetchStats();
    } catch (err: any) {
      console.error("Delete attendance error:", err);
      toast.error(err.message || "Failed to delete attendance record.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Clear specific timestamp (time_in or time_out)
  const handleClearTimestamp = async (recordId: string, type: "time_in" | "time_out") => {
    setIsDeleting(true);
    try {
      const targetRecord = attendance.find((r) => r.id === recordId) || selectedRecordForDelete;
      const updatePayload: Record<string, any> = {};
      if (type === "time_in") {
        updatePayload.time_in = null;
      } else {
        updatePayload.time_out = null;
      }

      // If both timestamps become null after clearing, delete the record completely
      const remainingTimestamp = type === "time_in" ? targetRecord?.time_out : targetRecord?.time_in;
      if (!remainingTimestamp) {
        const { error } = await supabase.from("attendance").delete().eq("id", recordId);
        if (error) throw error;
        toast.success("All timestamps cleared and attendance record removed.");
      } else {
        const { error } = await supabase.from("attendance").update(updatePayload).eq("id", recordId);
        if (error) throw error;
        toast.success(`${type === "time_in" ? "Time In" : "Time Out"} removed successfully.`);
      }

      setIsDeleteModalOpen(false);
      setSelectedRecordForDelete(null);
      await fetchAttendance();
      await fetchStats();
    } catch (err: any) {
      console.error("Clear timestamp error:", err);
      toast.error(err.message || "Failed to clear timestamp.");
    } finally {
      setIsDeleting(false);
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
  const selectedEvent = events.find((e) => e.id === selectedEventId);

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight mb-1 sm:mb-2">
            Attendance Records
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Historical logs, timestamps, error correction, and exports for organization events.
          </p>
        </div>
        <Button 
          onClick={handleExport}
          disabled={!selectedEventId}
          className="h-11 sm:h-12 px-5 sm:px-6 rounded-2xl font-black gradient-primary shadow-xl shadow-primary/20 hover:scale-105 transition-all text-white disabled:opacity-50 w-full sm:w-auto justify-center text-xs sm:text-sm cursor-pointer"
        >
          <LuDownload className="size-4 sm:size-5 mr-2 sm:mr-3" /> Download Excel
        </Button>
      </div>

      {/* Primary Selector & Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="space-y-2 sm:space-y-3">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Official Event</label>
          <div className="relative group">
            <LuCalendar className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <select 
              value={selectedEventId}
              onChange={(e) => { setSelectedEventId(e.target.value); setCurrentPage(1); }}
              className="w-full h-12 sm:h-14 pl-12 pr-4 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-primary/5 transition-all appearance-none cursor-pointer"
            >
              <option value="">Select an Event</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quick Search</label>
          <div className="relative group">
            <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <input 
              type="text"
              placeholder="Search Name or Student ID..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              disabled={!selectedEventId}
              className="w-full h-12 sm:h-14 pl-12 pr-4 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-primary/5 transition-all disabled:bg-slate-50 disabled:cursor-not-allowed"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <LuX className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {selectedEventId ? (
        <div className="space-y-6 sm:space-y-8">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-6">
            <div className="bg-emerald-50 p-4 sm:p-6 rounded-3xl border border-emerald-100 flex items-center gap-4 sm:gap-5">
              <div className="size-12 sm:size-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-emerald-600 border border-emerald-100 shrink-0">
                <LuUserCheck className="size-5 sm:size-6" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-emerald-900">{stats.in}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700/60 leading-none mt-1">Time In Only</p>
              </div>
            </div>

            <div className="bg-rose-50 p-4 sm:p-6 rounded-3xl border border-rose-100 flex items-center gap-4 sm:gap-5">
              <div className="size-12 sm:size-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-rose-600 border border-rose-100 shrink-0">
                <LuClock className="size-5 sm:size-6" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-rose-900">{stats.out}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-rose-700/60 leading-none mt-1">Time Out Only</p>
              </div>
            </div>

            <div className="bg-orange-50 p-4 sm:p-6 rounded-3xl border border-orange-100 flex items-center gap-4 sm:gap-5">
              <div className="size-12 sm:size-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-orange-600 border border-orange-100 shrink-0">
                <LuFileSpreadsheet className="size-5 sm:size-6" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-orange-900">{stats.both}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-700/60 leading-none mt-1">Completed Both</p>
              </div>
            </div>
          </div>

          {/* Records Container */}
          <div className="bg-white rounded-2xl sm:rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 lg:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Info</th>
                    <th className="px-6 lg:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Academics</th>
                    <th className="px-6 lg:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Time In</th>
                    <th className="px-6 lg:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Time Out</th>
                    <th className="px-6 lg:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                    <th className="px-6 lg:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center">
                        <LuLoader className="size-8 text-primary animate-spin mx-auto mb-4" />
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Fetching Logs...</p>
                      </td>
                    </tr>
                  ) : attendance.length > 0 ? (
                    attendance.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 lg:px-8 py-5">
                          <p className="font-bold text-slate-900 leading-none">{row.full_name}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5 font-mono">{row.student_id}</p>
                        </td>
                        <td className="px-6 lg:px-8 py-5">
                          <p className="text-xs font-black text-slate-600 uppercase tracking-tight">{row.course || "—"}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Year {row.year || "—"} • Sec {row.section || "—"}</p>
                        </td>
                        <td className="px-6 lg:px-8 py-5">
                          {row.time_in ? (
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-emerald-600 tracking-tight">{new Date(row.time_in).toLocaleTimeString()}</span>
                              <span className="text-[10px] font-bold text-slate-400">{new Date(row.time_in).toLocaleDateString()}</span>
                            </div>
                          ) : <span className="text-slate-300 font-mono text-xs">--:--</span>}
                        </td>
                        <td className="px-6 lg:px-8 py-5">
                          {row.time_out ? (
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-blue-600 tracking-tight">{new Date(row.time_out).toLocaleTimeString()}</span>
                              <span className="text-[10px] font-bold text-slate-400">{new Date(row.time_out).toLocaleDateString()}</span>
                            </div>
                          ) : <span className="text-slate-300 font-mono text-xs">--:--</span>}
                        </td>
                        <td className="px-6 lg:px-8 py-5 text-center">
                          <span className={`inline-flex px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ring-1 ring-inset ${
                            row.time_in && row.time_out ? 'bg-blue-50 text-blue-700 ring-blue-100' : 
                            row.time_in ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 
                            'bg-rose-50 text-rose-700 ring-rose-100'
                          }`}>
                            {row.time_in && row.time_out ? 'Complete' : row.time_in ? 'Logged In' : 'Logged Out'}
                          </span>
                        </td>
                        <td className="px-6 lg:px-8 py-5 text-right whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDeleteModal(row)}
                            className="size-9 p-0 rounded-xl hover:bg-rose-500 hover:text-white hover:border-rose-500 text-rose-600 border-slate-200 transition-all cursor-pointer shadow-xs"
                            title="Delete or Manage Attendance Time"
                          >
                            <LuTrash2 className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-20 text-center">
                        <LuInbox className="size-10 text-slate-200 mx-auto mb-4" />
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No matching records found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (< md) */}
            <div className="md:hidden divide-y divide-slate-100">
              {loading ? (
                <div className="py-16 text-center">
                  <LuLoader className="size-8 text-primary animate-spin mx-auto mb-3" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Fetching Logs...</p>
                </div>
              ) : attendance.length > 0 ? (
                attendance.map((row) => (
                  <div key={row.id} className="p-4 space-y-3 bg-white">
                    {/* Top Row: Name, ID, & Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm leading-snug">{row.full_name}</h4>
                        <p className="text-[11px] font-mono font-black text-slate-400">{row.student_id}</p>
                      </div>
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ring-1 ring-inset shrink-0 ${
                        row.time_in && row.time_out ? 'bg-blue-50 text-blue-700 ring-blue-100' : 
                        row.time_in ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 
                        'bg-rose-50 text-rose-700 ring-rose-100'
                      }`}>
                        {row.time_in && row.time_out ? 'Complete' : row.time_in ? 'Logged In' : 'Logged Out'}
                      </span>
                    </div>

                    {/* Academic info */}
                    <p className="text-xs text-slate-500 font-medium">
                      {row.course || "No Course"} • Year {row.year || "—"} • Sec {row.section || "—"}
                    </p>

                    {/* Timestamps Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs">
                      <div className="p-2 rounded-xl bg-emerald-50/60 border border-emerald-100">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-emerald-700 mb-0.5">Time In</span>
                        {row.time_in ? (
                          <>
                            <span className="font-black text-emerald-950 text-xs block">{new Date(row.time_in).toLocaleTimeString()}</span>
                            <span className="text-[10px] text-emerald-700/80 font-medium block">{new Date(row.time_in).toLocaleDateString()}</span>
                          </>
                        ) : (
                          <span className="text-slate-300 font-mono text-xs">--:--</span>
                        )}
                      </div>

                      <div className="p-2 rounded-xl bg-blue-50/60 border border-blue-100">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-blue-700 mb-0.5">Time Out</span>
                        {row.time_out ? (
                          <>
                            <span className="font-black text-blue-950 text-xs block">{new Date(row.time_out).toLocaleTimeString()}</span>
                            <span className="text-[10px] text-blue-700/80 font-medium block">{new Date(row.time_out).toLocaleDateString()}</span>
                          </>
                        ) : (
                          <span className="text-slate-300 font-mono text-xs">--:--</span>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDeleteModal(row)}
                        className="w-full h-9 rounded-xl text-xs font-bold border-rose-200 text-rose-600 hover:bg-rose-500 hover:text-white transition-all justify-center cursor-pointer"
                      >
                        <LuTrash2 className="size-3.5 mr-1.5" /> Manage / Delete Attendance Time
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-16 text-center px-4">
                  <LuInbox className="size-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No matching records found</p>
                </div>
              )}
            </div>

            {/* Pagination Footer */}
            {totalRecords > 0 && (
              <div className="px-4 sm:px-8 py-4 sm:py-6 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                <p className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest text-center sm:text-left">
                  Showing {attendance.length} of {totalRecords} Records
                </p>
                <div className="flex items-center gap-2">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-2 sm:p-3 bg-white border border-slate-200 rounded-xl text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
                  >
                    <LuChevronLeft className="size-4 sm:size-5" />
                  </button>
                  <div className="px-3 sm:px-4 text-center">
                    <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">Page</span>
                    <span className="text-xs sm:text-sm font-black text-slate-900 whitespace-nowrap">{currentPage} / {totalPages || 1}</span>
                  </div>
                  <button 
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="p-2 sm:p-3 bg-white border border-slate-200 rounded-xl text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
                  >
                    <LuChevronRight className="size-4 sm:size-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl sm:rounded-[3rem] border border-slate-200 p-8 sm:p-20 text-center space-y-4 sm:space-y-6">
          <div className="size-16 sm:size-24 rounded-2xl sm:rounded-[2rem] bg-slate-50 flex items-center justify-center mx-auto ring-8 ring-slate-50/50">
            <LuCalendar className="size-8 sm:size-10 text-slate-200" />
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Select an Event</h2>
            <p className="text-slate-500 text-xs sm:text-sm max-w-sm mx-auto font-medium">Please choose an active or historical event from the dropdown above to view official attendance logs.</p>
          </div>
        </div>
      )}

      {/* Delete / Clear Attendance Time Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setSelectedRecordForDelete(null);
          }
        }}
        title="Manage / Remove Attendance Time"
      >
        {selectedRecordForDelete && (
          <div className="space-y-5">
            {/* Student Info Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-base font-black text-slate-900">{selectedRecordForDelete.full_name}</h3>
                <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-md">
                  {selectedRecordForDelete.student_id}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {selectedRecordForDelete.course || "No Course"} • Year {selectedRecordForDelete.year || "—"} • Sec {selectedRecordForDelete.section || "—"}
              </p>
              {selectedEvent && (
                <p className="text-xs font-semibold text-slate-600 pt-1">
                  Event: <strong className="text-slate-900">{selectedEvent.title}</strong>
                </p>
              )}
            </div>

            {/* Individual Timestamp Actions */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Logged Timestamps & Correction:
              </p>

              {/* Time In Row */}
              <div className="p-3 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                    <LuUserCheck className="size-3" /> Time In Log
                  </span>
                  {selectedRecordForDelete.time_in ? (
                    <p className="text-xs font-black text-slate-900">
                      {new Date(selectedRecordForDelete.time_in).toLocaleTimeString()} ({new Date(selectedRecordForDelete.time_in).toLocaleDateString()})
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 font-medium">No Time In recorded</p>
                  )}
                </div>

                {selectedRecordForDelete.time_in && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isDeleting}
                    onClick={() => handleClearTimestamp(selectedRecordForDelete.id, "time_in")}
                    className="h-8 px-3 rounded-xl text-xs font-bold border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 cursor-pointer shrink-0 w-full sm:w-auto justify-center"
                  >
                    <LuX className="size-3.5 mr-1" /> Clear Time In
                  </Button>
                )}
              </div>

              {/* Time Out Row */}
              <div className="p-3 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 flex items-center gap-1">
                    <LuClock className="size-3" /> Time Out Log
                  </span>
                  {selectedRecordForDelete.time_out ? (
                    <p className="text-xs font-black text-slate-900">
                      {new Date(selectedRecordForDelete.time_out).toLocaleTimeString()} ({new Date(selectedRecordForDelete.time_out).toLocaleDateString()})
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 font-medium">No Time Out recorded</p>
                  )}
                </div>

                {selectedRecordForDelete.time_out && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isDeleting}
                    onClick={() => handleClearTimestamp(selectedRecordForDelete.id, "time_out")}
                    className="h-8 px-3 rounded-xl text-xs font-bold border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 cursor-pointer shrink-0 w-full sm:w-auto justify-center"
                  >
                    <LuX className="size-3.5 mr-1" /> Clear Time Out
                  </Button>
                )}
              </div>
            </div>

            {/* Danger Zone: Delete Entire Record */}
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
              <div className="flex items-center gap-1.5 text-rose-800 text-xs font-bold">
                <LuTriangleAlert className="size-4 text-rose-600 shrink-0" />
                <span>Delete All Attendance for this Student</span>
              </div>
              <p className="text-[11px] text-rose-700 leading-relaxed font-medium">
                Completely removes this student&apos;s attendance entry (both Time In and Time Out) for this event.
              </p>
              <Button
                size="sm"
                disabled={isDeleting}
                loading={isDeleting}
                onClick={() => handleDeleteEntireRecord(selectedRecordForDelete.id)}
                className="w-full h-10 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-sm cursor-pointer justify-center"
              >
                <LuTrash2 className="size-3.5 mr-1.5" /> Delete Entire Attendance Record
              </Button>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                disabled={isDeleting}
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedRecordForDelete(null);
                }}
                className="h-10 px-5 rounded-xl font-bold text-xs cursor-pointer w-full sm:w-auto justify-center"
              >
                Close / Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
