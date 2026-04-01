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
  LuUser
} from "react-icons/lu"
import { cn } from "@/lib/utils"
import { Button } from "../Components/ui/button"

const menuItems = [
  { name: "Dashboard", icon: LuLayoutDashboard, href: "/admin" },
  { name: "Members", icon: LuUsers, href: "/admin/members" },
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
  const pathname = usePathname()

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
        <div className="h-full flex flex-col">
          {/* Logo Section */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">O</div>
              <span className="font-bold text-xl tracking-tight">OrgWeb Admin</span>
            </Link>
            <button className="lg:hidden" onClick={() => setIsSidebarOpen(false)}>
              <LuX className="size-6 text-slate-400" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
            {menuItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <item.icon className={cn("size-5", isActive ? "text-white" : "text-slate-400")} />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User Profile (Sidebar Bottom) */}
          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3 px-2">
              <div className="size-10 rounded-full bg-slate-200 overflow-hidden border border-slate-300">
                <LuUser size={40} className="text-slate-400 p-2" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-700 leading-tight">Admin</p>
                <p className="text-xs text-slate-400">admin@school.edu.ph</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

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
