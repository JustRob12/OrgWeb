"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  LuSearch, 
  LuClipboard, 
  LuFilter, 
  LuChevronLeft, 
  LuChevronRight, 
  LuEye, 
  LuEyeOff, 
  LuUserCheck, 
  LuKeyRound, 
  LuGraduationCap, 
  LuMail, 
  LuHash, 
  LuCheck,
  LuShieldCheck
} from "react-icons/lu";
import { createClient } from "@/utils/supabase/client";
import { Card } from "@/app/Components/ui/card";
import { Button } from "@/app/Components/ui/button";
import { Modal } from "@/app/Components/ui/modal";
import { decryptPassword } from "@/lib/encryption";
import { toast } from "sonner";

interface MemberRecord {
  id: string;
  student_id: string;
  first_name: string;
  middle_initial?: string;
  last_name: string;
  email: string;
  course?: string;
  section?: string;
  year?: string;
  created_at?: string;
  accounts?: {
    role: number;
    password?: string;
    encrypted_password?: string;
    must_change_password?: boolean;
  };
  memberships?: {
    status?: string;
    payment?: number;
    receipt?: string;
  };
}

export default function StudentCredentialsPage() {
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("All");
  const [selectedYear, setSelectedYear] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  
  // Password visibility state per row ID
  const [visiblePasswords, setVisiblePasswords] = useState<{ [key: string]: boolean }>({});
  
  // Modal State
  const [selectedMember, setSelectedMember] = useState<MemberRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalPasswordVisible, setIsModalPasswordVisible] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const supabase = createClient();

  const fetchMembers = async () => {
    setLoading(true);
    try {
      let allUsers: any[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("users")
          .select(`
            id,
            student_id,
            first_name,
            middle_initial,
            last_name,
            email,
            course,
            section,
            year,
            created_at,
            memberships:memberships(status, payment, receipt),
            accounts:accounts!inner(role, password, encrypted_password, must_change_password)
          `)
          .neq('accounts.role', 0)
          .order("created_at", { ascending: false })
          .range(from, from + step - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          const formatted = (data as any[]).map((item) => ({
            ...item,
            accounts: Array.isArray(item.accounts) ? item.accounts[0] : item.accounts,
            memberships: Array.isArray(item.memberships) ? item.memberships[0] : item.memberships,
          }));
          allUsers = allUsers.concat(formatted);
          if (data.length < step) {
            hasMore = false;
          } else {
            from += step;
          }
        } else {
          hasMore = false;
        }
      }

      setMembers(allUsers);
    } catch (error: any) {
      toast.error(`Failed to load student credentials: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCourse, selectedYear]);

  const uniqueCourses = useMemo(() => {
    const courses = members.map(m => m.course).filter(Boolean) as string[];
    return Array.from(new Set(courses)).sort();
  }, [members]);

  const uniqueYears = useMemo(() => {
    const years = members.map(m => m.year).filter(Boolean) as string[];
    return Array.from(new Set(years)).sort();
  }, [members]);

  const isBcryptHash = (str?: string) => {
    if (!str) return false;
    return str.startsWith("$2a$") || str.startsWith("$2b$") || str.startsWith("$2y$") || str.startsWith("$2x$");
  };

  const getStudentPassword = (member?: MemberRecord | null) => {
    if (!member) return "0000-0000";

    // 1. If AES-256 encrypted password exists, decrypt it
    if (member.accounts?.encrypted_password) {
      const decrypted = decryptPassword(member.accounts.encrypted_password, member.student_id);
      if (decrypted && decrypted !== "0000-0000") {
        return decrypted;
      }
    }

    // 2. If password field has plain text (not a bcrypt hash)
    const raw = member.accounts?.password;
    if (raw && !isBcryptHash(raw) && raw.trim() !== "") {
      return raw.trim();
    }

    // 3. Fallback to student ID
    return member.student_id && member.student_id.trim() ? member.student_id.trim() : "0000-0000";
  };

  const hasChangedPassword = (member?: MemberRecord | null) => {
    if (!member) return false;
    if (member.accounts?.must_change_password === false) return true;
    if (member.accounts?.password && member.student_id && member.accounts.password.trim() !== member.student_id.trim()) {
      return true;
    }
    return false;
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const copyToClipboard = (text: string, keyName?: string) => {
    navigator.clipboard.writeText(text);
    if (keyName) {
      setCopiedKey(keyName);
      setTimeout(() => setCopiedKey(null), 2000);
    }
    toast.success("Copied to clipboard!");
  };

  const filteredMembers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return members.filter(member => {
      const fullName = `${member.first_name || ""} ${member.middle_initial || ""} ${member.last_name || ""}`.toLowerCase();
      const studentId = (member.student_id || "").toLowerCase();
      const email = (member.email || "").toLowerCase();
      const course = (member.course || "").toLowerCase();
      const section = (member.section || "").toLowerCase();
      const year = (member.year || "").toLowerCase();

      const matchesSearch = !query || 
        fullName.includes(query) ||
        studentId.includes(query) ||
        email.includes(query) ||
        course.includes(query) ||
        section.includes(query) ||
        year.includes(query);

      const matchesCourse = selectedCourse === "All" || member.course === selectedCourse;
      const matchesYear = selectedYear === "All" || member.year === selectedYear;

      return matchesSearch && matchesCourse && matchesYear;
    });
  }, [members, searchQuery, selectedCourse, selectedYear]);

  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const paginatedMembers = useMemo(() => {
    return filteredMembers.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredMembers, currentPage, itemsPerPage]);

  const handleOpenDetails = (member: MemberRecord) => {
    setSelectedMember(member);
    setIsModalPasswordVisible(false);
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in duration-700 h-[calc(100vh-6rem)] lg:h-[calc(100vh-8rem)] overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Student Credentials</h1>
          <p className="text-slate-500 font-medium mt-1">Search and view student account login details and default passwords.</p>
        </div>

        <div className="flex items-center gap-2 bg-primary/5 border border-primary/15 px-4 py-2 rounded-2xl">
          <LuKeyRound className="size-5 text-primary" />
          <span className="text-xs font-black text-primary uppercase tracking-wider">
            Total Students: {members.length}
          </span>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="flex-1 flex flex-col overflow-hidden border-slate-200 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] bg-white">
        {/* Search & Filters */}
        <div className="p-6 border-b border-slate-100 shrink-0">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative group max-w-md w-full">
              <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Search by Student ID, name, email, or section..." 
                className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
              {/* Course Filter */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 h-12 focus-within:ring-4 focus-within:ring-primary/10 focus-within:bg-white transition-all">
                <LuFilter className="size-4 text-slate-400 shrink-0" />
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="All">All Courses</option>
                  {uniqueCourses.map((course) => (
                    <option key={course} value={course}>
                      {course}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Filter */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 h-12 focus-within:ring-4 focus-within:ring-primary/10 focus-within:bg-white transition-all">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="All">All Years</option>
                  {uniqueYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr} Year
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Student Info</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Academic Info</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Student ID</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Password & Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center font-bold text-slate-400 italic">
                    Loading student credentials...
                  </td>
                </tr>
              ) : paginatedMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-24 text-center">
                    <div className="mx-auto size-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <LuSearch className="size-8 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900">No Students Found</h3>
                    <p className="text-sm font-medium text-slate-500 mt-1">
                      Try adjusting your search query or course/year filters.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedMembers.map((member) => {
                  const password = getStudentPassword(member);
                  const isVisible = !!visiblePasswords[member.id];
                  const isChanged = hasChangedPassword(member);
                  const fullName = `${member.first_name} ${member.middle_initial ? member.middle_initial + " " : ""}${member.last_name}`;

                  return (
                    <tr key={member.id} className="hover:bg-slate-50/50 transition-colors group">
                      {/* Student Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-xs shrink-0">
                            {member.first_name[0]}{member.last_name[0]}
                          </div>
                          <div>
                            <div className="font-black text-slate-900 text-sm">
                              {fullName}
                            </div>
                            <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span>{member.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Academic Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          {member.course && (
                            <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-bold text-[11px] border border-slate-200">
                              {member.course}
                            </span>
                          )}
                          {member.year && (
                            <span className="text-xs font-semibold text-slate-500">
                              Yr {member.year}
                            </span>
                          )}
                          {member.section && (
                            <span className="text-xs font-semibold text-slate-500">
                              Sec {member.section}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Student ID */}
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-2 bg-primary/5 border border-primary/15 px-3 py-1.5 rounded-xl">
                          <span className="font-mono text-xs font-black text-primary tracking-wide">
                            {member.student_id || "NOT SET"}
                          </span>
                          {member.student_id && (
                            <button
                              onClick={() => copyToClipboard(member.student_id, `id-${member.id}`)}
                              title="Copy Student ID"
                              className="text-primary/60 hover:text-primary transition-colors cursor-pointer"
                            >
                              {copiedKey === `id-${member.id}` ? <LuCheck className="size-3.5 text-emerald-500" /> : <LuClipboard className="size-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Password & Status */}
                      <td className="px-6 py-4 max-w-xs">
                        <div className="space-y-1.5">
                          <div className="inline-flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl max-w-full">
                            <span className="font-mono text-xs font-bold text-slate-900 tracking-wider truncate max-w-[140px]" title={isVisible ? password : "••••••••"}>
                              {isVisible ? password : "••••••••"}
                            </span>
                            <button
                              onClick={() => togglePasswordVisibility(member.id)}
                              title={isVisible ? "Hide Password" : "Show Password"}
                              className="text-slate-400 hover:text-slate-700 transition-colors ml-1 cursor-pointer shrink-0"
                            >
                              {isVisible ? <LuEyeOff className="size-3.5" /> : <LuEye className="size-3.5" />}
                            </button>
                            <button
                              onClick={() => copyToClipboard(password, `pass-${member.id}`)}
                              title="Copy Password"
                              className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer shrink-0"
                            >
                              {copiedKey === `pass-${member.id}` ? <LuCheck className="size-3.5 text-emerald-500" /> : <LuClipboard className="size-3.5" />}
                            </button>
                          </div>
                          <div>
                            {isChanged ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                <LuShieldCheck className="size-3 text-emerald-600" />
                                Password Changed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                                Default Password
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 text-right">
                        <Button 
                          variant="outline"
                          onClick={() => handleOpenDetails(member)}
                          className="rounded-xl h-9 px-3.5 font-bold border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition-all text-xs cursor-pointer"
                        >
                          <LuUserCheck className="size-3.5 mr-1.5 text-primary" />
                          View Details
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="p-4 sm:p-6 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Showing <span className="text-slate-900">{filteredMembers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(filteredMembers.length, currentPage * itemsPerPage)}</span> of <span className="text-slate-900">{filteredMembers.length}</span> students
          </p>
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={currentPage <= 1} 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="rounded-xl px-3 py-1.5 h-9 border-slate-200 hover:bg-white transition-all disabled:opacity-50 text-xs font-bold cursor-pointer"
            >
              <LuChevronLeft className="size-4 mr-1" /> Prev
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((pageNum, index, array) => {
                const prevNum = array[index - 1];
                const showEllipsis = prevNum && pageNum - prevNum > 1;

                return (
                  <React.Fragment key={pageNum}>
                    {showEllipsis && <span className="px-1 text-slate-400 text-xs font-bold">...</span>}
                    <button
                      onClick={() => setCurrentPage(pageNum)}
                      className={`size-9 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        currentPage === pageNum
                          ? "bg-primary text-white shadow-xs"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  </React.Fragment>
                );
              })}

            <Button 
              variant="outline" 
              size="sm" 
              disabled={currentPage >= totalPages} 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="rounded-xl px-3 py-1.5 h-9 border-slate-200 hover:bg-white transition-all disabled:opacity-50 text-xs font-bold cursor-pointer"
            >
              Next <LuChevronRight className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Student Details & Credentials Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedMember(null);
        }}
        title="Student Credentials & Details"
        className="max-w-lg"
      >
        {selectedMember && (
          <div className="space-y-6 pt-2">
            {/* Student Header */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-center gap-4">
              <div className="size-14 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-xl shadow-lg shadow-primary/20 shrink-0">
                {selectedMember.first_name[0]}{selectedMember.last_name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-black text-slate-900 truncate">
                  {selectedMember.first_name} {selectedMember.middle_initial ? selectedMember.middle_initial + " " : ""}{selectedMember.last_name}
                </h3>
                <p className="text-xs font-semibold text-slate-400 truncate mt-0.5">
                  {selectedMember.email}
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {selectedMember.course && (
                    <span className="bg-primary/10 text-primary font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md">
                      {selectedMember.course}
                    </span>
                  )}
                  {selectedMember.year && (
                    <span className="bg-slate-200 text-slate-700 font-bold text-[10px] px-2 py-0.5 rounded-md">
                      Year {selectedMember.year}
                    </span>
                  )}
                  {selectedMember.section && (
                    <span className="bg-slate-200 text-slate-700 font-bold text-[10px] px-2 py-0.5 rounded-md">
                      Section {selectedMember.section}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Credentials Section */}
            <div className="space-y-4">
              {/* Student ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <LuHash className="size-3.5 text-slate-400" />
                  Student ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={selectedMember.student_id || "NOT SET"}
                    className="flex-1 h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-black text-slate-800 outline-none"
                  />
                  <Button
                    variant="outline"
                    className="rounded-xl px-3 border-slate-200 hover:bg-slate-100 cursor-pointer"
                    onClick={() => copyToClipboard(selectedMember.student_id || "", "modal-id")}
                  >
                    {copiedKey === "modal-id" ? <LuCheck className="size-4 text-emerald-500" /> : <LuClipboard className="size-4" />}
                  </Button>
                </div>
              </div>

              {/* Email / Username */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <LuMail className="size-3.5 text-slate-400" />
                  Login Email / Username
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={selectedMember.email}
                    className="flex-1 h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none"
                  />
                  <Button
                    variant="outline"
                    className="rounded-xl px-3 border-slate-200 hover:bg-slate-100 cursor-pointer"
                    onClick={() => copyToClipboard(selectedMember.email, "modal-email")}
                  >
                    {copiedKey === "modal-email" ? <LuCheck className="size-4 text-emerald-500" /> : <LuClipboard className="size-4" />}
                  </Button>
                </div>
              </div>

              {/* Password Section */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <LuKeyRound className="size-3.5 text-slate-400" />
                    Account Password
                  </label>
                  {hasChangedPassword(selectedMember) ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                      <LuShieldCheck className="size-3 text-emerald-600" />
                      Changed by Student
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                      Default Initial Password
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type={isModalPasswordVisible ? "text" : "password"}
                    readOnly
                    value={getStudentPassword(selectedMember)}
                    className="flex-1 h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-black text-slate-900 tracking-wider outline-none select-all"
                  />
                  <Button
                    variant="outline"
                    className="rounded-xl px-3 border-slate-200 hover:bg-slate-100 cursor-pointer"
                    onClick={() => setIsModalPasswordVisible(!isModalPasswordVisible)}
                    title={isModalPasswordVisible ? "Hide password" : "View password"}
                  >
                    {isModalPasswordVisible ? <LuEyeOff className="size-4" /> : <LuEye className="size-4 text-primary" />}
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl px-3 border-slate-200 hover:bg-slate-100 cursor-pointer"
                    onClick={() => copyToClipboard(getStudentPassword(selectedMember), "modal-pass")}
                    title="Copy password"
                  >
                    {copiedKey === "modal-pass" ? <LuCheck className="size-4 text-emerald-500" /> : <LuClipboard className="size-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex gap-3">
              <Button
                className="flex-1 rounded-xl h-11 font-black bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all text-xs cursor-pointer"
                onClick={() => {
                  const pass = getStudentPassword(selectedMember);
                  const isChanged = hasChangedPassword(selectedMember);
                  const text = `Student ID: ${selectedMember.student_id || "N/A"}\nEmail: ${selectedMember.email}\nPassword: ${pass}\nPassword Status: ${isChanged ? "Changed by Student" : "Default Password"}`;
                  copyToClipboard(text, "modal-all");
                }}
              >
                <LuClipboard className="size-4 mr-2" />
                {copiedKey === "modal-all" ? "Credentials Copied!" : "Copy All Credentials"}
              </Button>
              <Button
                variant="outline"
                className="rounded-xl h-11 px-6 font-black border-slate-200 hover:bg-slate-100 transition-all text-xs cursor-pointer"
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedMember(null);
                }}
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
