"use client";

import React from "react";
import {
  LuSparkles,
  LuAward,
  LuGraduationCap,
  LuCode,
  LuShieldCheck,
  LuQrCode,
  LuWallet,
  LuVote,
  LuInfo,
  LuUsers,
  LuUserCheck,
  LuCalendar,
  LuLayers,
  LuBuilding2,
  LuDatabase,
  LuCpu,
} from "react-icons/lu";

export default function AdminAboutPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/80 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider mb-1">
            <LuInfo className="size-3.5" /> Institutional System Information
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            About ACETRACK
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Learn what ACETRACK is all about, who uses it, and its institutional architecture.
          </p>
        </div>

        <div className="px-3.5 py-1.5 rounded-2xl bg-orange-50 text-primary border border-orange-200/80 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-xs">
          <LuSparkles className="size-4" />
          Version 3.0 Production
        </div>
      </div>

      {/* 1. What is ACETRACK? */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
            <LuLayers className="size-5.5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              What is ACETRACK?
            </h2>
            <p className="text-xs font-semibold text-slate-400">
              The Next-Generation Organization Management System
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
          <strong className="text-slate-900 font-bold">ACETRACK 3.0</strong> is an institutional, cloud-native platform built specifically for the <strong className="text-slate-900 font-bold">Association of Computing and Engineering Students (ACES)</strong>. It unifies attendance tracking, dues collection, event announcements, transparent financial auditing, democratic e-voting, and disciplinary management into one seamless portal.
        </p>

        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
          By eliminating paper log sheets, manual spreadsheet errors, physical queues, and lost receipts, ACETRACK elevates transparency and accountability across all organization activities.
        </p>
      </div>

      {/* 2. Who Will Use ACETRACK? */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <LuUsers className="size-5 text-primary" />
          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            Who Uses ACETRACK?
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Students & Members */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <LuUserCheck className="size-5" />
              </div>
              <h3 className="text-sm font-black text-slate-900">Students & Organization Members</h3>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Use their personal digital QR IDs to check in to assemblies, view live attendance logs, check dues balance and payment receipts, vote in elections, and monitor clearance sanctions.
            </p>
          </div>

          {/* Attendance Officers & Scanners */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <LuQrCode className="size-5" />
              </div>
              <h3 className="text-sm font-black text-slate-900">Attendance Officers & Scanners</h3>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Scan student ID barcodes or QR codes at event entry/exit points in real time with automated duplicate detection and live timestamp recording.
            </p>
          </div>

          {/* Treasurers & Finance Team */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <LuWallet className="size-5" />
              </div>
              <h3 className="text-sm font-black text-slate-900">Treasurers & Finance Officers</h3>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Manage fee collections, track individual student balance records, issue instant digital receipts, and audit semester collections with 100% financial transparency.
            </p>
          </div>

          {/* Student Executives & Advisers */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <LuBuilding2 className="size-5" />
              </div>
              <h3 className="text-sm font-black text-slate-900">System Admins & Faculty Advisers</h3>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Full administrative oversight: manage members, schedule organization events, post announcements, execute e-voting ballots, and export comprehensive institutional audits.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Core System Features */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-slate-900 tracking-tight">
          System Capabilities
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
            <div className="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <LuQrCode className="size-5" />
            </div>
            <h3 className="text-sm font-black text-slate-900">High-Speed QR Attendance</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Camera-based & barcode attendance scanner with instantaneous validation and real-time record synchronization.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
            <div className="size-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <LuWallet className="size-5" />
            </div>
            <h3 className="text-sm font-black text-slate-900">Financial Audit & Dues</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Streamlined membership collection logs, balance auditing, and automatic digital receipt generation.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
            <div className="size-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <LuVote className="size-5" />
            </div>
            <h3 className="text-sm font-black text-slate-900">Secure E-Voting System</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Tamper-proof student elections with real-time analytics, voter participation checks, and live tallies.
            </p>
          </div>
        </div>
      </div>

      {/* 4. BOTTOM DEVELOPER SPOTLIGHT */}
      <div className="pt-6 border-t border-slate-200/80">
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Developer Avatar */}
            <div className="relative shrink-0 text-center">
              <div className="size-24 sm:size-28 rounded-2xl bg-slate-800 border-2 border-slate-700 overflow-hidden shadow-lg mx-auto">
                <img
                  src="https://res.cloudinary.com/dq6zwh2kc/image/upload/v1787342913/officer_h5owel.jpg"
                  alt="Roberto Jr M. Prisoris"
                  className="size-full object-cover"
                />
              </div>
            </div>

            {/* Developer Details */}
            <div className="space-y-3 text-center sm:text-left">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                  Developed & Engineered By
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Roberto Jr M. Prisoris
                </h3>
                <p className="text-xs font-bold text-slate-300">
                  Lead Software Architect & Creator • BS Information Technology (BSIT)
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold">
                  🎓 Graduated Cum Laude
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-bold">
                  🏆 Top 6 of the Class of 2026
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-pink-500/10 text-pink-300 border border-pink-500/20 text-[10px] font-bold flex items-center gap-1">
                  💖 Inspired by his girlfriend, Lady Marianne
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed font-normal">
                He learned and mastered full-stack development through the mentorship of <strong className="text-slate-200 font-semibold">Kaarlo Sasiang</strong> and <strong className="text-slate-200 font-semibold">Clarence Japinan</strong> (both BSIT Class of 2025 graduates). ACETRACK was conceptualized, engineered, and developed by Roberto Jr M. Prisoris — with his beloved girlfriend, Lady Marianne, as his greatest inspiration and driving force — to provide an institutional-grade platform ensuring transparency, efficiency, and high performance for student leadership and organization stakeholders.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
