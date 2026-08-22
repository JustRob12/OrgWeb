"use client";

import React from "react";
import { 
  LuWrench, 
  LuCpu, 
  LuClock 
} from "react-icons/lu";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between relative overflow-hidden selection:bg-primary selection:text-white">
      {/* Background Soft Glows & Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[650px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 size-[380px] bg-amber-400/15 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute top-10 left-10 size-[320px] bg-orange-300/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.4] pointer-events-none bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px]" 
      />

      {/* Top Bar */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 sm:py-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-gradient-to-tr from-primary to-orange-400 p-0.5 shadow-lg shadow-primary/20">
            <div className="size-full bg-white rounded-[14px] flex items-center justify-center font-black text-primary text-sm">
              AC
            </div>
          </div>
          <div>
            <h1 className="font-black text-lg sm:text-xl tracking-tight text-slate-900 leading-none">
              ACETRACK <span className="text-primary">3.0</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              School Organization System
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-black tracking-wide shadow-xs">
          <span className="relative flex size-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full size-2 bg-amber-500" />
          </span>
          Maintenance Mode
        </div>
      </header>

      {/* Main Hero Card */}
      <main className="relative z-10 w-full max-w-3xl mx-auto px-6 py-12 sm:py-20 flex flex-col items-center text-center">
        {/* Animated Icon Illustration */}
        <div className="relative mb-6 sm:mb-8 group">
          <div className="absolute -inset-4 bg-gradient-to-r from-primary via-amber-400 to-primary rounded-full blur-2xl opacity-30 group-hover:opacity-50 transition duration-700 animate-pulse" />
          <div className="relative size-24 sm:size-28 rounded-3xl bg-white border border-slate-200/90 shadow-2xl shadow-orange-500/10 flex items-center justify-center text-primary">
            <LuWrench className="size-10 sm:size-12 animate-bounce" />
          </div>
        </div>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-bold mb-5 shadow-xs">
          <LuCpu className="size-3.5 text-primary animate-spin" />
          <span>System Optimization & Scheduled Upgrades</span>
        </div>

        {/* Headings */}
        <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 leading-tight">
          We&apos;re Tuning Things Up <br />
          <span className="bg-gradient-to-r from-orange-600 via-primary to-amber-500 bg-clip-text text-transparent">
            Be Back In A Flash!
          </span>
        </h2>

        <p className="mt-4 sm:mt-5 text-sm sm:text-base text-slate-500 max-w-xl font-medium leading-relaxed">
          ACETRACK is temporarily undergoing scheduled maintenance to deploy performance enhancements and database updates. We appreciate your patience.
        </p>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <p>© {new Date().getFullYear()} ACETRACK 3.0. All rights reserved.</p>
        <p className="flex items-center gap-2">
          <LuClock className="size-3.5 text-slate-400" />
          <span>Average maintenance window: 15–30 mins</span>
        </p>
      </footer>
    </div>
  );
}
