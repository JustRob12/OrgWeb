"use client"

import { useState, useEffect } from "react"
import { LuLogIn, LuMenu, LuX, LuCalendar, LuUsers, LuInfo } from "react-icons/lu"
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
    { href: "/about", label: "About", icon: LuInfo },
    { href: "/#events", label: "Events", icon: LuCalendar },
    { href: "/#members", label: "Members", icon: LuUsers },
  ]

  return (
    <>
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b w-full max-w-full",
          scrolled || menuOpen
            ? "bg-white/95 backdrop-blur-xl py-3 shadow-sm border-slate-200/80"
            : "bg-white/80 md:bg-transparent backdrop-blur-md md:backdrop-blur-none py-3 sm:py-5 border-slate-100 md:border-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Logo & Adjacent Mobile Burger */}
          <div className="flex items-center gap-2.5">
            <a href="#" className="flex items-center group py-1 select-none">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-primary transition-colors group-hover:opacity-90">
                ACETRACK 3.0
              </span>
            </a>

            {/* Mobile Burger / Close Button (placed directly after ACETRACK 3.0) */}
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label={menuOpen ? "Close menu" : "Open navigation menu"}
              aria-expanded={menuOpen}
              className="md:hidden flex items-center justify-center size-9.5 sm:size-10 rounded-2xl bg-slate-100 hover:bg-slate-200/80 active:scale-95 text-slate-900 transition-all touch-manipulation cursor-pointer border border-slate-200/60 ml-1"
            >
              {menuOpen ? (
                <LuX className="size-5 text-slate-900" />
              ) : (
                <LuMenu className="size-5 text-slate-900" />
              )}
            </button>
          </div>

          {/* Desktop Links & Action */}
          <div className="flex items-center gap-3">
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
            </div>

            <Button asChild variant="default" size="sm" className="hidden md:inline-flex h-10 px-5 rounded-xl font-bold shadow-md shadow-primary/20 hover:scale-105 transition-all cursor-pointer">
              <a href="/login">
                <LuLogIn className="size-4 mr-1.5" />
                <span>Login</span>
              </a>
            </Button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {menuOpen && (
          <div className="border-t border-slate-100 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-5 py-6 md:hidden animate-in fade-in slide-in-from-top-2 duration-200 shadow-2xl">
            <div className="flex flex-col gap-2 max-w-sm mx-auto">
              {navLinks.map((link) => {
                const Icon = link.icon
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-base font-bold text-slate-700 hover:bg-primary/10 hover:text-primary active:scale-[0.98] transition-all bg-slate-50/70 border border-slate-100/80"
                  >
                    <Icon className="size-5 text-primary" />
                    {link.label}
                  </a>
                )
              })}
              <div className="my-2 h-px bg-slate-100" />
              <Button asChild className="w-full h-12 justify-center font-black text-base shadow-lg shadow-primary/20 rounded-2xl bg-primary hover:bg-primary/95 text-white cursor-pointer">
                <a href="/login" onClick={() => setMenuOpen(false)}>
                  <LuLogIn className="mr-2 size-5" />
                  Login to Portal
                </a>
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Menu Backdrop Overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-slate-950/30 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </>
  )
}
