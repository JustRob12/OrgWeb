"use client"

import { LuImage, LuEye, LuTrophy, LuUsers, LuMusic, LuCalendar, LuHeart, LuGraduationCap, LuSparkles } from "react-icons/lu"
import { Card, CardContent } from "../Components/ui/card"
import { Badge } from "../Components/ui/badge"

export default function Gallery() {
  const items = [
    { 
      bg: "bg-gradient-to-br from-blue-700 to-blue-500", 
      icon: <LuTrophy className="size-16 opacity-20" />, 
      label: "Award Ceremony 2026",
      tag: "Achievement"
    },
    { 
      bg: "bg-gradient-to-br from-purple-600 to-indigo-500", 
      icon: <LuUsers className="size-10 opacity-20" />, 
      label: "Team Photo",
      tag: "Community"
    },
    { 
      bg: "bg-gradient-to-br from-teal-600 to-emerald-500", 
      icon: <LuMusic className="size-10 opacity-20" />, 
      label: "Cultural Night",
      tag: "Event"
    },
    { 
      bg: "bg-gradient-to-br from-amber-600 to-orange-500", 
      icon: <LuCalendar className="size-10 opacity-20" />, 
      label: "Orientation Day",
      tag: "Planning"
    },
    { 
      bg: "bg-gradient-to-br from-rose-600 to-pink-500", 
      icon: <LuHeart className="size-10 opacity-20" />, 
      label: "Community Service",
      tag: "Outreach"
    },
    { 
      bg: "bg-gradient-to-br from-green-600 to-lime-500", 
      icon: <LuGraduationCap className="size-10 opacity-20" />, 
      label: "Graduation Rites",
      tag: "Finals"
    },
  ]

  return (
    <section className="bg-background py-24 md:py-32" id="gallery">
      <div className="container">
        <div className="mb-16 text-center max-w-2xl mx-auto animate-in fade-in duration-700 slide-in-from-bottom-5">
          <Badge variant="outline" className="mb-4 gap-2 bg-primary/5 py-1 px-4 text-primary font-bold uppercase tracking-widest border-primary/20">
            <LuImage className="size-3 fill-primary" /> Photo Gallery
          </Badge>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Memories We&apos;ve Made Together
          </h2>
          <p className="text-lg text-muted-foreground">
            A glimpse into the events, activities, and moments that define the
            OrgWeb Organization experience.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2">
          {items.map((item, i) => (
            <Card 
              key={i} 
              className={`group relative overflow-hidden h-64 border-none shadow-md transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 ${
                i === 0 ? "sm:col-span-2 lg:row-span-2 lg:h-full" : ""
              }`}
            >
              <div className={`absolute inset-0 ${item.bg} transition-transform duration-700 group-hover:scale-110`} />
              
              {/* Content Overlay */}
              <CardContent className="relative h-full flex flex-col items-center justify-center p-6 text-center text-white/90">
                <div className="mb-4 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                   {item.icon}
                </div>
                <div className="font-bold text-lg mb-1 tracking-tight">{item.label}</div>
                <Badge variant="secondary" className="bg-white/20 text-white border-transparent text-[10px] uppercase font-bold tracking-widest px-2 py-0">
                  {item.tag}
                </Badge>
                
                {/* Visual Hover Overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                  <div className="flex flex-col items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform">
                     <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-primary shadow-lg">
                        <LuEye className="size-6" />
                     </div>
                     <span className="text-xs font-black uppercase tracking-widest">View Gallery</span>
                  </div>
                </div>
              </CardContent>
              
              {/* Subtle Texture/Grain */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center animate-in fade-in duration-1000">
          <p className="flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            <LuSparkles className="size-4 text-primary" /> Follow us for more updates
          </p>
        </div>
      </div>
    </section>
  )
}
