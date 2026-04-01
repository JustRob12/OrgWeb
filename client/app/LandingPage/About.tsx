"use client"

import { LuHeart, LuShield, LuZap, LuGraduationCap, LuTarget, LuSparkles } from "react-icons/lu"
import { Card, CardContent, CardHeader, CardTitle } from "../Components/ui/card"
import { Badge } from "../Components/ui/badge"

export default function About() {
  const cards = [
    {
      icon: <LuHeart className="size-6 text-rose-500" />,
      title: "Student-Led",
      desc: "Run entirely by passionate students for the community",
      bg: "bg-rose-50/50 border-rose-100",
    },
    {
      icon: <LuZap className="size-6 text-amber-500" />,
      title: "Active & Engaged",
      desc: "Consistent events, activities, and leadership growth",
      bg: "bg-amber-50/50 border-amber-100",
    },
    {
      icon: <LuShield className="size-6 text-teal-600" />,
      title: "Trusted",
      desc: "Recognized and trusted by faculty and administration",
      bg: "bg-teal-50/50 border-teal-100",
    },
  ]

  return (
    <section className="bg-background py-24 md:py-32" id="about">
      <div className="container">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          {/* Visual Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="col-span-1 row-span-2 flex flex-col justify-center bg-primary text-primary-foreground border-none shadow-xl transition-transform hover:-translate-y-1">
              <CardContent className="p-8 text-center sm:text-left">
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                  <LuGraduationCap className="size-8" />
                </div>
                <CardTitle className="mb-4 text-2xl font-bold">
                  OrgWeb Organization
                </CardTitle>
                <p className="text-sm opacity-90 leading-relaxed md:text-base">
                  Where student leaders are made, ideas are born, and the future
                  of our school community is shaped together.
                </p>
              </CardContent>
            </Card>

            {cards.map((c, i) => (
              <Card 
                key={i} 
                className={`transition-all hover:shadow-lg hover:-translate-y-1 ${c.bg}`}
              >
                <CardContent className="p-6 text-center sm:text-left">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-background shadow-sm mx-auto sm:mx-0">
                    {c.icon}
                  </div>
                  <h4 className="mb-2 font-bold text-foreground text-sm uppercase tracking-tight">
                    {c.title}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {c.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Content Area */}
          <div className="animate-in fade-in duration-700 slide-in-from-right-10">
            <Badge variant="secondary" className="mb-4 bg-accent/10 py-1 px-4 text-accent text-xs font-semibold uppercase tracking-widest border-accent/20">
              <LuSparkles className="size-3 mr-2" />
              Our Story
            </Badge>
            <h2 className="mb-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              More Than Just an Organization — It&apos;s a{" "}
              <span className="text-accent underline decoration-accent/30 decoration-4 underline-offset-4">Community</span>
            </h2>
            <div className="space-y-4 text-lg text-muted-foreground">
              <p>
                We are a student-led organization focused on improving
                collaboration, leadership, and organization within the school
                community. OrgWeb provides a centralized hub where every member
                can contribute, grow, and make a meaningful impact.
              </p>
              <p>
                Founded with the belief that every student deserves a platform to
                lead, we empower young individuals through structured programs,
                inclusive events, and a supportive network that extends beyond the
                classroom.
              </p>
            </div>

            <div className="mt-12 grid gap-6 grid-cols-1 sm:grid-cols-2">
              <Card className="border-l-4 border-l-primary bg-primary/5 transition-colors hover:bg-primary/10">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm text-primary uppercase tracking-widest">
                    <LuTarget className="size-4" /> Mission
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium text-foreground/80 leading-relaxed">
                    To cultivate responsible, organized, and collaborative student
                    leaders who drive positive change in their community.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-accent bg-accent/5 transition-colors hover:bg-accent/10">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm text-accent uppercase tracking-widest">
                    <LuSparkles className="size-4" /> Vision
                  </CardTitle>
                </CardHeader>
                <CardContent>
                   <p className="text-sm font-medium text-foreground/80 leading-relaxed">
                    A thriving school community where every student is empowered
                    to lead, connect, and grow.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
