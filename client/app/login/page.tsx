"use client"

import React from "react"
import { LuGraduationCap, LuMail, LuLock, LuArrowRight, LuStar, LuChevronLeft } from "react-icons/lu"
import { Button } from "../Components/ui/button"
import { Input } from "../Components/ui/input"
import { Label } from "../Components/ui/label"
import { Card, CardContent } from "../Components/ui/card"
import { Badge } from "../Components/ui/badge"

export default function LoginPage() {
  const [isLoading, setIsLoading] = React.useState(false)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    // Simulate login delay
    setTimeout(() => setIsLoading(false), 2000)
  }

  return (
    <div className="min-h-screen w-full flex items-stretch bg-background overflow-hidden relative font-sans">
      {/* Background decoration removed for cleaner mobile view */}

      {/* Left Side: Branding (Hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 relative flex-col justify-between p-8 lg:p-12 text-white overflow-hidden gradient-primary">
        {/* Animated Background Elements */}
        <div className="absolute top-[-10%] right-[-10%] aspect-square w-[500px] rounded-full bg-white/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] aspect-square w-[400px] rounded-full bg-accent/20 blur-[100px] animate-pulse delay-1000" />

        <div className="relative z-10">
          <a href="/" className="flex items-center gap-2 group mb-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 transition-transform group-hover:scale-110">
              <LuGraduationCap className="size-8" />
            </div>
            <span className="text-2xl font-bold tracking-tight">OrgWeb</span>
          </a>

          <div className="max-w-md space-y-8 animate-in fade-in slide-in-from-left-10 duration-1000">
            <Badge className="bg-white/10 text-white border-white/20 py-1 px-4 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
              <LuStar className="size-3 mr-2 fill-white" /> Access Member Portal
            </Badge>
            <h1 className="text-3xl lg:text-5xl font-bold tracking-tight leading-tight">
              Empowering the Next Generation of <span className="text-white/80 font-medium">Student Leaders.</span>
            </h1>
            <p className="text-lg text-white/70 leading-relaxed font-medium">
              Join our community of over 42+ active members and stay organized with your organization&apos;s activities, events, and reports.
            </p>
          </div>
        </div>

        <div className="relative z-10 space-y-4 border-t border-white/10 pt-12 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 w-10 rounded-full border-2 border-primary bg-slate-200 overflow-hidden ring-2 ring-primary/20">
                  <img src={`https://i.pravatar.cc/150?u=orgweb${i}`} alt="Avatar" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
            <p className="text-sm font-bold text-white/80">Already used by the school executive board.</p>
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
            <span>© 2026 OrgWeb Organization</span>
            <span>System v2.4</span>
          </div>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative z-10">
        <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in-95 duration-700">
          {/* Mobile Logo Only */}
          <div className="md:hidden flex flex-col items-center mb-8">
            <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground shadow-2xl shadow-primary/20 mb-4 animate-float">
              <LuGraduationCap className="size-10" />
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-primary">OrgWeb</h2>
          </div>

          <div className="text-center md:text-left">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">Welcome back</h2>
            <p className="mt-2 text-muted-foreground font-normal text-base lg:text-lg">Enter your school credentials to access the dashboard.</p>
          </div>

          <Card className="border-none shadow-none bg-transparent backdrop-blur-none">
            <CardContent className="p-0 md:p-0">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Email Address</Label>
                    <div className="relative group">
                      <LuMail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <Input
                        id="email"
                        placeholder="santos.maria@school.edu.ph"
                        type="email"
                        required
                        className="pl-12 h-14 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Password</Label>
                      <a href="#" className="text-xs font-medium text-primary hover:underline">Forgot password?</a>
                    </div>
                    <div className="relative group">
                      <LuLock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <Input
                        id="password"
                        type="password"
                        required
                        placeholder="••••••••"
                        className="pl-12 h-14 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-14 text-base font-bold rounded-xl shadow-xl shadow-primary/20 transition-all hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] bg-primary hover:bg-primary/90"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>Log In</span>

                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="pt-8 text-center md:text-left">
            <a href="/" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors group">
              <LuChevronLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
