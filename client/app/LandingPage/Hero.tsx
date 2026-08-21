"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  LuArrowRight,
  LuClock,
  LuCalendar,
  LuUsers,
  LuSparkles,
  LuCpu,
  LuCode,
  LuLayers,
  LuCompass,
  LuActivity,
  LuLogIn,
  LuShieldCheck,
} from "react-icons/lu";
import { Button } from "../Components/ui/button";
import { createClient } from "@/utils/supabase/client";

const TARGET_COURSES = [
  {
    code: "BSIT",
    title: "Information Technology",
    icon: LuCode,
    badgeBg: "bg-blue-50 text-blue-700 border-blue-200",
    iconBg: "bg-blue-50 text-blue-600",
    accentHover: "hover:border-blue-300",
  },
  {
    code: "BSCE",
    title: "Computer Engineering",
    icon: LuCpu,
    badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
    iconBg: "bg-amber-50 text-amber-600",
    accentHover: "hover:border-amber-300",
  },
  {
    code: "BITM",
    title: "IT Management",
    icon: LuLayers,
    badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    iconBg: "bg-emerald-50 text-emerald-600",
    accentHover: "hover:border-emerald-300",
  },
  {
    code: "BSM",
    title: "Mathematics / Mgt.",
    icon: LuCompass,
    badgeBg: "bg-purple-50 text-purple-700 border-purple-200",
    iconBg: "bg-purple-50 text-purple-600",
    accentHover: "hover:border-purple-300",
  },
  {
    code: "BSMRS",
    title: "Medical Radiation",
    icon: LuActivity,
    badgeBg: "bg-rose-50 text-rose-700 border-rose-200",
    iconBg: "bg-rose-50 text-rose-600",
    accentHover: "hover:border-rose-300",
  },
];

export default function Hero() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [courseCounts, setCourseCounts] = useState<Record<string, number>>({
    BSIT: 0,
    BSCE: 0,
    BITM: 0,
    BSM: 0,
    BSMRS: 0,
  });
  const [totalMembers, setTotalMembers] = useState(0);
  const [loadingMembers, setLoadingMembers] = useState(true);

  // Live real-time clock ticker
  useEffect(() => {
    setCurrentTime(new Date());
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch real-time member count per course from Supabase
  useEffect(() => {
    const fetchMemberCounts = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from("users").select("course");

        if (!error && data) {
          const counts: Record<string, number> = {
            BSIT: 0,
            BSCE: 0,
            BITM: 0,
            BSM: 0,
            BSMRS: 0,
          };

          let total = 0;
          data.forEach((user: { course?: string | null }) => {
            if (user.course) {
              const formattedCourse = user.course.trim().toUpperCase();
              if (counts[formattedCourse] !== undefined) {
                counts[formattedCourse] += 1;
              }
              total += 1;
            }
          });

          setCourseCounts(counts);
          setTotalMembers(total);
        }
      } catch (err) {
        console.error("Failed to load member course stats:", err);
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchMemberCounts();
  }, []);

  return (
    <section
      className="relative min-h-[92vh] flex flex-col justify-between pt-8 sm:pt-16 md:pt-28 pb-16 px-4 sm:px-6 lg:px-8 bg-white text-slate-900 border-b border-slate-200/80"
      id="home"
    >
      {/* Subtle Background Radial Highlights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* ================= TOP REAL-TIME LIVE CLOCK & DATE PILL ================= */}
      <div className="relative z-10 max-w-5xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        {/* Real-time Clock Pill */}
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/90 shadow-sm transition-all">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600">Live PHT</span>
          </div>

          <div className="h-4 w-px bg-slate-200" />

          {/* Time */}
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 tracking-wide font-mono">
            <LuClock className="size-3.5 text-primary" />
            <span>
              {currentTime ? (
                currentTime.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true,
                })
              ) : (
                "--:--:-- --"
              )}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden md:block" />

          {/* Date */}
          <div className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <LuCalendar className="size-3.5 text-primary" />
            <span>
              {currentTime
                ? currentTime.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Loading Date..."}
            </span>
          </div>
        </div>

        {/* Portal Status Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-200/90 text-slate-700 text-xs font-bold shadow-xs">
          <LuShieldCheck className="size-4 text-primary" />
          <span>Official ACES Portal</span>
        </div>
      </div>

      {/* ================= CENTER BIG LOGO & TITLE SECTION ================= */}
      <div className="relative z-10 max-w-4xl mx-auto w-full text-center py-6 sm:py-10 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-700">
        {/* BIG Center Standalone Logo */}
        <div className="relative group mb-6 flex items-center justify-center">
          <div className="relative w-56 sm:w-72 md:w-80 lg:w-96 aspect-square transition-transform duration-500 group-hover:scale-105">
            <Image
              src="/pictures/ACESLOGO.png"
              alt="ACES Logo"
              width={380}
              height={380}
              priority
              className="object-contain w-full h-full drop-shadow-xl transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        </div>

        {/* Text Below the Logo */}
        <div className="space-y-3 max-w-3xl px-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-black uppercase tracking-widest">
            <LuSparkles className="size-3.5 text-primary" />
            Empowering Future Leaders
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-slate-900 leading-tight">
            ACES
          </h1>

          <p className="text-lg sm:text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight leading-snug">
            Association of Computing and Engineering Students
          </p>

          <p className="text-sm sm:text-base text-slate-500 max-w-xl mx-auto font-medium leading-relaxed">
            Uniting students across computing, engineering, and technology disciplines. Innovate, collaborate, and excel
            together.
          </p>
        </div>

        {/* Call to Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button
            size="lg"
            className="h-12 px-8 rounded-2xl text-sm font-black bg-primary hover:bg-primary/95 text-white shadow-xl shadow-primary/25 transition-all hover:scale-105"
            asChild
          >
            <a href="/login">
              <LuLogIn className="mr-2 size-4" /> Access Member Portal
            </a>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-12 px-7 rounded-2xl text-sm font-bold border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-all hover:scale-105"
            asChild
          >
            <a href="#events">
              Explore Events <LuArrowRight className="ml-2 size-4" />
            </a>
          </Button>
        </div>
      </div>

      {/* ================= BOTTOM COURSE MEMBER COUNTERS (CLEAN WHITE THEME) ================= */}
      <div className="relative z-10 max-w-5xl mx-auto w-full pt-4">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <LuUsers className="size-4 text-primary" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
              Department Members by Course
            </span>
          </div>
          <span className="text-xs font-bold text-slate-500">
            Total Members:{" "}
            <span className="text-primary font-black bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-lg">
              {loadingMembers ? "..." : totalMembers}
            </span>
          </span>
        </div>

        {/* 5 Course Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
          {TARGET_COURSES.map((course) => {
            const Icon = course.icon;
            const count = courseCounts[course.code] || 0;

            return (
              <div
                key={course.code}
                className={`relative group flex flex-col justify-between p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-xl ${course.accentHover} transition-all duration-300 hover:-translate-y-1`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg border ${course.badgeBg}`}>
                    {course.code}
                  </span>
                  <div className={`p-1.5 rounded-xl ${course.iconBg}`}>
                    <Icon className="size-4" />
                  </div>
                </div>

                <div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {loadingMembers ? "0" : count}
                  </div>
                  <div className="text-xs font-bold text-slate-500 truncate mt-0.5" title={course.title}>
                    {course.title}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 text-[10px] font-semibold text-slate-400 flex items-center justify-between">
                  <span>Enrolled</span>
                  <span className="text-slate-700 font-bold">{count > 0 ? "Active" : "0"}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
