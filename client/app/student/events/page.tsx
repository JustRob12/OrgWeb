"use client";

import React, { useState, useEffect } from "react";
import { 
  LuCalendar, 
  LuMapPin, 
  LuClock, 
  LuSearch, 
  LuFilter,
  LuChevronRight,
  LuSparkles,
  LuImage
} from "react-icons/lu";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/app/Components/ui/button";
import { Input } from "@/app/Components/ui/input";

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-10">
      {/* Search & Intro */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Upcoming Events</h1>
            <p className="text-slate-500 font-medium tracking-tight">Stay connected with your organization's latest activities.</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
           <div className="relative flex-1 md:w-64">
              <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input placeholder="Search events..." className="pl-12 h-12 rounded-2xl bg-white border-slate-200 font-medium shadow-sm transition-all focus:shadow-xl focus:shadow-primary/5" />
           </div>
           <Button variant="outline" className="h-12 w-12 rounded-2xl bg-white border-slate-200 text-slate-400 hover:text-slate-900 transition-all">
              <LuFilter className="size-5" />
           </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
           <div className="size-12 rounded-2xl border-4 border-primary/20 border-t-primary animate-spin" />
           <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Synchronizing schedule...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-[3rem] p-24 border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center">
           <div className="size-20 rounded-3xl bg-slate-50 flex items-center justify-center mb-6 shadow-xl shadow-slate-100">
              <LuCalendar className="size-10 text-slate-200" />
           </div>
           <h3 className="text-2xl font-black text-slate-900 tracking-tight">No Events Scheduled</h3>
           <p className="text-slate-500 mt-2 max-w-xs font-medium">Check back later for new workshops, assemblies, and activities.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {events.map((event) => (
              <div key={event.id} className="group flex flex-col bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 transition-all duration-500 overflow-hidden">
                 <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                    {event.image_url ? (
                      <img src={event.image_url} alt={event.title} className="size-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                      <div className="size-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                        <LuImage className="size-12 text-slate-200" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                       <span className="px-4 py-1.5 rounded-full bg-white/90 backdrop-blur-md shadow-lg border border-white/20 text-indigo-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                          <LuSparkles className="size-3 fill-indigo-600" /> New Activity
                       </span>
                    </div>
                 </div>

                 <div className="p-8 flex flex-col flex-1 space-y-6">
                    <div className="space-y-2 flex-1">
                       <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight line-clamp-2">{event.title}</h3>
                       <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                             <LuCalendar className="size-4 text-primary/60" /> {formatDate(event.start_time)}
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                               <LuMapPin className="size-4 text-slate-300" /> <span className="line-clamp-1">{event.location}</span>
                            </div>
                          )}
                       </div>
                    </div>

                    <Button className="w-full h-12 rounded-2xl font-black text-slate-600 bg-slate-50 border border-slate-100 hover:bg-primary hover:text-white hover:shadow-xl hover:shadow-primary/20 transition-all group/btn">
                       Register / Details 
                       <LuChevronRight className="size-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                 </div>
              </div>
           ))}
        </div>
      )}
    </div>
  );
}
