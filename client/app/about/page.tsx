"use client";

import React from "react";
import Navbar from "../Components/Navbar";
import Footer from "../Components/Footer";
import Link from "next/link";
import {
  LuSparkles,
  LuAward,
  LuGraduationCap,
  LuCode,
  LuShieldCheck,
  LuQrCode,
  LuWallet,
  LuVote,
  LuCalendar,
  LuArrowRight,
  LuGlobe,
  LuUsers,
  LuUserCheck,
  LuLayers,
  LuBuilding2,
} from "react-icons/lu";
import { Button } from "../Components/ui/button";

export default function PublicAboutPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-slate-50/50 text-slate-900 pt-24 sm:pt-28 pb-20 overflow-hidden">
        {/* ================= HERO SECTION ================= */}
        <section className="relative px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto py-12 sm:py-16 text-center">
          {/* Ambient background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[600px] aspect-square bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-black uppercase tracking-widest">
              <LuSparkles className="size-4 text-primary" />
              About ACETRACK 3.0
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 leading-tight">
              Transforming Student Organization Operations
            </h1>

            <p className="text-base sm:text-xl text-slate-600 font-medium leading-relaxed">
              ACETRACK is an all-in-one centralized digital ecosystem engineered specifically for the{" "}
              <strong className="text-slate-900 font-black">Association of Computing and Engineering Students (ACES)</strong>.
            </p>
          </div>
        </section>

        {/* ================= 1. WHAT IS ACETRACK? ================= */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto mb-16">
          <div className="bg-white rounded-3xl sm:rounded-[2.5rem] border border-slate-200/90 shadow-sm p-6 sm:p-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                <LuLayers className="size-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  What is ACETRACK?
                </h2>
                <p className="text-xs sm:text-sm font-semibold text-slate-400">
                  Institutional Governance & Activity Operating Platform
                </p>
              </div>
            </div>

            <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
              <strong className="text-slate-900 font-bold">ACETRACK 3.0</strong> is a centralized web and mobile application designed to modernize the management of academic organizations. It replaces outdated paper log sheets, physical receipt handoffs, manual tallying, and unorganized spreadsheets with automated, tamper-proof digital workflows.
            </p>

            <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
              From instant QR check-ins at departmental assemblies to real-time financial auditing and university e-voting, ACETRACK empowers both students and leaders with complete transparency, reliability, and ease of use.
            </p>
          </div>
        </section>

        {/* ================= 2. WHO WILL USE ACETRACK? ================= */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto mb-16 space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Who Uses ACETRACK?
            </h2>
            <p className="text-sm sm:text-base text-slate-500 font-medium">
              Tailored workspaces engineered for every member of the academic community.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Students & Members */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-3">
              <div className="size-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <LuUserCheck className="size-6" />
              </div>
              <h3 className="text-base font-black text-slate-900">Students & Organization Members</h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                Access a personalized digital ID badge, view live attendance logs, verify dues clearance and payment receipts, vote in elections, and check compliance status anytime.
              </p>
            </div>

            {/* Attendance Scanners */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-3">
              <div className="size-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <LuQrCode className="size-6" />
              </div>
              <h3 className="text-base font-black text-slate-900">Attendance Officers & Scanners</h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                High-speed event check-in scanner role that records student arrivals in real time using camera or barcode scanning, eliminating check-in delays and lines.
              </p>
            </div>

            {/* Treasurers */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-3">
              <div className="size-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <LuWallet className="size-6" />
              </div>
              <h3 className="text-base font-black text-slate-900">Treasurers & Financial Officers</h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                Log dues and fee collections with instant receipt creation, track balances per student or section, and maintain full financial auditability.
              </p>
            </div>

            {/* Administrators & Advisers */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-3">
              <div className="size-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <LuBuilding2 className="size-6" />
              </div>
              <h3 className="text-base font-black text-slate-900">Executive Officers & Faculty Advisers</h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                Oversee membership databases, post official announcements, schedule assemblies, execute democratic e-voting, and export analytical reports.
              </p>
            </div>
          </div>
        </section>

        {/* ================= 3. CORE PLATFORM CAPABILITIES ================= */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto mb-16 space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Platform Features
            </h2>
            <p className="text-sm sm:text-base text-slate-500 font-medium">
              Everything required to operate a transparent and organized student society.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-2">
              <div className="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <LuQrCode className="size-5" />
              </div>
              <h3 className="text-sm font-black text-slate-900">Digital ID & QR Scanner</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Fast, automated attendance validation with instant logging and duplicate detection.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-2">
              <div className="size-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <LuWallet className="size-5" />
              </div>
              <h3 className="text-sm font-black text-slate-900">Financial Transparency</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Collection logging, receipt generation, and real-time audit trails for complete financial clarity.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-2">
              <div className="size-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <LuVote className="size-5" />
              </div>
              <h3 className="text-sm font-black text-slate-900">Democratic E-Voting</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Fraud-free student government voting system with real-time participation metrics and result tallies.
              </p>
            </div>
          </div>
        </section>

        {/* ================= 4. BOTTOM DEVELOPER SPOTLIGHT ================= */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto mb-16">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-10 text-white shadow-2xl">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
              {/* Developer Avatar */}
              <div className="relative shrink-0 text-center">
                <div className="size-28 sm:size-32 rounded-3xl bg-slate-800 border-2 border-slate-700 overflow-hidden shadow-xl mx-auto">
                  <img
                    src="https://res.cloudinary.com/dq6zwh2kc/image/upload/v1787342913/officer_h5owel.jpg"
                    alt="Roberto Jr M. Prisoris"
                    className="size-full object-cover"
                  />
                </div>
                <span className="inline-flex items-center gap-1 mt-3 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-black uppercase tracking-wider">
                  <LuAward className="size-3 text-amber-400" />
                  Cum Laude • Top 6
                </span>
              </div>

              {/* Developer Details */}
              <div className="space-y-3.5 text-center sm:text-left">
                <div className="space-y-1">
                  <span className="text-[11px] font-black uppercase tracking-widest text-primary">
                    Developed & Engineered By
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    Roberto Jr M. Prisoris
                  </h3>
                  <p className="text-xs sm:text-sm font-bold text-slate-300">
                    Lead Software Architect & Creator • BS Information Technology (BSIT)
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <span className="px-3 py-1 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-bold">
                    🎓 Graduated Cum Laude
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-bold">
                    🏆 Top 6 of the Class of 2026
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-pink-500/10 text-pink-300 border border-pink-500/20 text-xs font-bold flex items-center gap-1">
                    💖 Inspired by his girlfriend
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-normal">
                  ACETRACK was conceptualized, engineered, and developed by Roberto Jr M. Prisoris — with his beloved girlfriend as his greatest inspiration and driving force — as an institutional software initiative to empower students, officers, and faculty of the ACES organization with seamless, modern digital tools.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================= CALL TO ACTION ================= */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center">
          <div className="p-8 sm:p-12 rounded-3xl bg-slate-900 text-white shadow-xl space-y-6">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Ready to Access ACETRACK?
            </h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-md mx-auto font-medium leading-relaxed">
              Log in with your official school credentials to access your student ID, check event records, and manage organizational responsibilities.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
              <Button asChild size="lg" className="rounded-2xl font-black bg-primary hover:bg-primary/95 text-white shadow-xl shadow-primary/25">
                <Link href="/login">
                  Access Portal <LuArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-2xl font-bold border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-white">
                <Link href="/#home">
                  Back to Home
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
