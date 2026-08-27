"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { LuClock, LuLogOut, LuShieldAlert } from "react-icons/lu";

// 5 minutes total inactivity limit (in milliseconds)
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;
// Show warning modal 30 seconds before logout
const WARNING_THRESHOLD_MS = 30 * 1000;
const STORAGE_KEY = "acetrack_last_active";

export default function AutoLogoutProvider() {
  const pathname = usePathname();
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(30);

  const supabase = React.useMemo(() => createClient(), []);
  const isLoggingOutRef = useRef(false);
  const lastThrottleRef = useRef(0);

  // Check if current route is exempt from auto-logout (e.g. Add Members page where continuous background live sync runs)
  const isExemptFromAutoLogout = pathname === "/admin/members/add" || pathname?.startsWith("/admin/members/add");
  const isProtectedPath = (pathname?.startsWith("/admin") || pathname?.startsWith("/student")) && !isExemptFromAutoLogout;

  // Perform logout
  const handleAutoLogout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    setShowWarning(false);

    try {
      localStorage.removeItem("acetrack_user");
      localStorage.removeItem(STORAGE_KEY);
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Error during auto-logout:", err);
    } finally {
      toast.error("You have been logged out due to 5 minutes of inactivity.", {
        id: "auto-logout-inactivity",
        duration: 6000,
      });
      router.replace("/login");
      isLoggingOutRef.current = false;
    }
  }, [router, supabase]);

  // Record user activity
  const recordActivity = useCallback(() => {
    if (isLoggingOutRef.current) return;
    const now = Date.now();

    // Throttle localStorage writes to once every 2 seconds
    if (now - lastThrottleRef.current > 2000) {
      lastThrottleRef.current = now;
      try {
        localStorage.setItem(STORAGE_KEY, now.toString());
      } catch (e) {
        console.error("Failed to update last active timestamp:", e);
      }
    }

    setShowWarning((prev) => {
      if (prev) return false;
      return prev;
    });
  }, []);

  // Stay signed in button handler
  const handleStaySignedIn = () => {
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch (e) {
      console.error("Failed to update last active timestamp:", e);
    }
    setShowWarning(false);
    toast.success("Session extended. You are still signed in.", { id: "session-extended", duration: 3000 });
  };

  useEffect(() => {
    // If on an exempt page (like Add Members live sync), keep last active timestamp fresh and do not track inactivity logout
    if (isExemptFromAutoLogout) {
      setShowWarning(false);
      try {
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
      } catch (e) {
        console.error("Failed to update timestamp on exempt page:", e);
      }
      return;
    }

    // Only track if user is on protected routes and has active session
    const hasUser = typeof window !== "undefined" && localStorage.getItem("acetrack_user");
    if (!isProtectedPath || !hasUser) {
      setShowWarning(false);
      return;
    }

    // Initialize last active if unset
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    }

    // Attach event listeners for user interactions
    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "click",
    ];

    const onUserAction = () => {
      recordActivity();
    };

    events.forEach((ev) => {
      window.addEventListener(ev, onUserAction, { passive: true });
    });

    // Listen to storage events from other tabs
    const onStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setShowWarning(false);
      }
      if (e.key === "acetrack_user" && !e.newValue) {
        // User logged out in another tab
        router.replace("/login");
      }
    };
    window.addEventListener("storage", onStorageChange);

    // Periodic heartbeat timer to check elapsed idle time
    const interval = setInterval(() => {
      const storedLastActive = localStorage.getItem(STORAGE_KEY);
      const lastActive = storedLastActive ? parseInt(storedLastActive, 10) : Date.now();
      const elapsed = Date.now() - lastActive;

      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        handleAutoLogout();
      } else if (elapsed >= INACTIVITY_TIMEOUT_MS - WARNING_THRESHOLD_MS) {
        const remaining = Math.max(0, Math.ceil((INACTIVITY_TIMEOUT_MS - elapsed) / 1000));
        setSecondsRemaining(remaining);
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    }, 1000);

    return () => {
      events.forEach((ev) => {
        window.removeEventListener(ev, onUserAction);
      });
      window.removeEventListener("storage", onStorageChange);
      clearInterval(interval);
    };
  }, [isProtectedPath, pathname, recordActivity, handleAutoLogout, router]);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <LuClock className="size-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              Inactivity Warning
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Your session is about to expire
            </p>
          </div>
        </div>

        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <LuShieldAlert className="size-4 text-amber-600" /> Auto-Logout In:
            </span>
            <span className="text-xl font-black text-amber-600 font-mono">
              00:{secondsRemaining < 10 ? `0${secondsRemaining}` : secondsRemaining}
            </span>
          </div>
          <p className="text-xs text-amber-800 font-medium leading-relaxed">
            You have been inactive for nearly 5 minutes. To protect your account and save database quota, you will be automatically logged out.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            onClick={handleAutoLogout}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <LuLogOut className="size-3.5" /> Log Out Now
          </button>
          <button
            onClick={handleStaySignedIn}
            className="px-5 py-2.5 rounded-xl text-xs font-black bg-primary hover:bg-primary/95 text-white shadow-md shadow-primary/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            Stay Signed In
          </button>
        </div>
      </div>
    </div>
  );
}
