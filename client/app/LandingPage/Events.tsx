"use client";

import { useEffect, useState } from "react";
import { 
  LuCalendar, 
  LuMapPin, 
  LuArrowRight, 
  LuClock, 
  LuSparkles, 
  LuLoader,
  LuImage,
  LuLogIn
} from "react-icons/lu";
import { Badge } from "../Components/ui/badge";
import { Button } from "../Components/ui/button";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

interface EventItem {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  active: number;
  image_url?: string | null;
  location?: string | null;
}

export default function Events() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .eq("active", 1)
          .order("start_time", { ascending: true });

        if (!error && data) {
          setEvents(data);
        }
      } catch (err) {
        console.error("Failed to load landing events:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return (
    <section className="bg-background py-20 md:py-32 overflow-hidden w-full max-w-full" id="events">
      <div className="container">
        {/* Section Header */}
        <div className="mb-14 text-center max-w-2xl mx-auto animate-in fade-in duration-700 slide-in-from-bottom-5">
          <Badge variant="outline" className="mb-4 gap-2 bg-primary/10 py-1 px-4 text-primary font-black uppercase tracking-widest border-primary/20">
            <LuCalendar className="size-3.5 fill-primary text-primary" /> Upcoming Events
          </Badge>
          <h2 className="mb-4 text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground leading-tight">
            Don&apos;t Miss What&apos;s Coming
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground font-medium leading-relaxed">
            Stay up to date with the latest workshops, assemblies, and activities organized by ACES.
          </p>
        </div>

        {/* Dynamic Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <LuLoader className="size-8 text-primary animate-spin" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Fetching Scheduled Events...
            </p>
          </div>
        ) : events.length === 0 ? (
          /* Coming Soon Empty State */
          <div className="max-w-xl mx-auto text-center bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 shadow-sm animate-in fade-in zoom-in-95 duration-500">
            <div className="size-16 sm:size-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5 text-primary shadow-inner">
              <LuSparkles className="size-8 sm:size-10 text-primary" />
            </div>
            
            <span className="inline-block px-3.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-black uppercase tracking-wider mb-3">
              Coming Soon
            </span>

            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
              Events Coming Soon
            </h3>
            <p className="text-sm sm:text-base text-slate-500 font-medium max-w-md mx-auto leading-relaxed mb-6">
              There are no active events scheduled at the moment. Please stay tuned or check back soon for exciting upcoming department assemblies, seminars, and activities!
            </p>

            <Button asChild size="lg" className="rounded-2xl font-bold bg-primary hover:bg-primary/95 text-white shadow-md shadow-primary/20 transition-all hover:scale-105">
              <Link href="/login">
                <LuLogIn className="mr-2 size-4" /> Access Member Portal
              </Link>
            </Button>
          </div>
        ) : (
          /* Live Events Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {events.map((event) => {
              const start = new Date(event.start_time);
              const end = new Date(event.end_time);

              const dateStr = start.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              const timeStr = `${start.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })} - ${end.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}`;

              return (
                <div
                  key={event.id}
                  className="group flex flex-col bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-primary/40 transition-all duration-300 overflow-hidden"
                >
                  {/* Event Banner Image */}
                  <div className="relative aspect-[16/9] bg-slate-50 overflow-hidden">
                    {event.image_url ? (
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="size-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary/5 to-slate-100">
                        <LuImage className="size-10 text-slate-300" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span className="px-3 py-1 rounded-full bg-white/95 backdrop-blur-md shadow-sm border border-slate-200/60 text-primary text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                        <LuSparkles className="size-3 fill-primary text-primary" /> Active Event
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-5 sm:p-6 flex flex-col flex-1 justify-between space-y-4">
                    <div className="space-y-2.5">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight leading-snug group-hover:text-primary transition-colors line-clamp-2">
                        {event.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 font-medium line-clamp-3 leading-relaxed">
                        {event.description || "No description provided."}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <LuCalendar className="size-4 text-primary shrink-0" />
                        <span>{dateStr}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <LuClock className="size-4 text-primary shrink-0" />
                        <span>{timeStr}</span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                          <LuMapPin className="size-4 text-primary shrink-0" />
                          <span className="line-clamp-1">{event.location}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex justify-end">
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="text-primary font-black hover:bg-primary/10 group/btn transition-all cursor-pointer"
                      >
                        <Link href="/login">
                          Join via Portal
                          <LuArrowRight className="ml-1.5 size-4 group-hover/btn:translate-x-1 transition-transform" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
