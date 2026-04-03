"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  LuScan, 
  LuX, 
  LuLoader, 
  LuCircleCheck, 
  LuUserCheck, 
  LuCircleDollarSign,
  LuHistory,
  LuCoins,
  LuTerminal,
  LuSearch,
  LuCircleAlert,
  LuClipboardList,
  LuBadgeCheck
} from "react-icons/lu";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/app/Components/ui/button";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";

export default function FinanceScanPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [financeItems, setFinanceItems] = useState<any[]>([]);
  
  // Modal & Scanned Data States
  const [showModal, setShowModal] = useState(false);
  const [scannedStudent, setScannedStudent] = useState<any>(null);
  const [receiptNumber, setReceiptNumber] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<string, { checked: boolean, amount: string }>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [existingPayments, setExistingPayments] = useState<any[]>([]);
  const [paidModalInfo, setPaidModalInfo] = useState<{show: boolean, title: string, amount: number} | null>(null);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingScan = useRef(false);
  const supabase = createClient();

  useEffect(() => {
    fetchFinanceItems();
    return () => {
      stopScanner();
    };
  }, []);

  const fetchFinanceItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("finance_items")
      .select("*")
      .order("title", { ascending: true });
    
    if (!error && data) {
      setFinanceItems(data);
    }
    setLoading(false);
  };

  const startScanner = () => {
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
    if (scannerRef.current && scannerRef.current.getState() === 2) {
      scannerRef.current.stop().then(() => {
        scannerRef.current?.clear();
        setIsScanning(false);
      });
    } else {
      setIsScanning(false);
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

  const onScanSuccess = async (decodedText: string) => {
    if (isProcessingScan.current) return;
    isProcessingScan.current = true;

    try {
      let studentData;
      try {
        studentData = JSON.parse(decodedText);
        if (!studentData.id || !studentData.name) throw new Error();
      } catch (e) {
        toast.error("Invalid QR format detected.");
        isProcessingScan.current = false;
        return;
      }

      // Fetch full member details
      const { data: userRecord, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("student_id", studentData.id)
        .single();
      
      if (userError || !userRecord) {
        toast.error(`Member ${studentData.id} not found.`);
        isProcessingScan.current = false;
        return;
      }

      const { data: paymentsData } = await supabase
        .from("finance_transactions")
        .select("finance_id, amount")
        .eq("user_id", userRecord.id);

      setExistingPayments(paymentsData || []);

      // Show Payment Modal
      setScannedStudent(userRecord);
      setShowModal(true);
      safePause();

    } catch (err) {
      console.error("Scan processing error:", err);
      isProcessingScan.current = false;
    }
  };

  const onScanFailure = (error: any) => {
    // Noise in feed
  };

  const handleCheckboxChange = (itemId: string, checked: boolean) => {
    if (checked) {
      const existingPayment = existingPayments.find(p => p.finance_id === itemId);
      if (existingPayment) {
        const item = financeItems.find(fi => fi.id === itemId);
        setPaidModalInfo({
          show: true,
          title: item?.title || "This fee",
          amount: existingPayment.amount
        });
        return;
      }

      const item = financeItems.find(fi => fi.id === itemId);
      setSelectedItems(prev => ({
        ...prev,
        [itemId]: { checked: true, amount: item?.amount?.toString() || "" }
      }));
    } else {
      setSelectedItems(prev => ({
        ...prev,
        [itemId]: { checked: false, amount: "" }
      }));
    }
  };

  const handleAmountChange = (itemId: string, amount: string) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], amount }
    }));
  };

  const recordPayments = async () => {
    const activePayments = Object.entries(selectedItems)
      .filter(([_, data]) => data.checked && parseFloat(data.amount) > 0)
      .map(([id, data]) => ({
        user_id: scannedStudent.id,
        finance_id: id,
        amount: parseFloat(data.amount),
        receipt_number: receiptNumber || null,
        transaction_date: new Date().toISOString()
      }));

    if (activePayments.length === 0) {
      toast.error("Please select at least one item with a valid amount.");
      return;
    }

    if (!receiptNumber) {
      toast.error("Please enter a receipt or reference number.");
      return;
    }

    setIsRecording(true);
    try {
      const { error } = await supabase
        .from("finance_transactions")
        .insert(activePayments);

      if (error) throw error;

      toast.success(`${activePayments.length} payment(s) recorded for ${scannedStudent.first_name}!`);
      closeModal();
    } catch (err: any) {
      toast.error("Failed to record transaction.");
    } finally {
      setIsRecording(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setScannedStudent(null);
    setReceiptNumber("");
    setSelectedItems({});
    setExistingPayments([]);
    setPaidModalInfo(null);
    isProcessingScan.current = false;
    safeResume();
  };

  const grandTotal = useMemo(() => {
    return Object.values(selectedItems)
      .filter(item => item.checked)
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  }, [selectedItems]);

  if (loading && financeItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <LuLoader className="size-10 text-primary animate-spin" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Initalizing Payment Terminal...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 relative">
      {/* Already Paid Modal */}
      {paidModalInfo && paidModalInfo.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-6">
              <LuCircleAlert className="size-8 text-amber-500" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Already Paid</h3>
            <p className="text-slate-500 font-medium mb-6">
              This student has already paid for <strong>{paidModalInfo.title}</strong> with the amount of <strong>₱{paidModalInfo.amount.toLocaleString()}</strong>.
            </p>
            <Button 
              onClick={() => setPaidModalInfo(null)}
              className="w-full h-12 rounded-xl font-black bg-slate-900 text-white hover:bg-slate-800"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {showModal && scannedStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm">
          <div className="relative w-full max-w-xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Simple Header */}
            <div className="p-8 border-b border-slate-100 flex items-center gap-5">
              <div className="size-16 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden relative">
                {scannedStudent.profile_picture ? (
                  <img src={scannedStudent.profile_picture} alt="Student" className="size-full object-cover" />
                ) : (
                  <LuUserCheck className="size-full p-4 text-slate-300" />
                )}
                <div className="absolute bottom-1 right-1 size-4 bg-emerald-500 rounded-full border-2 border-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-slate-900 truncate">
                  {scannedStudent.first_name} {scannedStudent.last_name}
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest truncate">{scannedStudent.student_id} • {scannedStudent.course}</p>
              </div>
              <button 
                onClick={closeModal}
                className="ml-auto p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <LuX className="size-5" />
              </button>
            </div>

            {/* Content Area */}
            <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
              {/* Reference */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Receipt / Ref #</label>
                <div className="relative">
                  <LuClipboardList className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Enter Reference Number..."
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Payments</h4>
                <div className="space-y-2">
                  {financeItems.map((item) => {
                    const isSelected = selectedItems[item.id]?.checked;
                    return (
                      <div 
                        key={item.id} 
                        onClick={() => handleCheckboxChange(item.id, !isSelected)}
                        className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 cursor-pointer ${isSelected ? 'border-primary bg-primary/5' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`size-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-primary border-primary text-white' : 'border-slate-200'}`}>
                            {isSelected && <LuCircleCheck className="size-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 truncate">{item.title}</p>
                            <p className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-tight">₱{(item.amount || 0).toLocaleString()}</p>
                          </div>
                        </div>

                        {isSelected && (
                          <div onClick={(e) => e.stopPropagation()} className="relative animate-in slide-in-from-right-2 duration-200">
                             <input 
                              type="number"
                              placeholder="0"
                              value={selectedItems[item.id]?.amount || ""}
                              onChange={(e) => handleAmountChange(item.id, e.target.value)}
                              className="w-24 h-10 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-primary"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Simple Footer */}
            <div className="p-8 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Grand Total</p>
                <p className="text-2xl font-black text-slate-900 leading-none">₱{grandTotal.toLocaleString()}</p>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <Button onClick={closeModal} variant="outline" className="flex-1 sm:flex-none h-12 px-6 rounded-xl border-slate-200 text-slate-600 font-bold whitespace-nowrap">Discard</Button>
                <Button 
                  onClick={recordPayments}
                  disabled={isRecording || grandTotal === 0 || !receiptNumber}
                  className="flex-1 sm:flex-none h-12 px-8 rounded-xl font-bold bg-primary text-white shadow-xl shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 whitespace-nowrap"
                >
                  {isRecording ? "Saving..." : "Record Payments"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Background/Scanner UI */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded-full">
            <LuCircleDollarSign className="size-3" />
            <span className="text-[9px] font-black uppercase tracking-widest leading-none mt-0.5">Terminal</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-1">Scan to Pay</h1>
          <p className="text-slate-500 font-medium">Record organizational payments instantly via QR.</p>
        </div>
        <Button variant="outline" className="h-11 rounded-xl font-bold bg-white text-slate-600 border-slate-200">
          <LuHistory className="size-4 mr-2" /> Recent
        </Button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <LuTerminal className="size-4" />
              Machine Status
            </h3>
            <p className="text-sm font-bold text-slate-400 leading-relaxed italic">"Scanner ready. Record receipt and items after scan."</p>
          </div>

          {!isScanning ? (
            <Button onClick={startScanner} className="w-full h-14 rounded-2xl font-black gradient-primary shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-lg">
              <LuScan className="size-5 mr-3" /> Start Scanner
            </Button>
          ) : (
            <Button onClick={stopScanner} variant="outline" className="w-full h-14 rounded-2xl font-black text-rose-500 bg-rose-50 border-rose-200 hover:bg-rose-100 transition-all text-lg">
              <LuX className="size-5 mr-3" /> Stop
            </Button>
          )}

          <div className={`p-5 rounded-2xl border flex items-center gap-4 transition-all ${isScanning ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
            <div className={`size-3 rounded-full ${isScanning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest leading-none ${isScanning ? 'text-emerald-700' : 'text-slate-500'}`}>
                {isScanning ? 'Optical ID Online' : 'Sensor Offline'}
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 flex justify-center lg:justify-end">
          <div className="relative aspect-square w-full max-w-lg rounded-[2.5rem] bg-slate-950 overflow-hidden shadow-inner border-8 border-slate-50 group mx-auto lg:mx-0">
            <div id="reader" className="size-full [&>video]:object-cover [&>canvas]:object-cover"></div>
            {!isScanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md">
                <LuScan className="size-12 text-white/10 animate-pulse" />
                <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.4em] mt-4 tracking-widest">Scanner Standby</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
