"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LuLoader } from "react-icons/lu";

export default function StudentRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/student/id");
  }, [router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
      <LuLoader className="size-8 text-primary animate-spin" />
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading Student ID...</p>
    </div>
  );
}
