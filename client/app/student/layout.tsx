"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LuLayoutDashboard, 
  LuUserRound, 
  LuCalendar, 
  LuHistory, 
  LuLogOut, 
  LuMenu, 
  LuX, 
  LuWallet,
  LuIdCard,
  LuBell,
  LuSearch
} from "react-icons/lu";
import { cn } from "@/lib/utils";
import { Button } from "@/app/Components/ui/button";
import { createClient } from "@/utils/supabase/client";

const navItems = [
  { name: "Dashboard", href: "/student", icon: LuLayoutDashboard },
  { name: "My ID", href: "/student/id", icon: LuIdCard },
  { name: "Attendance", href: "/student/attendance", icon: LuHistory },
  { name: "Events", href: "/student/events", icon: LuCalendar },
  { name: "Finance", href: "/student/finance", icon: LuWallet },
  { name: "Profile", href: "/student/profile", icon: LuUserRound },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUserData = async () => {
      let email = "";
      // 1. Try Supabase Auth
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser?.email) {
        email = authUser.email;
      } else {
        // 2. Try localStorage
        const storedUser = localStorage.getItem("orgweb_user");
        if (storedUser) {
          try {
            email = JSON.parse(storedUser).email;
          } catch (e) {
            console.error("Layout session parse error:", e);
          }
        }
      }

      if (email) {
        // Fetch full profile from 'users' table
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("email", email)
          .single();
        
        if (!error && data) {
          setUser(data);
        }
      }
    };
    getUserData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("orgweb_user");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full p-6">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 mb-10">
            <div className="size-10 rounded-2xl gradient-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <span className="text-xl font-black">O</span>
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight leading-none">Portal</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Student Access</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all group",
                    isActive 
                      ? "bg-primary text-white shadow-xl shadow-primary/20" 
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <item.icon className={cn("size-5", isActive ? "text-white" : "text-slate-400 group-hover:text-slate-900")} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Logout Footer */}
          <div className="pt-6 mt-6 border-t border-slate-100">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-2xl text-sm font-bold text-rose-500 hover:bg-rose-50 transition-all"
            >
              <LuLogOut className="size-5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-72 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-20 items-center gap-4 bg-white/80 backdrop-blur-md px-6 border-b border-slate-200 md:px-8">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-50"
          >
            <LuMenu className="size-6" />
          </button>

          <div className="flex-1 flex items-center bg-slate-100/50 rounded-2xl px-4 py-2 group focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/10 transition-all">
            <LuSearch className="size-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search features..." 
              className="bg-transparent border-none focus:ring-0 text-sm w-full px-3 font-medium placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-3 md:gap-5">
            <button className="relative size-10 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50 transition-colors">
              <LuBell className="size-5" />
              <span className="absolute top-2 right-2 size-2 bg-rose-500 rounded-full border-2 border-white" />
            </button>
            <div className="h-8 w-px bg-slate-200 hidden md:block" />
            <div className="flex items-center gap-3">
              <div className="hidden md:block text-right">
                <p className="text-xs font-black text-slate-900 leading-none">
                  {user ? `${user.first_name} ${user.last_name}` : "Member"}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                  {user?.student_id || "Role 1"}
                </p>
              </div>
              <div className="size-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black overflow-hidden shadow-sm">
                {user?.profile_picture ? (
                  <img src={user.profile_picture} alt="Avatar" className="size-full object-cover" />
                ) : (
                  user?.email?.charAt(0).toUpperCase() || "S"
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 md:p-8">
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-700">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
