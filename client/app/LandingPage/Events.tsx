"use client"

import { LuCalendar, LuMapPin, LuArrowRight, LuStar, LuHeart, LuBookOpen, LuGraduationCap } from "react-icons/lu"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../Components/ui/card"
import { Badge } from "../Components/ui/badge"
import { Button } from "../Components/ui/button"

export default function Events() {
  const events = [
    {
      title: "Leadership Summit 2026",
      date: "April 15, 2026",
      location: "Main Auditorium",
      desc: "An annual gathering of student leaders for workshops, talks, and team-building activities focused on organizational excellence.",
      tag: "Leadership",
      variant: "default",
      icon: <LuStar className="size-5 text-amber-500 fill-amber-500" />,
    },
    {
      title: "Community Service Drive",
      date: "April 28, 2026",
      location: "City Barangay Hall",
      desc: "Join us as we give back to the community through clean-up drives, donation campaigns, and youth outreach programs.",
      tag: "Community",
      variant: "teal",
      icon: <LuHeart className="size-5 text-rose-500 fill-rose-500" />,
    },
    {
      title: "Organizational Seminar",
      date: "May 5, 2026",
      location: "Learning Center 2F",
      desc: "A training seminar covering best practices for running student organizations, including documentation, finance, and events.",
      tag: "Training",
      variant: "secondary",
      icon: <LuBookOpen className="size-5 text-indigo-500 fill-indigo-500" />,
    },
  ]

  return (
    <section className="bg-background py-24 md:py-32" id="events">
      <div className="container">
        <div className="mb-16 text-center max-w-2xl mx-auto animate-in fade-in duration-700 slide-in-from-bottom-5">
          <Badge variant="outline" className="mb-4 gap-2 bg-primary/5 py-1 px-4 text-primary font-medium uppercase tracking-widest border-primary/20">
            <LuCalendar className="size-3 fill-primary" /> Upcoming Events
          </Badge>
          <h2 className="mb-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Don&apos;t Miss What&apos;s Coming
          </h2>
          <p className="text-lg text-muted-foreground">
            Stay up to date with the latest events and activities organized by
            OrgWeb. There&apos;s always something exciting happening!
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e, i) => (
            <Card key={i} className="flex flex-col group hover:shadow-xl transition-all duration-300 border-border/60">
              <CardHeader className="relative pb-4">
                <div className="mb-6 flex items-center justify-between">
                  <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/20 text-xs py-1 px-3 font-medium">
                    <LuCalendar className="mr-2 size-3" /> {e.date}
                  </Badge>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background shadow-sm border border-border/50 group-hover:scale-110 transition-transform">
                    {e.icon}
                  </div>
                </div>
                <CardTitle className="text-xl font-semibold group-hover:text-primary transition-colors leading-tight">
                  {e.title}
                </CardTitle>
                <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mt-2">
                  <LuMapPin className="size-4" />
                  {e.location}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <CardDescription className="text-sm leading-relaxed text-foreground opacity-90">
                  {e.desc}
                </CardDescription>
              </CardContent>
              <div className="px-6 py-2">
                 <Badge variant={e.variant as any} className="text-[10px] uppercase tracking-wider font-bold">
                    {e.tag}
                  </Badge>
              </div>
              <CardFooter className="pt-4 border-t border-border/50 flex justify-end">
                <Button variant="ghost" size="sm" className="text-primary font-bold hover:bg-primary/5 p-0 hover:p-2 group/btn transition-all">
                  Register <LuArrowRight className="ml-2 size-4 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-12 flex justify-center animate-in fade-in duration-1000">
          <Button variant="outline" size="lg" className="rounded-full shadow-sm hover:shadow-md border-input h-12 px-10 font-bold group" asChild>
            <a href="#contact" className="w-full sm:w-auto">
              View All Events <LuArrowRight className="ml-2 size-5 group-hover:translate-x-1 transition-transform" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  )
}
