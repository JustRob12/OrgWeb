"use client"

import { useState } from "react"
import { LuMail, LuPhone, LuMapPin, LuShare2, LuSend, LuCircleCheck, LuSparkles } from "react-icons/lu"
import { Button } from "../Components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../Components/ui/card"
import { Input } from "../Components/ui/input"
import { Label } from "../Components/ui/label"
import { Textarea } from "../Components/ui/textarea"
import { Badge } from "../Components/ui/badge"
import { cn } from "@/lib/utils"

export default function Contact() {
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 4000)
    setFormState({ name: "", email: "", subject: "", message: "" })
  }

  const contactFeatures = [
    {
      icon: <LuMail className="size-5" />,
      colorClass: "bg-blue-500/10 text-blue-600 border-blue-200",
      title: "Email Us",
      desc: "orgweb@school.edu.ph",
    },
    {
      icon: <LuPhone className="size-5" />,
      colorClass: "bg-purple-500/10 text-purple-600 border-purple-200",
      title: "Call Us",
      desc: "+63 912 345 6789",
    },
    {
      icon: <LuMapPin className="size-5" />,
      colorClass: "bg-teal-500/10 text-teal-600 border-teal-200",
      title: "Visit Us",
      desc: "Student Center, Room 201",
    },
    {
      icon: <LuShare2 className="size-5" />,
      colorClass: "bg-amber-500/10 text-amber-600 border-amber-200",
      title: "Follow Us",
      desc: "@OrgWebOrganization",
    },
  ]

  return (
    <section className="bg-background py-24 md:py-32" id="contact">
      <div className="container">
        <div className="mb-16 text-center max-w-2xl mx-auto animate-in fade-in duration-700 slide-in-from-bottom-5">
          <Badge variant="outline" className="mb-4 gap-2 bg-primary/5 py-1 px-4 text-primary font-bold uppercase tracking-widest border-primary/20">
            <LuSend className="size-3 fill-primary" /> Get In Touch
          </Badge>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Contact Us Today
          </h2>
          <p className="text-lg text-muted-foreground">
            Whether you want to learn more about us or have questions, we&apos;d
            love to hear from you!
          </p>
        </div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-5 lg:items-start">
          {/* Info Side */}
          <div className="lg:col-span-2 space-y-8 animate-in fade-in slide-in-from-left-10 duration-700">
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-primary mb-4">
                Reach Out to <span className="text-foreground">OrgWeb</span>
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Have questions about OrgWeb? Want to collaborate or partner with
                us? Reach out through any of the channels below and our team will
                respond promptly.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {contactFeatures.map((cf, i) => (
                <Card key={i} className="group hover:border-primary/30 transition-all border-border/50 shadow-sm hover:shadow-md">
                   <CardContent className="flex items-center gap-4 p-4">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-transform group-hover:scale-110 ${cf.colorClass}`}>
                        {cf.icon}
                      </div>
                      <div className="min-w-0">
                         <h4 className="text-sm font-bold text-foreground opacity-90 group-hover:text-primary transition-colors">{cf.title}</h4>
                         <p className="text-xs text-muted-foreground truncate">{cf.desc}</p>
                      </div>
                   </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Form Side */}
          <Card className={cn(
            "lg:col-span-3 border-border/60 shadow-xl relative overflow-hidden transition-all duration-500",
            submitted ? "bg-emerald-50/30 border-emerald-100" : "bg-card"
          )}>
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-2xl font-bold tracking-tight">Send us a Message</CardTitle>
              <CardDescription className="text-base">
                Fill out the form below and our team will respond within 24–48 hours.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-8 pt-4">
              {submitted ? (
                <div className="py-12 flex flex-col items-center text-center space-y-6 animate-in zoom-in-95 duration-500">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-xl shadow-emerald-200/50">
                    <LuCircleCheck className="size-10" />
                  </div>
                  <div>
                Get in Touch with Our <span className="text-primary font-bold decoration-primary/30 decoration-4 underline-offset-4">Executive Board</span>
                    <p className="text-muted-foreground mt-2 max-w-sm">
                      Thank you for reaching out. We&apos;ve received your message and will get back to you shortly.
                    </p>
                  </div>
                   <Button variant="outline" className="rounded-full px-8" onClick={() => setSubmitted(false)}>
                      Send Another Message
                   </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="contact-name">Full Name</Label>
                      <Input 
                        id="contact-name" 
                        placeholder="Your Name" 
                        required 
                        value={formState.name}
                        onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                        className="bg-background/50 h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-email">Email Address</Label>
                      <Input 
                        id="contact-email" 
                        type="email" 
                        placeholder="your@email.com" 
                        required 
                        value={formState.email}
                        onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                        className="bg-background/50 h-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-subject">Subject</Label>
                    <Input 
                      id="contact-subject" 
                      placeholder="What is this about?" 
                      required 
                      value={formState.subject}
                      onChange={(e) => setFormState({ ...formState, subject: e.target.value })}
                      className="bg-background/50 h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-message">Message</Label>
                    <Textarea 
                      id="contact-message" 
                      placeholder="Tell us everything..." 
                      className="min-h-[160px] bg-background/50 resize-none" 
                      required 
                      value={formState.message}
                      onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                    />
                  </div>

                  <Button type="submit" className="w-full h-12 font-bold text-base shadow-lg shadow-primary/20 group">
                    Send Message 
                    <LuSend className="ml-2 size-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </Button>
                </form>
              )}
            </CardContent>
            
            {/* Visual Sparkle */}
            {!submitted && (
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                 <LuSparkles className="size-16 text-primary" />
              </div>
            )}
          </Card>
        </div>
      </div>
    </section>
  )
}
