"use client";

import { useEffect, useState } from "react";
import {
  LuUsers,
  LuCrown,
  LuAward,
  LuGraduationCap,
  LuBriefcase,
  LuChevronRight,
  LuLoader,
  LuCode,
} from "react-icons/lu";
import { Card, CardContent, CardHeader, CardTitle } from "../Components/ui/card";
import { Badge } from "../Components/ui/badge";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

interface Officer {
  id: string;
  name: string;
  position: string;
  order_index: number;
  image_url: string | null;
  department: string | null;
  term: string;
}

export default function Members() {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchOfficers = async () => {
      try {
        const { data, error } = await supabase
          .from("officers")
          .select("*")
          .order("order_index", { ascending: true })
          .order("created_at", { ascending: true });

        if (!error && data) {
          setOfficers(data);
        }
      } catch (err) {
        console.error("Failed to load officers on landing page:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOfficers();
  }, []);

  const getPositionBadge = (pos: string) => {
    if (pos === "Adviser" || pos === "Co-Adviser") {
      return "bg-purple-50 text-purple-700 border-purple-200";
    }
    if (pos === "Governor" || pos === "Vice-Governor") {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    if (pos === "Senator") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (pos.includes("Developer")) {
      return "bg-cyan-50 text-cyan-700 border-cyan-200";
    }
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

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

  const sortedOfficers = [...officers].sort((a, b) => {
    const rankA = POSITION_RANK[a.position] ?? (a.order_index || 99);
    const rankB = POSITION_RANK[b.position] ?? (b.order_index || 99);
    if (rankA !== rankB) return rankA - rankB;
    return 0;
  });

  const advisers = sortedOfficers.filter(
    (o) => o.position === "Adviser" || o.position === "Co-Adviser"
  );
  const executives = sortedOfficers.filter(
    (o) => o.position === "Governor" || o.position === "Vice-Governor"
  );
  const staffOfficers = sortedOfficers.filter((o) =>
    ["Secretary", "Treasurer", "Auditor", "Business Manager", "P.I.O."].includes(o.position)
  );
  const senators = sortedOfficers.filter((o) => o.position === "Senator");
  const developers = sortedOfficers.filter(
    (o) => o.position === "Developer of ACETRACK" || o.position === "Developer"
  );
  const otherOfficers = sortedOfficers.filter(
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

  return (
    <section className="bg-slate-50/60 py-20 md:py-28 border-t border-slate-200/80" id="members">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center max-w-2xl mx-auto animate-in fade-in duration-700">
          <Badge
            variant="outline"
            className="mb-4 gap-2 bg-primary/10 py-1.5 px-4 text-primary font-black uppercase tracking-widest border-primary/20"
          >
            <LuAward className="size-3.5" /> Leadership & Faculty
          </Badge>
          <h2 className="mb-3 text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
            Our Officers & Leaders
          </h2>
          <p className="text-base sm:text-lg text-slate-500 font-medium leading-relaxed">
            Dedicated student leaders and faculty advisers steering the ACES organization toward academic and professional excellence.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <LuLoader className="size-8 text-primary animate-spin" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Loading Leadership Directory...
            </p>
          </div>
        ) : officers.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs max-w-md mx-auto">
            <div className="size-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
              <LuUsers className="size-7" />
            </div>
            <h4 className="text-base font-black text-slate-900">Officers Directory Coming Soon</h4>
            <p className="text-xs text-slate-500 mt-1">
              Organization officers will be displayed here once updated by the secretariat.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* 1. Advisers */}
            {advisers.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80">
                  <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                    <LuAward className="size-4" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Faculty Advisers</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
                  {advisers.map((o) => (
                    <LandingOfficerCard key={o.id} officer={o} badgeClass={getPositionBadge(o.position)} />
                  ))}
                </div>
              </div>
            )}

            {/* 2. Executive Leadership */}
            {executives.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80">
                  <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                    <LuCrown className="size-4" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Executive Leadership</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
                  {executives.map((o) => (
                    <LandingOfficerCard key={o.id} officer={o} badgeClass={getPositionBadge(o.position)} isExecutive />
                  ))}
                </div>
              </div>
            )}

            {/* 3. Staff Officers */}
            {staffOfficers.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80">
                  <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                    <LuBriefcase className="size-4" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Executive Board & Officers</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                  {staffOfficers.map((o) => (
                    <LandingOfficerCard key={o.id} officer={o} badgeClass={getPositionBadge(o.position)} />
                  ))}
                </div>
              </div>
            )}

            {/* 4. Senators */}
            {senators.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80">
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                    <LuGraduationCap className="size-4" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Legislative Council (Senators)</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
                  {senators.map((o) => (
                    <LandingOfficerCard key={o.id} officer={o} badgeClass={getPositionBadge(o.position)} />
                  ))}
                </div>
              </div>
            )}

            {/* 5. ACETRACK Developer(s) */}
            {developers.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80">
                  <div className="p-1.5 rounded-lg bg-cyan-100 text-cyan-700">
                    <LuCode className="size-4" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">ACETRACK Developer & Engineering</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
                  {developers.map((o) => (
                    <LandingOfficerCard key={o.id} officer={o} badgeClass={getPositionBadge(o.position)} />
                  ))}
                </div>
              </div>
            )}

            {/* 6. Other Officers */}
            {otherOfficers.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80">
                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                    <LuUsers className="size-4" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Additional Officers</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {otherOfficers.map((o) => (
                    <LandingOfficerCard key={o.id} officer={o} badgeClass={getPositionBadge(o.position)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-14 flex justify-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-black text-primary hover:text-primary/80 transition-colors group uppercase tracking-widest"
          >
            Access Full Member Portal & Directory{" "}
            <LuChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function LandingOfficerCard({
  officer,
  badgeClass,
  isExecutive = false,
}: {
  officer: Officer;
  badgeClass: string;
  isExecutive?: boolean;
}) {
  return (
    <Card
      className={`group hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 border-slate-200/90 text-center relative overflow-hidden bg-white rounded-3xl p-4 sm:p-5 flex flex-col items-center ${
        isExecutive ? "ring-1 ring-amber-500/20 bg-gradient-to-b from-amber-500/[0.04] to-white" : ""
      }`}
    >
      {/* Big Square Picture */}
      <div className="relative w-full aspect-square rounded-2xl bg-slate-100 border border-slate-200/80 shadow-inner overflow-hidden flex items-center justify-center text-slate-400 font-black text-2xl mb-4 group-hover:scale-[1.02] transition-transform">
        {officer.image_url ? (
          <img src={officer.image_url} alt={officer.name} className="size-full object-cover" />
        ) : (
          <span className="text-3xl font-black text-slate-300 uppercase tracking-wider">
            {officer.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </span>
        )}
      </div>

      <span
        className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border shadow-xs mb-2 ${badgeClass}`}
      >
        {officer.position}
      </span>

      <CardTitle className="text-base font-black text-slate-900 group-hover:text-primary transition-colors leading-snug">
        {officer.name}
      </CardTitle>
      {officer.department && (
        <p className="text-xs font-semibold text-slate-500 mt-1">{officer.department}</p>
      )}
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
        {officer.term || "A.Y. 2025–2026"}
      </p>

      {/* Bottom accent line on hover */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/20 transition-colors group-hover:bg-primary" />
    </Card>
  );
}

