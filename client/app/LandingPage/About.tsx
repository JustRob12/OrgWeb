"use client"

import { LuHeart, LuShield, LuZap, LuTarget, LuSparkles } from "react-icons/lu"
import { Badge } from "../Components/ui/badge"

export default function About() {
  const values = [
    {
      icon: <LuHeart className="size-5" />,
      title: "Student-Led",
      desc: "Run entirely by passionate students for the community",
      accent: "rose",
    },
    {
      icon: <LuZap className="size-5" />,
      title: "Active & Engaged",
      desc: "Consistent events, activities, and leadership growth",
      accent: "amber",
    },
    {
      icon: <LuShield className="size-5" />,
      title: "Trusted",
      desc: "Recognized and trusted by faculty and administration",
      accent: "teal",
    },
  ]

  const stats = [
    { value: "50+", label: "Active Members" },
    { value: "120+", label: "Events Organized" },
    { value: "5+", label: "Years Running" },
  ]

  return (
    <section className="relative overflow-hidden bg-background py-28 md:py-36" id="about">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 -z-10 opacity-[0.02]">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-foreground/10 blur-3xl" />
      </div>

      <div className="container">
        {/* Header */}
        <div className="mx-auto mb-20 max-w-3xl text-center">
          <Badge variant="secondary" className="mb-6 bg-accent/10 py-1.5 px-5 text-accent text-xs font-semibold uppercase tracking-[0.2em] border-accent/20">
            <LuSparkles className="size-3.5 mr-2" />
            About Us
          </Badge>
          <h2 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-[3.5rem]">
            More Than Just an{" "}
            <span className="relative text-accent">
              Organization
              <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 200 8" fill="none">
                <path d="M1 5.5C47 2 153 2 199 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
              </svg>
            </span>
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground md:text-xl">
            A thriving community where student leaders are made, ideas are born,
            and the future of our school is shaped together.
          </p>
        </div>

        {/* Mission & Vision Cards */}
        <div className="mb-20 grid gap-6 md:grid-cols-2">
          <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-primary/[0.03] to-primary/[0.08] p-8 transition-all hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
            <div className="absolute right-6 top-6 opacity-10 transition-opacity group-hover:opacity-20">
              <LuTarget className="size-20 text-primary" />
            </div>
            <div className="relative">
              <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-primary/10 p-3">
                <LuTarget className="size-6 text-primary" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-foreground">Our Mission</h3>
              <p className="text-[0.95rem] leading-relaxed text-muted-foreground">
                To cultivate responsible, organized, and collaborative student
                leaders who drive positive change in their community.
              </p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-accent/[0.03] to-accent/[0.08] p-8 transition-all hover:border-accent/20 hover:shadow-lg hover:shadow-accent/5">
            <div className="absolute right-6 top-6 opacity-10 transition-opacity group-hover:opacity-20">
              <LuSparkles className="size-20 text-accent" />
            </div>
            <div className="relative">
              <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-accent/10 p-3">
                <LuSparkles className="size-6 text-accent" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-foreground">Our Vision</h3>
              <p className="text-[0.95rem] leading-relaxed text-muted-foreground">
                A thriving school community where every student is empowered
                to lead, connect, and grow.
              </p>
            </div>
          </div>
        </div>

        {/* Story + Values Grid */}
        <div className="grid gap-12 lg:grid-cols-5 lg:gap-16">
          {/* Story */}
          <div className="lg:col-span-3">
            <h3 className="mb-6 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Our Story
            </h3>
            <div className="space-y-5 text-base leading-relaxed text-muted-foreground md:text-lg">
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

            {/* Stats */}
            <div className="mt-10 flex flex-wrap gap-8 border-t border-border/60 pt-8">
              {stats.map((stat, i) => (
                <div key={i} className="min-w-[100px]">
                  <div className="text-3xl font-bold text-foreground tracking-tight">{stat.value}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Values */}
          <div className="lg:col-span-2">
            <h3 className="mb-6 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              What Sets Us Apart
            </h3>
            <div className="space-y-4">
              {values.map((value, i) => (
                <div
                  key={i}
                  className="group flex items-start gap-4 rounded-xl border border-border/50 bg-card/50 p-5 transition-all hover:border-border hover:shadow-md"
                >
                  <div className={`flex-shrink-0 rounded-lg bg-${value.accent}-500/10 p-2.5 text-${value.accent}-500 transition-colors group-hover:bg-${value.accent}-500/15`}>
                    {value.icon}
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold text-foreground text-sm uppercase tracking-wide">
                      {value.title}
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {value.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
