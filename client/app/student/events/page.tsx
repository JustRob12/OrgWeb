"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  LuCalendar, 
  LuMapPin, 
  LuClock, 
  LuSearch, 
  LuSparkles,
  LuImage,
  LuLoader,
  LuCircleCheck,
  LuCircleX,
  LuEye,
  LuX,
  LuInfo,
  LuChevronRight,
  LuFilter
} from "react-icons/lu";
import { createClient } from "@/utils/supabase/client";
import { Input } from "@/app/Components/ui/input";
import { Button } from "@/app/Components/ui/button";
import { Modal } from "@/app/Components/ui/modal";

interface Event {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  active: number;
  image_url?: string;
  location?: string;
  created_at?: string;
}

export default function StudentEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        // Fetch ALL events (both active and inactive) so students can always view past and current activities
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .order("start_time", { ascending: false });

        if (error) {
          console.error("Error fetching events:", error);
        } else {
          setEvents(data || []);
        }
      } catch (err) {
        console.error("Failed to load events:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [supabase]);

  // Filter events based on search query and status tab
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // Status filter
      if (statusFilter === "active" && ev.active !== 1) return false;
      if (statusFilter === "inactive" && ev.active === 1) return false;

      // Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = ev.title?.toLowerCase().includes(query);
        const descMatch = ev.description?.toLowerCase().includes(query);
        const locMatch = ev.location?.toLowerCase().includes(query);
        return titleMatch || descMatch || locMatch;
      }
      return true;
    });
  }, [events, searchQuery, statusFilter]);

  const activeCount = useMemo(() => events.filter((e) => e.active === 1).length, [events]);
  const inactiveCount = useMemo(() => events.filter((e) => e.active === 0).length, [events]);

  const handleOpenDetail = (event: Event) => {
    setSelectedEvent(event);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-8 sm:space-y-10 pb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header & Overview */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-black uppercase tracking-wider border border-primary/20">
            <LuCalendar className="size-3.5" /> Official Organization Activities
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-none">
            Organization Events
          </h1>
          <p className="text-slate-500 text-sm sm:text-base font-medium tracking-tight">
            Explore upcoming assemblies, past workshops, seminars, and official activities.
          </p>
        </div>

        {/* Quick Stats Pill */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs self-stretch sm:self-auto justify-center">
          <div className="px-4 py-2 flex flex-col items-center">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-tight">Total</span>
            <span className="text-lg font-black text-slate-800 tracking-tight">{events.length}</span>
          </div>
          <div className="h-8 w-px bg-slate-100" />
          <div className="px-4 py-2 flex flex-col items-center">
            <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest leading-tight">Active</span>
            <span className="text-lg font-black text-emerald-600 tracking-tight">{activeCount}</span>
          </div>
          <div className="h-8 w-px bg-slate-100" />
          <div className="px-4 py-2 flex flex-col items-center">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-tight">Inactive</span>
            <span className="text-lg font-black text-slate-500 tracking-tight">{inactiveCount}</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
        {/* Filter Pills */}
        <div className="flex bg-slate-100/90 p-1.5 rounded-2xl gap-1.5 self-start sm:self-auto w-full sm:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === "all"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            All Events ({events.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === "active"
                ? "bg-emerald-500 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <span className="size-2 rounded-full bg-emerald-400" />
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("inactive")}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === "inactive"
                ? "bg-slate-700 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <span className="size-2 rounded-full bg-slate-400" />
            Inactive ({inactiveCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <LuSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Search events by title or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-9 h-11 rounded-2xl bg-white border-slate-200 text-xs sm:text-sm font-medium focus:ring-primary/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <LuX className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid View */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <LuLoader className="size-10 animate-spin text-primary" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Synchronizing schedule...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] p-16 sm:p-24 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-4">
          <div className="size-20 rounded-3xl bg-slate-50 flex items-center justify-center shadow-inner text-slate-300">
            <LuCalendar className="size-10" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              {searchQuery ? "No Matching Events Found" : "No Events Scheduled"}
            </h3>
            <p className="text-slate-500 text-sm max-w-sm font-medium">
              {searchQuery 
                ? "Try adjusting your search criteria or filter status." 
                : "Check back later for new workshops, assemblies, and activities."}
            </p>
          </div>
          {searchQuery && (
            <Button
              variant="outline"
              onClick={() => setSearchQuery("")}
              className="rounded-xl text-xs font-bold mt-2"
            >
              Clear Search Filter
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredEvents.map((event) => {
            const start = new Date(event.start_time);
            const end = new Date(event.end_time);
            const isActive = event.active === 1;

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
                onClick={() => handleOpenDetail(event)}
                className={`group flex flex-col bg-white rounded-3xl border transition-all duration-300 overflow-hidden cursor-pointer hover:scale-[1.01] ${
                  isActive
                    ? "border-slate-200 shadow-sm hover:shadow-xl hover:border-primary/50"
                    : "border-slate-200/80 bg-slate-50/40 opacity-95 hover:opacity-100 hover:shadow-lg hover:border-slate-300"
                }`}
              >
                {/* Image Header */}
                <div className="relative aspect-[16/9] bg-slate-100 overflow-hidden">
                  {event.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={event.image_url}
                      alt={event.title}
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
                      <LuImage className="size-10 text-slate-300" />
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute top-3.5 left-3.5 z-10">
                    {isActive ? (
                      <span className="px-3.5 py-1 rounded-full bg-emerald-500/95 text-white backdrop-blur-md shadow-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-emerald-400/40">
                        <span className="size-2 rounded-full bg-white animate-pulse" /> Active Event
                      </span>
                    ) : (
                      <span className="px-3.5 py-1 rounded-full bg-slate-900/80 text-slate-200 backdrop-blur-md shadow-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-slate-700/60">
                        <LuCircleX className="size-3 text-slate-400" /> Inactive (Closed)
                      </span>
                    )}
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-5 sm:p-6 flex flex-col flex-1 justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug group-hover:text-primary transition-colors line-clamp-2">
                      {event.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium line-clamp-3 leading-relaxed">
                      {event.description || "No description provided."}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <div className="flex items-center gap-2.5 text-slate-600 text-xs font-bold">
                      <LuCalendar className="size-4 text-primary shrink-0" />
                      <span>{dateStr}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-600 text-xs font-bold">
                      <LuClock className="size-4 text-primary shrink-0" />
                      <span>{timeStr}</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2.5 text-slate-600 text-xs font-bold">
                        <LuMapPin className="size-4 text-primary shrink-0" />
                        <span className="line-clamp-1">{event.location}</span>
                      </div>
                    )}
                  </div>

                  {/* View Details Prompt */}
                  <div className="pt-2 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-primary transition-colors">
                    <span>Click to view full details</span>
                    <LuChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Event Details Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedEvent(null);
        }}
        title="Event Information"
      >
        {selectedEvent && (
          <div className="space-y-6">
            {/* Modal Banner */}
            {selectedEvent.image_url && (
              <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedEvent.image_url}
                  alt={selectedEvent.title}
                  className="size-full object-cover"
                />
              </div>
            )}

            {/* Header info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {selectedEvent.active === 1 ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" /> Active Event (Scanning Open)
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                    <LuCircleX className="size-3 text-slate-500" /> Inactive Event (Scanning Closed)
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                {selectedEvent.title}
              </h2>
            </div>

            {/* Schedule & Location Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <LuCalendar className="size-3.5 text-primary" /> Date & Schedule
                </span>
                <p className="text-xs font-bold text-slate-800">
                  {new Date(selectedEvent.start_time).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <p className="text-xs font-medium text-slate-600">
                  {new Date(selectedEvent.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                  {new Date(selectedEvent.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <LuMapPin className="size-3.5 text-primary" /> Venue / Location
                </span>
                <p className="text-xs font-bold text-slate-800">
                  {selectedEvent.location || "Location to be announced"}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                Activity Overview & Guidelines
              </span>
              <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-600 font-medium leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
                {selectedEvent.description || "No specific details or instructions provided for this event."}
              </div>
            </div>

            {/* Close Button */}
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedEvent(null);
                }}
                className="h-10 px-6 rounded-xl font-bold text-xs cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
