'use client'

import { useState } from 'react'
import { Lightbulb, BookOpen, Shield, Users, Plus, Minus } from 'lucide-react'
import { ScrambleHeading } from './ScrambleHeading'

export function Team() {
  const [open, setOpen] = useState<number | null>(null)

  const traits = [
    {
      n: '01',
      title: 'Problem Solver',
      desc: 'I thrive on turning complex problems into elegant, production-ready solutions — from architecture decisions to debugging edge cases.',
      icon: Lightbulb,
      color: 'var(--primary)',
    },
    {
      n: '02',
      title: 'Lifelong Learner',
      desc: "Always exploring new tools, frameworks, and paradigms. Learning isn't something I schedule — it's how I operate every day.",
      icon: BookOpen,
      color: 'var(--primary)',
    },
    {
      n: '03',
      title: 'Security Minded',
      desc: 'I design every system with security as a first-class requirement, not a retrofit. Certified in cybersecurity by Google.',
      icon: Shield,
      color: 'var(--primary)',
    },
    {
      n: '04',
      title: 'Team Player',
      desc: 'I communicate clearly, collaborate under pressure, and consistently bring both technical depth and positive energy to every team.',
      icon: Users,
      color: 'var(--primary)',
    },
  ]

  return (
    <div className="relative py-32 bg-background w-full overflow-hidden">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 30% 60%, color-mix(in srgb, var(--primary) 2%, transparent) 0%, transparent 65%)' }}
      />

      <div className="container mx-auto px-6 sm:px-8 lg:px-12 relative z-10">

        {/* ── Header ── */}
        <ScrambleHeading label="More About Me" plain="The person " accent="behind the code" />
        <div className="text-center mb-20 -mt-8">
          <p className="text-xl text-muted-foreground mt-6 max-w-2xl mx-auto">
            Curious, driven, and always building something.
          </p>
        </div>

        {/* ── How I Work — Accordion ── */}
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-10">
            <div className="h-px flex-1" style={{ background: 'color-mix(in srgb, var(--primary) 13%, transparent)' }} />
            <h3 className="text-sm font-semibold tracking-widest uppercase text-muted-foreground font-mono">
              How I Work
            </h3>
            <div className="h-px flex-1" style={{ background: 'color-mix(in srgb, var(--primary) 13%, transparent)' }} />
          </div>

          <div className="space-y-0">
            {traits.map((item, i) => {
              const isOpen = open === i
              const Icon = item.icon
              return (
                <div
                  key={item.n}
                  style={{
                    borderBottom: '1px solid ' + (isOpen ? `color-mix(in srgb, ${item.color} 27%, transparent)` : 'var(--border)'),
                    transition: 'border-color 0.3s ease',
                  }}
                >
                  <button
                    className="w-full flex items-center gap-3 sm:gap-5 py-5 text-left"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                  >
                    <span
                      className="text-xs font-mono font-bold flex-shrink-0 transition-colors duration-300"
                      style={{ color: isOpen ? item.color : 'var(--muted-foreground)' }}
                    >
                      {item.n}
                    </span>

                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300"
                      style={{
                        background: isOpen ? `color-mix(in srgb, ${item.color} 13%, transparent)` : 'var(--card)',
                        border: '1px solid ' + (isOpen ? `color-mix(in srgb, ${item.color} 33%, transparent)` : 'var(--border)'),
                      }}
                    >
                      <Icon
                        size={16}
                        style={{ color: isOpen ? item.color : 'var(--muted-foreground)', transition: 'color 0.3s ease' }}
                      />
                    </div>

                    <span
                      className="flex-1 font-bold text-base sm:text-lg transition-all duration-300"
                      style={{ opacity: isOpen ? 1 : 0.75 }}
                    >
                      {item.title}
                    </span>

                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
                      style={{
                        background: isOpen ? item.color : 'transparent',
                        border: '1px solid ' + (isOpen ? item.color : 'var(--border)'),
                      }}
                    >
                      {isOpen
                        ? <Minus size={12} className="text-white" />
                        : <Plus size={12} className="text-muted-foreground" />}
                    </div>
                  </button>

                  <div
                    className={`grid transition-[grid-template-rows,padding,opacity] duration-500 ease-in-out ${
                      isOpen ? 'grid-rows-[1fr] opacity-100 pb-5' : 'grid-rows-[0fr] opacity-0 pb-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="accordion-content text-sm text-muted-foreground leading-relaxed pl-0 sm:pl-16">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}