"use client";

import React, { useState, useEffect, useRef } from "react";
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
  LuFingerprint
} from "react-icons/lu";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/app/Components/ui/button";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";

type ModalType = "preview" | "duplicate" | "invalid" | null;

export default function AttendanceScannerPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [scanMode, setScanMode] = useState<"time_in" | "time_out">("time_in");
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Modal & Scanned Data States
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [scannedStudent, setScannedStudent] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingScan = useRef(false);
  const supabase = createClient();

  useEffect(() => {
    fetchActiveEvents();
    return () => {
      stopScanner();
    };
  }, []);

  const fetchActiveEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("active", 1)
      .order("created_at", { ascending: false });
    
    if (!error && data) {
      setEvents(data);
      if (data.length > 0) setSelectedEventId(data[0].id);
    }
    setLoading(false);
  };

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

  const stopScanner = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().then(() => {
        scannerRef.current?.clear();
        setIsScanning(false);
      });
    } else {
      setIsScanning(false);
    }
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
      } catch (e) {
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
          setScannedStudent(userRecord);
          setActiveModal("duplicate");
          safePause();
          return;
        } else if (scanMode === "time_out" && existingRecord.time_out) {
          setScannedStudent(userRecord);
          setActiveModal("duplicate");
          safePause();
          return;
        }
      }

      // 4. Show Verification Modal
      setScannedStudent(userRecord);
      setActiveModal("preview");
      safePause();

    } catch (err) {
      console.error("Scan processing error:", err);
      toast.error("Scanner error. Please try again.");
    } finally {
      // Wait a bit before allowing next scan if no modal appeared
      // (though modals usually block this)
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

  const onScanFailure = (error: any) => {
    // Standard noise in scan feed
  };

  const recordAttendance = async () => {
    if (!scannedStudent || !selectedEventId) return;
    setIsRecording(true);
    
    try {
      const now = new Date().toISOString();
      const payload: any = {
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

      const { error } = await supabase
        .from("attendance")
        .upsert(payload, { onConflict: 'event_id, student_id' });

      if (error) throw error;

      toast.success(`${scanMode === "time_in" ? "CHECKED IN" : "CHECKED OUT"}: ${payload.full_name}`);
      closeModal();
    } catch (err) {
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <LuLoader className="size-10 text-primary animate-spin" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Initalizing Authentication Hub...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 relative">
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
                        <p className="text-xs font-black text-slate-800 uppercase truncate">{scannedStudent.course}</p>
                     </div>
                     <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100 text-left">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Year & Section</p>
                        <p className="text-xs font-black text-slate-800 uppercase truncate">{scannedStudent.year} - {scannedStudent.section}</p>
                     </div>
                  </div>

                  <div className="flex gap-4">
                    <Button 
                      onClick={closeModal}
                      variant="outline"
                      className="flex-1 h-16 rounded-3xl font-bold bg-white text-slate-600 border-slate-200 shadow-none text-lg"
                    >
                      Ignore
                    </Button>
                    <Button 
                      onClick={recordAttendance}
                      disabled={isRecording}
                      className="flex-1 h-16 rounded-3xl font-black gradient-primary text-white shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-xl"
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
                      Student **{scannedStudent.first_name} {scannedStudent.last_name}** has already recorded their **{scanMode === 'time_in' ? 'Time In' : 'Time Out'}** for this official event.
                    </p>
                  </div>
                  <Button onClick={closeModal} className="w-full h-14 rounded-2xl bg-amber-900 text-white font-black hover:bg-amber-800 shadow-xl shadow-amber-900/20">
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
                    <h3 className="text-2xl font-black text-rose-900 tracking-tight leading-none">Your QR code is Invalid</h3>
                    <p className="text-sm font-medium text-rose-800/60 max-w-xs mx-auto leading-relaxed">
                      This ID does not match our official organization encryption. Please verify the student is scanning from the Portal.
                    </p>
                  </div>
                  <Button onClick={closeModal} className="w-full h-14 rounded-2xl bg-rose-900 text-white font-black hover:bg-rose-800 shadow-xl shadow-rose-900/20">
                    Close Scanner Feedback
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Page Content */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded-full">
            <LuFingerprint className="size-3" />
            <span className="text-[9px] font-black uppercase tracking-widest leading-none">Biometric Auth Hub</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Event Attendance</h1>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="h-11 rounded-xl font-bold bg-white text-slate-600 border-slate-200">
            <LuHistory className="size-4 mr-2" /> Records
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] border border-slate-200 p-8 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-10">
        {/* Settings Panel */}
        <div className="md:col-span-12 lg:col-span-4 space-y-6 h-fit">
          <div className="p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100 space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Event Selection</label>
              <select 
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                disabled={isScanning}
                className="w-full h-12 rounded-2xl border border-slate-200 bg-white px-4 font-black text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 appearance-none disabled:opacity-50"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.title}</option>
                ))}
                {events.length === 0 && <option value="">No Active Events</option>}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Traffic Direction</label>
              <div className="grid grid-cols-2 gap-2 bg-slate-200/50 p-1 rounded-2xl">
                <button 
                  onClick={() => setScanMode("time_in")}
                  className={`h-11 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${scanMode === "time_in" ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                > Time In </button>
                <button 
                  onClick={() => setScanMode("time_out")}
                  className={`h-11 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${scanMode === "time_out" ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}
                > Time Out </button>
              </div>
            </div>
          </div>

          {!isScanning ? (
            <Button 
              onClick={startScanner}
              disabled={events.length === 0}
              className="w-full h-16 rounded-3xl font-black gradient-primary shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-xl"
            >
              <LuScan className="size-6 mr-3" /> Start Scanning
            </Button>
          ) : (
            <Button 
              onClick={stopScanner}
              variant="outline"
              className="w-full h-16 rounded-3xl font-black text-rose-500 bg-rose-50 border-rose-200 shadow-none hover:bg-rose-100 transition-all text-xl"
            >
              <LuX className="size-6 mr-3" /> Stop Feedback
            </Button>
          )}

          <div className={`p-6 rounded-3xl border flex items-center gap-4 transition-all ${isScanning ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
            <div className={`size-3 rounded-full ${isScanning ? 'bg-emerald-500 animate-pulse outline outline-8 outline-emerald-500/10' : 'bg-slate-300'}`} />
            <div>
              <p className={`text-xs font-black uppercase tracking-widest leading-none ${isScanning ? 'text-emerald-700' : 'text-slate-500'}`}>
                {isScanning ? 'Engine Running' : 'Engine Idle'}
              </p>
              <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Ready for biometric QR</p>
            </div>
          </div>
        </div>

        {/* Viewport */}
        <div className="md:col-span-12 lg:col-span-8 flex justify-center lg:justify-end">
           <div className="relative aspect-square w-full max-w-lg rounded-[2.5rem] bg-slate-950 overflow-hidden shadow-inner border-[12px] border-slate-50 group mx-auto lg:mx-0">
              <div id="reader" className="size-full [&>video]:object-cover [&>canvas]:object-cover"></div>
              
              {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md transition-all">
                  <div className="size-32 rounded-full bg-white/5 flex items-center justify-center mb-6 ring-[20px] ring-white/5 animate-pulse">
                    <LuScan className="size-12 text-white/20" />
                  </div>
                  <p className="text-white/20 text-xs font-black uppercase tracking-[0.6em]">Awaiting Uplink</p>
                </div>
              )}

              {isScanning && (
                <div className="absolute inset-0 p-8 flex flex-col justify-between pointer-events-none">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3 px-5 py-2.5 bg-black/40 backdrop-blur-2xl rounded-2xl border border-white/10">
                      <div className={`size-2.5 rounded-full ${scanMode === 'time_in' ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]'}`} />
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">
                        {scanMode === 'time_in' ? 'Attendance In' : 'Attendance Out'}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <div className="w-1/2 aspect-square border-2 border-dashed border-white/20 rounded-[3rem] animate-pulse" />
                  </div>
                  <div className="text-center">
                     <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] bg-black/40 px-6 py-2 rounded-full backdrop-blur-xl inline-block border border-white/5">
                        Align ID within the center frame
                     </p>
                  </div>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
