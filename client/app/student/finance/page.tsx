"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  LuWallet,
  LuCircleCheck,
  LuCircleAlert,
  LuHistory,
  LuSparkles,
  LuCalendar,
  LuEye,
  LuLoader,
  LuClock,
  LuPhilippinePeso,
  LuReceipt,
  LuCheck,
  LuCopy,
  LuShieldCheck,
  LuArrowRight,
  LuLayers,
  LuInbox,
  LuTrendingUp,
} from "react-icons/lu";
import { Button } from "@/app/Components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { Modal } from "@/app/Components/ui/modal";
import { toast } from "sonner";

interface TransactionItem {
  id: string;
  title: string;
  amount: number;
  date: string;
  status: string;
  type: string;
  receipt_number: string | null;
  rawDate: string;
}

interface DueItem {
  id: string;
  title: string;
  deadline: string;
  totalAmount: number;
  paidAmount: number;
  remaining: number;
  status: "Paid" | "Partial" | "Unpaid";
  percentPaid: number;
}

export default function StudentFinancePage() {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [totalPaidAmount, setTotalPaidAmount] = useState(0);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [recurringDues, setRecurringDues] = useState<DueItem[]>([]);
  const [membershipStatus, setMembershipStatus] = useState<string>("Not Paid");
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      let email = "";

      // 1. Check Supabase Auth session first
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser?.email) {
        email = authUser.email;
      } else {
        // 2. Check localStorage fallback
        const localUser = localStorage.getItem("acetrack_user");
        if (localUser) {
          try {
            const parsed = JSON.parse(localUser);
            email = parsed.email || parsed.username || "";
          } catch (e) {
            console.error("Session parse error:", e);
          }
        }
      }

      if (!email) {
        setLoading(false);
        return;
      }

      // 3. Fetch user record
      const { data: userRecord, error: userError } = await supabase
        .from("users")
        .select("id, student_id, first_name, last_name, course, section, year")
        .eq("email", email)
        .maybeSingle();

      if (userError || !userRecord) {
        setLoading(false);
        return;
      }
      setUserData(userRecord);

      // 4. Fetch all active finance items
      const { data: items } = await supabase
        .from("finance_items")
        .select("*")
        .order("created_at", { ascending: true });

      const safeItems = items || [];
      const itemsMap = new Map<string, any>(safeItems.map((i) => [i.id, i]));

      // 5. Fetch student's real transactions from finance_transactions table
      const { data: txsData } = await supabase
        .from("finance_transactions")
        .select("*")
        .eq("user_id", userRecord.id)
        .order("transaction_date", { ascending: false });

      // 6. Fetch membership status
      const { data: membershipData } = await supabase
        .from("memberships")
        .select("*")
        .eq("user_id", userRecord.id)
        .maybeSingle();

      if (membershipData?.status) {
        setMembershipStatus(membershipData.status);
      }

      // 7. Deduplicate and format transactions strictly
      let mappedTxs: TransactionItem[] = [];

      if (txsData && txsData.length > 0) {
        // Deduplicate by transaction id
        const seenIds = new Set<string>();
        mappedTxs = txsData
          .filter((t) => {
            if (!t.id || seenIds.has(t.id)) return false;
            seenIds.add(t.id);
            return true;
          })
          .map((t) => {
            const item = itemsMap.get(t.finance_id);
            const itemTitle = item?.title || "Organization Fee";
            const amt = parseFloat(t.amount) || 0;
            const tDate = t.transaction_date ? new Date(t.transaction_date) : new Date();

            return {
              id: t.id,
              title: itemTitle,
              amount: amt,
              date: tDate.toLocaleDateString("en-US", {
                month: "short",
                day: "2-digit",
                year: "numeric",
              }),
              status: "Paid",
              type: itemTitle.toLowerCase().includes("membership") ? "Membership" : "Fee",
              receipt_number: t.receipt_number || null,
              rawDate: t.transaction_date || tDate.toISOString(),
            };
          });
      } else if (membershipData && parseFloat(membershipData.payment) > 0) {
        // Legacy fallback: Only if no finance_transactions exist at all but membership has payment recorded
        mappedTxs = [
          {
            id: membershipData.id || "mem-legacy",
            title: "Membership Fee",
            amount: parseFloat(membershipData.payment) || 0,
            date: new Date(membershipData.created_at || Date.now()).toLocaleDateString("en-US", {
              month: "short",
              day: "2-digit",
              year: "numeric",
            }),
            status: membershipData.status || "Paid",
            type: "Membership",
            receipt_number: membershipData.receipt || null,
            rawDate: membershipData.created_at || new Date().toISOString(),
          },
        ];
      }

      // Calculate total paid across all transactions
      const totalPaidSum = mappedTxs.reduce((sum, tx) => sum + tx.amount, 0);
      setTotalPaidAmount(totalPaidSum);
      setTransactions(mappedTxs);

      // 8. Calculate total paid per finance item to compute real outstanding dues
      const paidPerItemMap: Record<string, number> = {};
      mappedTxs.forEach((t) => {
        // Match by fee title if finance_id is missing or direct id
        safeItems.forEach((item) => {
          if (item.title.toLowerCase().trim() === t.title.toLowerCase().trim()) {
            paidPerItemMap[item.id] = (paidPerItemMap[item.id] || 0) + t.amount;
          }
        });
      });

      let totalOutstanding = 0;
      const duesList: DueItem[] = safeItems.map((item) => {
        const targetAmount = parseFloat(item.amount) || 0;
        const paidSoFar = paidPerItemMap[item.id] || 0;
        const remaining = Math.max(0, targetAmount - paidSoFar);

        totalOutstanding += remaining;

        let status: "Paid" | "Partial" | "Unpaid" = "Unpaid";
        if (paidSoFar >= targetAmount && targetAmount > 0) {
          status = "Paid";
        } else if (paidSoFar > 0) {
          status = "Partial";
        }

        const percentPaid = targetAmount > 0 ? Math.min(100, Math.round((paidSoFar / targetAmount) * 100)) : 100;

        return {
          id: item.id,
          title: item.title,
          deadline: item.deadline
            ? `Due ${new Date(item.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
            : "No fixed deadline",
          totalAmount: targetAmount,
          paidAmount: paidSoFar,
          remaining,
          status,
          percentPaid,
        };
      });

      setOutstandingBalance(totalOutstanding);
      setRecurringDues(duesList);
    } catch (err) {
      console.error("Finance data loading error:", err);
      toast.error("Failed to load financial records.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyReceipt = (text: string) => {
    if (!navigator?.clipboard) return;
    navigator.clipboard.writeText(text);
    setCopiedReceipt(true);
    toast.success("Receipt number copied!");
    setTimeout(() => setCopiedReceipt(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <LuLoader className="size-10 animate-spin text-primary" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
          Synchronizing Financial Ledger...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            Financial Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium tracking-tight mt-0.5">
            Monitor your organization obligations, verified receipts, and payment history.
          </p>
        </div>

        {/* Membership Status Badge */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="size-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Membership:
          </span>
          <span
            className={`text-xs font-black uppercase tracking-wider ${
              membershipStatus.toLowerCase().includes("fully") || membershipStatus.toLowerCase() === "paid"
                ? "text-emerald-600"
                : membershipStatus.toLowerCase().includes("half")
                ? "text-blue-600"
                : membershipStatus.toLowerCase().includes("partial")
                ? "text-amber-600"
                : "text-slate-700"
            }`}
          >
            {membershipStatus}
          </span>
        </div>
      </div>

      {/* Hero Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Card 1: Outstanding Balance */}
        <div className="md:col-span-2 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-8 relative overflow-hidden shadow-xl border border-slate-800">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <LuPhilippinePeso className="size-44 text-white" />
          </div>

          <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 backdrop-blur-md">
                <LuWallet className="size-3.5 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                  Total Outstanding Balance
                </span>
              </div>

              {outstandingBalance === 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-black uppercase tracking-wider">
                  <LuCircleCheck className="size-3.5" /> All Dues Settled
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-wider">
                  <LuCircleAlert className="size-3.5" /> Action Required
                </span>
              )}
            </div>

            <div>
              <p className="text-3xl sm:text-5xl font-black text-white tracking-tighter">
                <span className="text-primary mr-1 text-2xl sm:text-4xl">₱</span>
                {outstandingBalance.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
                {outstandingBalance === 0
                  ? "You have zero pending dues for this term. Great job!"
                  : "Please visit the ACES Finance Officer to settle your pending balances."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Total Payments Made
                </span>
                <span className="text-sm sm:text-base font-black text-emerald-400">
                  ₱{totalPaidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Active Obligations
                </span>
                <span className="text-sm sm:text-base font-black text-slate-200">
                  {recurringDues.length} Organization Fees
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Student Clearance Overview */}
        <div className="bg-white rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Clearance Status
            </span>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              {userData?.first_name || "Student"} {userData?.last_name || ""}
            </h3>
            <p className="text-xs font-bold text-slate-500 font-mono">
              {userData?.student_id || "STUDENT-ID"} {userData?.course ? `• ${userData.course}` : ""}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-orange-950">
              <span>Verified Receipts:</span>
              <span className="font-black text-primary">{transactions.length}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-orange-950">
              <span>Financial Standing:</span>
              <span className="font-black text-emerald-600">
                {outstandingBalance === 0 ? "Eligible" : "Pending Dues"}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
            💡 Keep your digital receipts handy when applying for semester clearance or event admission.
          </p>
        </div>
      </div>

      {/* Main Content: 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Left Column: Transaction History */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between ml-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-orange-500/10 text-primary">
                <LuHistory className="size-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Verified Payment Receipts
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {transactions.length} records
            </span>
          </div>

          <div className="bg-white rounded-3xl sm:rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm divide-y divide-slate-100">
            {transactions.length === 0 ? (
              <div className="py-16 px-6 text-center space-y-3">
                <div className="size-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 mx-auto">
                  <LuInbox className="size-7" />
                </div>
                <p className="text-sm font-black text-slate-800">No payment receipts found</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
                  When you make a payment at the ACES booth, your verified receipt will show up here instantly.
                </p>
              </div>
            ) : (
              transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 hover:bg-slate-50/60 transition-colors group"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className="size-11 rounded-2xl bg-orange-500/10 text-primary border border-orange-200/60 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 shadow-xs">
                      <LuReceipt className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 text-sm sm:text-base leading-tight truncate">
                        {tx.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                          <LuCalendar className="size-3" /> {tx.date}
                        </span>
                        {tx.receipt_number && (
                          <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                            #{tx.receipt_number}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <p className="text-base font-black text-slate-900 tracking-tight">
                        ₱{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-600 tracking-wider">
                        <LuCircleCheck className="size-3" /> Verified
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTx(tx);
                        setIsModalOpen(true);
                      }}
                      className="h-9 px-3 rounded-xl border-slate-200 hover:border-orange-300 hover:bg-orange-50 hover:text-primary text-slate-600 font-bold text-xs cursor-pointer shadow-xs"
                      title="View Digital Receipt"
                    >
                      <LuEye className="size-3.5 mr-1" /> Receipt
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Active Fees & Dues Breakdown */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between ml-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-orange-500/10 text-primary">
                <LuLayers className="size-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Fees &amp; Obligations
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {recurringDues.length} items
            </span>
          </div>

          <div className="bg-white rounded-3xl sm:rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm divide-y divide-slate-100">
            {recurringDues.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-medium px-4">
                No active fees or dues listed.
              </div>
            ) : (
              recurringDues.map((due) => (
                <div key={due.id} className="p-4 sm:p-5 space-y-2.5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-black text-slate-900 leading-snug">
                        {due.title}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                        {due.deadline}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm sm:text-base font-black text-slate-900">
                        ₱{due.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <div className="mt-0.5">
                        <span
                          className={`inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            due.status === "Paid"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                              : due.status === "Partial"
                              ? "bg-amber-50 text-amber-700 border border-amber-200/80"
                              : "bg-rose-50 text-rose-700 border border-rose-200/80"
                          }`}
                        >
                          {due.status === "Paid"
                            ? "Paid"
                            : due.status === "Partial"
                            ? `Bal: ₱${due.remaining.toLocaleString()}`
                            : "Unpaid"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          due.status === "Paid"
                            ? "bg-emerald-500"
                            : due.status === "Partial"
                            ? "bg-amber-500"
                            : "bg-rose-400"
                        }`}
                        style={{ width: `${due.percentPaid}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                      <span>Paid: ₱{due.paidAmount.toLocaleString()}</span>
                      <span>{due.percentPaid}% Settled</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Digital Receipt Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTx(null);
        }}
        title="Official Digital Receipt"
        className="max-w-md"
      >
        {selectedTx && (
          <div className="space-y-5 text-left">
            {/* Receipt Top Header */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-orange-50 to-white border border-orange-200/80 text-center space-y-2">
              <div className="size-12 rounded-2xl bg-primary text-white flex items-center justify-center mx-auto shadow-md shadow-primary/20">
                <LuReceipt className="size-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-orange-950 uppercase tracking-widest">
                  Official ACES Financial Receipt
                </p>
                <h3 className="text-lg font-black text-slate-900 tracking-tight mt-0.5">
                  {selectedTx.title}
                </h3>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black uppercase tracking-wider">
                <LuShieldCheck className="size-3.5" /> Verified Transaction
              </div>
            </div>

            {/* Receipt Metadata Breakdown */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                <span className="font-bold text-slate-500">Student:</span>
                <span className="font-black text-slate-900">
                  {userData?.first_name} {userData?.last_name} ({userData?.student_id})
                </span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                <span className="font-bold text-slate-500">Receipt / Ref #:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    {selectedTx.receipt_number || "NO_REF"}
                  </span>
                  {selectedTx.receipt_number && (
                    <button
                      onClick={() => handleCopyReceipt(selectedTx.receipt_number!)}
                      className="p-1 text-slate-400 hover:text-primary transition-colors cursor-pointer"
                      title="Copy receipt number"
                    >
                      {copiedReceipt ? (
                        <LuCheck className="size-3.5 text-emerald-600" />
                      ) : (
                        <LuCopy className="size-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                <span className="font-bold text-slate-500">Payment Date:</span>
                <span className="font-bold text-slate-800">{selectedTx.date}</span>
              </div>

              <div className="flex justify-between items-center pt-1">
                <span className="font-black text-slate-700 text-sm">Total Paid:</span>
                <span className="font-black text-emerald-600 text-xl tracking-tight">
                  ₱{selectedTx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <Button
              onClick={() => {
                setIsModalOpen(false);
                setSelectedTx(null);
              }}
              className="w-full h-11 rounded-xl font-bold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
            >
              Close Receipt
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
