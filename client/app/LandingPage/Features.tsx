"use client"

import { LuChartBar, LuCalendarDays, LuCircleCheck, LuFiles, LuUsers, LuWallet, LuZap } from "react-icons/lu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../Components/ui/card"
import { Badge } from "../Components/ui/badge"

export default function Features() {
  const features = [
    {
      icon: <LuUsers className="size-6" />,
      colorClass: "bg-blue-500/10 text-blue-600 border-blue-200",
      title: "Member Management",
      desc: "Keep track of all members with ease. Maintain profiles, attendance history, and roles in a single organized system.",
    },
    {
      icon: <LuCalendarDays className="size-6" />,
      colorClass: "bg-indigo-500/10 text-indigo-600 border-indigo-200",
      title: "Event Planning",
      desc: "Organize and manage school events seamlessly. Schedule, notify, and track participation from start to finish.",
    },
    {
      icon: <LuCircleCheck className="size-6" />,
      colorClass: "bg-teal-500/10 text-teal-600 border-teal-200",
      title: "Attendance Tracking",
      desc: "Monitor participation easily with automated tracking. Generate reports and identify engagement patterns.",
    },
    {
      icon: <LuWallet className="size-6" />,
      colorClass: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
      title: "Finance Management",
      desc: "Track funds and expenses transparently. Maintain clear financial records with built-in budgeting tools.",
    },
    {
      icon: <LuFiles className="size-6" />,
      colorClass: "bg-amber-500/10 text-amber-600 border-amber-200",
      title: "Document Storage",
      desc: "Keep important files organized and accessible. Share documents with officers and members securely.",
    },
    {
      icon: <LuChartBar className="size-6" />,
      colorClass: "bg-rose-500/10 text-rose-600 border-rose-200",
      title: "Reports & Analytics",
      desc: "Gain insights with visual reports on attendance, finances, and events to make informed decisions.",
    },
  ]

  return (
    <section className="bg-slate-50/50 py-24 md:py-32" id="features">
      <div className="container">
        <div className="mb-16 text-center max-w-2xl mx-auto animate-in fade-in duration-700 slide-in-from-bottom-5">
          <Badge variant="outline" className="mb-4 gap-2 bg-primary/5 py-1 px-4 text-primary font-bold uppercase tracking-widest border-primary/20">
            <LuZap className="size-3 fill-primary" /> What We Do
          </Badge>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Everything You Need to Run a Great Organization
          </h2>
          <p className="text-lg text-muted-foreground">
            Powerful tools designed specifically for student organizations —
            simple enough for everyone, robust enough to scale.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Card 
              key={i} 
              className="group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1 border-border/50"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent opacity-0 transition-opacity group-hover:opacity-100" />
              <CardHeader>
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl border transition-transform group-hover:scale-110 ${f.colorClass}`}>
                  {f.icon}
                </div>
                <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">
                  {f.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm font-medium leading-relaxed opacity-90">
                  {f.desc}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
