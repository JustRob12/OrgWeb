"use client"

import { LuArrowRight, LuCalendar, LuSquareCheck, LuGraduationCap, LuStar, LuUsers, LuWallet } from "react-icons/lu"
import { Button } from "../Components/ui/button"
import { Card, CardContent } from "../Components/ui/card"
import { Badge } from "../Components/ui/badge"
import dynamic from "next/dynamic"

import { MemberIDCard } from "../Components/MemberIDCard"

export default function Hero() {
  return (
    <section className="relative px-6 pt-32 pb-20 overflow-hidden md:pt-48 md:pb-32" id="home">
      <div className="absolute top-[-10%] right-[-10%] aspect-square w-[600px] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] aspect-square w-[500px] rounded-full bg-accent/5 blur-[80px] pointer-events-none" />

      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden hidden sm:block">
        <div className="w-full h-full flex items-center justify-end pr-80 pt-20">
          <div className="pointer-events-auto">
            <MemberIDCard />
          </div>
        </div>
      </div>

      <div className="container relative z-20 pointer-events-none">
        <div className="max-w-xl animate-in fade-in duration-700 slide-in-from-bottom-5 pointer-events-auto">
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
      </div>
    </section>
  )
}
