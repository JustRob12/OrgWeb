"use client"

import { LuUsers, LuCrown, LuStar, LuPenTool, LuWallet, LuSearch, LuMegaphone, LuCalendar, LuLaptop, LuChevronRight } from "react-icons/lu"
import { Card, CardContent, CardHeader, CardTitle } from "../Components/ui/card"
import { Badge } from "../Components/ui/badge"

export default function Members() {
  const officers = [
    {
      name: "Maria Santos",
      role: "President",
      icon: <LuCrown className="size-6" />,
      avatarBg: "bg-blue-600 shadow-blue-200",
      badgeVariant: "default",
    },
    {
      name: "Juan Reyes",
      role: "Vice President",
      icon: <LuStar className="size-6" />,
      avatarBg: "bg-purple-600 shadow-purple-200",
      badgeVariant: "secondary",
    },
    {
      name: "Ana Cruz",
      role: "Secretary",
      icon: <LuPenTool className="size-6" />,
      avatarBg: "bg-teal-600 shadow-teal-200",
      badgeVariant: "teal",
    },
    {
      name: "Carlos Lim",
      role: "Treasurer",
      icon: <LuWallet className="size-6" />,
      avatarBg: "bg-emerald-600 shadow-emerald-200",
      badgeVariant: "secondary",
    },
    {
      name: "Sofia Tan",
      role: "Auditor",
      icon: <LuSearch className="size-6" />,
      avatarBg: "bg-amber-600 shadow-amber-200",
      badgeVariant: "outline",
    },
    {
      name: "Miguel Ramos",
      role: "PRO",
      icon: <LuMegaphone className="size-6" />,
      avatarBg: "bg-rose-600 shadow-rose-200",
      badgeVariant: "destructive",
    },
    {
      name: "Lia Garcia",
      role: "Events Head",
      icon: <LuCalendar className="size-6" />,
      avatarBg: "bg-sky-600 shadow-sky-200",
      badgeVariant: "secondary",
    },
    {
      name: "Ryan Flores",
      role: "IT Officer",
      icon: <LuLaptop className="size-6" />,
      avatarBg: "bg-violet-600 shadow-violet-200",
      badgeVariant: "default",
    },
  ]

  return (
    <section className="bg-slate-50/50 py-24 md:py-32" id="members">
      <div className="container">
        <div className="mb-16 text-center max-w-2xl mx-auto animate-in fade-in duration-700 slide-in-from-bottom-5">
          <Badge variant="outline" className="mb-4 gap-2 bg-primary/5 py-1 px-4 text-primary font-bold uppercase tracking-widest border-primary/20">
            <LuUsers className="size-3 fill-primary" /> Meet the Team
          </Badge>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Our Officers & Leaders
          </h2>
          <p className="text-lg text-muted-foreground">
            Dedicated student leaders who work tirelessly to make OrgWeb
            Organization a success for every member.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {officers.map((o, i) => (
            <Card key={i} className="group hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 border-border/50 text-center relative overflow-hidden">
              <CardHeader className="p-8 pb-4">
                <div 
                  className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl text-white shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 ${o.avatarBg}`}
                >
                  {o.icon}
                </div>
                <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                  {o.name}
                </CardTitle>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                  {o.role}
                </p>
              </CardHeader>
              <CardContent className="pb-8 flex flex-col items-center">
                 <Badge 
                    variant={o.badgeVariant as any} 
                    className="text-[10px] font-bold uppercase tracking-widest px-3 py-0.5 shadow-sm"
                 >
                    {o.role}
                  </Badge>
              </CardContent>
              
              {/* Subtle accent line */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/10 transition-colors group-hover:bg-primary" />
            </Card>
          ))}
        </div>

        <div className="mt-16 flex justify-center animate-in fade-in duration-1000">
           <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary cursor-pointer group uppercase tracking-widest">
              Browse Entire Member Directory <LuChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />
           </div>
        </div>
      </div>
    </section>
  )
}
