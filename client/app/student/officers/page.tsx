"use client";

import React, { useState, useEffect } from "react";
import {
  LuUsers,
  LuCrown,
  LuAward,
  LuGraduationCap,
  LuBriefcase,
  LuSearch,
  LuShieldCheck,
  LuLoader,
  LuSparkles,
  LuCode,
} from "react-icons/lu";
import { createClient } from "@/utils/supabase/client";

interface Officer {
  id: string;
  name: string;
  position: string;
  order_index: number;
  image_url: string | null;
  department: string | null;
  term: string;
}

export default function StudentOfficersPage() {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const supabase = createClient();

  useEffect(() => {
    const fetchOfficers = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("officers")
          .select("*")
          .order("order_index", { ascending: true })
          .order("created_at", { ascending: true });

        if (!error && data) {
          setOfficers(data);
        } else {
          setOfficers([]);
        }
      } catch (err: any) {
        setOfficers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOfficers();
  }, []);

  const POSITION_RANK: Record<string, number> = {
    "Adviser": 1,
    "Co-Adviser": 2,
    "Governor": 3,
    "Vice-Governor": 4,
    "Secretary": 5,
    "Treasurer": 6,
    "Auditor": 7,
    "Business Manager": 8,
    "P.I.O.": 9,
    "Senator": 10,
    "Developer of ACETRACK": 11,
    "Developer": 11,
  };

  const filteredOfficers = officers
    .filter(
      (o) =>
        o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.department || "").toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const rankA = POSITION_RANK[a.position] ?? (a.order_index || 99);
      const rankB = POSITION_RANK[b.position] ?? (b.order_index || 99);
      if (rankA !== rankB) return rankA - rankB;
      return 0;
    });

  // Group officers by tiers in strict order
  const advisers = filteredOfficers.filter(
    (o) => o.position === "Adviser" || o.position === "Co-Adviser"
  );
  const executives = filteredOfficers.filter(
    (o) => o.position === "Governor" || o.position === "Vice-Governor"
  );
  const staffOfficers = filteredOfficers.filter((o) =>
    ["Secretary", "Treasurer", "Auditor", "Business Manager", "P.I.O."].includes(o.position)
  );
  const senators = filteredOfficers.filter((o) => o.position === "Senator");
  const developers = filteredOfficers.filter(
    (o) => o.position === "Developer of ACETRACK" || o.position === "Developer"
  );
  const otherOfficers = filteredOfficers.filter(
    (o) =>
      ![
        "Adviser",
        "Co-Adviser",
        "Governor",
        "Vice-Governor",
        "Secretary",
        "Treasurer",
        "Auditor",
        "Business Manager",
        "P.I.O.",
        "Senator",
        "Developer of ACETRACK",
        "Developer",
      ].includes(o.position)
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const getPositionBadge = (pos: string) => {
    if (pos === "Adviser" || pos === "Co-Adviser") {
      return "bg-purple-50 text-purple-700 border-purple-200/80";
    }
    if (pos === "Governor" || pos === "Vice-Governor") {
      return "bg-amber-50 text-amber-700 border-amber-200/80";
    }
    if (pos === "Senator") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
    }
    if (pos.includes("Developer")) {
      return "bg-cyan-50 text-cyan-700 border-cyan-200/80";
    }
    return "bg-blue-50 text-blue-700 border-blue-200/80";
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider mb-1">
            <LuSparkles className="size-3 text-primary" />
            Official Organization Directory
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-none">
            Organization Officers
          </h1>
          <p className="text-slate-500 font-medium text-sm">
            Meet the leaders and faculty advisers serving the ACES community.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72 group">
          <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search by name or position..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-11 pr-4 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-xs"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-36 gap-4">
          <LuLoader className="size-10 text-primary animate-spin" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Loading Organization Officers...
          </p>
        </div>
      ) : filteredOfficers.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
          <div className="size-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
            <LuUsers className="size-8" />
          </div>
          <h3 className="text-base font-black text-slate-800">No officers listed yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto font-medium">
            {searchQuery
              ? "No officer matched your search. Try searching by another keyword."
              : "Organization officers have not been added by the administrator yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* ================= 1. ADVISERS (Adviser & Co-Adviser) ================= */}
          {advisers.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80">
                <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                  <LuAward className="size-4" />
                </div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase">
                  Faculty Advisers
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-6 max-w-2xl mx-auto">
                {advisers.map((officer) => (
                  <OfficerCard key={officer.id} officer={officer} badgeClass={getPositionBadge(officer.position)} />
                ))}
              </div>
            </div>
          )}

          {/* ================= 2. EXECUTIVE LEADERSHIP (Governor & Vice-Governor) ================= */}
          {executives.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80">
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                  <LuCrown className="size-4" />
                </div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase">
                  Executive Leadership
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
                {executives.map((officer) => (
                  <OfficerCard
                    key={officer.id}
                    officer={officer}
                    badgeClass={getPositionBadge(officer.position)}
                    isExecutive
                  />
                ))}
              </div>
            </div>
          )}

          {/* ================= 3. EXECUTIVE OFFICERS (Secretary, Treasurer, Auditor, Business Manager, P.I.O.) ================= */}
          {staffOfficers.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80">
                <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                  <LuBriefcase className="size-4" />
                </div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase">
                  Executive Board & Officers
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {staffOfficers.map((officer) => (
                  <OfficerCard key={officer.id} officer={officer} badgeClass={getPositionBadge(officer.position)} />
                ))}
              </div>
            </div>
          )}

          {/* ================= 4. LEGISLATIVE SENATORS (2 Senators) ================= */}
          {senators.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                  <LuGraduationCap className="size-4" />
                </div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase">
                  Legislative Council (Senators)
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
                {senators.map((officer) => (
                  <OfficerCard key={officer.id} officer={officer} badgeClass={getPositionBadge(officer.position)} />
                ))}
              </div>
            </div>
          )}

          {/* ================= 5. ACETRACK DEVELOPER(S) ================= */}
          {developers.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80">
                <div className="p-1.5 rounded-lg bg-cyan-100 text-cyan-700">
                  <LuCode className="size-4" />
                </div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase">
                  ACETRACK Developer & Engineering
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
                {developers.map((officer) => (
                  <OfficerCard key={officer.id} officer={officer} badgeClass={getPositionBadge(officer.position)} />
                ))}
              </div>
            </div>
          )}

          {/* ================= 6. OTHER OFFICERS (if any) ================= */}
          {otherOfficers.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80">
                <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                  <LuUsers className="size-4" />
                </div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase">
                  Additional Officers
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {otherOfficers.map((officer) => (
                  <OfficerCard key={officer.id} officer={officer} badgeClass={getPositionBadge(officer.position)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OfficerCard({
  officer,
  badgeClass,
  isExecutive = false,
}: {
  officer: Officer;
  badgeClass: string;
  isExecutive?: boolean;
}) {
  return (
    <div
      className={`group bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 flex flex-col items-center text-center shadow-sm hover:shadow-xl hover:border-primary/40 transition-all duration-300 hover:-translate-y-1 ${
        isExecutive
          ? "ring-1 ring-amber-500/20 bg-gradient-to-b from-amber-500/[0.04] to-white"
          : ""
      }`}
    >
      {/* Big Square Picture Container */}
      <div className="relative w-full aspect-square rounded-2xl bg-slate-100 border border-slate-200/80 shadow-inner overflow-hidden flex items-center justify-center text-slate-400 font-black text-2xl mb-4 group-hover:scale-[1.02] transition-transform">
        {officer.image_url ? (
          <img
            src={officer.image_url}
            alt={officer.name}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-4">
            <span className="text-3xl font-black text-slate-300 uppercase tracking-wider">
              {officer.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Position Badge */}
      <span
        className={`inline-block text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full border mb-2 shadow-xs ${badgeClass}`}
      >
        {officer.position}
      </span>

      {/* Name & Details */}
      <h3 className="font-black text-slate-900 text-base sm:text-lg leading-snug group-hover:text-primary transition-colors">
        {officer.name}
      </h3>
      {officer.department && (
        <p className="text-xs font-semibold text-slate-500 mt-1">{officer.department}</p>
      )}
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
        {officer.term || "A.Y. 2025–2026"}
      </p>
    </div>
  );
}
