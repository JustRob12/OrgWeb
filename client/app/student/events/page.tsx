"use client";

import React, { useState, useEffect } from "react";
import { 
  LuCalendar, 
  LuMapPin, 
  LuClock, 
  LuSearch, 
  LuFilter,
  LuSparkles,
  LuImage,
  LuLoader
} from "react-icons/lu";
import { createClient } from "@/utils/supabase/client";
import { Input } from "@/app/Components/ui/input";
import { Button } from "@/app/Components/ui/button";

interface Event {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  active: number;
  image_url?: string;
  location?: string;
}

export default function StudentEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState("");
  const supabase = createClient();

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("active", 1)
        .order("start_time", { ascending: true });

      if (error) console.error("Error fetching events:", error);
      else setEvents(data || []);
      setLoading(false);
    };
    fetchEvents();
  }, []);

  const filteredEvents = events;

  return (
    <div className="space-y-10">
      {/* Intro */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Upcoming Events</h1>
            <p className="text-slate-500 font-medium tracking-tight">Stay connected with your organization's latest activities.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
           <LuLoader className="size-10 animate-spin text-orange-500" />
           <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Synchronizing schedule...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white rounded-[3rem] p-24 border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center">
           <div className="size-20 rounded-3xl bg-slate-50 flex items-center justify-center mb-6 shadow-xl shadow-slate-100">
              <LuCalendar className="size-10 text-slate-200" />
           </div>
           <h3 className="text-2xl font-black text-slate-900 tracking-tight">No Events Scheduled</h3>
           <p className="text-slate-500 mt-2 max-w-xs font-medium">Check back later for new workshops, assemblies, and activities.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
           {filteredEvents.map((event) => {
              const start = new Date(event.start_time);
              const end = new Date(event.end_time);
              
              const dateStr = start.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              
              const timeStr = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

              return (
                <div key={event.id} className="group flex flex-col bg-white rounded-3xl border border-slate-150 shadow-sm hover:shadow-xl hover:border-orange-200 transition-all duration-350 overflow-hidden">
                  {/* Image Header */}
                  <div className="relative aspect-[16/9] bg-slate-50 overflow-hidden">
                    {event.image_url ? (
                      <img src={event.image_url} alt={event.title} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="size-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                        <LuImage className="size-10 text-slate-200" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <span className="px-3.5 py-1 rounded-full bg-white/90 backdrop-blur-md shadow-sm border border-slate-100/50 text-orange-600 text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5">
                        <LuSparkles className="size-3 fill-orange-500 text-orange-500" /> Active Event
                      </span>
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="p-4 sm:p-6 flex flex-col flex-1 justify-between space-y-4">
                    <div className="space-y-3">
                      <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug group-hover:text-orange-600 transition-colors line-clamp-2">
                        {event.title}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium line-clamp-3 leading-relaxed">
                        {event.description || "No description provided."}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 space-y-2">
                      <div className="flex items-center gap-2.5 text-slate-500 text-xs font-bold">
                        <LuCalendar className="size-4 text-orange-500/80" /> 
                        <span>{dateStr}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-slate-500 text-xs font-bold">
                        <LuClock className="size-4 text-orange-500/80" /> 
                        <span>{timeStr}</span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2.5 text-slate-500 text-xs font-bold">
                          <LuMapPin className="size-4 text-orange-500/80" /> 
                          <span className="line-clamp-1">{event.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
           })}
        </div>
      )}
    </div>
  );
}
