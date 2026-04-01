"use client"

import { LuBell, LuMegaphone, LuAward, LuCalendar, LuChevronRight } from "react-icons/lu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../Components/ui/card"
import { Badge } from "../Components/ui/badge"

export default function Announcements() {
  const announcements = [
    {
      icon: <LuBell className="size-5" />,
      colorClass: "bg-blue-500/10 text-blue-600 border-blue-200",
      tag: "Important",
      date: "April 1, 2026",
      title: "Application for New Officers Now Open",
      desc: "Interested in becoming an OrgWeb officer? Applications for the upcoming academic year are now open. Submit your requirements at the secretariat.",
    },
    {
      icon: <LuMegaphone className="size-5" />,
      colorClass: "bg-purple-500/10 text-purple-600 border-purple-200",
      tag: "Announcement",
      date: "March 28, 2026",
      title: "Leadership Training Successfully Completed",
      desc: "Congratulations to the 35 members who completed our 3-day leadership training! Certificates will be distributed by April 5.",
    },
    {
      icon: <LuAward className="size-5" />,
      colorClass: "bg-teal-500/10 text-teal-600 border-teal-200",
      tag: "Achievement",
      date: "March 20, 2026",
      title: "OrgWeb Wins Best Organization of the Year",
      desc: "We are proud to announce that OrgWeb Organization has been awarded Best Student Organization of Academic Year 2025–2026 by the School Administration!",
    },
    {
      icon: <LuCalendar className="size-5" />,
      colorClass: "bg-amber-500/10 text-amber-600 border-amber-200",
      tag: "Reminder",
      date: "March 15, 2026",
      title: "Monthly Meeting Schedule Updated",
      desc: "The monthly general assembly has been moved to every 2nd and 4th Friday of the month, 4:00 PM at the Student Center.",
    },
  ]

  return (
    <section className="bg-slate-50/50 py-24 md:py-32" id="announcements">
      <div className="container">
        <div className="mb-16 text-center max-w-2xl mx-auto animate-in fade-in duration-700 slide-in-from-bottom-5">
          <Badge variant="outline" className="mb-4 gap-2 bg-primary/5 py-1 px-4 text-primary font-bold uppercase tracking-widest border-primary/20">
            <LuBell className="size-3 fill-primary" /> Latest Updates
          </Badge>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Announcements & News
          </h2>
          <p className="text-lg text-muted-foreground">
            Stay informed with the latest news, updates, and important
            announcements from OrgWeb Organization.
          </p>
        </div>

        <div className="mx-auto max-w-4xl space-y-6">
          {announcements.map((a, i) => (
            <Card key={i} className="group hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 border-border/50 overflow-hidden">
              <CardHeader className="p-5 sm:p-8 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
                <div className={`mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-transform group-hover:scale-110 ${a.colorClass}`}>
                  {a.icon}
                </div>
                <div className="flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                      <LuCalendar className="size-3" /> {a.date}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-medium uppercase tracking-widest py-0 px-2 opacity-80">
                      {a.tag}
                    </Badge>
                  </div>
                  <CardTitle className="mb-1 text-xl font-semibold group-hover:text-primary transition-colors leading-tight">
                    {a.title}
                  </CardTitle>
                  <CardDescription className="text-base text-foreground/80 leading-relaxed max-w-2xl">
                    {a.desc}
                  </CardDescription>
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    Read More <LuChevronRight className="size-3" />
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
