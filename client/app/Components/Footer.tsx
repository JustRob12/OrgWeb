"use client"

import { LuGraduationCap, LuGlobe, LuVideo, LuSend, LuHeart, LuSparkles, LuMoveRight } from "react-icons/lu"
import { FaFacebook, FaInstagram, FaXTwitter, FaYoutube } from "react-icons/fa6"
import { Button } from "./ui/button"
import { Separator } from "./ui/separator"
import { Badge } from "./ui/badge"

export default function Footer() {
  const navGroups = [
    {
      title: "Navigation",
      links: [
        { label: "Home", href: "#home" },
        { label: "About Us", href: "#about" },
        { label: "Features", href: "#features" },
        { label: "Events", href: "#events" },
        { label: "Members", href: "#members" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Announcements", href: "#announcements" },
        { label: "Gallery", href: "#gallery" },
        { label: "Contact", href: "#contact" },
        { label: "Login Portal", href: "/login" },
      ],
    },
    {
      title: "Organization",
      links: [
        { label: "Our Mission", href: "#about" },
        { label: "Our Vision", href: "#about" },
        { label: "Leadership", href: "#members" },
        { label: "Activities", href: "#events" },
      ],
    },
  ]

  const socials = [
    { icon: <FaFacebook className="size-4" />, href: "#", label: "Facebook" },
    { icon: <FaInstagram className="size-4" />, href: "#", label: "Instagram" },
    { icon: <FaXTwitter className="size-4" />, href: "#", label: "Twitter" },
    { icon: <FaYoutube className="size-4" />, href: "#", label: "YouTube" },
  ]

  return (
    <footer className="bg-slate-950 text-slate-50 py-16 md:py-24 relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-0 right-0 h-64 w-64 bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-48 w-48 bg-accent/10 blur-[100px] pointer-events-none" />

      <div className="container relative z-10">
        <div className="grid gap-12 lg:grid-cols-6 lg:items-start lg:gap-16">
          {/* Brand & Newsletter Side */}
          <div className="lg:col-span-2 space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <div>
              <a href="#" className="flex items-center gap-2 group mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-primary transition-transform group-hover:scale-105">
                  <LuGraduationCap className="size-6" />
                </div>
                <span className="text-xl font-semibold tracking-tight text-white">
                  OrgWeb <span className="opacity-60 font-light">Organization</span>
                </span>
              </a>
              <p className="max-w-xs text-sm leading-relaxed text-slate-400">
                Empowering student organizations with modern tools to manage
                members, events, and activities in one centralized platform.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-300">Stay Updated</h4>
              <div className="flex gap-2 max-w-sm">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 h-10 px-4 rounded-lg bg-slate-900 border border-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                />
                <Button size="icon" className="shrink-0 h-10 w-10 bg-primary hover:bg-primary-dark">
                  <LuSend className="size-4" />
                </Button>
              </div>
              <p className="text-[10px] text-slate-500 italic flex items-center gap-1.5 leading-relaxed">
                <LuSparkles className="size-3 text-amber-500" /> Subscribe to our newsletter for event invites.
              </p>
            </div>

            <div className="flex gap-3">
              {socials.map((s, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="icon"
                  className="size-9 rounded-lg bg-slate-900/50 border-slate-800 hover:bg-primary hover:text-primary-foreground hover:scale-110 transition-all cursor-pointer"
                  asChild
                >
                  <a href={s.href} aria-label={s.label}>
                    {s.icon}
                  </a>
                </Button>
              ))}
            </div>
          </div>

          {/* Nav Groups Area */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-8 sm:grid-cols-3 animate-in fade-in slide-in-from-bottom-5 delay-200 duration-1000">
            {navGroups.map((group, i) => (
              <div key={i} className="space-y-6">
                <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-200">
                  {group.title}
                </h4>
                <ul className="space-y-4">
                  {group.links.map((link, j) => (
                    <li key={j}>
                      <a
                        href={link.href}
                        className="text-sm text-slate-400 font-normal transition-colors hover:text-primary hover:translate-x-1 inline-flex items-center group/link"
                      >
                        <LuMoveRight className="size-0 group-hover/link:size-3 mr-0 group-hover/link:mr-2 transform transition-all duration-300 opacity-0 group-hover/link:opacity-100" />
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <Separator className="my-12 bg-slate-800" />

        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between animate-in fade-in duration-1000 slide-in-from-bottom-2">
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              © 2026 OrgWeb Organization. All rights reserved.
            </span>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium italic">
              Made with <LuHeart className="size-2 text-rose-500 fill-rose-500" /> for Student Excellence.
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Use</a>
            <a href="#" className="hover:text-primary transition-colors">Accessibility</a>
            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20 py-0 px-2 rounded-full shadow-lg shadow-emerald-500/10">Version 2.0</Badge>
          </div>
        </div>
      </div>
    </footer>
  )
}
