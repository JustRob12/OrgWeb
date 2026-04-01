"use client";

import React, { useEffect, useState } from "react";
import { 
  LuSearch, 
  LuFilter, 
  LuEllipsisVertical, 
  LuPencil, 
  LuTrash2, 
  LuUserPlus,
  LuChevronLeft,
  LuChevronRight,
  LuCircleCheck,
  LuClock,
  LuCircleAlert,
  LuMail,
  LuGraduationCap,
  LuLayers,
  LuUsers
} from "react-icons/lu";
import { Button } from "@/app/Components/ui/button";
import { Card, CardContent } from "@/app/Components/ui/card";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { ConfirmModal } from "@/app/Components/ui/confirm-modal";

interface MemberWithStatus {
  id: string;
  student_id: string;
  first_name: string;
  middle_initial: string;
  last_name: string;
  email: string;
  course: string;
  section: string;
  year: string;
  memberships: {
    status: string;
    payment: number;
  } | null;
}

export default function ViewMembersPage() {
  const [members, setMembers] = useState<MemberWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const supabase = createClient();

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select(`
          *,
          memberships:memberships(status, payment),
          accounts:accounts!inner(role),
          send_credentials:send_credentials(id)
        `)
        .eq('accounts.role', 1)
        .order('last_name', { ascending: true });

      if (error) throw error;
      
      // Flatten the data (since memberships and accounts are 1-to-1)
      const flattenedData = (data as any[]).map(item => ({
        ...item,
        memberships: Array.isArray(item.memberships) ? item.memberships[0] : item.memberships
      }));

      setMembers(flattenedData);
    } catch (error: any) {
      console.error("Error fetching members:", error.message);
      toast.error("Failed to load members list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleDeleteClick = (userId: string) => {
    setMemberToDelete(userId);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!memberToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", memberToDelete);

      if (error) throw error;

      toast.success("Member deleted successfully.");
      setMembers(prev => prev.filter(m => m.id !== memberToDelete));
    } catch (error: any) {
      toast.error(`Delete failed: ${error.message}`);
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setMemberToDelete(null);
    }
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const filteredMembers = members.filter(member => {
    const matchesSearch = 
      `${member.first_name || ""} ${member.last_name || ""}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.student_id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.email || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "All" || member.memberships?.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Registered Members</h1>
          <p className="text-slate-500 mt-1">Manage, edit, and track registered students and their membership status.</p>
        </div>
        
        <Link href="/admin/members/add">
          <Button className="rounded-xl gradient-primary shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]">
            <LuUserPlus className="mr-2 size-4" /> Bulk Add Members
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Stats Cards */}
        <Card className="bg-emerald-50/50 border-emerald-100 rounded-3xl overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="size-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform">
                <LuCircleCheck className="size-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Fully Paid</p>
                <p className="text-3xl font-black text-emerald-950">{members.filter(m => m.memberships?.status === 'Fully Paid').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-50/50 border-amber-100 rounded-3xl overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="size-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-200 group-hover:scale-110 transition-transform">
                <LuClock className="size-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Partial</p>
                <p className="text-3xl font-black text-amber-950">{members.filter(m => m.memberships?.status === 'Partial').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-rose-50/50 border-rose-100 rounded-3xl overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="size-12 bg-rose-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-200 group-hover:scale-110 transition-transform">
                <LuCircleAlert className="size-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">Unpaid</p>
                <p className="text-3xl font-black text-rose-950">{members.filter(m => !m.memberships || m.memberships?.status === 'Not Paid').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/10 rounded-3xl overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="size-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                <LuUsers className="size-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-primary/80 uppercase tracking-wider">Total Members</p>
                <p className="text-3xl font-black text-slate-900">{members.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden bg-white">
        <div className="p-6 border-b border-slate-100 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-96 group">
              <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Search by name, ID, or email..." 
                className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="flex bg-slate-100 p-1 rounded-2xl">
                {["All", "Fully Paid", "Partial", "Not Paid"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      statusFilter === status 
                        ? "bg-white text-primary shadow-sm" 
                        : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Student Info</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Academic</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Contact</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Status</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Paid</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-10 space-y-4">
                      <div className="h-4 bg-slate-100 rounded-full w-3/4"></div>
                      <div className="h-4 bg-slate-100 rounded-full w-1/2"></div>
                    </td>
                  </tr>
                ))
              ) : paginatedMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-500 font-bold italic">
                    No results match your search.
                  </td>
                </tr>
              ) : (
                paginatedMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="size-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-400 font-black shadow-inner">
                          {member.first_name[0]}{member.last_name[0]}
                        </div>
                        <div>
                          <div className="font-black text-slate-900">{member.first_name} {member.last_name}</div>
                          <div className="text-xs font-bold text-primary tracking-tight">ID: {member.student_id || 'NOT SET'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                          <LuGraduationCap className="size-3.5 text-slate-400" />
                          {member.course}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                          <LuLayers className="size-3.5 text-slate-300" />
                          Year {member.year} • Sec {member.section}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                        <LuMail className="size-4 text-slate-300" />
                        {member.email}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-current transition-all ${
                        member.memberships?.status === 'Fully Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        member.memberships?.status === 'Partial' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        'bg-rose-50 text-rose-600 border-rose-100'
                      }`}>
                        <div className={`size-1.5 rounded-full mr-2 ${
                          member.memberships?.status === 'Fully Paid' ? 'bg-emerald-500' :
                          member.memberships?.status === 'Partial' ? 'bg-amber-500' :
                          'bg-rose-500'
                        }`} />
                        {member.memberships?.status || 'Not Paid'}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm font-black text-slate-900 leading-none">
                        ₱{(member.memberships?.payment || 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="outline" size="sm" className="size-9 p-0 rounded-xl hover:bg-primary hover:text-white hover:border-primary transition-all">
                          <LuPencil className="size-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDeleteClick(member.id)}
                          className="size-9 p-0 rounded-xl hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all"
                        >
                          <LuTrash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Showing <span className="text-slate-900">{Math.min(filteredMembers.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredMembers.length, currentPage * itemsPerPage)}</span> of <span className="text-slate-900">{filteredMembers.length}</span> results
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

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Member"
        description="Are you sure you want to delete this member? This will permanently remove their account and all associated records."
        confirmText="Delete Member"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
