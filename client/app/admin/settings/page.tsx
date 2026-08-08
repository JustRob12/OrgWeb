"use client";

import React, { useEffect, useState, useMemo } from "react";
import { 
  LuShieldCheck, 
  LuUserCheck, 
  LuClipboardCheck, 
  LuPhilippinePeso, 
  LuSearch, 
  LuUser, 
  LuUserCog, 
  LuLoader, 
  LuInfo, 
  LuFilter, 
  LuCircleCheck
} from "react-icons/lu";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/app/Components/ui/button";
import { Card } from "@/app/Components/ui/card";
import { toast } from "sonner";

interface UserWithRole {
  id: string;
  first_name: string;
  middle_initial?: string;
  last_name: string;
  email: string;
  student_id?: string;
  course?: string;
  year?: string;
  accounts: {
    id: string;
    role: number;
    username: string;
  } | null;
}

const ROLE_DESCRIPTIONS = [
  {
    role: 0,
    name: "Admin",
    badgeBg: "bg-purple-50 text-purple-700 border-purple-200",
    icon: LuShieldCheck,
    iconBg: "bg-purple-100 text-purple-600",
    desc: "Full administrative access to all system features, settings, members, and finance."
  },
  {
    role: 1,
    name: "Student / Member",
    badgeBg: "bg-slate-100 text-slate-700 border-slate-200",
    icon: LuUserCheck,
    iconBg: "bg-slate-100 text-slate-600",
    desc: "Regular student portal access for viewing personal profile, ID, events, and dues."
  },
  {
    role: 2,
    name: "Attendance Scanner",
    badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
    icon: LuClipboardCheck,
    iconBg: "bg-amber-100 text-amber-600",
    desc: "Restricted officer role. Can ONLY access Scan Attendance and Attendance Records."
  },
  {
    role: 3,
    name: "Treasurer",
    badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: LuPhilippinePeso,
    iconBg: "bg-emerald-100 text-emerald-600",
    desc: "Restricted officer role. Can ONLY access Manage Finance, Pay/Scan QR, and Records."
  }
];

