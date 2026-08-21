"use client"

import { useState, useEffect } from "react"
import { LuLogIn, LuMenu, LuX, LuCalendar, LuUsers } from "react-icons/lu"
import { Button } from "./ui/button"
import { cn } from "@/lib/utils"

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMenuOpen(false)
      }
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const navLinks = [
    { href: "#events", label: "Events", icon: LuCalendar },
    { href: "#members", label: "Members", icon: LuUsers },
  ]

  return (
    <>
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b",
          scrolled || menuOpen
            ? "bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl py-3 shadow-xs border-slate-200/80 dark:border-slate-800"
            : "bg-transparent py-4 sm:py-5 border-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <a href="#" className="flex items-center group py-1 select-none">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-primary transition-colors group-hover:opacity-90">
              ACETRACK 3.0
            </span>
          </a>

          {/* Desktop Links */}
          <div className="hidden items-center gap-6 md:flex">
            <ul className="flex items-center gap-1 list-none m-0 p-0">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:text-primary hover:bg-slate-50 transition-all"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="h-5 w-px bg-slate-200" />
            <Button asChild variant="default" size="sm" className="h-10 px-5 rounded-xl font-bold shadow-md shadow-primary/20 hover:scale-105 transition-all">
              <a href="/login">
                <LuLogIn className="size-4 mr-1.5" />
                Login
              </a>
            </Button>
          </div>

          {/* Mobile Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden size-10 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation menu"
          >
            {menuOpen ? <LuX className="size-6 text-slate-900" /> : <LuMenu className="size-6 text-slate-900" />}
          </Button>
        </div>

        {/* Mobile Dropdown Menu */}
        {menuOpen && (
          <div className="border-t border-slate-100 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-4 py-6 md:hidden animate-in fade-in slide-in-from-top-3 duration-200 shadow-xl">
            <div className="flex flex-col gap-2 max-w-sm mx-auto">
              {navLinks.map((link) => {
                const Icon = link.icon
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-bold text-slate-700 hover:bg-primary/10 hover:text-primary active:scale-[0.98] transition-all"
                  >
                    <Icon className="size-5 text-primary" />
                    {link.label}
                  </a>
                )
              })}
              <div className="my-2 h-px bg-slate-100" />
              <Button asChild className="w-full h-12 justify-center font-bold text-base shadow-lg shadow-primary/20 rounded-2xl">
                <a href="/login" onClick={() => setMenuOpen(false)}>
                  <LuLogIn className="mr-2 size-5" />
                  Login to Portal
                </a>
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Menu Backdrop */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs z-40 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </>
  )
}
