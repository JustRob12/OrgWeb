"use client";

import React, { useState, useEffect } from "react";
import { 
  LuPlus, 
  LuCircleDollarSign, 
  LuCalendar, 
  LuSearch, 
  LuLoader,
  LuTrash2,
  LuCircleAlert,
  LuClipboardList,
  LuX,
  LuCoins
} from "react-icons/lu";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/app/Components/ui/button";
import { toast } from "sonner";

export default function ManageFinancePage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchFinanceItems();
  }, []);

  const fetchFinanceItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("finance_items")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (!error && data) {
      setItems(data);
    }
    setLoading(false);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("finance_items")
        .insert([{ 
          title, 
          description, 
          deadline: deadline || null,
          amount: parseFloat(amount) || 0
        }]);

      if (error) throw error;

      toast.success("New finance item created!");
      setTitle("");
      setDescription("");
      setDeadline("");
      setAmount("");
      setIsAdding(false);
      fetchFinanceItems();
    } catch (err: any) {
      toast.error(err.message || "Failed to create item.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this finance item? This will also remove all associated payment records.")) return;

    try {
      const { error } = await supabase
        .from("finance_items")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Item deleted.");
      fetchFinanceItems();
    } catch (err: any) {
      toast.error("Failed to delete item.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-3">Manage Finance</h1>
          <p className="text-slate-500 font-medium tracking-tight">Create and manage organizational fees, registrations, and dues.</p>
        </div>
        <Button 
          onClick={() => setIsAdding(!isAdding)}
          className={`h-12 px-6 rounded-2xl font-black shadow-xl transition-all ${isAdding ? 'bg-rose-500 text-white shadow-rose-900/10 hover:bg-rose-600' : 'gradient-primary text-white shadow-primary/20 hover:scale-105'}`}
        >
          {isAdding ? <LuX className="size-5 mr-3" /> : <LuPlus className="size-5 mr-3" />}
          {isAdding ? "Cancel" : "Add New Item"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Creation Form */}
        {isAdding && (
          <div className="lg:col-span-12">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm animate-in slide-in-from-top-4 duration-500">
               <h2 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                 <div className="p-2 bg-primary/10 rounded-xl text-primary"><LuClipboardList className="size-5" /></div>
                 New Finance Item Details
               </h2>
               <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fee Title</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Fun Run Registration"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Base Amount</label>
                    <div className="relative group">
                       <LuCoins className="absolute left-6 top-1/2 -translate-y-1/2 size-4 text-emerald-500" />
                       <input 
                        type="number"
                        required
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full h-14 pl-12 pr-6 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Deadline</label>
                    <input 
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                    />
                  </div>
                  <div className="space-y-3 md:col-span-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                    <input 
                      type="text"
                      placeholder="Enter brief details about this fee..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                    />
                  </div>
                  <div className="md:col-span-1 flex items-end">
                    <Button 
                      type="submit"
                      disabled={submitting}
                      className="w-full h-14 rounded-2xl font-black bg-slate-900 text-white shadow-xl hover:bg-slate-800 transition-all text-sm uppercase tracking-widest"
                    >
                      {submitting ? <LuLoader className="size-5 animate-spin" /> : "Save Finance Item"}
                    </Button>
                  </div>
               </form>
            </div>
          </div>
        )}

        {/* List of Items */}
        <div className="lg:col-span-12">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                 <LuCircleDollarSign className="size-4 text-emerald-500" />
                 Official Finance Items
               </h3>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{items.length} Total Items</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Title & Info</th>
                    <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Official Amount</th>
                    <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Deadline</th>
                    <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-20 text-center">
                        <LuLoader className="size-8 text-primary animate-spin mx-auto mb-4" />
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Fetching Ledger...</p>
                      </td>
                    </tr>
                  ) : items.length > 0 ? (
                    items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-10 py-6">
                           <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{item.title}</p>
                           <p className="text-xs font-medium text-slate-400 mt-1 max-w-xs">{item.description || "No description provided."}</p>
                        </td>
                        <td className="px-10 py-6">
                           <div className="flex items-center gap-1.5">
                             <span className="text-xs font-black text-emerald-600">₱</span>
                             <span className="text-lg font-black text-slate-900 tracking-tighter">{(item.amount || 0).toLocaleString()}</span>
                           </div>
                        </td>
                        <td className="px-10 py-6">
                           {item.deadline ? (
                             <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-100">
                               <LuCalendar className="size-3" />
                               <span className="text-[10px] font-black text-amber-800 uppercase leading-none">{new Date(item.deadline).toLocaleDateString()}</span>
                             </div>
                           ) : (
                             <span className="text-xs font-bold text-slate-300">No Deadline</span>
                           )}
                        </td>
                        <td className="px-10 py-6 text-right">
                           <button 
                             onClick={() => handleDeleteItem(item.id)}
                             className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                           >
                             <LuTrash2 className="size-5" />
                           </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                       <td colSpan={4} className="py-20 text-center">
                          <LuCircleAlert className="size-10 text-slate-200 mx-auto mb-4" />
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">No finance items defined yet.</p>
                       </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
