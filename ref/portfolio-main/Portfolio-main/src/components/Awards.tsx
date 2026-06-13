'use client'

import { ShieldCheck, Globe, Bot, Database, Code, Monitor, Cloud, Server } from 'lucide-react'
import { ScrambleHeading } from './ScrambleHeading'

export function Awards() {
  const certifications = [
    { name: "AWS Academy Data Center Technician", issuer: "AWS", year: "2026", color: "var(--primary)", icon: Server },
    { name: "AWS Academy Cloud Foundations", issuer: "AWS", year: "2025", color: "var(--primary)", icon: Cloud },
    { name: "Data Science for Beginners", issuer: "Board Infinity", year: "2025", color: "var(--primary)", icon: Database },
    { name: "AI Fundamentals", issuer: "IBM SkillsBuild", year: "2024–2025", color: "var(--primary)", icon: Bot },
    { name: "Introduction to MongoDB", issuer: "MongoDB University", year: "2024–2025", color: "var(--primary)", icon: Database },
    { name: "Programming Essentials in Python", issuer: "Cisco", year: "2024–2025", color: "var(--primary)", icon: Code },
    { name: "Fundamentals of Operating Systems", issuer: "Scaler", year: "2024–2025", color: "var(--primary)", icon: Monitor },
    { name: "Cybersecurity Professional", issuer: "Google", year: "2023–2024", color: "var(--primary)", icon: ShieldCheck },
    { name: "HTML, CSS & JavaScript", issuer: "Udemy", year: "2023", color: "var(--primary)", icon: Globe },
  ]

  return (
    <section id="awards" className="relative py-20 bg-background overflow-hidden">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 20% 50%, color-mix(in srgb, var(--primary) 2%, transparent) 0%, transparent 60%)' }}
      />

      <div className="container mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
        <ScrambleHeading label="Credentials" plain="" accent="Certifications" />
        <div className="text-center mb-16 -mt-8">
          <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
            Continuously learning and earning credentials across development, AI, and cybersecurity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-20">
          {certifications.map((cert) => {
            const IconComponent = cert.icon
            return (
              <div
                key={cert.name}
                className="group bg-card clean-border rounded-2xl p-6 gentle-animation hover:scale-105 elevated-shadow"
                style={{ borderColor: `color-mix(in srgb, ${cert.color} 27%, transparent)` }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `color-mix(in srgb, ${cert.color} 8%, transparent)` }}
                  >
                    <IconComponent size={22} style={{ color: cert.color }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm leading-tight mb-1">{cert.name}</h3>
                    <p className="text-xs font-mono" style={{ color: cert.color }}>{cert.issuer}</p>
                    <p className="text-xs text-muted-foreground mt-1">{cert.year}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
