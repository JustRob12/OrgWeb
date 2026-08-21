"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LuLayoutDashboard,
  LuUsers,
  LuAward,
  LuMegaphone,
  LuCalendar,
  LuClipboardCheck,
  LuPhilippinePeso,
  LuFiles,
  LuVote,
  LuUserCog,
  LuMenu,
  LuX,
  LuSearch,
  LuBell,
  LuUser,
  LuChevronDown,
  LuLogOut
} from "react-icons/lu"
import { cn } from "@/lib/utils"
import { Button } from "../Components/ui/button"
import { useRouter } from "next/navigation"
import { ConfirmModal } from "../Components/ui/confirm-modal"
import { createClient } from "@/utils/supabase/client"

const menuItems = [
  { name: "Dashboard", icon: LuLayoutDashboard, href: "/admin" },
  {
    name: "Members",
    icon: LuUsers,
    href: "/admin/members",
    subItems: [
      { name: "View Members", href: "/admin/members/view" },
      { name: "Add Members", href: "/admin/members/add" },
      { name: "Student Credentials", href: "/admin/members/send" },
    ]
  },
  { name: "Officers", icon: LuAward, href: "/admin/officers" },
  { name: "Announcements", icon: LuMegaphone, href: "/admin/announcements" },
  { name: "Events", icon: LuCalendar, href: "/admin/events" },
  {
    name: "Attendance",
    icon: LuClipboardCheck,
    href: "/admin/attendance",
    subItems: [
      { name: "Scan Attendance", href: "/admin/attendance" },
      { name: "Attendance Records", href: "/admin/attendance/records" },
    ]
  },
  {
    name: "Finance",
    icon: LuPhilippinePeso,
    href: "/admin/finance",
    subItems: [
      { name: "Manage Finance", href: "/admin/finance" },
      { name: "Pay / Scan QR", href: "/admin/finance/scan" },
      { name: "Financial Records", href: "/admin/finance/records" },
    ]
  },
  { name: "Documents", icon: LuFiles, href: "/admin/documents" },
  { name: "Voting", icon: LuVote, href: "/admin/voting" },
  { name: "Roles", icon: LuUserCog, href: "/admin/settings" },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<number | null>(null)
  const [userInfo, setUserInfo] = useState<any>(null)

  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAccess = async () => {
      const storedUser = localStorage.getItem("acetrack_user");
      if (!storedUser) {
        router.replace("/login");
        return;
      }
      try {
        const parsed = JSON.parse(storedUser);
        const role = typeof parsed.role === "number" ? parsed.role : parseInt(parsed.role, 10);
        setUserRole(role);
        setUserInfo(parsed);

        // Role 1 is student only -> redirect to student portal
        if (role === 1) {
          router.replace("/student");
          return;
        }

        // Role 2 (Attendance Scanner) can ONLY access Attendance routes
        if (role === 2) {
          if (!pathname.startsWith("/admin/attendance")) {
            router.replace("/admin/attendance");
            return;
          }
        }

        // Role 3 (Treasurer) can ONLY access Finance routes
        if (role === 3) {
          if (!pathname.startsWith("/admin/finance")) {
            router.replace("/admin/finance");
            return;
          }
        }
      } catch (e) {
        router.replace("/login");
        return;
      }
      setLoading(false);
    };
    checkAccess();
  }, [router, pathname]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("acetrack_user");
      router.push("/login");
    } finally {
      setIsLoggingOut(false);
    }
  }

  const visibleMenuItems = React.useMemo(() => {
    if (userRole === 2) {
      return menuItems.filter(item => item.name === "Attendance");
    }
    if (userRole === 3) {
      return menuItems.filter(item => item.name === "Finance");
    }
    return menuItems;
  }, [userRole]);

  const getRoleLabel = (role: number | null) => {
    if (role === 0) return "System Admin";
    if (role === 2) return "Attendance Officer";
    if (role === 3) return "Treasurer";
    return "Officer";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center w-full">
        <div className="h-8 w-8 border-4 border-slate-350 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transition-transform lg:relative lg:translate-x-0 duration-300 transform",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <Link href={userRole === 2 ? "/admin/attendance" : userRole === 3 ? "/admin/finance" : "/admin"} className="flex items-center">
              <span className="font-black text-xl tracking-tight text-slate-900">ACETRACK</span>
            </Link>
            <button className="lg:hidden" onClick={() => setIsSidebarOpen(false)}>
              <LuX className="size-6 text-slate-400" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
            {visibleMenuItems.map((item) => {
              const isActive = pathname === item.href || (item.subItems && pathname.startsWith(item.href))
              const hasSubItems = !!item.subItems

              return (
                <div key={item.name} className="space-y-1">
                  <div className="relative">
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                          : "text-slate-600 hover:bg-slate-50"
                      )}
                      onClick={() => !hasSubItems && setIsSidebarOpen(false)}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className={cn("size-5 shrink-0", isActive ? "text-white" : "text-slate-400 group-hover:text-primary transition-colors")} />
                        <span>{item.name}</span>
                      </div>
                      {hasSubItems && (
                        <LuChevronDown className={cn("size-4 transition-transform duration-300", isActive ? "rotate-180" : "text-slate-300")} />
                      )}
                    </Link>

                    {/* Sub-items with animation */}
                    {hasSubItems && (
                      <div className={cn(
                        "overflow-hidden transition-all duration-500 ease-in-out",
                        isActive ? "max-h-40 opacity-100 mt-1" : "max-h-0 opacity-0"
                      )}>
                        <div className="pl-10 space-y-1 py-1">
                          {item.subItems?.map((sub) => {
                            const isSubActive = pathname === sub.href
                            return (
                              <Link
                                key={sub.name}
                                href={sub.href}
                                className={cn(
                                  "block px-3 py-2 rounded-lg text-xs font-bold transition-all relative",
                                  isSubActive
                                    ? "text-primary bg-primary/5 border-l-2 border-primary"
                                    : "text-slate-400 hover:text-slate-900 border-l-2 border-transparent hover:border-slate-100"
                                )}
                                onClick={() => setIsSidebarOpen(false)}
                              >
                                {sub.name}
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </nav>

          {/* User Profile (Sidebar Bottom) */}
          <div className="p-4 border-t border-slate-100 flex items-center justify-between group/user">
            <div className="flex items-center gap-3 px-2 overflow-hidden flex-1">
              <div className="size-10 rounded-full bg-slate-200 overflow-hidden border border-slate-300 shrink-0 flex items-center justify-center font-black text-slate-600">
                {userInfo?.first_name ? userInfo.first_name[0] : "A"}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold text-slate-700 leading-tight truncate">
                  {userInfo?.first_name || "User"} {userInfo?.last_name || ""}
                </p>
                <p className="text-[10px] uppercase font-black text-primary tracking-widest leading-none mt-0.5">
                  {getRoleLabel(userRole)}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsLogoutModalOpen(true)}
              className="p-2.5 hover:bg-rose-50 hover:text-rose-600 rounded-xl text-slate-400 transition-all group-hover/user:text-slate-600"
              title="Logout"
            >
              <LuLogOut className="size-5" />
            </button>
          </div>
        </div>
      </aside>

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        title="Sign Out"
        description="Are you sure you want to log out of the ACETRACK 3.0 Dashboard?"
        confirmText="Logout"
        variant="danger"
        isLoading={isLoggingOut}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between z-30 shrink-0">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg text-slate-600"
              onClick={() => setIsSidebarOpen(true)}
            >
              <LuMenu className="size-6" />
            </button>
            <div className="relative hidden md:block group w-72">
              <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-primary" />
              <input
                type="text"
                placeholder="Search anything..."
                className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <button className="relative p-2 hover:bg-slate-100 rounded-lg text-slate-600">
              <LuBell className="size-5" />
              <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <div className="h-8 w-px bg-slate-200 hidden md:block" />
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-700">
                  {userInfo?.first_name ? `${userInfo.first_name} ${userInfo.last_name || ""}` : "User"}
                </p>
                <p className="text-[10px] uppercase font-black text-primary tracking-widest leading-none mt-0.5">
                  {getRoleLabel(userRole)}
                </p>
              </div>
              <div className="size-10 rounded-full bg-slate-100 overflow-hidden border border-slate-300 flex items-center justify-center font-bold text-slate-600">
                {userInfo?.first_name ? userInfo.first_name[0] : "A"}
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  )
}
