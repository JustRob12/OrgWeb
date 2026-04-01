"use client"

import { LuArrowRight, LuCalendar, LuSquareCheck, LuGraduationCap, LuStar, LuUsers, LuWallet } from "react-icons/lu"
import { Button } from "../Components/ui/button"
import { Card, CardContent } from "../Components/ui/card"
import { Badge } from "../Components/ui/badge"

export default function Hero() {
  return (
    <section className="relative px-6 pt-32 pb-20 overflow-hidden md:pt-48 md:pb-32" id="home">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] right-[-10%] aspect-square w-[600px] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] aspect-square w-[500px] rounded-full bg-accent/5 blur-[80px] pointer-events-none" />

      <div className="container relative z-10 grid gap-12 lg:grid-cols-2 lg:items-center">
        {/* Left Content */}
        <div className="max-w-xl animate-in fade-in duration-700 slide-in-from-bottom-5">
          <Badge variant="outline" className="mb-4 gap-2 bg-primary/5 py-1 px-4 text-primary border-primary/20">
            <LuStar className="size-3 fill-primary" />
            School&apos;s #1 Organization Platform
          </Badge>
          <h1 className="mb-6 text-3xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Empowering{" "}
            <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent-foreground">
              Student Organizations
            </span>{" "}
            to Stay Organized and Connected
          </h1>
          <p className="mb-8 text-lg text-muted-foreground md:text-xl">
            Manage members, events, and activities in one place. Everything your
            organization needs to thrive — simple, modern, and built for students.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button size="lg" className="h-12 px-8 text-base shadow-lg hover:shadow-xl transition-all" asChild>
              <a href="#events">
                View Events <LuArrowRight className="ml-2 size-5" />
              </a>
            </Button>
            <Button variant="outline" size="lg" className="h-12 px-8 text-base border-input hover:bg-accent/50" asChild>
              <a href="#about">Learn More</a>
            </Button>
          </div>
        </div>

        {/* Right – Dashboard UI Visual */}
        <div className="relative animate-in fade-in slide-in-from-right-10 duration-1000 lg:justify-self-end flex justify-center lg:block">
          <Card className="max-w-md border shadow-2xl animate-float">
            <CardContent className="p-8">
              <div className="mb-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                  📊 Organization Management Dashboard
                </p>
              </div>

              <div className="space-y-4">
                <DashboardItem
                  icon={<LuUsers className="size-5" />}
                  color="blue"
                  title="Member Management"
                  subtitle="42 active members this semester"
                />
                <DashboardItem
                  icon={<LuCalendar className="size-5" />}
                  color="purple"
                  title="Leadership Summit 2026"
                  subtitle="April 15, 2026 • Learning Center"
                />
                <DashboardItem
                  icon={<LuSquareCheck className="size-5" />}
                  color="teal"
                  title="Attendance Logged"
                  subtitle="38/42 present at last meeting"
                />
                <DashboardItem
                  icon={<LuWallet className="size-5" />}
                  color="green"
                  title="Organization Funds: ₱12,400"
                  subtitle="Budget tracked & approved"
                />
              </div>

              {/* Stat Grid */}
              <div className="mt-8 grid grid-cols-3 gap-3">
                <StatBox label="Members" value="42" />
                <StatBox label="Events" value="8" />
                <StatBox label="Active" value="91%" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

function DashboardItem({ icon, color, title, subtitle }: { icon: React.ReactNode; color: string; title: string; subtitle: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-primary/10 text-primary",
    purple: "bg-accent/10 text-accent",
    teal: "bg-teal/10 text-teal",
    green: "bg-green-500/10 text-green-600",
  }

  return (
    <div className="group flex items-center gap-4 rounded-lg border bg-background/50 p-3 transition-colors hover:bg-accent/5">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colorMap[color]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
      </div>
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg bg-primary p-3 text-center text-primary-foreground shadow-sm group hover:scale-105 transition-transform">
      <span className="text-sm font-bold sm:text-base">{value}</span>
      <span className="text-[9px] uppercase tracking-wider opacity-80">{label}</span>
    </div>
  )
}
