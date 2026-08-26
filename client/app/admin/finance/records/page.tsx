"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  LuPhilippinePeso,
  LuHistory,
  LuTrash2,
  LuTriangleAlert,
  LuX,
  LuUser,
  LuReceipt
} from "react-icons/lu";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/app/Components/ui/button";
import { Modal } from "@/app/Components/ui/modal";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const ITEMS_PER_PAGE = 10;

export interface FinancialRecordRow {
  id: string;
  user_id: string;
  finance_id: string;
  amount: number;
  receipt_number: string | null;
  transaction_date: string;
  student_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  course?: string;
  section?: string;
  year?: string;
  profile_picture?: string;
  item_title: string;
}

export default function FinancialRecordsPage() {
  const [financeItems, setFinanceItems] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [allRecords, setAllRecords] = useState<FinancialRecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Delete Transaction Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<FinancialRecordRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    fetchFinanceItems();
    fetchTransactions();
  }, []);

  const fetchFinanceItems = async () => {
    const { data, error } = await supabase
      .from("finance_items")
      .select("*")
      .order("title", { ascending: true });
    
    if (!error && data) {
      setFinanceItems(data);
    }
  };

  // Robust Dual-Strategy Transaction Fetcher (Direct joins + Fallback mapper)
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch finance items map for instant lookup
      const { data: itemsData } = await supabase
        .from("finance_items")
        .select("*");
      const itemsMap = new Map((itemsData || []).map((i) => [i.id, i]));

      // 2. Fetch raw transactions
      const { data: rawTxs, error: txError } = await supabase
        .from("finance_transactions")
        .select("*")
        .order("transaction_date", { ascending: false });

      if (txError) {
        console.error("Error fetching transactions:", txError);
        toast.error("Failed to load financial records.");
        setAllRecords([]);
        setLoading(false);
        return;
      }

      if (!rawTxs || rawTxs.length === 0) {
        setAllRecords([]);
        setLoading(false);
        return;
      }

      // 3. Fetch associated users for complete student info
      const userIds = Array.from(new Set(rawTxs.map((t) => t.user_id).filter(Boolean)));
      let usersMap = new Map<string, any>();

      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from("users")
          .select("id, student_id, first_name, last_name, email, course, section, year, profile_picture")
          .in("id", userIds);

        if (usersData) {
          usersMap = new Map(usersData.map((u) => [u.id, u]));
        }
      }

      // 4. Map transactions into clean, fully-populated rows
      const formattedRows: FinancialRecordRow[] = rawTxs.map((tx) => {
        const user = usersMap.get(tx.user_id) || {};
        const item = itemsMap.get(tx.finance_id) || {};

        const firstName = user.first_name || "Unknown";
        const lastName = user.last_name || "";
        const fullName = `${firstName} ${lastName}`.trim();

        return {
          id: tx.id,
          user_id: tx.user_id,
          finance_id: tx.finance_id,
          amount: parseFloat(tx.amount) || 0,
          receipt_number: tx.receipt_number || null,
          transaction_date: tx.transaction_date || tx.created_at || new Date().toISOString(),
          student_id: user.student_id || "N/A",
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          email: user.email || "",
          course: user.course || "",
          section: user.section || "",
          year: user.year || "",
          profile_picture: user.profile_picture || "",
          item_title: item.title || "Fee Payment",
        };
      });

      setAllRecords(formattedRows);
    } catch (err) {
      console.error("Fetch transactions error:", err);
      toast.error("Failed to load records.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Filtered Records & Statistics
  const filteredRecords = useMemo(() => {
    return allRecords.filter((row) => {
      // Category filter
      if (selectedItemId !== "all" && row.finance_id !== selectedItemId) {
        return false;
      }

      // Universal search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesReceipt = row.receipt_number?.toLowerCase().includes(query);
        const matchesStudentId = row.student_id?.toLowerCase().includes(query);
        const matchesName = row.full_name?.toLowerCase().includes(query);
        const matchesItem = row.item_title?.toLowerCase().includes(query);
        const matchesEmail = row.email?.toLowerCase().includes(query);

        if (!matchesReceipt && !matchesStudentId && !matchesName && !matchesItem && !matchesEmail) {
          return false;
        }
      }

      return true;
    });
  }, [allRecords, selectedItemId, searchQuery]);

  // Total Revenue for current filter
  const totalRevenue = useMemo(() => {
    return filteredRecords.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [filteredRecords]);

  // Paginated Sliced Records
  const paginatedRecords = useMemo(() => {
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRecords.slice(from, from + ITEMS_PER_PAGE);
  }, [filteredRecords, currentPage]);

  const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE);

  // Open Delete Confirmation Modal
  const handleOpenDeleteModal = (record: FinancialRecordRow) => {
    setRecordToDelete(record);
    setIsDeleteModalOpen(true);
  };

  // Delete Payment Transaction & Resync Membership Status if applicable
  const handleDeleteTransaction = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from("finance_transactions")
        .delete()
        .eq("id", recordToDelete.id);

      if (error) throw error;

      // If deleted transaction is for a membership fee, recalculate student membership status
      const membershipItem = financeItems.find(
        (fi) => fi.title.toLowerCase().trim() === "membership fee" || fi.title.toLowerCase().trim() === "membership"
      );

      if (membershipItem && recordToDelete.finance_id === membershipItem.id) {
        // Fetch remaining transactions for this student
        const { data: remainingMemTxs } = await supabase
          .from("finance_transactions")
          .select("amount, receipt_number")
          .eq("user_id", recordToDelete.user_id)
          .eq("finance_id", membershipItem.id);

        const cumulativePaid = (remainingMemTxs || []).reduce(
          (sum, tx) => sum + (parseFloat(tx.amount) || 0),
          0
        );
        const requiredAmount = parseFloat(membershipItem.amount) || 0;

        let newStatus = "Not Paid";
        if (requiredAmount > 0) {
          if (cumulativePaid >= requiredAmount) {
            newStatus = "Fully Paid";
          } else if (cumulativePaid >= requiredAmount / 2) {
            newStatus = "Half Semester Paid";
          } else if (cumulativePaid > 0) {
            newStatus = "Partial";
          }
        } else {
          if (cumulativePaid > 0) newStatus = "Fully Paid";
        }

        const latestReceipt = remainingMemTxs?.[remainingMemTxs.length - 1]?.receipt_number || null;

        await supabase
          .from("memberships")
          .upsert({
            user_id: recordToDelete.user_id,
            status: newStatus,
            payment: cumulativePaid,
            receipt: latestReceipt,
          }, { onConflict: "user_id" });
      }

      toast.success(`Payment of ₱${recordToDelete.amount.toLocaleString()} for ${recordToDelete.full_name} deleted.`);
      setIsDeleteModalOpen(false);
      setRecordToDelete(null);
      fetchTransactions();
    } catch (err: any) {
      console.error("Delete transaction error:", err);
      toast.error(err.message || "Failed to delete payment record.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Export Filtered Records to Excel
  const handleExport = async () => {
    const eventName =
      selectedItemId === "all"
        ? "All_Transactions"
        : financeItems.find((i) => i.id === selectedItemId)?.title || "Finance";

    if (filteredRecords.length === 0) {
      toast.error("No financial records to export.");
      return;
    }

    const formattedData = filteredRecords.map((record) => ({
      "Transaction Date": new Date(record.transaction_date).toLocaleString(),
      "Student ID": record.student_id,
      "Student Name": record.full_name,
      "Course & Year": `${record.course || ""} ${record.year || ""}`.trim() || "-",
      "Fee Category": record.item_title,
      "Receipt / Ref #": record.receipt_number || "NO_RECEIPT",
      "Amount (PHP)": record.amount,
    }));

    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Finance_Records");
    XLSX.writeFile(wb, `${eventName}_Audit_Log.xlsx`);
    toast.success("Excel audit log generated!");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full mb-2 sm:mb-3">
            <LuHistory className="size-3" />
            <span className="text-[9px] font-black uppercase tracking-widest leading-none mt-0.5">
              Audit History
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            Financial Records
          </h1>
          <p className="text-xs sm:text-base text-slate-500 font-medium tracking-tight">
            Audit every payment, filter receipts, track revenue, and manage transactions.
          </p>
        </div>

        <Button 
          onClick={handleExport}
          className="w-full sm:w-auto h-11 sm:h-12 px-5 sm:px-6 rounded-2xl font-black gradient-primary shadow-xl shadow-primary/20 hover:scale-105 transition-all text-white cursor-pointer justify-center text-xs sm:text-sm"
        >
          <LuDownload className="size-4 sm:size-5 mr-2" /> Export Audit Log
        </Button>
      </div>

      {/* Filters & Stats Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Total Collected Stat */}
        <div className="lg:col-span-4 bg-slate-900 p-6 sm:p-8 rounded-3xl sm:rounded-[2.5rem] shadow-2xl flex items-center gap-4 sm:gap-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 sm:p-8 opacity-5 group-hover:scale-110 transition-transform pointer-events-none">
            <LuPhilippinePeso className="size-28 sm:size-32 text-white" />
          </div>
          <div className="size-14 sm:size-16 rounded-2xl sm:rounded-[1.5rem] bg-white/10 border border-white/10 flex items-center justify-center text-emerald-400 shrink-0">
            <LuPhilippinePeso className="size-7 sm:size-8" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1.5">
              Total Revenue ({selectedItemId === "all" ? "All" : "Filtered"})
            </p>
            <p className="text-2xl sm:text-4xl font-black text-white tracking-tighter">
              <span className="text-emerald-400 text-xl sm:text-2xl mr-1">₱</span>
              {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] font-bold text-slate-400 mt-1">
              {filteredRecords.length} recorded payments
            </p>
          </div>
        </div>

        {/* Search / Filter Group */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 bg-white p-5 sm:p-8 rounded-3xl sm:rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="space-y-1.5 sm:space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Fee Category
            </label>
            <div className="relative group">
              <LuPhilippinePeso className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <select 
                value={selectedItemId}
                onChange={(e) => { setSelectedItemId(e.target.value); setCurrentPage(1); }}
                className="w-full h-12 sm:h-14 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all appearance-none cursor-pointer"
              >
                <option value="all">All Fees & Registrations</option>
                {financeItems.map((item) => (
                  <option key={item.id} value={item.id}>{item.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Universal Search
            </label>
            <div className="relative group">
              <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input 
                type="text"
                placeholder="Receipt #, Student Name, or ID..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full h-12 sm:h-14 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Audit Table & Mobile Cards */}
      <div className="bg-white rounded-3xl sm:rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100">
                <th className="px-6 py-4 sm:px-8 sm:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Transaction & Fee
                </th>
                <th className="px-6 py-4 sm:px-8 sm:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Student Member
                </th>
                <th className="px-6 py-4 sm:px-8 sm:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                  Receipt / Ref #
                </th>
                <th className="px-6 py-4 sm:px-8 sm:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                  Amount
                </th>
                <th className="px-6 py-4 sm:px-8 sm:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <LuLoader className="size-8 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      Compiling Financial Records...
                    </p>
                  </td>
                </tr>
              ) : paginatedRecords.length > 0 ? (
                paginatedRecords.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="px-6 py-5 sm:px-8 sm:py-6">
                      <p className="text-sm font-black text-slate-900 uppercase tracking-tight">
                        {row.item_title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <LuClock className="size-3 text-slate-400" />
                        <p className="text-[11px] font-bold text-slate-400 whitespace-nowrap">
                          {new Date(row.transaction_date).toLocaleString()}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-5 sm:px-8 sm:py-6">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-primary font-black overflow-hidden shrink-0 shadow-xs">
                          {row.profile_picture ? (
                            <img src={row.profile_picture} alt="Avatar" className="size-full object-cover" />
                          ) : (
                            row.first_name[0] || "S"
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">
                            {row.full_name}
                          </p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                            {row.student_id} {row.course ? `• ${row.course} ${row.year || ""}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 sm:px-8 sm:py-6 text-center">
                      {row.receipt_number ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 text-orange-700 rounded-lg border border-orange-200/80 font-black text-xs uppercase shadow-xs">
                          <LuReceipt className="size-3.5" />
                          {row.receipt_number}
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-slate-300">NO_RECEIPT</span>
                      )}
                    </td>
                    <td className="px-6 py-5 sm:px-8 sm:py-6 text-right">
                      <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                        ₱{row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-5 sm:px-8 sm:py-6 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDeleteModal(row)}
                        className="size-9 p-0 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Payment Record"
                      >
                        <LuTrash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <LuInbox className="size-16 text-slate-200 mx-auto mb-4" />
                    <p className="text-sm font-black text-slate-700">No payment records found</p>
                    <p className="text-xs text-slate-400 mt-1 font-medium">
                      Try clearing your search query or selecting another fee category.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List View */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="py-16 text-center">
              <LuLoader className="size-8 text-primary animate-spin mx-auto mb-3" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Compiling Records...
              </p>
            </div>
          ) : paginatedRecords.length > 0 ? (
            paginatedRecords.map((row) => (
              <div key={row.id} className="p-4 sm:p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-black text-primary uppercase tracking-tight block">
                      {row.item_title}
                    </span>
                    <p className="text-sm font-black text-slate-900 mt-0.5">
                      {row.full_name}
                    </p>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {row.student_id} {row.course ? `• ${row.course}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-base font-black text-slate-900 block">
                      ₱{row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <div className="flex items-center justify-end gap-1 mt-0.5 text-[10px] text-slate-400 font-semibold">
                      <LuClock className="size-3" />
                      {new Date(row.transaction_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100/80">
                  {row.receipt_number ? (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 text-orange-700 rounded-lg border border-orange-200/80 font-black text-[11px] uppercase">
                      <LuReceipt className="size-3" />
                      {row.receipt_number}
                    </div>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-300">NO RECEIPT</span>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDeleteModal(row)}
                    className="h-8 px-3 rounded-lg text-rose-600 border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <LuTrash2 className="size-3.5 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-16 text-center px-4">
              <LuInbox className="size-12 text-slate-200 mx-auto mb-3" />
              <p className="text-xs font-black text-slate-700">No payment records match filter</p>
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {filteredRecords.length > 0 && (
          <div className="px-6 py-4 sm:px-10 sm:py-6 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Showing {paginatedRecords.length} of {filteredRecords.length} Entries
            </p>
            <div className="flex items-center gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
                className="p-2.5 sm:p-3 bg-white border border-slate-200 rounded-xl text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
              >
                <LuChevronLeft className="size-4 sm:size-5" />
              </button>
              <div className="px-3 sm:px-4 text-center min-w-[70px]">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-0.5">
                  Page
                </span>
                <span className="text-xs sm:text-sm font-black text-slate-900 whitespace-nowrap">
                  {currentPage} / {totalPages || 1}
                </span>
              </div>
              <button 
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className="p-2.5 sm:p-3 bg-white border border-slate-200 rounded-xl text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
              >
                <LuChevronRight className="size-4 sm:size-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setRecordToDelete(null);
          }
        }}
        title="Delete Payment Record"
      >
        <div className="space-y-4 sm:space-y-5 p-1 text-left">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-950 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-rose-500 text-white shrink-0 shadow-xs mt-0.5">
              <LuTriangleAlert className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-black text-rose-900 leading-snug">
                Warning: Permanent Deletion
              </p>
              <p className="text-xs text-rose-800 leading-relaxed">
                This will permanently delete this transaction from the financial audit log and update student payment balances.
              </p>
            </div>
          </div>

          {recordToDelete && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                <span className="font-bold text-slate-500">Student:</span>
                <span className="font-black text-slate-900">{recordToDelete.full_name} ({recordToDelete.student_id})</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                <span className="font-bold text-slate-500">Fee Category:</span>
                <span className="font-black text-primary">{recordToDelete.item_title}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                <span className="font-bold text-slate-500">Amount Paid:</span>
                <span className="font-black text-emerald-600 text-base">₱{recordToDelete.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                <span className="font-bold text-slate-500">Receipt / Ref #:</span>
                <span className="font-mono font-bold text-slate-800">{recordToDelete.receipt_number || "NO_RECEIPT"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-500">Transaction Date:</span>
                <span className="font-bold text-slate-700">{new Date(recordToDelete.transaction_date).toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setRecordToDelete(null);
              }}
              disabled={isDeleting}
              className="h-11 px-4 rounded-xl font-bold border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteTransaction}
              disabled={isDeleting}
              className="h-11 px-5 rounded-xl font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 cursor-pointer transition-all flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <LuLoader className="size-4 animate-spin text-white" />
              ) : (
                <LuTrash2 className="size-4 text-white" />
              )}
              {isDeleting ? "Deleting..." : "Confirm Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
