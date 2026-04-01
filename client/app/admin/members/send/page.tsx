"use client";

import React, { useEffect, useState } from "react";
import { 
  LuMail, 
  LuSearch, 
  LuCircleCheck, 
  LuHistory, 
  LuExternalLink, 
  LuClipboard, 
  LuInfo,
  LuSend,
  LuCircleAlert,
  LuChevronLeft,
  LuChevronRight
} from "react-icons/lu";
import { Button } from "@/app/Components/ui/button";
import { Card, CardContent } from "@/app/Components/ui/card";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { ConfirmModal } from "@/app/Components/ui/confirm-modal";

interface MemberToNotify {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  student_id: string;
  accounts: {
    role: number;
  } | null;
  send_credentials: {
    sent_at: string;
    status: string;
  } | null;
}

export default function SendCredentialsPage() {
  const [members, setMembers] = useState<MemberToNotify[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"Pending" | "Sent">("Pending");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const supabase = createClient();

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select(`
          id, first_name, last_name, email, student_id,
          accounts:accounts!inner(role),
          send_credentials:send_credentials(id, sent_at, status)
        `)
        .eq('accounts.role', 1)
        .order('last_name', { ascending: true });

      if (error) throw error;
      
      const formatted = (data as any[]).map(item => ({
        ...item,
        accounts: Array.isArray(item.accounts) ? item.accounts[0] : item.accounts,
        send_credentials: Array.isArray(item.send_credentials) ? item.send_credentials[0] : item.send_credentials
      }));

      setMembers(formatted);
    } catch (error: any) {
      toast.error(`Failed to load members: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateNewPassword = (firstName: string, lastName: string) => {
    const first2 = firstName.substring(0, 2).toLowerCase();
    const last2 = lastName.substring(lastName.length - 2).toLowerCase();
    const random5 = Math.random().toString(36).substring(2, 7);
    return `${first2}${last2}${random5}2026`;
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, viewMode]);

  const handleSendEmail = async (member: MemberToNotify) => {
    const password = generateNewPassword(member.first_name, member.last_name);
    const name = `${member.first_name} ${member.last_name}`;
    
    try {
      // 1. Update the password in the database (this triggers the hash trigger)
      const { error: updateError } = await supabase
        .from("accounts")
        .update({ password: password })
        .eq("user_id", member.id);

      if (updateError) throw updateError;

      // 2. Launch the email client with the PLAIN TEXT password (in memory only)
      const email = member.email;
      const subject = encodeURIComponent("Your OrgWeb Member Credentials");
      const body = encodeURIComponent(
        `here is your credentials\n\nEmail: ${email}\nEncrypt Password: ${password}\n\nSender: roberto.prisoris12@gmail.com`
      );

      window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");

      // 3. Mark as sent
      const { error: logError } = await supabase
        .from("send_credentials")
        .upsert({ user_id: member.id, status: "Sent" }, { onConflict: 'user_id' });

      if (logError) throw logError;
      
      toast.success(`Credentials generated and prepared for ${name}`);
      fetchMembers();
    } catch (error: any) {
      console.error("Workflow failed:", error);
      toast.error(`Failed to generate credentials: ${error.message}`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch = 
      `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const isSent = !!member.send_credentials;
    const matchesTab = viewMode === "Sent" ? isSent : !isSent;

    return matchesSearch && matchesTab;
  });

  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Send Credentials</h1>
          <p className="text-slate-500 font-medium mt-1">Provide accounts credentials to students via email.</p>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            onClick={() => setViewMode("Pending")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
              viewMode === "Pending" 
                ? "bg-white text-primary shadow-xl shadow-primary/10" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <LuSend className="size-4" />
            PENDING ({members.filter(m => !m.send_credentials).length})
          </button>
          <button
            onClick={() => setViewMode("Sent")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
              viewMode === "Sent" 
                ? "bg-white text-primary shadow-xl shadow-primary/10" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <LuHistory className="size-4" />
            SENT ({members.filter(m => !!m.send_credentials).length})
          </button>
        </div>
      </div>

      {viewMode === "Pending" && (
        <div className="bg-primary/5 border border-primary/10 p-5 rounded-[2rem] flex items-start gap-4">
          <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <LuInfo className="size-6" />
          </div>
          <div>
            <h4 className="text-sm font-black text-primary">Secure Notification Workflow</h4>
            <p className="text-xs text-primary/70 font-bold mt-1 leading-relaxed">
              To maintain security, plain-text passwords are never stored. Clicking &quot;Send Credentials&quot; will generate a **NEW** password, 
              save its secure hash in the database, and then open your email draft with the plain-text login details.
            </p>
          </div>
        </div>
      )}

      <Card className="border-slate-200 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden bg-white">
        <div className="p-6 border-b border-slate-100">
          <div className="relative group max-w-md">
            <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Filter by name or email..." 
              className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Student Info</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={3} className="px-6 py-20 text-center font-bold text-slate-400 italic">Processing data...</td></tr>
              ) : paginatedMembers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-24 text-center">
                    <div className="mx-auto size-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      {viewMode === "Pending" ? <LuCircleCheck className="size-8 text-emerald-300" /> : <LuCircleAlert className="size-8 text-slate-200" />}
                    </div>
                    <h3 className="text-xl font-black text-slate-900">{viewMode === "Pending" ? "All Caught Up!" : "No History"}</h3>
                    <p className="text-sm font-medium text-slate-500 mt-1">
                      {viewMode === "Pending" ? "There are no students waiting for credentials." : "You haven't sent any credentials yet."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="size-11 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-black text-sm">
                          {member.first_name[0]}{member.last_name[0]}
                        </div>
                        <div>
                          <div className="font-black text-slate-900 text-base">{member.first_name} {member.last_name}</div>
                          <div className="text-xs font-bold text-slate-400 tracking-tight">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      {member.send_credentials ? (
                        <div className="flex flex-col items-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
                            Authenticated & Sent
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 mt-1">
                            {new Date(member.send_credentials.sent_at).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100">
                           Awaiting Secure Generation
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right">
                      {viewMode === "Pending" ? (
                        <Button 
                          onClick={() => handleSendEmail(member)}
                          className="rounded-xl h-10 px-6 font-black gradient-primary shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all text-xs"
                        >
                          <LuMail className="size-4 mr-2" />
                          Generate & Send
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          onClick={() => handleSendEmail(member)}
                          className="rounded-xl h-10 px-6 font-black border-slate-200 hover:bg-slate-50 transition-all text-xs"
                        >
                          <LuExternalLink className="size-4 mr-2" />
                          Regenerate & Resend
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Showing <span className="text-slate-900">{Math.min(filteredMembers.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredMembers.length, currentPage * itemsPerPage)}</span> of <span className="text-slate-900">{filteredMembers.length}</span> students
          </p>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={currentPage <= 1} 
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="rounded-xl px-4 py-2 border-slate-200 hover:bg-white transition-all disabled:opacity-50"
            >
              <LuChevronLeft className="size-4 mr-2" /> Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={currentPage >= totalPages} 
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="rounded-xl px-4 py-2 border-slate-200 hover:bg-white transition-all disabled:opacity-50"
            >
              Next <LuChevronRight className="size-4 ml-2" />
            </Button>
          </div>
        </div>
      </Card>
      
      <div className="text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
          Sender Email: roberto.prisoris12@gmail.com
        </p>
      </div>

      </div>
  );
}