export default function SettingsPage() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("All");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select(`
          id, first_name, middle_initial, last_name, email, student_id, course, year,
          accounts:accounts(id, role, username)
        `)
        .order("first_name", { ascending: true });

      if (error) throw error;

      const formatted = (data as any[]).map((item) => ({
        ...item,
        accounts: Array.isArray(item.accounts) ? item.accounts[0] || null : item.accounts
      }));

      setUsers(formatted);
    } catch (err: any) {
      toast.error(`Failed to load user roles: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (user: UserWithRole, newRole: number) => {
    setUpdatingUserId(user.id);
    try {
      const { error } = await supabase
        .from("accounts")
        .update({ role: newRole })
        .eq("user_id", user.id);

      if (error) throw error;

      // Local state update
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? { ...u, accounts: u.accounts ? { ...u.accounts, role: newRole } : null }
            : u
        )
      );

      // If updating current logged-in session, update localStorage
      const storedUserStr = localStorage.getItem("acetrack_user");
      if (storedUserStr) {
        try {
          const parsed = JSON.parse(storedUserStr);
          if (parsed.user_id === user.id || parsed.id === user.accounts?.id) {
            parsed.role = newRole;
            localStorage.setItem("acetrack_user", JSON.stringify(parsed));
          }
        } catch (e) {
          // ignore
        }
      }

      const roleObj = ROLE_DESCRIPTIONS.find((r) => r.role === newRole);
      toast.success(`Role for ${user.first_name} ${user.last_name} updated to ${roleObj?.name || newRole}!`);
    } catch (err: any) {
      toast.error(`Failed to update role: ${err.message}`);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const fullName = `${user.first_name} ${user.middle_initial ? user.middle_initial + " " : ""}${user.last_name}`.toLowerCase();
      const matchesSearch =
        fullName.includes(searchQuery.toLowerCase()) ||
        (user.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.student_id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.course || "").toLowerCase().includes(searchQuery.toLowerCase());

      const userRole = user.accounts?.role ?? 1;
      const matchesRole = roleFilter === "All" || userRole.toString() === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const getRoleObj = (roleNum: number) => {
    return ROLE_DESCRIPTIONS.find((r) => r.role === roleNum) || ROLE_DESCRIPTIONS[1];
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full mb-2">
            <LuUserCog className="size-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">System Configuration</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-1">Roles & Access Control</h1>
          <p className="text-slate-500 font-medium">Assign specific administrative, attendance, or finance permissions to members.</p>
        </div>
      </div>

      {/* Role Definitions Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {ROLE_DESCRIPTIONS.map((r) => {
          const Icon = r.icon;
          const count = users.filter((u) => (u.accounts?.role ?? 1) === r.role).length;
          return (
            <div key={r.role} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`size-11 rounded-2xl flex items-center justify-center ${r.iconBg}`}>
                    <Icon className="size-6" />
                  </div>
                  <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black border uppercase tracking-wider ${r.badgeBg}`}>
                    Role {r.role}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{r.name}</h3>
                  <p className="text-xs font-medium text-slate-500 mt-1 leading-relaxed">{r.desc}</p>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Assigned Users</span>
                <span className="text-lg font-black text-slate-900">{count}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Role Management Panel */}
      <Card className="rounded-[2.5rem] border-slate-200 shadow-2xl shadow-slate-200/50 bg-white overflow-hidden flex flex-col">
        {/* Table Filter Controls */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative group max-w-md w-full">
              <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Search member by name, email, student ID..." 
                className="w-full h-12 pl-12 pr-4 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 h-12 w-full sm:w-auto focus-within:ring-4 focus-within:ring-primary/10 transition-all">
                <LuFilter className="size-4 text-slate-400 shrink-0" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none cursor-pointer w-full"
                >
                  <option value="All">All Roles ({users.length})</option>
                  {ROLE_DESCRIPTIONS.map((r) => (
                    <option key={r.role} value={r.role.toString()}>
                      Role {r.role}: {r.name} ({users.filter(u => (u.accounts?.role ?? 1) === r.role).length})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* User Table */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Member Details</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Current Role</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Assign Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-8 py-20 text-center font-bold text-slate-400 italic">
                    <LuLoader className="size-8 text-primary animate-spin mx-auto mb-3" />
                    Loading user accounts...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-8 py-20 text-center">
                    <LuInfo className="size-8 text-slate-300 mx-auto mb-3" />
                    <h4 className="text-lg font-black text-slate-900">No Members Found</h4>
                    <p className="text-xs font-medium text-slate-500 mt-1">Try adjusting your search query or role filter.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const currentRoleNum = user.accounts?.role ?? 1;
                  const roleObj = getRoleObj(currentRoleNum);
                  const isUpdating = updatingUserId === user.id;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="size-11 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-black text-sm shrink-0">
                            {user.first_name[0]}{user.last_name[0]}
                          </div>
                          <div>
                            <div className="font-black text-slate-900 text-base">
                              {user.first_name} {user.middle_initial ? user.middle_initial + " " : ""}{user.last_name}
                            </div>
                            <div className="text-xs font-bold text-slate-400 tracking-tight flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span>{user.email}</span>
                              {user.student_id && (
                                <>
                                  <span>•</span>
                                  <span className="text-primary font-black">ID: {user.student_id}</span>
                                </>
                              )}
                              {user.course && (
                                <>
                                  <span>•</span>
                                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-extrabold text-[10px] uppercase tracking-wider">
                                    {user.course}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-8 py-5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border uppercase tracking-wider ${roleObj.badgeBg}`}>
                          <roleObj.icon className="size-3.5" />
                          {roleObj.name} (Role {currentRoleNum})
                        </span>
                      </td>

                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {isUpdating ? (
                            <div className="flex items-center gap-2 text-xs font-bold text-primary">
                              <LuLoader className="size-4 animate-spin" /> Saving...
                            </div>
                          ) : (
                            <select
                              value={currentRoleNum}
                              onChange={(e) => handleRoleChange(user, Number(e.target.value))}
                              className="h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer"
                            >
                              <option value={0}>Role 0: Admin</option>
                              <option value={1}>Role 1: Student / Member</option>
                              <option value={2}>Role 2: Attendance Scanner</option>
                              <option value={3}>Role 3: Treasurer (Finance)</option>
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Showing <span className="text-slate-900">{filteredUsers.length}</span> of <span className="text-slate-900">{users.length}</span> total members
          </p>
        </div>
      </Card>
    </div>
  );
}
