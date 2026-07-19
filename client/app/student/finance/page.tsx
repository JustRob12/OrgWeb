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
   LuDownload,
   LuLoader
} from "react-icons/lu";
import { Button } from "@/app/Components/ui/button";
import { createClient } from "@/utils/supabase/client";

export default function StudentFinancePage() {
   const [loading, setLoading] = useState(true);
   const [outstandingBalance, setOutstandingBalance] = useState(0);
   const [transactions, setTransactions] = useState<any[]>([]);
   const [recurringDues, setRecurringDues] = useState<any[]>([]);

   const supabase = createClient();

   useEffect(() => {
      const getFinanceData = async () => {
         try {
            const localUser = localStorage.getItem("acetrack_user");
            if (!localUser) return;

            const parsed = JSON.parse(localUser);
            const email = parsed.email || parsed.username;
            if (!email) return;

            const { data: userData } = await supabase
               .from("users")
               .select("id, student_id")
               .eq("email", email)
               .single();

            if (!userData) return;

            // 1. Fetch all active finance items
            const { data: items, error: itemsError } = await supabase
               .from("finance_items")
               .select("*")
               .order("deadline", { ascending: true });

            if (itemsError) {
               console.error("Error loading finance items:", itemsError);
            }

            // 2. Fetch student's transactions from the flat view
            const { data: txs, error: txsError } = await supabase
               .from("finance_audit_view")
               .select("*")
               .eq("student_id", userData.student_id)
               .order("transaction_date", { ascending: false });

            if (txsError) {
               console.error("Error loading transactions:", txsError);
            }

            // Map transactions for the list
            const mappedTxs = (txs || []).map((t: any) => {
               const tDate = new Date(t.transaction_date);
               return {
                  title: t.item_title || "Organization Payment",
                  amount: `₱${(t.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                  date: tDate.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
                  status: "Paid",
                  type: "Fee"
               };
            });
            setTransactions(mappedTxs);

            // Calculate outstanding balance: sum of active items minus transactions
            const paidItemIds = new Set((txs || []).map((t: any) => t.finance_id));
            
            let outstandingSum = 0;
            const mappedDues = (items || []).map((item) => {
               const isPaid = paidItemIds.has(item.id);
               if (!isPaid) {
                  outstandingSum += parseFloat(item.amount || 0);
               }
               return {
                  title: item.title,
                  deadline: item.deadline ? `Due: ${new Date(item.deadline).toLocaleDateString()}` : "No deadline",
                  amount: `₱${(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                  isPaid
               };
            });

            setOutstandingBalance(outstandingSum);
            setRecurringDues(mappedDues);

         } catch (err) {
            console.error(err);
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
            <Button className="h-12 px-8 rounded-2xl font-black bg-rose-500 hover:bg-rose-600 text-white shadow-xl shadow-rose-200 transition-all w-full sm:w-auto">
               Pay Balance <LuArrowUpRight className="size-4 ml-2" />
            </Button>
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
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">{t.status}</span>
                                 </div>
                                 <button className="p-3 rounded-2xl bg-slate-50 text-slate-400 hover:bg-white hover:text-rose-500 hover:shadow-lg transition-all">
                                    <LuDownload className="size-5" />
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
                              <div className={`p-3 bg-white rounded-2xl shadow-sm ${due.isPaid ? 'text-emerald-500' : 'text-amber-500'}`}>
                                 {due.isPaid ? <LuCircleCheck className="size-5" /> : <LuCircleX className="size-5" />}
                              </div>
                              <div>
                                 <p className="text-sm font-black text-slate-900">{due.title}</p>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{due.deadline}</p>
                                 <p className="text-xs font-bold text-slate-500 mt-2">{due.amount}</p>
                              </div>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            </div>
         </div>
      </div>
   );
}
