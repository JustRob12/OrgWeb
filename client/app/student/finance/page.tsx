"use client";

import React from "react";
import {
   LuWallet,
   LuCircleCheck,
   LuHistory,
   LuArrowUpRight,
   LuSparkles,
   LuCalendar,
   LuDownload,
   LuPlus
} from "react-icons/lu";
import { Button } from "@/app/Components/ui/button";

export default function StudentFinancePage() {
   const transactions = [
      { title: "Membership Fee (Annual)", amount: "₱500.00", date: "Mar 12, 2026", status: "Paid", type: "Fee" },
      { title: "Organization T-Shirt", amount: "₱350.00", date: "Mar 20, 2026", status: "Paid", type: "Merch" },
      { title: "Local Assembly Donation", amount: "₱100.00", date: "Apr 01, 2026", status: "Pending", type: "Donation" },
   ];

   return (
      <div className="space-y-10">
         {/* Finance Hero */}
         <div className="relative overflow-hidden bg-rose-500 rounded-[3rem] p-10 md:p-14 text-white shadow-2xl shadow-rose-200/50 group">
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
               <div className="space-y-4 max-w-lg">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-[10px] font-black uppercase tracking-widest text-rose-100">
                     <LuSparkles className="size-3" /> Financial Stability
                  </div>
                  <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none group-hover:scale-[1.01] transition-transform">My <span className="text-rose-100/80">Wallet</span></h1>
                  <p className="text-rose-50 font-medium text-lg leading-relaxed">
                     Track your membership dues, event fees, and merchandising purchases in one secure place.
                  </p>
               </div>

               <div className="bg-white rounded-[2.5rem] p-10 text-slate-900 shadow-2xl shadow-rose-900/10 min-w-[280px] group-hover:-translate-y-2 transition-transform duration-500">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Outstanding</p>
                  <h2 className="text-4xl font-black tracking-tight mb-6">₱100.00</h2>
                  <Button className="w-full h-12 rounded-2xl font-black bg-rose-500 text-white hover:bg-rose-600 shadow-xl shadow-rose-200 transition-all">
                     Pay Balance <LuArrowUpRight className="size-4 ml-2" />
                  </Button>
               </div>
            </div>

            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-rose-400/20 to-transparent pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 size-64 bg-rose-600/30 rounded-full blur-[100px]" />
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Transaction History */}
            <div className="lg:col-span-2 space-y-6">
               <div className="flex items-center justify-between ml-2">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                     <LuHistory className="size-5 text-slate-300" /> Transaction History
                  </h2>
                  <Button variant="ghost" className="text-xs font-black text-rose-500 hover:bg-rose-50 rounded-xl">View Full Statement</Button>
               </div>

               <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
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
                                 <span className={`text-[10px] font-black uppercase tracking-widest ${t.status === 'Paid' ? 'text-emerald-500' : 'text-amber-500'}`}>{t.status}</span>
                              </div>
                              <button className="p-3 rounded-2xl bg-slate-50 text-slate-400 hover:bg-white hover:text-rose-500 hover:shadow-lg transition-all">
                                 <LuDownload className="size-5" />
                              </button>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>

            {/* Fees Information */}
            <div className="space-y-6">
               <h2 className="text-xl font-black text-slate-900 tracking-tight ml-2">Recurring Dues</h2>
               <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 space-y-8 shadow-sm">
                  <div className="space-y-6">
                     <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 flex items-start gap-4 ring-1 ring-transparent hover:ring-rose-500/20 transition-all cursor-default">
                        <div className="p-3 bg-white rounded-2xl shadow-sm text-rose-500">
                           <LuCircleCheck className="size-5" />
                        </div>
                        <div>
                           <p className="text-sm font-black text-slate-900">Annual Membership</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Due EVERY MARCH</p>
                           <p className="text-xs font-bold text-rose-600 mt-2">Next: Mar 2027</p>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Need Assistance?</p>
                        <Button variant="outline" className="w-full h-12 rounded-2xl font-black bg-white text-slate-600 border-slate-200 hover:bg-slate-50 transition-all">
                           <LuPlus className="size-4 mr-2" /> Request Waiver
                        </Button>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}
