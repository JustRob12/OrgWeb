"use client"

import { useState, useEffect } from "react"
import { LuGraduationCap, LuLogIn, LuMenu, LuX } from "react-icons/lu"
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

  const navLinks = [
    { href: "#about", label: "About" },
    { href: "#features", label: "Features" },
    { href: "#events", label: "Events" },
    { href: "#members", label: "Members" },
    { href: "#contact", label: "Contact" },
  ]

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b",
        scrolled
          ? "bg-background/80 backdrop-blur-md py-3 shadow-sm border-border"
          : "bg-transparent py-5 border-transparent"
      )}
    >
      <div className="container flex items-center justify-between">
        <a href="#" className="flex items-center gap-2 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform group-hover:scale-105">
            <LuGraduationCap className="size-6" />
          </div>
          <span className="text-xl font-semibold tracking-tight text-primary">
            OrgWeb
          </span>
        </a>

        {/* Desktop Links */}
        <div className="hidden items-center gap-6 md:flex">
          <ul className="flex items-center gap-2 list-none">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="h-6 w-px bg-border" />
          <Button asChild variant="default" size="sm" className="gap-2 rounded-full">
            <a href="/login">
              <LuLogIn className="size-4" />
              Login
            </a>
          </Button>
        </div>

        {/* Mobile Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <LuX className="size-6" /> : <LuMenu className="size-6" />}
        </Button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="border-t bg-background/95 backdrop-blur-lg p-6 md:hidden animate-in fade-in slide-in-from-top-5 duration-300">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-4 py-3 text-lg font-medium text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary active:scale-95"
              >
                {link.label}
              </a>
            ))}
            <div className="my-2 h-px bg-border/50" />
            <Button asChild className="w-full h-12 justify-center font-medium text-base shadow-lg shadow-primary/20">
              <a href="/login" onClick={() => setMenuOpen(false)}>
                <LuLogIn className="mr-2 size-5" />
                Login to Portal
              </a>
            </Button>
          </div>
        </div>
      )}
    </nav>
  )
}
