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
  LuDownload,
  LuClipboardList,
  LuCircleDollarSign,
  LuHistory
} from "react-icons/lu";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/app/Components/ui/button";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const ITEMS_PER_PAGE = 10;

export default function FinancialRecordsPage() {
  const [financeItems, setFinanceItems] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  
  const supabase = createClient();

  useEffect(() => {
    fetchFinanceItems();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [selectedItemId, currentPage, searchQuery]);

  const fetchFinanceItems = async () => {
    const { data, error } = await supabase
      .from("finance_items")
      .select("*")
      .order("title", { ascending: true });
    
    if (!error && data) {
      setFinanceItems(data);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    // Use the flat Database View for high-performance searching
    let query = supabase
      .from("finance_audit_view")
      .select("*", { count: "exact" })
      .order("transaction_date", { ascending: false });

    if (selectedItemId !== "all") {
      query = query.eq("finance_id", selectedItemId);
    }

    if (searchQuery) {
      // Unified OR search across all flat view columns
      query = query.or(`receipt_number.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,student_id.ilike.%${searchQuery}%`);
    }

    const { data, error, count } = await query.range(from, to);

    if (!error && data) {
      setTransactions(data);
      setTotalRecords(count || 0);
    }

    // Calculate total sum using the same filter
    let sumQuery = supabase.from("finance_audit_view").select("amount");
    if (selectedItemId !== "all") sumQuery = sumQuery.eq("finance_id", selectedItemId);
    if (searchQuery) sumQuery = sumQuery.or(`receipt_number.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,student_id.ilike.%${searchQuery}%`);

    const { data: sumData } = await sumQuery;
    if (sumData) {
      const total = sumData.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      setTotalRevenue(total);
    }

    setLoading(false);
  };

  const handleExport = async () => {
    const eventName = selectedItemId === "all" ? "All_Transactions" : financeItems.find(i => i.id === selectedItemId)?.title || "Finance";
    
    let query = supabase.from("finance_audit_view").select("*").order("transaction_date", { ascending: false });
    if (selectedItemId !== "all") query = query.eq("finance_id", selectedItemId);
    if (searchQuery) query = query.or(`receipt_number.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,student_id.ilike.%${searchQuery}%`);

    const { data, error } = await query;

    if (error || !data) {
      toast.error("Failed to fetch data for export.");
      return;
    }

    const formattedData = data.map(record => ({
      "Transaction Date": new Date(record.transaction_date).toLocaleString(),
      "Student ID": record.student_id,
      "Student Name": `${record.first_name} ${record.last_name}`,
      "Fee Category": record.item_title,
      "Receipt / Ref #": record.receipt_number || "-",
      "Amount": record.amount,
    }));

    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Finance_Records");
    XLSX.writeFile(wb, `${eventName}_Records.xlsx`);
    toast.success("Excel report generated!");
  };

  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
           <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full mb-3">
             <LuHistory className="size-3" />
             <span className="text-[9px] font-black uppercase tracking-widest leading-none mt-0.5">Audit History</span>
           </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-2">Financial Records</h1>
          <p className="text-slate-500 font-medium">Audit every payment, filter by receipt numbers, and track total revenue.</p>
        </div>
        <Button 
          onClick={handleExport}
          className="h-12 px-6 rounded-2xl font-black gradient-primary shadow-xl shadow-primary/20 hover:scale-105 transition-all text-white"
        >
          <LuDownload className="size-5 mr-3" /> Export Audit Log
        </Button>
      </div>

      {/* Filters & Stats Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Total Collected Stat */}
        <div className="lg:col-span-4 bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl flex items-center gap-6 relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
             <LuCircleDollarSign className="size-32 text-white" />
           </div>
           <div className="size-16 rounded-[1.5rem] bg-white/10 border border-white/10 flex items-center justify-center text-emerald-400">
             <LuCircleDollarSign className="size-8" />
           </div>
           <div>
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1.5">Total Revenue (Filtered)</p>
             <p className="text-4xl font-black text-white tracking-tighter">
               <span className="text-emerald-400 text-2xl mr-1">₱</span>
               {totalRevenue.toLocaleString()}
             </p>
           </div>
        </div>

        {/* Search / Filter Group */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-200">
           <div className="space-y-3">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fee Category</label>
             <div className="relative group">
               <LuCircleDollarSign className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-primary transition-colors" />
               <select 
                 value={selectedItemId}
                 onChange={(e) => { setSelectedItemId(e.target.value); setCurrentPage(1); }}
                 className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all appearance-none"
               >
                 <option value="all">All Fees & Registration</option>
                 {financeItems.map((ev) => (
                   <option key={ev.id} value={ev.id}>{ev.title}</option>
                 ))}
               </select>
             </div>
           </div>

           <div className="space-y-3">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Universal Search</label>
             <div className="relative group">
               <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-primary transition-colors" />
               <input 
                 type="text"
                 placeholder="Receipt #, Student Name or ID..."
                 value={searchQuery}
                 onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                 className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
               />
             </div>
           </div>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Info</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Receipt / Ref #</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center">
                    <LuLoader className="size-8 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Compiling Records...</p>
                  </td>
                </tr>
              ) : transactions.length > 0 ? (
                transactions.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{row.item_title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <LuClock className="size-3 text-slate-400" />
                        <p className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                          {new Date(row.transaction_date).toLocaleString()}
                        </p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="font-bold text-slate-900 leading-none">{row.first_name} {row.last_name}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{row.student_id}</p>
                    </td>
                    <td className="px-8 py-6 text-center">
                       {row.receipt_number ? (
                         <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 font-black text-[10px] uppercase">
                           <LuClipboardList className="size-3" />
                           {row.receipt_number}
                         </div>
                       ) : <span className="text-slate-200">NO_RECEIPT</span>}
                    </td>
                    <td className="px-8 py-6 text-right">
                       <span className="text-lg font-black text-slate-900 tracking-tighter">
                         ₱{row.amount.toLocaleString()}
                       </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-24 text-center">
                    <LuInbox className="size-16 text-slate-100 mx-auto mb-6" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No financial logs match your filter</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalRecords > 0 && (
          <div className="px-10 py-6 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Showing {transactions.length} of {totalRecords} Audit Entries
            </p>
            <div className="flex items-center gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all shadow-sm"
              >
                <LuChevronLeft className="size-5" />
              </button>
              <div className="px-4 text-center min-w-[80px]">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-0.5">Page</span>
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
  );
}
