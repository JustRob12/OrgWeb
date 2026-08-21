"use client";

import React, { useEffect, useState } from "react";
import {
   LuWallet,
   LuCircleCheck,
   LuCircleX,
   LuHistory,
   LuArrowUpRight,
   LuSparkles,
   LuCalendar,
   LuEye,
   LuLoader,
   LuClock
} from "react-icons/lu";
import { Button } from "@/app/Components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { Modal } from "@/app/Components/ui/modal";

export default function StudentFinancePage() {
   const [loading, setLoading] = useState(true);
   const [outstandingBalance, setOutstandingBalance] = useState(0);
   const [transactions, setTransactions] = useState<any[]>([]);
   const [recurringDues, setRecurringDues] = useState<any[]>([]);
   const [selectedTx, setSelectedTx] = useState<any | null>(null);
   const [isModalOpen, setIsModalOpen] = useState(false);

   const supabase = createClient();

   useEffect(() => {
      const getFinanceData = async () => {
         try {
            let email = "";

            // 1. Check Supabase Auth session first
            const { data: { user: authUser } } = await supabase.auth.getUser();
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
            const { data: userData, error: userError } = await supabase
               .from("users")
               .select("id, student_id")
               .eq("email", email)
               .maybeSingle();

            if (userError || !userData) {
               setLoading(false);
               return;
            }

            // 4. Fetch all active finance items
            const { data: items } = await supabase
               .from("finance_items")
               .select("*")
               .order("deadline", { ascending: true });

            const safeItems = items || [];
            const itemsMap: Record<string, string> = {};
            safeItems.forEach((item: any) => {
               if (item.id) {
                  itemsMap[item.id] = item.title;
               }
            });

            // 5. Fetch student's transactions directly by user_id
            let txsList: any[] = [];
            const { data: txsData, error: txsError } = await supabase
               .from("finance_transactions")
               .select("*")
               .eq("user_id", userData.id)
               .order("transaction_date", { ascending: false });

            if (!txsError && txsData && txsData.length > 0) {
               txsList = txsData.map((t: any) => ({
                  ...t,
                  item_title: itemsMap[t.finance_id] || "Organization Payment",
               }));
            } else if (userData.student_id) {
               // Fallback query via audit view or student_id if needed
               const { data: viewTxs } = await supabase
                  .from("finance_audit_view")
                  .select("*")
                  .eq("student_id", userData.student_id)
                  .order("transaction_date", { ascending: false });

               if (viewTxs && viewTxs.length > 0) {
                  txsList = viewTxs;
               }
            }

            // 6. Fetch membership details
            const { data: membershipData } = await supabase
               .from("memberships")
               .select("*")
               .eq("user_id", userData.id)
               .maybeSingle();

            // Map transactions for the UI list
            const mappedTxs = txsList.map((t: any) => {
               const tDate = t.transaction_date ? new Date(t.transaction_date) : new Date();
               return {
                  id: t.id,
                  title: t.item_title || itemsMap[t.finance_id] || "Organization Payment",
                  amount: `₱${(parseFloat(t.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                  date: tDate.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
                  status: "Paid",
                  type: "Fee",
                  receipt_number: t.receipt_number || "N/A",
               };
            });

            const membershipTx = membershipData && membershipData.payment > 0 ? [{
               id: membershipData.id,
               title: "Membership Fee",
               amount: `₱${(parseFloat(membershipData.payment) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
               date: new Date(membershipData.created_at || Date.now()).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
               status: membershipData.status || "Paid",
               type: "Membership",
               receipt_number: membershipData.receipt || "N/A"
            }] : [];

            setTransactions([...membershipTx, ...mappedTxs]);

            // 7. Calculate outstanding balance: aggregate payments per finance item and compute remaining balances
            const paidAmountsMap: Record<string, number> = {};
            txsList.forEach((t: any) => {
               if (t.finance_id) {
                  paidAmountsMap[t.finance_id] = (paidAmountsMap[t.finance_id] || 0) + (parseFloat(t.amount) || 0);
               }
            });

            let outstandingSum = 0;
            const mappedDues = safeItems.map((item: any) => {
               const totalPaid = paidAmountsMap[item.id] || 0;
               const totalAmount = parseFloat(item.amount || 0);
               const remaining = Math.max(0, totalAmount - totalPaid);

               outstandingSum += remaining;

               let status: "Paid" | "Partial" | "Unpaid" = "Unpaid";
               if (totalPaid > 0) {
                  if (remaining === 0) {
                     status = "Paid";
                  } else {
                     status = "Partial";
                  }
               }

               return {
                  id: item.id,
                  title: item.title,
                  deadline: item.deadline ? `Due: ${new Date(item.deadline).toLocaleDateString()}` : "No deadline",
                  totalAmount,
                  paidAmount: totalPaid,
                  remaining,
                  status
               };
            });

            setOutstandingBalance(outstandingSum);
            setRecurringDues(mappedDues);

         } catch (err) {
            console.error("Finance data loading error:", err);
         } finally {
            setLoading(false);
         }
      };

      getFinanceData();
   }, []);

   if (loading) {
      return (
         <div className="flex flex-col items-center justify-center py-40 gap-4">
            <LuLoader className="size-10 animate-spin text-rose-500" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Synchronizing ledger...</p>
         </div>
      );
   }

   return (
      <div className="space-y-10">
         {/* Simple Finance Header */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
               <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">My Wallet</h1>
               <p className="text-slate-500 font-medium tracking-tight">Track your membership dues, event fees, and transactions.</p>
            </div>
         </div>

         {/* Total Outstanding Card (Horizontal banner style, simple) */}
         <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-sm">
            <div className="space-y-1">
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Outstanding Balance</p>
               <h2 className="text-3xl font-black tracking-tight text-slate-950">
                  ₱{outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
               </h2>
            </div>

         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Transaction History */}
            <div className="order-2 lg:order-1 lg:col-span-2 space-y-6">
               <div className="flex items-center justify-between ml-2">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                     <LuHistory className="size-5 text-slate-300" /> Transaction History
                  </h2>
                  <Button variant="ghost" className="text-xs font-black text-rose-500 hover:bg-rose-50 rounded-xl">View Full Statement</Button>
               </div>

               <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                  {transactions.length === 0 ? (
                     <div className="p-12 text-center text-slate-400 font-medium">
                        No transactions recorded yet.
                     </div>
                  ) : (
                     <div className="divide-y divide-slate-50">
                        {transactions.map((t, i) => (
                           <div key={i} className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50/50 transition-colors group">
                              <div className="flex items-center gap-6">
                                 <div className="size-14 rounded-[1.25rem] bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 shadow-inner group-hover:bg-white group-hover:text-rose-500 group-hover:shadow-lg transition-all group-hover:scale-110">
                                    <LuWallet className="size-6" />
                                 </div>
                                 <div>
                                    <p className="font-black text-slate-900 tracking-tight text-lg mb-1 leading-none">{t.title}</p>
                                    <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-widest"><LuCalendar className="size-3" /> {t.date}</p>
                                 </div>
                              </div>
                              <div className="flex items-center justify-between w-full md:w-auto md:justify-end gap-8">
                                 <div className="text-right">
                                    <p className="text-lg font-black text-slate-900 tracking-tight">{t.amount}</p>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${t.status === 'Fully Paid' || t.status === 'Paid' ? 'text-emerald-500' :
                                       t.status === 'Half Semester Paid' ? 'text-blue-500' :
                                          t.status === 'Partial' ? 'text-amber-500' : 'text-rose-500'
                                       }`}>{t.status}</span>
                                 </div>
                                 <button
                                    onClick={() => {
                                       setSelectedTx(t);
                                       setIsModalOpen(true);
                                    }}
                                    className="p-3 rounded-2xl bg-slate-50 text-slate-400 hover:bg-white hover:text-rose-500 hover:shadow-lg transition-all cursor-pointer"
                                 >
                                    <LuEye className="size-5" />
                                 </button>
                              </div>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            </div>

            {/* Fees Information */}
            <div className="order-1 lg:order-2 space-y-6">
               <h2 className="text-xl font-black text-slate-900 tracking-tight ml-2">All Fees & Dues</h2>
               <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 space-y-8 shadow-sm">
                  {recurringDues.length === 0 ? (
                     <div className="text-center text-slate-400 font-medium py-8">
                        No dues listed.
                     </div>
                  ) : (
                     <div className="space-y-6">
                        {recurringDues.map((due, idx) => (
                           <div key={idx} className="p-6 rounded-3xl bg-slate-50 border border-slate-100 flex items-start gap-4 ring-1 ring-transparent hover:ring-rose-500/20 transition-all cursor-default">
                              <div className={`p-3 bg-white rounded-2xl shadow-sm ${due.status === 'Paid' ? 'text-emerald-500' :
                                 due.status === 'Partial' ? 'text-amber-500' : 'text-rose-500'
                                 }`}>
                                 {due.status === 'Paid' ? <LuCircleCheck className="size-5" /> :
                                    due.status === 'Partial' ? <LuClock className="size-5" /> :
                                       <LuCircleX className="size-5" />}
                              </div>
                              <div className="flex-1">
                                 <p className="text-sm font-black text-slate-900">{due.title}</p>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{due.deadline}</p>
                                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100/50">
                                    <div>
                                       <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Total Fee</span>
                                       <span className="text-xs font-bold text-slate-600">₱{due.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    {due.status === 'Partial' && (
                                       <>
                                          <div>
                                             <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Paid</span>
                                             <span className="text-xs font-bold text-emerald-600">₱{due.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                          </div>
                                          <div>
                                             <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Remaining</span>
                                             <span className="text-xs font-bold text-amber-500">₱{due.remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                          </div>
                                       </>
                                    )}
                                    {due.status === 'Paid' && (
                                       <div>
                                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Status</span>
                                          <span className="text-xs font-bold text-emerald-600">Fully Paid</span>
                                       </div>
                                    )}
                                    {due.status === 'Unpaid' && (
                                       <div>
                                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Status</span>
                                          <span className="text-xs font-bold text-rose-500">Unpaid</span>
                                       </div>
                                    )}
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            </div>
         </div>

         {/* Transaction Details Modal */}
         <Modal
            isOpen={isModalOpen}
            onClose={() => {
               setIsModalOpen(false);
               setSelectedTx(null);
            }}
            title="Transaction Details"
            className="max-w-md"
         >
            {selectedTx && (
               <div className="space-y-6">
                  {/* Visual Header */}
                  <div className="text-center pb-6 border-b border-slate-100">
                     <div className="mx-auto size-16 rounded-[1.5rem] bg-rose-50 flex items-center justify-center text-rose-500 mb-3 shadow-inner">
                        <LuWallet className="size-8" />
                     </div>
                     <h3 className="text-xl font-black text-slate-950 tracking-tight">{selectedTx.title}</h3>
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{selectedTx.type === "Membership" ? "Membership Payment" : "Organization Fee"}</p>
                  </div>

                  {/* Fields */}
                  <div className="space-y-4">
                     <div className="flex justify-between items-center py-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date</span>
                        <span className="text-sm font-bold text-slate-900">{selectedTx.date}</span>
                     </div>
                     <div className="flex justify-between items-center py-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</span>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${selectedTx.status === 'Fully Paid' || selectedTx.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                           selectedTx.status === 'Half Semester Paid' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                              selectedTx.status === 'Partial' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                 'bg-rose-50 text-rose-600 border-rose-100'
                           }`}>
                           {selectedTx.status}
                        </span>
                     </div>
                     <div className="flex justify-between items-center py-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Receipt No.</span>
                        <span className="text-sm font-black text-primary bg-primary/5 px-3 py-1 rounded-xl">{selectedTx.receipt_number}</span>
                     </div>
                     <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Amount Paid</span>
                        <span className="text-2xl font-black text-slate-950">{selectedTx.amount}</span>
                     </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 flex justify-end">
                     <Button
                        onClick={() => {
                           setIsModalOpen(false);
                           setSelectedTx(null);
                        }}
                        className="w-full h-11 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800"
                     >
                        Close
                     </Button>
                  </div>
               </div>
            )}
         </Modal>
      </div>
   );
}
