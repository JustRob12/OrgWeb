"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { 
  LuScan, 
  LuClock, 
  LuCircleCheck, 
  LuCircleAlert, 
  LuLoader,
  LuX,
  LuHistory,
  LuUserCheck,
  LuTerminal,
  LuUserX,
  LuFingerprint,
  LuUsers,
  LuArrowDownLeft,
  LuArrowUpRight,
  LuCalendar,
  LuActivity
} from "react-icons/lu";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/app/Components/ui/button";
import { Card, CardContent } from "@/app/Components/ui/card";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";

type ModalType = "preview" | "duplicate" | "invalid" | null;

interface EventItem {
  id: string;
  title: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  active: number;
}

interface AttendanceStudent {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  middle_initial?: string;
  email: string;
  course?: string;
  section?: string;
  year?: string;
  profile_picture?: string;
}

export default function AttendanceScannerPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [scanMode, setScanMode] = useState<"time_in" | "time_out">("time_in");
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Real-time Event Attendance Stats
  const [attendanceCount, setAttendanceCount] = useState<{
    total: number;
    timeIn: number;
    timeOut: number;
  }>({ total: 0, timeIn: 0, timeOut: 0 });

  // Modal & Scanned Data States
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [scannedStudent, setScannedStudent] = useState<AttendanceStudent | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingScan = useRef(false);
  const supabase = React.useMemo(() => createClient(), []);

  // Fetch Attendance Counts for Selected Event
  const fetchAttendanceCount = useCallback(async (eventId: string) => {
    if (!eventId) {
      setAttendanceCount({ total: 0, timeIn: 0, timeOut: 0 });
      return;
    }
    try {
      const { data, error } = await supabase
        .from("attendance")
        .select("time_in, time_out")
        .eq("event_id", eventId);

      if (!error && data) {
        const total = data.length;
        const timeIn = data.filter((r) => Boolean(r.time_in)).length;
        const timeOut = data.filter((r) => Boolean(r.time_out)).length;
        setAttendanceCount({ total, timeIn, timeOut });
      }
    } catch (e) {
      console.error("Error fetching attendance counts:", e);
    }
  }, [supabase]);

  const stopScanner = useCallback(() => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().then(() => {
        scannerRef.current?.clear();
        setIsScanning(false);
      });
    } else {
      setIsScanning(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadEvents = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .eq("active", 1)
          .order("created_at", { ascending: false });

        if (!error && data && isMounted) {
          setEvents(data as EventItem[]);
          if (data.length > 0) {
            setSelectedEventId(data[0].id);
          }
        }
      } catch (err) {
        console.error("Error loading events:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadEvents();
    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [supabase, stopScanner]);

  useEffect(() => {
    let isMounted = true;
    if (!selectedEventId) return;

    const loadCounts = async () => {
      try {
        const { data, error } = await supabase
          .from("attendance")
          .select("time_in, time_out")
          .eq("event_id", selectedEventId);

        if (!error && data && isMounted) {
          const total = data.length;
          const timeIn = data.filter((r) => Boolean(r.time_in)).length;
          const timeOut = data.filter((r) => Boolean(r.time_out)).length;
          setAttendanceCount({ total, timeIn, timeOut });
        }
      } catch (e) {
        console.error("Error loading attendance counts:", e);
      }
    };

    loadCounts();
    return () => {
      isMounted = false;
    };
  }, [selectedEventId, supabase]);

  const startScanner = () => {
    if (!selectedEventId) {
      toast.error("Please select an event first.");
      return;
    }

    setIsScanning(true);
    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    const config = { 
      fps: 10, 
      qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
        const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.7);
        return { width: size, height: size };
      },
      aspectRatio: 1.0 
    };

    html5QrCode.start(
      { facingMode: "environment" },
      config,
      onScanSuccess,
      onScanFailure
    ).catch((err) => {
      console.error("Scanner error:", err);
      toast.error("Failed to start camera.");
      setIsScanning(false);
    });
  };

  const onScanSuccess = async (decodedText: string) => {
    if (isProcessingScan.current) return;
    isProcessingScan.current = true;

    try {
      // 1. Validate QR Format (must be JSON with specific keys)
      let studentData;
      try {
        studentData = JSON.parse(decodedText);
        if (!studentData.id || !studentData.name) throw new Error();
      } catch {
        setActiveModal("invalid");
        safePause();
        return;
      }

      // 2. Fetch full member details from 'users'
      const { data: userRecord, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("student_id", studentData.id)
        .single();
      
      if (userError || !userRecord) {
        setActiveModal("invalid"); // Treat missing users as invalid QR for the organization
        if (scannerRef.current && scannerRef.current.getState() === 2) {
          scannerRef.current.pause();
        }
        return;
      }

      // 3. Check for Duplicate Attendance
      const { data: existingRecord } = await supabase
        .from("attendance")
        .select("*")
        .eq("event_id", selectedEventId)
        .eq("student_id", userRecord.student_id)
        .single();

      if (existingRecord) {
        if (scanMode === "time_in" && existingRecord.time_in) {
          setScannedStudent(userRecord as AttendanceStudent);
          setActiveModal("duplicate");
          safePause();
          return;
        } else if (scanMode === "time_out" && existingRecord.time_out) {
          setScannedStudent(userRecord as AttendanceStudent);
          setActiveModal("duplicate");
          safePause();
          return;
        }
      }

      // 4. Show Verification Modal
      setScannedStudent(userRecord as AttendanceStudent);
      setActiveModal("preview");
      safePause();

    } catch (err) {
      console.error("Scan processing error:", err);
      toast.error("Scanner error. Please try again.");
    } finally {
      setTimeout(() => { isProcessingScan.current = false; }, 500);
    }
  };

  const safePause = () => {
    try {
      if (scannerRef.current && scannerRef.current.getState() === 2) {
        scannerRef.current.pause();
      }
    } catch (e) {
      console.warn("Safe pause failed", e);
    }
  };

  const safeResume = () => {
    try {
      if (scannerRef.current && scannerRef.current.getState() === 3) {
        scannerRef.current.resume();
      }
    } catch (e) {
      console.warn("Safe resume failed", e);
    }
  };

  const onScanFailure = () => {
    // Standard noise in scan feed
  };

  const recordAttendance = async () => {
    if (!scannedStudent || !selectedEventId) return;
    setIsRecording(true);
    
    try {
      const now = new Date().toISOString();
      const payload: Record<string, unknown> = {
        event_id: selectedEventId,
        user_id: scannedStudent.id,
        student_id: scannedStudent.student_id,
        full_name: `${scannedStudent.first_name} ${scannedStudent.last_name}`,
        email: scannedStudent.email,
        course: scannedStudent.course,
        section: scannedStudent.section,
        year: scannedStudent.year,
      };

      if (scanMode === "time_in") {
        payload.time_in = now;
      } else {
        payload.time_out = now;
      }

      // Check if an attendance record already exists for this student & event
      const { data: existingRecord } = await supabase
        .from("attendance")
        .select("id, time_in, time_out")
        .eq("event_id", selectedEventId)
        .eq("student_id", scannedStudent.student_id)
        .maybeSingle();

      if (existingRecord?.id) {
        // Update existing record
        const updatePayload: Record<string, unknown> = {
          full_name: payload.full_name,
          email: payload.email,
          course: payload.course,
          section: payload.section,
          year: payload.year,
        };
        if (scanMode === "time_in") {
          updatePayload.time_in = now;
        } else {
          updatePayload.time_out = now;
        }

        const { error } = await supabase
          .from("attendance")
          .update(updatePayload)
          .eq("id", existingRecord.id);

        if (error) throw error;
      } else {
        // Insert new attendance record
        const { error } = await supabase
          .from("attendance")
          .insert([payload]);

        if (error) throw error;
      }

      toast.success(`${scanMode === "time_in" ? "CHECKED IN" : "CHECKED OUT"}: ${payload.full_name}`);
      fetchAttendanceCount(selectedEventId);
      closeModal();
    } catch (err) {
      console.error("Failed to save attendance:", err);
      toast.error("Failed to persist record.");
    } finally {
      setIsRecording(false);
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setScannedStudent(null);
    isProcessingScan.current = false;
    safeResume();
  };

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <LuLoader className="size-10 text-primary animate-spin" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Initializing Scanner Hub...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Modals Layer */}
      {activeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300" onClick={closeModal} />
          
          <div className="relative w-full max-w-lg animate-in zoom-in-95 duration-200">
            {/* 1. Preview/Verification Modal */}
            {activeModal === "preview" && scannedStudent && (
              <div className="bg-white rounded-[3rem] overflow-hidden shadow-2xl border border-white/20">
                <div className="p-10 space-y-8 text-center">
                  <div className="relative inline-block mx-auto">
                    <div className="size-40 rounded-[2.5rem] bg-slate-50 border-4 border-white shadow-2xl overflow-hidden ring-1 ring-slate-100 flex items-center justify-center text-slate-200">
                      {scannedStudent.profile_picture ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={scannedStudent.profile_picture} alt="Student" className="size-full object-cover" />
                      ) : (
                        <LuUserCheck className="size-20" />
                      )}
                    </div>
                    <div className="absolute -bottom-2 -right-2 p-3 bg-emerald-500 text-white rounded-2xl shadow-xl ring-4 ring-white">
                      <LuTerminal className="size-6" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                       <LuCircleCheck className="size-3" />
                       <span className="text-[10px] font-black uppercase tracking-widest leading-none mt-0.5">Verification Detected</span>
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">
                        {scannedStudent.first_name} {scannedStudent.last_name}
                      </h3>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{scannedStudent.student_id}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100 text-left">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Academic Unit</p>
                        <p className="text-xs font-black text-slate-800 uppercase truncate">{scannedStudent.course || "N/A"}</p>
                     </div>
                     <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100 text-left">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Year & Section</p>
                        <p className="text-xs font-black text-slate-800 uppercase truncate">{scannedStudent.year || "N/A"} - {scannedStudent.section || "N/A"}</p>
                     </div>
                  </div>

                  <div className="flex gap-4">
                    <Button 
                      onClick={closeModal}
                      variant="outline"
                      className="flex-1 h-16 rounded-3xl font-bold bg-white text-slate-600 border-slate-200 shadow-none text-lg cursor-pointer"
                    >
                      Ignore
                    </Button>
                    <Button 
                      onClick={recordAttendance}
                      disabled={isRecording}
                      className="flex-1 h-16 rounded-3xl font-black gradient-primary text-white shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-xl cursor-pointer"
                    >
                      {isRecording ? <LuLoader className="size-6 animate-spin" /> : <LuFingerprint className="size-6 mr-3" />}
                      {isRecording ? "Linking..." : scanMode === "time_in" ? "Confirm In" : "Confirm Out"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Duplicate Modal */}
            {activeModal === "duplicate" && scannedStudent && (
              <div className="bg-amber-50 rounded-[3rem] border border-amber-200 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
                <div className="p-10 text-center space-y-6">
                  <div className="size-20 rounded-3xl bg-amber-100 flex items-center justify-center text-amber-600 border border-amber-200 mx-auto">
                    <LuCircleAlert className="size-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-amber-900 tracking-tight">Record Already Managed</h3>
                    <p className="text-sm font-medium text-amber-800/60 max-w-xs mx-auto leading-relaxed">
                      Student <strong>{scannedStudent.first_name} {scannedStudent.last_name}</strong> has already recorded their <strong>{scanMode === 'time_in' ? 'Time In' : 'Time Out'}</strong> for this official event.
                    </p>
                  </div>
                  <Button onClick={closeModal} className="w-full h-14 rounded-2xl bg-amber-900 text-white font-black hover:bg-amber-800 shadow-xl shadow-amber-900/20 cursor-pointer">
                    Acknowledge & Continue
                  </Button>
                </div>
              </div>
            )}

            {/* 3. Invalid QR Modal */}
            {activeModal === "invalid" && (
              <div className="bg-rose-50 rounded-[3rem] border border-rose-200 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
                <div className="p-10 text-center space-y-6">
                  <div className="size-20 rounded-3xl bg-rose-100 flex items-center justify-center text-rose-600 border border-rose-200 mx-auto shadow-inner">
                    <LuUserX className="size-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-rose-900 tracking-tight leading-none">Invalid QR Code</h3>
                    <p className="text-sm font-medium text-rose-800/60 max-w-xs mx-auto leading-relaxed">
                      This QR code does not match our official organization system. Please ensure the student is displaying their QR code from the Student Portal.
                    </p>
                  </div>
                  <Button onClick={closeModal} className="w-full h-14 rounded-2xl bg-rose-900 text-white font-black hover:bg-rose-800 shadow-xl shadow-rose-900/20 cursor-pointer">
                    Close Scanner Feedback
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded-full">
            <LuFingerprint className="size-3" />
            <span className="text-[9px] font-black uppercase tracking-widest leading-none">Biometric Auth Hub</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Event Attendance</h1>
          <p className="text-slate-500 text-sm mt-1">Scan student QR codes for live Time-In and Time-Out tracking.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/attendance/records">
            <Button variant="outline" className="h-11 px-5 rounded-xl font-bold bg-white text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer">
              <LuHistory className="size-4 mr-2 text-primary" /> View Attendance Records
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Direct Scanner Section (Unboxed & Clean) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Controls & Event Selection */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-slate-200/80 shadow-sm rounded-3xl p-6 bg-white space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <LuCalendar className="size-4 text-primary" /> Select Event
                </label>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                  {events.length} Active
                </span>
              </div>
              <select 
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                disabled={isScanning}
                className="w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all appearance-none disabled:opacity-50 cursor-pointer"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.title}</option>
                ))}
                {events.length === 0 && <option value="">No Active Events Available</option>}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <LuClock className="size-4 text-primary" /> Scanning Mode
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl">
                <button 
                  type="button"
                  onClick={() => setScanMode("time_in")}
                  className={`h-12 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    scanMode === "time_in" 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                > 
                  <LuArrowDownLeft className="size-4" /> Time In 
                </button>
                <button 
                  type="button"
                  onClick={() => setScanMode("time_out")}
                  className={`h-12 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    scanMode === "time_out" 
                      ? 'bg-rose-600 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                > 
                  <LuArrowUpRight className="size-4" /> Time Out 
                </button>
              </div>
            </div>

            {!isScanning ? (
              <Button 
                onClick={startScanner}
                disabled={events.length === 0}
                className="w-full h-14 rounded-2xl font-black gradient-primary text-white shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-98 transition-all text-lg cursor-pointer disabled:opacity-50"
              >
                <LuScan className="size-5 mr-2.5" /> Start Scanning
              </Button>
            ) : (
              <Button 
                onClick={stopScanner}
                variant="outline"
                className="w-full h-14 rounded-2xl font-black text-rose-600 bg-rose-50 border-rose-200 shadow-none hover:bg-rose-100 transition-all text-lg cursor-pointer"
              >
                <LuX className="size-5 mr-2.5" /> Stop Scanner
              </Button>
            )}

            <div className={`p-4 rounded-2xl border flex items-center gap-3.5 transition-all ${
              isScanning ? 'bg-emerald-50/80 border-emerald-200' : 'bg-slate-50 border-slate-200/80'
            }`}>
              <div className={`size-3.5 rounded-full shrink-0 ${
                isScanning ? 'bg-emerald-500 animate-ping' : 'bg-slate-300'
              }`} />
              <div className="flex-1">
                <p className={`text-xs font-black uppercase tracking-wider ${
                  isScanning ? 'text-emerald-800' : 'text-slate-600'
                }`}>
                  {isScanning ? 'Scanner Active & Ready' : 'Camera Standby'}
                </p>
                <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                  {isScanning ? `Tracking: ${scanMode === 'time_in' ? 'Time In' : 'Time Out'}` : 'Click Start Scanning to begin'}
                </p>
              </div>
              <LuActivity className={`size-4 ${isScanning ? 'text-emerald-600 animate-pulse' : 'text-slate-300'}`} />
            </div>
          </Card>
        </div>

        {/* Right Side: Camera Viewport */}
        <div className="lg:col-span-7 flex justify-center">
          <div className="relative aspect-square w-full max-w-md sm:max-w-lg rounded-[2.5rem] bg-slate-950 overflow-hidden shadow-2xl border-4 border-white ring-1 ring-slate-200 group">
            <div id="reader" className="size-full [&>video]:object-cover [&>canvas]:object-cover"></div>
            
            {!isScanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md transition-all p-6 text-center">
                <div className="size-28 rounded-full bg-white/5 flex items-center justify-center mb-5 ring-[16px] ring-white/5 animate-pulse">
                  <LuScan className="size-12 text-white/30" />
                </div>
                <h4 className="text-white text-sm font-black uppercase tracking-widest mb-1">Camera Standby</h4>
                <p className="text-slate-400 text-xs max-w-xs leading-relaxed">
                  Select your event and click <strong>Start Scanning</strong> to activate the camera.
                </p>
              </div>
            )}

            {isScanning && (
              <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-between pointer-events-none">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2.5 px-4 py-2 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/15 shadow-lg">
                    <div className={`size-2.5 rounded-full ${
                      scanMode === 'time_in' ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]' : 'bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,0.8)]'
                    }`} />
                    <span className="text-[11px] font-black text-white uppercase tracking-wider">
                      {scanMode === 'time_in' ? 'Time In Mode' : 'Time Out Mode'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="w-56 h-56 border-2 border-dashed border-primary/80 rounded-[2.5rem] animate-pulse shadow-[0_0_20px_rgba(249,115,22,0.3)] relative flex items-center justify-center">
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-bounce opacity-80" />
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-white/80 text-[11px] font-bold uppercase tracking-wider bg-black/60 px-5 py-2 rounded-full backdrop-blur-xl inline-block border border-white/10 shadow-lg">
                    Align student QR code within frame
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Event Attendance Count Metric Cards (Below Scanner) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">Live Attendance Counts</h3>
          <span className="text-xs font-bold text-slate-500">Auto-refreshed on scan</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white border-slate-200/80 shadow-sm rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="size-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center font-black shadow-inner shrink-0">
                  <LuCalendar className="size-6 text-primary" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-black tracking-wider uppercase text-slate-400">Selected Event</p>
                  <h3 className="text-lg font-black text-slate-900 truncate mt-0.5" title={selectedEvent?.title || "No Event"}>
                    {selectedEvent?.title || "No Event"}
                  </h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 text-white border-none shadow-md shadow-slate-900/10 rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="size-12 bg-white/10 rounded-2xl flex items-center justify-center text-white shadow-inner shrink-0">
                  <LuUsers className="size-6" />
                </div>
                <div>
                  <p className="text-xs font-black tracking-wider uppercase text-slate-400">Total Scanned</p>
                  <h3 className="text-3xl font-black text-white mt-0.5">{attendanceCount.total}</h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-emerald-50/70 border-emerald-200/80 shadow-sm rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="size-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 shrink-0">
                  <LuArrowDownLeft className="size-6" />
                </div>
                <div>
                  <p className="text-xs font-black tracking-wider uppercase text-emerald-800">Checked In</p>
                  <h3 className="text-3xl font-black text-emerald-950 mt-0.5">{attendanceCount.timeIn}</h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-rose-50/70 border-rose-200/80 shadow-sm rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="size-12 bg-rose-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-200 shrink-0">
                  <LuArrowUpRight className="size-6" />
                </div>
                <div>
                  <p className="text-xs font-black tracking-wider uppercase text-rose-800">Checked Out</p>
                  <h3 className="text-3xl font-black text-rose-950 mt-0.5">{attendanceCount.timeOut}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
