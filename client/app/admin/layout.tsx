"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LuLayoutDashboard, 
  LuUsers, 
  LuMegaphone, 
  LuCalendar, 
  LuClipboardCheck, 
  LuCircleDollarSign, 
  LuFiles, 
  LuVote, 
  LuActivity, 
  LuSettings,
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

const menuItems = [
  { name: "Dashboard", icon: LuLayoutDashboard, href: "/admin" },
  { 
    name: "Members", 
    icon: LuUsers, 
    href: "/admin/members",
    subItems: [
      { name: "View Members", href: "/admin/members/view" },
      { name: "Add Members", href: "/admin/members/add" },
      { name: "Send Credentials", href: "/admin/members/send" },
    ]
  },
  { name: "Announcements", icon: LuMegaphone, href: "/admin/announcements" },
  { name: "Events", icon: LuCalendar, href: "/admin/events" },
  { name: "Attendance", icon: LuClipboardCheck, href: "/admin/attendance" },
  { name: "Finance", icon: LuCircleDollarSign, href: "/admin/finance" },
  { name: "Documents", icon: LuFiles, href: "/admin/documents" },
  { name: "Voting", icon: LuVote, href: "/admin/voting" },
  { name: "Reports", icon: LuActivity, href: "/admin/reports" },
  { name: "Settings", icon: LuSettings, href: "/admin/settings" },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    // Perform any logout logic here (e.g., supabase.auth.signOut())
    router.push("/login")
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
            <Link href="/" className="flex items-center gap-2">
              <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold shrink-0">O</div>
              <span className="font-bold text-xl tracking-tight">OrgWeb Admin</span>
            </Link>
            <button className="lg:hidden" onClick={() => setIsSidebarOpen(false)}>
              <LuX className="size-6 text-slate-400" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
            {menuItems.map((item) => {
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
            <div className="flex items-center gap-3 px-2 overflow-hidden">
              <div className="size-10 rounded-full bg-slate-200 overflow-hidden border border-slate-300 shrink-0">
                <LuUser size={40} className="text-slate-400 p-2" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold text-slate-700 leading-tight truncate">Admin</p>
                <p className="text-[10px] uppercase font-black text-primary tracking-widest leading-none mt-0.5">Roberto</p>
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
        description="Are you sure you want to log out of the OrgWeb Admin Dashboard?"
        confirmText="Logout"
        variant="danger"
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
                <p className="text-sm font-bold text-slate-700">Roberto Jr M. Prisoris</p>
                <p className="text-[10px] uppercase font-black text-primary tracking-widest leading-none mt-0.5">Admin</p>
              </div>
              <div className="size-10 rounded-full bg-slate-200 overflow-hidden border border-slate-300 cursor-pointer hover:opacity-80 transition-opacity">
                <LuUser size={40} className="text-slate-400 p-2" />
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
