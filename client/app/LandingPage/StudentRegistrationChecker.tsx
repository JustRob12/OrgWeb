"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  LuSearch,
  LuIdCard,
  LuCircleCheck,
  LuClock,
  LuArrowRight,
  LuX,
  LuLoader,
  LuSparkles,
  LuShieldCheck,
  LuUserCheck,
  LuExternalLink,
  LuFileText,
} from "react-icons/lu";
import { Button } from "../Components/ui/button";
import { createClient } from "@/utils/supabase/client";

interface FoundStudent {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string;
  course?: string | null;
  year?: string | null;
  section?: string | null;
}

type SearchStatus = "idle" | "found" | "not_found" | "error";

export default function StudentRegistrationChecker() {
  const [studentIdInput, setStudentIdInput] = useState("");
  const [searchedId, setSearchedId] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [foundStudent, setFoundStudent] = useState<FoundStudent | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanQuery = studentIdInput.trim();

    if (!cleanQuery) return;

    setIsSearching(true);
    setSearchedId(cleanQuery);
    setStatus("idle");
    setFoundStudent(null);
    setErrorMessage("");

    try {
      const supabase = createClient();

      // 1. Primary case-insensitive search by student_id
      const { data: primaryData, error: primaryErr } = await supabase
        .from("users")
        .select("id, first_name, last_name, student_id, course, year, section")
        .ilike("student_id", cleanQuery)
        .limit(1);

      if (primaryErr) throw primaryErr;

      let record: FoundStudent | null =
        primaryData && primaryData.length > 0 ? (primaryData[0] as FoundStudent) : null;

      // 2. Fallback check without hyphens if initial search had hyphens or vice-versa
      if (!record) {
        const noHyphens = cleanQuery.replace(/-/g, "");
        if (noHyphens !== cleanQuery) {
          const { data: altData } = await supabase
            .from("users")
            .select("id, first_name, last_name, student_id, course, year, section")
            .ilike("student_id", noHyphens)
            .limit(1);

          if (altData && altData.length > 0) {
            record = altData[0] as FoundStudent;
          }
        }
      }

      if (record) {
        setFoundStudent(record);
        setStatus("found");
      } else {
        setStatus("not_found");
      }
    } catch (err: unknown) {
      console.error("Student registration check error:", err);
      setErrorMessage("Could not verify record right now. Please try again or sign in directly.");
      setStatus("error");
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setStudentIdInput("");
    setSearchedId("");
    setStatus("idle");
    setFoundStudent(null);
    setErrorMessage("");
  };

  return (
    <div className="w-full max-w-xl mx-auto px-2 sm:px-4 mt-6 sm:mt-8">
      {/* Search Input Box */}
      <form
        onSubmit={handleSearch}
        className="relative group bg-slate-50 hover:bg-white focus-within:bg-white border border-slate-200 hover:border-slate-300 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 rounded-2xl p-1.5 transition-all shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
      >
        <div className="relative flex-1 flex items-center">
          <LuIdCard className="absolute left-3.5 size-4 text-slate-400 group-focus-within:text-primary transition-colors shrink-0" />
          <input
            type="text"
            value={studentIdInput}
            onChange={(e) => setStudentIdInput(e.target.value)}
            placeholder="Search Student ID (e.g. 2024-00123)..."
            className="w-full bg-transparent pl-10 pr-8 py-2.5 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
            aria-label="Student ID Search"
          />
          {studentIdInput && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              title="Clear search"
            >
              <LuX className="size-3.5" />
            </button>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSearching || !studentIdInput.trim()}
          className="h-10 sm:h-10 px-5 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold text-xs sm:text-xs shadow-md shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0 disabled:opacity-50 disabled:hover:scale-100"
        >
          {isSearching ? (
            <div className="flex items-center gap-1.5">
              <LuLoader className="size-3.5 animate-spin" />
              <span>Checking...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <LuSearch className="size-3.5" />
              <span>Check Record</span>
            </div>
          )}
        </Button>
      </form>

      {/* RESULT FEEDBACK CARD */}

      {/* 1. FOUND: Student Already Recorded */}
      {status === "found" && foundStudent && (
        <div className="mt-3.5 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/40 to-white border border-emerald-200/90 shadow-sm text-left animate-in fade-in zoom-in-95 duration-200 relative">
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-3.5 right-3.5 p-1 text-emerald-600/70 hover:text-emerald-900 rounded-lg hover:bg-emerald-100/60 transition-colors"
            title="Dismiss"
          >
            <LuX className="size-4" />
          </button>

          <div className="flex items-start gap-3.5">
            <div className="size-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20 mt-0.5">
              <LuCircleCheck className="size-5" />
            </div>

            <div className="flex-1 min-w-0 pr-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 text-[10px] font-black uppercase tracking-wider mb-1">
                <LuShieldCheck className="size-3 text-emerald-700" />
                Recorded & Verified
              </div>

              <h4 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-snug">
                You are already recorded! Please sign in now.
              </h4>

              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Welcome,{" "}
                <span className="font-bold text-slate-900">
                  {foundStudent.first_name} {foundStudent.last_name}
                </span>{" "}
                (<span className="font-mono font-semibold text-emerald-800">{foundStudent.student_id}</span>
                {foundStudent.course ? ` • ${foundStudent.course}` : ""}
                {foundStudent.year ? ` - ${foundStudent.year}` : ""}
                {foundStudent.section ? ` Sec ${foundStudent.section}` : ""})! Your account is officially registered in
                the ACES system.
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <Button
                  size="sm"
                  className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all hover:scale-105"
                  asChild
                >
                  <Link href="/login">
                    <LuUserCheck className="size-3.5 mr-1.5" /> Sign In Now <LuArrowRight className="size-3.5 ml-1" />
                  </Link>
                </Button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors px-2 py-1"
                >
                  Check another ID
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. NOT FOUND: Not yet recorded */}
      {status === "not_found" && (
        <div className="mt-3.5 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50/40 to-white border border-amber-200/90 shadow-sm text-left animate-in fade-in zoom-in-95 duration-200 relative">
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-3.5 right-3.5 p-1 text-amber-600/70 hover:text-amber-900 rounded-lg hover:bg-amber-100/60 transition-colors"
            title="Dismiss"
          >
            <LuX className="size-4" />
          </button>

          <div className="flex items-start gap-3.5">
            <div className="size-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20 mt-0.5">
              <LuClock className="size-5" />
            </div>

            <div className="flex-1 min-w-0 pr-4 space-y-2.5">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100/80 text-amber-900 text-[10px] font-black uppercase tracking-wider mb-1">
                  <LuClock className="size-3 text-amber-700" />
                  Pending / Not Yet Recorded
                </div>

                <h4 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-snug">
                  Not yet recorded, please wait...
                </h4>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Student ID{" "}
                <span className="font-mono font-bold text-amber-900 bg-amber-100/60 px-1.5 py-0.5 rounded">
                  &quot;{searchedId}&quot;
                </span>{" "}
                is not yet recorded in the database. Please be patient while the organization admin or officers record your account, and always check back here to see if you are registered.
              </p>

              {/* Google Form Link Callout */}
              <div className="p-3 rounded-xl bg-amber-100/60 border border-amber-200/80 space-y-2">
                <p className="text-[11px] sm:text-xs font-semibold text-amber-950 leading-snug">
                  Haven&apos;t registered yet? If you haven&apos;t filled up the official membership form, please click the link below to submit your details:
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    className="h-8 px-3.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-all hover:scale-105"
                    asChild
                  >
                    <a
                      href="https://docs.google.com/forms/d/e/1FAIpQLSeEnO62YjW8tWtf7oA5bVEtP63Ym6vz_2N_z4Fid30Lf_oaZQ/viewform"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <LuFileText className="size-3.5 mr-1.5" />
                      Fill Up Google Form
                      <LuExternalLink className="size-3 ml-1.5 opacity-80" />
                    </a>
                  </Button>
                  <span className="text-[11px] text-amber-800 font-medium">
                    (Please be patient and check back later as registration takes some time)
                  </span>
                </div>
              </div>

              <div className="pt-1 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs font-bold text-amber-800 hover:text-amber-950 underline underline-offset-2 transition-colors"
                >
                  Try another Student ID
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. ERROR */}
      {status === "error" && (
        <div className="mt-3.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between text-left animate-in fade-in duration-200">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 text-rose-600 hover:text-rose-900 rounded-md"
          >
            <LuX className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
